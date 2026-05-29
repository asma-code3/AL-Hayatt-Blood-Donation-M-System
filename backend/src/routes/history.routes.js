import { Router } from 'express';
import { BLOOD_GROUPS, ROLES } from '../constants/blood.js';
import { requireRole } from '../middleware/auth.js';
import { DonationHistory } from '../models/DonationHistory.js';
import { Donor } from '../models/Donor.js';
import { nextModelNumericId, nextModelSequenceId } from '../utils/id.js';
import { writeAuditLog } from '../utils/audit.js';
import { badRequest, notFound } from '../utils/http.js';
import { assertDateInput, assertRequiredText } from '../utils/validation.js';

const router = Router();

const findSameDayDonation = async ({ donorId, donationDate, excludeId = null }) =>
  DonationHistory.findOne({
    donorId,
    donationDate,
    ...(excludeId === null ? {} : { id: { $ne: excludeId } }),
  });

const syncDonorDonationCount = async (donorRef) => {
  if (!donorRef) return;

  const donor = await Donor.findOne({ donorId: donorRef });
  if (!donor) return;

  donor.donations = await DonationHistory.countDocuments({ donorId: donorRef });
  await donor.save();
};

router.get('/', async (_req, res, next) => {
  try {
    const history = await DonationHistory.find().sort({ id: -1 }).lean();
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const donorId = String(req.body.donorId || '').trim();
    const donor = await Donor.findOne({ donorId });

    if (!donor) {
      throw badRequest('Selected donor was not found.');
    }

    const newEntry = {
      id: await nextModelNumericId(DonationHistory),
      historyId: await nextModelSequenceId(DonationHistory, 'historyId', 'HIS'),
      donorId: donor.donorId,
      donorRecordId: donor.id,
      donorName: donor.name,
      bloodType: donor.bloodType,
      donationDate: assertDateInput(req.body.donationDate, 'Donation date'),
      notes: String(req.body.notes || '').trim(),
    };

    const sameDayDonation = await findSameDayDonation({
      donorId: newEntry.donorId,
      donationDate: newEntry.donationDate,
    });
    if (sameDayDonation) {
      throw badRequest('This donor already has a donation history entry for the selected date.');
    }

    await DonationHistory.create(newEntry);
    await syncDonorDonationCount(newEntry.donorId);
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'create',
      entityType: 'history',
      entityId: newEntry.historyId,
      message: `History entry ${newEntry.historyId} was created.`,
      metadata: { donorId: newEntry.donorId, donorName: newEntry.donorName },
    });

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const historyId = Number(req.params.id);
    const entry = await DonationHistory.findOne({ id: historyId });

    if (!entry) {
      throw notFound('History entry not found.');
    }

    const previousDonorId = entry.donorId;
    const donorId = String(req.body.donorId || '').trim();
    const donor = await Donor.findOne({ donorId });

    if (!donor) {
      throw badRequest('Selected donor was not found.');
    }

    const updates = {
      donorId: donor.donorId,
      donorRecordId: donor.id,
      donorName: donor.name,
      bloodType: donor.bloodType,
      donationDate: assertDateInput(req.body.donationDate, 'Donation date'),
      notes: String(req.body.notes || '').trim(),
    };

    const sameDayDonation = await findSameDayDonation({
      donorId: updates.donorId,
      donationDate: updates.donationDate,
      excludeId: entry.id,
    });
    if (sameDayDonation) {
      throw badRequest('This donor already has a donation history entry for the selected date.');
    }

    Object.assign(entry, updates);
    await entry.save();

    await syncDonorDonationCount(previousDonorId);
    if (previousDonorId !== updates.donorId) {
      await syncDonorDonationCount(updates.donorId);
    }
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'update',
      entityType: 'history',
      entityId: entry.historyId,
      message: `History entry ${entry.historyId} was updated.`,
      metadata: { donorId: entry.donorId, donorName: entry.donorName },
    });

    res.json({ success: true, data: entry.toObject() });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const historyId = Number(req.params.id);
    const entry = await DonationHistory.findOne({ id: historyId });

    if (!entry) {
      throw notFound('History entry not found.');
    }

    const donorRef = entry.donorId;
    await DonationHistory.deleteOne({ id: historyId });
    await syncDonorDonationCount(donorRef);
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'delete',
      entityType: 'history',
      entityId: entry.historyId,
      message: `History entry ${entry.historyId} was deleted.`,
      metadata: { donorId: entry.donorId, donorName: entry.donorName },
    });

    res.json({ success: true, message: 'History entry deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
