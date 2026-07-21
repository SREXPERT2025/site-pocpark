import type { DemoTenant, DemoTenantObjectType } from './demo-domain';
import { DEMO_TEST_TENANT_ID } from './demo-config';

const TENANT_CREATED_AT = '2025-01-01T00:00:00.000Z';
const TENANT_SEED = 'rospark-demo-tenants-v1';

const tenantNames = [
  'Альтаир', 'Берег', 'Вектор', 'Горизонт', 'Дельта', 'Енисей', 'Жемчуг', 'Зенит',
  'Импульс', 'Каскад', 'Ладога', 'Меридиан', 'Норд', 'Орион', 'Парус', 'Рубеж',
  'Спектр', 'Тайга', 'Улей', 'Факел', 'Холм', 'Центр', 'Штиль', 'Элемент',
  'Юпитер', 'Янтарь', 'Атлас', 'Бастион', 'Волна', 'Гранит', 'Драйв',
] as const;

const objectTypes: DemoTenantObjectType[] = [
  'office', 'warehouse', 'retail', 'service', 'entertainment', 'logistics',
];

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function innChecksum(firstNineDigits: number[]) {
  const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const weighted = firstNineDigits.reduce((sum, digit, index) => sum + digit * weights[index], 0);
  return (weighted % 11) % 10;
}

function createOrganizationInn(random: () => number, used: Set<string>) {
  for (;;) {
    const digits = [Math.max(1, Math.floor(random() * 10))];
    while (digits.length < 9) digits.push(Math.floor(random() * 10));
    const inn = `${digits.join('')}${innChecksum(digits)}`;
    if (!used.has(inn)) {
      used.add(inn);
      return inn;
    }
  }
}

export function isValidDemoInn(inn: string) {
  if (!/^\d{10}$/.test(inn)) return false;
  const digits = [...inn].map(Number);
  return innChecksum(digits.slice(0, 9)) === digits[9];
}

export function generateDemoTenants(seed = TENANT_SEED): DemoTenant[] {
  const random = createRandom(seed);
  const usedInns = new Set<string>();
  const testTenant: DemoTenant = {
    id: DEMO_TEST_TENANT_ID,
    shortName: 'TEST',
    legalName: 'ООО «Северная башня — демо»',
    inn: createOrganizationInn(random, usedInns),
    objectType: 'office',
    isSeed: true,
    createdAt: TENANT_CREATED_AT,
  };

  const generated = tenantNames.map((name, index): DemoTenant => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `tenant-demo-${number}`,
      shortName: `Демо «${name}-${number}»`,
      legalName: `ООО «Демонстрационный арендатор ${name}-${number}»`,
      inn: createOrganizationInn(random, usedInns),
      objectType: objectTypes[(index + Math.floor(random() * objectTypes.length)) % objectTypes.length],
      isSeed: true,
      createdAt: TENANT_CREATED_AT,
    };
  });

  return [testTenant, ...generated];
}
