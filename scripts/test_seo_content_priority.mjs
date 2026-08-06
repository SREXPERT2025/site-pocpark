import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');

const homePage = read('app/(narrow)/page.tsx');
const homeHero = read('app/components/landing/Hero.tsx');
const solutions = read('app/(narrow)/resheniya/page.tsx');
const equipment = read('app/(narrow)/oborudovanie/page.tsx');

assert.match(homePage, /Автоматизация парковок и контроль въезда/);
assert.match(homeHero, /РОСПАРК автоматизирует въезд, доступ, оплату и контроль парковки/);
assert.match(homeHero, /href="\/resheniya"/);
assert.match(homeHero, /href="\/oborudovanie"/);
assert.doesNotMatch(homePage, /title: '.*парковка под ключ/i);

assert.match(solutions, /Автоматизированные парковочные системы для разных объектов/);
assert.match(solutions, /Автоматизированная парковочная система под задачу объекта/);
assert.match(solutions, /href="\/parkovka-pod-klyuch"/);

assert.match(equipment, /оборудование РОСПАРК для платной и закрытой парковки/i);
assert.match(equipment, /href="\/oborudovanie\/shlagbaumy"/);
assert.match(equipment, /href="\/oborudovanie\/stoika-rospark-standart-enter"/);
assert.match(equipment, /href="\/oborudovanie\/stoika-rospark-standart-exit"/);
assert.match(equipment, /href="\/oborudovanie\/terminal-oplati-rospark-standart"/);

console.log('SEO content priority checks passed');
