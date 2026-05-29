import { Router } from 'express';
import { BLOOD_EXPIRY_DAYS, BLOOD_GROUPS, ROLES } from '../constants/blood.js';
import { requireRole } from '../middleware/auth.js';
import { DonationHistory } from '../models/DonationHistory.js';
import { Donor } from '../models/Donor.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';
import { addDaysToDate } from '../utils/date.js';
import { nextModelNumericId, nextModelSequenceId } from '../utils/id.js';
import { writeAuditLog } from '../utils/audit.js';
import { badRequest, notFound } from '../utils/http.js';
import {
  assertBloodType,
  assertDateInput,
  assertGender,
  assertPositiveInteger,
  assertRequiredText,
  toNormalizedContact,
  toNormalizedValue,
  toOptionalNumber,
  toTrimmedString,
} from '../utils/validation.js';

const router = Router();
const DEFAULT_INVENTORY_VOLUME = 450;

const findDuplicateDonor = async ({
  name,
  contact,
  email,
  dateOfBirth,
  excludeId = null,
}) => {
  const donors = await Donor.find(excludeId ? { id: { $ne: excludeId } } : {}).lean();
  const normalizedName = toNormalizedValue(name);
  const normalizedContact = toNormalizedContact(contact);
  const normalizedEmail = toNormalizedValue(email);
  const normalizedDateOfBirth = toTrimmedString(dateOfBirth);

  return donors.find((donor) => {
    const sameName = toNormalizedValue(donor.name) === normalizedName;
    const sameContact = normalizedContact && toNormalizedContact(donor.contact) === normalizedContact;
    const sameEmail = normalizedEmail && toNormalizedValue(donor.email) === normalizedEmail;
    const sameDateOfBirth = normalizedDateOfBirth && toTrimmedString(donor.dateOfBirth) === normalizedDateOfBirth;

    return sameName && (sameContact || sameEmail || sameDateOfBirth);
  });
};

const buildDuplicateGroups = async () => {
  const donors = await Donor.find().sort({ id: 1 }).lean();
  const groups = new Map();

  donors.forEach((donor) => {
    const name = toNormalizedValue(donor.name);
    const contact = toNormalizedContact(donor.contact);
    const email = toNormalizedValue(donor.email);
    const dob = toTrimmedString(donor.dateOfBirth);
    const identity = contact || email || dob;
    if (!name || !identity) return;
    const key = `${name}::${identity}`;
    const existing = groups.get(key) || [];
    existing.push(donor);
    groups.set(key, existing);
  });

  return Array.from(groups.values()).filter((items) => items.length > 1);
};

const createInventoryUnitsForDonor = async ({ donor, quantity, collectionDate }) => {
  if (quantity <= 0) return;

  let nextInventoryId = await nextModelNumericId(InventoryUnit);
  const firstUnitId = await nextModelSequenceId(InventoryUnit, 'unitId', 'UNT');
  let nextSequenceNumber = Number(String(firstUnitId).split('-')[1] || 1001);

  const units = Array.from({ length: quantity }, () => {
    const unit = {
      id: nextInventoryId,
      unitId: `UNT-${nextSequenceNumber}`,
      bloodType: donor.bloodType,
      volume: DEFAULT_INVENTORY_VOLUME,
      collectionDate,
      expiryDate: addDaysToDate(collectionDate, BLOOD_EXPIRY_DAYS),
      status: 'Available',
      donorId: donor.donorId,
      donorName: donor.name,
    };

    nextInventoryId += 1;
    nextSequenceNumber += 1;
    return unit;
  });

  await InventoryUnit.insertMany(units);
};

