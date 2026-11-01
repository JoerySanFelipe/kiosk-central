import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  // Store database file in project root
  const dbPath = path.resolve(process.cwd(), 'kiosk_central.db');
  dbInstance = new DatabaseSync(dbPath);

  // Enable WAL mode for high performance concurrency
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      station_name TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      target_machine_id TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      inserted_rows INTEGER DEFAULT 0,
      updated_rows INTEGER DEFAULT 0,
      skipped_rows INTEGER DEFAULT 0,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      service_type TEXT NOT NULL,
      reference_no TEXT,
      transaction_time TEXT NOT NULL,
      account_or_phone TEXT,
      customer_name TEXT,
      provider_or_biller TEXT,
      sub_type TEXT,
      amount REAL NOT NULL,
      fee REAL NOT NULL,
      inserted_amount REAL NOT NULL,
      wallet_deduction REAL NOT NULL,
      provider_cost REAL NOT NULL,
      net_profit REAL NOT NULL,
      old_balance REAL,
      new_balance REAL,
      status TEXT NOT NULL,
      notes TEXT,
      is_personal_draw INTEGER DEFAULT 0,
      import_batch_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(machine_id) REFERENCES machines(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(transaction_time);
    CREATE INDEX IF NOT EXISTS idx_transactions_machine ON transactions(machine_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_service ON transactions(service_type);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

    CREATE TABLE IF NOT EXISTS wallet_replenishments (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      source TEXT,
      reference_no TEXT,
      receipt_image_url TEXT,
      replenished_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_harvests (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      harvested_at TEXT NOT NULL,
      reporting_date TEXT,
      report_name TEXT,
      raw_expected_amount REAL,
      expected_amount REAL NOT NULL,
      base_amount REAL,
      adjustment_type TEXT DEFAULT 'NONE',
      adjustment_amount REAL DEFAULT 0,
      adjustment_reason TEXT,
      total_added REAL DEFAULT 0,
      total_deducted REAL DEFAULT 0,
      net_adjustment REAL DEFAULT 0,
      adjustments_json TEXT,
      actual_amount REAL NOT NULL,
      variance REAL NOT NULL,
      collected_by TEXT NOT NULL,
      slip_image_url TEXT,
      notes TEXT,
      deposited_collection_id TEXT,
      is_deposited INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY(machine_id) REFERENCES machines(id)
    );

    CREATE TABLE IF NOT EXISTS cash_harvest_adjustments (
      id TEXT PRIMARY KEY,
      harvest_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target TEXT DEFAULT 'EXPECTED',
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(harvest_id) REFERENCES cash_harvests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deposited_collections (
      id TEXT PRIMARY KEY,
      deposit_date TEXT NOT NULL,
      deposit_type TEXT NOT NULL,
      reference_no TEXT,
      expected_amount REAL NOT NULL,
      actual_amount REAL NOT NULL,
      variance REAL NOT NULL,
      deposited_by TEXT NOT NULL,
      received_by TEXT,
      slip_image_url TEXT,
      notes TEXT,
      is_replenished INTEGER DEFAULT 0,
      replenished_at TEXT,
      wallet_replenishment_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deposited_collections_date ON deposited_collections(deposit_date);
    CREATE INDEX IF NOT EXISTS idx_harvests_machine ON cash_harvests(machine_id);
    CREATE INDEX IF NOT EXISTS idx_harvests_time ON cash_harvests(harvested_at);
    CREATE INDEX IF NOT EXISTS idx_harvests_deposit ON cash_harvests(deposited_collection_id);
    CREATE INDEX IF NOT EXISTS idx_replenishments_time ON wallet_replenishments(replenished_at);

    CREATE TABLE IF NOT EXISTS auth_pins (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe migration & initial seed for auth_pins
  try {
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM auth_pins').get() as { cnt: number } | undefined;
    if (!countRow || countRow.cnt === 0) {
      const now = new Date().toISOString();
      // SHA-256 for default '1234'
      const defaultHash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
      db.prepare(`
        INSERT INTO auth_pins (id, label, pin_hash, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run('pin_default_master', 'Master Owner PIN', defaultHash, now, now);
    }
  } catch (e) {
    console.error('Safe migration auth_pins note:', e);
  }

  // Safe migration for contact_number column
  try {
    db.exec('ALTER TABLE machines ADD COLUMN contact_number TEXT;');
  } catch {
    // Column already exists
  }

  // Safe migration for is_personal_draw column
  try {
    db.exec('ALTER TABLE transactions ADD COLUMN is_personal_draw INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Safe migration for cash_harvests deposited tracking
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN deposited_collection_id TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN is_deposited INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Safe migration for cash_harvests adjustment tracking
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN base_amount REAL;');
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE cash_harvests ADD COLUMN adjustment_type TEXT DEFAULT 'NONE';");
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN adjustment_amount REAL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN adjustment_reason TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN total_added REAL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN total_deducted REAL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN net_adjustment REAL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN adjustments_json TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN updated_at TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN raw_expected_amount REAL;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN reporting_date TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN report_name TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cash_harvests ADD COLUMN slip_image_url TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE cash_harvest_adjustments ADD COLUMN target TEXT DEFAULT 'EXPECTED';");
  } catch {
    // Column already exists
  }

  // Safe migrations for deposited_collections replenishment tracking
  try {
    db.exec('ALTER TABLE deposited_collections ADD COLUMN is_replenished INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE deposited_collections ADD COLUMN replenished_at TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE wallet_replenishments ADD COLUMN receipt_image_url TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE deposited_collections ADD COLUMN wallet_replenishment_id TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_deposited_collections_replenished ON deposited_collections(is_replenished);');
  } catch {
    // Index already exists
  }

  // Seed default settings
  db.exec("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('currency', '₱');");

  // Seed default machines if not present
  const checkMachines = db.prepare('SELECT count(*) as count FROM machines').get() as { count: number };
  if (!checkMachines || checkMachines.count === 0) {
    const now = new Date().toISOString();
    const insertMachine = db.prepare(`
      INSERT INTO machines (id, name, location, contact_number, station_name, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMachine.run('m1', 'Machine 1 (Main Vendo)', 'Main Branch', '09171234567', 'Main Vendo', 1, now);
    insertMachine.run('m2', 'Machine 2', 'Second Branch', '09187654321', 'Vendo 2', 0, now);
  }
}
