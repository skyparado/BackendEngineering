import { openDatabase } from './database.js';
const db = openDatabase();
db.close();
console.log('Database schema ready.');
