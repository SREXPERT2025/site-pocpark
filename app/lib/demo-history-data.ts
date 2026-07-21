import 'server-only';

import { calculateDemoParkingCost, GUEST_REQUEST_HOURLY_RATE } from './demo-config';
import type { DemoTenant, DemoVehicleType } from './demo-domain';
import type { DemoOwnerPeriod } from './demo-report-period';
import { generateDemoTenants } from './demo-synthetic-data';

export type DemoHistoryRequestStatus = 'waiting' | 'active' | 'completed' | 'cancelled' | 'expired';
export type DemoHistoryRequestType = 'single' | 'multi';

export type DemoHistoricalGuestRequest = {
  id: string;
  requestNumber: string;
  tenantId: string;
  guestName: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  requestType: DemoHistoryRequestType;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  status: DemoHistoryRequestStatus;
  note: string;
};

export type DemoHistoricalGuestPassage = {
  id: string;
  requestId: string;
  tenantId: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string;
  durationMinutes: number;
  amount: number;
  status: 'completed';
};

export type DemoHistoricalParkingSession = {
  id: string;
  tenantId: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string;
  durationMinutes: number;
  tariffCode: string;
  hourlyRate: number;
  calculatedCost: number;
  status: 'completed';
};

export type DemoHistoricalWebDiscount = {
  id: string;
  tenantId: string;
  parkingSessionId: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string;
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
};

export type DemoHistoricalDataset = {
  seed: string;
  period: DemoOwnerPeriod;
  tenants: readonly DemoTenant[];
  guestRequests: readonly DemoHistoricalGuestRequest[];
  guestPassages: readonly DemoHistoricalGuestPassage[];
  parkingSessions: readonly DemoHistoricalParkingSession[];
  webDiscounts: readonly DemoHistoricalWebDiscount[];
};

