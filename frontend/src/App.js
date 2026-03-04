import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

// Layout wrapper that hides header/footer for admin
const Layout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  
  if (isAdmin) {
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
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
