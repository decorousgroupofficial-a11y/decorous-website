import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_construct-pro-139/artifacts/yeay7w37_Silton_Associates__2_-removebg-preview.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const services = [
    { name: 'Residential Construction', slug: 'residential-construction' },
    { name: 'Commercial Construction', slug: 'commercial-construction' },
    { name: 'Interior Design', slug: 'interior-design' },
    { name: 'Warehouse Construction', slug: 'warehouse-construction' },
    { name: 'PEB Construction', slug: 'peb-construction' },
  ];

  const cities = [
    { name: 'Bhubaneswar', slug: 'house-construction-bhubaneswar' },
    { name: 'Cuttack', slug: 'house-construction-cuttack' },
    { name: 'Puri', slug: 'house-construction-puri' },
    { name: 'Rourkela', slug: 'house-construction-rourkela' },
    { name: 'Sambalpur', slug: 'house-construction-sambalpur' },
  ];

  const quickLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Projects', path: '/projects' },
    { name: 'Construction Process', path: '/process' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
    { name: 'Cost Calculator', path: '/cost-calculator' },
  ];

  return (
    <footer className="bg-[#1a365d] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div>
            <img src={LOGO_URL} alt="Decorous" className="h-12 mb-6" />
            <p className="text-white/70 mb-6 leading-relaxed">
              Odisha's trusted construction company delivering premium residential, commercial, and industrial construction services since 2016.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#F5A623] transition-colors" data-testid="social-facebook">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#F5A623] transition-colors" data-testid="social-instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#F5A623] transition-colors" data-testid="social-linkedin">
                <Linkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#F5A623] transition-colors" data-testid="social-youtube">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Our Services</h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link 
                    to={`/services/${service.slug}`} 
                    className="text-white/70 hover:text-[#F5A623] transition-colors"
                    data-testid={`footer-service-${service.slug}`}
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links & Cities */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Quick Links</h4>
            <ul className="space-y-3 mb-8">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-white/70 hover:text-[#F5A623] transition-colors"
                    data-testid={`footer-link-${link.path.replace('/', '')}`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-lg font-semibold mb-4 text-white">Service Locations</h4>
            <ul className="space-y-2">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link 
                    to={`/cities/${city.slug}`} 
                    className="text-white/70 hover:text-[#F5A623] transition-colors text-sm"
                    data-testid={`footer-city-${city.slug}`}
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Contact Us</h4>
            <div className="space-y-4">
              <a href="tel:7008863329" className="flex items-start gap-3 text-white/70 hover:text-[#F5A623] transition-colors" data-testid="footer-phone">
                <Phone size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Call Us</p>
                  <p>7008863329</p>
                </div>
              </a>
              <a href="mailto:contact@decorous.in" className="flex items-start gap-3 text-white/70 hover:text-[#F5A623] transition-colors" data-testid="footer-email">
                <Mail size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Email Us</p>
                  <p>contact@decorous.in</p>
                </div>
              </a>
              <div className="flex items-start gap-3 text-white/70">
                <MapPin size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Visit Us</p>
                  <p>Bhubaneswar, Odisha, India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              © {currentYear} Decorous. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
