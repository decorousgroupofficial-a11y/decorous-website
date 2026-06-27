import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';

/**
 * Terms & Conditions — covers website use only. Construction project terms
 * are governed by individual signed work-order contracts and are NOT
 * superseded by anything on this page.
 */
const TermsPage = () => {
  return (
    <div className="pb-16 md:pb-0 bg-white">
      <Seo
        path="/terms-and-conditions"
        title="Terms & Conditions | Decorous"
        description="Terms of service governing your use of decorous.in. Construction project agreements are governed by separate signed contracts."
      />

      <section className="py-16 md:py-20 bg-[#1a365d] text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-white">Terms &amp; Conditions</h1>
          <p className="text-white/70 text-sm">Last updated: 27 June 2026</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <article className="max-w-3xl mx-auto px-4 md:px-8 prose prose-slate prose-headings:text-[#1a365d] prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700">
          <p>
            Welcome to <strong>decorous.in</strong>. By accessing or using this
            website you agree to be bound by these Terms &amp; Conditions
            (&ldquo;Terms&rdquo;). If you do not agree, please do not use the site.
          </p>

          <h2>1. About Decorous</h2>
          <p>
            Decorous is a construction and interior design company headquartered at
            Plot N3/370, Nayapalli, Bhubaneswar, Odisha 751015, India.
            We provide residential, commercial, interior fit-out and PEB/warehouse
            construction services across Odisha.
          </p>

          <h2>2. Website use</h2>
          <ul>
            <li>You agree to use this site only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit anyone else&apos;s use of the site.</li>
            <li>You agree not to attempt to gain unauthorised access to any portion of the site, our servers, or any associated systems.</li>
            <li>You agree not to use automated systems (bots, scrapers) without our prior written permission.</li>
          </ul>

          <h2>3. Information accuracy</h2>
          <p>
            Information on this website (including cost ranges, timelines and
            project examples) is provided in good faith and for general guidance
            only. <strong>It does not constitute a binding offer</strong>.
            Final pricing and timelines are confirmed in writing through a signed
            BOQ / Work Order / Contract before any construction commences.
          </p>

          <h2>4. Intellectual property</h2>
          <p>
            All content on this site — including text, graphics, logos, images,
            project photographs and software — is the property of Decorous or
            its licensors and is protected by Indian and international copyright
            laws. You may not reproduce, redistribute or modify any content
            without written permission.
          </p>

          <h2>5. Project agreements</h2>
          <p>
            <strong>These Terms govern your use of the website only.</strong>
            Any construction or interior design engagement with Decorous is
            governed by a separate written contract executed between you and
            Decorous, which prevails over any statement on this website.
          </p>

          <h2>6. Free estimates and quotes</h2>
          <p>
            Free cost estimates provided via the website (cost calculator,
            phone consultations, site visits) are non-binding indicative ranges.
            Detailed BOQ and locked-rate quotations are issued only after a
            paid site survey and design brief sign-off.
          </p>

          <h2>7. Third-party links</h2>
          <p>
            This site may contain links to third-party websites (e.g. Google
            Maps, WhatsApp, social media). We are not responsible for the
            content, privacy practices, or terms of those external sites.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Decorous shall
            not be liable for any indirect, incidental, special, consequential
            or punitive damages arising out of your access to or use of this
            website. Our liability under any signed construction agreement is
            governed by that agreement, not by this clause.
          </p>

          <h2>9. Privacy</h2>
          <p>
            Use of this website is also governed by our{' '}
            <Link to="/privacy-policy" className="text-[#F5A623] underline">Privacy Policy</Link>,
            which is incorporated into these Terms by reference.
          </p>

          <h2>10. Governing law &amp; jurisdiction</h2>
          <p>
            These Terms are governed by the laws of India. The courts at
            Bhubaneswar, Odisha shall have exclusive jurisdiction over any
            disputes arising out of or in connection with your use of this
            website.
          </p>

          <h2>11. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the
            site after changes are posted constitutes your acceptance of the
            revised Terms. The latest version is always available on this page.
          </p>

          <h2>12. Contact</h2>
          <p>
            For any questions about these Terms, please contact:
          </p>
          <p>
            <strong>Decorous</strong><br />
            Plot N3/370, Nayapalli, Bhubaneswar, Odisha 751015, India<br />
            Email: <a href="mailto:contact@decorous.in" className="text-[#F5A623] underline">contact@decorous.in</a><br />
            Phone: <a href="tel:+917008863329" className="text-[#F5A623] underline">+91 7008863329</a>
          </p>
        </article>
      </section>
    </div>
  );
};

export default TermsPage;
