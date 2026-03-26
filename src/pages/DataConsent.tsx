import MainHeader from "@/components/ui/MainHeader";

const DataConsent = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Data Processing Consent
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Rethink Carbon - Enterprise Data Processing Consent Instrument
        </p>

        <div className="space-y-6 text-gray-800 leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Categories of Data</h2>
            <p>
              Consent covers customer-configured categories such as financial and
              commercial information, environmental and operational data,
              counterparty/stakeholder-related information, and technical/security
              platform metadata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. GDPR Acknowledgment</h2>
            <p>By consenting, the Customer confirms that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>it acts as Data Controller under GDPR Article 4(7);</li>
              <li>it has a lawful basis under GDPR Article 6; and</li>
              <li>it has obtained required downstream consents where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Hosting and Transfers</h2>
            <p>
              The platform is hosted on AWS and may involve international transfers
              under GDPR Articles 44-49 with safeguards such as SCCs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Retention</h2>
            <p>
              Customer data may be retained for up to two months post-termination for
              retrieval and transition, then deleted or anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Authority</h2>
            <p>
              The person accepting this consent represents and warrants that they are
              authorized to bind the organization.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DataConsent;
