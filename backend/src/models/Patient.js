import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true, trim: true },
    bloodType: { type: String, required: true },
    condition: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'patients',
  }
);

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
