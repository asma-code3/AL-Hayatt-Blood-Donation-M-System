import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiChevronDown,
  FiClipboard,
  FiClock,
  FiDroplet,
  FiFile,
  FiFileText,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiSearch,
  FiSettings,
  FiUsers,
  FiUserCheck,
  FiX,
} from 'react-icons/fi';
import { BrandMark } from '../ui';
import Footer from './Footer';
import { useAuth } from '../../Context/auth-context';
import { useBloodContext } from '../../Context/blood-context';

const accessMap = {
  Administrator: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests', 'reports', 'users', 'settings'],
  Staff: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests', 'reports'],
  Doctor: ['dashboard', 'patients', 'history', 'requests', 'reports'],
};

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: FiHome, featureKey: 'dashboard' },
  { label: 'Donors', to: '/donorregistration', icon: FiUsers, featureKey: 'donors' },
  { label: 'Patients', to: '/patientregistration', icon: FiUserCheck, featureKey: 'patients' },
  { label: 'Inventory', to: '/bloodinventory', icon: FiPackage, featureKey: 'inventory' },
  { label: 'History', to: '/donationhistory', icon: FiClock, featureKey: 'history' },
  { label: 'Requests', to: '/bloodrequests', icon: FiClipboard, featureKey: 'requests' },
  { label: 'Reports', to: '/reports', icon: FiFileText, featureKey: 'reports' },
  { label: 'Users', to: '/manageusers', icon: FiUsers, featureKey: 'users' },
  { label: 'Settings', to: '/datastorageupdates', icon: FiSettings, featureKey: 'settings' },
];

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/donorregistration': 'Donors',
  '/patientregistration': 'Patients',
  '/bloodinventory': 'Inventory',
  '/donationhistory': 'History',
  '/bloodrequests': 'Requests',
  '/reports': 'Reports',
  '/auditlog': 'Audit Log',
  '/manageusers': 'Users',
  '/datastorageupdates': 'Settings',
};

const getInitial = (value = '') => {
  const trimmed = String(value).trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'A';
};

const getNotificationTone = (type) => {
  if (type === 'danger') return 'bg-rose-50 text-rose-600';
  if (type === 'warning') return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
};

const toTimestamp = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const getRecentDate = (item, keys) => {
  for (const key of keys) {
    if (item?.[key] && toTimestamp(item[key]) > 0) {
      return item[key];
    }
  }

  return '';
};

const sortByRecentDate = (items, keys) =>
  items
    .slice()
    .sort((a, b) => toTimestamp(getRecentDate(b, keys)) - toTimestamp(getRecentDate(a, keys)));

