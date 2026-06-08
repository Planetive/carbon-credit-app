export type CommunityRelationsAssetData = {
  /** EM-EP-210b.1 — Process to manage community rights risks and opportunities */
  communityRightsProcessNarrative: string;
  /** EM-EP-210b.2 — Number of non-technical delays */
  nonTechnicalDelayCount: string;
  /** EM-EP-210b.3 — Days of non-technical delays */
  nonTechnicalDelayDays: string;
  /** EM-EP-210b.4 — Specific delays and associated costs */
  delayCostsNarrative: string;
  /** EM-EP-210b.5 — Root cause of non-technical delays */
  delayRootCauseNarrative: string;
  /** EM-EP-210b.6 — Corrective actions for non-technical delays */
  delayCorrectiveActionsNarrative: string;
};

export type CommunityRelationsStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, CommunityRelationsAssetData>;
};
