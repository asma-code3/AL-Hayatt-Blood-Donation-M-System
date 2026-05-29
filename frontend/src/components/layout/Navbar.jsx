import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiClipboard,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiSearch,
  FiSettings,
  FiShield,
  FiUserCheck,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../../Context/auth-context';
import { BrandMark } from '../ui';

const navItems = [
  { label: 'Dashboard', shortLabel: 'Dashboard', to: '/dashboard', icon: FiHome, featureKey: 'dashboard' },
  { label: 'Donor Registration', shortLabel: 'Donors', to: '/donorregistration', icon: FiUserPlus, featureKey: 'donors' },
  { label: 'Patient Registration', shortLabel: 'Patients', to: '/patientregistration', icon: FiUserCheck, featureKey: 'patients' },
  { label: 'Blood Inventory', shortLabel: 'Inventory', to: '/bloodinventory', icon: FiPackage, featureKey: 'inventory' },
  { label: 'Donation History', shortLabel: 'History', to: '/donationhistory', icon: FiActivity, featureKey: 'history' },
  { label: 'Transfusion Request', shortLabel: 'Requests', to: '/bloodrequests', icon: FiClipboard, featureKey: 'requests' },
  { label: 'Manage Users', shortLabel: 'Users', to: '/manageusers', icon: FiSettings, featureKey: 'manage-users' },
  { label: 'Audit Log', shortLabel: 'Audit', to: '/auditlog', icon: FiSearch, featureKey: 'audit-log' },
];

const accessMap = {
  Administrator: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests', 'manage-users', 'audit-log'],
  Staff: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests'],
  Doctor: ['dashboard', 'patients', 'history', 'requests'],
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const rawName = (user?.username || '').trim();
  const initials = rawName
    ? (() => {
        const parts = rawName.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
        return rawName.slice(0, 2).toUpperCase();
      })()
    : 'AH';

  const allowedFeatures = user?.role ? accessMap[user.role] || [] : accessMap.Administrator;
  const visibleNavItems = navItems.filter((item) => allowedFeatures.includes(item.featureKey));

  return (
    <header className="sticky top-0 z-30 w-full">
      <div className="w-full bg-red-700 p-[1px] shadow-[0_26px_60px_-36px_rgba(127,29,29,0.9)]">
        <div className="nav-glass px-4 py-3 text-white sm:px-5">
          <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,260px)_1fr_auto]">
            <div className="flex items-center justify-between gap-3 lg:justify-start">
              <div className="flex items-center gap-3">
                <BrandMark
                  size="sm"
                  title="Al-Hayatt Hospital"
                  subtitle="Blood operations center"
                  textClassName="text-white [&>h1]:text-sm [&>h1]:font-extrabold [&>h1]:text-white sm:[&>h1]:text-base [&>p]:text-[11px] [&>p]:text-white/70"
                />
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d90e16] via-[#e10606] to-[#c80710] text-sm font-bold text-white shadow-[0_14px_24px_-16px_rgba(225,6,6,0.7)]">
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMobileMenuOpen}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                >
                  {isMobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
                </button>
              </div>
            </div>

            <nav className="hidden lg:block">
              <div className="flex min-w-0 items-center justify-center gap-2">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-pill group shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#e12626] text-white shadow-[0_20px_28px_-22px_rgba(225,38,38,0.8)]'
                          : 'bg-white/0 text-white/88 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="text-[0.95rem] transition-transform duration-300 group-hover:scale-110" />
                    <span>{item.shortLabel}</span>
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="hidden items-center gap-3 rounded-[22px] bg-white/10 px-3 py-2.5 lg:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d90e16] via-[#e10606] to-[#c80710] text-xs font-bold text-white shadow-[0_14px_24px_-16px_rgba(225,6,6,0.7)]">
                {initials.slice(0, 1)}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/90">
                <FiShield className="text-base" />
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition duration-300 hover:bg-white/20"
                aria-label="Logout"
              >
                <FiLogOut className="text-base" />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="mt-3 rounded-2xl border border-white/15 bg-red-900/80 p-3 shadow-lg backdrop-blur lg:hidden">
              <div className="mb-3 flex items-center justify-center rounded-xl bg-white/10 px-3 py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#d90e16] via-[#e10606] to-[#c80710] text-sm font-bold text-white shadow-[0_14px_24px_-16px_rgba(225,6,6,0.7)]">
                  {initials}
                </div>
              </div>
              <nav className="grid gap-2">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group inline-flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition duration-300 ${
                        isActive
                          ? 'bg-[#e12626] text-white shadow-[0_20px_28px_-22px_rgba(225,38,38,0.8)]'
                          : 'bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/20'
                      }`
                    }
                  >
                    <item.icon className="text-base" />
                    {item.label}
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="inline-flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <FiLogOut className="text-base" />
                  Logout
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
