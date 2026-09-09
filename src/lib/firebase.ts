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
import { ClientProcess, TenantRole, UserProfile } from '../types';
import {
  repairProcessFields,
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
 * Merge cloud processes with local processes without losing locally created/updated records
 * and without resurrecting recently deleted processes.
 */
export function mergeProcessesLists(
  localList: ClientProcess[],
  cloudList: ClientProcess[]
): ClientProcess[] {
  const deletedIds = getDeletedProcessIds();
  const map = new Map<string, ClientProcess>();

  // Add all local processes first (ignoring marked deleted)
  for (const proc of localList) {
    if (proc && proc.id && !deletedIds.has(proc.id)) {
      map.set(proc.id, repairProcessFields(proc));
    }
  }

  // Merge cloud processes: take cloud version if newer or not present locally
  for (const rawCloudProc of cloudList) {
    if (!rawCloudProc || !rawCloudProc.id || deletedIds.has(rawCloudProc.id)) continue;
    const cloudProc = repairProcessFields(rawCloudProc);
    const existing = map.get(cloudProc.id);
    if (!existing) {
      map.set(cloudProc.id, cloudProc);
    } else {
      // Compare timestamps
      const cloudTime = new Date(cloudProc.stageUpdatedAt || cloudProc.createdAt || 0).getTime();
      const localTime = new Date(existing.stageUpdatedAt || existing.createdAt || 0).getTime();
      if (cloudTime >= localTime) {
        map.set(cloudProc.id, cloudProc);
      }
    }
  }

  return Array.from(map.values()).map(repairProcessFields);
}

/**
 * Save / sync all processes to Firestore in chunked batches of 200 items (Firestore limit is 500)
 */
export async function syncProcessesToFirestore(
  tenantId: string,
  processes: ClientProcess[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (isFirestoreQuotaExhausted) {
    return { success: false, count: 0, error: 'Quota diária do Firestore atingida' };
  }
  if (!tenantId || !processes || processes.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const chunkSize = 200;
    let syncedCount = 0;
    const deletedIds = getDeletedProcessIds();

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
export async function deleteProcessFromFirestore(tenantId: string, processId: string): Promise<boolean> {
  if (!tenantId || !processId) return false;

  // Register locally so concurrent listener doesn't resurrect it
  markProcessAsDeletedLocally(processId);

  if (isFirestoreQuotaExhausted) return false;
  try {
    const processRef = processDocRef(tenantId, processId);
    await deleteDoc(processRef);
    return true;
  } catch (error: any) {
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
): Promise<ClientProcess[]> {
  if (isFirestoreQuotaExhausted || !tenantId) return [];
  try {
    const querySnapshot = await getDocs(processesQuery(tenantId, viewer));
    const processes: ClientProcess[] = [];
    const deletedIds = getDeletedProcessIds();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (!data.isDeleted && !deletedIds.has(docSnap.id)) {
        processes.push(repairProcessFields(data as ClientProcess));
      }
    });
    return processes;
  } catch (error: any) {
    if (isQuotaError(error)) {
      isFirestoreQuotaExhausted = true;
    }
    console.warn('Firestore read status (using cached / local processes):', error?.message || error);
    return [];
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
  if (isFirestoreQuotaExhausted || !tenantId) return () => {};
  try {
    const deletedIds = getDeletedProcessIds();

    return onSnapshot(
      processesQuery(tenantId, viewer),
      (querySnapshot) => {
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
        if (isQuotaError(error)) {
          isFirestoreQuotaExhausted = true;
        }
        console.warn('Firestore snapshot listener status:', error?.message || error);
        onError?.(error);
      }
    );
  } catch (err: any) {
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
    meta.connected = false;
    meta.error = e?.message || String(e);
  }

  return meta;
}

