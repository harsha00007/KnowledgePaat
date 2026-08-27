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
    xs: { height: 26, className: 'h-6 sm:h-[26px] w-auto max-w-[120px]' },
    sm: { height: 32, className: 'h-7 sm:h-8 w-auto max-w-[150px]' },
    md: { height: 44, className: 'h-9 sm:h-11 w-auto max-w-[220px]' },
    lg: { height: 56, className: 'h-12 sm:h-14 w-auto max-w-[280px]' },
    xl: { height: 72, className: 'h-16 sm:h-[72px] w-auto max-w-[340px]' },
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
        alt="KnowledgePaat — Learn, Prepare and Build Your Career"
        className={`${currentSize.className} object-contain transition-all`}
        style={{ maxHeight: currentSize.height }}
        loading="eager"
      />
    </div>
  );
}
