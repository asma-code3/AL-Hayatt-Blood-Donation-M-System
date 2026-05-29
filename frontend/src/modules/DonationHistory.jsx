import React, { useMemo, useState } from 'react';
import { FiActivity, FiClock, FiEdit2, FiPlusCircle, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { ConfirmDialog, DataTable, ToastMessage } from '../components/ui';
import { useAuth } from '../Context/auth-context';
import { useBloodContext } from '../Context/blood-context';

const initialHistoryForm = {
  donorId: '',
  donationDate: '',
  notes: '',
};

const normalizeHistoryForm = (entry) => ({
  donorId: entry.donorId || '',
  donationDate: entry.donationDate || '',
  notes: entry.notes || '',
});

const DonationHistory = () => {
  const { user } = useAuth();
  const { donors, history, recordDonation, addHistoryEntry, updateHistoryEntry, deleteHistoryEntry } = useBloodContext();
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState(initialHistoryForm);
  const [editingEntry, setEditingEntry] = useState(null);
  const [historyPendingDelete, setHistoryPendingDelete] = useState(null);
  const [recordingDonorId, setRecordingDonorId] = useState(null);

  const isAdmin = user?.role === 'Administrator';

  const orderedHistory = useMemo(() => history.slice().reverse(), [history]);
  const selectedDonor = useMemo(() => donors.find((donor) => donor.donorId === formData.donorId) || null, [donors, formData.donorId]);
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(initialHistoryForm);
    setEditingEntry(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = editingEntry
      ? await updateHistoryEntry(editingEntry.id, formData)
      : await addHistoryEntry(formData);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      text: editingEntry ? `${result.entry.historyId} was updated successfully.` : `${result.entry.historyId} was created successfully.`,
    });
    handleReset();
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData(normalizeHistoryForm(entry));
    setFeedback({ type: '', text: '' });
  };

  const handleDelete = async (entry) => {
    setHistoryPendingDelete(entry);
  };

  const confirmDelete = async () => {
    if (!historyPendingDelete) return;

    const result = await deleteHistoryEntry(historyPendingDelete.id);
    setFeedback(
      result.success
        ? { type: 'success', text: `${historyPendingDelete.historyId} was deleted successfully.` }
        : { type: 'error', text: result.error }
    );

    if (result.success && editingEntry?.id === historyPendingDelete.id) {
      handleReset();
    }
    setHistoryPendingDelete(null);
  };

  const columns = [
    { header: 'History ID', accessor: 'historyId' },
    { header: 'Donor ID', accessor: 'donorId' },
    { header: 'Donor name', accessor: 'donorName' },
    { header: 'Blood type', accessor: 'bloodType' },
    { header: 'Donation date', accessor: 'donationDate' },
    { header: 'Notes', accessor: 'notes' },
  ];

  const donorColumns = [
    { header: 'Donor name', accessor: 'name' },
    { header: 'Blood type', accessor: 'bloodType' },
    {
      header: 'Total donations',
      accessor: 'donations',
      render: (row) => <span className="font-bold text-rose-600">{row.donations}</span>,
    },
  ];

  const renderHistoryActions = isAdmin
    ? (row) => (
        <div className="flex gap-2">
          <button type="button" onClick={() => handleEdit(row)} className="action-button-secondary px-3 py-2 text-xs">
            <FiEdit2 />
            Edit
          </button>
          <button type="button" onClick={() => handleDelete(row)} className="action-button-secondary px-3 py-2 text-xs text-rose-700">
            <FiTrash2 />
            Delete
          </button>
        </div>
      )
    : null;

  const renderActions = (row) => (
    <button
      type="button"
      disabled={recordingDonorId === row.id}
      onClick={async () => {
        if (recordingDonorId === row.id) return;

        setRecordingDonorId(row.id);
        const result = await recordDonation(row.id);
        setFeedback({
          type: result.success ? 'success' : 'error',
          text: result.success ? `A donation was recorded successfully for ${row.name}.` : result.error,
        });
        setRecordingDonorId(null);
      }}
      className="action-button action-button-info px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FiPlusCircle />
      {recordingDonorId === row.id ? 'Recording...' : 'Record'}
    </button>
  );

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(historyPendingDelete)}
        title="Delete history entry"
        message={historyPendingDelete ? `Are you sure you want to delete history entry ${historyPendingDelete.historyId}?` : ''}
        confirmLabel="Delete entry"
        onConfirm={confirmDelete}
        onCancel={() => setHistoryPendingDelete(null)}
      />
      {isAdmin && (
        <section className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiEdit2 className="text-red-600" />
                {editingEntry ? 'Edit history entry' : 'Create history entry'}
              </h3>
              <p className="panel-copy">Admin can create, update, or delete donation history records here.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid sm:grid-cols-2">
            <div>
              <label className="field-label">Donor ID</label>
              <select name="donorId" value={formData.donorId} onChange={handleChange} className="form-field" required>
                <option value="">Select donor</option>
                {donors.map((donor) => (
                  <option key={donor.donorId} value={donor.donorId}>
                    {donor.donorId} - {donor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Donor name</label>
              <input value={selectedDonor?.name || ''} readOnly placeholder="Select donor first" className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="field-label">Blood type</label>
              <input value={selectedDonor?.bloodType || ''} readOnly placeholder="Select donor first" className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="field-label">Donation date</label>
              <input name="donationDate" type="date" value={formData.donationDate} onChange={handleChange} className="form-field" required />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder="Add donation notes" className="form-field min-h-[132px]" />
            </div>
            <div className="clinical-form-actions sm:col-span-2">
              <button type="button" onClick={handleReset} className="action-button-secondary">
                <FiRefreshCw />
                {editingEntry ? 'Cancel edit' : 'Reset'}
              </button>
              <button type="submit" className="action-button action-button-info">
                <FiEdit2 />
                {editingEntry ? 'Update history entry' : 'Create history entry'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title inline-flex items-center gap-2">
              <FiActivity className="text-red-600" />
              Donation history table
            </h3>
            <p className="panel-copy inline-flex items-center gap-1.5">
              <FiClock />
              View each saved history entry with donor ID, blood type, date, and notes.
            </p>
          </div>
          <span className="soft-chip">{orderedHistory.length} records loaded</span>
        </div>
        <DataTable columns={columns} data={orderedHistory} renderActions={renderHistoryActions} />
      </section>

      <section className="section-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title inline-flex items-center gap-2">
              <FiPlusCircle className="text-red-600" />
              Record new donation
            </h3>
            <p className="panel-copy">Choose a donor below to create a fresh donation history entry.</p>
          </div>
          <span className="soft-chip">{donors.length} donors available</span>
        </div>

        <DataTable columns={donorColumns} data={donors} renderActions={renderActions} />
      </section>
    </div>
  );
};

export default DonationHistory;
