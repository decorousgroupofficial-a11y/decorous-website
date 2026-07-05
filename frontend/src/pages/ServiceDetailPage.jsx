import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LeadForm from '@/components/forms/LeadForm';
import Seo from '@/components/Seo';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  const fetchService = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/services/${slug}`);
      setService(response.data);
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-4">Service Not Found</h2>
          <Link to="/services">
            <Button>View All Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-0">
      <Seo
        path={`/services/${service.slug}`}
        title={`${service.name} in Bhubaneswar, Odisha | Decorous`}
        description={service.short_description}
        image={service.image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": service.name,
          "description": service.short_description,
          "image": service.image,
          "provider": { "@id": "https://decorous.in/#business" },
          "areaServed": {"@type": "State", "name": "Odisha"},
          "url": `https://decorous.in/services/${service.slug}`,
          ...(service.faqs && service.faqs.length > 0 ? {
            "mainEntityOfPage": {
              "@type": "FAQPage",
              "mainEntity": service.faqs.map((f) => ({
                "@type": "Question",
                "name": f.question,
                "acceptedAnswer": {"@type": "Answer", "text": f.answer}
              }))
            }
          } : {})
        }}
      />
      {/* Page Header */}
      <section className="relative py-20 md:py-32" data-testid="service-detail-header">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${service.image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a365d]/90 to-[#0f2442]/95"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <p className="text-[#F5A623] font-semibold mb-4 uppercase tracking-wider text-sm">Our Services</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{service.name}</h1>
            <p className="text-white/80 text-lg mb-8">{service.short_description}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/contact">
                <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="service-get-quote">
                  Get Free Quote
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <a href="tel:7008863329">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d] h-12 px-8" data-testid="service-call">
                  Call: 7008863329
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16" data-testid="service-detail-content">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div 
                className="prose-decorous"
                dangerouslySetInnerHTML={{ __html: service.content }}
              />

              {/* Benefits */}
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-[#1a365d] mb-6">Key Benefits</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {service.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <CheckCircle className="text-[#F5A623] mt-0.5 flex-shrink-0" size={20} />
                      <span className="text-slate-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process Steps */}
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-[#1a365d] mb-6">Our Process</h3>
                <div className="space-y-4">
                  {service.process_steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-[#1a365d] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="pt-1">
                        <p className="text-slate-700">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              {service.faqs && service.faqs.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-[#1a365d] mb-6">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    {service.faqs.map((faq, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setOpenFaq(openFaq === index ? null : index)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-[#1a365d] hover:bg-slate-50"
                          data-testid={`faq-toggle-${index}`}
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
              <div className="sticky top-24">
                <LeadForm 
                  source={`service_${slug}`}
                  title="Get Free Quote"
                  showConstructionType={true}
                />
                
                <div className="mt-8 p-6 bg-slate-50 rounded-xl">
                  <h4 className="font-bold text-[#1a365d] mb-4">Other Services</h4>
                  <div className="space-y-3">
                    <Link to="/services/residential-construction" className="block text-slate-600 hover:text-[#F5A623]">
                      → Residential Construction
                    </Link>
                    <Link to="/services/commercial-construction" className="block text-slate-600 hover:text-[#F5A623]">
                      → Commercial Construction
                    </Link>
                    <Link to="/services/interior-design" className="block text-slate-600 hover:text-[#F5A623]">
                      → Interior Design
                    </Link>
                    <Link to="/services/warehouse-construction" className="block text-slate-600 hover:text-[#F5A623]">
                      → Warehouse Construction
                    </Link>
                    <Link to="/services/peb-construction" className="block text-slate-600 hover:text-[#F5A623]">
                      → PEB Construction
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1a365d]" data-testid="service-detail-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Start Your {service.name} Project?
          </h2>
          <p className="text-white/80 mb-8">
            Contact us today for a free consultation and cost estimate.
          </p>
          <Link to="/contact">
            <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="service-detail-cta-btn">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetailPage;
