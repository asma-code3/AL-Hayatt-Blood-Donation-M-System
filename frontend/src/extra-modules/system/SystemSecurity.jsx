import React from 'react';

const securityControls = [
  { title: 'Role-based Access Control', status: 'Active', detail: 'Routes are protected by Administrator and Staff capabilities.' },
  { title: 'Protected Session', status: 'Active', detail: 'Users must login before accessing the dashboard modules.' },
  { title: 'Critical Account Protection', status: 'Active', detail: 'Default admin account cannot be removed from Manage Users.' },
  { title: 'Action Monitoring', status: 'Active', detail: 'System changes are restricted to allowed role actions only.' },
];

const SystemSecurity = () => {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-2xl font-bold text-slate-800">System Security</h2>
        <p className="mt-1 text-sm text-slate-500">Security posture and access policy overview.</p>
      </section>

      <section className="grid gap-4">
        {securityControls.map((control) => (
          <article key={control.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-800">{control.title}</h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{control.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{control.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default SystemSecurity;

