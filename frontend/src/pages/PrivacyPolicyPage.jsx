import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';

/**
 * Privacy Policy — drafted to cover the personal data this site actually
 * collects (lead form name/phone/email/city, analytics cookies, WhatsApp
 * click-throughs). Aligned with India's DPDP Act, 2023 expectations.
 *
 * Do NOT consider this a substitute for legal review — it is a starting
 * point that the business should have a lawyer audit before launch.
 */
const PrivacyPolicyPage = () => {
  return (
    <div className="pb-16 md:pb-0 bg-white">
      <Seo
        path="/privacy-policy"
        title="Privacy Policy | Decorous"
        description="How Decorous collects, uses and safeguards your personal information when you use decorous.in or contact us for a construction or interior design enquiry."
      />

      <section className="py-16 md:py-20 bg-[#1a365d] text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-white">Privacy Policy</h1>
          <p className="text-white/70 text-sm">Last updated: 27 June 2026</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <article className="max-w-3xl mx-auto px-4 md:px-8 prose prose-slate prose-headings:text-[#1a365d] prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700">
          <p>
            Decorous (&ldquo;Decorous&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates the website
            {' '}<strong>decorous.in</strong> and provides construction, interior design and
            project management services in Bhubaneswar and across Odisha, India.
            This Privacy Policy explains what information we collect, why we collect
            it, and how you can control it.
          </p>

          <h2>1. Information we collect</h2>
          <h3>1.1 Information you give us</h3>
          <ul>
            <li>Name, phone number, email address and city — collected through our enquiry forms, cost calculator and contact page.</li>
            <li>Plot size, construction type, budget range and project requirements — only if you choose to share them.</li>
            <li>WhatsApp messages and call records when you initiate contact with us.</li>
          </ul>
          <h3>1.2 Information we collect automatically</h3>
          <ul>
            <li>Device type, browser, IP address, referring URL and pages visited (via Google Analytics 4).</li>
            <li>Cookies and pixel data for advertising attribution (Meta Pixel).</li>
          </ul>

          <h2>2. How we use your information</h2>
          <ul>
            <li>To respond to your enquiry, schedule site visits and provide BOQs / cost estimates.</li>
            <li>To send service updates, project status and (occasionally) marketing communications you can opt out of.</li>
            <li>To measure site performance and improve our content and services.</li>
            <li>To prevent fraud, secure our systems and comply with legal obligations.</li>
          </ul>

          <h2>3. Sharing of information</h2>
          <p>
            We do <strong>not</strong> sell your personal data. We share information only with:
          </p>
          <ul>
            <li>Service providers who help us run the website (e.g. Google Analytics, MongoDB hosting, email providers) — bound by contractual confidentiality.</li>
            <li>Government or law enforcement bodies when legally required.</li>
            <li>Professional advisors (lawyers, auditors) under confidentiality obligations.</li>
          </ul>

          <h2>4. Data retention</h2>
          <p>
            We retain enquiry data for up to 36 months after your last interaction
            with us, so we can continue conversations and audit our marketing
            performance. You can request earlier deletion at any time
            (see Section&nbsp;7).
          </p>

          <h2>5. Security</h2>
          <p>
            We use industry-standard encryption (HTTPS), access controls and
            backup procedures to protect your data. No method of transmission
            over the Internet is 100% secure — we strive to use commercially
            acceptable means to protect your personal information.
          </p>

          <h2>6. Cookies</h2>
          <p>
            We use cookies and similar technologies for analytics and ad
            attribution. You can disable cookies in your browser settings;
            doing so may impact site functionality.
          </p>

          <h2>7. Your rights</h2>
          <p>Under India&apos;s Digital Personal Data Protection Act, 2023 and applicable laws, you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete data.</li>
            <li>Request deletion of your personal data.</li>
            <li>Withdraw consent for marketing communications at any time.</li>
            <li>Lodge a complaint with the Data Protection Board of India.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:contact@decorous.in" className="text-[#F5A623] underline">contact@decorous.in</a>{' '}
            or call <a href="tel:+917008863329" className="text-[#F5A623] underline">+91 7008863329</a>.
            We will respond within 30 days.
          </p>

          <h2>8. Children</h2>
          <p>
            Decorous services are not directed at individuals under the age of 18.
            We do not knowingly collect personal information from children.
          </p>

          <h2>9. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The latest version
            will always be posted on this page with a revised &ldquo;Last updated&rdquo; date.
          </p>

          <h2>10. Contact us</h2>
          <p>
            <strong>Decorous</strong><br />
            Plot N3/370, Nayapalli, Bhubaneswar, Odisha 751015, India<br />
            Email: <a href="mailto:contact@decorous.in" className="text-[#F5A623] underline">contact@decorous.in</a><br />
            Phone: <a href="tel:+917008863329" className="text-[#F5A623] underline">+91 7008863329</a>
          </p>

          <p className="mt-10 text-sm text-slate-500">
            See also: <Link to="/terms-and-conditions" className="text-[#F5A623] underline">Terms &amp; Conditions</Link>
          </p>
        </article>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
