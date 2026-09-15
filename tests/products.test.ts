import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database.js';

const product = { name: 'LSCS Shirt', price: 450, stock: 20, category: 'Clothing', description: 'Official shirt', size: 'M' };
let db: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;
beforeEach(() => { db = openDatabase(':memory:'); app = createApp(db); });
afterEach(() => { db.close(); vi.restoreAllMocks(); });

describe('Products API', () => {
  it('returns an empty JSON array initially', async () => {
    const result = await request(app).get('/api/products').expect(200).expect('Content-Type', /json/);
    expect(result.body).toEqual([]);
  });
  it('creates, reads, partially updates, and deletes a product', async () => {
    const created = await request(app).post('/api/products').send(product).expect(201);
    expect(created.body).toMatchObject(product);
    expect(created.body.id).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(created.body.createdAt))).toBe(false);
    const url = '/api/products/' + created.body.id;
    expect((await request(app).get(url).expect(200)).body).toEqual(created.body);
    const updated = await request(app).put(url).send({ stock: 0 }).expect(200);
    expect(updated.body).toEqual({ ...created.body, stock: 0 });
    expect((await request(app).get('/api/products')).body).toEqual([updated.body]);
    await request(app).delete(url).expect(200, { message: 'Product deleted successfully.' });
    await request(app).get(url).expect(404);
  });
  it('defaults optional custom fields', async () => {
    const { description, size, ...required } = product;
    const result = await request(app).post('/api/products').send(required).expect(201);
    expect(result.body).toMatchObject({ description: '', size: 'One Size' });
  });
  it.each([{}, { ...product, name: ' ' }, { ...product, price: 0 }, { ...product, price: '450' }, { ...product, stock: -1 }, { ...product, stock: 1.5 }, { ...product, category: null }, { ...product, id: 10 }])('rejects invalid creation: %j', async body => {
    await request(app).post('/api/products').send(body).expect(400);
    expect((await request(app).get('/api/products')).body).toEqual([]);
  });
  it('rejects empty, invalid and read-only updates without changing the row', async () => {
    const created = (await request(app).post('/api/products').send(product)).body;
    for (const body of [{}, { price: -2 }, { createdAt: 'now' }, { size: '' }]) {
      await request(app).put('/api/products/' + created.id).send(body).expect(400);
    }
    expect((await request(app).get('/api/products/' + created.id)).body).toEqual(created);
  });
  it('returns 404 for missing or malformed IDs', async () => {
    for (const id of ['999', 'abc', '0', '1.5', '9007199254740992']) {
      await request(app).get('/api/products/' + id).expect(404);
      await request(app).put('/api/products/' + id).send({ stock: 2 }).expect(404);
      await request(app).delete('/api/products/' + id).expect(404);
    }
  });
  it('paginates in ID order and preserves array responses', async () => {
    for (let i = 0; i < 3; i++) await request(app).post('/api/products').send({ ...product, name: 'Product ' + i });
    const result = await request(app).get('/api/products?page=2&limit=2').expect(200);
    expect(result.body.map((p: { name: string }) => p.name)).toEqual(['Product 2']);
    await request(app).get('/api/products?page=0').expect(400);
    await request(app).get('/api/products?limit=101').expect(400);
    await request(app).get('/api/products?page=1&page=2').expect(400);
  });
  it('returns JSON errors for malformed JSON and unknown routes', async () => {
    await request(app).post('/api/products').set('Content-Type', 'application/json').send('{').expect(400).expect('Content-Type', /json/);
    await request(app).get('/missing').expect(404).expect('Content-Type', /json/);
  });
  it('hides internal database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.exec('DROP TABLE products');
    await request(app).get('/api/products').expect(500, { error: 'Internal server error.' });
  });
});


describe('Request boundaries', () => {
  it.each([
    { name: 'x'.repeat(121) },
    { category: 'x'.repeat(81) },
    { description: 'x'.repeat(2001) },
    { size: 'x'.repeat(31) },
    { stock: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects field boundaries on both create and update: %j', async invalid => {
    const created = (await request(app).post('/api/products').send(product).expect(201)).body;
    await request(app).post('/api/products').send({ ...product, ...invalid }).expect(400);
    await request(app).put('/api/products/' + created.id).send(invalid).expect(400);
    expect((await request(app).get('/api/products').expect(200)).body).toEqual([created]);
  });

  it('trims strings and accepts maximum valid field lengths', async () => {
    const input = {
      name: 'x'.repeat(120), category: 'x'.repeat(80),
      description: 'x'.repeat(2000), size: 'x'.repeat(30),
      price: 0.01, stock: Number.MAX_SAFE_INTEGER,
    };
    const created = await request(app).post('/api/products').send(input).expect(201);
    expect(created.body).toMatchObject(input);
    const updated = await request(app).put('/api/products/' + created.body.id)
      .send({ name: '  Shirt  ', description: '  Cotton  ' }).expect(200);
    expect(updated.body).toMatchObject({ ...input, name: 'Shirt', description: 'Cotton' });
  });

  it('provides useful field-level validation details', async () => {
    const response = await request(app).post('/api/products').send({ ...product, price: -1 }).expect(400);
    expect(response.body.error).toBe('Validation failed.');
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'price', message: expect.any(String) }),
    ]));
    expect(response.body.details[0].message.length).toBeGreaterThan(0);
  });

  it('rejects oversized JSON without creating a row', async () => {
    await request(app).post('/api/products').send({ ...product, description: 'x'.repeat(110000) })
      .expect(413, { error: 'Request body exceeds 100kb.' });
    expect((await request(app).get('/api/products').expect(200)).body).toEqual([]);
  });

  it('rejects unsupported JSON charset with a JSON error', async () => {
    await request(app).post('/api/products').set('Content-Type', 'application/json; charset=iso-8859-1')
      .send(JSON.stringify(product)).expect(415)
      .expect({ error: 'Unsupported request encoding or charset.' });
  });

  it.each(['page=1000001', 'page=1.5', 'limit=0', 'limit=2&limit=3', 'sort=name'])
    ('rejects invalid pagination: %s', async query => {
      await request(app).get('/api/products?' + query).expect(400);
    });

  it('applies pagination defaults and returns an empty array beyond the last page', async () => {
    const created = (await request(app).post('/api/products').send(product).expect(201)).body;
    expect((await request(app).get('/api/products?limit=1').expect(200)).body).toEqual([created]);
    expect((await request(app).get('/api/products?page=1').expect(200)).body).toEqual([created]);
    expect((await request(app).get('/api/products?page=2&limit=1').expect(200)).body).toEqual([]);
  });
});
