import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";

// Layout Components
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import MobileBottomBar from "@/components/layout/MobileBottomBar";

// Page Components — every route is lazy-loaded so a visit to any one page
// only downloads that page's JS, not the other 20+ pages' code too.
const HomePage = lazy(() => import("@/pages/HomePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const ServiceDetailPage = lazy(() => import("@/pages/ServiceDetailPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProcessPage = lazy(() => import("@/pages/ProcessPage"));
const BlogPage = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const CityPage = lazy(() => import("@/pages/CityPage"));
const CitiesListPage = lazy(() => import("@/pages/CitiesListPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const CostCalculatorPage = lazy(() => import("@/pages/CostCalculatorPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Admin and ERP pages (app.decorous.in) are internal-only tools, not part of
// the public marketing site — lazy-load them so visitors never download
// their JS, and so the code isn't sitting in the public bundle to begin with.
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ErpLoginPage = lazy(() => import("@/pages/erp/ErpLoginPage"));
const ErpSignupPage = lazy(() => import("@/pages/erp/ErpSignupPage"));
const ErpLayout = lazy(() => import("@/pages/erp/ErpLayout"));
const ErpOverviewPage = lazy(() => import("@/pages/erp/ErpOverviewPage"));
const ErpProjectsPage = lazy(() => import("@/pages/erp/ErpProjectsPage"));
const ErpVendorsPage = lazy(() => import("@/pages/erp/ErpVendorsPage"));
const ErpMaterialsPage = lazy(() => import("@/pages/erp/ErpMaterialsPage"));
const ErpDprListPage = lazy(() => import("@/pages/erp/ErpDprListPage"));
const ErpDprNewPage = lazy(() => import("@/pages/erp/ErpDprNewPage"));
const ErpExpensesPage = lazy(() => import("@/pages/erp/ErpExpensesPage"));
const ErpApprovalsPage = lazy(() => import("@/pages/erp/ErpApprovalsPage"));
const ErpSettingsPage = lazy(() => import("@/pages/erp/ErpSettingsPage"));

// Layout wrapper that hides header/footer for admin and ERP
const Layout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  const isErp = location.pathname.startsWith('/erp');
  
  if (isAdmin || isErp) {
    return children;
  }
  
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <FloatingButtons />
      <MobileBottomBar />
    </>
  );
};

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <BrowserRouter>
        <Layout>
          <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:slug" element={<ServiceDetailPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/cities" element={<CitiesListPage />} />
            <Route path="/cities/:slug" element={<CityPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cost-calculator" element={<CostCalculatorPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsPage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* ERP (app.decorous.in) */}
            <Route path="/erp/login" element={<ErpLoginPage />} />
            <Route path="/erp/signup" element={<ErpSignupPage />} />
            <Route path="/erp" element={<ErpLayout />}>
              <Route index element={<ErpOverviewPage />} />
              <Route path="projects" element={<ErpProjectsPage />} />
              <Route path="vendors" element={<ErpVendorsPage />} />
              <Route path="materials" element={<ErpMaterialsPage />} />
              <Route path="dpr" element={<ErpDprListPage />} />
              <Route path="dpr/new" element={<ErpDprNewPage />} />
              <Route path="expenses" element={<ErpExpensesPage />} />
              <Route path="approvals" element={<ErpApprovalsPage />} />
              <Route path="settings" element={<ErpSettingsPage />} />
            </Route>

            {/* Catch-all 404 — branded, noindexed, keeps Header/Footer intact */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </Layout>
        <Toaster position="top-right" />
      </BrowserRouter>
      </HelmetProvider>
    </div>
  );
}

export default App;
