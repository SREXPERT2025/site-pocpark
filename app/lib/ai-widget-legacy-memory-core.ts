import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { AiWidgetTurnRow } from './ai-widget-log-core';

export const LEGACY_CONVERSATION_MEMORY_VERSION =
  'ROSPARK_LEGACY_CONVERSATION_MEMORY_V1';
export const LEGACY_RECENT_MESSAGE_LIMIT = 12;

export type LegacyMemoryValue = string | number | boolean | string[];

export type LegacyMemoryFact = {
  key: string;
  value: LegacyMemoryValue;
  confidence: 'confirmed';
  provenance: 'direct_user';
  sourceTurnId: string;
  sourceExcerpt: string;
  status: 'active' | 'superseded';
  supersededByTurnId: string | null;
};

export type LegacyMemoryRequirement = {
  category: string;
  text: string;
  sourceTurnId: string;
  status: 'active' | 'superseded';
  supersededByTurnId: string | null;
};

export type LegacyAskedQuestion = {
  text: string;
  sourceTurnId: string;
};

export type LegacyConversationMemory = {
  version: typeof LEGACY_CONVERSATION_MEMORY_VERSION;
  sessionId: string;
  facts: LegacyMemoryFact[];
  requirements: LegacyMemoryRequirement[];
  objections: Array<{ text: string; sourceTurnId: string }>;
  alreadyAskedQuestions: LegacyAskedQuestion[];
  salesStage: 'greeting' | 'discovery' | 'requirements_collected'
    | 'solution_discussion' | 'commercial';
  sourceTurnCount: number;
  transcriptSha256: string;
  updatedAt: string;
};

export type LegacyGatewayMemory = {
  version: typeof LEGACY_CONVERSATION_MEMORY_VERSION;
  confirmedFacts: Record<string, LegacyMemoryValue>;
  factProvenance: Record<string, string>;
  activeRequirements: Array<{
    category: string;
    text: string;
    sourceTurnId: string;
  }>;
  objections: Array<{ text: string; sourceTurnId: string }>;
  alreadyAskedQuestions: LegacyAskedQuestion[];
  salesStage: LegacyConversationMemory['salesStage'];
};

export type LegacyRecentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function cleanExcerpt(value: string, maximum = 240) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function sameValue(left: LegacyMemoryValue, right: LegacyMemoryValue) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function setFact(
  facts: LegacyMemoryFact[],
  input: {
    key: string;
    value: LegacyMemoryValue;
    turnId: string;
    source: string;
  },
) {
  const current = [...facts].reverse().find((fact) => (
    fact.key === input.key && fact.status === 'active'
  ));
  if (current && sameValue(current.value, input.value)) return;
  if (current) {
    current.status = 'superseded';
    current.supersededByTurnId = input.turnId;
  }
  facts.push({
    key: input.key,
    value: input.value,
    confidence: 'confirmed',
    provenance: 'direct_user',
    sourceTurnId: input.turnId,
    sourceExcerpt: cleanExcerpt(input.source),
    status: 'active',
    supersededByTurnId: null,
  });
}

function lastNumberFor(
  text: string,
  patterns: RegExp[],
) {
  const matches: Array<{ index: number; value: number }> = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match.groups?.value;
      if (!raw) continue;
      const value = Number(raw.replace(/\s/g, ''));
      if (Number.isSafeInteger(value) && value >= 0 && value <= 100_000) {
        matches.push({ index: match.index ?? 0, value });
      }
    }
  }
  return matches.sort((left, right) => left.index - right.index).at(-1)?.value;
}

const NUMBER_WORDS: Record<string, number> = {
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
};

function lastCount(text: string, noun: 'въезд' | 'выезд') {
  const numeric = lastNumberFor(text, [
    new RegExp(`(?<value>\\d{1,2})\\s+${noun}`, 'giu'),
  ]);
  const words = [...text.matchAll(
    new RegExp(`(?<value>один|одна|два|две|три|четыре)\\s+${noun}`, 'giu'),
  )];
  const word = words.at(-1);
  if (!word) return numeric;
  const wordIndex = word.index ?? 0;
  const numericMatches = [...text.matchAll(
    new RegExp(`(?<value>\\d{1,2})\\s+${noun}`, 'giu'),
  )];
  const numericIndex = numericMatches.at(-1)?.index ?? -1;
  return wordIndex > numericIndex
    ? NUMBER_WORDS[word.groups?.value.toLocaleLowerCase('ru-RU') ?? '']
    : numeric;
}

