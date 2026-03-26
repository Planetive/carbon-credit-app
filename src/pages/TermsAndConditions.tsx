import MainHeader from "@/components/ui/MainHeader";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Terms and Conditions
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Rethink Carbon - Enterprise SaaS Agreement
        </p>
        <p className="text-sm text-gray-600 mb-8">
          Effective Date: March 26, 2026
        </p>

        <div className="space-y-6 text-gray-800 leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Definitions</h2>
            <p>
              "Customer Data" means all data submitted by Customer. "Personal Data"
              has the meaning defined under GDPR Article 4(1).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. License Grant</h2>
            <p>
              Subject to these terms and timely payment of applicable fees, the
              Company grants Customer a limited, non-exclusive, non-transferable,
              non-sublicensable, revocable license to access and use the Platform
              solely for internal business purposes during the active subscription
              term. All rights not expressly granted are reserved by the Company.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Service Levels</h2>
            <p>
              The Company will use commercially reasonable efforts to maintain 99%
              uptime, excluding force majeure events and planned maintenance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Data Processing Compliance</h2>
            <p>
              Where the Company acts as Processor, it shall comply with Article 28
              GDPR and other applicable data protection laws, including processing
              only on documented instructions, maintaining confidentiality and
              security measures, assisting with data subject rights, and supporting
              compliance and audit obligations.
            </p>
            <p className="mt-2">
              Subprocessors may be engaged only with appropriate authorization and
              equivalent contractual data protection obligations. The Company remains
              liable for subprocessor performance of those obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              5. Platform Nature and Decision Disclaimer
            </h2>
            <p>
              The Platform provides analytical and intelligence outputs and does not
              constitute financial, investment, regulatory, legal, or operational
              advice. Customer remains solely responsible for decisions taken based on
              platform outputs and for validating all input data and resulting
              analyses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
            <p>
              All Platform intellectual property remains the exclusive property of the
              Company. Customer retains ownership of Customer Data. The Company may
              use aggregated and anonymized data for system improvement and research,
              provided no Customer or data subject is identifiable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Confidentiality</h2>
            <p>
              Each party shall protect the other party&apos;s confidential information
              using at least reasonable industry-standard safeguards, limit access to
              authorized personnel with need-to-know, and use information only for
              permitted purposes under this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p>
              Liability limitations apply as set out in the agreement, subject to
              carve-outs including willful misconduct, gross negligence, fraud, and
              certain data protection or confidentiality breaches. The aggregate cap
              is generally limited to 12 months of subscription fees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Termination and Data Deletion</h2>
            <p>
              On termination, platform access is suspended. Customer Data is retained
              for up to two months for export and transition support, then deleted or
              irreversibly anonymized, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Indemnification</h2>
            <p>
              Each party indemnifies the other for regulatory penalties arising from
              its own breach.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              11. Governing Law and Dispute Resolution
            </h2>
            <p>
              Governing Law: Laws of Pakistan. Dispute Resolution: Arbitration in
              Pakistan under applicable arbitration statutes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">12. Force Majeure</h2>
            <p>
              Neither party is liable for failure or delay caused by events beyond
              reasonable control.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;
