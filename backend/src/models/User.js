import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'users',
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
