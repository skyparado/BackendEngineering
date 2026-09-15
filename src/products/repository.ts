import type { DatabaseSync } from 'node:sqlite';
import type { ProductInput } from '../validation.js';

export interface Product extends ProductInput {
  id: number;
  createdAt: string;
}

export class ProductRepository {
  constructor(private db: DatabaseSync) {}
  list(page?: number, limit = 20): Product[] {
    return page === undefined
      ? this.db.prepare('SELECT * FROM products ORDER BY id').all() as unknown as Product[]
      : this.db.prepare('SELECT * FROM products ORDER BY id LIMIT ? OFFSET ?').all(limit, (page - 1) * limit) as unknown as Product[];
  }
  get(id: number): Product | undefined {
    return this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as unknown as Product | undefined;
  }
  create(input: ProductInput): Product {
    return this.db.prepare('INSERT INTO products (name, price, stock, category, description, size) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
      .get(input.name, input.price, input.stock, input.category, input.description, input.size) as unknown as Product;
  }
  update(id: number, input: Partial<ProductInput>): Product | undefined {
    const allowed = ['name', 'price', 'stock', 'category', 'description', 'size'];
    const entries = Object.entries(input).filter(([key]) => allowed.includes(key));
    return this.db.prepare('UPDATE products SET ' + entries.map(([key]) => key + ' = ?').join(', ') + ' WHERE id = ? RETURNING *')
      .get(...entries.map(([, value]) => value), id) as unknown as Product | undefined;
  }
  delete(id: number) { return this.db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0; }
}