function lastPatternValue(
  text: string,
  entries: Array<[string, RegExp]>,
) {
  const matches: Array<{ index: number; value: string }> = [];
  for (const [value, pattern] of entries) {
    for (const match of text.matchAll(pattern)) {
      matches.push({ index: match.index ?? 0, value });
    }
  }
  return matches.sort((left, right) => left.index - right.index).at(-1)?.value;
}

function extractDirectFacts(
  facts: LegacyMemoryFact[],
  turn: AiWidgetTurnRow,
) {
  const text = turn.userContent;
  const add = (key: string, value: LegacyMemoryValue | undefined) => {
    if (value === undefined) return;
    setFact(facts, {
      key,
      value,
      turnId: turn.id,
      source: text,
    });
  };

  add('object_type', lastPatternValue(text, [
    ['бизнес-центр', /бизнес[- ]центр|бц/giu],
    ['торговый центр', /торгов\p{L}*\s+центр|тц/giu],
    ['жилой комплекс', /жил\p{L}*\s+комплекс|жк/giu],
    ['гостиница', /гостиниц\p{L}*|отел\p{L}*/giu],
    ['складской комплекс', /складск\p{L}*\s+комплекс|склад\p{L}*/giu],
    ['офисное здание', /офисн\p{L}*\s+(?:здание|центр)/giu],
    ['предприятие', /предприяти\p{L}*/giu],
  ]));

  const dailyTraffic = lastNumberFor(text, [
    /(?<value>\d[\d\s]{0,5})\s*(?:авто(?:мобил\p{L}*)?|машин\p{L}*)\s*(?:(?:\/|в\s+)?сут(?:ки|ок)|в\s+день)/giu,
    /(?:ежедневн\p{L}*|в\s+сутки|в\s+день)\D{0,24}(?<value>\d[\d\s]{0,5})\s*(?:авто(?:мобил\p{L}*)?|машин\p{L}*)?/giu,
  ]);
  add('daily_traffic', dailyTraffic);

  const parkingCapacity = lastNumberFor(text, [
    /(?:парковк\p{L}*|стоянк\p{L}*|вместимост\p{L}*)\D{0,30}(?:на\s*)?(?<value>\d[\d\s]{0,5})\s*(?:машин\p{L}*|авто(?:мобил\p{L}*)?|мест\p{L}*)/giu,
    /(?:на|вместимостью|около|примерно)\s*(?<value>\d[\d\s]{0,5})\s*(?:парковочн\p{L}*\s*)?мест\p{L}*/giu,
    /(?<value>\d[\d\s]{0,5})\s+парковочн\p{L}*\s+мест\p{L}*/giu,
    /(?:бизнес[- ]центр|бц|торгов\p{L}*\s+центр|тц|жил\p{L}*\s+комплекс|жк|склад\p{L}*)\D{0,24}на\s*(?<value>\d[\d\s]{0,5})\s*(?:машин\p{L}*|авто(?:мобил\p{L}*)?|мест\p{L}*)/giu,
  ]);
  if (parkingCapacity !== undefined && !/сут(?:ки|ок)|в\s+день/iu.test(text)) {
    add('parking_capacity', parkingCapacity);
  }

  add('entrances', lastCount(text, 'въезд'));
  add('exits', lastCount(text, 'выезд'));

  const segmentPatterns: Array<[string, RegExp]> = [
    ['employees', /сотрудник\p{L}*|персонал\p{L}*/giu],
    ['tenants', /арендатор\p{L}*/giu],
    ['guests', /гост\p{L}*|посетител\p{L}*/giu],
    ['residents', /жител\p{L}*|резидент\p{L}*/giu],
  ];
  for (const [segment, pattern] of segmentPatterns) {
    const match = [...text.matchAll(pattern)].at(-1);
    if (!match) continue;
    const nearby = text.slice(Math.max(0, (match.index ?? 0) - 28),
      (match.index ?? 0) + match[0].length + 28);
    add(
      `user_segment.${segment}`,
      !/не\s+(?:будет|нужн|планируем|хотим)|без\s+/iu.test(nearby),
    );
  }

  const identifierPatterns: Array<[string, RegExp]> = [
    ['license_plate', /госномер\p{L}*|распознаван\p{L}*\s+номер\p{L}*|по\s+номер\p{L}*/giu],
    ['card', /карт\p{L}*/giu],
    ['ticket', /билет\p{L}*|талон\p{L}*/giu],
    ['qr', /\bqr\b|куар/giu],
  ];
  if (/предпочит|хотим|выбира|основн\p{L}+\s+способ|идентификатор/iu.test(text)) {
    for (const [identifier, pattern] of identifierPatterns) {
      const match = [...text.matchAll(pattern)].at(-1);
      if (!match) continue;
      const nearby = text.slice(
        Math.max(0, (match.index ?? 0) - 28),
        (match.index ?? 0) + match[0].length + 28,
      );
      add(
        `identification.${identifier}`,
        !/не\s+(?:нужн|хотим|будет|использ)|без\s+|отказ\p{L}*\s+от/iu.test(nearby),
      );
    }
  }

  add('current_system', lastPatternValue(text, [
    ['new_build', /с\s+нуля|проектиру\p{L}*|систем\p{L}*\s+ещ[её]\s+нет|нов\p{L}+\s+объект/giu],
    ['installed', /уже\s+(?:установлен|работает|стоит)|существующ\p{L}+\s+систем|действующ\p{L}+\s+систем|стар\p{L}+\s+систем/giu],
  ]));
  if (/модерниз\p{L}*|замен\p{L}*\s+(?:стар|существ)|оставить\p{L}*\s+оборуд/iu.test(text)) {
    add('modernization', true);
  }

  add('payment', lastPatternValue(text, [
    ['on_exit', /оплат\p{L}*\D{0,24}(?:на|при|перед)\s+выезд|выезд\p{L}*\D{0,24}после\s+оплат/giu],
    ['on_entry', /оплат\p{L}*\D{0,24}(?:на|при|перед)\s+въезд/giu],
    ['required', /платн\p{L}+\s+парков|оплат\p{L}*\s+обязатель\p{L}*/giu],
    ['not_required', /без\s+оплат|оплат\p{L}*\s+не\s+нужн/giu],
  ]));
  const paymentAmount = lastNumberFor(text, [
    /(?<value>\d[\d\s]{0,8})\s*(?:руб(?:л\p{L}*)?|₽)/giu,
  ]);
  if (paymentAmount !== undefined && /оплат|тариф|стоим|бюджет/iu.test(text)) {
    add('payment_amount_rub', paymentAmount);
  }

  const budget = lastNumberFor(text, [
    /бюджет\D{0,24}(?<value>\d[\d\s]{0,10})\s*(?:руб(?:л\p{L}*)?|₽)?/giu,
    /(?<value>\d[\d\s]{2,10})\s*(?:руб(?:л\p{L}*)?|₽)\D{0,18}бюджет/giu,
  ]);
  add('budget_rub', budget);

  const integrationPatterns: Array<[string, RegExp]> = [
    ['1c', /1с|\b1c\b/giu],
    ['crm', /\bcrm\b|срм/giu],
    ['skud', /скуд/giu],
    ['api', /\bapi\b/giu],
    ['erp', /\berp\b/giu],
  ];
  for (const [integration, pattern] of integrationPatterns) {
    const match = [...text.matchAll(pattern)].at(-1);
    if (!match) continue;
    const nearby = text.slice(
      Math.max(0, (match.index ?? 0) - 28),
      (match.index ?? 0) + match[0].length + 28,
    );
    add(
      `integration.${integration}`,
      !/не\s+(?:нужн|будет|использ)|без\s+|отказ\p{L}*\s+от/iu.test(nearby),
    );
  }
}

