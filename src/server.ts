import { createApp } from './app.js';
import { openDatabase } from './database.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const db = openDatabase();
const server = createApp(db).listen(port, () => console.log('Macky Merch API listening on port ' + port));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => { db.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
