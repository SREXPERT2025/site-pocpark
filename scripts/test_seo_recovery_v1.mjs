import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const solutions = read('app/(narrow)/resheniya/page.tsx');
const equipment = read('app/(narrow)/oborudovanie/page.tsx');
const barriers = read('content/oborudovanie/shlagbaumy.md');
const recognitionArticle = read(
  'content/stati/raspoznavanie-nomerov-dlya-parkovki.md',
);
const recognitionCapability = read(
  'content/vozmozhnosti/raspoznavanie-nomerov.md',
);

for (const expected of [
  'Что входит в автоматизированную парковочную систему',
  "href: '/oborudovanie'",
  "href: '/vozmozhnosti/raspoznavanie-nomerov'",
  "href: '/vozmozhnosti/onlain-oplata'",
  "href: '/stati/otchetnost-vladelca-parkovki'",
  "href: '/resheniya/stoimost-avtomatizacii-parkovki'",
]) {
  assert.ok(solutions.includes(expected), `solutions hub must include ${expected}`);
}

for (const expected of [
  'Оборудование или готовый сценарий парковки',
  'href="/oborudovanie/shlagbaumy"',
  'href="/stati/iz-chego-sostoit-parkovochnaya-sistema"',
  'href="/parkovka-pod-klyuch"',
]) {
  assert.ok(equipment.includes(expected), `equipment hub must include ${expected}`);
}

assert.match(
  barriers,
  /^title: "Шлагбаумы для парковок"$/m,
  'barrier title must rely on the root brand suffix once',
);
assert.ok(
  barriers.match(/^description: "(.+)"$/m)?.[1].length <= 160,
  'barrier description must stay concise',
);

assert.ok(
  recognitionArticle.includes(
    '[«Распознавание номеров для парковки»](/vozmozhnosti/raspoznavanie-nomerov)',
  ),
  'informational article must link to the commercial capability',
);
assert.ok(
  recognitionCapability.includes(
    '](/stati/raspoznavanie-nomerov-dlya-parkovki)',
  ),
  'commercial capability must link to the informational article',
);

const metadataTitleChecks = [
  ['app/(narrow)/o-kompanii/page.tsx', "const title = 'О компании';"],
  [
    'app/(narrow)/resheniya/biznes-centry/page.tsx',
    '"title": "Автоматизация парковки для бизнес-центров",',
  ],
  [
    'app/(narrow)/resheniya/torgovye-centry/page.tsx',
    '"title": "Автоматизация парковки для торговых центров",',
  ],
  [
    'app/(narrow)/resheniya/skladskie-kompleksy/page.tsx',
    "const heroTitle = 'Автоматизация парковки и проездов для складских комплексов';",
  ],
  [
    'app/(narrow)/resheniya/zastroyschiki/page.tsx',
    '"title": "Автоматизация парковки для застройщиков и жилых комплексов",',
  ],
];

for (const [path, expected] of metadataTitleChecks) {
  assert.ok(read(path).includes(expected), `${path} must avoid a repeated brand suffix`);
}

const uniqueDescriptionPaths = [
  'content/keysy/spar-chertanovskaya.md',
  'content/keysy/spar-dnepropetrovskaya.md',
  'content/keysy/spar-elevatornaya.md',
  'content/keysy/spar-nizh-novgorod.md',
  'content/keysy/spar-saransk.md',
  'content/keysy/spar-yaroslavskaya.md',
  'content/oborudovanie/stoika-rospark-premium-enter.md',
  'content/oborudovanie/stoika-rospark-standart-enter.md',
  'content/oborudovanie/stoika-rospark-premium-exit.md',
  'content/oborudovanie/stoika-rospark-standart-exit.md',
];

const descriptions = uniqueDescriptionPaths.map((path) => {
  const description = read(path).match(/^description: "(.+)"$/m)?.[1];
  assert.ok(description, `${path} must have a quoted description`);
  assert.ok(description.length <= 160, `${path} description must not exceed 160 chars`);
  return description;
});

assert.equal(
  new Set(descriptions).size,
  descriptions.length,
  'targeted case/equipment descriptions must be unique',
);

console.log('SEO Recovery & Growth Sprint V1 source regressions passed');
