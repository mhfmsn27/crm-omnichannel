
import React, { useState, useEffect } from 'react';
import { X, Megaphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiUrl } from '../../config/api';

export default function AnnouncementBanner({ data }) {
  // Expecting data to be an array of announcements
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
      // Filter out dismissed banners
      if (data && Array.isArray(data)) {
          const validBanners = data.filter(b => {
              const dismissed = localStorage.getItem(`banner_dismissed_${b.id}`);
              return !dismissed;
          });
          setBanners(validBanners);
      }
  }, [data]);

  useEffect(() => {
      if (banners.length <= 1 || isHovered) return;
      const timer = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
  }, [banners.length, isHovered]);

  const handleDismiss = (e, id) => {
      e.stopPropagation(); // Prevent triggering link click
      e.preventDefault();
      localStorage.setItem(`banner_dismissed_${id}`, 'true');
      setBanners(prev => prev.filter(b => b.id !== id));
      if (currentIndex >= banners.length - 1) {
          setCurrentIndex(0);
      }
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const variants = {
      enter: { opacity: 0, x: 20 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
  };

  const bgColors = {
      info: 'bg-indigo-500',
      warning: 'bg-orange-400',
      promo: 'bg-green-500'
  };

  const Wrapper = ({ children }) => {
      if (currentBanner.link_url) {
          return (
              <a 
                  href={currentBanner.link_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block h-full w-full"
              >
                  {children}
              </a>
          );
      }
      return <div className="h-full w-full">{children}</div>;
  };

  return (
    <div 
        className={`mb-6 relative overflow-hidden rounded-xl shadow-md h-[120px] ${currentBanner.link_url ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
        <AnimatePresence mode='wait'>
            <motion.div
                key={currentBanner.id}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5 }}
                className={`absolute inset-0 ${bgColors[currentBanner.type] || bgColors.info} text-white`}
            >
                <Wrapper>
                    <div className="flex items-center h-full w-full p-5">
                        {currentBanner.image_url && (
                            <div className="mr-4 w-16 h-16 rounded-lg overflow-hidden bg-white/20 shrink-0 hidden sm:block">
                                <img src={getApiUrl(currentBanner.image_url)} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="flex-1 pr-8">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="bg-white/20 p-1 rounded-full">
                                    <Megaphone className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="font-bold text-sm uppercase tracking-wider opacity-90">
                                    {currentBanner.title || 'Announcement'}
                                    {currentBanner.link_url && <ExternalLink className="w-3 h-3 inline ml-2 opacity-70" />}
                                </h4>
                            </div>
                            <p className="text-sm sm:text-base font-medium leading-snug opacity-95 line-clamp-2">
                                {currentBanner.message}
                            </p>
                        </div>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-10 -translate-y-10 blur-2xl pointer-events-none"></div>
                    </div>
                </Wrapper>
            </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="absolute top-3 right-3 z-10">
             <button 
                 onClick={(e) => handleDismiss(e, currentBanner.id)}
                 className="text-white/70 hover:text-white bg-black/10 hover:bg-black/20 p-1 rounded-full transition-colors"
             >
                 <X className="w-4 h-4" />
             </button>
        </div>

        {/* Indicators */}
        {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                {banners.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                    />
                ))}
            </div>
        )}
    </div>
  );
}
