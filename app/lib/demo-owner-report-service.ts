import 'server-only';

import { getDemoDatabase } from './demo-database';
import {
  getDemoHistoricalDataset,
  type DemoHistoricalGuestPassage,
  type DemoHistoricalGuestRequest,
  type DemoHistoricalWebDiscount,
  type DemoHistoryRequestStatus,
  type DemoHistoryRequestType,
} from './demo-history-data';
import { listDemoParkingSessions, normalizeDemoVehicleNumber } from './demo-parking-store';
import {
  getDemoOwnerPeriod,
  parseDemoOwnerPeriod,
  type DemoOwnerPeriod,
  type DemoOwnerPeriodMode,
} from './demo-report-period';
import { listDemoRequests } from './demo-request-store';
import { generateDemoTenants } from './demo-synthetic-data';
import type { DemoTenant, DemoVehicleType } from './demo-domain';

const DEFAULT_PAGE_SIZE = 25;
export const MAX_OWNER_PAGE_SIZE = 100;

type OwnerSource = 'historical' | 'current_session';
type OwnerOperationType = 'guest_passage' | 'web_discount';
type OwnerOperationStatus = 'active' | 'completed' | 'cancelled' | 'applied';

type OwnerGuestRequest = {
  id: string;
  requestNumber: string;
  tenantId: string;
  tenantShortName: string;
  guestName: string;
  vehicleNumber: string | null;
  requestType: DemoHistoryRequestType;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  status: DemoHistoryRequestStatus;
  passageCount: number;
  totalDurationMinutes: number;
  totalAmount: number;
};

type OwnerWebDiscount = {
  id: string;
  tenantId: string;
  tenantShortName: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number;
  tariffCode: string;
  hourlyRate: number;
  originalCost: number;
  discountPercent: 100;
  guestDue: 0;
  tenantCharge: number;
  status: 'applied';
  comment: string;
  appliedAt: string;
  source: OwnerSource;
};

export type OwnerOperation = {
  id: string;
  operationType: OwnerOperationType;
  tenantId: string;
  tenantShortName: string;
  basisNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number;
  amount: number;
  status: OwnerOperationStatus;
  source: OwnerSource;
};

type CurrentPassageRow = {
  id: string;
  request_id: string;
  request_number: string;
  tenant_id: string;
  tenant_short_name: string;
  vehicle_number: string | null;
  vehicle_type: DemoVehicleType | null;
  entered_at: string;
  exited_at: string | null;
  duration_minutes: number | null;
  amount: number;
  status: 'active' | 'completed' | 'cancelled';
};

type CurrentDiscountRow = {
  id: string;
  tenant_id: string;
  tenant_short_name: string;
  ticket_number: string;
  vehicle_number: string | null;
  vehicle_type: DemoVehicleType;
  entered_at: string;
  exited_at: string | null;
  tariff_code: string;
  hourly_rate: number;
  applied_at: string;
  original_cost: number;
  discount_percent: 100;
  guest_due: 0;
  tenant_charge: number;
  status: 'applied';
  comment: string;
};

type OwnerContext = {
  mode: DemoOwnerPeriodMode;
  period: DemoOwnerPeriod;
  tenants: readonly DemoTenant[];
  requests: OwnerGuestRequest[];
  operations: OwnerOperation[];
  webDiscounts: OwnerWebDiscount[];
  activeParkingSessions: Array<{ tenantId: string }>;
};

export class DemoOwnerReportError extends Error {
  constructor(public readonly code: 'INVALID_QUERY' | 'TENANT_NOT_FOUND', message: string) {
    super(message);
    this.name = 'DemoOwnerReportError';
  }
}

function publicPeriod(period: DemoOwnerPeriod) {
  return {
    from: period.from,
    toExclusive: period.toExclusive,
    timezone: period.timezone,
    label: period.label,
  };
}

function tenantMap(tenants: readonly DemoTenant[]) {
  return new Map(tenants.map((tenant) => [tenant.id, tenant]));
}

