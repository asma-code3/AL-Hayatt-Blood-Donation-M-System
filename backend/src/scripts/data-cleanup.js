import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { initializeDatabase } from '../db/database.js';
import { applyDataIntegrityCleanup, collectDataIntegrityReport } from '../utils/data-integrity.js';

const shouldApply = process.argv.includes('--apply');

const formatReport = (report) => ({
  duplicateHistoryGroups: report.duplicateHistoryGroups.length,
  donorSyncChanges: report.donorSyncChanges.length,
  inventoryMismatches: report.inventoryMismatches.length,
  requestPatientMismatches: report.requestPatientMismatches.length,
});

const run = async () => {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is missing. Add it to your backend .env file.');
  }

  await initializeDatabase();

  const report = shouldApply ? await applyDataIntegrityCleanup() : await collectDataIntegrityReport();
  console.log(JSON.stringify({ mode: shouldApply ? 'apply' : 'report', summary: formatReport(report), report }, null, 2));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Data cleanup failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
