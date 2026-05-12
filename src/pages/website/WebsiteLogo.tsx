import logoBlack from '../../assets/games up word black.png';
import logoWhite from '../../assets/games up word white.png';

interface WebsiteLogoProps {
  variant?: 'color' | 'white';
  className?: string;
}

export function WebsiteLogo({ variant = 'color', className = "h-10 w-auto object-contain" }: WebsiteLogoProps) {
  const src = variant === 'white' ? logoWhite : logoBlack;
  return (
    <img 
      src={src} 
      alt="Games Up" 
      className={className} 
    />
  );
}
