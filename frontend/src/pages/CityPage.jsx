import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, ArrowRight, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadForm from '@/components/forms/LeadForm';
import Seo from '@/components/Seo';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CityPage = () => {
  const { slug } = useParams();
  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const fetchCity = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cities/${slug}`);
      setCity(response.data);
    } catch (error) {
      console.error('Error fetching city:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCity();
  }, [fetchCity]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-4">Location Not Found</h2>
          <Link to="/cities">
            <Button>View All Locations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-0">
      <Seo
        path={`/cities/${city.slug}`}
        title={`${city.service_type} in ${city.name}, Odisha | Decorous`}
        description={`Decorous offers trusted ${city.service_type.toLowerCase()} services in ${city.name}, Odisha. Engineer-led teams, transparent BOQ, on-time delivery. Call +91 7008863329 for a free quote.`}
        image={city.image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": `${city.service_type} in ${city.name}`,
          "areaServed": {"@type": "City", "name": city.name, "containedInPlace": {"@type": "State", "name": "Odisha"}},
          "provider": {"@id": "https://decorous.in/#business"},
          "url": `https://decorous.in/cities/${city.slug}`,
          ...(city.faqs && city.faqs.length > 0 ? {
            "mainEntityOfPage": {
              "@type": "FAQPage",
              "mainEntity": city.faqs.map((f) => ({
                "@type": "Question",
                "name": f.question,
                "acceptedAnswer": {"@type": "Answer", "text": f.answer}
              }))
            }
          } : {})
        }}
      />
      {/* Hero */}
      <section className="relative py-20 md:py-32" data-testid="city-header">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${city.image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a365d]/90 to-[#0f2442]/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#F5A623] mb-4">
              <MapPin size={20} />
              <span className="font-medium">{city.name}, Odisha</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              {city.service_type} in {city.name}
            </h1>
            <p className="text-white/80 text-lg mb-8">
              Decorous is your trusted partner for {city.service_type.toLowerCase()} in {city.name}. 
              Get quality construction services with transparent pricing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/contact">
                <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="city-get-quote">
                  Get Free Quote
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <a href="tel:7008863329">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d] h-12 px-8" data-testid="city-call">
                  <Phone className="mr-2" size={16} />
                  Call: 7008863329
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16" data-testid="city-content">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div 
                className="prose-decorous"
                dangerouslySetInnerHTML={{ __html: city.content }}
              />

              {/* Why Choose Us */}
              <div className="mt-12 p-8 bg-slate-50 rounded-xl">
                <h3 className="text-2xl font-bold text-[#1a365d] mb-6">
                  Why Choose Decorous for {city.service_type} in {city.name}?
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Local expertise and understanding of regulations',
                    'Experienced team of architects and engineers',
                    'Transparent pricing with no hidden costs',
                    'Quality materials from trusted suppliers',
                    'On-time project delivery guarantee',
                    '5-year structural warranty',
                    'Post-construction support',
                    'Complete permit and approval assistance'
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="text-[#F5A623] mt-0.5 flex-shrink-0" size={18} />
                      <span className="text-slate-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              {city.faqs && city.faqs.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-[#1a365d] mb-6">
                    Frequently Asked Questions about {city.service_type} in {city.name}
                  </h3>
                  <div className="space-y-4">
                    {city.faqs.map((faq, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setOpenFaq(openFaq === index ? null : index)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-[#1a365d] hover:bg-slate-50"
                          data-testid={`city-faq-${index}`}
                        >
                          {faq.question}
                          {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {openFaq === index && (
                          <div className="px-4 pb-4 text-slate-600">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                <LeadForm 
                  source={`city_${slug}`}
                  title={`Get Free Estimate for ${city.name}`}
                  showPlotSize={true}
                  showConstructionType={true}
                />

                <div className="p-6 bg-[#1a365d] rounded-xl text-white">
                  <h4 className="font-bold mb-4">Contact Us</h4>
                  <div className="space-y-3 text-white/80">
                    <a href="tel:7008863329" className="flex items-center gap-2 hover:text-[#F5A623]">
                      <Phone size={16} />
                      7008863329
                    </a>
                    <p className="flex items-start gap-2">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      Bhubaneswar, Odisha
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-xl">
                  <h4 className="font-bold text-[#1a365d] mb-4">Other Locations</h4>
                  <div className="space-y-2">
                    {['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur'].map((cityName) => (
                      <Link 
                        key={cityName}
                        to={`/cities/house-construction-${cityName.toLowerCase()}`}
                        className="block text-slate-600 hover:text-[#F5A623] text-sm"
                      >
                        → House Construction in {cityName}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]" data-testid="city-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Start Your {city.service_type} Project in {city.name}?
          </h2>
          <p className="text-white/80 mb-8">
            Get a free consultation and detailed cost estimate from our local experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="city-cta-quote">
                Get Free Quote
              </Button>
            </Link>
            <Link to="/cost-calculator">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d] h-12 px-8" data-testid="city-cta-calculator">
                Try Cost Calculator
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CityPage;
