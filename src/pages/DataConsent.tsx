import LegalMarkdownPage from "@/components/legal/LegalMarkdownPage";
import dataConsentMarkdown from "../../docs/legal/data-consent-form.md?raw";

const DataConsent = () => {
  return <LegalMarkdownPage markdown={dataConsentMarkdown} showHeader={false} backTo="/dashboard" />;
};

export default DataConsent;
