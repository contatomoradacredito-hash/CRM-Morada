import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { logPermissionDenied } from './audit';
import { ClientProcess, TenantRole, UserProfile } from '../types';
import { USE_MOCK_DATA } from '../config';
import {
  repairProcessFields,
  StorageScope,
  getDeletedProcessIds,
  markProcessAsDeletedLocally,
} from '../utils/storage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID and long polling to prevent proxy/WebSocket drops
export const db = (() => {
  const settings = {
    experimentalForceLongPolling: true,
  };
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      return initializeFirestore(app, settings, firebaseConfig.firestoreDatabaseId);
    }
    return initializeFirestore(app, settings);
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

export { firebaseConfig };

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
};

export type { User };

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    if (!data.tenantId || !data.role) return null;
    return {
      uid,
      tenantId: data.tenantId,
      role: data.role,
      email: data.email || '',
      displayName: data.displayName || '',
    };
  } catch (error: any) {
    console.warn('Erro ao carregar perfil do usuário:', error?.message || error);
    return null;
  }
}

export async function getTenant(tenantId: string): Promise<{ name: string; demoMode: boolean } | null> {
  if (!tenantId) return null;
  const auditActorUid = auth.currentUser?.uid;
  try {
    const snap = await getDoc(doc(db, 'tenants', tenantId));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return { name: data.name || tenantId, demoMode: !!data.demoMode };
  } catch (error) {
    logPermissionDenied(error, auditActorUid, tenantId);
    return null;
  }
}

export async function getTenantMembers(tenantId: string): Promise<UserProfile[]> {
  if (!tenantId) return [];
  const auditActorUid = auth.currentUser?.uid;
  try {
    const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        uid: d.id,
        tenantId: data.tenantId,
        role: data.role,
        email: data.email || '',
        displayName: data.displayName || '',
      };
    });
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId);
    console.warn('Erro ao carregar membros da empresa:', error?.message || error);
    return [];
  }
}

const TENANTS_COLLECTION = 'tenants';
const PROCESSES_SUBCOLLECTION = 'processes';

export interface ProcessViewer {
  uid: string;
  role: TenantRole;
}

function processesCol(tenantId: string) {
  return collection(db, TENANTS_COLLECTION, tenantId, PROCESSES_SUBCOLLECTION);
}

function processDocRef(tenantId: string, processId: string) {
  return doc(db, TENANTS_COLLECTION, tenantId, PROCESSES_SUBCOLLECTION, processId);
}

function processesQuery(tenantId: string, viewer?: ProcessViewer) {
  const col = processesCol(tenantId);
  return viewer && viewer.role === 'ANALYST'
    ? query(col, where('ownerUid', '==', viewer.uid))
    : query(col);
}

// Circuit breaker flag to prevent infinite retry loops if daily free quota is hit
let isFirestoreQuotaExhausted = false;

function isQuotaError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return (
    code === 'resource-exhausted' ||
    message.includes('Quota limit exceeded') ||
    message.includes('resource-exhausted')
  );
}

/**
 * Recursively cleans an object by removing any keys whose value is undefined.
 * Firestore strictly rejects undefined field values with an exception.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Save / sync all processes to Firestore in chunked batches of 200 items (Firestore limit is 500)
 */
export async function syncProcessesToFirestore(
  scope: StorageScope,
  processes: ClientProcess[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const { tenantId } = scope;
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA) return { success: true, count: 0 };
  if (isFirestoreQuotaExhausted) {
    return { success: false, count: 0, error: 'Quota diária do Firestore atingida' };
  }
  if (!tenantId || !processes || processes.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const chunkSize = 200;
    let syncedCount = 0;
    const deletedIds = getDeletedProcessIds(scope);

    for (let i = 0; i < processes.length; i += chunkSize) {
      const chunk = processes.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const rawProc of chunk) {
        if (!rawProc || !rawProc.id || deletedIds.has(rawProc.id)) continue;
        const sanitized = sanitizeForFirestore(repairProcessFields(rawProc));
        const processRef = processDocRef(tenantId, sanitized.id);
        batch.set(
          processRef,
          {
            ...sanitized,
            syncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        syncedCount++;
      }

      await batch.commit();
    }

    return { success: true, count: syncedCount };
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId);
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore sync status:', error?.message || error);
    }
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

/**
 * Save single process to Firestore immediately with sanitization
 */
export async function saveProcessToFirestore(tenantId: string, process: ClientProcess): Promise<boolean> {
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA) return true;
  if (isFirestoreQuotaExhausted || !tenantId || !process || !process.id) return false;
  try {
    const sanitized = sanitizeForFirestore(repairProcessFields(process));
    const processRef = processDocRef(tenantId, sanitized.id);
    await setDoc(
      processRef,
      {
        ...sanitized,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId, process.id);
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
      console.warn('Firestore daily write quota reached; switched seamlessly to local storage.');
    } else {
      console.warn('Firestore single save notice:', error?.message || error);
    }
    return false;
  }
}