function requirementCategory(text: string) {
  const categories: Array<[string, RegExp]> = [
    ['payment', /оплат|тариф|касс|терминал/iu],
    ['identification', /распознаван|госномер|карт\p{L}*\s+доступ|билет|\bqr\b/iu],
    ['guest_access', /гост|посетител|приглаш/iu],
    ['employee_access', /сотрудник|персонал|арендатор/iu],
    ['integration', /интеграц|\bapi\b|1с|\bcrm\b|скуд/iu],
    ['modernization', /модерниз|стар\p{L}+\s+систем|оставить\p{L}*\s+оборуд/iu],
    ['reliability', /резерв|автоном|интернет|электрич|отказ/iu],
    ['access', /доступ|въезд|выезд|шлагбаум|автоматиз/iu],
  ];
  return categories.find(([, pattern]) => pattern.test(text))?.[0];
}

function updateRequirements(
  requirements: LegacyMemoryRequirement[],
  turn: AiWidgetTurnRow,
) {
  const category = requirementCategory(turn.userContent);
  if (!category) return;
  const text = cleanExcerpt(turn.userContent, 360);
  const explicit = /нужн|хот|должн|треб|задач|важн|предпочит|планиру|модерниз/iu.test(text);
  if (!explicit) return;
  if (/(?:^|[^\p{L}\p{N}_])(?:не|нет|вместо|измен\p{L}*|передум\p{L}*|исправ\p{L}*)(?=$|[^\p{L}\p{N}_])/iu.test(text)) {
    for (const item of requirements) {
      if (item.category === category && item.status === 'active') {
        item.status = 'superseded';
        item.supersededByTurnId = turn.id;
      }
    }
  }
  if (requirements.some((item) => (
    item.status === 'active' && item.category === category && item.text === text
  ))) return;
  requirements.push({
    category,
    text,
    sourceTurnId: turn.id,
    status: 'active',
    supersededByTurnId: null,
  });
}

