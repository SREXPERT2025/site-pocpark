export const DEMO_TENANT_OBJECT_TYPES = [
  'office',
  'warehouse',
  'retail',
  'service',
  'entertainment',
  'logistics',
] as const;

export const DEMO_VEHICLE_TYPES = ['car', 'truck'] as const;
export const DEMO_PARKING_SESSION_STATUSES = ['active', 'completed'] as const;
export const DEMO_GUEST_PASSAGE_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const DEMO_WEB_DISCOUNT_STATUSES = ['applied'] as const;

export type DemoTenantObjectType = (typeof DEMO_TENANT_OBJECT_TYPES)[number];
export type DemoVehicleType = (typeof DEMO_VEHICLE_TYPES)[number];
export type DemoParkingSessionStatus = (typeof DEMO_PARKING_SESSION_STATUSES)[number];
export type DemoGuestPassageStatus = (typeof DEMO_GUEST_PASSAGE_STATUSES)[number];
export type DemoWebDiscountStatus = (typeof DEMO_WEB_DISCOUNT_STATUSES)[number];

export type DemoTenant = {
  id: string;
  shortName: string;
  legalName: string;
  inn: string;
  objectType: DemoTenantObjectType;
  isSeed: boolean;
  createdAt: string;
};

export type DemoParkingSession = {
  id: string;
  sessionId: string | null;
  tenantId: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: DemoVehicleType;
  enteredAt: string;
  exitedAt: string | null;
  tariffCode: string;
  hourlyRate: number;
  calculatedCost: number;
  status: DemoParkingSessionStatus;
  createdAt: string;
  expiresAt: number | null;
  isSeed: boolean;
};

export type DemoGuestPassage = {
  id: string;
  sessionId: string | null;
  requestId: string;
  tenantId: string;
  parkingSessionId: string | null;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number | null;
  amount: number;
  status: DemoGuestPassageStatus;
  createdAt: string;
  expiresAt: number | null;
  isSeed: boolean;
};

export type DemoWebDiscount = {
  id: string;
  sessionId: string;
  parkingSessionId: string;
  tenantId: string;
  appliedAt: string;
  originalCost: number;
  discountPercent: 100;
  guestDue: 0;
  tenantCharge: number;
  status: DemoWebDiscountStatus;
  comment: string;
  createdAt: string;
  expiresAt: number | null;
};
