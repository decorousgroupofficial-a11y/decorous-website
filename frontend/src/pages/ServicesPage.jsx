import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Home, Building2, Palette, Warehouse, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 md:pb-0">
      <Seo
        path="/services"
        title="Construction Services in Bhubaneswar — Residential, Commercial, Interior, PEB | Decorous"
        description="Decorous offers residential, commercial, interior design and PEB/warehouse construction across Odisha. Engineer-led teams, transparent BOQ, on-time handover. Get a free estimate."
      />
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="services-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Our Services</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Comprehensive construction solutions for residential, commercial, and industrial projects across Odisha.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white" data-testid="services-list">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="bg-slate-100 rounded-xl h-96 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-16">
              {services.map((service, index) => {
                const IconComponent = serviceIcons[service.icon] || Home;
                const isEven = index % 2 === 0;
                
                return (
                  <div 
                    key={service.id} 
                    className={`grid lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}
                    data-testid={`service-item-${service.slug}`}
                  >
                    <div className={isEven ? '' : 'lg:order-2'}>
                      <div className="aspect-[4/3] rounded-xl overflow-hidden">
                        <img 
                          src={service.image} 
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className={isEven ? '' : 'lg:order-1'}>
                      <div className="w-14 h-14 bg-[#1a365d] text-white rounded-lg flex items-center justify-center mb-6">
                        <IconComponent size={28} />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#1a365d] mb-4">{service.name}</h2>
                      <p className="text-slate-600 mb-6 leading-relaxed">{service.short_description}</p>
                      
                      <div className="mb-6">
                        <h4 className="font-semibold text-[#1a365d] mb-3">Key Benefits:</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {service.benefits.slice(0, 4).map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                              <span className="text-[#F5A623] font-bold">✓</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <Link to={`/services/${service.slug}`}>
                        <Button className="bg-[#F5A623] text-black hover:bg-[#e09612]" data-testid={`service-learn-more-${service.slug}`}>
                          Learn More
                          <ArrowRight className="ml-2" size={16} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-50" data-testid="services-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4">
            Not Sure Which Service You Need?
          </h2>
          <p className="text-slate-600 text-lg mb-8">
            Our experts can help you determine the best solution for your project. Get a free consultation today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="bg-[#1a365d] text-white hover:bg-[#0f2442] h-12 px-8" data-testid="services-consultation-btn">
                Get Free Consultation
              </Button>
            </Link>
            <Link to="/cost-calculator">
              <Button variant="outline" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white h-12 px-8" data-testid="services-calculator-btn">
                Try Cost Calculator
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
