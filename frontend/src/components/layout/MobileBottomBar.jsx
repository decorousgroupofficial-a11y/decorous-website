import { Link } from 'react-router-dom';
import { Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MobileBottomBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex gap-3 md:hidden z-40">
      <a href="tel:7008863329" className="flex-1">
        <Button className="w-full bg-[#1a365d] text-white hover:bg-[#0f2442] flex items-center justify-center gap-2" data-testid="mobile-call-btn">
          <Phone size={18} />
          Call Now
        </Button>
      </a>
      <Link to="/contact" className="flex-1">
        <Button className="w-full bg-[#F5A623] text-black hover:bg-[#e09612] flex items-center justify-center gap-2" data-testid="mobile-quote-btn">
          <FileText size={18} />
          Get Quote
        </Button>
      </Link>
    </div>
  );
};

export default MobileBottomBar;
