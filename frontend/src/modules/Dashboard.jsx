import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiCalendar, FiCheckCircle, FiClipboard, FiClock, FiDroplet, FiShield, FiUsers, FiUserCheck } from 'react-icons/fi';
import { useBloodContext } from '../Context/blood-context';
import { useAuth } from '../Context/auth-context';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const bloodColors = {
  'A+': '#c8141d',
  'A-': '#ea474f',
  'B+': '#f05d66',
  'B-': '#f48c93',
  'AB+': '#f66a74',
  'AB-': '#f8a5aa',
  'O+': '#d92b33',
  'O-': '#f2c8cb',
};

const statusTone = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Issued: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Urgent: 'bg-rose-100 text-rose-700',
  Good: 'bg-emerald-100 text-emerald-700',
  Low: 'bg-amber-100 text-amber-700',
  Critical: 'bg-rose-100 text-rose-700',
};

const cardMeta = {
  donors: {
    title: 'Donors',
    icon: FiUsers,
    note: 'recent donor records',
    surface: 'from-sky-500 via-blue-500 to-blue-700',
    glow: 'rgba(37, 99, 235, 0.34)',
  },
  patients: {
    title: 'Patients',
    icon: FiUserCheck,
    note: 'patient profiles stored',
    surface: 'from-fuchsia-500 via-rose-500 to-pink-600',
    glow: 'rgba(225, 29, 72, 0.32)',
  },
  inventory: {
    title: 'Blood Inventory',
    icon: FiDroplet,
    note: 'blood groups in stock',
    surface: 'from-red-500 via-rose-500 to-orange-500',
    glow: 'rgba(220, 38, 38, 0.34)',
  },
  requests: {
    title: 'Requests',
    icon: FiClipboard,
    note: 'issued successfully',
    surface: 'from-amber-400 via-orange-500 to-orange-600',
    glow: 'rgba(249, 115, 22, 0.34)',
  },
  history: {
    title: 'History Records',
    icon: FiActivity,
    note: 'donations in last 6 months',
    surface: 'from-emerald-500 via-teal-500 to-green-600',
    glow: 'rgba(16, 185, 129, 0.34)',
  },
};

const formatDate = (value) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

const getCoverage = (available) => {
  if (available <= 1) return 'Critical';
  if (available <= 3) return 'Low';
  return 'Good';
};

const toTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const getDaysUntil = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const midnightTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.ceil((midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24));
};

const buildMonthlySeries = (history, requests) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      donations: 0,
      requests: 0,
    };
  });

  const monthMap = new Map(months.map((item) => [item.key, item]));

  history.forEach((entry) => {
    const parsed = new Date(entry.donationDate);
    if (Number.isNaN(parsed.getTime())) return;
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
    const month = monthMap.get(key);
    if (month) month.donations += 1;
  });

  requests.forEach((entry) => {
    const parsed = new Date(entry.transfusionDate || entry.date || entry.createdAt);
    if (Number.isNaN(parsed.getTime())) return;
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
    const month = monthMap.get(key);
    if (month) month.requests += 1;
  });

  return months;
};

const buildLinePoints = (series, key, maxValue) =>
  series
    .map((item, index) => {
      const x = 46 + index * 78;
      const y = 190 - (item[key] / maxValue) * 138;
      return `${x},${y}`;
    })
    .join(' ');

