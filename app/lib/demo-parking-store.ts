import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { calculateDemoParkingCost, DEMO_USER_TTL_MS, WEB_DEMO_TARIFFS } from './demo-config';
import { getDemoDatabase } from './demo-database';
import type { DemoParkingSessionStatus, DemoVehicleType } from './demo-domain';

const DEFAULT_PAGE_SIZE = 12;
export const MAX_DEMO_PAGE_SIZE = 50;

type ParkingSeed = {
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  tenantId: string;
  status: DemoParkingSessionStatus;
  enteredMinutesAgo: number;
  exitedMinutesAgo?: number;
};

const parkingSeeds: ParkingSeed[] = [
  { ticketNumber: 'D-1042', vehicleNumber: 'А104ВС77', vehicleType: 'car', tenantId: 'tenant-test', status: 'active', enteredMinutesAgo: 18 },
  { ticketNumber: 'D-1087', vehicleNumber: 'М725ОР197', vehicleType: 'car', tenantId: 'tenant-demo-01', status: 'active', enteredMinutesAgo: 42 },
  { ticketNumber: 'D-1124', vehicleNumber: 'К318ТХ50', vehicleType: 'truck', tenantId: 'tenant-demo-02', status: 'active', enteredMinutesAgo: 67 },
  { ticketNumber: 'D-1179', vehicleNumber: null, vehicleType: 'truck', tenantId: 'tenant-demo-03', status: 'active', enteredMinutesAgo: 95 },
  { ticketNumber: 'D-1216', vehicleNumber: 'Р904АА799', vehicleType: 'car', tenantId: 'tenant-demo-04', status: 'active', enteredMinutesAgo: 136 },
  { ticketNumber: 'D-1263', vehicleNumber: 'С552КМ77', vehicleType: 'car', tenantId: 'tenant-test', status: 'active', enteredMinutesAgo: 185 },
  { ticketNumber: 'D-1308', vehicleNumber: 'Е811НО190', vehicleType: 'truck', tenantId: 'tenant-demo-05', status: 'active', enteredMinutesAgo: 244 },
  { ticketNumber: 'D-1345', vehicleNumber: 'В230ЕТ77', vehicleType: 'car', tenantId: 'tenant-demo-06', status: 'active', enteredMinutesAgo: 318 },
  { ticketNumber: 'D-1391', vehicleNumber: null, vehicleType: 'car', tenantId: 'tenant-demo-07', status: 'active', enteredMinutesAgo: 411 },
  { ticketNumber: 'D-1438', vehicleNumber: 'Т641РС99', vehicleType: 'truck', tenantId: 'tenant-demo-02', status: 'active', enteredMinutesAgo: 520 },
  { ticketNumber: 'D-1480', vehicleNumber: 'Н057УК77', vehicleType: 'car', tenantId: 'tenant-demo-01', status: 'completed', enteredMinutesAgo: 215, exitedMinutesAgo: 142 },
  { ticketNumber: 'D-1527', vehicleNumber: 'О438МВ197', vehicleType: 'truck', tenantId: 'tenant-demo-05', status: 'completed', enteredMinutesAgo: 390, exitedMinutesAgo: 207 },
  { ticketNumber: 'D-1564', vehicleNumber: 'Х901АР77', vehicleType: 'car', tenantId: 'tenant-demo-06', status: 'completed', enteredMinutesAgo: 168, exitedMinutesAgo: 51 },
  { ticketNumber: 'D-1609', vehicleNumber: 'А772КЕ799', vehicleType: 'car', tenantId: 'tenant-test', status: 'completed', enteredMinutesAgo: 620, exitedMinutesAgo: 281 },
];

type ParkingRow = {
  id: string;
  session_id: string;
  tenant_id: string;
  tenant_short_name: string;
  ticket_number: string;
  vehicle_number: string | null;
  vehicle_type: DemoVehicleType;
  entered_at: string;
  exited_at: string | null;
  tariff_code: string;
  hourly_rate: number;
  calculated_cost: number;
  status: DemoParkingSessionStatus;
  created_at: string;
  expires_at: number;
  is_seed: number;
  discount_id: string | null;
};