function assistantQuestions(turn: AiWidgetTurnRow) {
  if (!turn.assistantContent || turn.status !== 'answered') return [];
  return (turn.assistantContent.match(/[^.!?\n]{3,240}\?/gu) ?? [])
    .map((question) => cleanExcerpt(question, 240));
}

function transcriptSha256(turns: AiWidgetTurnRow[]) {
  const hash = createHash('sha256');
  for (const turn of turns) {
    hash.update(turn.id);
    hash.update('\0user\0');
    hash.update(turn.userContent);
    hash.update('\0assistant\0');
    hash.update(turn.assistantContent ?? '');
    hash.update('\0status\0');
    hash.update(turn.status);
    hash.update('\n');
  }
  return hash.digest('hex');
}

export function buildLegacyConversationMemory(
  sessionId: string,
  turns: AiWidgetTurnRow[],
  nowMs = Date.now(),
): LegacyConversationMemory {
  const scopedTurns = turns.filter((turn) => turn.sessionId === sessionId);
  const facts: LegacyMemoryFact[] = [];
  const requirements: LegacyMemoryRequirement[] = [];
  const objections: LegacyConversationMemory['objections'] = [];
  const alreadyAskedQuestions: LegacyAskedQuestion[] = [];
  const seenQuestions = new Set<string>();

  for (const turn of scopedTurns) {
    extractDirectFacts(facts, turn);
    updateRequirements(requirements, turn);
    if (/дорог|сомнева|опаса|боюсь|возраж|не\s+устраива|сложн|медлен/iu.test(turn.userContent)) {
      objections.push({
        text: cleanExcerpt(turn.userContent, 360),
        sourceTurnId: turn.id,
      });
    }
    for (const question of assistantQuestions(turn)) {
      const normalized = question.toLocaleLowerCase('ru-RU');
      if (seenQuestions.has(normalized)) continue;
      seenQuestions.add(normalized);
      alreadyAskedQuestions.push({ text: question, sourceTurnId: turn.id });
    }
  }

  const activeFacts = facts.filter((fact) => fact.status === 'active');
  const activeRequirements = requirements.filter((item) => item.status === 'active');
  const userText = scopedTurns.map((turn) => turn.userContent).join('\n');
  let salesStage: LegacyConversationMemory['salesStage'] = 'greeting';
  if (activeFacts.length || activeRequirements.length) salesStage = 'discovery';
  if (activeFacts.length >= 2 || activeRequirements.length >= 2) {
    salesStage = 'requirements_collected';
  }
  if (/что\s+лучше|подобрат|предлож|рекоменд|вариант|сценари/iu.test(userText)) {
    salesStage = 'solution_discussion';
  }
  if (/цен|стоим|бюджет|коммерческ|заявк|связаться|перезвон/iu.test(userText)) {
    salesStage = 'commercial';
  }

  return {
    version: LEGACY_CONVERSATION_MEMORY_VERSION,
    sessionId,
    facts: facts.slice(-80),
    requirements: requirements.slice(-40),
    objections: objections.slice(-16),
    alreadyAskedQuestions: alreadyAskedQuestions.slice(-20),
    salesStage,
    sourceTurnCount: scopedTurns.length,
    transcriptSha256: transcriptSha256(scopedTurns),
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export function legacyGatewayMemory(
  memory: LegacyConversationMemory,
): LegacyGatewayMemory {
  const confirmedFacts: Record<string, LegacyMemoryValue> = {};
  const factProvenance: Record<string, string> = {};
  for (const fact of memory.facts) {
    if (fact.status !== 'active') continue;
    confirmedFacts[fact.key] = fact.value;
    factProvenance[fact.key] = fact.sourceTurnId;
  }
  return {
    version: LEGACY_CONVERSATION_MEMORY_VERSION,
    confirmedFacts,
    factProvenance,
    activeRequirements: memory.requirements
      .filter((item) => item.status === 'active')
      .slice(-12)
      .map((item) => ({
        category: item.category,
        text: cleanExcerpt(item.text, 240),
        sourceTurnId: item.sourceTurnId,
      })),
    objections: memory.objections.slice(-4).map((item) => ({
      ...item,
      text: cleanExcerpt(item.text, 240),
    })),
    alreadyAskedQuestions: memory.alreadyAskedQuestions.slice(-8).map(
      (item) => ({ ...item, text: cleanExcerpt(item.text, 180) }),
    ),
    salesStage: memory.salesStage,
  };
}

export function legacyRawTranscript(turns: AiWidgetTurnRow[]) {
  const messages: LegacyRecentMessage[] = [];
  for (const turn of turns) {
    messages.push({ role: 'user', content: turn.userContent });
    if (turn.status === 'answered' && turn.assistantContent) {
      messages.push({ role: 'assistant', content: turn.assistantContent });
    }
  }
  return messages;
}

export function legacyRecentMessages(
  turns: AiWidgetTurnRow[],
  maximum = LEGACY_RECENT_MESSAGE_LIMIT,
  currentTurnId?: string,
) {
  const eligible = currentTurnId
    ? turns.filter((turn) => (
      turn.status === 'answered' || turn.id === currentTurnId
    ))
    : turns;
  return legacyRawTranscript(eligible).slice(-maximum);
}

export function persistLegacyConversationMemory(
  db: Database.Database,
  memory: LegacyConversationMemory,
  expiresAtMs: number,
  nowMs = Date.now(),
) {
  const payload = JSON.stringify(memory);
  if (Buffer.byteLength(payload, 'utf8') > 64_000) {
    throw new Error('LEGACY_MEMORY_TOO_LARGE');
  }
  db.prepare(`
    INSERT INTO ai_widget_legacy_memory (
      session_id, version, snapshot_json, source_turn_count,
      transcript_sha256, updated_at, updated_at_ms, expires_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      version = excluded.version,
      snapshot_json = excluded.snapshot_json,
      source_turn_count = excluded.source_turn_count,
      transcript_sha256 = excluded.transcript_sha256,
      updated_at = excluded.updated_at,
      updated_at_ms = excluded.updated_at_ms,
      expires_at_ms = excluded.expires_at_ms
  `).run(
    memory.sessionId,
    memory.version,
    payload,
    memory.sourceTurnCount,
    memory.transcriptSha256,
    memory.updatedAt,
    nowMs,
    expiresAtMs,
  );
}

export function getLegacyConversationMemory(
  db: Database.Database,
  sessionId: string,
): LegacyConversationMemory | null {
  const row = db.prepare(`
    SELECT snapshot_json
    FROM ai_widget_legacy_memory
    WHERE session_id = ?
  `).get(sessionId) as { snapshot_json: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.snapshot_json) as LegacyConversationMemory;
}

export function prepareLegacyConversationContext(
  db: Database.Database,
  sessionId: string,
  turns: AiWidgetTurnRow[],
  expiresAtMs: number,
  nowMs = Date.now(),
  currentTurnId?: string,
) {
  const scopedTurns = turns.filter((turn) => turn.sessionId === sessionId);
  const memory = buildLegacyConversationMemory(sessionId, scopedTurns, nowMs);
  persistLegacyConversationMemory(db, memory, expiresAtMs, nowMs);
  return {
    fullTranscript: legacyRawTranscript(scopedTurns),
    recentMessages: legacyRecentMessages(
      scopedTurns,
      LEGACY_RECENT_MESSAGE_LIMIT,
      currentTurnId,
    ),
    memory,
    gatewayMemory: legacyGatewayMemory(memory),
  };
}