const syncDonorInventoryUnits = async ({ donor, previousDonorId, previousBloodType, previousName, targetQuantity, collectionDate }) => {
  const linkedUnits = await InventoryUnit.find({ donorId: previousDonorId || donor.donorId }).sort({ id: 1 });
  const issuedUnits = linkedUnits.filter((unit) => unit.status === 'Issued');
  const availableUnits = linkedUnits.filter((unit) => unit.status !== 'Issued');

  if (targetQuantity < issuedUnits.length) {
    throw badRequest(`This donor already has ${issuedUnits.length} issued unit(s). Quantity cannot be reduced below that number.`);
  }

  const totalUnits = linkedUnits.length;
  const diff = targetQuantity - totalUnits;

  await Promise.all([
    InventoryUnit.updateMany(
      { donorId: previousDonorId || donor.donorId },
      {
        $set: {
          donorId: donor.donorId,
          donorName: donor.name,
          bloodType: donor.bloodType,
        },
      }
    ),
    previousBloodType !== donor.bloodType
      ? DonationHistory.updateMany({ donorId: donor.donorId }, { $set: { bloodType: donor.bloodType } })
      : Promise.resolve(),
    previousName !== donor.name
      ? DonationHistory.updateMany({ donorId: donor.donorId }, { $set: { donorName: donor.name } })
      : Promise.resolve(),
  ]);

  if (availableUnits.length > 0) {
    await InventoryUnit.updateMany(
      { id: { $in: availableUnits.map((unit) => unit.id) } },
      {
        $set: {
          collectionDate,
          expiryDate: addDaysToDate(collectionDate, BLOOD_EXPIRY_DAYS),
        },
      }
    );
  }

  if (diff > 0) {
    await createInventoryUnitsForDonor({ donor, quantity: diff, collectionDate });
    return;
  }

  if (diff < 0) {
    const unitsToRemove = availableUnits.slice(diff);
    if (unitsToRemove.length > 0) {
      await InventoryUnit.deleteMany({ id: { $in: unitsToRemove.map((unit) => unit.id) } });
    }
  }
};

router.get('/', async (_req, res) => {
  const donors = await Donor.find().sort({ id: 1 }).lean();
  res.json({ success: true, data: donors });
});

router.post('/', async (req, res, next) => {
  try {
    const age = assertPositiveInteger(req.body.age, 'Age must be between 18 and 65.');
    if (age < 18 || age > 65) {
      throw badRequest('Age must be between 18 and 65.');
    }

    const newDonor = {
      id: await nextModelNumericId(Donor),
      donorId: await nextModelSequenceId(Donor, 'donorId', 'DNR'),
      name: assertRequiredText(req.body.name, 'Name'),
      age,
      gender: assertGender(req.body.gender),
      bloodType: assertBloodType(req.body.bloodType),
      contact: toTrimmedString(req.body.contact),
      email: toTrimmedString(req.body.email),
      address: assertRequiredText(req.body.address, 'Address'),
      dateOfBirth: toTrimmedString(req.body.dateOfBirth),
      lastDonationDate: toTrimmedString(req.body.lastDonationDate),
      weightKg: toOptionalNumber(req.body.weightKg),
      heightCm: toOptionalNumber(req.body.heightCm),
      occupation: toTrimmedString(req.body.occupation),
      medicalCondition: toTrimmedString(req.body.medicalCondition),
      donations: Number.isFinite(Number(req.body.donations)) ? Math.max(Number(req.body.donations), 0) : 0,
    };

    if (!newDonor.contact) {
      throw badRequest('Name, gender, and contact are required.');
    }

    const duplicateDonor = await findDuplicateDonor(newDonor);
    if (duplicateDonor) {
      throw badRequest(`Duplicate donor detected. ${duplicateDonor.donorId} is already registered for this person.`);
    }

    if (newDonor.dateOfBirth) {
      assertDateInput(newDonor.dateOfBirth, 'Date of birth');
    }

    if (newDonor.donations > 0) {
      newDonor.lastDonationDate = assertDateInput(newDonor.lastDonationDate, 'Last donation date');
    }

    await Donor.create(newDonor);
    await createInventoryUnitsForDonor({
      donor: newDonor,
      quantity: newDonor.donations,
      collectionDate: newDonor.lastDonationDate,
    });
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'create',
      entityType: 'donor',
      entityId: newDonor.donorId,
      message: `Donor ${newDonor.donorId} was created.`,
      metadata: { bloodType: newDonor.bloodType, donations: newDonor.donations },
    });

    res.status(201).json({ success: true, data: newDonor });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const donorId = Number(req.params.id);
    const donor = await Donor.findOne({ id: donorId });

    if (!donor) {
      throw notFound('Donor not found.');
    }

    const age = assertPositiveInteger(req.body.age, 'Age must be between 18 and 65.');
    if (age < 18 || age > 65) {
      throw badRequest('Age must be between 18 and 65.');
    }

    const updates = {
      name: assertRequiredText(req.body.name, 'Name'),
      age,
      gender: assertGender(req.body.gender),
      bloodType: assertBloodType(req.body.bloodType),
      contact: toTrimmedString(req.body.contact),
      email: toTrimmedString(req.body.email),
      address: assertRequiredText(req.body.address, 'Address'),
      dateOfBirth: toTrimmedString(req.body.dateOfBirth),
      lastDonationDate: toTrimmedString(req.body.lastDonationDate),
      weightKg: toOptionalNumber(req.body.weightKg),
      heightCm: toOptionalNumber(req.body.heightCm),
      occupation: toTrimmedString(req.body.occupation),
      medicalCondition: toTrimmedString(req.body.medicalCondition),
      donations: Number.isFinite(Number(req.body.donations)) ? Math.max(Number(req.body.donations), 0) : Number(donor.donations || 0),
    };

    if (!updates.contact) {
      throw badRequest('Name, gender, and contact are required.');
    }

    const duplicateDonor = await findDuplicateDonor({ ...updates, excludeId: donorId });
    if (duplicateDonor) {
      throw badRequest(`Duplicate donor detected. ${duplicateDonor.donorId} is already registered for this person.`);
    }

    if (updates.dateOfBirth) {
      assertDateInput(updates.dateOfBirth, 'Date of birth');
    }

    if (updates.donations > 0) {
      updates.lastDonationDate = assertDateInput(updates.lastDonationDate, 'Last donation date');
    }

    const previousDonorId = donor.donorId;
    const previousName = donor.name;
    const previousBloodType = donor.bloodType;

    Object.assign(donor, updates);
    await donor.save();
    await syncDonorInventoryUnits({
      donor: donor.toObject(),
      previousDonorId,
      previousBloodType,
      previousName,
      targetQuantity: updates.donations,
      collectionDate: updates.lastDonationDate,
    });
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'update',
      entityType: 'donor',
      entityId: donor.donorId,
      message: `Donor ${donor.donorId} was updated.`,
      metadata: { bloodType: donor.bloodType, donations: donor.donations },
    });

    res.json({ success: true, data: donor.toObject() });
  } catch (error) {
    next(error);
  }
});

