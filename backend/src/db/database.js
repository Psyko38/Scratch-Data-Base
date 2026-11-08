const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = { v4: () => require('node:crypto').randomUUID() };
const config = require('../config');

class Database {
  constructor(dbPath = config.databasePath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    if (this.db) return this;

    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(this.dbPath);

    // Concurrency and integrity settings
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (this.dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    }

    // Initialize schema
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);

    this.seedDefaultAdmin();
    return this;
  }

  seedDefaultAdmin() {
    const checkStmt = this.db.prepare('SELECT COUNT(*) as count FROM admins');
    const result = checkStmt.get();
    if (result && result.count === 0) {
      const id = uuidv4();
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(config.adminDefaultPassword, salt);
      const insertStmt = this.db.prepare(
        'INSERT INTO admins (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
      );
      insertStmt.run(id, config.adminDefaultUsername, hash, new Date().toISOString());
      console.log(`[DB] Created default admin account: ${config.adminDefaultUsername}`);
    }
  }

  queryAll(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  queryOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) || null;
  }

  execute(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  transaction(callback) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = callback(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
const dbInstance = new Database();

module.exports = dbInstance;
module.exports.Database = Database;
