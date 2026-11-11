import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { USE_JWT_AUTH } from "@/api/config";
import {
  getSspDraftByInstance,
  listSspDrafts,
  upsertSspDraft,
  type SspDraftConflict,
} from "@/api/sspDrafts";
import {
  draftFingerprint,
  hydrateSspDraftFromRecord,
  isStaleSaveResponse,
  mergeResumedDrafts,
  nextSaveSeq,
  parseSspConflict,
  shouldConfirmSharedWrite,
  toSspDraftUpsertBody,
  type SspDraftSaveStatus,
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
  const [ready, setReady] = useState(false);
  const seqRef = useRef<Record<string, number>>({});
  const lastSavedRef = useRef<Record<string, SspDraft>>({});
  const fingerprintRef = useRef<Record<string, string>>({});
  const draftsRef = useRef(drafts);
  const onReplaceRef = useRef(onReplace);
  draftsRef.current = drafts;
  onReplaceRef.current = onReplace;

  const remember = (key: string, draft: SspDraft) => {
    lastSavedRef.current[key] = draft;
    fingerprintRef.current[key] = draftFingerprint(draft);
  };

  const applyRecord = useCallback((
    key: string,
    draft: SspDraft,
    record: Parameters<typeof hydrateSspDraftFromRecord>[1],
    keepLocalShared = false
  ) => {
    const persisted = hydrateSspDraftFromRecord(draft, record);
    const next = keepLocalShared ? copySharedDeal(draft, persisted) : persisted;
    onReplaceRef.current({ ...draftsRef.current, [key]: next });
    lastSavedRef.current[key] = persisted;
    fingerprintRef.current[key] = draftFingerprint(next);
    return next;
  }, []);

  const saveKey = useCallback(
    async (key: string, draft: SspDraft, seq: number, updateShared: boolean) => {
      const saved = lastSavedRef.current[key];
      const sharedPending = !updateShared && shouldConfirmSharedWrite(draft, saved);
      const payload = sharedPending && saved ? copySharedDeal(saved, draft) : draft;
      setStatus("saving");
      setErrorMessage("");
      if (!sharedPending) setConflict(null);
      try {
        const record = await upsertSspDraft(
          toSspDraftUpsertBody(payload, {
            counterpartyId,
            updateShared,
          })
        );
        if (isStaleSaveResponse(seq, seqRef.current[key] || 0)) {
          return;
        }
        applyRecord(key, draft, record, sharedPending);
        if (sharedPending) {
          setStatus("conflict");
          setConflict({
            code: "shared_deal_conflict",
            message:
              "Your holding was saved. Shared deal changes were not applied to other holdings.",
            deal_id: record.deal.id,
            deal_updated_at: record.deal.updated_at,
            sibling_count: record.sibling_count,
          });
          setErrorMessage("Shared deal changed — refresh/review");
          return;
        }
        setStatus("saved");
        setConflict(null);
      } catch (error) {
        if (isStaleSaveResponse(seq, seqRef.current[key] || 0)) {
          return;
        }
        const parsed = parseSspConflict(error);
        if (parsed) {
          setConflict(parsed);
          setStatus("conflict");
          setErrorMessage(parsed.message);
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Save failed — retry";
        setStatus("failed");
        setErrorMessage(message || "Save failed — retry");
      }
    },
    [applyRecord, counterpartyId]
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
        }
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setErrorMessage("Drafts could not be loaded. You can keep editing and retry save.");
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
      const latest = draftsRef.current[key];
      if (!latest) return;
      void saveKey(key, latest, seq, false);
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [persistEnabled, ready, activeKey, drafts, saveKey]);

  const retry = useCallback(() => {
    const draft = draftsRef.current[activeKey];
    if (!draft) return;
    const seq = nextSaveSeq(seqRef.current[activeKey] || 0);
    seqRef.current[activeKey] = seq;
    void saveKey(activeKey, draft, seq, false);
  }, [activeKey, saveKey]);

  const applyShared = useCallback(() => {
    const draft = draftsRef.current[activeKey];
    if (!draft) return;
    const seq = nextSaveSeq(seqRef.current[activeKey] || 0);
    seqRef.current[activeKey] = seq;
    void saveKey(activeKey, draft, seq, true);
  }, [activeKey, saveKey]);

  const refresh = useCallback(async () => {
    const draft = draftsRef.current[activeKey];
    if (!draft?.financingInstanceId) return;
    setStatus("saving");
    try {
      const record = await getSspDraftByInstance(draft.financingInstanceId, counterpartyId);
      applyRecord(activeKey, draft, record);
      setStatus("saved");
      setConflict(null);
      setErrorMessage("");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not refresh this draft.";
      setStatus("failed");
      setErrorMessage(message);
    }
  }, [activeKey, applyRecord, counterpartyId]);

  return {
    enabled: persistEnabled,
    ready,
    status,
    errorMessage,
    conflict,
    retry,
    applyShared,
    refresh,
  };
}