const buildAreaPath = (series, key, maxValue) => {
  const points = series.map((item, index) => {
    const x = 46 + index * 78;
    const y = 190 - (item[key] / maxValue) * 138;
    return { x, y };
  });

  if (!points.length) return '';

  const first = points[0];
  const last = points[points.length - 1];
  return `M ${first.x} 190 L ${first.x} ${first.y} ${points
    .slice(1)
    .map((point) => `L ${point.x} ${point.y}`)
    .join(' ')} L ${last.x} 190 Z`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { donors, patients, inventory, inventorySummary, requests, history, isDataReady } = useBloodContext();
  const role = user?.role || 'Administrator';

  const inventoryRows = BLOOD_GROUPS.map((bloodType) => {
    const available = Number(inventorySummary.find((item) => item.bloodType === bloodType)?.quantity || 0);
    return {
      bloodType,
      available,
      status: getCoverage(available),
    };
  });

  const totalUnits = inventoryRows.reduce((sum, item) => sum + item.available, 0);
  const totalRequests = requests.length;
  const issuedRequests = requests.filter((request) => request.status === 'Issued').length;
  const pendingRequests = requests.filter((request) => request.status !== 'Issued').length;
  const totalDonors = donors.length;
  const totalPatients = patients.length;
  const totalHistory = history.length;

  const monthlySeries = buildMonthlySeries(history, requests);
  const chartMax = Math.max(...monthlySeries.flatMap((item) => [item.donations, item.requests]), 1);
  const donationPoints = buildLinePoints(monthlySeries, 'donations', chartMax);
  const requestPoints = buildLinePoints(monthlySeries, 'requests', chartMax);
  const donationAreaPath = buildAreaPath(monthlySeries, 'donations', chartMax);
  const requestAreaPath = buildAreaPath(monthlySeries, 'requests', chartMax);

  const donutRows = inventoryRows.filter((row) => row.available > 0);
  const donutTotal = donutRows.reduce((sum, row) => sum + row.available, 0);
  const donutStops = donutRows.map((row, index) => {
    const previousTotal = donutRows.slice(0, index).reduce((sum, item) => sum + item.available, 0);
    const currentTotal = previousTotal + row.available;
    const start = (previousTotal / Math.max(donutTotal, 1)) * 100;
    const end = (currentTotal / Math.max(donutTotal, 1)) * 100;
    return `${bloodColors[row.bloodType]} ${start}% ${end}%`;
  });

  const recentDonors = donors
    .slice()
    .sort((a, b) => toTimestamp(b.createdAt || b.lastDonationDate || b.dateOfBirth) - toTimestamp(a.createdAt || a.lastDonationDate || a.dateOfBirth))
    .slice(0, 5)
    .map((donor) => ({
      id: donor.id,
      name: donor.name,
      bloodType: donor.bloodType,
      contact: donor.contact || '--',
      date: formatDate(
        history
          .filter((entry) => entry.donorId === donor.donorId)
          .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))[0]?.donationDate
          || donor.createdAt
      ),
      status: donor.donations > 0 ? 'Completed' : 'Pending',
      initials: getInitials(donor.name),
    }));

  const recentRequests = requests.slice().sort((a, b) => toTimestamp(b.createdAt || b.transfusionDate || b.date) - toTimestamp(a.createdAt || a.transfusionDate || a.date)).slice(0, 5).map((request) => ({
    id: request.id,
    patientName: request.patientName || 'Unknown patient',
    bloodGroupReq: request.bloodGroupReq || '--',
    units: request.quantity || request.units || request.unitCount || 1,
    date: formatDate(request.transfusionDate || request.date || request.createdAt),
    status: request.status || 'Pending',
  }));

  const recentHistory = history
    .slice()
    .sort((a, b) => toTimestamp(b.createdAt || b.donationDate || b.date) - toTimestamp(a.createdAt || a.donationDate || a.date))
    .slice(0, 5)
    .map((entry) => ({
    id: entry.id,
    type: 'Donation',
    description: entry.notes || `${entry.donorName || 'Donor'} donated ${entry.bloodType || '--'}`,
    date: formatDate(entry.donationDate || entry.date || entry.createdAt),
    by: entry.by || (role === 'Doctor' ? 'Doctor' : 'Staff'),
  }));

  const maxInventoryUnits = Math.max(...inventoryRows.map((row) => row.available), 1);
  const stockBars = inventoryRows.map((row) => ({
    ...row,
    width: `${Math.max((row.available / maxInventoryUnits) * 100, row.available > 0 ? 16 : 10)}%`,
  }));

  const overviewCards = [
    { ...cardMeta.donors, value: totalDonors, noteValue: recentDonors.length },
    { ...cardMeta.patients, value: totalPatients, noteValue: totalPatients },
    { ...cardMeta.inventory, value: totalUnits, noteValue: inventoryRows.filter((row) => row.available > 0).length },
    { ...cardMeta.requests, value: totalRequests, noteValue: pendingRequests > 0 ? pendingRequests : issuedRequests, note: pendingRequests > 0 ? 'requests awaiting follow-up' : 'issued successfully' },
    { ...cardMeta.history, value: totalHistory, noteValue: monthlySeries.reduce((sum, item) => sum + item.donations, 0) },
  ];
  const lowStockGroups = inventoryRows.filter((row) => row.available > 0 && row.available < 3);
  const expiringUnits = inventory
    .filter((item) => item.status === 'Available')
    .map((item) => ({ ...item, daysUntilExpiry: getDaysUntil(item.expiryDate) }))
    .filter((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry <= 7)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 4);

  if (!isDataReady) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-red-100" />
          <p className="text-lg font-bold text-slate-800">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {overviewCards.map((card) => (
          <article
            key={card.title}
            className={`dashboard-metric-card bg-gradient-to-br ${card.surface}`}
            style={{ boxShadow: `0 24px 46px -28px ${card.glow}` }}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/10 to-transparent" />
            <div className="pointer-events-none absolute -bottom-5 -right-3 opacity-15">
              <card.icon className="text-[5rem]" />
            </div>
            <div className="relative flex h-full items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] border border-white/25 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm">
                <card.icon className="text-[2rem] text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white/88">{card.title}</p>
                <p className="mt-2 text-[2.25rem] font-black tracking-tight text-white">{card.value.toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold text-white/88">
                  {card.noteValue} {card.note}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
          <article className="dashboard-panel-card rounded-[28px] border border-rose-100 bg-gradient-to-br from-white via-rose-50/60 to-red-50/80">
            <div className="panel-header">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-rose-700">
                  <FiAlertTriangle className="text-sm" />
                  Critical stock
                </div>
                <h3 className="panel-title mt-3 inline-flex items-center gap-2">
                  <FiDroplet className="text-red-600" />
                  Low stock alerts
                </h3>
                <p className="panel-copy">Blood groups running low and needing replenishment.</p>
              </div>
            </div>
            <div className="space-y-3">
              {lowStockGroups.length > 0 ? lowStockGroups.map((group) => (
                <div
                  key={group.bloodType}
                  className="rounded-[24px] border border-rose-100 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(225,29,72,0.45)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-[0_14px_30px_-18px_rgba(239,68,68,0.85)]">
                        <FiDroplet className="text-lg" />
                      </div>
                      <div>
                        <p className="text-lg font-black tracking-tight text-slate-900">{group.bloodType}</p>
                        <p className="text-sm text-slate-500">Replenishment is needed soon.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
                        <FiAlertTriangle />
                        {group.available} {group.available === 1 ? 'unit left' : 'units left'}
                      </span>
                      <p className="mt-2 text-xs font-semibold text-rose-500">Priority blood stock alert</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <FiCheckCircle className="text-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">No low stock alerts right now.</p>
                      <p className="mt-1 text-sm text-slate-500">All blood groups currently have a safer stock level.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-panel-card rounded-[28px] border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-cyan-50/70">
            <div className="panel-header">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">
                  <FiCalendar className="text-sm" />
                  Expiry watch
                </div>
                <h3 className="panel-title mt-3 inline-flex items-center gap-2">
                  <FiClock className="text-sky-700" />
                  Expiry alerts
                </h3>
                <p className="panel-copy">Available units expiring within 7 days.</p>
              </div>
            </div>
            <div className="space-y-3">
              {expiringUnits.length > 0 ? expiringUnits.map((unit) => (
                <div
                  key={unit.unitId}
                  className="rounded-[24px] border border-sky-100 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(14,165,233,0.45)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-[0_14px_30px_-18px_rgba(14,165,233,0.85)]">
                        <FiCalendar className="text-lg" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{unit.unitId} - {unit.bloodType}</p>
                        <p className="mt-1 text-xs text-slate-500">Expires on {formatDate(unit.expiryDate)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] ${
                      unit.daysUntilExpiry <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <FiClock />
                      {unit.daysUntilExpiry <= 0 ? 'Expires today' : `${unit.daysUntilExpiry} day(s) left`}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <FiShield className="text-lg" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">No expiry alerts right now.</p>
                      <p className="mt-1 text-sm text-slate-500">Available blood units are safely outside the 7-day expiry window.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1.25fr_0.95fr]">
        <article className="dashboard-chart-shell rounded-[28px]">
          <h2 className="text-lg font-extrabold text-slate-900">Blood Inventory Overview</h2>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
            <div
              className="relative mx-auto h-[190px] w-[190px] shrink-0 rounded-full"
              style={{ background: donutStops.length ? `conic-gradient(${donutStops.join(',')})` : '#f1f5f9' }}
            >
              <div className="absolute inset-[26%] rounded-full bg-white shadow-[inset_0_2px_8px_rgba(15,23,42,0.05)]" />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-4xl font-extrabold tracking-tight text-slate-900">{totalUnits}</p>
                  <p className="text-sm text-slate-500">Total Units</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              {inventoryRows.map((row) => (
                <div key={row.bloodType} className="flex items-center justify-between gap-6 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bloodColors[row.bloodType] }} />
                    <span className="font-semibold text-slate-700">{row.bloodType}</span>
                  </div>
                  <span className="font-semibold text-slate-500">{row.available} Units</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-chart-shell rounded-[28px]">
          <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-500">
            <h2 className="mr-auto text-lg font-extrabold text-slate-900">Monthly Donations & Requests</h2>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              Donations
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Requests
            </span>
          </div>

          <svg viewBox="0 0 460 230" className="mt-5 h-[230px] w-full">
            <defs>
              <linearGradient id="donationArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="requestArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map((line) => {
              const y = 24 + line * 34;
              return <line key={line} x1="40" y1={y} x2="438" y2={y} stroke="#eceff3" strokeWidth="1" />;
            })}

            {donationAreaPath ? <path d={donationAreaPath} fill="url(#donationArea)" /> : null}
            {requestAreaPath ? <path d={requestAreaPath} fill="url(#requestArea)" /> : null}

            <polyline fill="none" stroke="#d61f26" strokeWidth="3" points={donationPoints} />
            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={requestPoints} />

            {monthlySeries.map((month, index) => {
              const x = 46 + index * 78;
              const donationY = 190 - (month.donations / chartMax) * 138;
              const requestY = 190 - (month.requests / chartMax) * 138;
              return (
                <g key={month.label}>
                  <circle cx={x} cy={donationY} r="4" fill="#d61f26" />
                  <circle cx={x} cy={requestY} r="4" fill="#8b5cf6" />
                  <text x={x} y="214" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="600">
                    {month.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </article>

        <article className="dashboard-chart-shell rounded-[28px]">
          <h2 className="text-lg font-extrabold text-slate-900">Blood Inventory Status</h2>
          <div className="mt-6 space-y-4">
            {stockBars.map((row) => (
              <div key={row.bloodType} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 text-sm">
                <span className="font-bold text-slate-700">{row.bloodType}</span>
                <div className="h-2 rounded-full bg-slate-100 ring-1 ring-slate-100">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,var(--theme-button-start),var(--theme-button-mid),var(--theme-button-end))]" style={{ width: row.width }} />
                </div>
                <span className="whitespace-nowrap font-semibold text-slate-500">{row.available} Units</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone[row.status]}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <article className="dashboard-panel-card rounded-[28px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Recent Donors</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm sm:min-w-[420px]">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="py-3 font-bold">Name</th>
                  <th className="py-3 font-bold">Blood Group</th>
                  <th className="py-3 font-bold">Contact</th>
                  <th className="py-3 font-bold">Date</th>
                  <th className="py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDonors.length > 0 ? (
                  recentDonors.map((donor) => (
                    <tr key={donor.id} className="border-t border-slate-100 transition hover:bg-[rgba(var(--theme-accent-rgb),0.04)]">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(var(--theme-accent-rgb),0.1)] text-[11px] font-bold text-[color:var(--theme-accent)] ring-4 ring-[rgba(var(--theme-accent-rgb),0.08)]">{donor.initials.slice(0, 1)}</span>
                          <span className="font-semibold text-slate-700">{donor.name}</span>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-600">{donor.bloodType}</td>
                      <td className="py-3 text-slate-500">{donor.contact}</td>
                      <td className="py-3 text-slate-500">{donor.date}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone[donor.status]}`}>{donor.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No donor records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pt-4 text-center">
            <NavLink to="/donorregistration" className="text-sm font-bold text-[color:var(--theme-accent)] transition hover:opacity-80">
              {'View All Donors ->'}
            </NavLink>
          </div>
        </article>

        <article className="dashboard-panel-card rounded-[28px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Recent Requests</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[340px] text-left text-sm sm:min-w-[390px]">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="py-3 font-bold">Patient Name</th>
                  <th className="py-3 font-bold">Blood Group</th>
                  <th className="py-3 font-bold">Units</th>
                  <th className="py-3 font-bold">Date</th>
                  <th className="py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length > 0 ? (
                  recentRequests.map((request) => (
                    <tr key={request.id} className="border-t border-slate-100 transition hover:bg-[rgba(var(--theme-accent-rgb),0.04)]">
                      <td className="py-3 font-semibold text-slate-700">{request.patientName}</td>
                      <td className="py-3 font-semibold text-slate-600">{request.bloodGroupReq}</td>
                      <td className="py-3 text-slate-500">{request.units} Unit{request.units > 1 ? 's' : ''}</td>
                      <td className="py-3 text-slate-500">{request.date}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone[request.status] || 'bg-slate-100 text-slate-700'}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No request records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pt-4 text-center">
            <NavLink to="/bloodrequests" className="text-sm font-bold text-[color:var(--theme-accent)] transition hover:opacity-80">
              {'View All Requests ->'}
            </NavLink>
          </div>
        </article>

        <article className="dashboard-panel-card rounded-[28px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">Recent History</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm sm:min-w-[360px]">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="py-3 font-bold">Type</th>
                  <th className="py-3 font-bold">Description</th>
                  <th className="py-3 font-bold">Date</th>
                  <th className="py-3 font-bold">By</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.length > 0 ? (
                  recentHistory.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100 transition hover:bg-[rgba(var(--theme-accent-rgb),0.04)]">
                      <td className="py-3 font-semibold text-slate-700">{entry.type}</td>
                      <td className="py-3 text-slate-500">{entry.description}</td>
                      <td className="py-3 text-slate-500">{entry.date}</td>
                      <td className="py-3 font-semibold text-slate-600">{entry.by}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">No history records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pt-4 text-center">
            <NavLink to="/donationhistory" className="text-sm font-bold text-[color:var(--theme-accent)] transition hover:opacity-80">
              {'View All History ->'}
            </NavLink>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;

