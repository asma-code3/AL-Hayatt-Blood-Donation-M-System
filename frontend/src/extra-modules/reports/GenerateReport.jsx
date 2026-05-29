import React, { useMemo, useState } from 'react';
import { FaFileExcel, FaFileWord } from 'react-icons/fa6';
import {
  FiBarChart2,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiDroplet,
  FiFileText,
  FiPrinter,
  FiUsers,
} from 'react-icons/fi';
import { useBloodContext } from '../../Context/blood-context';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const getDateValue = (...values) => values.find((value) => value && !Number.isNaN(new Date(value).getTime())) || '';

const formatDate = (value) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const sortByRecentDate = (items, getValue) =>
  items
    .slice()
    .sort((a, b) => toTimestamp(getValue(b)) - toTimestamp(getValue(a)));

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const reportMetricCards = [
  {
    key: 'donors',
    title: 'Total Donors',
    note: 'Registered donor profiles.',
    icon: FiUsers,
    surface: 'from-sky-500 via-cyan-500 to-blue-700',
    hoverSurface: 'hover:from-sky-400 hover:via-cyan-400 hover:to-blue-600',
    chip: 'Donor base',
    glow: 'rgba(14, 165, 233, 0.28)',
  },
  {
    key: 'requests',
    title: 'Total Requests',
    note: 'All transfusion requests in the system.',
    icon: FiClipboard,
    surface: 'from-amber-400 via-orange-500 to-red-500',
    hoverSurface: 'hover:from-amber-300 hover:via-orange-400 hover:to-red-400',
    chip: 'Demand flow',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
  {
    key: 'units',
    title: 'Available Units',
    note: 'Blood units ready for use.',
    icon: FiDroplet,
    surface: 'from-rose-500 via-red-500 to-rose-700',
    hoverSurface: 'hover:from-rose-400 hover:via-red-400 hover:to-rose-600',
    chip: 'Stock ready',
    glow: 'rgba(225, 29, 72, 0.3)',
  },
  {
    key: 'issued',
    title: 'Issued Requests',
    note: 'Requests already fulfilled.',
    icon: FiCheckCircle,
    surface: 'from-emerald-500 via-teal-500 to-green-600',
    hoverSurface: 'hover:from-emerald-400 hover:via-teal-400 hover:to-green-500',
    chip: 'Completed',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
];

const GenerateReport = () => {
  const { donors, patients, inventory, requests, history, isDataReady } = useBloodContext();
  const [exportMessage, setExportMessage] = useState('');
  const filteredDonors = donors;
  const filteredRequests = requests;
  const filteredHistory = history;
  const filteredInventory = inventory;

  const totalDonors = filteredDonors.length;
  const totalPatients = patients.length;
  const totalUnits = filteredInventory.filter((item) => item.status === 'Available').length;
  const totalRequests = filteredRequests.length;
  const issuedRequests = filteredRequests.filter((item) => item.status === 'Issued').length;
  const pendingRequests = filteredRequests.filter((item) => item.status !== 'Issued').length;
  const totalHistory = filteredHistory.length;
  const metricValues = {
    donors: totalDonors,
    requests: totalRequests,
    units: totalUnits,
    issued: issuedRequests,
  };

  const reportDate = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  const bloodGroupSummary = useMemo(
    () =>
      BLOOD_GROUPS.map((group) => ({
        bloodType: group,
        available: filteredInventory.filter((item) => item.bloodType === group && item.status === 'Available').length,
      })),
    [filteredInventory]
  );

  const recentActivity = useMemo(() => {
    const donorRows = sortByRecentDate(filteredDonors, (item) => getDateValue(item.createdAt, item.lastDonationDate, item.dateOfBirth))
      .slice(0, 4)
      .map((item) => ({
      id: `donor-${item.id}`,
      label: item.name || item.donorId || 'Unnamed donor',
      detail: `Donor registered - ${item.bloodType || 'Unknown blood group'}`,
      activityDate: getDateValue(item.createdAt, item.lastDonationDate, item.dateOfBirth),
    }));

    const requestRows = sortByRecentDate(filteredRequests, (item) => getDateValue(item.createdAt, item.transfusionDate, item.date))
      .slice(0, 4)
      .map((item) => ({
      id: `request-${item.id}`,
      label: item.patientName || item.transfusionId || 'Unnamed request',
      detail: `${item.transfusionId || 'Request'} - ${item.bloodGroupReq || 'Unknown blood group'} - ${item.quantity || 1} unit(s)`,
      activityDate: getDateValue(item.transfusionDate, item.date, item.createdAt),
    }));

    const historyRows = sortByRecentDate(filteredHistory, (item) => getDateValue(item.createdAt, item.donationDate))
      .slice(0, 4)
      .map((item) => ({
      id: `history-${item.id}`,
      label: item.donorName || item.historyId || 'Donation entry',
      detail: `${item.historyId || 'History'} - ${item.bloodType || 'Unknown blood group'} donation recorded`,
      activityDate: getDateValue(item.donationDate, item.createdAt),
    }));

    return [...donorRows, ...requestRows, ...historyRows]
      .filter((item) => item.label)
      .sort((a, b) => toTimestamp(b.activityDate) - toTimestamp(a.activityDate))
      .slice(0, 8)
      .map((item) => ({
        ...item,
        date: formatDate(item.activityDate),
      }));
  }, [filteredDonors, filteredRequests, filteredHistory]);

  const handleExportWord = () => {
    const summaryRows = [
      ['Total Donors', totalDonors],
      ['Total Patients', totalPatients],
      ['Available Units', totalUnits],
      ['Total Requests', totalRequests],
      ['Issued Requests', issuedRequests],
      ['Pending Requests', pendingRequests],
      ['History Records', totalHistory],
    ];

    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head>
          <meta charset="utf-8" />
          <title>Blood Bank Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1e293b; padding: 24px; }
            h1, h2 { color: #b91c1c; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background: #fef2f2; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Blood Bank Report</h1>
          <p>Generated on ${reportDate}</p>

          <h2>Summary</h2>
          <table>
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              ${summaryRows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2>Blood Group Availability</h2>
          <table>
            <thead>
              <tr><th>Blood Group</th><th>Available Units</th></tr>
            </thead>
            <tbody>
              ${bloodGroupSummary.map((item) => `<tr><td>${item.bloodType}</td><td>${item.available}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2>Recent Activity</h2>
          <ul>
            ${recentActivity.length > 0
              ? recentActivity.map((item) => `<li><strong>${item.label}</strong> - ${item.detail} (${item.date})</li>`).join('')
              : '<li>No activity available yet.</li>'}
          </ul>
        </body>
      </html>
    `;

    downloadFile(`blood-bank-report-${reportDate.replaceAll(' ', '-').toLowerCase()}.doc`, wordContent, 'application/msword');
    setExportMessage('Word report downloaded successfully.');
  };

  const handleExportExcel = () => {
    const excelContent = `
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Donors</td><td>${totalDonors}</td></tr>
        <tr><td>Total Patients</td><td>${totalPatients}</td></tr>
        <tr><td>Available Units</td><td>${totalUnits}</td></tr>
        <tr><td>Total Requests</td><td>${totalRequests}</td></tr>
        <tr><td>Issued Requests</td><td>${issuedRequests}</td></tr>
        <tr><td>Pending Requests</td><td>${pendingRequests}</td></tr>
        <tr><td>History Records</td><td>${totalHistory}</td></tr>
      </table>
    `;
    downloadFile(`blood-bank-report-${reportDate.replaceAll(' ', '-').toLowerCase()}.xls`, excelContent, 'application/vnd.ms-excel');
    setExportMessage('Excel report downloaded successfully.');
  };

  const handlePrint = () => {
    window.print();
    setExportMessage('Print dialog opened.');
  };

  return (
    <div className="page-stack">
      <section className="rounded-[30px] border border-red-100 bg-gradient-to-br from-white via-[#fff8f8] to-[#fff1f1] px-5 py-6 shadow-[0_24px_55px_-38px_rgba(225,6,6,0.22)] transition duration-300 hover:border-red-200 hover:shadow-[0_28px_70px_-42px_rgba(225,6,6,0.3)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[2rem] font-extrabold tracking-tight text-slate-900">Reports</h2>
            <p className="mt-2 text-sm text-slate-500">Generate operational summaries, export data, and review current blood bank performance.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50 px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:from-blue-50 hover:to-blue-100 hover:text-blue-700"
            >
              <FaFileWord className="text-blue-600" />
              Export Word
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50 px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:from-emerald-50 hover:to-emerald-100 hover:text-emerald-700"
            >
              <FaFileExcel className="text-emerald-600" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d90e16] via-[#e10606] to-[#c80710] px-4 py-3 text-sm font-bold text-white shadow-[0_22px_38px_-22px_rgba(225,6,6,0.8)] transition duration-300 hover:-translate-y-0.5 hover:from-[#c90c14] hover:via-[#d70606] hover:to-[#b8060e] hover:shadow-[0_28px_46px_-24px_rgba(225,6,6,0.88)]"
            >
              <FiPrinter />
              Print
            </button>
          </div>
        </div>
        {exportMessage ? <p className="mt-4 text-sm font-medium text-emerald-600">{exportMessage}</p> : null}
      </section>

      {!isDataReady ? (
        <section className="section-card">
          <div className="empty-state">
            <p className="empty-state-title">Loading report data...</p>
            <p className="empty-state-copy">The latest donors, inventory, requests, and history records are being prepared.</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportMetricCards.map((card) => (
          <article
            key={card.key}
            className={`group relative overflow-hidden rounded-[26px] bg-gradient-to-br ${card.surface} ${card.hoverSurface} p-4 text-white shadow-[0_24px_44px_-30px_var(--card-glow)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_56px_-30px_var(--card-glow)]`}
            style={{ '--card-glow': card.glow }}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-white/12 to-transparent transition duration-300 group-hover:from-white/20" />
            <div className="pointer-events-none absolute -right-3 -top-3 opacity-15 transition duration-300 group-hover:scale-110 group-hover:opacity-20">
              <card.icon className="text-[4.9rem]" />
            </div>
            <div className="relative flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex rounded-full border border-white/20 bg-white/14 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm transition duration-300 group-hover:bg-white/20">
                  {card.chip}
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/20 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm transition duration-300 group-hover:scale-105 group-hover:bg-white/22">
                  <card.icon className="text-[1.2rem] text-white" />
                </div>
              </div>

              <div>
                <p className="text-[13px] font-bold text-white/90">{card.title}</p>
                <p className="mt-1.5 text-[2.15rem] font-black tracking-tight text-white">
                  {metricValues[card.key].toLocaleString()}
                </p>
                <p className="mt-1.5 max-w-[16rem] text-[13px] leading-5 text-white/82">{card.note}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="section-card report-ring-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiBarChart2 className="text-red-600" />
                Blood Group Availability
              </h3>
              <p className="panel-copy">Current stock distribution by blood group.</p>
            </div>
            <span className="soft-chip">{reportDate}</span>
          </div>
          <div className="space-y-4">
            {bloodGroupSummary.map((item) => {
              const maxUnits = Math.max(...bloodGroupSummary.map((row) => row.available), 1);
              const width = `${Math.max((item.available / maxUnits) * 100, item.available > 0 ? 10 : 4)}%`;
              return (
                <div key={item.bloodType} className="report-ring-item grid grid-cols-[40px_1fr_auto] items-center gap-4 px-4 py-3">
                  <span className="font-black text-slate-800">{item.bloodType}</span>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-700" style={{ width }} />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{item.available} units</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="section-card report-ring-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiClock className="text-red-600" />
                Report Snapshot
              </h3>
              <p className="panel-copy">Quick operational state of the system.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="record-card record-card-muted report-ring-item">
              <p className="text-sm font-semibold text-slate-900">Registered patients</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalPatients}</p>
            </div>
            <div className="record-card record-card-muted report-ring-item">
              <p className="text-sm font-semibold text-slate-900">Pending requests</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600">{pendingRequests}</p>
            </div>
            <div className="record-card record-card-muted report-ring-item">
              <p className="text-sm font-semibold text-slate-900">History records</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalHistory}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="section-card report-ring-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title inline-flex items-center gap-2">
              <FiFileText className="text-red-600" />
              Recent Activity Summary
            </h3>
            <p className="panel-copy">Latest donor, request, and history movement across the system.</p>
          </div>
          <span className="report-ring-chip">Live activity</span>
        </div>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((item) => (
              <div key={item.id} className="record-card report-ring-item">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                  <span className="soft-chip">{item.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No activity available yet.</p>
              <p className="empty-state-copy">As records are created, this report section will populate automatically.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default GenerateReport;
