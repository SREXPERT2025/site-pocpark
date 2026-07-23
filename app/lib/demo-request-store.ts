import 'server-only';

import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  DEMO_TEST_TENANT_ID,
  DEMO_USER_REQUEST_LIMIT,
  DEMO_USER_TTL_MS,
  GUEST_REQUEST_HOURLY_RATE,
} from './demo-config';
import { getDemoDatabase } from './demo-database';

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
  tenant_id: string | null;
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
    hourlyRate: GUEST_REQUEST_HOURLY_RATE,
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
      id, public_token, session_id, created_at, expires_at, tenant, tenant_id, guest_name,
      valid_from, valid_until, request_type, phone, vehicle_number, note, status,
      entered_at, exited_at, hourly_rate, is_seed
    ) VALUES (
      @id, @publicToken, NULL, @createdAt, @expiresAt, @tenant, @tenantId, @guestName,
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
      hourly_rate=excluded.hourly_rate,
      tenant_id=excluded.tenant_id
  `);
  const transaction = db.transaction(() => {
    for (const request of seedRequests()) {
      statement.run({
        ...request,
        tenantId: DEMO_TEST_TENANT_ID,
        enteredAt: request.enteredAt ?? null,
        exitedAt: request.exitedAt ?? null,
      });
    }
  });
  transaction();
}

function prepareStore() {
  const db = getDemoDatabase();
  db.prepare('DELETE FROM demo_feedback_leads WHERE expires_at <= ?').run(Date.now());
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
    hourlyRate: GUEST_REQUEST_HOURLY_RATE,
  };
  db.prepare(`
    INSERT INTO demo_guest_requests (
      id, public_token, session_id, created_at, expires_at, tenant, tenant_id, guest_name,
      valid_from, valid_until, request_type, phone, vehicle_number, note, status,
      hourly_rate, is_seed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    request.id, request.publicToken, sessionId, request.createdAt, Date.now() + DEMO_USER_TTL_MS,
    request.tenant, DEMO_TEST_TENANT_ID, request.guestName, request.validFrom, request.validUntil,
    request.requestType, request.phone, request.vehicleNumber, request.note,
    request.status, request.hourlyRate
  );
  db.prepare(`
    DELETE FROM demo_guest_requests
    WHERE session_id = ? AND is_seed = 0 AND id NOT IN (
      SELECT id FROM demo_guest_requests
      WHERE session_id = ? AND is_seed = 0
      ORDER BY created_at DESC
      LIMIT ${DEMO_USER_REQUEST_LIMIT}
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
