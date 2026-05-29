import { Router } from 'express';
import { BLOOD_EXPIRY_DAYS, BLOOD_GROUPS, ROLES } from '../constants/blood.js';
import { requireRole } from '../middleware/auth.js';
import { addDaysToDate } from '../utils/date.js';
import { Donor } from '../models/Donor.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';
import { nextModelNumericId, nextModelSequenceId } from '../utils/id.js';
import { writeAuditLog } from '../utils/audit.js';
import { badRequest, notFound } from '../utils/http.js';
import { assertDateInput, assertPositiveNumber, assertRequiredText } from '../utils/validation.js';

const router = Router();

const createInventorySummary = (inventory) =>
  BLOOD_GROUPS.map((bloodType) => ({
    bloodType,
    quantity: inventory.filter((item) => item.bloodType === bloodType && item.status === 'Available').length,
  }));

const syncDonorInventorySnapshot = async (donorId) => {
  if (!donorId) return;

  const donor = await Donor.findOne({ donorId });
  if (!donor) return;

  const linkedUnits = await InventoryUnit.find({ donorId }).sort({ collectionDate: -1, id: -1 }).lean();
  donor.donations = linkedUnits.length;

  if (linkedUnits.length > 0) {
    donor.lastDonationDate = linkedUnits[0].collectionDate || donor.lastDonationDate;
  } else {
    donor.lastDonationDate = '';
  }

  await donor.save();
};

router.get('/', async (_req, res) => {
  const inventory = await InventoryUnit.find().sort({ id: 1 }).lean();
  res.json({ success: true, data: inventory });
});

router.get('/summary', async (_req, res) => {
  const inventory = await InventoryUnit.find().lean();
  res.json({ success: true, data: createInventorySummary(inventory) });
});

router.post('/', async (req, res, next) => {
  try {
    const volume = assertPositiveNumber(req.body.volume, 'Enter a valid blood group and volume.');
    const donorId = assertRequiredText(req.body.donorId, 'Donor ID');
    const collectionDate = assertDateInput(req.body.collectionDate, 'Collection date');
    const bloodType = req.body.bloodType;

    if (!BLOOD_GROUPS.includes(bloodType)) {
      throw badRequest('Enter a valid blood group and volume.');
    }

    const donor = await Donor.findOne({ donorId });
    if (!donor) {
      throw badRequest('Donor ID not found. Register the donor first.');
    }

    if (donor.bloodType !== bloodType) {
      throw badRequest('Inventory blood group must match the selected donor blood group.');
    }

    const newUnit = {
      id: await nextModelNumericId(InventoryUnit),
      unitId: await nextModelSequenceId(InventoryUnit, 'unitId', 'UNT'),
      bloodType,
      volume,
      collectionDate,
      expiryDate: addDaysToDate(collectionDate, BLOOD_EXPIRY_DAYS),
      status: 'Available',
      donorId,
      donorName: donor.name,
    };

    await InventoryUnit.create(newUnit);
    await syncDonorInventorySnapshot(donorId);
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'create',
      entityType: 'inventory',
      entityId: newUnit.unitId,
      message: `Inventory unit ${newUnit.unitId} was created.`,
      metadata: { donorId: newUnit.donorId, bloodType: newUnit.bloodType, status: newUnit.status },
    });

    res.status(201).json({ success: true, data: newUnit });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const inventoryId = Number(req.params.id);
    const unit = await InventoryUnit.findOne({ id: inventoryId });

    if (!unit) {
      throw notFound('Inventory unit not found.');
    }

    if (unit.status === 'Issued') {
      throw badRequest('Issued inventory units cannot be edited.');
    }

    const volume = assertPositiveNumber(req.body.volume, 'Enter a valid blood group and volume.');
    const donorId = assertRequiredText(req.body.donorId, 'Donor ID');
    const collectionDate = assertDateInput(req.body.collectionDate, 'Collection date');
    const bloodType = req.body.bloodType;

    if (!BLOOD_GROUPS.includes(bloodType)) {
      throw badRequest('Enter a valid blood group and volume.');
    }

    const donor = await Donor.findOne({ donorId });
    if (!donor) {
      throw badRequest('Donor ID not found. Register the donor first.');
    }

    if (donor.bloodType !== bloodType) {
      throw badRequest('Inventory blood group must match the selected donor blood group.');
    }

    const previousDonorId = unit.donorId;
    Object.assign(unit, {
      bloodType,
      volume,
      collectionDate,
      expiryDate: addDaysToDate(collectionDate, BLOOD_EXPIRY_DAYS),
      donorId,
      donorName: donor.name,
    });

    await unit.save();
    await syncDonorInventorySnapshot(previousDonorId);
    if (previousDonorId !== donorId) {
      await syncDonorInventorySnapshot(donorId);
    }
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'update',
      entityType: 'inventory',
      entityId: unit.unitId,
      message: `Inventory unit ${unit.unitId} was updated.`,
      metadata: { donorId: unit.donorId, bloodType: unit.bloodType, status: unit.status },
    });
    res.json({ success: true, data: unit.toObject() });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const inventoryId = Number(req.params.id);
    const unit = await InventoryUnit.findOne({ id: inventoryId });

    if (!unit) {
      throw notFound('Inventory unit not found.');
    }

    await InventoryUnit.deleteOne({ id: inventoryId });
    if (unit.unitId) {
      await TransfusionRequest.updateMany(
        { unitIdsUsed: unit.unitId },
        { $pull: { unitIdsUsed: unit.unitId } }
      );
    }
    await syncDonorInventorySnapshot(unit.donorId);
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: unit.status === 'Issued' ? 'delete-issued' : 'delete',
      entityType: 'inventory',
      entityId: unit.unitId,
      message: `Inventory unit ${unit.unitId} was deleted.`,
      metadata: { donorId: unit.donorId, bloodType: unit.bloodType, status: unit.status },
    });
    res.json({ success: true, message: 'Inventory unit deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
