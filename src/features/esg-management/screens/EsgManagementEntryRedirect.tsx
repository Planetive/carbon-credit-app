import { Navigate } from "react-router-dom";
import { isGlobalEsgSetupComplete } from "../boundary/isGlobalEsgSetupComplete";
import { loadBoundaryDraft } from "../boundary/storage";

/**
 * Resolves /esg-management to boundary wizard or topics based on saved boundary draft (localStorage).
 */
const EsgManagementEntryRedirect = () => {
  const draft = loadBoundaryDraft();
  const to = isGlobalEsgSetupComplete(draft) ? "/esg-management/topics" : "/esg-management/boundary-setting";
  return <Navigate to={to} replace />;
};

export default EsgManagementEntryRedirect;
