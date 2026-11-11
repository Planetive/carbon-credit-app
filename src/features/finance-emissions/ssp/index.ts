export { SSP_LOAN_TYPE, isSspLoanType, filterQuestionnaireOnlyLoanTypes, financeLoanTypeLabel } from "../config/loanTypeOptions";
export {
  resolveSspAccounting,
  sspQualifiesForMethod,
  currentEligibilityQuestion,
  visibleEligibilityQuestions,
  defaultPcafClassForFamily,
  cafDenominatorHint,
  emptyEligibility,
} from "./eligibility";
export { sspOutcomeDisplay, sspRedirectLoanType, STRUCTURE_TYPE_LABELS, COLLATERAL_CLASS_OPTIONS } from "./copy";
export {
  createSspDraft,
  createCollateral,
  createLoan,
  createPool,
  createPoolOfPools,
  createTranche,
  createHolding,
  createSspId,
  ensureSspInstances,
  sspInstanceKey,
  patchSspDraft,
  patchSspEligibility,
  draftOutcome,
  sumLoanCoaInPool,
  copySharedDeal,
  SSP_CURRENCIES,
} from "./state";
export {
  validateSspStep,
  validateSspEligibility,
  validateSspDeal,
  validateSspHierarchy,
  sspStepIsComplete,
  sspQuestionnaireComplete,
  sspHierarchyWarnings,
} from "./validation";
export {
  SSP_BACKEND_AVAILABLE,
  SSP_CALCULATE_AVAILABLE,
  SSP_REPORTABLE_SAVE_AVAILABLE,
  SSP_DRAFT_API_AVAILABLE,
  SSP_CALCULATE_BLOCKED_MESSAGE,
  SSP_REPORTABLE_BLOCKED_MESSAGE,
  canCalculateSsp,
  canSaveReportableSsp,
  assertSspNotReportable,
  rejectSspReportableResults,
  isSspResultType,
} from "./reportableGuard";
export { mapSspPreviewResponse } from "./mapSspPreviewResponse";
export type { SspPreviewViewModel, SspPreviewScopeBreakdown } from "./mapSspPreviewResponse";
export {
  canPreviewCalculateSsp,
  sspPreviewCalculateBlockers,
  SSP_SUPPORTED_STRUCTURE_TYPES,
  SSP_BLOCKED_STRUCTURE_TYPES,
} from "./previewGate";
export { sspWizardSteps, isSspWizardStepId } from "./wizardSteps";
export { SspQuestionnaire } from "./SspQuestionnaire";
export { SspBackendUnavailableBanner, SspPreviewNotice, SspResultsPanel } from "./SspResultsPanel";
export { SspHierarchyEditor } from "./SspHierarchyEditor";
// SspUnderlyingClassFields / SspUnderlyingQuestionnaire pull calculator forms
// (and supabase factor loaders). Import them from ./SspUnderlyingClassFields
// directly — do not re-export here or unit tests that import this barrel fail
// under Node (no localStorage).
export {
  normalizeClassInputs,
  serializeClassInputs,
} from "./underlying/classInputs";
export { formulasForCollateral } from "./underlying/formulasForCollateral";
export {
  questionnairePayload as sspQuestionnairePayload,
  toSspDraftUpsertBody,
  snapshotToSspDraft,
  hydrateSspDraftFromRecord,
  draftFingerprint as sspDraftFingerprint,
  sharedFingerprint as sspSharedFingerprint,
  shouldConfirmSharedWrite as shouldConfirmSspSharedWrite,
  parseSspConflict,
  mergeResumedDrafts as mergeResumedSspDrafts,
  nextSaveSeq as nextSspSaveSeq,
  isStaleSaveResponse as isStaleSspSaveResponse,
} from "./draftPersistence";
export type { SspDraftSaveStatus } from "./draftPersistence";
export { useSspDraftPersistence } from "./useSspDraftPersistence";
export type {
  SspDraft,
  SspByInstance,
  SspAccountingOutcome,
  SspEligibilityAnswers,
  SspDealInfo,
  SspCollateral,
  SspLoan,
  SspPool,
  SspPoolOfPools,
  SspTranche,
  SspHolding,
} from "./types";
