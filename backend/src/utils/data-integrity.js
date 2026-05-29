import { DonationHistory } from '../models/DonationHistory.js';
import { Donor } from '../models/Donor.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { Patient } from '../models/Patient.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';

const getLatestDate = (values) =>
  values
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || '';

export const collectDataIntegrityReport = async () => {
  const [donors, history, inventory, patients, requests] = await Promise.all([
    Donor.find().sort({ id: 1 }),
    DonationHistory.find().sort({ id: 1 }),
    InventoryUnit.find().sort({ id: 1 }),
    Patient.find().sort({ id: 1 }).lean(),
    TransfusionRequest.find().sort({ id: 1 }),
  ]);

  const duplicateHistoryGroups = [];
  const historyGroups = new Map();
  history.forEach((entry) => {
    const key = `${entry.donorId}::${entry.donationDate}`;
    const items = historyGroups.get(key) || [];
    items.push(entry);
    historyGroups.set(key, items);
  });
  historyGroups.forEach((entries, key) => {
    if (entries.length > 1) {
      duplicateHistoryGroups.push({
        key,
        keeperId: entries[0].id,
        duplicateIds: entries.slice(1).map((entry) => entry.id),
        duplicateHistoryIds: entries.slice(1).map((entry) => entry.historyId),
      });
    }
  });

  const donorSyncChanges = donors
    .map((donor) => {
      const donorHistory = history.filter((entry) => entry.donorId === donor.donorId);
      const donorInventory = inventory.filter((item) => item.donorId === donor.donorId);
      const expectedDonations = donorHistory.length;
      const expectedLastDonationDate = getLatestDate([
        ...donorHistory.map((entry) => entry.donationDate),
        ...donorInventory.map((item) => item.collectionDate),
      ]);

      return {
        donorId: donor.donorId,
        updateDonations: donor.donations !== expectedDonations,
        updateLastDonationDate: (donor.lastDonationDate || '') !== expectedLastDonationDate,
        expectedDonations,
        expectedLastDonationDate,
      };
    })
    .filter((item) => item.updateDonations || item.updateLastDonationDate);

  const inventoryMismatches = inventory
    .map((unit) => {
      const donor = donors.find((item) => item.donorId === unit.donorId);
      if (!donor) {
        return {
          unitId: unit.unitId,
          donorId: unit.donorId,
          issue: 'missing-donor',
        };
      }

      const issues = [];
      if (unit.donorName !== donor.name) issues.push('donorName');
      if (unit.bloodType !== donor.bloodType) issues.push('bloodType');
      if (issues.length === 0) return null;

      return {
        unitId: unit.unitId,
        donorId: unit.donorId,
        issue: issues.join(','),
      };
    })
    .filter(Boolean);

  const requestPatientMismatches = requests
    .map((request) => {
      const patient = patients.find((item) => item.id === request.patientId);
      if (!patient) {
        return {
          transfusionId: request.transfusionId,
          patientId: request.patientId,
          issue: 'missing-patient',
        };
      }

      if (request.patientName !== patient.name) {
        return {
          transfusionId: request.transfusionId,
          patientId: request.patientId,
          issue: 'patientName',
        };
      }

      return null;
    })
    .filter(Boolean);

  return {
    duplicateHistoryGroups,
    donorSyncChanges,
    inventoryMismatches,
    requestPatientMismatches,
  };
};

export const applyDataIntegrityCleanup = async () => {
  const report = await collectDataIntegrityReport();

  for (const group of report.duplicateHistoryGroups) {
    if (group.duplicateIds.length > 0) {
      await DonationHistory.deleteMany({ id: { $in: group.duplicateIds } });
    }
  }

  for (const change of report.donorSyncChanges) {
    await Donor.updateOne(
      { donorId: change.donorId },
      {
        $set: {
          donations: change.expectedDonations,
          lastDonationDate: change.expectedLastDonationDate,
        },
      }
    );
  }

  for (const mismatch of report.inventoryMismatches) {
    if (mismatch.issue === 'missing-donor') continue;
    const donor = await Donor.findOne({ donorId: mismatch.donorId }).lean();
    if (!donor) continue;
    await InventoryUnit.updateOne(
      { unitId: mismatch.unitId },
      {
        $set: {
          donorName: donor.name,
          bloodType: donor.bloodType,
        },
      }
    );
  }

  for (const mismatch of report.requestPatientMismatches) {
    if (mismatch.issue !== 'patientName') continue;
    const patient = await Patient.findOne({ id: mismatch.patientId }).lean();
    if (!patient) continue;
    await TransfusionRequest.updateOne(
      { transfusionId: mismatch.transfusionId },
      { $set: { patientName: patient.name } }
    );
  }

  return report;
};
