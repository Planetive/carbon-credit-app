import MainHeader from "@/components/ui/MainHeader";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LegalMarkdownPageProps {
  markdown: string;
  showHeader?: boolean;
  backTo?: string;
}

const LegalMarkdownPage = ({
  markdown,
  showHeader = true,
  backTo,
}: LegalMarkdownPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <MainHeader />}
      <main className={`max-w-4xl mx-auto px-4 pb-12 ${showHeader ? "pt-28" : "pt-10"}`}>
        {backTo && (
          <div className="mb-6">
            <Link
              to={backTo}
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              ← Back to dashboard
            </Link>
          </div>
        )}
        <article
          className={[
            // `prose` is supported when Tailwind Typography plugin is enabled.
            "prose prose-slate max-w-none",
            // Ensure document-like styling even if `prose` modifiers aren't applied.
            "text-gray-800",
            "[&_h1]:font-extrabold [&_h1]:text-gray-900 [&_h1]:mt-8 [&_h1]:mb-3",
            "[&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3",
            "[&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2",
            "[&_p]:leading-7 [&_p]:text-gray-800",
            "[&_li]:text-gray-800",
          ].join(" ")}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
};

export default LegalMarkdownPage;
