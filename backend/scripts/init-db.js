const db = require('../src/db/database');

console.log('Initializing database schema and checking admin user...');
db.init();
console.log('Database initialized successfully at:', db.dbPath);
db.close();
