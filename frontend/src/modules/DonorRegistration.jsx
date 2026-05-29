import React, { useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiDroplet,
  FiEdit2,
  FiHeart,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import { ConfirmDialog, FormShowcaseCard, ToastMessage } from '../components/ui';
import { useBloodContext } from '../Context/blood-context';
import { getNextSequenceId } from '../utils/formDisplay';

const initialForm = {
  name: '',
  dateOfBirth: '',
  gender: '',
  bloodType: '',
  contact: '',
  email: '',
  address: '',
  donations: '',
  lastDonationDate: '',
  occupation: '',
  medicalCondition: '',
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthday) age -= 1;
  return age;
};

const approximateDateOfBirth = (age) => {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge) || numericAge <= 0) return '';

  const today = new Date();
  const approx = new Date(today.getFullYear() - numericAge, today.getMonth(), today.getDate());
  return approx.toISOString().split('T')[0];
};

const normalizeForm = (donor) => ({
  name: donor.name || '',
  dateOfBirth: donor.dateOfBirth || approximateDateOfBirth(donor.age),
  gender: donor.gender || '',
  bloodType: donor.bloodType || '',
  contact: donor.contact || '',
  email: donor.email || '',
  address: donor.address || '',
  donations: donor.donations?.toString() || '',
  lastDonationDate: donor.lastDonationDate || '',
  occupation: donor.occupation || '',
  medicalCondition: donor.medicalCondition || '',
});

const normalizeCompareValue = (value) => String(value || '').trim().toLowerCase();
const normalizeCompareContact = (value) => String(value || '').replace(/\D/g, '');

