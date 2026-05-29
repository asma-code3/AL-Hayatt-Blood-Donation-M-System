import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertBloodType,
  assertDateInput,
  assertPositiveInteger,
  assertStrongPassword,
  assertUsername,
  isValidDateInput,
} from './validation.js';

test('assertUsername normalizes and validates usernames', () => {
  assert.equal(assertUsername(' Admin.User '), 'admin.user');
  assert.throws(() => assertUsername('ab'));
  assert.throws(() => assertUsername('bad user'));
});

test('assertStrongPassword accepts strong passwords and rejects weak ones', () => {
  assert.equal(assertStrongPassword('Admin@123'), 'Admin@123');
  assert.throws(() => assertStrongPassword('weak'));
});

test('assertBloodType only accepts supported blood groups', () => {
  assert.equal(assertBloodType('A+'), 'A+');
  assert.throws(() => assertBloodType('X'));
});

test('date helpers only allow valid YYYY-MM-DD values', () => {
  assert.equal(isValidDateInput('2026-05-24'), true);
  assert.equal(isValidDateInput('05/24/2026'), false);
  assert.equal(assertDateInput('2026-05-24', 'Donation date'), '2026-05-24');
  assert.throws(() => assertDateInput('2026-99-99', 'Donation date'));
});

test('assertPositiveInteger enforces minimum integer values', () => {
  assert.equal(assertPositiveInteger(3, 'bad'), 3);
  assert.throws(() => assertPositiveInteger(0, 'bad'));
  assert.throws(() => assertPositiveInteger(1.5, 'bad'));
});
