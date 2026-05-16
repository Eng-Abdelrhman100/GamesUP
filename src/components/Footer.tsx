import React from 'react';
import { MessageSquare, Twitter, Instagram, Facebook } from 'lucide-react';

export const Footer = ({ isDark }: { isDark: boolean }) => {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <footer className="bg-bg-dark pt-24 pb-12 border-t border-border-subtle transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-8">
            <div className="h-8 md:h-10 flex items-center">
              {!logoError ? (
                <img 
                  src={isDark ? "/logo-dark.png" : "/logo-light.png"} 
                  alt="GAMES UP" 
                  className="h-full w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-xl md:text-2xl font-black italic tracking-tighter text-[var(--text-primary)] font-display uppercase">
                  GAMES<span className="text-brand-red">UP</span>
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-black uppercase tracking-wider max-w-xs italic transition-colors">
              The most trusted digital game store in Egypt. Established in 2021 to provide elite digital experiences.
            </p>
          <div className="flex gap-4">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="h-10 w-10 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-[var(--text-primary)] hover:border-brand-red transition-all bg-bg-card active:scale-95">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-brand-red tracking-[0.3em] mb-8 uppercase italic underline decoration-2 underline-offset-8">Quick Links</h4>
          <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary italic">
            {['The Catalog', 'Special Offers', 'Best Sellers', 'New Missions', 'About Samurai'].map(l => (
              <li key={l}><a href="#" className="hover:text-[var(--text-primary)] transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-[var(--text-primary)] tracking-[0.3em] mb-8 uppercase italic transition-colors">Information</h4>
          <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary italic">
            {['Terms of Combat', 'Refund Policy', 'Deployment Log', 'Support Desk', 'Mission FAQs'].map(l => (
              <li key={l}><a href="#" className="hover:text-[var(--text-primary)] transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
           <h4 className="text-[10px] font-black text-[var(--text-primary)] tracking-[0.3em] mb-8 uppercase italic transition-colors">Support Desk</h4>
           <div className="space-y-6">
              <p className="text-[10px] text-text-secondary font-bold leading-relaxed uppercase tracking-widest italic transition-colors">
                Need help with your purchase? <br />
                Our team is available 24/7 via WhatsApp.
              </p>
              <button className="w-full bg-bg-card border border-border-subtle p-5 flex items-center gap-4 group hover:border-brand-red/50 transition-all italic">
                <div className="bg-brand-red/10 p-3 rounded group-hover:bg-brand-red transition-colors">
                  <MessageSquare className="h-5 w-5 text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-text-secondary tracking-widest uppercase transition-colors">WhatsApp Support</div>
                  <div className="text-[var(--text-primary)] font-black text-sm tracking-tighter transition-colors">+20 123 456 7890</div>
                </div>
              </button>
           </div>
        </div>
      </div>

      <div className="pt-12 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] italic transition-colors">
        <div className="flex gap-6">
          <span>&copy; 2024 Samurai Store Egypt</span>
          <span className="text-[var(--text-primary)]/20">System: Online</span>
        </div>
        <div className="flex items-center gap-8">
           <span className="text-green-500">Ping: 24ms</span>
           <div className="h-4 w-[1px] bg-border-subtle"></div>
           <div className="flex gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer">
             <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-3" alt="PayPal" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" className="h-2.5" alt="Visa" />
           </div>
        </div>
      </div>
    </div>
  </footer>
  );
};
