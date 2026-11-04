import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { USE_JWT_AUTH } from "@/api/config";
import {
  getUopDraftByInstance,
  listUopDrafts,
  upsertUopDraft,
  type UopDraftConflict,
} from "@/api/uopDrafts";
import {
  draftFingerprint,
  hydrateUopDraftFromRecord,
  isStaleSaveResponse,
  mergeResumedDrafts,
  nextSaveSeq,
  parseUopConflict,
  shouldConfirmSharedWrite,
  toUopDraftUpsertBody,
  type UopDraftSaveStatus,
} from "./draftPersistence";
import { UOP_DRAFT_API_AVAILABLE } from "./reportableGuard";
import { copySharedStructure } from "./state";
import type { UopByInstance, UopDraft } from "./types";

const SAVE_DEBOUNCE_MS = 700;

type Options = {
  enabled: boolean;
  drafts: UopByInstance;
  activeKey: string;
  counterpartyId?: string | null;
  onReplace: (next: UopByInstance) => void;
};

export function useUopDraftPersistence({
  enabled,
  drafts,
  activeKey,
  counterpartyId,
  onReplace,
}: Options) {
  const persistEnabled = Boolean(enabled && UOP_DRAFT_API_AVAILABLE && USE_JWT_AUTH);
  const [status, setStatus] = useState<UopDraftSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [conflict, setConflict] = useState<UopDraftConflict | null>(null);
  const [ready, setReady] = useState(false);
  const seqRef = useRef<Record<string, number>>({});
  const lastSavedRef = useRef<Record<string, UopDraft>>({});
  const fingerprintRef = useRef<Record<string, string>>({});
  const draftsRef = useRef(drafts);
  const onReplaceRef = useRef(onReplace);
  draftsRef.current = drafts;
  onReplaceRef.current = onReplace;

  const remember = (key: string, draft: UopDraft) => {
    lastSavedRef.current[key] = draft;
    fingerprintRef.current[key] = draftFingerprint(draft);
  };

  const applyRecord = useCallback((
    key: string,
    draft: UopDraft,
    record: Parameters<typeof hydrateUopDraftFromRecord>[1],
    keepLocalShared = false
  ) => {
    const persisted = hydrateUopDraftFromRecord(draft, record);
    const next = keepLocalShared ? copySharedStructure(draft, persisted) : persisted;
    onReplaceRef.current({ ...draftsRef.current, [key]: next });
    lastSavedRef.current[key] = persisted;
    fingerprintRef.current[key] = draftFingerprint(next);
    return next;
  }, []);

  const saveKey = useCallback(
    async (key: string, draft: UopDraft, seq: number, updateShared: boolean) => {
      const saved = lastSavedRef.current[key];
      const sharedPending = !updateShared && shouldConfirmSharedWrite(draft, saved);
      const payload = sharedPending && saved ? copySharedStructure(saved, draft) : draft;
      setStatus("saving");
      setErrorMessage("");
      if (!sharedPending) setConflict(null);
      try {
        const record = await upsertUopDraft(
          toUopDraftUpsertBody(payload, {
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
            code: "shared_structure_conflict",
            message:
              "Your holding was saved. Shared fund changes were not applied to other holdings.",
            structure_id: record.structure.id,
            structure_updated_at: record.structure.updated_at,
            sibling_count: record.sibling_count,
          });
          setErrorMessage("Shared structure changed — refresh/review");
          return;
        }
        setStatus("saved");
        setConflict(null);
      } catch (error) {
        if (isStaleSaveResponse(seq, seqRef.current[key] || 0)) {
          return;
        }
        const parsed = parseUopConflict(error);
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
        const records = await listUopDrafts(
          counterpartyId ? { counterparty_id: counterpartyId } : undefined
        );
        if (cancelled) return;
        const merged = mergeResumedDrafts(draftsRef.current, records);
        Object.entries(merged).forEach(([key, draft]) => remember(key, draft));
        onReplaceRef.current(merged);
        if (Object.values(merged).some((draft) => draft.investmentId)) {
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
      const record = await getUopDraftByInstance(draft.financingInstanceId, counterpartyId);
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
