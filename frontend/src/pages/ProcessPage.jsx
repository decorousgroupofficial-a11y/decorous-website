import { Link } from 'react-router-dom';
import { MessageSquare, Ruler, Calculator, HardHat, CheckCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProcessPage = () => {
  const steps = [
    {
      icon: MessageSquare,
      step: 1,
      title: 'Free Consultation',
      description: 'Share your requirements with our experts. We discuss your vision, budget, and timeline to understand your needs completely.',
      details: [
        'Initial discussion about your requirements',
        'Site visit and assessment',
        'Understanding your budget expectations',
        'Timeline discussion'
      ]
    },
    {
      icon: Ruler,
      step: 2,
      title: 'Design & Planning',
      description: 'Our architects create detailed designs based on your requirements, incorporating vastu, functionality, and aesthetics.',
      details: [
        'Architectural floor plan design',
        '3D elevation and interior visualization',
        'Vastu-compliant layouts if required',
        'Design revisions until approval'
      ]
    },
    {
      icon: Calculator,
      step: 3,
      title: 'Cost Estimation',
      description: 'Receive a detailed, transparent cost breakdown covering every aspect of your construction project.',
      details: [
        'Itemized cost breakdown',
        'Material specifications and brands',
        'Labor and execution costs',
        'Timeline and payment schedule'
      ]
    },
    {
      icon: HardHat,
      step: 4,
      title: 'Construction Execution',
      description: 'Our experienced team executes the construction with regular quality checks and progress updates.',
      details: [
        'Foundation and structural work',
        'Brickwork and plastering',
        'Electrical and plumbing',
        'Regular site supervision and updates'
      ]
    },
    {
      icon: CheckCircle,
      step: 5,
      title: 'Quality Inspection',
      description: 'Rigorous quality checks at every stage ensure your home meets the highest standards.',
      details: [
        'Material quality verification',
        'Structural strength testing',
        'Finish quality inspection',
        'Compliance with building codes'
      ]
    },
    {
      icon: Key,
      step: 6,
      title: 'Project Handover',
      description: 'Receive your dream home with complete documentation and comprehensive warranty coverage.',
      details: [
        'Final walkthrough and inspection',
        'Complete documentation handover',
        '5-year structural warranty',
        'Post-handover support'
      ]
    }
  ];

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="process-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Our Construction Process</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            A transparent, systematic approach to turning your construction vision into reality.
          </p>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 bg-white" data-testid="process-steps">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div 
                key={step.step}
                className={`grid md:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                data-testid={`process-step-${step.step}`}
              >
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="bg-slate-50 rounded-2xl p-8 relative">
                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#F5A623] text-black rounded-full flex items-center justify-center font-bold text-xl">
                      {step.step}
                    </div>
                    <div className="w-16 h-16 bg-[#1a365d] text-white rounded-xl flex items-center justify-center mb-6 ml-4">
                      <step.icon size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-[#1a365d] mb-4">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <h4 className="font-semibold text-[#1a365d] mb-4">What happens in this stage:</h4>
                  <ul className="space-y-3">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="text-[#F5A623] mt-0.5 flex-shrink-0" size={18} />
                        <span className="text-slate-600">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-slate-50" data-testid="process-timeline">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a365d] mb-4">Typical Project Timeline</h2>
            <p className="text-slate-600">Here's what to expect for a standard residential project</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl text-center">
              <p className="text-3xl font-bold text-[#F5A623]">1-2</p>
              <p className="text-sm text-slate-500 mb-2">Weeks</p>
              <p className="font-semibold text-[#1a365d]">Design & Planning</p>
            </div>
            <div className="bg-white p-6 rounded-xl text-center">
              <p className="text-3xl font-bold text-[#F5A623]">2-3</p>
              <p className="text-sm text-slate-500 mb-2">Months</p>
              <p className="font-semibold text-[#1a365d]">Foundation & Structure</p>
            </div>
            <div className="bg-white p-6 rounded-xl text-center">
              <p className="text-3xl font-bold text-[#F5A623]">3-4</p>
              <p className="text-sm text-slate-500 mb-2">Months</p>
              <p className="font-semibold text-[#1a365d]">Brickwork & MEP</p>
            </div>
            <div className="bg-white p-6 rounded-xl text-center">
              <p className="text-3xl font-bold text-[#F5A623]">2-3</p>
              <p className="text-sm text-slate-500 mb-2">Months</p>
              <p className="font-semibold text-[#1a365d]">Finishing & Handover</p>
            </div>
          </div>
          
          <p className="text-center text-slate-500 mt-8">
            *Timeline varies based on project size and complexity. Get accurate estimates during consultation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#1a365d]" data-testid="process-cta">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Construction Journey?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Book a free consultation and take the first step towards your dream home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="bg-[#F5A623] text-black hover:bg-[#e09612] h-12 px-8" data-testid="process-consultation-btn">
                Book Free Consultation
              </Button>
            </Link>
            <Link to="/cost-calculator">
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#1a365d] h-12 px-8" data-testid="process-calculator-btn">
                Calculate Construction Cost
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProcessPage;
