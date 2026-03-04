import { useState, useEffect } from 'react';
import { MessageCircle, ChevronUp } from 'lucide-react';

const FloatingButtons = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const whatsappNumber = '917008863329';
  const whatsappMessage = encodeURIComponent('Hi! I am interested in your construction services. Please provide more details.');

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300"
        data-testid="whatsapp-float-btn"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={24} fill="white" />
      </a>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-20 md:bottom-8 md:right-24 z-40 bg-[#1a365d] text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:bg-[#0f2442] ${
          showBackToTop ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        data-testid="back-to-top-btn"
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>
    </>
  );
};

export default FloatingButtons;
