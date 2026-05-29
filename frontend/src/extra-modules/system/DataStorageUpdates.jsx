import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiDatabase, FiRefreshCw, FiSettings, FiShield } from 'react-icons/fi';
import { ToastMessage } from '../../components/ui';
import { useAuth } from '../../Context/auth-context';
import { useTheme } from '../../Context/theme-context';
import { apiRequest } from '../../utils/api';

const storageControls = [
  {
    title: 'Centralized database',
    detail: 'Donor, patient, inventory, donation, and request records stay organized in one secure operational source.',
    icon: FiDatabase,
    accent: 'from-slate-900 to-slate-700',
  },
  {
    title: 'Protected data access',
    detail: 'Only authenticated users can view or update blood donation information across the system.',
    icon: FiShield,
    accent: 'from-rose-500 to-red-600',
  },
  {
    title: 'Regular data updates',
    detail: 'Live workflows keep records refreshed so inventory views and reports reflect the latest activity.',
    icon: FiRefreshCw,
    accent: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Error prevention',
    detail: 'Structured digital forms reduce manual mistakes and support better data quality for hospital operations.',
    icon: FiCheckCircle,
    accent: 'from-emerald-400 to-green-600',
  },
];

const adminActions = [
  'Manage user accounts and role permissions.',
  'Control which parts of the system can be changed.',
  'Review audit and operational activity logs.',
  'Maintain secure data workflows and policy decisions.',
];

