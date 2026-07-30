import LegalMarkdownPage from "@/components/legal/LegalMarkdownPage";
import termsMarkdown from "../../../../docs/legal/terms-and-conditions.md?raw";

const TermsAndConditionsScreen = () => {
  return <LegalMarkdownPage markdown={termsMarkdown} showHeader={false} backTo="/dashboard" />;
};

export default TermsAndConditionsScreen;
