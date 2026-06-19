import { Link } from 'react-router-dom';
import { Award, Users, Target, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';

const AboutPage = () => {
  const values = [
    { icon: Award, title: 'Quality First', description: 'We never compromise on quality, using only premium materials and best construction practices.' },
    { icon: Users, title: 'Client-Centric', description: 'Your satisfaction is our priority. We work closely with you at every stage of the project.' },
    { icon: Target, title: 'Transparency', description: 'Clear communication and detailed cost breakdowns ensure you know exactly where your investment goes.' },
  ];

  const milestones = [
    { year: '2016', title: 'Company Founded', description: 'Started with a vision to transform construction in Odisha' },
    { year: '2018', title: '100 Projects', description: 'Completed our 100th project milestone' },
    { year: '2020', title: 'Commercial Expansion', description: 'Expanded into commercial and industrial construction' },
    { year: '2022', title: 'PEB Division', description: 'Launched Pre-Engineered Building division' },
    { year: '2024', title: '500+ Projects', description: 'Crossed 500 successful project completions' },
  ];

  return (
    <div className="pb-16 md:pb-0">
      <Seo
        path="/about"
        title="About Decorous — Construction Company in Bhubaneswar Since 2016 | 500+ Projects"
        description="Decorous is a trusted construction company in Bhubaneswar with 8+ years of experience and 500+ completed projects across residential, commercial and PEB sectors in Odisha."
      />
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="about-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">About Decorous</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Building dreams across Odisha with quality, transparency, and engineering excellence since 2016.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white" data-testid="about-story">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Our Story</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-6">
                From Vision to Reality
              </h2>
              <div className="space-y-4 text-slate-600">
                <p>
                  Decorous was founded in 2016 with a simple yet powerful vision: to transform the construction industry in Odisha by delivering quality, transparency, and exceptional service.
                </p>
                <p>
                  What started as a small team of passionate engineers has grown into one of the most trusted construction companies in the state. Today, we've completed over 500 projects across residential, commercial, and industrial sectors.
                </p>
                <p>
                  Our commitment to using premium materials, employing skilled craftsmen, and maintaining complete transparency in pricing has earned us the trust of hundreds of homeowners and businesses across Odisha.
                </p>
              </div>
              <div className="mt-8 flex gap-4">
                <Link to="/projects">
                  <Button className="bg-[#1a365d] text-white hover:bg-[#0f2442]" data-testid="about-view-projects">
                    View Our Projects
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white" data-testid="about-contact">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1628146023674-ede6049609b1?q=85&w=600&auto=format&fit=crop"
                alt="Decorous Team"
                className="rounded-xl shadow-lg"
              />
              <div className="absolute -bottom-6 -left-6 bg-[#F5A623] text-black p-6 rounded-xl shadow-lg">
                <p className="text-4xl font-bold">8+</p>
                <p className="font-medium">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-slate-50" data-testid="about-mission">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-200">
              <div className="w-14 h-14 bg-[#1a365d] text-white rounded-lg flex items-center justify-center mb-6">
                <Target size={28} />
              </div>
              <h3 className="text-2xl font-bold text-[#1a365d] mb-4">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed">
                To be the most trusted construction partner in Odisha by delivering exceptional quality, maintaining complete transparency in pricing, and ensuring every project reflects our commitment to engineering excellence and client satisfaction.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-200">
              <div className="w-14 h-14 bg-[#F5A623] text-black rounded-lg flex items-center justify-center mb-6">
                <Eye size={28} />
              </div>
              <h3 className="text-2xl font-bold text-[#1a365d] mb-4">Our Vision</h3>
              <p className="text-slate-600 leading-relaxed">
                To transform Odisha's construction landscape by setting new standards in quality, innovation, and customer service. We envision a future where every family can build their dream home with confidence and trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white" data-testid="about-values">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Core Values</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">What Drives Us</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-slate-100 text-[#1a365d] rounded-2xl flex items-center justify-center mx-auto mb-6 hover:bg-[#F5A623] hover:text-black transition-colors">
                  <value.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1a365d] mb-3">{value.title}</h3>
                <p className="text-slate-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-slate-50" data-testid="about-why-us">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Why Choose Us</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-8">
                The Decorous Advantage
              </h2>
              <div className="space-y-4">
                {[
                  'Experienced team of architects and engineers',
                  'Premium quality construction materials',
                  'Transparent pricing with no hidden costs',
                  'On-time project delivery guarantee',
                  '5-year structural warranty',
                  'Regular project updates and site visits',
                  'Post-construction support and maintenance',
                  'BDA and BMC approval assistance'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="text-[#F5A623] mt-0.5 flex-shrink-0" size={20} />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1632516160994-b4463d4e19d2?q=85&w=600&auto=format&fit=crop"
                alt="Construction site"
                className="rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-20 bg-white" data-testid="about-milestones">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-[#F5A623] font-semibold mb-2 uppercase tracking-wider text-sm">Our Journey</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d]">Key Milestones</h2>
          </div>
          
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`md:flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 inline-block">
                      <p className="text-[#F5A623] font-bold text-xl mb-2">{milestone.year}</p>
                      <h3 className="text-lg font-bold text-[#1a365d] mb-1">{milestone.title}</h3>
                      <p className="text-slate-600 text-sm">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-4 h-4 bg-[#F5A623] rounded-full relative z-10 flex-shrink-0"></div>
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#1a365d]" data-testid="about-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build With Us?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Let's discuss your project and turn your vision into reality.
          </p>
          <Link to="/contact">
            <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-14 px-8 text-lg font-semibold" data-testid="about-cta-button">
              Get Free Consultation
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
