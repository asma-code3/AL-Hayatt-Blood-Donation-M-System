import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    donorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true, trim: true },
    bloodType: { type: String, required: true },
    contact: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    dateOfBirth: { type: String, default: '' },
    lastDonationDate: { type: String, default: '' },
    weightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
    occupation: { type: String, default: '', trim: true },
    medicalCondition: { type: String, default: '', trim: true },
    donations: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'donors',
  }
);

export const Donor = mongoose.models.Donor || mongoose.model('Donor', donorSchema);