const DataStorageUpdates = () => {
  const { user } = useAuth();
  const { theme, setTheme, themeOptions } = useTheme();
  const isAdmin = user?.role === 'Administrator';
  const [duplicates, setDuplicates] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadDuplicates = async () => {
      if (!isAdmin) return;
      try {
        const response = await apiRequest('/donors/duplicates');
        setDuplicates(response.data || []);
      } catch (error) {
        setFeedback({ type: 'error', text: error.message || 'Unable to load duplicate donor records.' });
      }
    };

    loadDuplicates();
  }, [isAdmin]);

  const handleDuplicateCleanup = async (group) => {
    const duplicateIds = group.donors.filter((item) => item.canDeleteDuplicate).map((item) => item.id);
    if (duplicateIds.length === 0) {
      setFeedback({ type: 'error', text: 'No safe duplicate records were found in this group.' });
      return;
    }

    try {
      const response = await apiRequest(`/donors/duplicates/${group.primaryId}/cleanup`, {
        method: 'POST',
        body: JSON.stringify({ duplicateIds }),
      });
      setFeedback({ type: 'success', text: response.message || 'Duplicate donor cleanup completed.' });
      setDuplicates((prev) => prev.filter((item) => item.key !== group.key));
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to clean duplicate records.' });
    }
  };

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <section className="section-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title inline-flex items-center gap-2">
              <FiSettings className="text-red-600" />
              System Settings
            </h2>
            <p className="panel-copy">
              {isAdmin
                ? 'Administrator access is active. You can manage system-level changes from this workspace.'
                : 'This area is reserved for administrator-level system control.'}
            </p>
          </div>
          <span className={`soft-chip ${isAdmin ? 'soft-chip-success' : 'soft-chip-warning'}`}>
            {isAdmin ? 'Administrator control' : 'Restricted access'}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {storageControls.map((item) => (
          <article
            key={item.title}
            className="interactive-card rounded-[28px] border border-slate-200 bg-gradient-to-b from-white via-white to-[#fff7f7] p-5 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.2)]"
          >
            <div className="flex h-full flex-col gap-4">
              <div
                className={`panel-icon-badge h-14 w-14 ${
                  item.accent === 'from-slate-900 to-slate-700'
                    ? 'panel-icon-dark'
                    : item.accent === 'from-rose-500 to-red-600'
                      ? 'panel-icon-danger'
                      : item.accent === 'from-amber-400 to-orange-500'
                        ? 'panel-icon-warning'
                        : 'panel-icon-success'
                }`}
              >
                <item.icon />
              </div>
              <div>
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  System control
                </div>
                <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {isAdmin ? (
        <section className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiDatabase className="text-red-600" />
                Duplicate cleanup
              </h3>
              <p className="panel-copy">Review donor groups that look duplicated and remove safe extra records.</p>
            </div>
            <span className="soft-chip">{duplicates.length} duplicate group(s)</span>
          </div>

          <div className="space-y-4">
            {duplicates.length > 0 ? duplicates.map((group) => (
              <div key={group.key} className="record-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    {group.donors.map((donor) => (
                      <div key={donor.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">{donor.donorId} - {donor.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {donor.contact || 'No contact'} | {donor.email || 'No email'} | {donor.dateOfBirth || 'No DOB'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Inventory links: {donor.linkedInventoryCount} | History links: {donor.linkedHistoryCount}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="min-w-[190px]">
                    <button
                      type="button"
                      onClick={() => handleDuplicateCleanup(group)}
                      className="action-button action-button-danger w-full"
                    >
                      Remove safe duplicates
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state empty-state-compact">
                <p className="empty-state-title">No duplicate donor groups found.</p>
                <p className="empty-state-copy">The cleanup tool will list donor records that look duplicated.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title inline-flex items-center gap-2">
              <FiSettings className="text-red-600" />
              Color Theme
            </h3>
            <p className="panel-copy">
              {isAdmin
                ? 'Choose the visual theme that should be used across this system on this device.'
                : 'Only administrators can change the system theme.'}
            </p>
          </div>
          <span className="soft-chip">{themeOptions.find((item) => item.id === theme)?.name || 'Theme'}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {themeOptions.map((option) => {
            const isActive = option.id === theme;
            return (
              <button
                key={option.id}
                type="button"
                disabled={!isAdmin}
                onClick={() => isAdmin && setTheme(option.id)}
                className={`record-card text-left ${isActive ? 'border-2 border-red-200' : ''} ${
                  !isAdmin ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <span className={`h-4 w-4 rounded-full ${
                      option.id === 'crimson'
                        ? 'bg-red-600'
                        : option.id === 'ocean'
                          ? 'bg-cyan-600'
                          : option.id === 'emerald'
                            ? 'bg-emerald-600'
                            : 'bg-orange-500'
                    }`}
                    />
                    <span className={`h-4 w-4 rounded-full ${
                      option.id === 'crimson'
                        ? 'bg-rose-400'
                        : option.id === 'ocean'
                          ? 'bg-sky-400'
                          : option.id === 'emerald'
                            ? 'bg-green-400'
                            : 'bg-amber-300'
                    }`}
                    />
                    <span className={`h-4 w-4 rounded-full ${
                      option.id === 'crimson'
                        ? 'bg-orange-300'
                        : option.id === 'ocean'
                          ? 'bg-teal-300'
                          : option.id === 'emerald'
                            ? 'bg-lime-300'
                            : 'bg-yellow-300'
                    }`}
                    />
                  </div>
                  {isActive ? <span className="soft-chip soft-chip-success">Active</span> : null}
                </div>
                <p className="text-base font-bold text-slate-900">{option.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiClock className="text-red-600" />
                Update guidance
              </h3>
              <p className="panel-copy">A simple reminder for keeping system data dependable across the full operation.</p>
            </div>
            <span className="soft-chip soft-chip-warning">Operational best practice</span>
          </div>
          <div className="surface-inset">
            <p className="text-sm leading-7 text-slate-600">
              Staff should review and update donor, patient, blood type, and request records regularly so the dashboard,
              inventory controls, and downstream reporting continue to reflect the most accurate information available.
            </p>
          </div>
        </article>

        <article className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiShield className="text-red-600" />
                Admin Powers
              </h3>
              <p className="panel-copy">What makes the administrator role different from Staff and Doctor accounts.</p>
            </div>
          </div>
          <div className="space-y-3">
            {adminActions.map((action) => (
              <div key={action} className="record-card record-card-muted">
                <p className="text-sm font-semibold text-slate-800">{action}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default DataStorageUpdates;
