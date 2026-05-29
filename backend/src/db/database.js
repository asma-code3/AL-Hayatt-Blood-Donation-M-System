import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { AuditLog } from '../models/AuditLog.js';
import { DonationHistory } from '../models/DonationHistory.js';
import { Donor } from '../models/Donor.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { Patient } from '../models/Patient.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, '..', 'data', 'seed.json');

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const createMongoConnectionError = (error) => {
  const isSrvLookupFailure =
    error?.code === 'ECONNREFUSED' &&
    error?.syscall === 'querySrv' &&
    typeof error?.hostname === 'string';

  if (!isSrvLookupFailure) {
    return error;
  }

  return new Error(
    [
      'Unable to resolve the MongoDB Atlas SRV record.',
      `DNS lookup failed for ${error.hostname}.`,
      'This usually means your network or DNS provider is blocking SRV lookups for mongodb+srv:// URLs.',
      'Use one of these fixes:',
      '1. Replace MONGODB_URI with Atlas\' "Standard connection string" (mongodb://...) instead of the SRV version.',
      '2. Switch to a DNS server that supports SRV lookups, such as Google (8.8.8.8) or Cloudflare (1.1.1.1).',
      '3. Use a local MongoDB instance for development.',
    ].join(' ')
  );
};

const sanitizeUsers = async (db) => {
  const users = await Promise.all(
    (db.users || []).map(async (user) => {
      if (user.passwordHash) {
        return { ...user };
      }

      const passwordHash = await bcrypt.hash(user.password, 10);
      const { password, ...rest } = user;
      return { ...rest, passwordHash };
    })
  );

  return { ...db, users };
};

const ensureSystemUser = async ({ username, password, role, shouldSyncPassword = false }) => {
  const existingUser = await User.findOne({
    $or: [{ username }, { role }],
  });

  if (existingUser) {
    existingUser.username = username;
    existingUser.role = role;

    if (shouldSyncPassword) {
      existingUser.passwordHash = await bcrypt.hash(password, 10);
    }

    await existingUser.save();
    return;
  }

  const highestIdUser = await User.findOne().sort({ id: -1 }).lean();
  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    id: (highestIdUser?.id || 0) + 1,
    username,
    passwordHash,
    role,
  });
};

export const initializeDatabase = async () => {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is missing. Add it to your backend .env file.');
  }

  try {
    await mongoose.connect(env.mongodbUri);
  } catch (error) {
    throw createMongoConnectionError(error);
  }
  await Promise.all([
    User.syncIndexes(),
    Donor.syncIndexes(),
    Patient.syncIndexes(),
    InventoryUnit.syncIndexes(),
    TransfusionRequest.syncIndexes(),
    DonationHistory.syncIndexes(),
    AuditLog.syncIndexes(),
  ]);

  await Promise.all([
    User.createCollection(),
    Donor.createCollection(),
    Patient.createCollection(),
    InventoryUnit.createCollection(),
    TransfusionRequest.createCollection(),
    DonationHistory.createCollection(),
    AuditLog.createCollection(),
  ]).catch(() => {});

  const [donorsCount, patientsCount, inventoryCount, requestsCount, historyCount] = await Promise.all([
    Donor.countDocuments(),
    Patient.countDocuments(),
    InventoryUnit.countDocuments(),
    TransfusionRequest.countDocuments(),
    DonationHistory.countDocuments(),
  ]);

  const seed = await sanitizeUsers(await readJson(seedPath));
  const tasks = [];

  if (donorsCount === 0) tasks.push(Donor.insertMany(seed.donors));
  if (patientsCount === 0) tasks.push(Patient.insertMany(seed.patients));
  if (inventoryCount === 0) tasks.push(InventoryUnit.insertMany(seed.inventory));
  if (requestsCount === 0 && (seed.requests || []).length > 0) tasks.push(TransfusionRequest.insertMany(seed.requests));
  if (historyCount === 0 && (seed.history || []).length > 0) tasks.push(DonationHistory.insertMany(seed.history));

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  await ensureSystemUser({
    username: env.adminUsername,
    password: env.adminPassword,
    role: env.adminRole,
    shouldSyncPassword: env.adminPasswordConfigured,
  });
  await ensureSystemUser({
    username: env.staffUsername,
    password: env.staffPassword,
    role: env.staffRole,
    shouldSyncPassword: env.staffPasswordConfigured,
  });
  await ensureSystemUser({
    username: env.doctorUsername,
    password: env.doctorPassword,
    role: env.doctorRole,
    shouldSyncPassword: env.doctorPasswordConfigured,
  });
};