const formatCompactDate = (value) => {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDaysSince = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  return Math.floor((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
};

const getEligibilityReview = (formData) => {
  const age = calculateAge(formData.dateOfBirth);
  const daysSinceDonation = getDaysSince(formData.lastDonationDate);
  const hasMedicalCondition = Boolean(formData.medicalCondition.trim());
  const missingFields = [];
  const reasons = [];

  if (!formData.name.trim()) missingFields.push('full name');
  if (!formData.dateOfBirth) missingFields.push('date of birth');
  if (!formData.gender) missingFields.push('gender');
  if (!formData.bloodType) missingFields.push('blood group');
  if (!formData.contact.trim()) missingFields.push('phone number');

  if (missingFields.length > 0) {
    return {
      status: 'incomplete',
      title: 'More details needed',
      summary: `Complete ${missingFields.join(', ')} before checking eligibility.`,
      reasons: [],
      age,
      daysSinceDonation,
    };
  }

  if (!Number.isInteger(age) || age < 18 || age > 65) {
    reasons.push('Donor age should be between 18 and 65 years.');
  }

  if (daysSinceDonation !== null && daysSinceDonation < 90) {
    reasons.push('At least 90 days should pass after the last donation.');
  }

  if (hasMedicalCondition) {
    reasons.push('Medical condition notes require manual staff review before approval.');
  }

  if (reasons.length > 0) {
    return {
      status: 'review',
      title: 'Needs staff review',
      summary: 'This donor should be reviewed before registration is confirmed.',
      reasons,
      age,
      daysSinceDonation,
    };
  }

  return {
    status: 'eligible',
    title: 'Eligible to donate',
    summary: 'Current form details match the basic donation checks on this page.',
    reasons: [
      'Age is within the accepted range.',
      'No waiting-period conflict was found.',
      'No medical warning was entered.',
    ],
    age,
    daysSinceDonation,
  };
};

const summaryCards = (donors) => {
  const activeDonors = donors.filter((donor) => Number(donor.donations || 0) > 0).length;
  const bloodUnits = donors.reduce((sum, donor) => sum + Number(donor.donations || 0), 0);

  return [
    { label: 'Total Donors', value: donors.length.toLocaleString(), note: '+ 12% this month', icon: FiUsers, tone: 'bg-rose-50 text-rose-600' },
    { label: 'Blood Units', value: bloodUnits.toLocaleString(), note: '+ 8% this month', icon: FiDroplet, tone: 'bg-violet-50 text-violet-500' },
    { label: 'Active Donors', value: activeDonors.toLocaleString(), note: '+ 10% this month', icon: FiUserPlus, tone: 'bg-amber-50 text-amber-500' },
    { label: 'Total Donations', value: bloodUnits.toLocaleString(), note: '+ 15% this month', icon: FiHeart, tone: 'bg-sky-50 text-sky-500' },
  ];
};

const InputShell = ({ label, required = false, helperText = '', icon: Icon, children }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </label>
    {helperText ? <p className="mb-2 text-xs text-slate-500">{helperText}</p> : null}
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-red-300" /> : null}
      {children}
    </div>
  </div>
);

const DonorRegistration = () => {
  const { bloodGroups, donors, history, addDonor, updateDonor, deleteDonor } = useBloodContext();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [editingDonor, setEditingDonor] = useState(null);
  const [donorPendingDelete, setDonorPendingDelete] = useState(null);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);

  const donorLastDonationMap = useMemo(() => {
    const donationMap = new Map();

    history.forEach((entry) => {
      if (!entry?.donorId || !entry?.donationDate) return;
      const current = donationMap.get(entry.donorId);
      if (!current || new Date(entry.donationDate) > new Date(current)) {
        donationMap.set(entry.donorId, entry.donationDate);
      }
    });

    return donationMap;
  }, [history]);

  const recentDonors = useMemo(() => {
    const orderedDonors = donors
      .slice()
      .sort((a, b) => {
        const dateA = donorLastDonationMap.get(a.donorId) || a.lastDonationDate || a.createdAt || '';
        const dateB = donorLastDonationMap.get(b.donorId) || b.lastDonationDate || b.createdAt || '';
        return new Date(dateB || 0) - new Date(dateA || 0);
      })
      .map((donor) => ({
        ...donor,
        displayLastDonationDate: donorLastDonationMap.get(donor.donorId) || donor.lastDonationDate || '',
      }));

    return showAllDonors ? orderedDonors : orderedDonors.slice(0, 5);
  }, [donors, donorLastDonationMap, showAllDonors]);
  const nextDonorReference = useMemo(() => getNextSequenceId(donors, 'donorId', 'DNR'), [donors]);
  const donorSummaryCards = useMemo(() => summaryCards(donors), [donors]);
  const selectedDonorDetails = useMemo(() => {
    if (!selectedDonor) return null;

    return {
      ...selectedDonor,
      displayLastDonationDate: donorLastDonationMap.get(selectedDonor.donorId) || selectedDonor.lastDonationDate || '',
    };
  }, [selectedDonor, donorLastDonationMap]);
  const eligibilityReview = useMemo(() => getEligibilityReview(formData), [formData]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const age = calculateAge(formData.dateOfBirth);

    const duplicateDonor = donors.find((donor) => {
      if (editingDonor?.id === donor.id) return false;

      const sameName = normalizeCompareValue(donor.name) === normalizeCompareValue(formData.name);
      const sameContact =
        normalizeCompareContact(formData.contact) &&
        normalizeCompareContact(donor.contact) === normalizeCompareContact(formData.contact);
      const sameEmail =
        normalizeCompareValue(formData.email) &&
        normalizeCompareValue(donor.email) === normalizeCompareValue(formData.email);
      const sameDateOfBirth =
        formData.dateOfBirth &&
        donor.dateOfBirth === formData.dateOfBirth;

      return sameName && (sameContact || sameEmail || sameDateOfBirth);
    });

    if (duplicateDonor) {
      setFeedback({
        type: 'error',
        text: `Duplicate donor detected. ${duplicateDonor.donorId} is already registered for this person.`,
      });
      return;
    }

    if (!Number.isInteger(age) || age < 18 || age > 65) {
      setFeedback({ type: 'error', text: 'Date of birth must produce an age between 18 and 65.' });
      return;
    }

    const payload = {
      ...formData,
      age,
      donations: formData.donations ? Number(formData.donations) : 0,
    };

    const result = editingDonor ? await updateDonor(editingDonor.id, payload) : await addDonor(payload);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      text: editingDonor ? `${result.donor.donorId} was updated successfully.` : `${result.donor.donorId} was created successfully.`,
    });
    setFormData(initialForm);
    setEditingDonor(null);
  };

  const handleReset = () => {
    setFormData(initialForm);
    setFeedback({ type: '', text: '' });
    setEditingDonor(null);
  };

  const handleEdit = (donor) => {
    setEditingDonor(donor);
    setFormData(normalizeForm(donor));
    setFeedback({ type: '', text: '' });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const confirmDelete = async () => {
    if (!donorPendingDelete) return;

    const result = await deleteDonor(donorPendingDelete.id);
    setFeedback(
      result.success
        ? { type: 'success', text: `${donorPendingDelete.donorId} was deleted successfully.` }
        : { type: 'error', text: result.error }
    );

    if (result.success && editingDonor?.id === donorPendingDelete.id) {
      handleReset();
    }

    setDonorPendingDelete(null);
  };

  return (
    <div className="page-stack gap-5">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(donorPendingDelete)}
        title="Delete donor"
        message={donorPendingDelete ? `Are you sure you want to delete donor ${donorPendingDelete.donorId}?` : ''}
        confirmLabel="Delete donor"
        onConfirm={confirmDelete}
        onCancel={() => setDonorPendingDelete(null)}
      />
      {selectedDonorDetails ? (
        <div className="modal-backdrop" onClick={() => setSelectedDonor(null)}>
          <div className="modal-card m max-w-2xl p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header mb-3">
              <div>
                <h3 className="panel-title inline-flex items-center gap-2">
                  <FiUser className="text-red-600" />
                  Donor Details
                </h3>
                <p className="panel-copy">Complete information for {selectedDonorDetails.name}.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDonor(null)}
                className="action-button-secondary px-3 py-2 bg-white  text-gray-700 hover:bg-red-700"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[68vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Donor ID</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.donorId}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Full Name</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.name}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Blood Group</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.bloodType || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Gender</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.gender || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Age</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.age || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Date of Birth</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatCompactDate(selectedDonorDetails.dateOfBirth)}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Phone</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.contact || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.email || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Address</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.address || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Donations Recorded</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{Number(selectedDonorDetails.donations || 0)} donation(s)</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Last Donation</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatCompactDate(selectedDonorDetails.displayLastDonationDate)}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Occupation</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.occupation || 'Not set'}</p>
              </div>
              <div className="record-card record-card-muted sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Medical Condition</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedDonorDetails.medicalCondition || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showEligibilityModal ? (
        <div className="modal-backdrop" onClick={() => setShowEligibilityModal(false)}>
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header mb-4">
              <div>
                <h3 className="panel-title inline-flex items-center gap-2">
                  {eligibilityReview.status === 'eligible' ? (
                    <FiCheckCircle className="text-emerald-600" />
                  ) : (
                    <FiAlertCircle className="text-red-600" />
                  )}
                  Donation Eligibility
                </h3>
                <p className="panel-copy">{eligibilityReview.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEligibilityModal(false)}
                className="action-button-secondary px-3 py-2"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{eligibilityReview.title}</p>
              </div>
              <div className="record-card record-card-muted">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Age</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {Number.isInteger(eligibilityReview.age) ? `${eligibilityReview.age} years` : 'Not available'}
                </p>
              </div>
              <div className="record-card record-card-muted sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Eligibility Notes</p>
                {eligibilityReview.reasons.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {eligibilityReview.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-900">No extra notes.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_330px] 2xl:grid-cols-[minmax(0,1.72fr)_350px] ">
        <FormShowcaseCard
          icon={FiUser}
          accentIcon={FiCheckCircle}
          title="Donor Registration"
          subtitle="Please fill in the information carefully"
          metaLabel="Donor Ref"
          metaValue={editingDonor?.donorId || nextDonorReference}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <InputShell label="Full Name" required icon={FiUser}>
              <input
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <InputShell label="Date of Birth" required helperText="Qofku ha qoro ama ha ka doorto calendar-ka." icon={FiCalendar}>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <InputShell label="Gender" required>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] px-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </InputShell>

            <InputShell label="Blood Group" required icon={FiDroplet}>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                required
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              >
                <option value="">Select blood group</option>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </InputShell>

            <InputShell label="Phone Number" required icon={FiPhone}>
              <input
                name="contact"
                placeholder="Enter phone number"
                value={formData.contact}
                onChange={handleChange}
                required
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <InputShell label="Email Address" icon={FiMail}>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <div className="sm:col-span-2">
              <InputShell label="Address" required icon={FiMapPin}>
                <input
                  name="address"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
                />
              </InputShell>
            </div>

            <InputShell label="Quantity" helperText="Enter available donated unit(s). These units will be added to stock for blood requests." icon={FiActivity}>
              <input
                type="number"
                min="0"
                name="donations"
                placeholder="Units donated"
                value={formData.donations}
                onChange={handleChange}
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <InputShell label="Last Donation Date" icon={FiCalendar}>
              <input
                type="date"
                name="lastDonationDate"
                value={formData.lastDonationDate}
                onChange={handleChange}
                className="h-14 w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <InputShell label="Occupation" icon={FiUsers}>
              <input
                name="occupation"
                placeholder="Enter occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </InputShell>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Medical Condition</label>
              <textarea
                name="medicalCondition"
                rows="4"
                placeholder="Any medical condition or remarks"
                value={formData.medicalCondition}
                onChange={handleChange}
                className="w-full rounded-2xl border border-red-100 bg-gradient-to-b from-white to-[#fffafa] px-4 py-4 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-red-100 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-gray-400">
                <span className="text-red-500">*</span> Required fields
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-red-50"
                >
                  <FiRefreshCw />
                  {editingDonor ? 'Cancel' : 'Reset'}
                </button>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d90e16] via-[#e10606] to-[#c80710] px-6 py-3 font-bold text-white shadow-[0_22px_38px_-22px_rgba(225,6,6,0.8)] transition hover:from-[#c90c14] hover:via-[#d70606] hover:to-[#b8060e]"
                >
                  <FiUserPlus />
                  {editingDonor ? 'Update Donor' : 'Register Donor'}
                </button>
              </div>
            </div>
          </form>
        </FormShowcaseCard>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-red-100 bg-gradient-to-b from-white to-[#fff8f8] p-6 shadow-[0_22px_44px_-34px_rgba(225,6,6,0.18)]">
            <h3 className="mb-5 text-2xl font-extrabold text-slate-900">Donor Summary</h3>

            <div className="grid grid-cols-2 gap-4">
              {donorSummaryCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-red-50 bg-gradient-to-b from-white to-[#fff7f7] p-4">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-rose-100">
                      <card.icon className="text-2xl text-red-600" />
                  </div>

                  <p className="text-sm font-semibold text-gray-500">{card.label}</p>
                  <h4 className="mt-1 text-3xl font-extrabold text-slate-900">{card.value}</h4>
                  <p className="mt-1 text-xs font-bold text-green-500">{card.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-red-100 bg-gradient-to-b from-white to-[#fff8f8] p-6 shadow-[0_22px_44px_-34px_rgba(225,6,6,0.18)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900">Recent Donors</h3>
              <button
                type="button"
                onClick={() => setShowAllDonors((prev) => !prev)}
                className="text-sm font-bold text-red-600"
              >
                {showAllDonors ? 'Show Less' : 'View All'}
              </button>
            </div>

            <div className="space-y-4">
              {recentDonors.length > 0 ? (
                recentDonors.map((donor) => (
                  <div
                    key={donor.id}
                    className="rounded-2xl border border-red-50 bg-gradient-to-r from-white to-[#fff8f8] p-3 transition hover:-translate-y-0.5 hover:border-red-100"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDonor(donor)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-rose-100 font-bold text-red-600">
                          {donor.name?.trim()?.charAt(0)?.toUpperCase() || 'D'}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">{donor.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600 shadow-sm">{donor.bloodType}</span>
                            <span className="text-xs text-gray-400">{formatCompactDate(donor.displayLastDonationDate)}</span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {Number(donor.donations || 0)} donation(s) recorded
                          </p>
                        </div>
                      </div>

                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </button>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(donor)}
                        className="action-button-secondary px-3 py-2 text-xs"
                      >
                        <FiEdit2 />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonorPendingDelete(donor)}
                        className="action-button-secondary px-3 py-2 text-xs text-rose-700"
                      >
                        <FiTrash2 />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#fafafa] px-4 py-8 text-center text-sm text-slate-400">
                  No donors yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-red-100 bg-gradient-to-b from-white to-[#fff8f8] p-6 shadow-[0_22px_44px_-34px_rgba(225,6,6,0.18)]">
            <h3 className="text-2xl font-extrabold text-slate-900">Quick Help</h3>

            <div className="mt-5 rounded-2xl border border-red-100 bg-gradient-to-r from-white to-[#fff7f7] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-rose-100 text-red-600">
                  <FiAlertCircle className="text-2xl" />
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-800">Need help?</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Check donation eligibility or contact support</p>
                  <button
                    type="button"
                    onClick={() => setShowEligibilityModal(true)}
                    className="mt-4 rounded-2xl bg-gradient-to-r from-[#d90e16] via-[#e10606] to-[#c80710] px-5 py-3 font-bold text-white shadow-[0_22px_38px_-22px_rgba(225,6,6,0.8)] hover:from-[#c90c14] hover:via-[#d70606] hover:to-[#b8060e]"
                  >
                    Check Eligibility
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default DonorRegistration;
