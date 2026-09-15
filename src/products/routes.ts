import { Router } from 'express';
import { createProduct, updateProduct, pagination } from '../validation.js';
import { ProductRepository } from './repository.js';

export function productRoutes(repository: ProductRepository) {
  const router = Router();
  router.param('id', (req, res, next, raw: string) => {
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      res.status(404).json({ error: 'Product not found.' }); return;
    }
    res.locals.productId = Number(raw);
    next();
  });
  router.get('/', (req, res) => {
    if (Object.keys(req.query).length === 0) { res.json(repository.list()); return; }
    const query = pagination.parse(req.query);
    res.json(repository.list(query.page, query.limit));
  });
  router.post('/', (req, res) => {
    const product = repository.create(createProduct.parse(req.body));
    res.status(201).json(product);
  });
  router.get('/:id', (_req, res) => {
    const product = repository.get(res.locals.productId);
    if (!product) { res.status(404).json({ error: 'Product not found.' }); return; }
    res.json(product);
  });
  router.put('/:id', (req, res) => {
    const input = updateProduct.parse(req.body);
    const product = repository.update(res.locals.productId, input);
    if (!product) { res.status(404).json({ error: 'Product not found.' }); return; }
    res.json(product);
  });
  router.delete('/:id', (_req, res) => {
    if (!repository.delete(res.locals.productId)) { res.status(404).json({ error: 'Product not found.' }); return; }
    res.json({ message: 'Product deleted successfully.' });
  });
  return router;
}
