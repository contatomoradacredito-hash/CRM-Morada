import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { TenantRole } from '../types';

export type AuditAction =
  | 'ACCESS_DENIED_CROSS_TENANT'
  | 'SENSITIVE_EDIT_CPF'
  | 'EXPORT_DATA'
  | 'OWNER_UID_CHANGE';

export type AuditOutcome = 'DENIED' | 'SENSITIVE_ACTION';

export interface AuditEvent {
  targetTenantId: string;
  actorUid: string;
  actorRole?: TenantRole;
  action: AuditAction;
  resourceId: string;
  outcome: AuditOutcome;
}

export async function writeAuditLog(event: AuditEvent): Promise<void> {
  const app = getApp();
  if (!event.actorUid || getAuth(app).currentUser?.uid !== event.actorUid) {
    throw new Error('Sessão alterada antes do registro de auditoria.');
  }
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  await addDoc(collection(db, 'auditLog'), {
    timestamp: serverTimestamp(),
    targetTenantId: event.targetTenantId,
    actorUid: event.actorUid,
    ...(event.actorRole ? { actorRole: event.actorRole } : {}),
    action: event.action,
    resourceId: event.resourceId,
    outcome: event.outcome,
  });
}

export function isCrossTenantDenial(
  error: unknown,
  actorTenantId: unknown,
  targetTenantId: string,
): boolean {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error.code === 'permission-denied' || error.code === 'firestore/permission-denied')
    && typeof actorTenantId === 'string'
    && actorTenantId.length > 0
    && targetTenantId.length > 0
    && actorTenantId !== targetTenantId;
}

export function logPermissionDenied(
  error: unknown,
  actorUid: string | undefined,
  targetTenantId: string,
  resourceId = '',
): void {
  if (!error || typeof error !== 'object' || !('code' in error)) return;
  if (error.code !== 'permission-denied' && error.code !== 'firestore/permission-denied') return;
  const app = getApp();
  if (!actorUid || getAuth(app).currentUser?.uid !== actorUid || !targetTenantId) return;
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  void getDoc(doc(db, 'users', actorUid)).then((profile) => {
    if (!profile.exists()) return;
    const actorTenantId = profile.data().tenantId;
    if (!isCrossTenantDenial(error, actorTenantId, targetTenantId)) return;
    const role: unknown = profile.data().role;
    const actorRole = role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST' ? role : undefined;
    return writeAuditLog({
      targetTenantId,
      actorUid,
      actorRole,
      action: 'ACCESS_DENIED_CROSS_TENANT',
      resourceId,
      outcome: 'DENIED',
    });
  }).catch(() => {});
}
