import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CitiesListPage = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await axios.get(`${API}/cities`);
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group cities by service type
  const groupedCities = cities.reduce((acc, city) => {
    if (!acc[city.service_type]) {
      acc[city.service_type] = [];
    }
    acc[city.service_type].push(city);
    return acc;
  }, {});

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="cities-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Service Locations</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Decorous provides construction services across major cities in Odisha. Find services near you.
          </p>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="py-16 bg-white" data-testid="cities-list">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-slate-100 rounded-xl h-48 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-16">
              {Object.entries(groupedCities).map(([serviceType, serviceCities]) => (
                <div key={serviceType}>
                  <h2 className="text-2xl font-bold text-[#1a365d] mb-6 flex items-center gap-2">
                    <MapPin className="text-[#F5A623]" size={24} />
                    {serviceType}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {serviceCities.map((city) => (
                      <Link
                        key={city.id}
                        to={`/cities/${city.slug}`}
                        className="group relative rounded-xl overflow-hidden"
                        data-testid={`city-card-${city.slug}`}
                      >
                        <div className="aspect-[16/10]">
                          <img 
                            src={city.image} 
                            alt={`${city.service_type} in ${city.name}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a365d] via-[#1a365d]/30 to-transparent flex flex-col justify-end p-6">
                          <h3 className="text-white text-xl font-bold mb-1">
                            {city.service_type} in {city.name}
                          </h3>
                          <span className="text-white/80 text-sm flex items-center gap-1 group-hover:text-[#F5A623] transition-colors">
                            Learn More <ArrowRight size={14} />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Service Areas Map */}
      <section className="py-16 bg-slate-50" data-testid="cities-map">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a365d] mb-4">Our Service Areas</h2>
            <p className="text-slate-600">We serve across all major cities in Odisha</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="grid grid-cols-2 gap-4">
                {['Bhubaneswar', 'Cuttack', 'Puri', 'Khordha', 'Rourkela', 'Berhampur', 'Sambalpur'].map((city) => (
                  <div key={city} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
                    <MapPin className="text-[#F5A623]" size={18} />
                    <span className="font-medium text-[#1a365d]">{city}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d957476.1795858095!2d84.43577!3d20.27!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a190f8c7cd9cbc3%3A0x8b13de74ce72e98c!2sOdisha!5e0!3m2!1sen!2sin!4v1703765432012!5m2!1sen!2sin"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-xl shadow-lg"
                title="Decorous Service Areas in Odisha"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]" data-testid="cities-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Don't See Your City?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            We may still be able to serve you. Contact us to check availability in your area.
          </p>
          <Link to="/contact">
            <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="cities-contact-btn">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CitiesListPage;
