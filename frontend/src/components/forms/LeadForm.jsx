import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { trackLeadSubmission } from '@/utils/analytics';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LeadForm = ({ 
  source = 'website', 
  variant = 'default', 
  title = 'Get Free Consultation',
  showPlotSize = false,
  showConstructionType = false,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    plot_size: '',
    construction_type: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cities = [
    'Bhubaneswar', 'Cuttack', 'Puri', 'Khordha', 'Rourkela', 'Berhampur', 'Sambalpur'
  ];

  const constructionTypes = [
    'Residential Construction',
    'Commercial Construction',
    'Interior Design',
    'Warehouse Construction',
    'PEB Construction'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${API}/leads`, {
        ...formData,
        source
      });
      
      // Track conversion event
      trackLeadSubmission({
        source,
        city: formData.city,
        construction_type: formData.construction_type
      });
      
      toast.success('Thank you! We will contact you shortly.');
      setFormData({
        name: '',
        phone: '',
        email: '',
        city: '',
        plot_size: '',
        construction_type: '',
        message: ''
      });
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="lead-form-compact">
        <Input
          type="text"
          name="name"
          placeholder="Your Name *"
          value={formData.name}
          onChange={handleChange}
          required
          className="h-12"
          data-testid="lead-form-name"
        />
        <Input
          type="tel"
          name="phone"
          placeholder="Phone Number *"
          value={formData.phone}
          onChange={handleChange}
          required
          className="h-12"
          data-testid="lead-form-phone"
        />
        <Select onValueChange={(value) => handleSelectChange('city', value)}>
          <SelectTrigger className="h-12" data-testid="lead-form-city">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            {cities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          type="submit" 
          className="w-full h-12 bg-[#F5A623] text-black hover:bg-[#e09612] font-semibold"
          disabled={isSubmitting}
          data-testid="lead-form-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Get Free Consultation'}
        </Button>
      </form>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 md:p-8 shadow-lg border border-slate-100 ${variant === 'hero' ? 'max-w-md' : ''}`}>
      {title && <h3 className="text-xl font-bold text-[#1a365d] mb-6">{title}</h3>}
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="lead-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1"
              data-testid="lead-form-name"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
              className="mt-1"
              data-testid="lead-form-phone"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="mt-1"
              data-testid="lead-form-email"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Select onValueChange={(value) => handleSelectChange('city', value)}>
              <SelectTrigger className="mt-1" data-testid="lead-form-city">
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showPlotSize && (
          <div>
            <Label htmlFor="plot_size">Plot Size (in sqft)</Label>
            <Input
              id="plot_size"
              type="text"
              name="plot_size"
              placeholder="e.g., 1500"
              value={formData.plot_size}
              onChange={handleChange}
              className="mt-1"
              data-testid="lead-form-plot-size"
            />
          </div>
        )}

        {showConstructionType && (
          <div>
            <Label htmlFor="construction_type">Construction Type</Label>
            <Select onValueChange={(value) => handleSelectChange('construction_type', value)}>
              <SelectTrigger className="mt-1" data-testid="lead-form-construction-type">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {constructionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 bg-[#F5A623] text-black hover:bg-[#e09612] font-semibold"
          disabled={isSubmitting}
          data-testid="lead-form-submit"
        >
          {isSubmitting ? 'Submitting...' : 'Get Free Estimate'}
        </Button>
        
        <p className="text-xs text-slate-500 text-center">
          By submitting, you agree to our privacy policy. We'll contact you within 24 hours.
        </p>
      </form>
    </div>
  );
};

export default LeadForm;
