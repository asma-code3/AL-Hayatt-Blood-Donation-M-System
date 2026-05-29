import { Router } from 'express';
import { BLOOD_GROUPS } from '../constants/blood.js';
import { DonationHistory } from '../models/DonationHistory.js';
import { Donor } from '../models/Donor.js';
import { InventoryUnit } from '../models/InventoryUnit.js';
import { Patient } from '../models/Patient.js';
import { TransfusionRequest } from '../models/TransfusionRequest.js';

const router = Router();
const ALERT_WINDOW_DAYS = 7;

const getDaysUntil = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const midnightTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.ceil((midnightTarget.getTime() - midnightToday.getTime()) / (1000 * 60 * 60 * 24));
};

router.get('/summary', async (_req, res) => {
  const [donors, patients, requests, inventory, historyCount] = await Promise.all([
    Donor.find().sort({ id: -1 }).lean(),
    Patient.countDocuments(),
    TransfusionRequest.find().sort({ id: -1 }).lean(),
    InventoryUnit.find().lean(),
    DonationHistory.countDocuments(),
  ]);

  const inventorySummary = BLOOD_GROUPS.map((bloodType) => ({
    bloodType,
    quantity: inventory.filter((item) => item.bloodType === bloodType && item.status === 'Available').length,
  }));
  const expiringUnits = inventory
    .filter((item) => item.status === 'Available')
    .map((item) => ({
      ...item,
      daysUntilExpiry: getDaysUntil(item.expiryDate),
    }))
    .filter((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry <= ALERT_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  const lowStockGroups = inventorySummary.filter((item) => item.quantity > 0 && item.quantity < 3);

  const payload = {
    donors: donors.length,
    patients,
    requests: requests.length,
    donations: historyCount,
    availableUnits: inventory.filter((item) => item.status === 'Available').length,
    inventorySummary,
    alerts: {
      lowStockGroups,
      expiringUnits,
      expiringSoonCount: expiringUnits.length,
      lowStockCount: lowStockGroups.length,
    },
    latestDonors: donors.slice(0, 5),
    latestRequests: requests.slice(0, 5),
  };

  res.json({ success: true, data: payload });
});

export default router;
