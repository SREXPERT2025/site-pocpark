import 'server-only';

import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type DemoRequestStatus = 'waiting' | 'cancelled' | 'active' | 'completed';
export type DemoRequestType = 'single' | 'multiple';

export type DemoGuestRequest = {
  id: string;
  publicToken: string;
  createdAt: string;
  tenant: 'TEST';
  guestName: string;
  validFrom: string;
  validUntil: string;
  requestType: DemoRequestType;
  phone: string;
  vehicleNumber: string;
  note: string;
  status: DemoRequestStatus;
  enteredAt?: string;
  exitedAt?: string;
  hourlyRate?: number;
  isSeed?: boolean;
};

type DemoRequestRow = {
  id: string;
  public_token: string;
  session_id: string | null;
  created_at: string;
  expires_at: number | null;
  tenant: string;
  guest_name: string;
  valid_from: string;
  valid_until: string;
  request_type: string;
  phone: string;
  vehicle_number: string;
  note: string;
  status: string;
  entered_at: string | null;
  exited_at: string | null;
  hourly_rate: number | null;
  is_seed: number;
};

type CreateDemoRequestInput = Pick<
  DemoGuestRequest,
  'guestName' | 'validFrom' | 'validUntil' | 'requestType' | 'phone' | 'vehicleNumber' | 'note'
>;

const USER_TTL_MS = 24 * 60 * 60 * 1000;
const DEMO_HOURLY_RATE = 100;

declare global {
  // eslint-disable-next-line no-var
  var __rosparkDemoDb: Database.Database | undefined;
}

function databasePath() {
  return process.env.DEMO_REQUESTS_DB_PATH || path.join(process.cwd(), '.data', 'guest-requests.sqlite');
}

function openDatabase() {
  if (global.__rosparkDemoDb) return global.__rosparkDemoDb;
  const filePath = databasePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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
  global.__rosparkDemoDb = db;
  return db;
}

function shiftedIso(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60_000).toISOString();
}

function seedRequests(): Array<DemoGuestRequest & { expiresAt: null }> {
  const now = new Date();
  const names = [
    'Игорь Николаевич', 'Марина Соколова', 'Андрей Родионов', 'Виталий Васильев',
    'Дмитрий Орлов', 'Анна Морозова', 'Сергей Иванов', 'Ольга Петрова',
    'Алексей Смирнов', 'Елена Волкова', 'Михаил Кузнецов', 'Наталья Фёдорова',
    'Роман Лебедев', 'Ирина Павлова', 'Константин Егоров',
  ];
  const plates = [
    'У545КА90', 'У732РН190', 'А777АА250', 'Х938ВЕ977', 'Т555ТТ77',
    'К880АА790', 'Е777ЕЕ97', 'М123ММ77', 'С456СС197', 'Н909НН50',
    'В234ВВ799', 'Р678РР77', 'О001ОО99', 'А321ВС77', 'К456МН190',
  ];
  const base = (index: number, status: DemoRequestStatus): DemoGuestRequest & { expiresAt: null } => ({
    id: `D3M02026${String(index + 1).padStart(8, '0')}`,
    publicToken: `demo-${String(index + 1).padStart(2, '0')}`,
    createdAt: shiftedIso(now, -(index + 1) * 70),
    expiresAt: null,
    tenant: 'TEST',
    guestName: names[index],
    validFrom: shiftedIso(now, -60),
    validUntil: shiftedIso(now, 8 * 60),
    requestType: index % 4 === 0 ? 'multiple' : 'single',
    phone: `7999000${String(index + 1).padStart(4, '0')}`,
    vehicleNumber: plates[index],
    note: index % 3 === 0 ? 'Встреча в офисе арендатора' : 'Гостевой визит',
    status,
    hourlyRate: DEMO_HOURLY_RATE,
    isSeed: true,
  });
  const waiting = [0, 1].map((index) => ({
    ...base(index, 'waiting'),
    validFrom: shiftedIso(now, (index + 1) * 60),
    validUntil: shiftedIso(now, (index + 3) * 60),
  }));
  const active = [35, 75, 125, 190, 260, 340, 430].map((minutes, offset) => ({
    ...base(offset + 2, 'active'),
    enteredAt: shiftedIso(now, -minutes),
    validFrom: shiftedIso(now, -minutes - 30),
    validUntil: shiftedIso(now, 10 * 60),
  }));
  const completed = [45, 90, 135, 200, 310, 420].map((minutes, offset) => {
    const index = offset + 9;
    const exitOffset = -(offset + 1) * 180;
    return {
      ...base(index, 'completed'),
      enteredAt: shiftedIso(now, exitOffset - minutes),
      exitedAt: shiftedIso(now, exitOffset),
      validFrom: shiftedIso(now, exitOffset - minutes - 30),
      validUntil: shiftedIso(now, exitOffset + 60),
    };
  });
  return [...waiting, ...active, ...completed];
}

