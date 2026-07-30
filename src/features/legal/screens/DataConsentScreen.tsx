import LegalMarkdownPage from "@/components/legal/LegalMarkdownPage";
import dataConsentMarkdown from "../../../../docs/legal/data-consent-form.md?raw";

const DataConsentScreen = () => {
  return <LegalMarkdownPage markdown={dataConsentMarkdown} showHeader={false} backTo="/dashboard" />;
};

export default DataConsentScreen;