type DiscountRow = {
  id: string;
  parking_session_id: string;
  tenant_id: string;
  tenant_short_name: string;
  ticket_number: string;
  vehicle_number: string | null;
  vehicle_type: DemoVehicleType;
  applied_at: string;
  original_cost: number;
  discount_percent: number;
  guest_due: number;
  tenant_charge: number;
  status: 'applied';
  comment: string;
};

export type DemoPagination = {
  page?: number;
  pageSize?: number;
};

export type DemoParkingSearch = DemoPagination & {
  ticket?: string;
  vehicle?: string;
  status?: DemoParkingSessionStatus;
};

export type DemoDiscountSearch = DemoPagination & {
  tenantId?: string;
};

export class DemoParkingStoreError extends Error {
  constructor(
    public readonly code: 'not_found' | 'already_applied' | 'session_completed',
    message: string,
  ) {
    super(message);
    this.name = 'DemoParkingStoreError';
  }
}

function shiftedIso(base: Date, minutes: number) {
  return new Date(base.getTime() - minutes * 60_000).toISOString();
}

function sessionKey(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

export function normalizeDemoTicket(value: string) {
  return value.normalize('NFKC').trim().toUpperCase();
}

const latinToCyrillicPlateLetters: Record<string, string> = {
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х',
};

export function normalizeDemoVehicleNumber(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[\s\-‐‑‒–—]+/g, '')
    .replace(/[ABEKMHOPCTYX]/g, (letter) => latinToCyrillicPlateLetters[letter]);
}

function cleanupExpiredRows(db: Database.Database, nowMs: number) {
  const expiredParkingFilter = `
    parking_session_id IN (
      SELECT id FROM demo_parking_sessions
      WHERE expires_at IS NOT NULL AND expires_at <= @nowMs
    )
  `;
  const discounts = db.prepare(`
    DELETE FROM demo_web_discounts
    WHERE (expires_at IS NOT NULL AND expires_at <= @nowMs) OR ${expiredParkingFilter}
  `).run({ nowMs }).changes;
  const passages = db.prepare(`
    DELETE FROM demo_guest_passages
    WHERE (expires_at IS NOT NULL AND expires_at <= @nowMs) OR ${expiredParkingFilter}
  `).run({ nowMs }).changes;
  const parkingSessions = db.prepare(`
    DELETE FROM demo_parking_sessions
    WHERE expires_at IS NOT NULL AND expires_at <= ?
  `).run(nowMs).changes;
  return { discounts, passages, parkingSessions };
}

export function cleanupExpiredDemoParkingData(nowMs = Date.now()) {
  const db = getDemoDatabase();
  return db.transaction(() => cleanupExpiredRows(db, nowMs)).immediate();
}

function materializeParkingSeeds(db: Database.Database, sessionId: string, now: Date) {
  const key = sessionKey(sessionId);
  const expiresAt = now.getTime() + DEMO_USER_TTL_MS;
  const statement = db.prepare(`
    INSERT OR IGNORE INTO demo_parking_sessions (
      id, session_id, tenant_id, ticket_number, vehicle_number, vehicle_type,
      entered_at, exited_at, tariff_code, hourly_rate, calculated_cost, status,
      created_at, expires_at, is_seed
    ) VALUES (
      @id, @sessionId, @tenantId, @ticketNumber, @vehicleNumber, @vehicleType,
      @enteredAt, @exitedAt, @tariffCode, @hourlyRate, @calculatedCost, @status,
      @createdAt, @expiresAt, 1
    )
  `);

  for (const [index, seed] of parkingSeeds.entries()) {
    const enteredAt = shiftedIso(now, seed.enteredMinutesAgo);
    const exitedAt = seed.exitedMinutesAgo === undefined ? null : shiftedIso(now, seed.exitedMinutesAgo);
    const cost = calculateDemoParkingCost({
      enteredAt,
      exitedAt,
      vehicleType: seed.vehicleType,
      now,
    });
    statement.run({
      id: `DPS-${key}-${String(index + 1).padStart(2, '0')}`,
      sessionId,
      tenantId: seed.tenantId,
      ticketNumber: seed.ticketNumber,
      vehicleNumber: seed.vehicleNumber,
      vehicleType: seed.vehicleType,
      enteredAt,
      exitedAt,
      tariffCode: cost.tariffCode,
      hourlyRate: cost.hourlyRate,
      calculatedCost: cost.calculatedCost,
      status: seed.status,
      createdAt: now.toISOString(),
      expiresAt,
    });
  }
}

