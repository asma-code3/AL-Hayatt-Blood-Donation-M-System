import mongoose from 'mongoose';

const transfusionRequestSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    transfusionId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Number, default: null, index: true },
    patientName: { type: String, required: true, trim: true },
    bloodGroupReq: { type: String, required: true },
    quantity: { type: Number, required: true },
    transfusionDate: { type: String, required: true },
    doctorName: { type: String, default: '', trim: true },
    status: { type: String, required: true },
    unitIdsUsed: { type: [String], default: [] },
    date: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'requests',
  }
);

export const TransfusionRequest =
  mongoose.models.TransfusionRequest || mongoose.model('TransfusionRequest', transfusionRequestSchema);