function passagesByRequest(passages: readonly DemoHistoricalGuestPassage[]) {
  const result = new Map<string, DemoHistoricalGuestPassage[]>();
  for (const passage of passages) {
    const current = result.get(passage.requestId) ?? [];
    current.push(passage);
    result.set(passage.requestId, current);
  }
  return result;
}

function historicalRequestDto(
  request: DemoHistoricalGuestRequest,
  tenant: DemoTenant,
  passages: readonly DemoHistoricalGuestPassage[],
): OwnerGuestRequest {
  return {
    id: request.id,
    requestNumber: request.requestNumber,
    tenantId: request.tenantId,
    tenantShortName: tenant.shortName,
    guestName: request.guestName,
    vehicleNumber: request.vehicleNumber,
    requestType: request.requestType,
    validFrom: request.validFrom,
    validUntil: request.validUntil,
    createdAt: request.createdAt,
    status: request.status,
    passageCount: passages.length,
    totalDurationMinutes: passages.reduce((sum, passage) => sum + passage.durationMinutes, 0),
    totalAmount: passages.reduce((sum, passage) => sum + passage.amount, 0),
  };
}

function historicalDiscountDto(
  discount: DemoHistoricalWebDiscount,
  tenant: DemoTenant,
): OwnerWebDiscount {
  return {
    ...discount,
    tenantShortName: tenant.shortName,
    source: 'historical',
  };
}

function historicalContext(period: DemoOwnerPeriod): OwnerContext {
  const dataset = getDemoHistoricalDataset(period);
  const tenantsById = tenantMap(dataset.tenants);
  const requestPassages = passagesByRequest(dataset.guestPassages);
  const requests = dataset.guestRequests.map((request) => historicalRequestDto(
    request,
    tenantsById.get(request.tenantId)!,
    requestPassages.get(request.id) ?? [],
  ));
  const requestNumbers = new Map(dataset.guestRequests.map((request) => [request.id, request.requestNumber]));
  const operations: OwnerOperation[] = [
    ...dataset.guestPassages.map((passage) => ({
      id: passage.id,
      operationType: 'guest_passage' as const,
      tenantId: passage.tenantId,
      tenantShortName: tenantsById.get(passage.tenantId)!.shortName,
      basisNumber: requestNumbers.get(passage.requestId)!,
      vehicleNumber: passage.vehicleNumber,
      vehicleType: passage.vehicleType,
      enteredAt: passage.enteredAt,
      exitedAt: passage.exitedAt,
      durationMinutes: passage.durationMinutes,
      amount: passage.amount,
      status: passage.status,
      source: 'historical' as const,
    })),
    ...dataset.webDiscounts.map((discount) => ({
      id: discount.id,
      operationType: 'web_discount' as const,
      tenantId: discount.tenantId,
      tenantShortName: tenantsById.get(discount.tenantId)!.shortName,
      basisNumber: discount.ticketNumber,
      vehicleNumber: discount.vehicleNumber,
      vehicleType: discount.vehicleType,
      enteredAt: discount.enteredAt,
      exitedAt: discount.exitedAt,
      durationMinutes: discount.durationMinutes,
      amount: discount.tenantCharge,
      status: discount.status,
      source: 'historical' as const,
    })),
  ];
  return {
    mode: 'previous-month',
    period,
    tenants: dataset.tenants,
    requests,
    operations,
    webDiscounts: dataset.webDiscounts.map((discount) => historicalDiscountDto(
      discount,
      tenantsById.get(discount.tenantId)!,
    )),
    activeParkingSessions: [],
  };
}

function inPeriod(value: string, period: DemoOwnerPeriod) {
  const timestamp = new Date(value).getTime();
  return timestamp >= new Date(period.from).getTime() && timestamp < new Date(period.toExclusive).getTime();
}

