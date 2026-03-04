import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_construct-pro-139/artifacts/yeay7w37_Silton_Associates__2_-removebg-preview.png";

const services = [
  { name: 'Residential Construction', slug: 'residential-construction' },
  { name: 'Commercial Construction', slug: 'commercial-construction' },
  { name: 'Interior Design', slug: 'interior-design' },
  { name: 'Warehouse Construction', slug: 'warehouse-construction' },
  { name: 'PEB Construction', slug: 'peb-construction' },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[#1a365d] text-white py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:7008863329" className="flex items-center gap-2 hover:text-[#F5A623] transition-colors">
              <Phone size={14} />
              <span>7008863329</span>
            </a>
            <a href="mailto:contact@decorous.in" className="flex items-center gap-2 hover:text-[#F5A623] transition-colors">
              <Mail size={14} />
              <span>contact@decorous.in</span>
            </a>
          </div>
          <div className="text-white/80">
            Building Dreams Across Odisha
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 bg-white transition-all duration-300 ${isScrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center" data-testid="logo-link">
              <img 
                src={LOGO_URL} 
                alt="Decorous - Construction Company" 
                className="h-10 md:h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link 
                to="/" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-home"
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/about') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-about"
              >
                About
              </Link>
              
              {/* Services Dropdown */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger 
                      className={`px-4 py-2 text-sm font-medium bg-transparent ${location.pathname.includes('/services') ? 'text-[#F5A623]' : 'text-slate-700'}`}
                      data-testid="nav-services-dropdown"
                    >
                      Services
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[300px] gap-1 p-3">
                        {services.map((service) => (
                          <li key={service.slug}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={`/services/${service.slug}`}
                                className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
                                data-testid={`nav-service-${service.slug}`}
                              >
                                <div className="text-sm font-medium text-slate-900">{service.name}</div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                        <li>
                          <NavigationMenuLink asChild>
                            <Link
                              to="/services"
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors bg-slate-50 hover:bg-slate-100 focus:bg-slate-100 text-[#1a365d] font-semibold text-sm"
                              data-testid="nav-all-services"
                            >
                              View All Services
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              <Link 
                to="/projects" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/projects') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-projects"
              >
                Projects
              </Link>
              <Link 
                to="/process" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/process') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-process"
              >
                Process
              </Link>
              <Link 
                to="/cities" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/cities') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-cities"
              >
                Cities
              </Link>
              <Link 
                to="/blog" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/blog') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-blog"
              >
                Blog
              </Link>
              <Link 
                to="/contact" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${isActive('/contact') ? 'text-[#F5A623]' : 'text-slate-700 hover:text-[#1a365d]'}`}
                data-testid="nav-contact"
              >
                Contact
              </Link>
            </nav>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/cost-calculator">
                <Button variant="outline" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white" data-testid="header-calculator-btn">
                  Cost Calculator
                </Button>
              </Link>
              <Link to="/contact">
                <Button className="bg-[#F5A623] text-black hover:bg-[#e09612]" data-testid="header-quote-btn">
                  Get Free Quote
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-slate-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden fixed inset-0 bg-white z-50 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <img src={LOGO_URL} alt="Decorous" className="h-10" />
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2" data-testid="mobile-menu-close">
              <X size={24} />
            </button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
            <Link to="/" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-home">Home</Link>
            <Link to="/about" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-about">About</Link>
            <div className="py-2">
              <p className="px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Services</p>
              {services.map((service) => (
                <Link 
                  key={service.slug}
                  to={`/services/${service.slug}`} 
                  className="block py-2 px-6 text-slate-700 hover:bg-slate-50 rounded-lg"
                  data-testid={`mobile-nav-service-${service.slug}`}
                >
                  {service.name}
                </Link>
              ))}
            </div>
            <Link to="/projects" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-projects">Projects</Link>
            <Link to="/process" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-process">Construction Process</Link>
            <Link to="/cities" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-cities">Cities</Link>
            <Link to="/blog" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-blog">Blog</Link>
            <Link to="/contact" className="block py-3 px-4 text-lg font-medium text-slate-800 hover:bg-slate-50 rounded-lg" data-testid="mobile-nav-contact">Contact</Link>
            <div className="pt-4 space-y-3 px-4">
              <Link to="/cost-calculator" className="block">
                <Button variant="outline" className="w-full border-[#1a365d] text-[#1a365d]" data-testid="mobile-calculator-btn">
                  Cost Calculator
                </Button>
              </Link>
              <Link to="/contact" className="block">
                <Button className="w-full bg-[#F5A623] text-black hover:bg-[#e09612]" data-testid="mobile-quote-btn">
                  Get Free Quote
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Header;
