export type OwnerPeriodMode = 'previous-month' | 'current';

export type OwnerPeriod = {
  from: string;
  toExclusive: string;
  timezone: string;
  label: string;
};

export type OwnerObjectType =
  | 'office'
  | 'warehouse'
  | 'retail'
  | 'service'
  | 'entertainment'
  | 'logistics';

export type OwnerVehicleType = 'car' | 'truck';
export type OwnerOperationType = 'guest_passage' | 'web_discount';
export type OwnerOperationStatus = 'active' | 'completed' | 'cancelled' | 'applied';
export type OwnerOperationSource = 'historical' | 'current_session';
export type OwnerGuestRequestType = 'single' | 'multi';
export type OwnerGuestRequestStatus = 'waiting' | 'active' | 'completed' | 'cancelled' | 'expired';
export type OwnerGuestRequestSort =
  | 'createdAt'
  | 'requestNumber'
  | 'tenantShortName'
  | 'status'
  | 'passageCount'
  | 'totalAmount';
export type OwnerWebDiscountSort =
  | 'appliedAt'
  | 'ticketNumber'
  | 'tenantShortName'
  | 'originalCost'
  | 'durationMinutes';
export type OwnerOperationSort =
  | 'enteredAt'
  | 'exitedAt'
  | 'amount'
  | 'durationMinutes'
  | 'tenantShortName'
  | 'basisNumber';
export type OwnerTenantSort =
  | 'shortName'
  | 'operationCount'
  | 'totalAmount'
  | 'guestRequestCount'
  | 'webDiscountCount';
export type SortOrder = 'asc' | 'desc';

export type OwnerSummary = {
  period: OwnerPeriod;
  tenantCount: number;
  guestRequestCount: number;
  guestPassageCount: number;
  webDiscountCount: number;
  carOperationCount: number;
  truckOperationCount: number;
  guestParkingAmount: number;
  tenantChargeAmount: number;
  averageDurationMinutes: number;
  activeParkingSessionCount: number;
  completedOperationCount: number;
  amounts: {
    guestPassages: number;
    webDiscounts: number;
    totalTenantCharges: number;
  };
};

export type OwnerTenant = {
  tenantId: string;
  shortName: string;
  legalName: string;
  inn: string;
  objectType: OwnerObjectType;
  operationCount: number;
  guestRequestCount: number;
  guestPassageCount: number;
  webDiscountCount: number;
  carOperationCount: number;
  truckOperationCount: number;
  carAmount: number;
  truckAmount: number;
  guestPassageAmount: number;
  webDiscountAmount: number;
  totalAmount: number;
  averageDurationMinutes: number;
};

export type OwnerTenantRow = OwnerTenant;

export type OwnerOperation = {
  id: string;
  operationType: OwnerOperationType;
  tenantId: string;
  tenantShortName: string;
  basisNumber: string;
  vehicleNumber: string | null;
  vehicleType: OwnerVehicleType;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number;
  amount: number;
  status: OwnerOperationStatus;
  source: OwnerOperationSource;
};

export type OwnerTenantsResponse = {
  period: OwnerPeriod;
  items: OwnerTenant[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OwnerOperationsResponse = {
  period: OwnerPeriod;
  items: OwnerOperation[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OwnerGuestRequest = {
  id: string;
  requestNumber: string;
  tenantId: string;
  tenantShortName: string;
  guestName: string;
  vehicleNumber: string | null;
  requestType: OwnerGuestRequestType;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  status: OwnerGuestRequestStatus;
  passageCount: number;
  totalDurationMinutes: number;
  totalAmount: number;
};

export type OwnerGuestRequestsResponse = {
  period: OwnerPeriod;
  items: OwnerGuestRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OwnerWebDiscount = {
  id: string;
  tenantId: string;
  tenantShortName: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: OwnerVehicleType;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number;
  tariffCode: string;
  hourlyRate: number;
  originalCost: number;
  discountPercent: number;
  guestDue: number;
  tenantCharge: number;
  status: 'applied';
  comment: string;
  appliedAt: string;
  source: OwnerOperationSource;
};

export type OwnerWebDiscountsResponse = {
  period: OwnerPeriod;
  items: OwnerWebDiscount[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OwnerTenantDetail = {
  tenant: Pick<OwnerTenant, 'tenantId' | 'shortName' | 'legalName' | 'inn' | 'objectType'>;
  period: OwnerPeriod;
  summary: OwnerTenant & Omit<OwnerSummary, 'period'>;
  recentOperations: OwnerOperation[];
};

export type OwnerApiError = {
  error?: string;
  code?: 'UNAUTHORIZED' | 'INVALID_QUERY' | 'TENANT_NOT_FOUND' | 'INTERNAL_ERROR' | string;
};
