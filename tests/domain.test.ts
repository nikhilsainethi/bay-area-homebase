import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeWebsite,
  monthlyTotal,
  validateProperty,
  commuteUrl,
} from '../lib/domain.ts';
void test('untrusted map websites cannot become executable links', () => {
  assert.equal(safeWebsite('javascript:alert(1)'), '');
  assert.equal(safeWebsite('example.com'), 'https://example.com/');
});
void test('unknown rent stays unknown; known monthly fees are added', () => {
  assert.equal(monthlyTotal({ rent: null, fees: 50 }), null);
  assert.equal(monthlyTotal({ rent: 3000, fees: 175 }), 3175);
});
void test('invalid property and negative rent rejected', () => {
  assert.throws(() => validateProperty({ name: '' }));
  assert.throws(() =>
    validateProperty({ name: 'Home', units: [{ rent: -1 }] }),
  );
});
void test('commute opens Google Maps with supplied office address', () => {
  const u = new URL(commuteUrl('Home, Sunnyvale'));
  assert.equal(u.searchParams.get('origin'), 'Home, Sunnyvale');
  assert.match(u.searchParams.get('destination') || '', /100 W Caribbean Dr/);
});

void test('partial updates preserve researched fields and reject unknown IDs', async () => {
  const { mergePropertyUpdate } = await import('../lib/domain.ts');
  const full = validateProperty({
    id: 'saved-1',
    name: 'Home',
    notes: 'old',
    phone: '555-0100',
    status: 'Toured',
    units: [{ id: 'u', beds: 1, baths: 1.5, rent: 3000 }],
  });
  const updated = mergePropertyUpdate(
    { id: 'saved-1', name: 'Home', notes: 'new' },
    [full],
  );
  assert.equal(updated.phone, '555-0100');
  assert.equal(updated.status, 'Toured');
  assert.equal(updated.units[0].rent, 3000);
  assert.equal(updated.notes, 'new');
  assert.throws(() =>
    mergePropertyUpdate({ id: 'unknown', name: 'Home' }, [full]),
  );
});