function currentContext(sessionId: string, period: DemoOwnerPeriod): OwnerContext {
  const tenants = generateDemoTenants();
  const tenantsById = tenantMap(tenants);
  const parking = listDemoParkingSessions(sessionId, { page: 1, pageSize: 50 }).items;
  const activeParkingSessions = parking
    .filter((item) => item.status === 'active' && inPeriod(item.enteredAt, period))
    .map((item) => ({ tenantId: item.tenantId }));
  const db = getDemoDatabase();
  const currentRequests = listDemoRequests(sessionId)
    .filter((request) => !request.isSeed && inPeriod(request.createdAt, period));
  const passageRows = db.prepare(`
    SELECT
      passage.id,
      passage.request_id,
      request.id AS request_number,
      passage.tenant_id,
      tenant.short_name AS tenant_short_name,
      request.vehicle_number,
      parking.vehicle_type,
      passage.entered_at,
      passage.exited_at,
      passage.duration_minutes,
      passage.amount,
      passage.status
    FROM demo_guest_passages AS passage
    JOIN demo_guest_requests AS request ON request.id = passage.request_id
    JOIN demo_tenants AS tenant ON tenant.id = passage.tenant_id
    LEFT JOIN demo_parking_sessions AS parking ON parking.id = passage.parking_session_id
    WHERE passage.session_id = ? AND passage.entered_at >= ? AND passage.entered_at < ?
  `).all(sessionId, period.from, period.toExclusive) as CurrentPassageRow[];
  const passagesForRequest = new Map<string, CurrentPassageRow[]>();
  for (const passage of passageRows) {
    const rows = passagesForRequest.get(passage.request_id) ?? [];
    rows.push(passage);
    passagesForRequest.set(passage.request_id, rows);
  }
  const requests: OwnerGuestRequest[] = currentRequests.map((request) => {
    const passages = passagesForRequest.get(request.id) ?? [];
    return {
      id: request.id,
      requestNumber: request.id,
      tenantId: 'tenant-test',
      tenantShortName: tenantsById.get('tenant-test')!.shortName,
      guestName: request.guestName,
      vehicleNumber: request.vehicleNumber || null,
      requestType: request.requestType === 'multiple' ? 'multi' : 'single',
      validFrom: request.validFrom,
      validUntil: request.validUntil,
      createdAt: request.createdAt,
      status: request.status,
      passageCount: passages.length,
      totalDurationMinutes: passages.reduce((sum, passage) => sum + (passage.duration_minutes ?? 0), 0),
      totalAmount: passages.reduce((sum, passage) => sum + passage.amount, 0),
    };
  });
  const discountRows = db.prepare(`
    SELECT
      discount.id,
      discount.tenant_id,
      tenant.short_name AS tenant_short_name,
      parking.ticket_number,
      parking.vehicle_number,
      parking.vehicle_type,
      parking.entered_at,
      parking.exited_at,
      parking.tariff_code,
      parking.hourly_rate,
      discount.applied_at,
      discount.original_cost,
      discount.discount_percent,
      discount.guest_due,
      discount.tenant_charge,
      discount.status,
      discount.comment
    FROM demo_web_discounts AS discount
    JOIN demo_parking_sessions AS parking ON parking.id = discount.parking_session_id
    JOIN demo_tenants AS tenant ON tenant.id = discount.tenant_id
    WHERE discount.session_id = ? AND discount.applied_at >= ? AND discount.applied_at < ?
  `).all(sessionId, period.from, period.toExclusive) as CurrentDiscountRow[];
  const webDiscounts: OwnerWebDiscount[] = discountRows.map((discount) => ({
    id: discount.id,
    tenantId: discount.tenant_id,
    tenantShortName: discount.tenant_short_name,
    ticketNumber: discount.ticket_number,
    vehicleNumber: discount.vehicle_number,
    vehicleType: discount.vehicle_type,
    enteredAt: discount.entered_at,
    exitedAt: discount.exited_at,
    durationMinutes: Math.max(0, Math.ceil(
      (new Date(discount.applied_at).getTime() - new Date(discount.entered_at).getTime()) / 60_000,
    )),
    tariffCode: discount.tariff_code,
    hourlyRate: discount.hourly_rate,
    originalCost: discount.original_cost,
    discountPercent: 100,
    guestDue: 0,
    tenantCharge: discount.tenant_charge,
    status: 'applied',
    comment: discount.comment,
    appliedAt: discount.applied_at,
    source: 'current_session',
  }));
  const operations: OwnerOperation[] = [
    ...passageRows.map((passage) => ({
      id: passage.id,
      operationType: 'guest_passage' as const,
      tenantId: passage.tenant_id,
      tenantShortName: passage.tenant_short_name,
      basisNumber: passage.request_number,
      vehicleNumber: passage.vehicle_number,
      vehicleType: passage.vehicle_type ?? 'car',
      enteredAt: passage.entered_at,
      exitedAt: passage.exited_at,
      durationMinutes: passage.duration_minutes ?? Math.max(0, Math.ceil(
        (Date.now() - new Date(passage.entered_at).getTime()) / 60_000,
      )),
      amount: passage.amount,
      status: passage.status,
      source: 'current_session' as const,
    })),
    ...webDiscounts.map((discount) => ({
      id: discount.id,
      operationType: 'web_discount' as const,
      tenantId: discount.tenantId,
      tenantShortName: discount.tenantShortName,
      basisNumber: discount.ticketNumber,
      vehicleNumber: discount.vehicleNumber,
      vehicleType: discount.vehicleType,
      enteredAt: discount.enteredAt,
      exitedAt: discount.exitedAt,
      durationMinutes: discount.durationMinutes,
      amount: discount.tenantCharge,
      status: discount.status,
      source: 'current_session' as const,
    })),
  ];
  return {
    mode: 'current',
    period,
    tenants,
    requests,
    operations,
    webDiscounts,
    activeParkingSessions,
  };
}

