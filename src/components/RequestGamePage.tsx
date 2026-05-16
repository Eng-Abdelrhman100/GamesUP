import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, Send, Gamepad2, Info, X } from 'lucide-react';

interface RequestGamePageProps {
  onBack: () => void;
}

export const RequestGamePage = ({ onBack }: RequestGamePageProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-bg-dark pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 text-[10px] font-black text-text-secondary hover:text-brand-red transition-all uppercase tracking-[0.2em] mb-12 group italic"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Retrieval Zone
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <h1 className="text-5xl md:text-8xl font-black tracking-[-0.05em] text-[var(--text-primary)] uppercase font-display leading-[0.8] italic mb-8">
              REQUEST<br />A GAME<span className="text-brand-red">.</span>
            </h1>
            <p className="text-text-secondary text-sm font-black uppercase tracking-[0.3em] italic mb-12">Search Target Acquisition</p>
            
            <div className="space-y-8">
              <div className="p-6 rounded-3xl bg-brand-red/5 border border-brand-red/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-brand-red/10 rounded-2xl">
                    <Gamepad2 className="h-6 w-6 text-brand-red" />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tighter uppercase italic">Mission Briefing</h3>
                </div>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest leading-loose">
                  Can't find your target in our armory? Submit a request and our procurement specialists will scan the network to secure the asset for you.
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-text-secondary">
                <Info className="h-5 w-5 text-brand-red" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Wait time: 24-48 Hours for analysis</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form className="bg-bg-card border border-border-subtle rounded-[2.5rem] p-10 md:p-16 space-y-8 shadow-2xl">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Game Title / Objective</label>
                <input 
                  type="text" 
                  placeholder="E.G. ELDEN RING: SHADOW OF THE ERDTREE" 
                  className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Preferred Region</label>
                  <select className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all appearance-none cursor-pointer">
                    <option>EGYPT (PRIMARY)</option>
                    <option>USA / GLOBAL</option>
                    <option>UK / EUROPE</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Account Type</label>
                  <select className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all appearance-none cursor-pointer">
                    <option>PLATINUM ACCESS</option>
                    <option>GOLD ACCESS</option>
                    <option>SILVER ACCESS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Visual Confirmation (Optional)</label>
                <div 
                  onClick={() => !imagePreview && fileInputRef.current?.click()}
                  className={`relative group h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all overflow-hidden ${
                    imagePreview 
                      ? 'border-brand-red bg-brand-red/5' 
                      : 'border-border-subtle hover:border-brand-red/30 bg-bg-dark cursor-pointer'
                  }`}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-brand-red rounded-full text-white transition-all z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="relative z-10 text-[10px] font-black text-brand-red uppercase tracking-widest italic">Visual Acquired</div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-full bg-brand-red/10 group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6 text-brand-red" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest italic">Upload Box Art / Intel</p>
                        <p className="text-[8px] text-text-secondary uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest italic px-2">Additional Intel</label>
                <textarea rows={4} placeholder="ANY SPECIFIC REQUIREMENTS OR QUESTIONS..." className="w-full bg-bg-dark border border-border-subtle rounded-2xl px-6 py-4 text-xs font-bold uppercase focus:outline-none focus:border-brand-red transition-all resize-none"></textarea>
              </div>

              <button className="w-full bg-brand-red text-white py-6 rounded-2xl font-black tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all hover:bg-black uppercase italic shadow-xl shadow-brand-red/20">
                Submit Target Request
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
