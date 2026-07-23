import 'server-only';

import type { DemoVehicleType } from './demo-domain';

export const DEMO_TEST_TENANT_ID = 'tenant-test';
export const DEMO_USER_TTL_MS = 24 * 60 * 60 * 1000;
export const DEMO_USER_REQUEST_LIMIT = 20;
export const DEMO_FEEDBACK_LEAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const GUEST_REQUEST_HOURLY_RATE = 100;

export const WEB_DEMO_TARIFFS = {
  car: {
    code: 'demo-car-started-hour',
    label: 'Легковой · demo-тариф',
    hourlyRate: 100,
  },
  truck: {
    code: 'demo-truck-started-hour',
    label: 'Грузовой · demo-тариф',
    hourlyRate: 250,
  },
} as const satisfies Record<DemoVehicleType, {
  code: string;
  label: string;
  hourlyRate: number;
}>;

type DemoParkingCostInput = {
  enteredAt: string | Date;
  exitedAt?: string | Date | null;
  vehicleType: DemoVehicleType;
  now?: string | Date;
};

function dateValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Некорректная дата demo-парковки.');
  return date;
}

export function calculateDemoParkingCost({ enteredAt, exitedAt, vehicleType, now = new Date() }: DemoParkingCostInput) {
  const entered = dateValue(enteredAt);
  const calculatedUntil = dateValue(exitedAt ?? now);
  if (calculatedUntil < entered) throw new Error('Время выезда не может быть раньше времени въезда.');

  const durationMinutes = Math.max(0, Math.ceil((calculatedUntil.getTime() - entered.getTime()) / 60_000));
  const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
  const tariff = WEB_DEMO_TARIFFS[vehicleType];

  return {
    durationMinutes,
    billableHours,
    tariffCode: tariff.code,
    hourlyRate: tariff.hourlyRate,
    calculatedCost: billableHours * tariff.hourlyRate,
  };
}
