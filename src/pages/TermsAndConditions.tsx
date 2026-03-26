import LegalMarkdownPage from "@/components/legal/LegalMarkdownPage";
import termsMarkdown from "../../docs/legal/terms-and-conditions.md?raw";

const TermsAndConditions = () => {
  return <LegalMarkdownPage markdown={termsMarkdown} showHeader={false} backTo="/dashboard" />;
};

export default TermsAndConditions;
