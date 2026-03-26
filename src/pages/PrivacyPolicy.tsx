import MainHeader from "@/components/ui/MainHeader";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-600 mb-1">
          Rethink Carbon - Enterprise Privacy Policy
        </p>
        <p className="text-sm text-gray-600 mb-8">
          Effective Date: March 26, 2026 | Last Updated: March 26, 2026
        </p>

        <div className="space-y-6 text-gray-800 leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy describes how Rethink Carbon processes personal
              data through its cloud-based platform in line with GDPR requirements
              and enterprise SaaS security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Roles Under GDPR</h2>
            <p>
              Where customers upload data, the customer acts as Data Controller and
              Rethink Carbon acts as Data Processor based on documented instructions.
              For account, billing, and security operations, Rethink Carbon may act
              as an independent Controller.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Data We Process</h2>
            <p>
              Depending on customer configuration, data categories may include
              financial/commercial data, emissions and sustainability metrics,
              counterparty information, and platform technical/security metadata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Legal Bases</h2>
            <p>
              Processing may rely on contractual necessity, legitimate interests,
              legal obligation, consent (where required), and other applicable GDPR
              legal bases depending on context.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Retention and Deletion</h2>
            <p>
              Customer data is retained during the active subscription and for up to
              two months after termination for retrieval/transition, then deleted or
              irreversibly anonymized (subject to legal retention requirements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Security Measures</h2>
            <p>
              We apply industry-standard controls including encryption in transit and
              at rest, RBAC, MFA for privileged access, logging/monitoring, incident
              response, vulnerability management, and governance controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. International Transfers</h2>
            <p>
              Where data is transferred outside the EEA, transfer safeguards such as
              SCCs and supplementary controls are applied in accordance with GDPR
              Articles 44-49.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Data Subject Rights</h2>
            <p>
              Data subjects may exercise rights including access, rectification,
              erasure, restriction, portability, objection, and rights related to
              automated decision-making, subject to legal limitations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
            <p>
              For privacy-related requests, contact:{" "}
              <a className="text-primary hover:underline" href="mailto:connect@rethinkcarbon.io">
                connect@rethinkcarbon.io
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