function queryValue(params: URLSearchParams, name: string) {
  const values = params.getAll(name);
  if (values.length > 1) throw new DemoOwnerReportError('INVALID_QUERY', `Параметр ${name} указан несколько раз.`);
  return values[0]?.trim() || '';
}

function parsePeriodFromQuery(params: URLSearchParams) {
  const value = queryValue(params, 'period');
  const mode = parseDemoOwnerPeriod(value || undefined);
  if (!mode) throw new DemoOwnerReportError('INVALID_QUERY', 'Неизвестный отчётный период.');
  return { mode, period: getDemoOwnerPeriod(mode) };
}

function parseChoice<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]) {
  const value = queryValue(params, name);
  if (!value) return undefined;
  if (!allowed.includes(value as T)) throw new DemoOwnerReportError('INVALID_QUERY', `Некорректный параметр ${name}.`);
  return value as T;
}

function parsePagination(params: URLSearchParams) {
  const parse = (name: string, fallback: number, maximum?: number) => {
    const value = queryValue(params, name);
    if (!value) return fallback;
    if (!/^\d+$/.test(value)) throw new DemoOwnerReportError('INVALID_QUERY', `Параметр ${name} должен быть положительным числом.`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum && parsed > maximum)) {
      throw new DemoOwnerReportError('INVALID_QUERY', `Некорректный параметр ${name}.`);
    }
    return parsed;
  };
  return {
    page: parse('page', 1),
    pageSize: parse('pageSize', DEFAULT_PAGE_SIZE, MAX_OWNER_PAGE_SIZE),
  };
}

function parseSort<T extends string>(params: URLSearchParams, allowed: readonly T[], fallback: T) {
  const sort = parseChoice(params, 'sort', allowed) ?? fallback;
  const order = parseChoice(params, 'order', ['asc', 'desc'] as const) ?? 'desc';
  return { sort, order };
}

function contextFor(sessionId: string, mode: DemoOwnerPeriodMode, period: DemoOwnerPeriod) {
  return mode === 'previous-month' ? historicalContext(period) : currentContext(sessionId, period);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function comparison(left: unknown, right: unknown) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left ?? '').localeCompare(String(right ?? ''), 'ru', { numeric: true, sensitivity: 'base' });
}

