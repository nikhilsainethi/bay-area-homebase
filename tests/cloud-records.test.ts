import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, planImport } from '../lib/cloud-records.ts';
import { validateProperty } from '../lib/domain.ts';
void test('cloud import validates all records before any write', () => {
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        format: 'homebase-backup',
        version: 1,
        properties: [{ name: 'Valid' }, { name: '' }],
      }),
    ),
  );
  assert.throws(() => parseBackup('null'));
});
void test('cloud import preserves existing research and removes within-file duplicates', () => {
  const old = validateProperty({
    id: 'old',
    osmId: 'way/1',
    name: 'Existing',
    notes: 'keep',
  });
  const incoming = [
    validateProperty({ id: 'other', osmId: 'way/1', name: 'duplicate' }),
    validateProperty({ id: 'new', name: 'New' }),
    validateProperty({ id: 'new', name: 'duplicate' }),
  ];
  const p = planImport(incoming, [old]);
  assert.equal(p.records.length, 1);
  assert.equal(p.records[0].id, 'new');
  assert.equal(p.skipped, 2);
  assert.equal(old.notes, 'keep');
});
