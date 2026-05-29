import React, { useMemo, useState } from 'react';
import { FiActivity, FiCalendar, FiClipboard, FiEdit2, FiRefreshCw, FiSend, FiTrash2 } from 'react-icons/fi';
import { ConfirmDialog, FormShowcaseCard, ToastMessage } from '../components/ui';
import { useBloodContext } from '../Context/blood-context';
import { getNextSequenceId } from '../utils/formDisplay';

const initialRequest = {
  patientId: '',
  bloodGroupReq: '',
  quantity: '',
  transfusionDate: '',
  doctorName: '',
};

const normalizeForm = (request) => ({
  patientId: request.patientId?.toString() || '',
  bloodGroupReq: request.bloodGroupReq || '',
  quantity: request.quantity?.toString() || '',
  transfusionDate: request.transfusionDate || '',
  doctorName: request.doctorName || '',
});

const BloodRequests = () => {
  const { patients, requests, addTransfusionRequest, updateTransfusionRequest, deleteTransfusionRequest } = useBloodContext();
  const [reqData, setReqData] = useState(initialRequest);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [editingRequest, setEditingRequest] = useState(null);
  const [requestPendingDelete, setRequestPendingDelete] = useState(null);

  const orderedRequests = useMemo(() => requests.slice().reverse(), [requests]);
  const nextRequestReference = useMemo(() => getNextSequenceId(requests, 'transfusionId', 'TRF'), [requests]);
  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === reqData.patientId) || null,
    [patients, reqData.patientId]
  );

  const handleRequest = async (e) => {
    e.preventDefault();
    const payload = { ...reqData, quantity: Number(reqData.quantity) };
    const result = editingRequest
      ? await updateTransfusionRequest(editingRequest.id, payload)
      : await addTransfusionRequest(payload);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      text: editingRequest ? `${result.request.transfusionId} was updated successfully.` : `${result.request.transfusionId} was issued successfully.`,
    });
    setReqData(initialRequest);
    setEditingRequest(null);
  };

  const handleReset = () => {
    setReqData(initialRequest);
    setFeedback({ type: '', text: '' });
    setEditingRequest(null);
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setReqData(normalizeForm(request));
    setFeedback({ type: '', text: '' });
  };

  const handleDelete = async (request) => {
    setRequestPendingDelete(request);
  };

  const confirmDelete = async () => {
    if (!requestPendingDelete) return;

    const result = await deleteTransfusionRequest(requestPendingDelete.id);
    setFeedback(
      result.success
        ? { type: 'success', text: `${requestPendingDelete.transfusionId} was deleted successfully.` }
        : { type: 'error', text: result.error }
    );
    if (result.success && editingRequest?.id === requestPendingDelete.id) {
      handleReset();
    }
    setRequestPendingDelete(null);
  };

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(requestPendingDelete)}
        title="Delete blood request"
        message={requestPendingDelete ? `Are you sure you want to delete request ${requestPendingDelete.transfusionId}? Blood stock will be restored.` : ''}
        confirmLabel="Delete request"
        onConfirm={confirmDelete}
        onCancel={() => setRequestPendingDelete(null)}
      />
      {/* <section className="grid gap-4 sm:grid-cols-2">
        <article className="metric-card">
          <p className="metric-kicker">
            <FiSend />
            Total processed requests
          </p>
          <p className="metric-value">{orderedRequests.length}</p>
          <p className="metric-note">All transfusion records created so far.</p>
        </article>
        <article className="metric-card">
          <p className="metric-kicker">
            <FiActivity />
            Outstanding follow-up
          </p>
          <p className="metric-value text-amber-600 ">{pendingCount}</p>
          <p className="metric-note">Cases that may still need review or additional action.</p>
        </article>
      </section> */}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <FormShowcaseCard
          icon={FiClipboard}
          accentIcon={FiSend}
          title="Blood Request "
          subtitle="Capture transfusion demand, quantity and scheduling details"
          metaLabel="Request Ref"
          metaValue={editingRequest?.transfusionId || nextRequestReference}
        >
          <form onSubmit={handleRequest} className="form-grid sm:grid-cols-2">
            <div>
              <label className="field-label">Request ID</label>
              <input value={editingRequest?.transfusionId || nextRequestReference} readOnly className="form-field bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="field-label">Patient</label>
              <select
                value={reqData.patientId}
                onChange={(e) => setReqData((prev) => ({ ...prev, patientId: e.target.value, bloodGroupReq: '' }))}
                className="form-field"
                required
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    PT-{String(patient.id).padStart(4, '0')} - {patient.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Blood group needed</label>
              <input
                value={selectedPatient?.bloodType || reqData.bloodGroupReq}
                readOnly
                placeholder="Select patient first"
                className="form-field bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input
                type="number"
                min="1"
                placeholder="Units needed"
                value={reqData.quantity}
                onChange={(e) => setReqData((prev) => ({ ...prev, quantity: e.target.value }))}
                className="form-field"
                required
              />
            </div>
            <div>
              <label className="field-label">Transfusion date</label>
              <div className="relative">
                <FiCalendar className="form-field-icon" />
                <input
                  type="date"
                  value={reqData.transfusionDate}
                  onChange={(e) => setReqData((prev) => ({ ...prev, transfusionDate: e.target.value }))}
                  className="form-field-with-icon"
                  required
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Doctor name</label>
              <input
                type="text"
                placeholder="Optional doctor reference"
                value={reqData.doctorName}
                onChange={(e) => setReqData((prev) => ({ ...prev, doctorName: e.target.value }))}
                className="form-field"
              />
            </div>

            <div className="clinical-form-actions sm:col-span-2">
              <button type="button" onClick={handleReset} className="action-button-secondary">
                <FiRefreshCw />
                {editingRequest ? 'Cancel edit' : 'Reset'}
              </button>
              <button type="submit" className="action-button action-button-info">
                <FiSend />
                {editingRequest ? 'Update blood request' : 'Issue blood request'}
              </button>
            </div>
          </form>
        </FormShowcaseCard>

        <article className="section-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Processed transfusion requests</h3>
              <p className="panel-copy">A readable history of patient requests, dates, and units issued.</p>
            </div>
            <span className="soft-chip">{orderedRequests.length} processed</span>
          </div>
          <div className="space-y-3">
            {orderedRequests.length === 0 && (
              <div className="empty-state">
                <p className="empty-state-title">No transfusion requests recorded yet.</p>
                <p className="empty-state-copy">Requests created from the form will appear here automatically.</p>
              </div>
            )}
            {orderedRequests.map((req) => (
              <div key={req.transfusionId} className="record-card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{req.patientName}</p>
                    <p className="mt-1 text-xs text-slate-500">{req.transfusionId}</p>
                  </div>
                  <span className="status-chip status-chip-success">{req.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{`${req.bloodGroupReq} | ${req.quantity} unit(s) | ${req.date}`}</p>
                <p className="mt-2 text-sm text-slate-500">Doctor: {req.doctorName || 'Not provided'}</p>
                <p className="mt-1 text-sm text-slate-500">Units used: {req.unitIdsUsed.join(', ')}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => handleEdit(req)} className="action-button-secondary px-3 py-2 text-xs">
                    <FiEdit2 />
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(req)} className="action-button-secondary px-3 py-2 text-xs text-rose-700">
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

export default BloodRequests;
