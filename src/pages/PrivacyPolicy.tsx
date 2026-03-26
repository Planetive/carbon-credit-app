import LegalMarkdownPage from "@/components/legal/LegalMarkdownPage";
import privacyPolicyMarkdown from "../../docs/legal/data-privacy-policy.md?raw";

const PrivacyPolicy = () => {
  return <LegalMarkdownPage markdown={privacyPolicyMarkdown} showHeader={false} backTo="/dashboard" />;
};

export default PrivacyPolicy;
