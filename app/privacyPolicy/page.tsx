export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen z-10 bg-white text-gray-800 p-6 sm:p-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>
      <p className="mb-4">
        Effective date: <strong>[Insert Date]</strong>
      </p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          [Croco conta] (“we”, “our”, or “us”) operates communication services
          that may include automated or direct messaging via WhatsApp using the
          WhatsApp Business API. We are committed to protecting your privacy and
          ensuring that your personal data is handled responsibly.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          2. Information We Collect
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Contact information such as your phone number and name.</li>
          <li>Message content exchanged with our service on WhatsApp.</li>
          <li>
            Technical data such as device info, connection time, and message
            delivery status.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          3. How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To send and receive messages via WhatsApp.</li>
          <li>To provide customer support and respond to inquiries.</li>
          <li>To improve our communication and services.</li>
          <li>To comply with legal obligations and prevent misuse.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          4. Data Sharing and Disclosure
        </h2>
        <p className="mb-2">
          We do not sell or rent your personal data. We may share limited
          information with:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Meta Platforms, Inc.</strong> (WhatsApp), as part of the
            WhatsApp Business API.
          </li>
          <li>
            Service providers who help us manage communication, hosting, or
            analytics.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
        <p>
          We retain your information only as long as necessary to fulfill the
          purposes outlined in this policy or as required by law.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
        <p className="mb-2">You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access, correct, or delete your personal information.</li>
          <li>Withdraw consent for processing (where applicable).</li>
          <li>
            Contact us to exercise these rights at{" "}
            <strong>[your@email.com]</strong>.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Security</h2>
        <p>
          We take reasonable measures to protect your information from
          unauthorized access, disclosure, or misuse. However, no system is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          8. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. The latest
          version will always be available at this URL, with the date of the
          last update clearly stated.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact:
          <br />
          <strong>[Your Name or Company Name]</strong>
          <br />
          Email: <strong>[your@email.com]</strong>
          <br />
          Website: <strong>[yourdomain.com]</strong>
        </p>
      </section>

      <footer className="text-center text-sm text-gray-500 mt-10">
        © {new Date().getFullYear()} [Croco Conta]. All rights reserved.
      </footer>
    </div>
  );
}
