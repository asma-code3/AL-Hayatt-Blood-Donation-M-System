import React, { useMemo, useState } from 'react';
import { FiClipboard, FiEdit2, FiHeart, FiRefreshCw, FiTrash2, FiUsers } from 'react-icons/fi';
import { ConfirmDialog, FormShowcaseCard, ToastMessage } from '../components/ui';
import { useBloodContext } from '../Context/blood-context';
import { maskDisplayName } from '../utils/nameFormat';

const initialForm = {
  name: '',
  age: '',
  gender: '',
  bloodType: '',
  condition: '',
};

const normalizeForm = (patient) => ({
  name: patient.name || '',
  age: patient.age?.toString() || '',
  gender: patient.gender || '',
  bloodType: patient.bloodType || '',
  condition: patient.condition || '',
});

const PatientRegistration = () => {
  const { bloodGroups, patients, addPatient, updatePatient, deletePatient } = useBloodContext();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [editingPatient, setEditingPatient] = useState(null);
  const [patientPendingDelete, setPatientPendingDelete] = useState(null);

  const recentPatients = useMemo(() => patients.slice().reverse(), [patients]);
  const nextPatientReference = useMemo(() => {
    const nextId = patients.reduce((maxId, patient) => Math.max(maxId, Number(patient.id) || 0), 0) + 1;
    return `PT-${String(nextId).padStart(4, '0')}`;
  }, [patients]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...formData, age: Number(formData.age) };
    const result = editingPatient
      ? await updatePatient(editingPatient.id, payload)
      : await addPatient(payload);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }

    setFormData(initialForm);
    setEditingPatient(null);
    setFeedback({
      type: 'success',
      text: editingPatient ? `Patient record #${result.patient.id} was updated successfully.` : `Patient record #${result.patient.id} was created successfully.`,
    });
  };

  const handleReset = () => {
    setFormData(initialForm);
    setFeedback({ type: '', text: '' });
    setEditingPatient(null);
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData(normalizeForm(patient));
    setFeedback({ type: '', text: '' });
  };

  const handleDelete = async (patient) => {
    setPatientPendingDelete(patient);
  };

  const confirmDelete = async () => {
    if (!patientPendingDelete) return;

    const result = await deletePatient(patientPendingDelete.id);
    setFeedback(
      result.success
        ? { type: 'success', text: `Patient record #${patientPendingDelete.id} was deleted successfully.` }
        : { type: 'error', text: result.error }
    );
    if (result.success && editingPatient?.id === patientPendingDelete.id) {
      handleReset();
    }
    setPatientPendingDelete(null);
  };

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(patientPendingDelete)}
        title="Delete patient record"
        message={patientPendingDelete ? `Are you sure you want to delete patient record #${patientPendingDelete.id}?` : ''}
        confirmLabel="Delete record"
        onConfirm={confirmDelete}
        onCancel={() => setPatientPendingDelete(null)}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <FormShowcaseCard
          icon={FiClipboard}
          accentIcon={FiHeart}
          title="Patient Registration "
          subtitle="Capture patient identity, blood type and care notes"
          metaLabel="Patient Ref"
          metaValue={editingPatient ? `PT-${String(editingPatient.id).padStart(4, '0')}` : nextPatientReference}
        >
          <form onSubmit={handleSubmit} className="form-grid sm:grid-cols-2">
            <div>
              <label className="field-label">Patient reference</label>
              <input value={editingPatient ? `PT-${String(editingPatient.id).padStart(4, '0')}` : nextPatientReference} readOnly className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="field-label">Patient name</label>
              <input
                name="name"
                placeholder="Enter patient full name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-field"
              />
            </div>
            <div>
              <label className="field-label">Age</label>
              <input
                name="age"
                type="number"
                min="1"
                placeholder="Enter age"
                value={formData.age}
                onChange={handleChange}
                required
                className="form-field"
              />
            </div>
            <div>
              <label className="field-label">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="form-field"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="field-label">Blood type</label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                required
                className="form-field"
              >
                <option value="">Select blood type</option>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Priority note</label>
              <input value="Clinical intake" readOnly className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Condition details</label>
              <textarea
                name="condition"
                placeholder="Describe the condition or blood need details..."
                value={formData.condition}
                onChange={handleChange}
                rows="5"
                required
                className="form-field min-h-[152px]"
              />
            </div>

            <div className="clinical-form-actions sm:col-span-2">
              <button type="button" onClick={handleReset} className="action-button-secondary">
                <FiRefreshCw />
                {editingPatient ? 'Cancel edit' : 'Reset'}
              </button>
              <button type="submit" className="action-button action-button-info">
                <FiClipboard />
                {editingPatient ? 'Update patient' : 'Register patient'}
              </button>
            </div>
          </form>
        </FormShowcaseCard>

        <article className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title inline-flex items-center gap-2">
                <FiUsers className="text-red-600" />
                Recent patients
              </h3>
              <p className="panel-copy">A quick list of the latest patient registrations and care notes.</p>
            </div>
            <span className="soft-chip">{recentPatients.length} visible</span>
          </div>
          <div className="space-y-3">
            {recentPatients.length === 0 && (
              <div className="empty-state empty-state-compact">
                <p className="empty-state-title">No patient records yet.</p>
                <p className="empty-state-copy">Registered patients will show here for quick review.</p>
              </div>
            )}
            {recentPatients.map((patient) => (
              <div key={patient.id} className="record-card record-card-danger">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{maskDisplayName(patient.name)}</p>
                    <p className="mt-1 text-xs text-slate-500">{`${patient.gender} | Age ${patient.age}`}</p>
                  </div>
                  <span className="status-chip status-chip-danger">{patient.bloodType}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{patient.condition}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => handleEdit(patient)} className="action-button-secondary px-3 py-2 text-xs">
                    <FiEdit2 />
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(patient)} className="action-button-secondary px-3 py-2 text-xs text-rose-700">
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default PatientRegistration;
