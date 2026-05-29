import React, { useMemo, useState } from 'react';
import { FiCalendar, FiDroplet, FiEdit2, FiLayers, FiPackage, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import { ConfirmDialog, FormShowcaseCard, ToastMessage } from '../components/ui';
import { useAuth } from '../Context/auth-context';
import { useBloodContext } from '../Context/blood-context';
import { getNextSequenceId } from '../utils/formDisplay';

const initialForm = {
  donorId: '',
  bloodType: '',
  volume: '',
  collectionDate: '',
};

const normalizeForm = (unit) => ({
  donorId: unit.donorId || '',
  bloodType: unit.bloodType || '',
  volume: unit.volume?.toString() || '',
  collectionDate: unit.collectionDate || '',
});

const bloodToneMap = {
  'A+': {
    shell: 'from-rose-50 via-white to-red-50 border-rose-200/70',
    badge: 'from-rose-500 to-red-600 text-white',
    dot: 'bg-rose-500',
  },
  'A-': {
    shell: 'from-slate-50 via-white to-sky-50 border-slate-200',
    badge: 'from-slate-500 to-sky-600 text-white',
    dot: 'bg-sky-500',
  },
  'B+': {
    shell: 'from-amber-50 via-white to-orange-50 border-amber-200/70',
    badge: 'from-amber-500 to-orange-500 text-white',
    dot: 'bg-amber-500',
  },
  'B-': {
    shell: 'from-orange-50 via-white to-yellow-50 border-orange-200/70',
    badge: 'from-orange-500 to-yellow-500 text-white',
    dot: 'bg-orange-400',
  },
  'AB+': {
    shell: 'from-fuchsia-50 via-white to-pink-50 border-fuchsia-200/70',
    badge: 'from-fuchsia-500 to-pink-500 text-white',
    dot: 'bg-fuchsia-500',
  },
  'AB-': {
    shell: 'from-violet-50 via-white to-purple-50 border-violet-200/70',
    badge: 'from-violet-500 to-purple-500 text-white',
    dot: 'bg-violet-500',
  },
  'O+': {
    shell: 'from-emerald-50 via-white to-teal-50 border-emerald-200/70',
    badge: 'from-emerald-500 to-teal-500 text-white',
    dot: 'bg-emerald-500',
  },
  'O-': {
    shell: 'from-cyan-50 via-white to-blue-50 border-cyan-200/70',
    badge: 'from-cyan-500 to-blue-500 text-white',
    dot: 'bg-cyan-500',
  },
};

const buildGroupedInventoryRows = (inventory) => {
  const grouped = new Map();

  inventory
    .slice()
    .reverse()
    .forEach((item) => {
      const key = [
        item.donorId,
        item.bloodType,
        item.volume,
        item.collectionDate,
        item.expiryDate,
        item.status,
      ].join('::');

      const existing = grouped.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.unitIds.push(item.unitId);
        return;
      }

      grouped.set(key, {
        ...item,
        quantity: 1,
        unitIds: [item.unitId],
      });
    });

  return Array.from(grouped.values());
};

