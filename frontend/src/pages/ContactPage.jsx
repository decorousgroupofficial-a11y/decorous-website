import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    construction_type: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cities = ['Bhubaneswar', 'Cuttack', 'Puri', 'Khordha', 'Rourkela', 'Berhampur', 'Sambalpur'];
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
        source: 'contact_page'
      });
      
      toast.success('Thank you! We will contact you within 24 hours.');
      setFormData({
        name: '',
        phone: '',
        email: '',
        city: '',
        construction_type: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappNumber = '917008863329';

  return (
    <div className="pb-16 md:pb-0">
      {/* Page Header */}
      <section className="py-16 md:py-24 bg-[#1a365d] text-white" data-testid="contact-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">Contact Us</h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            Ready to build your dream home? Get in touch with our team for a free consultation.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white" data-testid="contact-form-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-[#1a365d] mb-6">Get In Touch</h2>
              
              <div className="space-y-6">
                <a href="tel:7008863329" className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors" data-testid="contact-phone">
                  <div className="w-12 h-12 bg-[#1a365d] text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">Call Us</p>
                    <p className="text-slate-600">7008863329</p>
                    <p className="text-sm text-slate-500">Mon-Sat, 9AM-7PM</p>
                  </div>
                </a>

                <a href="mailto:contact@decorous.in" className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors" data-testid="contact-email">
                  <div className="w-12 h-12 bg-[#1a365d] text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">Email Us</p>
                    <p className="text-slate-600">contact@decorous.in</p>
                    <p className="text-sm text-slate-500">We respond within 24 hours</p>
                  </div>
                </a>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-12 h-12 bg-[#1a365d] text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">Visit Us</p>
                    <p className="text-slate-600">Bhubaneswar, Odisha</p>
                    <p className="text-sm text-slate-500">India</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-12 h-12 bg-[#1a365d] text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a365d]">Business Hours</p>
                    <p className="text-slate-600">Monday - Saturday</p>
                    <p className="text-sm text-slate-500">9:00 AM - 7:00 PM</p>
                  </div>
                </div>

                <a 
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-4 bg-[#25D366] text-white rounded-xl hover:bg-[#1fad54] transition-colors font-semibold"
                  data-testid="contact-whatsapp"
                >
                  <MessageCircle size={20} />
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <h2 className="text-2xl font-bold text-[#1a365d] mb-6">Send Us a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-2"
                        data-testid="contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="mt-2"
                        data-testid="contact-phone-input"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Your email address"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-2"
                        data-testid="contact-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Select onValueChange={(value) => handleSelectChange('city', value)}>
                        <SelectTrigger className="mt-2" data-testid="contact-city">
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="construction_type">Service Required</Label>
                    <Select onValueChange={(value) => handleSelectChange('construction_type', value)}>
                      <SelectTrigger className="mt-2" data-testid="contact-service">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {constructionTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your project requirements..."
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className="mt-2"
                      data-testid="contact-message"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#F5A623] text-black hover:bg-[#e09612] font-semibold"
                    disabled={isSubmitting}
                    data-testid="contact-submit"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>

                  <p className="text-sm text-slate-500 text-center">
                    By submitting this form, you agree to our privacy policy. We'll contact you within 24 hours.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-slate-50" data-testid="contact-map">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1a365d]">Our Location</h2>
            <p className="text-slate-600">Visit our office in Bhubaneswar</p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d119743.53499694498!2d85.75041370000001!3d20.300889700000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a1909d2d5170aa5%3A0xfc580e2b68b33fa8!2sBhubaneswar%2C%20Odisha!5e0!3m2!1sen!2sin!4v1703765432012!5m2!1sen!2sin"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Decorous Office Location"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
