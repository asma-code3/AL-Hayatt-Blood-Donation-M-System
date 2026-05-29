import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: String(process.env.JWT_EXPIRES_IN || '7d').trim(),
  frontendUrl,
  frontendUrls: frontendUrl
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  mongodbUri: process.env.MONGODB_URI || '',
  logRequests: process.env.LOG_REQUESTS === 'true',
  authMaxAttempts: Number(process.env.AUTH_MAX_ATTEMPTS || 5),
  authWindowMinutes: Number(process.env.AUTH_WINDOW_MINUTES || 15),
  adminUsername: String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase(),
  adminPassword: String(process.env.ADMIN_PASSWORD || 'admin123'),
  adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
  adminRole: String(process.env.ADMIN_ROLE || 'Administrator').trim(),
  doctorUsername: String(process.env.DOCTOR_USERNAME || 'doctor').trim().toLowerCase(),
  doctorPassword: String(process.env.DOCTOR_PASSWORD || 'doctor123'),
  doctorPasswordConfigured: Boolean(process.env.DOCTOR_PASSWORD),
  doctorRole: String(process.env.DOCTOR_ROLE || 'Doctor').trim(),
  staffUsername: String(process.env.STAFF_USERNAME || 'staff').trim().toLowerCase(),
  staffPassword: String(process.env.STAFF_PASSWORD || 'staff123'),
  staffPasswordConfigured: Boolean(process.env.STAFF_PASSWORD),
  staffRole: String(process.env.STAFF_ROLE || 'Staff').trim(),
};

if (env.isProduction && env.jwtSecret === 'change-me-in-production') {
  throw new Error('JWT_SECRET must be changed before running in production.');
}
