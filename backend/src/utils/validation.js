import { ALLOWED_ROLES, BLOOD_GROUPS } from '../constants/blood.js';
import { badRequest } from './http.js';

export const GENDERS = ['Male', 'Female'];

export const toTrimmedString = (value) => String(value || '').trim();

export const normalizeUsername = (value) => toTrimmedString(value).toLowerCase();

export const toNormalizedValue = (value) => toTrimmedString(value).toLowerCase();

export const toNormalizedContact = (value) => toTrimmedString(value).replace(/\D/g, '');

export const toOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isStrongPassword = (password) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export const isValidDateInput = (value) => {
  const text = toTrimmedString(value);
  if (!text) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(text);
  return !Number.isNaN(parsed.getTime());
};

export const assertRequiredText = (value, fieldName, { minLength = 1 } = {}) => {
  const text = toTrimmedString(value);
  if (text.length < minLength) {
    throw badRequest(`${fieldName} is required.`);
  }
  return text;
};

export const assertUsername = (value) => {
  const username = normalizeUsername(value);
  if (username.length < 3) {
    throw badRequest('Username must be at least 3 characters long.');
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw badRequest('Username may only contain letters, numbers, dots, underscores, or hyphens.');
  }
  return username;
};

export const assertStrongPassword = (password) => {
  const text = String(password || '');
  if (!isStrongPassword(text)) {
    throw badRequest(
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
    );
  }
  return text;
};

export const assertBloodType = (value) => {
  const bloodType = toTrimmedString(value);
  if (!BLOOD_GROUPS.includes(bloodType)) {
    throw badRequest('Valid blood type is required.');
  }
  return bloodType;
};

export const assertRole = (value) => {
  const role = toTrimmedString(value);
  if (!ALLOWED_ROLES.includes(role)) {
    throw badRequest('Valid role is required.');
  }
  return role;
};

export const assertGender = (value) => {
  const gender = toTrimmedString(value);
  if (!GENDERS.includes(gender)) {
    throw badRequest('Valid gender is required.');
  }
  return gender;
};

export const assertPositiveInteger = (value, message, { min = 1 } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw badRequest(message);
  }
  return parsed;
};

export const assertPositiveNumber = (value, message, { min = 0.01 } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw badRequest(message);
  }
  return parsed;
};

export const assertDateInput = (value, fieldName = 'Date') => {
  const dateValue = toTrimmedString(value);
  if (!isValidDateInput(dateValue)) {
    throw badRequest(`${fieldName} must be a valid date.`);
  }
  return dateValue;
};
