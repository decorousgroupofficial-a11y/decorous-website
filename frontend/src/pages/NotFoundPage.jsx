import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Home, HardHat, ArrowRight, Phone } from 'lucide-react';

/**
 * Branded 404 page. Uses the marketing site colour palette
 * (#1a365d navy + #F5A623 amber) and the same Header/Footer
 * via the App-level layout, so it feels native rather than orphaned.
 *
 * SEO: we explicitly noindex the 404 so Google doesn't accumulate
 * a pile of "not found" URLs in the index.
 */
const NotFoundPage = () => {
  return (
    <div className="pb-16 md:pb-0">
      <Helmet>
        <title>Page not found | Decorous</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <section className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 text-center">
          {/* Visual badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1a365d] text-[#F5A623] rounded-2xl mb-8 mx-auto">
            <HardHat size={42} />
          </div>

          <p className="text-[#F5A623] font-semibold tracking-widest uppercase text-sm mb-3">
            Error 404
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a365d] mb-4 leading-tight">
            Looks like we haven&apos;t built this page yet.
          </h1>
          <p className="text-slate-600 text-lg mb-10 max-w-xl mx-auto">
            The page you&apos;re looking for has either been moved, renamed or
            doesn&apos;t exist. Let&apos;s get you back on solid foundations.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button
                className="bg-[#1a365d] text-white hover:bg-[#0f2442] h-12 px-6 w-full sm:w-auto"
                data-testid="404-home-btn"
              >
                <Home size={18} className="mr-2" />
                Back to home
              </Button>
            </Link>
            <Link to="/services">
              <Button
                variant="outline"
                className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white h-12 px-6 w-full sm:w-auto"
                data-testid="404-services-btn"
              >
                Browse services
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          {/* Quick links to the most-visited destinations */}
          <div className="mt-12 pt-10 border-t border-slate-200">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Or jump to a popular page
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link to="/cost-calculator" className="text-[#1a365d] hover:text-[#F5A623] font-medium" data-testid="404-link-calculator">
                Cost calculator
              </Link>
              <Link to="/projects" className="text-[#1a365d] hover:text-[#F5A623] font-medium" data-testid="404-link-projects">
                Recent projects
              </Link>
              <Link to="/blog" className="text-[#1a365d] hover:text-[#F5A623] font-medium" data-testid="404-link-blog">
                Construction blog
              </Link>
              <Link to="/contact" className="text-[#1a365d] hover:text-[#F5A623] font-medium" data-testid="404-link-contact">
                Contact us
              </Link>
            </div>

            <a
              href="tel:+917008863329"
              className="mt-8 inline-flex items-center gap-2 text-slate-600 hover:text-[#F5A623] text-sm"
              data-testid="404-call-link"
            >
              <Phone size={16} />
              Need to talk? Call +91 7008863329 (Mon–Sat, 10AM–6PM)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotFoundPage;