function prepareParkingStore(sessionId: string, now = new Date()) {
  const db = getDemoDatabase();
  db.transaction(() => {
    cleanupExpiredRows(db, now.getTime());
    materializeParkingSeeds(db, sessionId, now);
  }).immediate();
  return db;
}

function parkingRowToDto(row: ParkingRow, now: Date) {
  const cost = calculateDemoParkingCost({
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    vehicleType: row.vehicle_type,
    now,
  });
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    vehicleNumber: row.vehicle_number,
    vehicleType: row.vehicle_type,
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    durationMinutes: cost.durationMinutes,
    currentCost: cost.calculatedCost,
    status: row.status,
    tariffCode: cost.tariffCode,
    hourlyRate: cost.hourlyRate,
    tenantId: row.tenant_id,
    tenantShortName: row.tenant_short_name,
    discountApplied: Boolean(row.discount_id),
  };
}

function normalizedPagination({ page = 1, pageSize = DEFAULT_PAGE_SIZE }: DemoPagination) {
  return {
    page: Math.max(1, Math.trunc(page)),
    pageSize: Math.min(MAX_DEMO_PAGE_SIZE, Math.max(1, Math.trunc(pageSize))),
  };
}

export function listDemoParkingSessions(sessionId: string, search: DemoParkingSearch = {}) {
  const now = new Date();
  const db = prepareParkingStore(sessionId, now);
  const params: Array<string> = [sessionId, sessionId];
  const where = ['parking.session_id = ?'];
  const ticket = search.ticket ? normalizeDemoTicket(search.ticket) : '';
  if (ticket) {
    where.push('UPPER(TRIM(parking.ticket_number)) = ?');
    params.push(ticket);
  }
  if (search.status) {
    where.push('parking.status = ?');
    params.push(search.status);
  }
  const rows = db.prepare(`
    SELECT
      parking.*,
      tenant.short_name AS tenant_short_name,
      discount.id AS discount_id
    FROM demo_parking_sessions AS parking
    JOIN demo_tenants AS tenant ON tenant.id = parking.tenant_id
    LEFT JOIN demo_web_discounts AS discount
      ON discount.parking_session_id = parking.id AND discount.session_id = ?
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE parking.status WHEN 'active' THEN 0 ELSE 1 END,
      parking.entered_at DESC,
      parking.ticket_number ASC
  `).all(...params) as ParkingRow[];
  const vehicle = search.vehicle ? normalizeDemoVehicleNumber(search.vehicle) : '';
  const filtered = vehicle
    ? rows.filter((row) => row.vehicle_number && normalizeDemoVehicleNumber(row.vehicle_number) === vehicle)
    : rows;
  const { page, pageSize } = normalizedPagination(search);
  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  return {
    items: filtered.slice(offset, offset + pageSize).map((row) => parkingRowToDto(row, now)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function discountRowToDto(row: DiscountRow) {
  return {
    id: row.id,
    parkingSessionId: row.parking_session_id,
    tenantId: row.tenant_id,
    tenantShortName: row.tenant_short_name,
    ticketNumber: row.ticket_number,
    vehicleNumber: row.vehicle_number,
    vehicleType: row.vehicle_type,
    appliedAt: row.applied_at,
    originalCost: row.original_cost,
    discountPercent: row.discount_percent,
    guestDue: row.guest_due,
    tenantCharge: row.tenant_charge,
    status: row.status,
    comment: row.comment,
  };
}

export function listDemoWebDiscounts(sessionId: string, search: DemoDiscountSearch = {}) {
  const db = prepareParkingStore(sessionId);
  const params: string[] = [sessionId];
  const where = ['discount.session_id = ?'];
  if (search.tenantId) {
    where.push('discount.tenant_id = ?');
    params.push(search.tenantId);
  }
  const rows = db.prepare(`
    SELECT
      discount.*,
      parking.ticket_number,
      parking.vehicle_number,
      parking.vehicle_type,
      tenant.short_name AS tenant_short_name
    FROM demo_web_discounts AS discount
    JOIN demo_parking_sessions AS parking ON parking.id = discount.parking_session_id
    JOIN demo_tenants AS tenant ON tenant.id = discount.tenant_id
    WHERE ${where.join(' AND ')}
    ORDER BY discount.applied_at DESC, discount.id DESC
  `).all(...params) as DiscountRow[];
  const { page, pageSize } = normalizedPagination(search);
  const total = rows.length;
  const offset = (page - 1) * pageSize;
  return {
    items: rows.slice(offset, offset + pageSize).map(discountRowToDto),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function applyDemoWebDiscount(sessionId: string, parkingSessionId: string, comment: string) {
  const now = new Date();
  const db = prepareParkingStore(sessionId, now);
  try {
    return db.transaction(() => {
      cleanupExpiredRows(db, now.getTime());
      const parking = db.prepare(`
        SELECT parking.*, tenant.short_name AS tenant_short_name, NULL AS discount_id
        FROM demo_parking_sessions AS parking
        JOIN demo_tenants AS tenant ON tenant.id = parking.tenant_id
        WHERE parking.id = ? AND parking.session_id = ?
      `).get(parkingSessionId, sessionId) as ParkingRow | undefined;
      if (!parking) throw new DemoParkingStoreError('not_found', 'Парковочная сессия не найдена.');
      if (parking.status !== 'active') {
        throw new DemoParkingStoreError('session_completed', 'Парковочная сессия уже завершена.');
      }
      const existing = db.prepare(`
        SELECT id FROM demo_web_discounts
        WHERE session_id = ? AND parking_session_id = ?
      `).get(sessionId, parkingSessionId);
      if (existing) throw new DemoParkingStoreError('already_applied', 'Скидка уже применена.');

      const cost = calculateDemoParkingCost({
        enteredAt: parking.entered_at,
        vehicleType: parking.vehicle_type,
        now,
      });
      db.prepare(`
        UPDATE demo_parking_sessions
        SET tariff_code = ?, hourly_rate = ?, calculated_cost = ?
        WHERE id = ? AND session_id = ?
      `).run(cost.tariffCode, cost.hourlyRate, cost.calculatedCost, parkingSessionId, sessionId);

      const id = `DWD-${randomBytes(10).toString('hex').toUpperCase()}`;
      db.prepare(`
        INSERT INTO demo_web_discounts (
          id, session_id, parking_session_id, tenant_id, applied_at, original_cost,
          discount_percent, guest_due, tenant_charge, status, comment, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, 100, 0, ?, 'applied', ?, ?, ?)
      `).run(
        id,
        sessionId,
        parkingSessionId,
        parking.tenant_id,
        now.toISOString(),
        cost.calculatedCost,
        cost.calculatedCost,
        comment,
        now.toISOString(),
        parking.expires_at,
      );
      const saved = db.prepare(`
        SELECT
          discount.*,
          parking.ticket_number,
          parking.vehicle_number,
          parking.vehicle_type,
          tenant.short_name AS tenant_short_name
        FROM demo_web_discounts AS discount
        JOIN demo_parking_sessions AS parking ON parking.id = discount.parking_session_id
        JOIN demo_tenants AS tenant ON tenant.id = discount.tenant_id
        WHERE discount.id = ?
      `).get(id) as DiscountRow;
      return discountRowToDto(saved);
    }).immediate();
  } catch (error) {
    if (error instanceof DemoParkingStoreError) throw error;
    if (error instanceof Error && /UNIQUE constraint failed: demo_web_discounts/.test(error.message)) {
      throw new DemoParkingStoreError('already_applied', 'Скидка уже применена.');
    }
    throw error;
  }
}

export function demoParkingSeedCount() {
  return parkingSeeds.length;
}
