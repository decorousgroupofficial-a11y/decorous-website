import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import axios from 'axios';
import { trackCostCalculation, trackLeadSubmission } from '@/utils/analytics';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CostCalculatorPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    plot_size: '',
    floors: '1',
    quality: 'standard',
    city: 'bhubaneswar'
  });
  const [leadData, setLeadData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cities = [
    { value: 'bhubaneswar', label: 'Bhubaneswar' },
    { value: 'cuttack', label: 'Cuttack' },
    { value: 'puri', label: 'Puri' },
    { value: 'khordha', label: 'Khordha' },
    { value: 'rourkela', label: 'Rourkela' },
    { value: 'berhampur', label: 'Berhampur' },
    { value: 'sambalpur', label: 'Sambalpur' }
  ];

  const qualityOptions = [
    { 
      value: 'basic', 
      label: 'Basic', 
      price: '₹1,700/sqft',
      description: 'Standard materials with basic finishes'
    },
    { 
      value: 'standard', 
      label: 'Standard', 
      price: '₹2,000/sqft',
      description: 'Quality materials with good finishes'
    },
    { 
      value: 'premium', 
      label: 'Premium', 
      price: '₹2,400/sqft',
      description: 'Premium materials with luxury finishes'
    }
  ];

  const handleCalculate = async () => {
    if (!formData.plot_size || parseInt(formData.plot_size) <= 0) {
      toast.error('Please enter a valid plot size');
      return;
    }

    setIsCalculating(true);

    try {
      const response = await axios.post(`${API}/calculate-cost`, {
        plot_size: parseInt(formData.plot_size),
        floors: parseInt(formData.floors),
        quality: formData.quality,
        city: formData.city
      });
      setResult(response.data);
      
      // Track cost calculation event
      trackCostCalculation({
        plot_size: formData.plot_size,
        floors: formData.floors,
        quality: formData.quality,
        city: formData.city,
        estimated_cost: response.data.estimated_cost
      });
      
      setStep(2);
    } catch (error) {
      console.error('Error calculating cost:', error);
      toast.error('Error calculating cost. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    
    if (!leadData.name || !leadData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${API}/leads`, {
        ...leadData,
        plot_size: formData.plot_size,
        city: cities.find(c => c.value === formData.city)?.label,
        construction_type: `${formData.quality.charAt(0).toUpperCase() + formData.quality.slice(1)} Construction`,
        source: 'cost_calculator',
        message: `Estimated Cost: ₹${result?.estimated_cost?.toLocaleString('en-IN')} | Plot: ${formData.plot_size} sqft | Floors: ${formData.floors}`
      });
      
      // Track lead conversion from calculator
      trackLeadSubmission({
        source: 'cost_calculator',
        city: cities.find(c => c.value === formData.city)?.label,
        construction_type: `${formData.quality} Construction`,
        estimated_value: result?.estimated_cost
      });
      
      toast.success('Details submitted! Our team will contact you shortly.');
      setStep(3);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Error submitting details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-20 bg-[#1a365d] text-white" data-testid="calculator-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="w-16 h-16 bg-[#F5A623] text-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calculator size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Construction Cost Calculator</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Get an instant estimate for your construction project in Odisha. 
            Our calculator provides accurate cost breakdowns based on current market rates.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-16 bg-slate-50" data-testid="calculator-section">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= s ? 'bg-[#F5A623] text-black' : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${step > s ? 'bg-[#F5A623]' : 'bg-slate-200'}`}></div>
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Calculator Form */}
          {step === 1 && (
            <div className="bg-white rounded-2xl p-8 shadow-lg" data-testid="calculator-step-1">
              <h2 className="text-2xl font-bold text-[#1a365d] mb-6">Enter Project Details</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="plot_size" className="text-base">Plot Size (in sqft) *</Label>
                  <Input
                    id="plot_size"
                    type="number"
                    placeholder="e.g., 1500"
                    value={formData.plot_size}
                    onChange={(e) => setFormData({...formData, plot_size: e.target.value})}
                    className="mt-2 h-12"
                    data-testid="calc-plot-size"
                  />
                </div>

                <div>
                  <Label htmlFor="floors" className="text-base">Number of Floors</Label>
                  <Select 
                    value={formData.floors} 
                    onValueChange={(value) => setFormData({...formData, floors: value})}
                  >
                    <SelectTrigger className="mt-2 h-12" data-testid="calc-floors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Ground Floor (G)</SelectItem>
                      <SelectItem value="2">G + 1 Floor</SelectItem>
                      <SelectItem value="3">G + 2 Floors</SelectItem>
                      <SelectItem value="4">G + 3 Floors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base mb-3 block">Construction Quality</Label>
                  <RadioGroup
                    value={formData.quality}
                    onValueChange={(value) => setFormData({...formData, quality: value})}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    data-testid="calc-quality"
                  >
                    {qualityOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.quality === option.value 
                            ? 'border-[#F5A623] bg-[#F5A623]/5' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <span className="font-semibold text-[#1a365d]">{option.label}</span>
                        <span className="text-[#F5A623] font-bold">{option.price}</span>
                        <span className="text-sm text-slate-500 mt-1">{option.description}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="city" className="text-base">City</Label>
                  <Select 
                    value={formData.city} 
                    onValueChange={(value) => setFormData({...formData, city: value})}
                  >
                    <SelectTrigger className="mt-2 h-12" data-testid="calc-city">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCalculate}
                  disabled={isCalculating || !formData.plot_size}
                  className="w-full h-14 bg-[#F5A623] text-black hover:bg-[#e09612] text-lg font-semibold"
                  data-testid="calc-calculate-btn"
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Cost'}
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Results & Lead Form */}
          {step === 2 && result && (
            <div className="space-y-8" data-testid="calculator-step-2">
              {/* Results */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-[#1a365d] mb-6">Estimated Construction Cost</h2>
                
                <div className="text-center py-8 mb-6 bg-[#1a365d] rounded-xl">
                  <p className="text-white/70 mb-2">Total Estimated Cost</p>
                  <p className="text-4xl md:text-5xl font-bold text-[#F5A623]">
                    {formatCurrency(result.estimated_cost)}
                  </p>
                  <p className="text-white/70 mt-2">
                    @ {formatCurrency(result.cost_per_sqft)}/sqft
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-[#1a365d]">Cost Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Total Built-up Area', value: `${result.breakdown.total_area} sqft` },
                      { label: 'Construction Cost', value: formatCurrency(result.breakdown.construction) },
                      { label: 'Foundation', value: formatCurrency(result.breakdown.foundation) },
                      { label: 'Electrical Work', value: formatCurrency(result.breakdown.electrical) },
                      { label: 'Plumbing Work', value: formatCurrency(result.breakdown.plumbing) },
                      { label: 'Finishing', value: formatCurrency(result.breakdown.finishing) },
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-medium text-[#1a365d]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    * This is an estimated cost. Actual cost may vary based on specific requirements, 
                    site conditions, and material choices.
                  </p>
                </div>
              </div>

              {/* Lead Form */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#1a365d] mb-2">Get Detailed Quote</h3>
                <p className="text-slate-600 mb-6">
                  Enter your details to receive a detailed quotation from our team.
                </p>
                
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={leadData.name}
                      onChange={(e) => setLeadData({...leadData, name: e.target.value})}
                      required
                      className="mt-2"
                      data-testid="calc-lead-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone number"
                      value={leadData.phone}
                      onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                      required
                      className="mt-2"
                      data-testid="calc-lead-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Your email address"
                      value={leadData.email}
                      onChange={(e) => setLeadData({...leadData, email: e.target.value})}
                      className="mt-2"
                      data-testid="calc-lead-email"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-[#F5A623] text-black hover:bg-[#e09612] font-semibold"
                    data-testid="calc-lead-submit"
                  >
                    {isSubmitting ? 'Submitting...' : 'Get Detailed Quote'}
                  </Button>
                </form>

                <button
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-2 w-full mt-4 text-slate-500 hover:text-[#1a365d]"
                  data-testid="calc-back-btn"
                >
                  <ArrowLeft size={16} />
                  Recalculate
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center" data-testid="calculator-step-3">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-[#1a365d] mb-4">Thank You!</h2>
              <p className="text-slate-600 mb-8">
                Your details have been submitted successfully. Our team will contact you within 24 hours 
                with a detailed quotation for your project.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/services">
                  <Button variant="outline" className="border-[#1a365d] text-[#1a365d]">
                    Explore Services
                  </Button>
                </Link>
                <Link to="/projects">
                  <Button className="bg-[#1a365d] text-white hover:bg-[#0f2442]">
                    View Our Projects
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-white" data-testid="calculator-info">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-slate-100 text-[#1a365d] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calculator size={28} />
              </div>
              <h3 className="font-bold text-[#1a365d] mb-2">Accurate Estimates</h3>
              <p className="text-slate-600 text-sm">Based on current market rates in Odisha for materials and labor</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-slate-100 text-[#1a365d] rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} />
              </div>
              <h3 className="font-bold text-[#1a365d] mb-2">Transparent Pricing</h3>
              <p className="text-slate-600 text-sm">No hidden costs - see exactly where your investment goes</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-slate-100 text-[#1a365d] rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowRight size={28} />
              </div>
              <h3 className="font-bold text-[#1a365d] mb-2">Free Consultation</h3>
              <p className="text-slate-600 text-sm">Get expert advice and detailed quotes at no cost</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CostCalculatorPage;