const BloodInventory = () => {
  const { user } = useAuth();
  const { donors, inventory, inventorySummary, requests, addInventoryUnit, updateInventoryUnit, deleteInventoryUnit } = useBloodContext();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitPendingDelete, setUnitPendingDelete] = useState(null);
  const isAdmin = user?.role === 'Administrator';

  const recentUnits = useMemo(() => buildGroupedInventoryRows(inventory), [inventory]);
  const nextUnitReference = useMemo(() => getNextSequenceId(inventory, 'unitId', 'UNT'), [inventory]);
  const selectedDonor = useMemo(() => donors.find((donor) => donor.donorId === formData.donorId) || null, [donors, formData.donorId]);
  const matchedRequest = useMemo(() => {
    if (!selectedUnit) return null;
    return requests.find((request) => request.unitIdsUsed?.includes(selectedUnit.unitId)) || null;
  }, [requests, selectedUnit]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      bloodType: selectedDonor?.bloodType || formData.bloodType,
      volume: Number(formData.volume),
    };
    const result = editingUnit
      ? await updateInventoryUnit(editingUnit.id, payload)
      : await addInventoryUnit(payload);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      text: editingUnit ? `${result.unit.unitId} was updated successfully.` : `${result.unit.unitId} was saved successfully.`,
    });
    setFormData(initialForm);
    setEditingUnit(null);
  };

  const handleReset = () => {
    setFormData(initialForm);
    setFeedback({ type: '', text: '' });
    setEditingUnit(null);
  };

  const handleUnitClick = (item) => {
    if (item.status !== 'Issued') return;
    setSelectedUnit(item);
  };

  const handleEdit = (unit) => {
    if (unit.status === 'Issued') {
      setFeedback({ type: 'error', text: 'Issued units cannot be edited.' });
      return;
    }
    setEditingUnit(unit);
    setFormData(normalizeForm(unit));
    setFeedback({ type: '', text: '' });
  };

  const handleDelete = async (unit) => {
    setUnitPendingDelete(unit);
  };

  const confirmDelete = async () => {
    if (!unitPendingDelete) return;

    const result = await deleteInventoryUnit(unitPendingDelete.id);
    setFeedback(
      result.success
        ? { type: 'success', text: `${unitPendingDelete.unitId} was deleted successfully.` }
        : { type: 'error', text: result.error }
    );
    if (result.success && editingUnit?.id === unitPendingDelete.id) {
      handleReset();
    }
    setUnitPendingDelete(null);
  };

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(unitPendingDelete)}
        title="Delete inventory unit"
        message={
          unitPendingDelete
            ? unitPendingDelete.status === 'Issued'
              ? `Are you sure you want to delete issued unit ${unitPendingDelete.unitId}? This admin action will also remove the unit reference from linked request records.`
              : `Are you sure you want to delete unit ${unitPendingDelete.unitId}?`
            : ''
        }
        confirmLabel="Delete unit"
        onConfirm={confirmDelete}
        onCancel={() => setUnitPendingDelete(null)}
      />
      {/* <section className="grid gap-4 sm:grid-cols-2">
        <article className="metric-card">
          <p className="metric-kicker">
            <FiLayers />
            Available units
          </p>
          <p className="metric-value">{totalUnits}</p>
          <p className="metric-note">Units currently marked as available in storage.</p>
        </article>
        <article className="metric-card">
          <p className="metric-kicker">
            <FiPackage />
            Blood groups under watch
          </p>
          <p className="metric-value text-rose-600">{lowStockCount}</p>
          <p className="metric-note">Groups with fewer than three available units.</p>
        </article>
      </section> */}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <FormShowcaseCard
          icon={FiDroplet}
          accentIcon={FiPackage}
          title="Blood Inventory"
          subtitle="Capture unit intake, donor reference and collection details"
          metaLabel="Unit Ref"
          metaValue={editingUnit?.unitId || nextUnitReference}
        >
          <form onSubmit={handleSubmit} className="form-grid sm:grid-cols-2">
            <div>
              <label className="field-label">Unit ID</label>
              <input value={editingUnit?.unitId || nextUnitReference} readOnly className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="field-label">Donor</label>
              <select name="donorId" value={formData.donorId} onChange={handleChange} required className="form-field">
                <option value="">Select donor</option>
                {donors.map((donor) => (
                  <option key={donor.donorId} value={donor.donorId}>
                    {donor.donorId} - {donor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Blood group</label>
              <input
                name="bloodType"
                value={selectedDonor?.bloodType || formData.bloodType}
                readOnly
                placeholder="Select donor first"
                className="form-field bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="field-label">Volume</label>
              <input
                name="volume"
                type="number"
                min="1"
                placeholder="Volume in ml"
                value={formData.volume}
                onChange={handleChange}
                required
                className="form-field"
              />
            </div>
            <div>
              <label className="field-label">Collection date</label>
              <div className="relative">
                <FiCalendar className="form-field-icon" />
                <input
                  name="collectionDate"
                  type="date"
                  value={formData.collectionDate}
                  onChange={handleChange}
                  required
                  className="form-field-with-icon"
                />
              </div>
            </div>
            <div className="clinical-form-actions sm:col-span-2">
              <button type="button" onClick={handleReset} className="action-button-secondary">
                <FiRefreshCw />
                {editingUnit ? 'Cancel edit' : 'Reset'}
              </button>
              <button type="submit" className="action-button action-button-info">
                <FiDroplet />
                {editingUnit ? 'Update inventory unit' : 'Save inventory unit'}
              </button>
            </div>
          </form>
        </FormShowcaseCard>

        <article className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Recent inventory units</h3>
              <p className="panel-copy">Track stock status, collection dates, and expiry timing at a glance.</p>
            </div>
            <span className="soft-chip">{recentUnits.length} recent units</span>
          </div>
          <p className="table-helper">Swipe sideways to view the full inventory table.</p>
          <div className="table-shell">
            <table className="table-base min-w-[620px] sm:min-w-[760px]">
              <thead>
                <tr>
                  <th>Unit Ref</th>
                  <th>Blood group</th>
                  <th>Qty</th>
                  <th>Volume</th>
                  <th>Collection</th>
                  <th>Expiry</th>
                  <th>Donor ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUnits.map((item) => (
                  <tr
                    key={`${item.donorId}-${item.collectionDate}-${item.status}-${item.unitIds[0]}`}
                    onClick={() => item.quantity === 1 && handleUnitClick(item)}
                    className={item.status === 'Issued' && item.quantity === 1 ? 'cursor-pointer' : ''}
                    title={item.status === 'Issued' && item.quantity === 1 ? 'Click to view request details' : ''}
                  >
                    <td className="font-semibold text-slate-800">
                      {item.quantity === 1 ? item.unitId : `${item.unitIds[0]} +${item.quantity - 1}`}
                    </td>
                    <td>{item.bloodType}</td>
                    <td>
                      <span className="soft-chip">{item.quantity} unit(s)</span>
                    </td>
                    <td>{item.volume} ml</td>
                    <td>{item.collectionDate}</td>
                    <td>{item.expiryDate}</td>
                    <td>{item.donorId}</td>
                    <td>
                      <span
                        className={`status-chip ${item.status === 'Available' ? 'status-chip-success' : 'status-chip-warning'}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {item.quantity === 1 ? (
                          <>
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleEdit(item); }} className="action-button-secondary px-3 py-2 text-xs">
                              <FiEdit2 />
                              Edit
                            </button>
                            {isAdmin && (
                              <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(item); }} className="action-button-secondary px-3 py-2 text-xs text-rose-700">
                                <FiTrash2 />
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Grouped row</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inventorySummary.length === 0 && (
              <div className="empty-state empty-state-compact sm:col-span-2">
                <p className="empty-state-title">No inventory summary available yet.</p>
                <p className="empty-state-copy">Saved blood units will generate stock summaries automatically.</p>
              </div>
            )}
            {inventorySummary.map((item) => {
              const tone = bloodToneMap[item.bloodType] || bloodToneMap['A+'];
              const isLow = item.quantity < 3 && item.quantity > 0;

              return (
                <div
                  key={item.bloodType}
                  className={`interactive-card overflow-hidden rounded-[26px] border bg-gradient-to-br p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] ${tone.shell}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_16px_26px_-18px_rgba(15,23,42,0.3)] ${tone.badge}`}>
                        <FiDroplet className="text-lg" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Blood Group</p>
                        <p className="mt-1 text-xl font-black tracking-tight text-slate-900">{item.bloodType}</p>
                      </div>
                    </div>

                    <span className={`status-chip ${isLow ? 'status-chip-warning' : 'status-chip-success'}`}>
                      {isLow ? 'Low' : 'Stable'}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-600">Available stock</p>
                      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{item.quantity}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">available unit(s)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {selectedUnit && (
        <div className="modal-backdrop" onClick={() => setSelectedUnit(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header mb-4">
              <div>
                <h3 className="panel-title">Issued unit details</h3>
                <p className="panel-copy">Request information linked to {selectedUnit.unitId}.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="action-button-secondary px-3 py-2"
              >
                <FiX />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="record-card record-card-muted">
                <p className="field-label">Unit ID</p>
                <p className="text-sm font-semibold text-slate-900">{selectedUnit.unitId}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="field-label">Donor ID</p>
                <p className="text-sm font-semibold text-slate-900">{selectedUnit.donorId}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="field-label">Blood group</p>
                <p className="text-sm font-semibold text-slate-900">{selectedUnit.bloodType}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="field-label">Status</p>
                <p className="text-sm font-semibold text-slate-900">{selectedUnit.status}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-rose-100 bg-rose-50/55 p-4">
              <p className="field-label">Patient / Request info</p>
              {matchedRequest ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Patient name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Request ID</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.transfusionId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Doctor</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.doctorName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Transfusion date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.transfusionDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Quantity</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.quantity} unit(s)</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Units used</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{matchedRequest.unitIdsUsed.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">No linked request details were found for this issued unit.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodInventory;
