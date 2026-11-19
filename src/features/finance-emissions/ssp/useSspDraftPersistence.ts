import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { USE_JWT_AUTH } from "@/api/config";
import {
  getSspDraftByInstance,
  listSspDrafts,
  upsertSspDraft,
  type SspDraftConflict,
  type SspDraftRecord,
} from "@/api/sspDrafts";
import {
  draftFingerprint,
  hydrateSspDraftFromRecord,
  isStaleSaveResponse,
  mergeResumedDrafts,
  nextSaveSeq,
  parseSspConflict,
  shouldConfirmSharedWrite,
  tokensFromConflict,
  tokensFromRecord,
  toSspDraftUpsertBody,
  withVersionTokens,
  type SspDraftSaveStatus,
  type SspVersionTokens,
} from "./draftPersistence";
import { SSP_DRAFT_API_AVAILABLE } from "./reportableGuard";
import { copySharedDeal } from "./state";
import type { SspByInstance, SspDraft } from "./types";

const SAVE_DEBOUNCE_MS = 700;

type Options = {
  enabled: boolean;
  drafts: SspByInstance;
  activeKey: string;
  counterpartyId?: string | null;
  onReplace: (next: SspByInstance) => void;
};

export function useSspDraftPersistence({
  enabled,
  drafts,
  activeKey,
  counterpartyId,
  onReplace,
}: Options) {
  const persistEnabled = Boolean(enabled && SSP_DRAFT_API_AVAILABLE && USE_JWT_AUTH);
  const [status, setStatus] = useState<SspDraftSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [conflict, setConflict] = useState<SspDraftConflict | null>(null);
  const [sharedWritePending, setSharedWritePending] = useState(false);
  const [ready, setReady] = useState(false);
  const seqRef = useRef<Record<string, number>>({});
  const lastSavedRef = useRef<Record<string, SspDraft>>({});
  const fingerprintRef = useRef<Record<string, string>>({});
  const versionRef = useRef<Record<string, SspVersionTokens>>({});
  const saveTailRef = useRef<Record<string, Promise<void>>>({});
  const draftsRef = useRef(drafts);
  const onReplaceRef = useRef(onReplace);
  draftsRef.current = drafts;
  onReplaceRef.current = onReplace;

  const remember = (key: string, draft: SspDraft) => {
    lastSavedRef.current[key] = draft;
    fingerprintRef.current[key] = draftFingerprint(draft);
    versionRef.current[key] = {
      dealUpdatedAt: draft.dealUpdatedAt || null,
      holdingUpdatedAt: draft.holdingUpdatedAt || null,
      dealId: draft.dealId,
      holdingId: draft.holdingId,
      siblingCount: draft.siblingCount,
    };
  };

  const adoptVersions = useCallback((key: string, tokens: SspVersionTokens) => {
    versionRef.current[key] = {
      ...versionRef.current[key],
      ...tokens,
    };
    const saved = lastSavedRef.current[key];
    if (saved) {
      lastSavedRef.current[key] = withVersionTokens(saved, tokens);
    }
    const current = draftsRef.current[key];
    if (!current) return;
    const patched = withVersionTokens(current, tokens);
    // Fingerprint ignores version tokens — avoid flipping status to unsaved.
    onReplaceRef.current({ ...draftsRef.current, [key]: patched });
  }, []);

  const applyRecord = useCallback((
    key: string,
    draft: SspDraft,
    record: SspDraftRecord,
    keepLocalShared = false
  ) => {
    const persisted = hydrateSspDraftFromRecord(draft, record);
    const next = keepLocalShared ? copySharedDeal(draft, persisted) : persisted;
    onReplaceRef.current({ ...draftsRef.current, [key]: next });
    lastSavedRef.current[key] = persisted;
    fingerprintRef.current[key] = draftFingerprint(next);
    versionRef.current[key] = tokensFromRecord(record);
    return next;
  }, []);

  const saveKey = useCallback(
    async (key: string, seq: number, updateShared: boolean) => {
      const live = draftsRef.current[key];
      if (!live?.financingInstanceId) return;

      const tokens = versionRef.current[key];
      const draft = tokens ? withVersionTokens(live, tokens) : live;
      const saved = lastSavedRef.current[key];
      const sharedPending = !updateShared && shouldConfirmSharedWrite(draft, saved);
      const payload = sharedPending && saved ? copySharedDeal(saved, draft) : draft;

      // Only surface "Saving…" for the active investment to avoid banner flicker on siblings.
      if (key === activeKey) {
        setStatus("saving");
        setErrorMessage("");
        if (!sharedPending) setConflict(null);
      }

      try {
        const record = await upsertSspDraft(
          toSspDraftUpsertBody(payload, {
            counterpartyId,
            updateShared,
          })
        );

        // Always adopt server tokens so a discarded in-flight response cannot
        // poison the next save with stale expected_* timestamps.
        adoptVersions(key, tokensFromRecord(record));

        if (isStaleSaveResponse(seq, seqRef.current[key] || 0)) {
          return;
        }

        applyRecord(key, draft, record, sharedPending);
        if (key !== activeKey) return;

        if (sharedPending) {
          setSharedWritePending(true);
          setStatus("conflict");
          setConflict({
            code: "shared_deal_conflict",
            message:
              "Your investment was saved. Shared deal changes were not applied to other holdings yet.",
            deal_id: record.deal.id,
            deal_updated_at: record.deal.updated_at,
            sibling_count: record.sibling_count,
            changed_fields: [],
          });
          setErrorMessage("");
          return;
        }
        setSharedWritePending(false);
        setStatus("saved");
        setConflict(null);
        setErrorMessage("");
      } catch (error) {
        if (isStaleSaveResponse(seq, seqRef.current[key] || 0)) {
          return;
        }
        const parsed = parseSspConflict(error);
        if (parsed) {
          const fromConflict = tokensFromConflict(parsed);
          if (fromConflict) adoptVersions(key, fromConflict);
          if (key !== activeKey) return;
          setConflict(parsed);
          setStatus("conflict");
          setErrorMessage("");
          return;
        }
        if (key !== activeKey) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unable to save changes";
        setStatus("failed");
        setErrorMessage(message || "Unable to save changes");
      }
    },
    [activeKey, adoptVersions, applyRecord, counterpartyId]
  );

  const enqueueSave = useCallback(
    (key: string, seq: number, updateShared: boolean) => {
      const prev = saveTailRef.current[key] || Promise.resolve();
      const next = prev
        .catch(() => undefined)
        .then(() => saveKey(key, seq, updateShared));
      saveTailRef.current[key] = next.then(
        () => undefined,
        () => undefined
      );
      return next;
    },
    [saveKey]
  );

  useEffect(() => {
    if (!persistEnabled) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const records = await listSspDrafts(
          counterpartyId ? { counterparty_id: counterpartyId } : undefined
        );
        if (cancelled) return;
        const merged = mergeResumedDrafts(draftsRef.current, records);
        Object.entries(merged).forEach(([key, draft]) => remember(key, draft));
        onReplaceRef.current(merged);
        if (Object.values(merged).some((draft) => draft.holdingId)) {
          setStatus("saved");
          setErrorMessage("");
          setConflict(null);
        }
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setErrorMessage("Unable to save changes");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistEnabled, counterpartyId]);

  useEffect(() => {
    if (!persistEnabled || !ready) return;
    const key = activeKey;
    const draft = drafts[key];
    if (!draft?.financingInstanceId) return;
    const fingerprint = draftFingerprint(draft);
    if (fingerprintRef.current[key] === fingerprint) return;
    setStatus("unsaved");
    const seq = nextSaveSeq(seqRef.current[key] || 0);
    seqRef.current[key] = seq;
    const timer = window.setTimeout(() => {
      void enqueueSave(key, seq, false);
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [persistEnabled, ready, activeKey, drafts, enqueueSave]);

  const retry = useCallback(() => {
    const draft = draftsRef.current[activeKey];
    if (!draft) return;
    const seq = nextSaveSeq(seqRef.current[activeKey] || 0);
    seqRef.current[activeKey] = seq;
    void enqueueSave(activeKey, seq, false);
  }, [activeKey, enqueueSave]);

  const applyShared = useCallback(() => {
    const draft = draftsRef.current[activeKey];
    if (!draft) return;
    const seq = nextSaveSeq(seqRef.current[activeKey] || 0);
    seqRef.current[activeKey] = seq;
    void enqueueSave(activeKey, seq, true);
  }, [activeKey, enqueueSave]);

  const refresh = useCallback(async () => {
    const draft = draftsRef.current[activeKey];
    if (!draft?.financingInstanceId) return;
    setStatus("saving");
    try {
      const record = await getSspDraftByInstance(draft.financingInstanceId, counterpartyId);
      applyRecord(activeKey, draft, record);
      setSharedWritePending(false);
      setStatus("saved");
      setConflict(null);
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to load the latest version.";
      setStatus("failed");
      setErrorMessage(message);
    }
  }, [activeKey, applyRecord, counterpartyId]);

  const dismissConflict = useCallback(() => {
    // Keep local edits; do not load server or overwrite. Shared apply stays available.
    setConflict(null);
    setStatus("unsaved");
    setErrorMessage("");
  }, []);

  const reopenSharedConflict = useCallback(() => {
    const draft = draftsRef.current[activeKey];
    if (!draft) return;
    setSharedWritePending(true);
    setStatus("conflict");
    setConflict({
      code: "shared_deal_conflict",
      message:
        "Your investment was saved. Shared deal changes were not applied to other holdings yet.",
      deal_id: draft.dealId || undefined,
      deal_updated_at: draft.dealUpdatedAt,
      sibling_count: draft.siblingCount,
      changed_fields: [],
    });
    setErrorMessage("");
  }, [activeKey]);

  return {
    enabled: persistEnabled,
    ready,
    status,
    errorMessage,
    conflict,
    sharedWritePending,
    retry,
    applyShared,
    refresh,
    dismissConflict,
    reopenSharedConflict,
  };
}
