import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Cpu, Gamepad2, Play, Star, Zap } from 'lucide-react';
import { GAMES_DATA } from '../constants';

export const Preloader = ({ onLoadingComplete }: { onLoadingComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    'CONNECTING TO GAMES UP NETWORK...',
    'SYNCING CONTROLLERS...',
    'LOADING ICONIC WORLDS...',
    'OPTIMIZING ASSETS...',
    'READY FOR ADVENTURE...',
    'GAME ON!',
  ];

  useEffect(() => {
    const duration = 3000;
    const interval = 20;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onLoadingComplete, 500);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev < statuses.length - 1 ? prev + 1 : prev));
    }, duration / statuses.length);

    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
    };
  }, [onLoadingComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(30px)', scale: 1.05, transition: { duration: 0.8, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[100] bg-[#020202] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="flex flex-wrap gap-12 rotate-[-15deg] scale-150 justify-center">
          {GAMES_DATA.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, -40, 0], opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.5 }}
              className="w-48 h-64 rounded-xl overflow-hidden grayscale brightness-50 border border-white/5"
            >
              <img src={game.image} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/5 via-transparent to-brand-red/10 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_70%)]"></div>

      <div className="relative z-20 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1, ease: 'backOut' }}
          className="mb-16 relative"
        >
          <div className="absolute -inset-8 bg-brand-red blur-[60px] opacity-20 rounded-full animate-pulse"></div>
          <div className="relative bg-bg-card border-2 border-brand-red/30 p-8 rounded-[2.5rem] shadow-2xl">
            <Gamepad2 className="w-16 h-16 text-brand-red" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2"
            >
              <Zap className="w-8 h-8 text-brand-red fill-current" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white font-display uppercase">
            GAMES<span className="text-brand-red font-black">UP</span>
          </h1>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-brand-red/50 to-transparent mt-2"></div>
        </motion.div>

        <div className="w-72 space-y-8">
          <div className="relative">
            <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-white/50 mb-3 uppercase italic">
              <span className="flex items-center gap-2">
                <Cpu className="h-3 w-3 text-brand-red" />
                INITIATING SYSTEM
              </span>
              <span className="text-brand-red">{Math.round(progress)}%</span>
            </div>

            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div className="h-full bg-brand-red relative" initial={{ width: '0%' }} animate={{ width: `${progress}%` }} transition={{ ease: 'linear' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </motion.div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={statusIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-4 py-3 px-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl"
            >
              <div className="relative h-3 w-3">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 bg-brand-red rounded-full"
                ></motion.div>
                <Play className="h-3 w-3 text-white fill-current relative z-10 scale-75" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-white/80">{statuses[statusIndex]}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 flex items-center gap-4 text-white/10 uppercase font-black text-[10px] tracking-[0.5em] italic">
        <Star className="h-4 w-4" />
        <span>Premium Digital Marketplace</span>
      </div>

      <div className="absolute top-12 left-12 h-20 w-[1px] bg-gradient-to-b from-brand-red to-transparent"></div>
      <div className="absolute top-12 left-12 w-20 h-[1px] bg-gradient-to-r from-brand-red to-transparent"></div>
    </motion.div>
  );
};
