/**
 * POPIA-aligned privacy notice for Stoki.
 *
 * Structured to satisfy s.18 of the Protection of Personal Information Act
 * (notification to data subject) and s.69 (direct marketing) at minimum:
 *   - identity of the responsible party
 *   - personal information being collected + source
 *   - purpose + lawful basis
 *   - recipients / processors
 *   - cross-border transfer disclosure
 *   - data-subject rights, including the route to the Information Regulator
 *   - retention period
 *   - security safeguards
 *
 * Note for the operator: before going to production the Information Officer
 * details below must be replaced with the registered IO's name + contact.
 * Registration with the Information Regulator (https://inforegulator.org.za)
 * is mandatory.
 */
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12" style={{ color: 'var(--foreground)' }}>
      <h1 className="text-2xl font-bold mb-2">Privacy Notice</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Last updated: May 2026 · Compliant with the Protection of Personal Information Act, 2013 (POPIA)
      </p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
        <section>
          <h2 className="font-bold text-lg mb-2">1. Who we are</h2>
          <p>
            Stoki (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is the responsible party for the personal information processed
            through this app. We provide an operating-system for South African SMME retail —
            stock, sales, credit book, invoicing, and an AI advisor.
          </p>
          <p className="mt-2">
            Contact: <a href="mailto:hello@stoki.app" className="text-brand underline">hello@stoki.app</a>
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">2. What information we collect</h2>
          <p>We only collect personal information needed to deliver the service:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Identifiers:</strong> email address or South African cell number used to sign in.</li>
            <li><strong>Business records:</strong> store name, products, prices, sales, restocks, expenses, cash-up records.</li>
            <li><strong>Customer records (entered by you):</strong> debtor names, phone numbers, addresses, B2B customer details.</li>
            <li><strong>Device &amp; usage data:</strong> session cookies, browser type, basic activity logs needed for security.</li>
            <li><strong>Communications:</strong> messages you send to support; opt-in marketing communications.</li>
          </ul>
          <p className="mt-2">
            We do not knowingly collect special personal information (race, health, biometrics)
            and we do not collect information from children under 18.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">3. Why we use it &amp; lawful basis</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>To <strong>provide the service</strong> you signed up for — performance of contract (POPIA s.11(1)(b)).</li>
            <li>To <strong>secure accounts</strong>, prevent fraud, and operate the platform — legitimate interest (s.11(1)(f)).</li>
            <li>To <strong>send transactional notifications</strong> (low stock, daily summaries) — performance of contract.</li>
            <li>To <strong>send marketing</strong> (only if you opt in) — consent (s.11(1)(a)). You may withdraw consent at any time.</li>
            <li>To <strong>comply with legal obligations</strong> (tax records, SARS-required invoice retention) — s.11(1)(c).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">4. Who we share it with</h2>
          <p>
            We do not sell, rent, or trade your information. Your business records are not used for
            advertising or shared with marketing networks.
          </p>
          <p className="mt-2">
            To deliver the service we engage a small set of operators (as defined in POPIA) for
            functions such as hosting, storage, message delivery, and AI processing. These operators
            are bound by written processing terms, may only process your information for the
            purposes set out in this notice, may not retain it longer than required, and may not use
            it to train models or for any independent purpose of their own.
          </p>
          <p className="mt-2">
            We will disclose information when compelled by valid legal process — for example, a
            court order or a lawful request from the Information Regulator, SARS, or law-enforcement
            authorities.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">5. Cross-border transfers</h2>
          <p>
            Some processing may take place on servers located outside South Africa. Where this
            happens, the recipient is bound by data-processing terms that provide a level of
            protection substantially similar to POPIA, in line with s.72 of the Act.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">6. How long we keep it</h2>
          <p>
            We keep your information for as long as your account is active. After you delete your account we retain
            your data for up to 30 days to allow recovery of accidental deletions, and then permanently destroy it —
            except where the law requires longer retention (e.g. tax invoices retained for the SARS-required period).
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">7. Security</h2>
          <p>
            All connections use TLS encryption. Your data is isolated from other accounts at the database level via
            row-level security. Passwords are hashed; we cannot recover your password and never see it in plain text.
            We monitor for unauthorised access and will notify you and the Information Regulator without undue delay
            if a security compromise affects your personal information (POPIA s.22).
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">8. Your rights under POPIA</h2>
          <p>You have the following rights, exercisable free of charge by emailing <a href="mailto:hello@stoki.app" className="text-brand underline">hello@stoki.app</a>:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Access:</strong> request a copy of the personal information we hold about you (s.23).</li>
            <li><strong>Correction:</strong> ask us to correct or update inaccurate information (s.24).</li>
            <li><strong>Deletion:</strong> ask us to delete information that is no longer required, or that we are not legally permitted to retain (s.24).</li>
            <li><strong>Objection:</strong> object to the processing of your information at any time on reasonable grounds (s.11(3)).</li>
            <li><strong>Withdraw consent:</strong> withdraw any consent you previously gave, including consent to marketing.</li>
            <li><strong>Portability:</strong> export a full copy of your store data as JSON from <em>Settings → Account</em>.</li>
            <li><strong>Complain:</strong> lodge a complaint with the Information Regulator (details below) if you believe we have not handled your information correctly.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">9. Direct marketing</h2>
          <p>
            We will only send marketing communications about Stoki if you have explicitly opted in. Every marketing
            message includes an unsubscribe option. We do not use your customer or debtor records to send marketing
            on your behalf — your customer data stays your customer data.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">10. Cookies &amp; local storage</h2>
          <p>
            Stoki uses cookies only for authentication sessions and localStorage for preferences you set in the app
            (theme, language, sticky filters, advisor chat history kept on your device). We do not use third-party
            tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">11. Children</h2>
          <p>
            Stoki is intended for adult business owners. We do not knowingly process the personal information of
            children under 18. If you believe a child has provided information to us, contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">12. Changes to this notice</h2>
          <p>
            We may update this notice as the service evolves. The &quot;Last updated&quot; date at the top will reflect any
            changes. Material changes will be notified to you via email or an in-app banner before they take effect.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">13. Information Officer &amp; contact</h2>
          <p>
            Our Information Officer can be reached at <a href="mailto:hello@stoki.app" className="text-brand underline">hello@stoki.app</a>.
            If you are not satisfied with our response, you may lodge a complaint with the Information Regulator:
          </p>
          <ul className="list-none mt-2 space-y-1 text-[13px]" style={{ color: 'var(--muted)' }}>
            <li><strong>Information Regulator (South Africa)</strong></li>
            <li>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</li>
            <li>Telephone: +27 (0)10 023 5200</li>
            <li>Email: <a href="mailto:enquiries@inforegulator.org.za" className="text-brand underline">enquiries@inforegulator.org.za</a></li>
            <li>Complaints: <a href="mailto:PAIAComplaints.IR@justice.gov.za" className="text-brand underline">PAIAComplaints.IR@justice.gov.za</a> / <a href="mailto:POPIAComplaints@inforegulator.org.za" className="text-brand underline">POPIAComplaints@inforegulator.org.za</a></li>
            <li>Website: <a href="https://inforegulator.org.za" className="text-brand underline" rel="noopener noreferrer" target="_blank">inforegulator.org.za</a></li>
          </ul>
        </section>
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
        <a href="/login" className="text-brand text-sm font-semibold">← Back to sign in</a>
      </div>
    </div>
  )
}
