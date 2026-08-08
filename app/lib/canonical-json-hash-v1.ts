import { createHash } from 'node:crypto';

export const CANONICALIZATION_VERSION = 'CANONICAL_JSON_HASH_V1' as const;
export const MAX_INTEROPERABLE_INTEGER = 9_007_199_254_740_991;

export class CanonicalizationError extends Error {}

function scalarValues(value: string) {
  const result: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) {
        throw new CanonicalizationError('CANONICAL_JSON_INVALID_UNICODE');
      }
      result.push(((first - 0xd800) * 0x400) + second - 0xdc00 + 0x10000);
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      throw new CanonicalizationError('CANONICAL_JSON_INVALID_UNICODE');
    } else {
      result.push(first);
    }
  }
  return result;
}

function compareStrings(left: string, right: string) {
  const a = scalarValues(left);
  const b = scalarValues(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function canonicalString(value: string) {
  scalarValues(value);
  let output = '"';
  for (const character of value) {
    const codepoint = character.codePointAt(0) as number;
    if (character === '"') output += '\\"';
    else if (character === '\\') output += '\\\\';
    else if (codepoint <= 0x1f) {
      output += `\\u${codepoint.toString(16).padStart(4, '0')}`;
    } else output += character;
  }
  return `${output}"`;
}

function canonicalNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new CanonicalizationError('CANONICAL_JSON_NON_FINITE_NUMBER');
  }
  if (Object.is(value, -0) || value === 0) return '0';
  const negative = value < 0;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, Math.abs(value), false);
  const high = view.getUint32(0, false);
  const low = view.getUint32(4, false);
  const exponentBits = (high >>> 20) & 0x7ff;
  const fraction = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
  const mantissa = exponentBits === 0
    ? fraction
    : (1n << 52n) | fraction;
  const exponent = exponentBits === 0
    ? -1074
    : exponentBits - 1023 - 52;
  let rendered: string;
  if (exponent >= 0) {
    rendered = (mantissa << BigInt(exponent)).toString();
  } else {
    const scale = -exponent;
    const digits = (mantissa * (5n ** BigInt(scale))).toString();
    if (digits.length <= scale) {
      rendered = `0.${'0'.repeat(scale - digits.length)}${digits}`;
    } else {
      rendered = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
    }
    rendered = rendered.replace(/0+$/, '').replace(/\.$/, '');
  }
  if (!rendered.includes('.')
    && BigInt(rendered) > BigInt(MAX_INTEROPERABLE_INTEGER)) {
    throw new CanonicalizationError('CANONICAL_JSON_UNSAFE_INTEGER');
  }
  return `${negative ? '-' : ''}${rendered}`;
}

export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  const encode = (item: unknown): string => {
    if (item === null) return 'null';
    if (item === true) return 'true';
    if (item === false) return 'false';
    if (typeof item === 'string') return canonicalString(item);
    if (typeof item === 'number') return canonicalNumber(item);
    if (Array.isArray(item)) {
      if (active.has(item)) {
        throw new CanonicalizationError('CANONICAL_JSON_CYCLE');
      }
      active.add(item);
      try {
        const entries: string[] = [];
        for (let index = 0; index < item.length; index += 1) {
          if (!Object.prototype.hasOwnProperty.call(item, index)) {
            throw new CanonicalizationError('CANONICAL_JSON_SPARSE_ARRAY');
          }
          entries.push(encode(item[index]));
        }
        return `[${entries.join(',')}]`;
      } finally {
        active.delete(item);
      }
    }
    if (typeof item === 'object') {
      const source = item as Record<string, unknown>;
      const prototype = Object.getPrototypeOf(source);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new CanonicalizationError('CANONICAL_JSON_UNSUPPORTED_TYPE');
      }
      if (active.has(source)) {
        throw new CanonicalizationError('CANONICAL_JSON_CYCLE');
      }
      active.add(source);
      try {
        return `{${Object.keys(source)
          .sort(compareStrings)
          .map((key) => `${canonicalString(key)}:${encode(source[key])}`)
          .join(',')}}`;
      } finally {
        active.delete(source);
      }
    }
    throw new CanonicalizationError('CANONICAL_JSON_UNSUPPORTED_TYPE');
  };
  return encode(value);
}

export function canonicalUtf8(value: unknown) {
  return Buffer.from(canonicalJson(value), 'utf8');
}

export function canonicalSha256(value: unknown) {
  return createHash('sha256').update(canonicalUtf8(value)).digest('hex');
}

export function sha256(value: unknown) {
  if (typeof value === 'string') {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
  return canonicalSha256(value);
}
