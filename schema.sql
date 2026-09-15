CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  price REAL NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0 AND stock <= 9007199254740991),
  category TEXT NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  size TEXT NOT NULL DEFAULT 'One Size' CHECK (length(trim(size)) BETWEEN 1 AND 30),
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