function rowToRequest(row: DemoRequestRow): DemoGuestRequest {
  return {
    id: row.id,
    publicToken: row.public_token,
    createdAt: row.created_at,
    tenant: 'TEST',
    guestName: row.guest_name,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    requestType: row.request_type as DemoRequestType,
    phone: row.phone,
    vehicleNumber: row.vehicle_number,
    note: row.note,
    status: row.status as DemoRequestStatus,
    enteredAt: row.entered_at || undefined,
    exitedAt: row.exited_at || undefined,
    hourlyRate: row.hourly_rate || undefined,
    isSeed: Boolean(row.is_seed),
  };
}

function upsertSeeds(db: Database.Database) {
  const statement = db.prepare(`
    INSERT INTO demo_guest_requests (
      id, public_token, session_id, created_at, expires_at, tenant, guest_name,
      valid_from, valid_until, request_type, phone, vehicle_number, note, status,
      entered_at, exited_at, hourly_rate, is_seed
    ) VALUES (
      @id, @publicToken, NULL, @createdAt, @expiresAt, @tenant, @guestName,
      @validFrom, @validUntil, @requestType, @phone, @vehicleNumber, @note, @status,
      @enteredAt, @exitedAt, @hourlyRate, 1
    )
    ON CONFLICT(id) DO UPDATE SET
      created_at=excluded.created_at,
      valid_from=excluded.valid_from,
      valid_until=excluded.valid_until,
      status=excluded.status,
      entered_at=excluded.entered_at,
      exited_at=excluded.exited_at,
      hourly_rate=excluded.hourly_rate
  `);
  const transaction = db.transaction(() => {
    for (const request of seedRequests()) {
      statement.run({ ...request, enteredAt: request.enteredAt ?? null, exitedAt: request.exitedAt ?? null });
    }
  });
  transaction();
}

function prepareStore() {
  const db = openDatabase();
  db.prepare('DELETE FROM demo_guest_requests WHERE is_seed = 0 AND expires_at <= ?').run(Date.now());
  upsertSeeds(db);
  return db;
}

export function listDemoRequests(sessionId: string) {
  const rows = prepareStore()
    .prepare(`
      SELECT * FROM demo_guest_requests
      WHERE is_seed = 1 OR session_id = ?
      ORDER BY is_seed ASC, created_at DESC, id ASC
    `)
    .all(sessionId) as DemoRequestRow[];
  return rows.map(rowToRequest).slice(0, 35);
}

export function createDemoRequest(sessionId: string, input: CreateDemoRequestInput) {
  const db = prepareStore();
  const request: DemoGuestRequest = {
    id: randomBytes(8).toString('hex').toUpperCase(),
    publicToken: randomBytes(24).toString('hex'),
    createdAt: new Date().toISOString(),
    tenant: 'TEST',
    ...input,
    status: 'waiting',
    hourlyRate: DEMO_HOURLY_RATE,
  };
  db.prepare(`
    INSERT INTO demo_guest_requests (
      id, public_token, session_id, created_at, expires_at, tenant, guest_name,
      valid_from, valid_until, request_type, phone, vehicle_number, note, status,
      hourly_rate, is_seed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    request.id, request.publicToken, sessionId, request.createdAt, Date.now() + USER_TTL_MS,
    request.tenant, request.guestName, request.validFrom, request.validUntil,
    request.requestType, request.phone, request.vehicleNumber, request.note,
    request.status, request.hourlyRate
  );
  db.prepare(`
    DELETE FROM demo_guest_requests
    WHERE session_id = ? AND is_seed = 0 AND id NOT IN (
      SELECT id FROM demo_guest_requests
      WHERE session_id = ? AND is_seed = 0
      ORDER BY created_at DESC
      LIMIT 20
    )
  `).run(sessionId, sessionId);
  return request;
}

export function cancelDemoRequest(sessionId: string, id: string) {
  const db = prepareStore();
  const result = db.prepare(`
    UPDATE demo_guest_requests
    SET status = 'cancelled'
    WHERE id = ? AND session_id = ? AND is_seed = 0 AND status = 'waiting'
  `).run(id, sessionId);
  if (!result.changes) return null;
  const row = db.prepare('SELECT * FROM demo_guest_requests WHERE id = ?').get(id) as DemoRequestRow;
  return rowToRequest(row);
}

export function getDemoRequestForSession(sessionId: string, id: string) {
  const row = prepareStore()
    .prepare('SELECT * FROM demo_guest_requests WHERE id = ? AND (is_seed = 1 OR session_id = ?)')
    .get(id, sessionId) as DemoRequestRow | undefined;
  return row ? rowToRequest(row) : null;
}

export function getPublicDemoRequest(publicToken: string) {
  if (!/^(demo-\d{2}|[a-f0-9]{48})$/.test(publicToken)) return null;
  const row = prepareStore()
    .prepare('SELECT * FROM demo_guest_requests WHERE public_token = ?')
    .get(publicToken) as DemoRequestRow | undefined;
  return row ? rowToRequest(row) : null;
}
