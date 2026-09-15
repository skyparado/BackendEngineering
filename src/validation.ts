import { z } from 'zod';

const fields = {
  name: z.string().trim().min(1).max(120),
  price: z.number().finite().positive(),
  stock: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000),
  size: z.string().trim().min(1).max(30),
};
export const createProduct = z.strictObject({
  ...fields,
  description: fields.description.default(''),
  size: fields.size.default('One Size'),
});
export const updateProduct = z.strictObject(fields).partial()
  .refine(value => Object.keys(value).length > 0, 'Provide at least one product field.');
export const pagination = z.strictObject({
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(1000000)).default(1),
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
});
export type ProductInput = z.infer<typeof createProduct>;
