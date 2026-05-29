import React from 'react';
import logoImage from '../../assets/logo.jpeg';

const Footer = () => {
  return (
    <footer className="w-full border-t border-[#c90f18] bg-gradient-to-r from-[#d60f17] via-[#df161c] to-[#c70c14] px-4 py-2 text-white shadow-[0_-20px_36px_-24px_rgba(214,15,23,0.7)] sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-white/16 bg-white/10 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-sm">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-white/18 bg-white/12 p-[3px] shadow-[0_12px_22px_-16px_rgba(15,23,42,0.48)]">
            <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white p-1.5 ring-1 ring-black/5">
              <img src={logoImage} alt="Al-Hayatt Hospital logo" className="h-full w-full object-contain" />
            </div>
          </div>
          <div className="h-6 w-px bg-white/18" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/78">
            Blood Donation System
          </span>
        </div>

        <div className="text-[10px] font-medium tracking-[0.03em] text-white/82 sm:text-right">
          Copyright {new Date().getFullYear()} Al-Hayatt Hospital. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