function sorted<T extends { id?: string; tenantId?: string }>(
  items: T[],
  getter: (item: T) => unknown,
  order: 'asc' | 'desc',
) {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const main = comparison(getter(left), getter(right));
    if (main) return main * direction;
    return String(left.id ?? left.tenantId ?? '').localeCompare(String(right.id ?? right.tenantId ?? ''));
  });
}

function summarize(context: OwnerContext, tenantId?: string) {
  const requests = tenantId ? context.requests.filter((request) => request.tenantId === tenantId) : context.requests;
  const operations = tenantId ? context.operations.filter((operation) => operation.tenantId === tenantId) : context.operations;
  const discounts = operations.filter((operation) => operation.operationType === 'web_discount');
  const passages = operations.filter((operation) => operation.operationType === 'guest_passage');
  const activeParking = tenantId
    ? context.activeParkingSessions.filter((item) => item.tenantId === tenantId)
    : context.activeParkingSessions;
  const activeTenantIds = new Set([
    ...requests.map((request) => request.tenantId),
    ...operations.map((operation) => operation.tenantId),
    ...activeParking.map((item) => item.tenantId),
  ]);
  const guestAmount = passages.reduce((sum, operation) => sum + operation.amount, 0);
  const webAmount = discounts.reduce((sum, operation) => sum + operation.amount, 0);
  const durationTotal = operations.reduce((sum, operation) => sum + operation.durationMinutes, 0);
  const totalTenantCharges = guestAmount + webAmount;
  return {
    tenantCount: activeTenantIds.size,
    guestRequestCount: requests.length,
    guestPassageCount: passages.length,
    webDiscountCount: discounts.length,
    carOperationCount: operations.filter((operation) => operation.vehicleType === 'car').length,
    truckOperationCount: operations.filter((operation) => operation.vehicleType === 'truck').length,
    guestParkingAmount: guestAmount,
    tenantChargeAmount: totalTenantCharges,
    averageDurationMinutes: operations.length ? Math.round(durationTotal / operations.length) : 0,
    activeParkingSessionCount: activeParking.length,
    completedOperationCount: operations.filter((operation) => (
      operation.status === 'completed' || operation.status === 'applied'
    )).length,
    amounts: {
      guestPassages: guestAmount,
      webDiscounts: webAmount,
      totalTenantCharges,
    },
  };
}

function tenantRows(context: OwnerContext) {
  const activeIds = new Set([
    ...context.requests.map((request) => request.tenantId),
    ...context.operations.map((operation) => operation.tenantId),
    ...context.activeParkingSessions.map((item) => item.tenantId),
  ]);
  const tenants = context.mode === 'previous-month'
    ? context.tenants
    : context.tenants.filter((tenant) => activeIds.has(tenant.id));
  return tenants.map((tenant) => {
    const requests = context.requests.filter((request) => request.tenantId === tenant.id);
    const operations = context.operations.filter((operation) => operation.tenantId === tenant.id);
    const guestPassages = operations.filter((operation) => operation.operationType === 'guest_passage');
    const discounts = operations.filter((operation) => operation.operationType === 'web_discount');
    const carOperations = operations.filter((operation) => operation.vehicleType === 'car');
    const truckOperations = operations.filter((operation) => operation.vehicleType === 'truck');
    const guestPassageAmount = guestPassages.reduce((sum, operation) => sum + operation.amount, 0);
    const webDiscountAmount = discounts.reduce((sum, operation) => sum + operation.amount, 0);
    return {
      tenantId: tenant.id,
      shortName: tenant.shortName,
      legalName: tenant.legalName,
      inn: tenant.inn,
      objectType: tenant.objectType,
      operationCount: operations.length,
      guestRequestCount: requests.length,
      guestPassageCount: guestPassages.length,
      webDiscountCount: discounts.length,
      carOperationCount: carOperations.length,
      truckOperationCount: truckOperations.length,
      carAmount: carOperations.reduce((sum, operation) => sum + operation.amount, 0),
      truckAmount: truckOperations.reduce((sum, operation) => sum + operation.amount, 0),
      guestPassageAmount,
      webDiscountAmount,
      totalAmount: guestPassageAmount + webDiscountAmount,
      averageDurationMinutes: operations.length
        ? Math.round(operations.reduce((sum, operation) => sum + operation.durationMinutes, 0) / operations.length)
        : 0,
    };
  });
}

