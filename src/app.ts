import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { DatabaseSync } from 'node:sqlite';
import { productRoutes } from './products/routes.js';
import { ProductRepository } from './products/repository.js';

export function createApp(db: DatabaseSync) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/products', productRoutes(new ProductRepository(db)));
  app.use((_req, res) => { res.status(404).json({ error: 'Route not found.' }); });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed.', details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
      return;
    }
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON.' }); return;
    }
    if (error?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body exceeds 100kb.' }); return;
    }
    if (error?.status === 415) {
      res.status(415).json({ error: 'Unsupported request encoding or charset.' }); return;
    }
    console.error('Unhandled API error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  };
  app.use(handleError);
  return app;
}
