import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { INITIAL_PROCESSES } from '../src/data/defaultData';
import {
  clearAllProcesses, clearDeletedProcessIds, clearLegacyProcessCache,
  clearProcessCache, getDeletedProcessIds, loadProcesses,
  markProcessAsDeletedLocally, mergeProcessesLists, reloadDefaultProcesses, saveProcesses,
  type StorageScope,
} from '../src/utils/storage';

const a: StorageScope = { tenantId: 'tenant-a', uid: 'user-a', role: 'ADMIN' };
const b: StorageScope = { tenantId: 'tenant-b', uid: 'user-b', role: 'ADMIN' };
const process = { ...INITIAL_PROCESSES[0], id: 'same-id', clientName: 'Cliente de A' };

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } });
});

test('cache offline isolado por tenant, usuário e papel, sem logout intermediário', () => {
  saveProcesses(a, [process]);
  for (const other of [b, { ...a, uid: 'user-b' }, { ...a, tenantId: 'tenant-b' }, { ...a, role: 'ANALYST' }]) {
    assert.deepEqual(loadProcesses(other), []);
    saveProcesses(other, [{ ...process, clientName: 'Outro cliente' }]);
  }
  assert.equal(loadProcesses(a)[0].clientName, 'Cliente de A');
});

test('IDs excluídos e restauração não afetam outro escopo', () => {
  markProcessAsDeletedLocally(a, process.id);
  assert.equal(getDeletedProcessIds(b).has(process.id), false);
  markProcessAsDeletedLocally(b, process.id);
  clearDeletedProcessIds(b);
  reloadDefaultProcesses(b);
  assert.equal(getDeletedProcessIds(a).has(process.id), true);
});

test('limpeza e logout removem somente o cache do escopo informado', () => {
  saveProcesses(a, [process]);
  saveProcesses(b, [process]);
  markProcessAsDeletedLocally(a, process.id);
  clearAllProcesses(b);
  assert.equal(loadProcesses(a).length, 1);
  saveProcesses(b, [process]);
  clearProcessCache(a);
  assert.deepEqual(loadProcesses(a), []);
  assert.equal(getDeletedProcessIds(a).size, 0);
  assert.equal(loadProcesses(b).length, 1);
});

test('cache legado nunca é atribuído ao usuário autenticado', () => {
  localStorage.setItem('morada_credito_processes_v2', JSON.stringify([process]));
  localStorage.setItem('morada_credito_initialized_v2', 'true');
  localStorage.setItem('morada_credito_deleted_ids_v2', JSON.stringify([process.id]));
  assert.deepEqual(loadProcesses(a), []);
  assert.equal(getDeletedProcessIds(a).size, 0);
  clearLegacyProcessCache();
  assert.equal(localStorage.getItem('morada_credito_processes_v2'), null);
  assert.equal(localStorage.getItem('morada_credito_initialized_v2'), null);
  assert.equal(localStorage.getItem('morada_credito_deleted_ids_v2'), null);
});

test('delimitadores em identificadores não colidem e resposta antiga conserva seu escopo', () => {
  const first = { ...a, tenantId: 'a:b', uid: 'c' };
  const second = { ...a, tenantId: 'a', uid: 'b:c' };
  saveProcesses(second, [{ ...process, clientName: 'B' }]);
  saveProcesses(first, [process]);
  assert.equal(loadProcesses(second)[0].clientName, 'B');
  assert.equal(loadProcesses(first)[0].clientName, 'Cliente de A');
});


test('nuvem vazia preserva trabalho local após reload e consulta repetida', () => {
  saveProcesses(a, [process]);
  const initial = mergeProcessesLists(a, loadProcesses(a), []);
  saveProcesses(a, initial);
  const snapshot = mergeProcessesLists(a, loadProcesses(a), []);
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].clientName, process.clientName);
});

test('mesclagem respeita versões mais recentes e exclusões do próprio escopo', () => {
  const local = { ...process, stageUpdatedAt: '2026-09-15T10:00:00Z' };
  const cloud = { ...process, clientName: 'Atualizado na nuvem', stageUpdatedAt: '2026-09-16T10:00:00Z' };
  assert.equal(mergeProcessesLists(a, [local], [cloud])[0].clientName, cloud.clientName);
  assert.equal(mergeProcessesLists(a, [cloud], [local])[0].clientName, cloud.clientName);
  markProcessAsDeletedLocally(b, process.id);
  assert.equal(mergeProcessesLists(a, [local], [cloud]).length, 1);
  markProcessAsDeletedLocally(a, process.id);
  assert.deepEqual(mergeProcessesLists(a, [local], [cloud]), []);
});