const getDaysUntil = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const midnightTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.ceil((midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24));
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { donors, patients, requests, inventorySummary, history, inventory } = useBloodContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const role = user?.role || 'Administrator';
  const allowedFeatures = accessMap[role] || accessMap.Administrator;
  const userInitial = getInitial(user?.username || 'Admin');
  const visibleNavItems = navItems.filter((item) => allowedFeatures.includes(item.featureKey));
  const pageTitle = pageTitles[location.pathname] || 'Blood Bank';

  const notifications = useMemo(() => {
    const lowStockGroups = inventorySummary.filter((item) => item.quantity > 0 && item.quantity < 3);
    const expiringUnits = inventory
      .filter((item) => item.status === 'Available')
      .map((item) => ({ ...item, daysUntilExpiry: getDaysUntil(item.expiryDate) }))
      .filter((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry <= 7)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 3);
    const pendingRequests = requests.filter((item) => item.status !== 'Issued');
    const newDonors = sortByRecentDate(donors, ['createdAt', 'lastDonationDate', 'dateOfBirth']).slice(0, 3);
    const latestHistory = sortByRecentDate(history, ['createdAt', 'donationDate', 'date'])[0];
    const items = [];

    if (lowStockGroups.length > 0 && allowedFeatures.includes('inventory')) {
      items.push({
        id: 'low-stock',
        title: 'Low stock alert',
        message: `${lowStockGroups.map((item) => item.bloodType).join(', ')} needs replenishment soon.`,
        to: '/bloodinventory',
        icon: FiDroplet,
        type: 'danger',
      });
    }

    if (pendingRequests.length > 0 && allowedFeatures.includes('requests')) {
      items.push({
        id: 'pending-requests',
        title: 'Pending requests',
        message: `${pendingRequests.length} blood request${pendingRequests.length > 1 ? 's are' : ' is'} still awaiting follow-up.`,
        to: '/bloodrequests',
        icon: FiClipboard,
        type: 'warning',
      });
    }

    if (expiringUnits.length > 0 && allowedFeatures.includes('inventory')) {
      items.push({
        id: 'expiring-units',
        title: 'Expiry alert',
        message: `${expiringUnits[0].unitId} and ${Math.max(expiringUnits.length - 1, 0)} more unit(s) expire within 7 days.`,
        to: '/bloodinventory',
        icon: FiClock,
        type: 'warning',
      });
    }

    if (newDonors.length > 0 && allowedFeatures.includes('donors')) {
      items.push({
        id: 'new-donors',
        title: 'Recent donor activity',
        message: `${newDonors[0].name} and ${Math.max(newDonors.length - 1, 0)} more donor record${newDonors.length > 1 ? 's' : ''} added recently.`,
        to: '/donorregistration',
        icon: FiUsers,
        type: 'success',
      });
    }

    if (patients.length > 0 && allowedFeatures.includes('patients')) {
      items.push({
        id: 'patients',
        title: 'Patient records available',
        message: `${patients.length} patient profile${patients.length > 1 ? 's are' : ' is'} stored for follow-up care.`,
        to: '/patientregistration',
        icon: FiUserCheck,
        type: 'success',
      });
    }

    if (latestHistory && allowedFeatures.includes('history')) {
      items.push({
        id: 'history',
        title: 'Latest history entry',
        message: `${latestHistory.donorName || 'A donor'} was logged in donation history.`,
        to: '/donationhistory',
        icon: FiFile,
        type: 'success',
      });
    }

    return items.slice(0, 5);
  }, [donors, patients, requests, inventorySummary, history, inventory, allowedFeatures]);

  const searchIndex = useMemo(() => {
    const pages = visibleNavItems.map((item) => ({
      id: `page-${item.featureKey}`,
      label: item.label,
      meta: 'Page',
      keywords: `${item.label} ${item.featureKey}`,
      to: item.to,
      icon: item.icon,
    }));

    const donorItems = allowedFeatures.includes('donors') ? sortByRecentDate(donors, ['createdAt', 'lastDonationDate', 'dateOfBirth']).slice(0, 5).map((donor) => ({
      id: `donor-${donor.id}`,
      label: donor.name,
      meta: `Donor | ${donor.bloodType}`,
      keywords: `${donor.name} ${donor.donorId} ${donor.bloodType} donor`,
      to: '/donorregistration',
      icon: FiUsers,
    })) : [];

    const patientItems = allowedFeatures.includes('patients') ? sortByRecentDate(patients, ['createdAt']).slice(0, 5).map((patient) => ({
      id: `patient-${patient.id}`,
      label: patient.name,
      meta: `Patient | ${patient.bloodType}`,
      keywords: `${patient.name} ${patient.bloodType} patient`,
      to: '/patientregistration',
      icon: FiUserCheck,
    })) : [];

    const requestItems = allowedFeatures.includes('requests') ? sortByRecentDate(requests, ['createdAt', 'transfusionDate', 'date']).slice(0, 5).map((request) => ({
      id: `request-${request.id}`,
      label: request.patientName || request.transfusionId,
      meta: `Request | ${request.bloodGroupReq}`,
      keywords: `${request.patientName || ''} ${request.transfusionId} ${request.bloodGroupReq} request ${request.doctorName || ''}`,
      to: '/bloodrequests',
      icon: FiClipboard,
    })) : [];

    return [...pages, ...donorItems, ...patientItems, ...requestItems];
  }, [visibleNavItems, donors, patients, requests, allowedFeatures]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return searchIndex
      .filter((item) => `${item.label} ${item.meta} ${item.keywords}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchIndex, searchQuery]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchResults.length > 0) {
      navigate(searchResults[0].to);
      setSearchQuery('');
    }
  };

  const handleSearchResultClick = (to) => {
    navigate(to);
    setSearchQuery('');
  };

  const handleNotificationClick = (to) => {
    navigate(to);
    setIsNotificationOpen(false);
  };

  return (
    <div className="app-shell h-screen overflow-hidden bg-[#fbfbfd] text-slate-800">
      <div className="relative z-10 grid h-full grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden h-screen overflow-y-auto border-b border-[rgba(var(--theme-accent-rgb),0.12)] bg-gradient-to-b from-[rgba(var(--theme-accent-rgb),0.12)] via-white to-[rgba(var(--theme-accent-rgb),0.06)] xl:block xl:border-b-0 xl:border-r">
          <div className="border-b border-[rgba(var(--theme-accent-rgb),0.12)] bg-white/70 px-6 py-7 backdrop-blur-sm">
            <BrandMark
              size="sm"
              title="Al-Hayatt Hospital"
              showSubtitle={false}
              textClassName="[&>h1]:text-[1.4rem] [&>h1]:font-extrabold [&>h1]:text-slate-900 [&>p]:text-sm [&>p]:text-slate-500"
            />
          </div>

          <nav className="flex gap-3 overflow-x-auto px-4 py-5 xl:block xl:space-y-2 xl:overflow-visible xl:px-5">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] font-medium transition ${
                    isActive
                      ? 'border-transparent bg-[linear-gradient(135deg,var(--theme-button-start),var(--theme-button-mid),var(--theme-button-end))] text-white shadow-[0_20px_28px_-22px_rgba(var(--theme-accent-rgb),0.8)]'
                      : 'border-[rgba(var(--theme-accent-rgb),0.08)] bg-white/78 text-slate-700 hover:border-[rgba(var(--theme-accent-rgb),0.18)] hover:bg-[rgba(var(--theme-accent-rgb),0.06)] hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="text-[1rem]" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden px-5 pb-6 pt-8 xl:block">
            <div className="rounded-[28px] border border-[rgba(var(--theme-accent-rgb),0.14)] bg-[linear-gradient(180deg,rgba(var(--theme-accent-rgb),0.16),rgba(255,255,255,0.96)_34%,rgba(var(--theme-accent-rgb),0.08))] p-5 text-center shadow-[0_24px_44px_-34px_rgba(var(--theme-accent-rgb),0.34)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[rgba(var(--theme-accent-rgb),0.12)] text-[color:var(--theme-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <FiDroplet className="text-4xl" />
              </div>
              <p className="mt-5 text-[1.05rem] font-extrabold text-slate-900">Every drop counts</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Save a life today</p>
              <button
                type="button"
                onClick={() => navigate(allowedFeatures.includes('donors') ? '/donorregistration' : '/dashboard')}
                className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,var(--theme-button-start),var(--theme-button-mid),var(--theme-button-end))] px-4 py-3 text-sm font-bold text-white shadow-[0_18px_30px_-22px_rgba(var(--theme-accent-rgb),0.8)]"
              >
                Donate Now
              </button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 h-screen flex-col overflow-hidden">
          <header className="shrink-0 border-b border-[#c90f18] bg-gradient-to-r from-[#d60f17] via-[#df161c] to-[#c70c14] px-4 py-4 shadow-[0_20px_36px_-24px_rgba(214,15,23,0.7)] sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="relative z-20 grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/12 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:bg-white/20 xl:hidden"
                >
                  <FiMenu className="text-xl" />
                </button>
                <button
                  type="button"
                  className="relative z-20 hidden h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/12 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:bg-white/20 xl:grid"
                >
                  <FiMenu className="text-xl" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-red-100/80">Workspace</p>
                  <h1 className="text-xl font-extrabold tracking-tight text-white">{pageTitle}</h1>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="relative w-full min-w-0 sm:w-[260px] lg:w-[360px]">
                  <form onSubmit={handleSearchSubmit}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search pages, donors, patients..."
                      className="h-12 w-full rounded-2xl border border-white/20 bg-white pl-4 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-white focus:shadow-[0_0_0_4px_rgba(255,255,255,0.18)]"
                    />
                    <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                      <FiSearch />
                    </button>
                  </form>

                  {searchQuery.trim() && (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[22px] border border-[#f0d6d8] bg-white shadow-[0_24px_54px_-30px_rgba(15,23,42,0.42)]">
                      {searchResults.length > 0 ? (
                        <div className="p-2">
                          {searchResults.map((result) => (
                            <button
                              key={result.id}
                              type="button"
                              onClick={() => handleSearchResultClick(result.to)}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#fff6f6]"
                            >
                              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-50 text-red-600">
                                <result.icon className="text-base" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">{result.label}</p>
                                <p className="truncate text-xs text-slate-500">{result.meta}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-sm text-slate-500">No matching results found.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                    className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/10 text-white transition hover:bg-white/16"
                  >
                  <FiBell className="text-lg" />
                  <span className="absolute right-2 top-2 grid h-4 min-w-[1rem] place-items-center rounded-full bg-[#e12626] px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                  </button>

                  {isNotificationOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] overflow-hidden rounded-[24px] border border-[#f0d6d8] bg-white shadow-[0_24px_54px_-30px_rgba(15,23,42,0.42)]">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">Notifications</p>
                        <p className="text-xs text-slate-500">Live updates from your blood bank workspace.</p>
                      </div>
                      {notifications.length > 0 ? (
                        <div className="max-h-[360px] overflow-y-auto p-2">
                          {notifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNotificationClick(item.to)}
                              className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#fff7f7]"
                            >
                              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${getNotificationTone(item.type)}`}>
                                <item.icon className="text-base" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-5 text-sm text-slate-500">No new notifications right now.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-2 py-1.5">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#d90e16] via-[#e10606] to-[#c80710] text-sm font-extrabold text-white shadow-[0_16px_28px_-18px_rgba(225,6,6,0.7)]">
                  {userInitial}
                </div>
                  <FiChevronDown className="text-white/85" />
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,var(--theme-button-start),var(--theme-button-mid),var(--theme-button-end))] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(var(--theme-accent-rgb),0.75)] transition hover:-translate-y-0.5 hover:brightness-105 sm:w-auto"
                >
                  <FiLogOut />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>

          <Footer />
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative h-full w-[88vw] max-w-[340px] overflow-y-auto border-r border-[#ececf3] bg-gradient-to-b from-[#fff7f7] via-[#fffdfd] to-[#fdf2f2] shadow-[0_24px_64px_-32px_rgba(15,23,42,0.42)]">
            <div className="flex items-center justify-between border-b border-[#ececf3] px-5 py-5">
              <BrandMark
                size="sm"
                title="Al-Hayatt Hospital"
                showSubtitle={false}
                textClassName="[&>h1]:text-base [&>h1]:font-extrabold [&>h1]:text-slate-900 [&>p]:text-xs [&>p]:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-50"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="mb-5 flex items-center justify-center rounded-2xl bg-slate-50 px-3 py-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#d90e16] via-[#e10606] to-[#c80710] text-base font-extrabold text-white shadow-[0_18px_30px_-18px_rgba(225,6,6,0.7)]">
                  {userInitial}
                </div>
              </div>

              <nav className="space-y-2">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition ${
                        isActive
                          ? 'bg-[#e12626] text-white shadow-[0_20px_28px_-22px_rgba(225,38,38,0.8)]'
                          : 'text-slate-600 hover:bg-[#f8f8fb] hover:text-slate-900'
                      }`
                    }
                  >
                    <item.icon className="text-[1rem]" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mt-6 rounded-[24px] bg-gradient-to-b from-[#fff4f4] to-[#fff7f7] p-5 text-center shadow-[0_20px_44px_-36px_rgba(225,38,38,0.35)]">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff1f2] text-[#e12626]">
                  <FiDroplet className="text-3xl" />
                </div>
                <p className="mt-4 text-base font-extrabold text-slate-800">Every drop counts</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Save a life today</p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--theme-button-start),var(--theme-button-mid),var(--theme-button-end))] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-20px_rgba(var(--theme-accent-rgb),0.75)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <FiLogOut />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
