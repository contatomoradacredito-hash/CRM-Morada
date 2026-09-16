import assert from 'node:assert/strict';
import test from 'node:test';
import { isCrossTenantDenial } from '../src/lib/audit';
import { auditRetentionCutoff } from './audit-retention';

test('negação só é classificada como cross-tenant quando alvo e ator são conhecidos e diferentes', () => {
  const denied = { code: 'permission-denied' };
  assert.equal(isCrossTenantDenial(denied, 'tenant-a', 'tenant-b'), true);
  assert.equal(isCrossTenantDenial(denied, 'tenant-a', 'tenant-a'), false);
  assert.equal(isCrossTenantDenial(denied, undefined, 'tenant-b'), false);
  assert.equal(isCrossTenantDenial(denied, 'tenant-a', ''), false);
  assert.equal(isCrossTenantDenial({ code: 'unavailable' }, 'tenant-a', 'tenant-b'), false);
});

test('retenção usa 12 meses UTC e preserva o limite no dia bissexto', () => {
  assert.equal(auditRetentionCutoff(new Date('2026-09-16T15:00:00Z')).toISOString(), '2025-09-16T15:00:00.000Z');
  assert.equal(auditRetentionCutoff(new Date('2028-02-29T15:00:00Z')).toISOString(), '2027-02-28T15:00:00.000Z');
});