export function getOwnerSummary(sessionId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const tenantId = queryValue(params, 'tenantId') || undefined;
  const context = contextFor(sessionId, mode, period);
  return { period: publicPeriod(period), ...summarize(context, tenantId) };
}

export function getOwnerTenants(sessionId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const objectType = parseChoice(params, 'objectType', [
    'office', 'warehouse', 'retail', 'service', 'entertainment', 'logistics',
  ] as const);
  const { page, pageSize } = parsePagination(params);
  const { sort, order } = parseSort(params, [
    'shortName', 'operationCount', 'totalAmount', 'guestRequestCount', 'webDiscountCount',
  ] as const, 'totalAmount');
  const context = contextFor(sessionId, mode, period);
  const filtered = tenantRows(context).filter((tenant) => !objectType || tenant.objectType === objectType);
  const getters = {
    shortName: (item: typeof filtered[number]) => item.shortName,
    operationCount: (item: typeof filtered[number]) => item.operationCount,
    totalAmount: (item: typeof filtered[number]) => item.totalAmount,
    guestRequestCount: (item: typeof filtered[number]) => item.guestRequestCount,
    webDiscountCount: (item: typeof filtered[number]) => item.webDiscountCount,
  };
  return { period: publicPeriod(period), ...paginate(sorted(filtered, getters[sort], order), page, pageSize) };
}

export function getOwnerTenantDetail(sessionId: string, tenantId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const context = contextFor(sessionId, mode, period);
  const tenant = context.tenants.find((item) => item.id === tenantId);
  if (!tenant) throw new DemoOwnerReportError('TENANT_NOT_FOUND', 'Арендатор не найден.');
  const row = tenantRows(context).find((item) => item.tenantId === tenantId) ?? {
    tenantId: tenant.id,
    shortName: tenant.shortName,
    legalName: tenant.legalName,
    inn: tenant.inn,
    objectType: tenant.objectType,
    operationCount: 0,
    guestRequestCount: 0,
    guestPassageCount: 0,
    webDiscountCount: 0,
    carOperationCount: 0,
    truckOperationCount: 0,
    carAmount: 0,
    truckAmount: 0,
    guestPassageAmount: 0,
    webDiscountAmount: 0,
    totalAmount: 0,
    averageDurationMinutes: 0,
  };
  const recentOperations = sorted(
    context.operations.filter((operation) => operation.tenantId === tenantId),
    (operation) => operation.enteredAt,
    'desc',
  ).slice(0, 20);
  return {
    tenant: {
      tenantId: tenant.id,
      shortName: tenant.shortName,
      legalName: tenant.legalName,
      inn: tenant.inn,
      objectType: tenant.objectType,
    },
    period: publicPeriod(period),
    summary: { ...row, ...summarize(context, tenantId) },
    recentOperations,
  };
}

export function getOwnerGuestRequests(sessionId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const tenantId = queryValue(params, 'tenantId');
  const requestType = parseChoice(params, 'requestType', ['single', 'multi'] as const);
  const status = parseChoice(params, 'status', ['waiting', 'active', 'completed', 'cancelled', 'expired'] as const);
  const { page, pageSize } = parsePagination(params);
  const { sort, order } = parseSort(params, [
    'createdAt', 'requestNumber', 'tenantShortName', 'status', 'passageCount', 'totalAmount',
  ] as const, 'createdAt');
  const context = contextFor(sessionId, mode, period);
  const filtered = context.requests.filter((request) => (
    (!tenantId || request.tenantId === tenantId)
    && (!requestType || request.requestType === requestType)
    && (!status || request.status === status)
  ));
  const getters = {
    createdAt: (item: OwnerGuestRequest) => item.createdAt,
    requestNumber: (item: OwnerGuestRequest) => item.requestNumber,
    tenantShortName: (item: OwnerGuestRequest) => item.tenantShortName,
    status: (item: OwnerGuestRequest) => item.status,
    passageCount: (item: OwnerGuestRequest) => item.passageCount,
    totalAmount: (item: OwnerGuestRequest) => item.totalAmount,
  };
  return { period: publicPeriod(period), ...paginate(sorted(filtered, getters[sort], order), page, pageSize) };
}

