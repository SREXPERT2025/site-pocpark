import type {
  OwnerObjectType,
  OwnerGuestRequestStatus,
  OwnerGuestRequestType,
  OwnerOperationStatus,
  OwnerOperationSource,
  OwnerOperationType,
  OwnerVehicleType,
} from './owner-types';

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

const objectTypeLabels: Record<OwnerObjectType, string> = {
  office: 'Офис',
  warehouse: 'Склад',
  retail: 'Торговля',
  service: 'Сервис',
  entertainment: 'Развлечения',
  logistics: 'Логистика',
};

const operationTypeLabels: Record<OwnerOperationType, string> = {
  guest_passage: 'Гостевой проезд',
  web_discount: 'Оплата парковки гостя',
};

const operationStatusLabels: Record<OwnerOperationStatus, string> = {
  active: 'На территории',
  completed: 'Завершено',
  cancelled: 'Отменено',
  applied: 'Оплачено арендатором',
};

const vehicleTypeLabels: Record<OwnerVehicleType, string> = {
  car: 'Легковой',
  truck: 'Грузовой',
};

const requestTypeLabels: Record<OwnerGuestRequestType, string> = {
  single: 'Одноразовая заявка',
  multi: 'Многоразовая заявка',
};

const requestStatusLabels: Record<OwnerGuestRequestStatus, string> = {
  waiting: 'Ожидает въезда',
  active: 'Действует',
  completed: 'Завершена',
  cancelled: 'Отменена',
  expired: 'Истекла',
};

const operationSourceLabels: Record<OwnerOperationSource, string> = {
  historical: 'Исторический demo-отчёт',
  current_session: 'Текущая demo-сессия',
};

export function formatOwnerMoney(value: number) {
  return `${moneyFormatter.format(Number.isFinite(value) ? value : 0)} ₽`;
}

export function formatOwnerInteger(value: number) {
  return integerFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatOwnerDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (!hours) return `${rest} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

export function formatOwnerDateTime(value: string, timezone = 'Europe/Moscow') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    }).format(date);
  }
}

export function ownerObjectTypeLabel(value: OwnerObjectType) {
  return objectTypeLabels[value];
}

export function ownerOperationTypeLabel(value: OwnerOperationType) {
  return operationTypeLabels[value];
}

export function ownerOperationStatusLabel(value: OwnerOperationStatus) {
  return operationStatusLabels[value];
}

export function ownerVehicleTypeLabel(value: OwnerVehicleType) {
  return vehicleTypeLabels[value];
}

export function ownerGuestRequestTypeLabel(value: OwnerGuestRequestType) {
  return requestTypeLabels[value];
}

export function ownerGuestRequestStatusLabel(value: OwnerGuestRequestStatus) {
  return requestStatusLabels[value];
}

export function ownerOperationSourceLabel(value: OwnerOperationSource) {
  return operationSourceLabels[value];
}
