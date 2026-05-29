import { Router } from 'express';
import { Patient } from '../models/Patient.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';
import { nextModelNumericId } from '../utils/id.js';
import { badRequest, notFound } from '../utils/http.js';
import { assertBloodType, assertGender, assertPositiveInteger, assertRequiredText } from '../utils/validation.js';

const router = Router();

router.get('/', async (_req, res) => {
  const patients = await Patient.find().sort({ id: 1 }).lean();
  res.json({ success: true, data: patients });
});

router.post('/', async (req, res, next) => {
  try {
    const age = assertPositiveInteger(req.body.age, 'Valid patient age is required.');

    const newPatient = {
      id: await nextModelNumericId(Patient),
      name: assertRequiredText(req.body.name, 'Name'),
      age,
      gender: assertGender(req.body.gender),
      bloodType: assertBloodType(req.body.bloodType),
      condition: assertRequiredText(req.body.condition, 'Condition'),
    };

    await Patient.create(newPatient);

    res.status(201).json({ success: true, data: newPatient });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const patientId = Number(req.params.id);
    const patient = await Patient.findOne({ id: patientId });

    if (!patient) {
      throw notFound('Patient not found.');
    }

    const age = assertPositiveInteger(req.body.age, 'Valid patient age is required.');

    const updates = {
      name: assertRequiredText(req.body.name, 'Name'),
      age,
      gender: assertGender(req.body.gender),
      bloodType: assertBloodType(req.body.bloodType),
      condition: assertRequiredText(req.body.condition, 'Condition'),
    };

    const previousName = patient.name;
    Object.assign(patient, updates);
    await Promise.all([
      patient.save(),
      TransfusionRequest.updateMany(
        { patientId: patientId, patientName: previousName },
        { $set: { patientName: updates.name } }
      ),
    ]);

    res.json({ success: true, data: patient.toObject() });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const patientId = Number(req.params.id);
    const patient = await Patient.findOne({ id: patientId });

    if (!patient) {
      throw notFound('Patient not found.');
    }

    const linkedRequest = await TransfusionRequest.exists({
      $or: [{ patientId }, { patientName: patient.name }],
    });

    if (linkedRequest) {
      throw badRequest('This patient is linked to blood requests and cannot be deleted.');
    }

    await Patient.deleteOne({ id: patientId });
    res.json({ success: true, message: 'Patient deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
