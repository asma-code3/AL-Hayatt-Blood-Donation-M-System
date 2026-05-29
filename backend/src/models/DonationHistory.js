import mongoose from 'mongoose';

const donationHistorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    historyId: { type: String, required: true, unique: true, index: true },
    donorId: { type: String, required: true, index: true },
    donorRecordId: { type: Number, default: null, index: true },
    donorName: { type: String, required: true, trim: true },
    bloodType: { type: String, required: true },
    donationDate: { type: String, required: true },
    notes: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'history',
  }
);

export const DonationHistory =
  mongoose.models.DonationHistory || mongoose.model('DonationHistory', donationHistorySchema);
