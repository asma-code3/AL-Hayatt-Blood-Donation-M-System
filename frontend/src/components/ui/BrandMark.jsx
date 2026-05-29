import React from 'react';
import logoImage from '../../assets/logo.jpeg';

const BrandMark = ({
  title = 'Al-Hayatt Hospital',
  subtitle = 'Blood Donation Management System',
  size = 'md',
  showSubtitle = true,
  align = 'left',
  textClassName = '',
}) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const iconWrapClass = isLarge
    ? 'h-24 w-24 rounded-[32px]'
    : isSmall
      ? 'h-14 w-14 rounded-[20px]'
      : 'h-16 w-16 rounded-[26px]';

  const titleClass = isLarge ? 'text-4xl sm:text-5xl' : isSmall ? 'text-base' : 'text-2xl';
  const subtitleClass = isLarge ? 'text-base sm:text-lg' : 'text-xs sm:text-sm';
  const layoutClass = align === 'center' ? 'items-center text-center' : 'items-center text-left';

  return (
    <div className={`flex gap-4 ${layoutClass}`}>
      <div className={`brand-mark overflow-hidden bg-white p-1.5 ${iconWrapClass}`}>
        <img
          src={logoImage}
          alt={`${title} logo`}
          className="h-full w-full object-contain"
        />
      </div>
      <div className={`min-w-0 ${textClassName}`}>
        <h1 className={`font-black tracking-tight text-red-600 ${titleClass}`}>{title}</h1>
        {showSubtitle && (
          <p className={`mt-1 text-red-500/90 ${subtitleClass}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default BrandMark;
