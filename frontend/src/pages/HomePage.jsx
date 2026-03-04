import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, MessageCircle, CheckCircle, Home, Building2, Palette, Warehouse, Factory, Users, Award, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadForm from '@/components/forms/LeadForm';
import SchemaMarkup, { organizationSchema, localBusinessSchema } from '@/components/seo/SchemaMarkup';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const serviceIcons = {
  'Home': Home,
  'Building2': Building2,
  'Palette': Palette,
  'Warehouse': Warehouse,
  'Factory': Factory
};

const HomePage = () => {
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState({});
  const whatsappNumber = '917008863329';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, projectsRes, testimonialsRes, statsRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/projects?featured=true`),
        axios.get(`${API}/testimonials`),
        axios.get(`${API}/stats`)
      ]);
      setServices(servicesRes.data);
      setProjects(projectsRes.data);
      setTestimonials(testimonialsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const processSteps = [
    { step: 1, title: 'Free Consultation', description: 'Discuss your requirements with our experts' },
    { step: 2, title: 'Design & Planning', description: 'Architectural design and structural planning' },
    { step: 3, title: 'Cost Estimation', description: 'Detailed cost breakdown with transparency' },
    { step: 4, title: 'Construction', description: 'Quality construction with regular updates' },
    { step: 5, title: 'Quality Inspection', description: 'Rigorous quality checks at every stage' },
    { step: 6, title: 'Project Handover', description: 'Complete documentation and warranty' },
  ];

  const trustIndicators = [
    { icon: Shield, text: 'Transparent Pricing' },
    { icon: Award, text: 'Structural Safety' },
    { icon: CheckCircle, text: 'Premium Materials' },
    { icon: Clock, text: 'On-time Delivery' },
    { icon: Users, text: 'Experienced Engineers' },
  ];

  return (
    <div className="pb-16 md:pb-0">
      {/* Schema Markup for SEO */}
      <SchemaMarkup schema={organizationSchema} />
      <SchemaMarkup schema={localBusinessSchema} />
      
      {/* Hero Section */}
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

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
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

      {/* Stats Counter */}
      <section className="py-16 bg-[#1a365d]" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#F5A623]">{stats.projects_completed || 500}+</p>
              <p className="text-white/80 mt-2">Projects Completed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#F5A623]">{stats.engineers || 10}+</p>
              <p className="text-white/80 mt-2">Expert Engineers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#F5A623]">{stats.client_satisfaction || 100}%</p>
              <p className="text-white/80 mt-2">Client Satisfaction</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-[#F5A623]">{stats.years_experience || 8}+</p>
              <p className="text-white/80 mt-2">Years Experience</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white" data-testid="services-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Our Services</p>
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

      {/* Construction Process */}
      <section className="py-20 bg-slate-50" data-testid="process-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">How We Work</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Our Construction Process</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step) => (
              <div key={step.step} className="bg-white p-8 rounded-xl border border-slate-200 hover:border-[#F5A623] transition-colors">
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

      {/* Portfolio Section */}
      <section className="py-20 bg-white" data-testid="portfolio-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Our Work</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Featured Projects</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
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
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">What Our Clients Say</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.slice(0, 3).map((testimonial) => (
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#1a365d]" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planning to Build Your Dream Home?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Get a free consultation and cost estimate from our expert engineers. No obligations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
