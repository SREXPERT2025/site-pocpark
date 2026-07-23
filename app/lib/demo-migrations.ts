import 'server-only';

import type Database from 'better-sqlite3';
import { DEMO_TEST_TENANT_ID } from './demo-config';
import { generateDemoTenants } from './demo-synthetic-data';

type DemoMigration = {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
};

type TableInfoRow = {
  name: string;
};

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
  const columns = db.pragma(`table_info(${tableName})`) as TableInfoRow[];
  return columns.some((column) => column.name === columnName);
}

function createBaselineGuestRequests(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_guest_requests (
      id TEXT PRIMARY KEY,
      public_token TEXT NOT NULL UNIQUE,
      session_id TEXT,
      created_at TEXT NOT NULL,
      expires_at INTEGER,
      tenant TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      request_type TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      entered_at TEXT,
      exited_at TEXT,
      hourly_rate INTEGER,
      is_seed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_demo_requests_session ON demo_guest_requests(session_id);
    CREATE INDEX IF NOT EXISTS idx_demo_requests_expiry ON demo_guest_requests(expires_at);
  `);
}

function upsertDemoTenants(db: Database.Database) {
  const statement = db.prepare(`
    INSERT INTO demo_tenants (
      id, short_name, legal_name, inn, object_type, is_seed, created_at
    ) VALUES (
      @id, @shortName, @legalName, @inn, @objectType, @isSeed, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      short_name=excluded.short_name,
      legal_name=excluded.legal_name,
      inn=excluded.inn,
      object_type=excluded.object_type,
      is_seed=excluded.is_seed
  `);
  for (const tenant of generateDemoTenants()) {
    statement.run({ ...tenant, isSeed: tenant.isSeed ? 1 : 0 });
  }
}

function createTenantAndParkingFoundation(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_tenants (
      id TEXT PRIMARY KEY,
      short_name TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      inn TEXT NOT NULL UNIQUE,
      object_type TEXT NOT NULL CHECK (
        object_type IN ('office', 'warehouse', 'retail', 'service', 'entertainment', 'logistics')
      ),
      is_seed INTEGER NOT NULL DEFAULT 1 CHECK (is_seed IN (0, 1)),
      created_at TEXT NOT NULL
    );
  `);
  upsertDemoTenants(db);

  if (!hasColumn(db, 'demo_guest_requests', 'tenant_id')) {
    db.exec('ALTER TABLE demo_guest_requests ADD COLUMN tenant_id TEXT');
  }
  db.prepare(`
    UPDATE demo_guest_requests
    SET tenant_id = ?
    WHERE tenant_id IS NULL OR tenant_id = ''
  `).run(DEMO_TEST_TENANT_ID);
  db.exec('CREATE INDEX IF NOT EXISTS idx_demo_requests_tenant ON demo_guest_requests(tenant_id)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_parking_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      tenant_id TEXT NOT NULL,
      ticket_number TEXT NOT NULL,
      vehicle_number TEXT,
      vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car', 'truck')),
      entered_at TEXT NOT NULL,
      exited_at TEXT,
      tariff_code TEXT NOT NULL,
      hourly_rate INTEGER NOT NULL CHECK (hourly_rate >= 0),
      calculated_cost INTEGER NOT NULL CHECK (calculated_cost >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
      created_at TEXT NOT NULL,
      expires_at INTEGER,
      is_seed INTEGER NOT NULL DEFAULT 0 CHECK (is_seed IN (0, 1)),
      FOREIGN KEY (tenant_id) REFERENCES demo_tenants(id),
      UNIQUE (session_id, ticket_number)
    );
    CREATE INDEX IF NOT EXISTS idx_demo_parking_session ON demo_parking_sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_demo_parking_tenant ON demo_parking_sessions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_demo_parking_ticket ON demo_parking_sessions(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_demo_parking_vehicle ON demo_parking_sessions(vehicle_number);
    CREATE INDEX IF NOT EXISTS idx_demo_parking_status ON demo_parking_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_demo_parking_expiry ON demo_parking_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS demo_guest_passages (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      request_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      parking_session_id TEXT,
      entered_at TEXT NOT NULL,
      exited_at TEXT,
      duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
      amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at TEXT NOT NULL,
      expires_at INTEGER,
      is_seed INTEGER NOT NULL DEFAULT 0 CHECK (is_seed IN (0, 1)),
      FOREIGN KEY (request_id) REFERENCES demo_guest_requests(id),
      FOREIGN KEY (tenant_id) REFERENCES demo_tenants(id),
      FOREIGN KEY (parking_session_id) REFERENCES demo_parking_sessions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_demo_passages_session ON demo_guest_passages(session_id);
    CREATE INDEX IF NOT EXISTS idx_demo_passages_request ON demo_guest_passages(request_id);
    CREATE INDEX IF NOT EXISTS idx_demo_passages_tenant ON demo_guest_passages(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_demo_passages_parking ON demo_guest_passages(parking_session_id);
    CREATE INDEX IF NOT EXISTS idx_demo_passages_status ON demo_guest_passages(status);
    CREATE INDEX IF NOT EXISTS idx_demo_passages_expiry ON demo_guest_passages(expires_at);

    CREATE TABLE IF NOT EXISTS demo_web_discounts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      parking_session_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      original_cost INTEGER NOT NULL CHECK (original_cost >= 0),
      discount_percent INTEGER NOT NULL CHECK (discount_percent = 100),
      guest_due INTEGER NOT NULL CHECK (guest_due = 0),
      tenant_charge INTEGER NOT NULL CHECK (tenant_charge >= 0 AND tenant_charge = original_cost),
      status TEXT NOT NULL CHECK (status = 'applied'),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      expires_at INTEGER,
      FOREIGN KEY (parking_session_id) REFERENCES demo_parking_sessions(id),
      FOREIGN KEY (tenant_id) REFERENCES demo_tenants(id),
      UNIQUE (session_id, parking_session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_demo_discounts_session ON demo_web_discounts(session_id);
    CREATE INDEX IF NOT EXISTS idx_demo_discounts_tenant ON demo_web_discounts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_demo_discounts_applied ON demo_web_discounts(applied_at);
    CREATE INDEX IF NOT EXISTS idx_demo_discounts_expiry ON demo_web_discounts(expires_at);
  `);
}

function createFeedbackLeads(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_feedback_leads (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL CHECK (
        length(phone) = 11 AND phone GLOB '7[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
      ),
      created_at TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source = 'demo_guest_requests'),
      session_ref TEXT NOT NULL,
      request_id TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('max', 'whatsapp', 'copy')),
      consent INTEGER NOT NULL CHECK (consent = 1),
      consent_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
      page_source TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      UNIQUE (session_ref, request_id)
    );
    CREATE INDEX IF NOT EXISTS idx_demo_feedback_leads_expiry
      ON demo_feedback_leads(expires_at);
    CREATE INDEX IF NOT EXISTS idx_demo_feedback_leads_created
      ON demo_feedback_leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_demo_feedback_leads_status
      ON demo_feedback_leads(status);
  `);
}

const migrations: DemoMigration[] = [
  {
    version: 1,
    name: 'baseline_guest_requests',
    up: createBaselineGuestRequests,
  },
  {
    version: 2,
    name: 'tenant_parking_discount_foundation',
    up: createTenantAndParkingFoundation,
  },
  {
    version: 3,
    name: 'demo_feedback_leads',
    up: createFeedbackLeads,
  },
];

export function runDemoMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Map(
    (db.prepare('SELECT version, name FROM demo_schema_migrations ORDER BY version').all() as Array<{
      version: number;
      name: string;
    }>).map((migration) => [migration.version, migration.name]),
  );

  for (const migration of migrations) {
    const existingName = applied.get(migration.version);
    if (existingName) {
      if (existingName !== migration.name) {
        throw new Error(`Конфликт demo-миграции v${migration.version}: ${existingName}.`);
      }
      continue;
    }

    db.transaction(() => {
      migration.up(db);
      db.prepare(`
        INSERT INTO demo_schema_migrations (version, name, applied_at)
        VALUES (?, ?, ?)
      `).run(migration.version, migration.name, new Date().toISOString());
    })();
  }
}

export function listAppliedDemoMigrations(db: Database.Database) {
  return db.prepare(`
    SELECT version, name, applied_at
    FROM demo_schema_migrations
    ORDER BY version
  `).all() as Array<{ version: number; name: string; applied_at: string }>;
}