export function getOwnerWebDiscounts(sessionId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const tenantId = queryValue(params, 'tenantId');
  const vehicleType = parseChoice(params, 'vehicleType', ['car', 'truck'] as const);
  const { page, pageSize } = parsePagination(params);
  const { sort, order } = parseSort(params, [
    'appliedAt', 'ticketNumber', 'tenantShortName', 'originalCost', 'durationMinutes',
  ] as const, 'appliedAt');
  const context = contextFor(sessionId, mode, period);
  const filtered = context.webDiscounts.filter((discount) => (
    (!tenantId || discount.tenantId === tenantId)
    && (!vehicleType || discount.vehicleType === vehicleType)
  ));
  const getters = {
    appliedAt: (item: OwnerWebDiscount) => item.appliedAt,
    ticketNumber: (item: OwnerWebDiscount) => item.ticketNumber,
    tenantShortName: (item: OwnerWebDiscount) => item.tenantShortName,
    originalCost: (item: OwnerWebDiscount) => item.originalCost,
    durationMinutes: (item: OwnerWebDiscount) => item.durationMinutes,
  };
  return { period: publicPeriod(period), ...paginate(sorted(filtered, getters[sort], order), page, pageSize) };
}

export function getOwnerOperations(sessionId: string, params: URLSearchParams) {
  const { mode, period } = parsePeriodFromQuery(params);
  const tenantId = queryValue(params, 'tenantId');
  const operationType = parseChoice(params, 'operationType', ['guest_passage', 'web_discount'] as const);
  const vehicleType = parseChoice(params, 'vehicleType', ['car', 'truck'] as const);
  const status = parseChoice(params, 'status', ['active', 'completed', 'cancelled', 'applied'] as const);
  const search = queryValue(params, 'search');
  if (search.length > 100) throw new DemoOwnerReportError('INVALID_QUERY', 'Поисковый запрос слишком длинный.');
  const normalizedSearch = search.normalize('NFKC').trim().toLocaleUpperCase('ru-RU');
  const normalizedPlateSearch = search ? normalizeDemoVehicleNumber(search) : '';
  const { page, pageSize } = parsePagination(params);
  const { sort, order } = parseSort(params, [
    'enteredAt', 'exitedAt', 'amount', 'durationMinutes', 'tenantShortName', 'basisNumber',
  ] as const, 'enteredAt');
  const context = contextFor(sessionId, mode, period);
  const filtered = context.operations.filter((operation) => {
    if (tenantId && operation.tenantId !== tenantId) return false;
    if (operationType && operation.operationType !== operationType) return false;
    if (vehicleType && operation.vehicleType !== vehicleType) return false;
    if (status && operation.status !== status) return false;
    if (!normalizedSearch) return true;
    return operation.basisNumber.toLocaleUpperCase('ru-RU').includes(normalizedSearch)
      || operation.tenantShortName.toLocaleUpperCase('ru-RU').includes(normalizedSearch)
      || Boolean(operation.vehicleNumber && normalizeDemoVehicleNumber(operation.vehicleNumber).includes(normalizedPlateSearch));
  });
  const getters = {
    enteredAt: (item: OwnerOperation) => item.enteredAt,
    exitedAt: (item: OwnerOperation) => item.exitedAt,
    amount: (item: OwnerOperation) => item.amount,
    durationMinutes: (item: OwnerOperation) => item.durationMinutes,
    tenantShortName: (item: OwnerOperation) => item.tenantShortName,
    basisNumber: (item: OwnerOperation) => item.basisNumber,
  };
  return { period: publicPeriod(period), ...paginate(sorted(filtered, getters[sort], order), page, pageSize) };
}
