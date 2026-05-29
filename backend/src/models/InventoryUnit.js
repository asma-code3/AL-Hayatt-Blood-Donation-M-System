import mongoose from 'mongoose';

const inventoryUnitSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    unitId: { type: String, required: true, unique: true, index: true },
    bloodType: { type: String, required: true },
    volume: { type: Number, required: true },
    collectionDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    status: { type: String, required: true },
    donorId: { type: String, required: true, index: true },
    donorName: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'inventory',
  }
);

export const InventoryUnit = mongoose.models.InventoryUnit || mongoose.model('InventoryUnit', inventoryUnitSchema);
