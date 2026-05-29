import { Router } from 'express';
import { formatDisplayDate } from '../utils/date.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { Patient } from '../models/Patient.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';
import { nextModelNumericId, nextModelSequenceId } from '../utils/id.js';
import { writeAuditLog } from '../utils/audit.js';
import { badRequest, notFound } from '../utils/http.js';
import { assertBloodType, assertDateInput, assertPositiveInteger, assertRequiredText } from '../utils/validation.js';

const router = Router();

const allocateUnits = async (bloodGroupReq, quantity) => {
  const availableMatches = await InventoryUnit.find({
    bloodType: bloodGroupReq,
    status: 'Available',
  })
    .sort({ collectionDate: 1, id: 1 })
    .lean();

  if (availableMatches.length < quantity) {
    throw badRequest('The requested blood group is not available in the required quantity.');
  }

  return availableMatches.slice(0, quantity);
};

router.get('/', async (_req, res) => {
  const requests = await TransfusionRequest.find().sort({ id: -1 }).lean();
  res.json({ success: true, data: requests });
});

router.post('/', async (req, res, next) => {
  try {
    const quantity = assertPositiveInteger(req.body.quantity, 'Quantity must be at least 1 unit.');
    const patientId = assertPositiveInteger(req.body.patientId, 'Select a valid patient.');
    const transfusionDate = assertDateInput(req.body.transfusionDate, 'Transfusion date');
    const patient = await Patient.findOne({ id: patientId });
    if (!patient) {
      throw badRequest('Selected patient was not found.');
    }
    const bloodGroupReq = assertBloodType(req.body.bloodGroupReq || patient.bloodType);
    const issuedUnits = await allocateUnits(bloodGroupReq, quantity);
    const newRequest = {
      id: await nextModelNumericId(TransfusionRequest),
      transfusionId: await nextModelSequenceId(TransfusionRequest, 'transfusionId', 'TRF'),
      patientId: patient.id,
      patientName: patient.name,
      bloodGroupReq,
      quantity,
      transfusionDate,
      doctorName: assertRequiredText(req.body.doctorName, 'Doctor name'),
      status: 'Issued',
      unitIdsUsed: issuedUnits.map((item) => item.unitId),
      date: formatDisplayDate(transfusionDate),
    };

    await InventoryUnit.updateMany(
      { unitId: { $in: issuedUnits.map((item) => item.unitId) } },
      { $set: { status: 'Issued' } }
    );
    await TransfusionRequest.create(newRequest);
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'create',
      entityType: 'request',
      entityId: newRequest.transfusionId,
      message: `Blood request ${newRequest.transfusionId} was issued.`,
      metadata: {
        bloodGroupReq: newRequest.bloodGroupReq,
        quantity: newRequest.quantity,
        unitIdsUsed: newRequest.unitIdsUsed,
      },
    });

    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const existingRequest = await TransfusionRequest.findOne({ id: requestId });

    if (!existingRequest) {
      throw notFound('Blood request not found.');
    }

    const quantity = assertPositiveInteger(req.body.quantity, 'Quantity must be at least 1 unit.');
    const patientId = assertPositiveInteger(req.body.patientId, 'Select a valid patient.');
    const transfusionDate = assertDateInput(req.body.transfusionDate, 'Transfusion date');
    const doctorName = assertRequiredText(req.body.doctorName, 'Doctor name');

    const patient = await Patient.findOne({ id: patientId });
    if (!patient) {
      throw badRequest('Selected patient was not found.');
    }

    const bloodGroupReq = assertBloodType(req.body.bloodGroupReq || patient.bloodType);

    await InventoryUnit.updateMany(
      { unitId: { $in: existingRequest.unitIdsUsed } },
      { $set: { status: 'Available' } }
    );

    try {
      const reissuedUnits = await allocateUnits(bloodGroupReq, quantity);
      await InventoryUnit.updateMany(
        { unitId: { $in: reissuedUnits.map((item) => item.unitId) } },
        { $set: { status: 'Issued' } }
      );

      Object.assign(existingRequest, {
        patientId: patient.id,
        patientName: patient.name,
        bloodGroupReq,
        quantity,
        transfusionDate,
        doctorName,
        status: 'Issued',
        unitIdsUsed: reissuedUnits.map((item) => item.unitId),
        date: formatDisplayDate(transfusionDate),
      });

      await existingRequest.save();
      await writeAuditLog({
        actorUsername: req.user?.username || 'system',
        actorRole: req.user?.role || 'System',
        action: 'update',
        entityType: 'request',
        entityId: existingRequest.transfusionId,
        message: `Blood request ${existingRequest.transfusionId} was updated.`,
        metadata: {
          bloodGroupReq: existingRequest.bloodGroupReq,
          quantity: existingRequest.quantity,
          unitIdsUsed: existingRequest.unitIdsUsed,
        },
      });

      res.json({ success: true, data: existingRequest.toObject() });
    } catch (error) {
      await InventoryUnit.updateMany(
        { unitId: { $in: existingRequest.unitIdsUsed } },
        { $set: { status: 'Issued' } }
      );
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const existingRequest = await TransfusionRequest.findOne({ id: requestId });

    if (!existingRequest) {
      throw notFound('Blood request not found.');
    }

    await InventoryUnit.updateMany(
      { unitId: { $in: existingRequest.unitIdsUsed } },
      { $set: { status: 'Available' } }
    );

    await TransfusionRequest.deleteOne({ id: requestId });
    await writeAuditLog({
      actorUsername: req.user?.username || 'system',
      actorRole: req.user?.role || 'System',
      action: 'delete',
      entityType: 'request',
      entityId: existingRequest.transfusionId,
      message: `Blood request ${existingRequest.transfusionId} was deleted.`,
      metadata: { unitIdsUsed: existingRequest.unitIdsUsed },
    });
    res.json({ success: true, message: 'Blood request deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
