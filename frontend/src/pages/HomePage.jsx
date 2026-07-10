import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Phone, MessageCircle, CheckCircle, Home, Building2, Palette,
  Warehouse, Factory, Users, Award, Clock, Shield, MapPin, CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadForm from '@/components/forms/LeadForm';
import Seo from '@/components/Seo';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const serviceIcons = {
  'Home': Home,
  'Building2': Building2,
  'Palette': Palette,
  'Warehouse': Warehouse,
  'Factory': Factory
};

// These ids match the placeholder demo content seeded from the original
// site template (fake client names, stock photos) — not real testimonials
// or completed projects. Once real ones are added to the database (with
// different ids), they'll appear here automatically and these placeholder
// ids simply won't match anymore.
const PLACEHOLDER_TESTIMONIAL_IDS = new Set(['test-1', 'test-2', 'test-3', 'test-4', 'test-5']);
const PLACEHOLDER_PROJECT_IDS = new Set(['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5', 'proj-6']);

const SERVICE_AREAS = ['Bhubaneswar', 'Cuttack', 'Puri', 'Khordha'];

const HomePage = () => {
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const whatsappNumber = '917008863329';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, projectsRes, testimonialsRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/projects?featured=true`),
        axios.get(`${API}/testimonials`),
      ]);
      setServices(servicesRes.data);
      setProjects(projectsRes.data);
      setTestimonials(testimonialsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const trustIndicators = [
    { icon: Shield, text: 'Transparent Pricing' },
    { icon: Award, text: 'Structural Safety' },
    { icon: CheckCircle, text: 'Premium Materials' },
    { icon: Clock, text: 'On-time Delivery' },
    { icon: Users, text: 'Experienced Engineers' },
  ];

  const processSteps = [
    { step: 1, title: 'Free Consultation', description: 'Discuss your requirements with our experts' },
    { step: 2, title: 'Design & Planning', description: 'Architectural design and structural planning' },
    { step: 3, title: 'Cost Estimation', description: 'Detailed cost breakdown with transparency' },
    { step: 4, title: 'Construction', description: 'Quality construction with regular updates' },
    { step: 5, title: 'Quality Inspection', description: 'Rigorous quality checks at every stage' },
    { step: 6, title: 'Project Handover', description: 'Complete documentation and warranty' },
  ];

  const realProjects = projects.filter((p) => !PLACEHOLDER_PROJECT_IDS.has(p.id));
  const realTestimonials = testimonials.filter((t) => !PLACEHOLDER_TESTIMONIAL_IDS.has(t.id));

  return (
    <div className="pb-16 md:pb-0">
      {/* Per-route SEO (head-level JSON-LD for the business lives in index.html) */}
      <Seo path="/" />

      {/* Hero Section — who we are, at a glance */}
      <section className="relative min-h-[90vh] flex items-center" data-testid="hero-section">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1769780510442-60d4d6391a91?q=85&w=1920&auto=format&fit=crop)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a365d]/90 to-[#0f2442]/95"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <p className="text-[#F5A623] font-semibold mb-4 tracking-wider uppercase text-sm">
              Trusted Construction Partner in Odisha
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              Build Your Dream Home With Trusted Engineers in Bhubaneswar
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              Residential Construction | Commercial Construction | Interior Design | Warehouse & PEB Buildings
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/contact">
                <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-14 px-8 text-lg font-semibold" data-testid="hero-consultation-btn">
                  Get Free Consultation
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link to="/cost-calculator">
                <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#1a365d] h-14 px-8 text-lg" data-testid="hero-estimate-btn">
                  Get Free Estimate
                </Button>
              </Link>
            </div>
            <div className="flex gap-4 mt-8">
              <a
                href="tel:7008863329"
                className="flex items-center gap-2 text-white/80 hover:text-[#F5A623] transition-colors"
                data-testid="hero-call-link"
              >
                <Phone size={20} />
                <span>Call Now</span>
              </a>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/80 hover:text-[#25D366] transition-colors"
                data-testid="hero-whatsapp-link"
              >
                <MessageCircle size={20} />
                <span>WhatsApp Chat</span>
              </a>
            </div>
          </div>

          <div className="hidden lg:block">
            <LeadForm
              source="homepage_hero"
              variant="hero"
              title="Get Free Construction Cost Estimate"
              showPlotSize={true}
              showConstructionType={true}
            />
          </div>
        </div>
      </section>

      {/* Mobile Lead Form */}
      <section className="lg:hidden py-12 px-4 bg-slate-50">
        <LeadForm
          source="homepage_mobile"
          title="Get Free Construction Cost Estimate"
          showPlotSize={true}
          showConstructionType={true}
        />
      </section>

      {/* Who We Are */}
      <section className="py-20 bg-white" data-testid="who-we-are-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Who We Are</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-6">
                A Bhubaneswar-Based Construction &amp; Interior Design Company
              </h2>
              <div className="space-y-4 text-slate-600">
                <p>
                  Decorous is a construction and interior design company headquartered in Bhubaneswar, Odisha.
                  We handle residential and commercial construction, interior fit-outs, and pre-engineered
                  (PEB) warehouse buildings — with our own in-house engineering and project management teams
                  overseeing every stage, from foundation to handover.
                </p>
                <p>
                  Our approach is engineer-led and transparent: a detailed, locked-rate BOQ before work begins,
                  single-point accountability throughout the project, and regular progress updates so you always
                  know where things stand.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <MapPin size={18} className="text-[#F5A623]" />
                <span className="text-sm font-medium text-slate-700">Serving:</span>
                {SERVICE_AREAS.map((city) => (
                  <span key={city} className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                    {city}
                  </span>
                ))}
                <Link to="/cities" className="text-sm text-[#1a365d] font-semibold hover:underline ml-1">
                  See all service areas
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=800&auto=format&fit=crop"
                alt="Decorous engineering team reviewing construction plans at a Bhubaneswar site office"
                className="rounded-xl shadow-lg w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Trust Us */}
      <section className="py-16 bg-slate-50 border-y" data-testid="trust-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Why Trust Us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Built On Transparency, Not Promises</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {trustIndicators.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-700">
                <item.icon size={20} className="text-[#F5A623]" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Construction Process */}
      <section className="py-20 bg-white" data-testid="process-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">How We Work</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Our Construction Process</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step) => (
              <div key={step.step} className="bg-slate-50 p-8 rounded-xl border border-slate-200 hover:border-[#F5A623] transition-colors">
                <div className="w-12 h-12 bg-[#F5A623] text-black rounded-lg flex items-center justify-center font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-[#1a365d] mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/process">
              <Button className="bg-[#1a365d] text-white hover:bg-[#0f2442]" data-testid="process-learn-more">
                Learn More About Our Process
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What We Build */}
      <section className="py-20 bg-slate-50" data-testid="services-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">What We Build</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Complete Construction Solutions</h2>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
              From residential homes to industrial warehouses, we deliver excellence in every project
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const IconComponent = serviceIcons[service.icon] || Home;
              return (
                <Link
                  key={service.id}
                  to={`/services/${service.slug}`}
                  className="group"
                  data-testid={`service-card-${service.slug}`}
                >
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 border-t-4 border-t-[#F5A623]">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <div className="w-12 h-12 bg-[#1a365d] text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#F5A623] group-hover:text-black transition-colors">
                        <IconComponent size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-[#1a365d] mb-2">{service.name}</h3>
                      <p className="text-slate-600 mb-4 line-clamp-2">{service.short_description}</p>
                      <span className="text-[#F5A623] font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                        Learn More <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Proof: Recent Projects */}
      <section className="py-20 bg-white" data-testid="portfolio-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Our Work</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Featured Projects</h2>
          </div>

          {realProjects.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {realProjects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    className="group relative rounded-xl overflow-hidden cursor-pointer"
                    data-testid={`project-card-${project.id}`}
                  >
                    <div className="aspect-[4/3]">
                      <img
                        src={project.images[0]}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a365d]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <span className="text-[#F5A623] text-sm font-medium">{project.category}</span>
                      <h3 className="text-white text-xl font-bold">{project.title}</h3>
                      <p className="text-white/80 text-sm mt-1">{project.location} | {project.area_sqft} sqft</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link to="/projects">
                  <Button className="bg-[#F5A623] text-black hover:bg-[#e09612]" data-testid="view-all-projects">
                    View All Projects
                    <ArrowRight className="ml-2" size={16} />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="max-w-2xl mx-auto text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10" data-testid="projects-placeholder">
              <p className="text-slate-600">
                We're building out our public project gallery with real photos from completed sites.
                In the meantime, ask us for references and site visits during your free consultation.
              </p>
              <Link to="/contact" className="inline-block mt-6">
                <Button className="bg-[#1a365d] text-white hover:bg-[#0f2442]">
                  Ask About Past Projects
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Proof: Client Stories */}
      <section className="py-20 bg-slate-50" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">What Our Clients Say</h2>
          </div>

          {realTestimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {realTestimonials.slice(0, 3).map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative"
                  data-testid={`testimonial-${testimonial.id}`}
                >
                  <div className="text-5xl text-[#F5A623] opacity-30 absolute top-4 left-6">"</div>
                  <p className="text-slate-600 mb-6 relative z-10 pt-6">{testimonial.content}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#1a365d] rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a365d]">{testimonial.name}</p>
                      <p className="text-sm text-slate-500">{testimonial.project_type} | {testimonial.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center bg-white border border-dashed border-slate-300 rounded-2xl p-10" data-testid="testimonials-placeholder">
              <p className="text-slate-600">
                Client stories are on their way. Recently completed a project with us? We'd love to
                feature your feedback here — get in touch and let us know.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How To Get Started */}
      <section className="py-20 bg-[#1a365d]" data-testid="cta-section">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planning to Build Your Dream Home?
          </h2>
          <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto">
            Get a free consultation and cost estimate from our expert engineers. No obligations —
            pick whichever way works best for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <a href="tel:7008863329" className="group bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl p-6 transition-colors" data-testid="cta-callback">
              <Phone size={28} className="text-[#F5A623] mx-auto mb-3" />
              <p className="text-white font-semibold">Request a Callback</p>
              <p className="text-white/70 text-sm mt-1">+91 7008863329</p>
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl p-6 transition-colors"
              data-testid="cta-whatsapp"
            >
              <MessageCircle size={28} className="text-[#25D366] mx-auto mb-3" />
              <p className="text-white font-semibold">Chat on WhatsApp</p>
              <p className="text-white/70 text-sm mt-1">Usually replies within minutes</p>
            </a>
            <Link to="/contact" className="group bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl p-6 transition-colors block" data-testid="cta-site-visit">
              <CalendarCheck size={28} className="text-[#F5A623] mx-auto mb-3" />
              <p className="text-white font-semibold">Book a Free Site Visit</p>
              <p className="text-white/70 text-sm mt-1">Our engineer comes to you</p>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link to="/contact">
              <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-14 px-8 text-lg font-semibold" data-testid="cta-start-project">
                Start Your Project
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/cost-calculator">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#1a365d] h-14 px-8 text-lg" data-testid="cta-calculator">
                Try Cost Calculator
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
