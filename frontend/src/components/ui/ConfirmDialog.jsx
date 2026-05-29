import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmDialog = ({
  open = false,
  title = 'Confirm action',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmClassName =
    tone === 'danger'
      ? 'action-button action-button-danger'
      : 'action-button action-button-info';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="panel-icon-badge panel-icon-danger">
            <FiAlertTriangle />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="panel-title">{title}</h3>
            <p className="panel-copy mt-2">{message}</p>
          </div>
        </div>

        <div className="clinical-form-actions mt-6 border-t-0 pt-0">
          <button type="button" onClick={onCancel} className="action-button-secondary">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClassName}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
