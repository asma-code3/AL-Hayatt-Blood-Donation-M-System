import React from 'react';
import { FiCalendar, FiShield } from 'react-icons/fi';

const FormShowcaseCard = (props) => {
  const {
    icon,
    accentIcon,
    title,
    subtitle,
    metaLabel,
    metaValue,
    footerNote,
    footerMeta,
    children,
  } = props;
  const IconComponent = icon;
  const AccentIconComponent = accentIcon;

  return (
    <section className="form-showcase-card ">
      <header className="form-showcase-card-header bg-red-100 flex flex-col gap-4 border-b border-[#fc3007] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex items-start gap-4">
          <div className="interactive-icon-badge grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e10606] text-white shadow-[0_18px_32px_-20px_rgba(225,6,6,0.65)]">
            <IconComponent className="text-[1.25rem]" />
          </div>
          <div >
            <h3 className="form-showcase-card-title text-xl font-extrabold uppercase tracking-[0.01em] text-[#d01010]">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {AccentIconComponent ? (
          <span className="interactive-icon-badge grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-[#e10606]">
            <AccentIconComponent className="text-xl" />
          </span>
        ) : null}
      </header>

      <div className="px-5 py-5 sm:px-6">
        {(metaLabel || metaValue) && (
          <div className="mb-5 inline-flex flex-col gap-1 rounded-2xl border border-[#f0f1f5] bg-[#fafbfc] px-4 py-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{metaLabel}</span>
            <span className="text-sm font-bold text-slate-700">{metaValue}</span>
          </div>
        )}
        {children}
      </div>

      {(footerNote || footerMeta) && (
        <footer className="flex flex-col gap-3 border-t border-[#f2f3f6] px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {footerNote && (
            <p className="inline-flex items-center gap-2">
              <FiShield />
              {footerNote}
            </p>
          )}
          {footerMeta && (
            <p className="inline-flex items-center gap-2">
              <FiCalendar />
              {footerMeta}
            </p>
          )}
        </footer>
      )}
    </section>
  );
};

export default FormShowcaseCard;
