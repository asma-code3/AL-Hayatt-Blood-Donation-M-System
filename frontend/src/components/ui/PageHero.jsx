import React from 'react';

const PageHero = ({ eyebrow, title, description, stats = [], actions = null, aside = null }) => {
  return (
    <section className="hero-panel">
      <div className="hero-grid">
        <div className="hero-copy-shell">
          {eyebrow && <span className="hero-eyebrow">{eyebrow}</span>}
          <h2 className="section-title mt-4">{title}</h2>
          {description && <p className="section-copy">{description}</p>}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>

        <div className="space-y-4">
          {aside && <div className="hero-aside-card">{aside}</div>}
          {stats.length > 0 && (
            <div className="hero-stat-grid">
              {stats.map((stat) => (
                <article key={stat.label} className="hero-stat-card hero-stat-card-static">
                  <p className="hero-stat-label">{stat.label}</p>
                  <p className="hero-stat-value">{stat.value}</p>
                  {stat.note && <p className="mt-2 text-sm text-slate-500">{stat.note}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
