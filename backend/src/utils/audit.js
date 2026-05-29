import { AuditLog } from '../models/AuditLog.js';
import { nextModelNumericId } from './id.js';

export const writeAuditLog = async ({
  actorUsername = 'system',
  actorRole = 'System',
  action,
  entityType,
  entityId = '',
  message,
  metadata = {},
}) => {
  await AuditLog.create({
    id: await nextModelNumericId(AuditLog),
    actorUsername,
    actorRole,
    action,
    entityType,
    entityId,
    message,
    metadata,
  });
};