const historyCache = new Map<string, DemoHistoricalDataset>();
const plateLetters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'] as const;
const neutralComments = [
  'Демо-компенсация парковки',
  'Синтетическая операция гостя',
  'Демонстрационный визит',
  'Тестовый расчёт арендатора',
] as const;

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomStream(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function integer(random: () => number, minimum: number, maximum: number) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function weightedTenant(random: () => number, tenants: readonly DemoTenant[]) {
  const index = Math.min(tenants.length - 1, Math.floor(Math.pow(random(), 1.85) * tenants.length));
  return tenants[index];
}

function isoBetween(period: DemoOwnerPeriod, random: () => number, reserveMinutes = 0) {
  const from = new Date(period.from).getTime();
  const to = new Date(period.toExclusive).getTime() - reserveMinutes * 60_000 - 1;
  return new Date(from + Math.floor(random() * Math.max(1, to - from))).toISOString();
}

function shiftedIso(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

function syntheticPlate(index: number, random: () => number) {
  const first = plateLetters[index % plateLetters.length];
  const second = plateLetters[(index * 5 + 3) % plateLetters.length];
  const third = plateLetters[(index * 7 + 1) % plateLetters.length];
  const digits = String(100 + ((index * 73 + integer(random, 0, 89)) % 900));
  const region = [77, 97, 99, 177, 197, 199, 777, 797][index % 8];
  return `${first}${digits}${second}${third}${region}`;
}

function freezeItems<T extends object>(items: T[]) {
  for (const item of items) Object.freeze(item);
  return Object.freeze(items) as readonly T[];
}

function buildRequests(period: DemoOwnerPeriod, tenants: readonly DemoTenant[], seed: string) {
  const random = randomStream(`${seed}:requests`);
  const requests: DemoHistoricalGuestRequest[] = [];
  for (let index = 0; index < 760; index += 1) {
    const tenant = weightedTenant(random, tenants);
    const completedWithPassage = index < 660;
    const requestType: DemoHistoryRequestType = index < 60 || index % 11 === 0 ? 'multi' : 'single';
    const createdAt = isoBetween(period, random, requestType === 'multi' ? 2_000 : 900);
    const validFrom = shiftedIso(createdAt, integer(random, 15, 180));
    const validUntil = requestType === 'multi'
      ? new Date(Math.min(
        new Date(period.toExclusive).getTime() - 60_000,
        new Date(validFrom).getTime() + integer(random, 6, 18) * 24 * 60 * 60_000,
      )).toISOString()
      : shiftedIso(validFrom, integer(random, 4, 14) * 60);
    const status: DemoHistoryRequestStatus = completedWithPassage
      ? 'completed'
      : index < 715
        ? 'cancelled'
        : 'expired';
    requests.push({
      id: `HREQ-${period.key.replace('-', '')}-${String(index + 1).padStart(5, '0')}`,
      requestNumber: `ЗГ-${period.key.replace('-', '')}-${String(index + 1).padStart(5, '0')}`,
      tenantId: tenant.id,
      guestName: `Гость Демо-${String(index + 1).padStart(4, '0')}`,
      vehicleNumber: index % 37 === 0 ? null : syntheticPlate(index, random),
      vehicleType: index % 12 === 0 ? 'truck' : 'car',
      requestType,
      validFrom,
      validUntil,
      createdAt,
      status,
      note: index % 9 === 0 ? 'Синтетический гостевой визит' : '',
    });
  }
  return requests;
}

function buildPassages(
  period: DemoOwnerPeriod,
  requests: DemoHistoricalGuestRequest[],
  seed: string,
) {
  const random = randomStream(`${seed}:passages`);
  const passages: DemoHistoricalGuestPassage[] = [];
  const periodEnd = new Date(period.toExclusive).getTime() - 60_000;
  for (let requestIndex = 0; requestIndex < 660; requestIndex += 1) {
    const request = requests[requestIndex];
    const passageCount = requestIndex < 20 ? 5 : requestIndex < 40 ? 4 : requestIndex < 60 ? 3 : 1;
    const validStart = new Date(request.validFrom).getTime();
    const validEnd = Math.min(new Date(request.validUntil).getTime(), periodEnd);
    for (let passageIndex = 0; passageIndex < passageCount; passageIndex += 1) {
      const durationMinutes = integer(random, request.vehicleType === 'truck' ? 80 : 25, request.vehicleType === 'truck' ? 480 : 300);
      const available = Math.max(1, validEnd - validStart - durationMinutes * 60_000);
      const enteredAt = new Date(validStart + Math.floor(random() * available)).toISOString();
      const exitedAt = shiftedIso(enteredAt, durationMinutes);
      const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
      passages.push({
        id: `HPAS-${period.key.replace('-', '')}-${String(passages.length + 1).padStart(5, '0')}`,
        requestId: request.id,
        tenantId: request.tenantId,
        vehicleNumber: request.vehicleNumber,
        vehicleType: request.vehicleType,
        enteredAt,
        exitedAt,
        durationMinutes,
        amount: billableHours * GUEST_REQUEST_HOURLY_RATE,
        status: 'completed',
      });
    }
  }
  return passages;
}

function buildWebDiscounts(period: DemoOwnerPeriod, tenants: readonly DemoTenant[], seed: string) {
  const random = randomStream(`${seed}:discounts`);
  const parkingSessions: DemoHistoricalParkingSession[] = [];
  const discounts: DemoHistoricalWebDiscount[] = [];
  for (let index = 0; index < 1_450; index += 1) {
    const tenant = weightedTenant(random, tenants);
    const vehicleType: DemoVehicleType = index < 1_050 ? 'car' : 'truck';
    const durationMinutes = integer(random, vehicleType === 'car' ? 20 : 120, vehicleType === 'car' ? 330 : 900);
    const enteredAt = isoBetween(period, random, durationMinutes + 5);
    const exitedAt = shiftedIso(enteredAt, durationMinutes);
    const cost = calculateDemoParkingCost({ enteredAt, exitedAt, vehicleType });
    const number = String(index + 1).padStart(5, '0');
    const parkingSessionId = `HPS-${period.key.replace('-', '')}-${number}`;
    const ticketNumber = `ТЛ-${period.key.replace('-', '')}-${number}`;
    const vehicleNumber = index % 19 === 0 ? null : syntheticPlate(index + 2_000, random);
    parkingSessions.push({
      id: parkingSessionId,
      tenantId: tenant.id,
      ticketNumber,
      vehicleNumber,
      vehicleType,
      enteredAt,
      exitedAt,
      durationMinutes: cost.durationMinutes,
      tariffCode: cost.tariffCode,
      hourlyRate: cost.hourlyRate,
      calculatedCost: cost.calculatedCost,
      status: 'completed',
    });
    discounts.push({
      id: `HWD-${period.key.replace('-', '')}-${number}`,
      tenantId: tenant.id,
      parkingSessionId,
      ticketNumber,
      vehicleNumber,
      vehicleType,
      enteredAt,
      exitedAt,
      durationMinutes: cost.durationMinutes,
      tariffCode: cost.tariffCode,
      hourlyRate: cost.hourlyRate,
      originalCost: cost.calculatedCost,
      discountPercent: 100,
      guestDue: 0,
      tenantCharge: cost.calculatedCost,
      status: 'applied',
      comment: index % 7 === 0 ? neutralComments[index % neutralComments.length] : '',
      appliedAt: shiftedIso(exitedAt, -Math.min(5, durationMinutes)),
    });
  }
  return { parkingSessions, discounts };
}

export function generateDemoHistoricalDataset(period: DemoOwnerPeriod): DemoHistoricalDataset {
  const seed = `rospark-history-${period.key}`;
  const tenants = generateDemoTenants();
  const guestRequests = buildRequests(period, tenants, seed);
  const guestPassages = buildPassages(period, guestRequests, seed);
  const { parkingSessions, discounts } = buildWebDiscounts(period, tenants, seed);
  return Object.freeze({
    seed,
    period: Object.freeze({ ...period }),
    tenants: freezeItems(tenants),
    guestRequests: freezeItems(guestRequests),
    guestPassages: freezeItems(guestPassages),
    parkingSessions: freezeItems(parkingSessions),
    webDiscounts: freezeItems(discounts),
  });
}

export function getDemoHistoricalDataset(period: DemoOwnerPeriod) {
  const cached = historyCache.get(period.key);
  if (cached) return cached;
  const generated = generateDemoHistoricalDataset(period);
  historyCache.set(period.key, generated);
  return generated;
}
