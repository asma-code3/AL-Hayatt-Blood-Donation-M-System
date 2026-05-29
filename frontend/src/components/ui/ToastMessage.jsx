import React, { useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';

const exactMessages = {
  'Login failed': 'We could not log you in. Check your username, password, and role.',
  'Invalid username or password.': 'The username or password is not correct.',
  'Username and password are required.': 'Enter both your username and password.',
  'Selected role does not match this account.': 'This account does not use the selected role.',
  'Too many authentication attempts. Please wait and try again.': 'Too many tries. Please wait a few minutes and try again.',
  'Account created successfully.': 'Account created. You can log in now.',
  'Account created successfully': 'Account created. You can log in now.',
  'Password reset successfully.': 'Password reset. You can use the new password now.',
  'Password updated successfully.': 'Password updated. Use the new password next time.',
  'Unable to reset password.': 'We could not reset the password. Check the details and try again.',
  'Registration failed.': 'We could not create the account. Check the details and try again.',
  'Passwords do not match': 'The two passwords do not match.',
  'Passwords do not match.': 'The two passwords do not match.',
  'New password and confirmation do not match.': 'The new password and confirmation do not match.',
  'Select a user first.': 'Choose a user first.',
  'Date of birth must produce an age between 18 and 65.': 'The donor must be between 18 and 65 years old.',
  'Age must be between 18 and 65.': 'The donor must be between 18 and 65 years old.',
  'Name, gender, and contact are required.': 'Add the donor name, gender, and contact number.',
  'Selected donor was not found.': 'Choose a valid donor and try again.',
  'Selected patient was not found.': 'Choose a valid patient and try again.',
  'Donor ID not found. Register the donor first.': 'This donor ID is not registered yet.',
  'Enter a valid blood group and volume.': 'Choose a valid blood group and enter the volume.',
  'Inventory blood group must match the selected donor blood group.': 'The unit blood group must match the donor blood group.',
  'Issued inventory units cannot be edited.': 'This unit is already issued, so it cannot be edited.',
  'Issued units cannot be edited.': 'This unit is already issued, so it cannot be edited.',
  'This patient is linked to blood requests and cannot be deleted.': 'This patient has blood requests, so delete those requests first.',
  'This donor is linked to inventory or donation history and cannot be deleted.': 'This donor has inventory or history records, so remove those records first.',
  'The requested blood group is not available in the required quantity.': 'There is not enough available stock for this blood group.',
  'A donation for this donor has already been recorded today.': 'A donation for this donor is already recorded today.',
  'This donor already has a donation history entry for the selected date.': 'This donor already has a donation recorded on that date.',
  'No safe duplicate records were found in this group.': 'No removable duplicate records were found in this group.',
  'No duplicate donor records were safe to remove.': 'No duplicate donor records can be safely removed.',
  'Unable to load audit logs.': 'We could not load the audit logs right now.',
  'Unable to load duplicate donor records.': 'We could not load duplicate donor records right now.',
  'Unable to clean duplicate records.': 'We could not clean duplicate records right now.',
  'Duplicate donor cleanup completed.': 'Duplicate donor cleanup is complete.',
  'Print dialog opened.': 'Print window opened.',
  'Word report downloaded successfully.': 'Word report downloaded.',
  'Excel report downloaded successfully.': 'Excel report downloaded.',
};

const actionMessages = [
  {
    pattern: /^(.+) was created successfully\.$/,
    build: ([, item]) => `${item} has been created.`,
  },
  {
    pattern: /^(.+) was saved successfully\.$/,
    build: ([, item]) => `${item} has been saved.`,
  },
  {
    pattern: /^(.+) was updated successfully\.$/,
    build: ([, item]) => `${item} has been updated.`,
  },
  {
    pattern: /^(.+) was deleted successfully\.$/,
    build: ([, item]) => `${item} has been deleted.`,
  },
  {
    pattern: /^(.+) was issued successfully\.$/,
    build: ([, item]) => `${item} has been issued.`,
  },
  {
    pattern: /^Patient record #(.+) was created successfully\.$/,
    build: ([, id]) => `Patient record #${id} has been created.`,
  },
  {
    pattern: /^Patient record #(.+) was updated successfully\.$/,
    build: ([, id]) => `Patient record #${id} has been updated.`,
  },
  {
    pattern: /^Patient record #(.+) was deleted successfully\.$/,
    build: ([, id]) => `Patient record #${id} has been deleted.`,
  },
  {
    pattern: /^A donation was recorded successfully for (.+)\.$/,
    build: ([, name]) => `Donation recorded for ${name}.`,
  },
  {
    pattern: /^(.+) was updated to (.+) successfully\.$/,
    build: ([, username, role]) => `${username}'s role is now ${role}.`,
  },
  {
    pattern: /^The password for (.+) was reset successfully\.$/,
    build: ([, username]) => `Password reset for ${username}.`,
  },
  {
    pattern: /^(.+) was created by admin\.$/,
    build: ([, username]) => `${username} has been added.`,
  },
  {
    pattern: /^User (.+) removed successfully\.$/,
    build: ([, username]) => `${username} has been removed.`,
  },
  {
    pattern: /^Duplicate donor detected\. (.+) is already registered for this person\.$/,
    build: ([, donorId]) => `This person is already registered as ${donorId}.`,
  },
  {
    pattern: /^This donor already has (.+) issued unit\(s\)\. Quantity cannot be reduced below that number\.$/,
    build: ([, count]) => `This donor already has ${count} issued unit(s), so the quantity cannot be lower.`,
  },
  {
    pattern: /^Unable to (save|update|delete|record|issue|create|remove|load|clean) (.+)\.$/,
    build: ([, action, item]) => `We could not ${action} ${item}. Please check the details and try again.`,
  },
];

const getReadableMessage = (text) => {
  const message = String(text || '').trim();
  if (!message) return '';

  if (exactMessages[message]) return exactMessages[message];

  const matchedAction = actionMessages.find(({ pattern }) => pattern.test(message));
  if (matchedAction) {
    return matchedAction.build(message.match(matchedAction.pattern));
  }

  return message;
};

const ToastMessage = ({ type = 'success', text = '', onClose }) => {
  const readableText = getReadableMessage(text);

  useEffect(() => {
    if (!readableText || !onClose) return undefined;
    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [readableText, onClose]);

  if (!readableText) return null;

  return (
    <div className="toast-notice-shell" role="status" aria-live="polite">
      <div className={`toast-notice ${type === 'success' ? 'toast-notice-success' : 'toast-notice-error'}`}>
        <span className="toast-notice-icon">
          {type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
        </span>
        <span className="toast-notice-text">{readableText}</span>
        <button type="button" onClick={onClose} className="toast-notice-close" aria-label="Close message">
          <FiX />
        </button>
      </div>
    </div>
  );
};

export default ToastMessage;
