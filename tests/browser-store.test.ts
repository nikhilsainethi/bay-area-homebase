import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStore, STORAGE_KEY } from '../lib/browser-store.ts';
function fixture() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    },
  };
}
void test('records survive new store instances and backup roundtrip', () => {
  const a = fixture();
  new BrowserStore(a.storage).save({
    id: 'one',
    name: 'Apartment',
    units: [{ beds: 1, baths: 1.5, rent: 2500 }],
  });
  assert.equal(new BrowserStore(a.storage).list()[0].units[0].baths, 1.5);
  const b = new BrowserStore(fixture().storage);
  assert.deepEqual(b.importBackup(new BrowserStore(a.storage).backup()), {
    added: 1,
    skipped: 0,
  });
  assert.equal(b.list()[0].name, 'Apartment');
});
void test('merge import never overwrites existing research', () => {
  const a = new BrowserStore(fixture().storage);
  a.save({ id: 'one', name: 'New research', notes: 'keep me' });
  const b = new BrowserStore(fixture().storage);
  b.save({ id: 'one', name: 'Older research' });
  assert.deepEqual(a.importBackup(b.backup()), { added: 0, skipped: 1 });
  assert.equal(a.list()[0].notes, 'keep me');
});
void test('invalid backup fails atomically and storage failure is reported', () => {
  const f = fixture(),
    s = new BrowserStore(f.storage);
  s.save({ name: 'Keep' });
  const before = f.storage.getItem(STORAGE_KEY);
  assert.throws(() =>
    s.importBackup(
      JSON.stringify({
        format: 'homebase-backup',
        version: 1,
        properties: [{ name: 'Valid' }, { name: '' }],
      }),
    ),
  );
  assert.equal(f.storage.getItem(STORAGE_KEY), before);
  const broken = new BrowserStore({
    getItem: () => before,
    setItem: () => {
      throw new Error('quota');
    },
  });
  assert.throws(() => broken.save({ name: 'new' }), /storage is full/);
});
void test('corrupted saved state is not silently replaced', () => {
  const f = fixture();
  f.values.set(STORAGE_KEY, 'bad json');
  const s = new BrowserStore(f.storage);
  assert.throws(() => s.save({ name: 'new' }), /could not be read/);
  assert.equal(f.storage.getItem(STORAGE_KEY), 'bad json');
});
