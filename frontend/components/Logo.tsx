import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  variant?: 'auto' | 'light' | 'dark';
}

export function Logo({
  size = 'md',
  className = '',
}: LogoProps) {
  // Height and width mapping for balanced, clean, and elegant presentation
  const sizeMap = {
    xs: { height: 28, className: 'h-7 w-auto max-w-[120px]' },
    sm: { height: 34, className: 'h-8 sm:h-[34px] w-auto max-w-[140px]' },
    md: { height: 60, className: 'h-11 sm:h-[60px] w-auto max-w-[270px]' },
    lg: { height: 72, className: 'h-14 sm:h-[72px] w-auto max-w-[320px]' },
    xl: { height: 84, className: 'h-18 sm:h-[84px] w-auto max-w-[370px]' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      {/* 
        Official KnowledgePaat Brand Logo
        Clean and natural rendering without any box/container
      */}
      <img
        src="/brand/knowledgepaat_logo.png"
        alt="KnowledgePaat — From Knowledge to Opportunity"
        className={`${currentSize.className} object-contain transition-all`}
        style={{ maxHeight: currentSize.height }}
        loading="eager"
      />
    </div>
  );
}