/**
 * Permanently delete single process from Firestore and mark locally
 */
export async function deleteProcessFromFirestore(scope: StorageScope, processId: string): Promise<boolean> {
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA) return true;
  const { tenantId } = scope;
  if (!tenantId || !processId) return false;

  // Register locally so concurrent listener doesn't resurrect it
  markProcessAsDeletedLocally(scope, processId);

  if (isFirestoreQuotaExhausted) return false;
  try {
    const processRef = processDocRef(tenantId, processId);
    await deleteDoc(processRef);
    return true;
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId, processId);
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    } else {
      console.warn('Firestore delete notice:', error?.message || error);
    }
    return false;
  }
}

/**
 * Clear all process documents from Firestore (e.g., when user explicitly wipes dataset)
 */
export async function clearAllProcessesInFirestore(tenantId: string): Promise<boolean> {
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA) return true;
  if (isFirestoreQuotaExhausted || !tenantId) return false;
  try {
    const q = query(processesCol(tenantId));
    const snap = await getDocs(q);
    const chunkSize = 200;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
    return true;
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId);
    console.warn('Firestore clear all notice:', error?.message || error);
    return false;
  }
}

/**
 * Load processes from Firestore
 */
export async function loadProcessesFromFirestore(
  tenantId: string,
  viewer?: ProcessViewer
): Promise<ClientProcess[] | null> {
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA || isFirestoreQuotaExhausted || !tenantId) return null;
  try {
    const querySnapshot = await getDocs(processesQuery(tenantId, viewer));
    const processes: ClientProcess[] = [];
    const deletedIds = viewer ? getDeletedProcessIds({ tenantId, ...viewer }) : new Set<string>();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (!data.isDeleted && !deletedIds.has(docSnap.id)) {
        processes.push(repairProcessFields(data as ClientProcess));
      }
    });
    return processes;
  } catch (error: any) {
    logPermissionDenied(error, auditActorUid, tenantId);
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    }
    console.warn('Firestore read status (using cached / local processes):', error?.message || error);
    return null;
  }
}

/**
 * Real-time listener for processes in Firestore with safe callback
 */
export function subscribeToProcesses(
  tenantId: string,
  viewer: ProcessViewer | undefined,
  onUpdate: (processes: ClientProcess[]) => void,
  onError?: (err: any) => void
) {
  const auditActorUid = auth.currentUser?.uid;
  if (USE_MOCK_DATA || isFirestoreQuotaExhausted || !tenantId) return () => {};
  try {
    return onSnapshot(
      processesQuery(tenantId, viewer),
      (querySnapshot) => {
        const deletedIds = viewer ? getDeletedProcessIds({ tenantId, ...viewer }) : new Set<string>();
        const processes: ClientProcess[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!data.isDeleted && !deletedIds.has(docSnap.id)) {
            processes.push(repairProcessFields(data as ClientProcess));
          }
        });
        onUpdate(processes);
      },
      (error: any) => {
        logPermissionDenied(error, auditActorUid, tenantId);
        if (isQuotaError(error)) {
          isFirestoreQuotaExhausted = true;
        }
        console.warn('Firestore snapshot listener status:', error?.message || error);
        onError?.(error);
      }
    );
  } catch (err: any) {
    logPermissionDenied(err, auditActorUid, tenantId);
    if (isQuotaError(err)) {
      isFirestoreQuotaExhausted = true;
    }
    onError?.(err);
    return () => {};
  }
}

/**
 * Returns diagnostic metadata about the connected Firestore database
 */
export async function getFirestoreMetadata(tenantId: string): Promise<{
  connected: boolean;
  databaseId: string;
  projectId: string;
  totalDocuments: number;
  error?: string;
}> {
  const auditActorUid = auth.currentUser?.uid;
  const meta = {
    connected: false,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    projectId: firebaseConfig.projectId || '',
    totalDocuments: 0,
    error: undefined as string | undefined,
  };

  try {
    const q = query(processesCol(tenantId));
    const snap = await getDocs(q);
    meta.connected = true;
    meta.totalDocuments = snap.docs.filter((d) => !d.data()?.isDeleted).length;
  } catch (e: any) {
    logPermissionDenied(e, auditActorUid, tenantId);
    meta.connected = false;
    meta.error = e?.message || String(e);
  }

  return meta;
}