router.get('/duplicates', requireRole(ROLES.ADMINISTRATOR), async (_req, res, next) => {
  try {
    const duplicateGroups = await buildDuplicateGroups();
    const data = await Promise.all(
      duplicateGroups.map(async (group) => {
        const primary = group[0];
        const reviewed = await Promise.all(
          group.map(async (donor) => {
            const [linkedInventoryCount, linkedHistoryCount] = await Promise.all([
              InventoryUnit.countDocuments({ donorId: donor.donorId }),
              DonationHistory.countDocuments({ donorId: donor.donorId }),
            ]);

            return {
              ...donor,
              linkedInventoryCount,
              linkedHistoryCount,
              canDeleteDuplicate: donor.id !== primary.id && linkedInventoryCount === 0 && linkedHistoryCount === 0,
            };
          })
        );

        return {
          key: `${primary.donorId}-${reviewed.length}`,
          primaryId: primary.id,
          primaryDonorId: primary.donorId,
          donors: reviewed,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/duplicates/:primaryId/cleanup', requireRole(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const primaryId = Number(req.params.primaryId);
    const duplicateIds = Array.isArray(req.body.duplicateIds)
      ? req.body.duplicateIds.map((value) => Number(value)).filter((value) => Number.isInteger(value))
      : [];

    if (!Number.isInteger(primaryId) || duplicateIds.length === 0) {
      throw badRequest('Primary donor and duplicate donor IDs are required.');
    }

    const primaryDonor = await Donor.findOne({ id: primaryId }).lean();
    if (!primaryDonor) {
      throw notFound('Primary donor not found.');
    }

    const duplicates = await Donor.find({ id: { $in: duplicateIds } }).lean();
    const removableIds = [];

    for (const donor of duplicates) {
      const [linkedInventoryCount, linkedHistoryCount] = await Promise.all([
        InventoryUnit.countDocuments({ donorId: donor.donorId }),
        DonationHistory.countDocuments({ donorId: donor.donorId }),
      ]);

      if (linkedInventoryCount > 0 || linkedHistoryCount > 0) {
        continue;
      }

      removableIds.push(donor.id);
    }

    if (removableIds.length === 0) {
      throw badRequest('No duplicate donor records were safe to remove.');
    }

    const removableDonors = duplicates.filter((item) => removableIds.includes(item.id));
    await Donor.deleteMany({ id: { $in: removableIds } });
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'cleanup-duplicates',
      entityType: 'donor',
      entityId: primaryDonor.donorId,
      message: `Duplicate donor cleanup completed for ${primaryDonor.donorId}.`,
      metadata: {
        removedDonorIds: removableDonors.map((item) => item.donorId),
        primaryDonorId: primaryDonor.donorId,
      },
    });

    res.json({
      success: true,
      message: `${removableIds.length} duplicate donor record(s) removed.`,
      data: {
        removedIds: removableIds,
        removedDonorIds: removableDonors.map((item) => item.donorId),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const donorId = Number(req.params.id);
    const donor = await Donor.findOne({ id: donorId });

    if (!donor) {
      throw notFound('Donor not found.');
    }

    const [linkedInventory, hasHistory] = await Promise.all([
      InventoryUnit.find({ donorId: donor.donorId }).lean(),
      DonationHistory.exists({ donorId: donor.donorId }),
    ]);
    const hasInventory = linkedInventory.length > 0;
    const deletedRequestIds = [];

    if (hasInventory || hasHistory) {
      if (req.user?.role !== ROLES.ADMINISTRATOR) {
        throw badRequest('This donor is linked to inventory or donation history and cannot be deleted.');
      }

      const linkedUnitIds = linkedInventory.map((item) => item.unitId);
      const linkedRequests = linkedUnitIds.length > 0
        ? await TransfusionRequest.find({ unitIdsUsed: { $in: linkedUnitIds } }).lean()
        : [];
      deletedRequestIds.push(...linkedRequests.map((item) => item.transfusionId));

      await Promise.all([
        DonationHistory.deleteMany({ donorId: donor.donorId }),
        InventoryUnit.deleteMany({ donorId: donor.donorId }),
        linkedRequests.length > 0
          ? TransfusionRequest.deleteMany({ id: { $in: linkedRequests.map((item) => item.id) } })
          : Promise.resolve(),
      ]);
    }

    await Donor.deleteOne({ id: donorId });
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: hasInventory || hasHistory ? 'force-delete' : 'delete',
      entityType: 'donor',
      entityId: donor.donorId,
      message:
        hasInventory || hasHistory
          ? `Donor ${donor.donorId} was force deleted with linked records removed.`
          : `Donor ${donor.donorId} was deleted.`,
      metadata: {
        linkedInventoryUnits: linkedInventory.map((item) => item.unitId),
        deletedRequestIds,
        hadHistory: Boolean(hasHistory),
      },
    });
    res.json({ success: true, message: 'Donor deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/donations', async (req, res, next) => {
  try {
    const donorId = Number(req.params.id);
    const donor = await Donor.findOne({ id: donorId });

    if (!donor) {
      throw notFound('Donor not found.');
    }

    const donationDate = new Date().toISOString().split('T')[0];
    const sameDayDonation = await DonationHistory.findOne({
      donorId: donor.donorId,
      donationDate,
    });

    if (sameDayDonation) {
      throw badRequest('A donation for this donor has already been recorded today.');
    }

    donor.donations = Number(donor.donations || 0) + 1;
    await donor.save();

    const historyEntry = {
      id: await nextModelNumericId(DonationHistory),
      historyId: await nextModelSequenceId(DonationHistory, 'historyId', 'HIS'),
      donorId: donor.donorId,
      donorRecordId: donor.id,
      donorName: donor.name,
      bloodType: donor.bloodType,
      donationDate,
      notes: 'Donation recorded from donor history workflow',
    };
    await DonationHistory.create(historyEntry);

    res.json({ success: true, data: donor.toObject() });
  } catch (error) {
    next(error);
  }
});

export default router;
