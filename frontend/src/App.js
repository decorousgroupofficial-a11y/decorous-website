import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";

// Layout Components
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingButtons from "@/components/layout/FloatingButtons";
import MobileBottomBar from "@/components/layout/MobileBottomBar";

// Page Components
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import ServicesPage from "@/pages/ServicesPage";
import ServiceDetailPage from "@/pages/ServiceDetailPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProcessPage from "@/pages/ProcessPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import CityPage from "@/pages/CityPage";
import CitiesListPage from "@/pages/CitiesListPage";
import ContactPage from "@/pages/ContactPage";
import CostCalculatorPage from "@/pages/CostCalculatorPage";
import AdminPage from "@/pages/AdminPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsPage from "@/pages/TermsPage";
import NotFoundPage from "@/pages/NotFoundPage";

// ERP pages (app.decorous.in)
import ErpLoginPage from "@/pages/erp/ErpLoginPage";
import ErpSignupPage from "@/pages/erp/ErpSignupPage";
import ErpLayout from "@/pages/erp/ErpLayout";
import ErpOverviewPage from "@/pages/erp/ErpOverviewPage";
import ErpProjectsPage from "@/pages/erp/ErpProjectsPage";
import ErpVendorsPage from "@/pages/erp/ErpVendorsPage";
import ErpMaterialsPage from "@/pages/erp/ErpMaterialsPage";
import ErpDprListPage from "@/pages/erp/ErpDprListPage";
import ErpDprNewPage from "@/pages/erp/ErpDprNewPage";
import ErpExpensesPage from "@/pages/erp/ErpExpensesPage";
import ErpApprovalsPage from "@/pages/erp/ErpApprovalsPage";
import ErpSettingsPage from "@/pages/erp/ErpSettingsPage";

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
        </Layout>
        <Toaster position="top-right" />
      </BrowserRouter>
      </HelmetProvider>
    </div>
  );
}

export default App;
