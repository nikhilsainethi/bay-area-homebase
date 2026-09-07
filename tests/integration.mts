import type { Property } from '../lib/domain.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3000';
const auth = {
  Cookie: '__sites_local_auth=1',
  'Content-Type': 'application/json',
};
void test('anonymous API access is denied and spoofed identity is stripped', async () => {
  for (const headers of [
    {},
    {
      'oai-authenticated-user-id': 'someone',
      'oai-authenticated-user-email': 'x@example.com',
    },
  ]) {
    assert.equal(
      (
        await fetch(base + '/api/properties', {
          headers: headers as Record<string, string>,
        })
      ).status,
      401,
    );
  }
});
void test('property CRUD preserves floor plans and fractional baths, rejects unsafe data', async () => {
  const id = crypto.randomUUID();
  const p = {
    id,
    name: 'Automated test property',
    address: '123 Test Street',
    units: [
      {
        id: 'unit-a',
        label: 'A1',
        beds: 1,
        baths: 1.5,
        rent: 3000,
        fees: 125,
        bedroomDimensions: '12 × 11 ft',
        availableDate: '2026-10-01',
      },
    ],
  };
  try {
    const saved = await fetch(base + '/api/properties', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(p),
    });
    assert.equal(saved.status, 200, await saved.clone().text());
    let data = (await (
      await fetch(base + '/api/properties', { headers: auth })
    ).json()) as { properties: Property[] };
    const found = data.properties.find((p) => p.id === id)!;
    assert.equal(found.units[0].baths, 1.5);
    assert.equal(found.units[0].bedroomDimensions, '12 × 11 ft');
    assert.equal(found.units[0].availableDate, '2026-10-01');
    assert.equal(
      (
        await fetch(base + '/api/properties', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ ...found, notes: 'Updated tour notes' }),
        })
      ).status,
      200,
    );
    data = (await (
      await fetch(base + '/api/properties', { headers: auth })
    ).json()) as { properties: Property[] };
    assert.equal(
      data.properties.find((p) => p.id === id)!.notes,
      'Updated tour notes',
    );
    assert.equal(
      (
        await fetch(base + '/api/properties', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ ...p, units: [{ rent: -5 }] }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + '/api/properties', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ ...p, website: 'javascript:alert(1)' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + '/api/properties', {
          method: 'POST',
          headers: { ...auth, Origin: 'https://evil.example' },
          body: JSON.stringify(p),
        })
      ).status,
      403,
    );
  } finally {
    assert.equal(
      (
        await fetch(base + '/api/properties?id=' + id, {
          method: 'DELETE',
          headers: auth,
        })
      ).status,
      200,
    );
  }
  const list = (await (
    await fetch(base + '/api/properties', { headers: auth })
  ).json()) as { properties: Property[] };
  assert.equal(
    list.properties.some((p) => p.id === id),
    false,
  );
});
void test('discovery rejects wide or injected bounds before provider call', async () => {
  for (const body of [
    { south: 37, west: -123, north: 38, east: -121 },
    { south: '37);out;', west: -122, north: 37.4, east: -121.9 },
  ])
    assert.equal(
      (
        await fetch(base + '/api/discover', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
});
void test('Google map config has safe empty-key fallback', async () => {
  const response = await fetch(base + '/api/map-config', { headers: auth });
  assert.equal(response.status, 200);
  const data = (await response.json()) as { googleMapsApiKey: string };
  assert.equal(typeof data.googleMapsApiKey, 'string');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
