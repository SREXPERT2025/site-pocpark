import type { Metadata } from 'next';
import Image from 'next/image';

import { canonicalUrl } from '@/app/config/site-url';
import { PuzzlePreviewForm } from './PuzzlePreviewForm';

export const metadata: Metadata = {
  title: 'Подбор парковочной системы под объект',
  description:
    'Поможем определить состав парковочной системы под ваш объект: въезд, выезд, оплата, распознавание номеров, программное обеспечение, монтаж и поддержка.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: canonicalUrl('/puzzle'),
  },
  openGraph: {
    title: 'Парковка не должна быть сложным пазлом — РОСПАРК',
    description:
      'Начните с задачи объекта. РОСПАРК подберёт оборудование, программное обеспечение и сценарий работы парковки.',
    url: canonicalUrl('/puzzle'),
    type: 'website',
    images: [
      {
        url: '/images/landing/puzzle/puzzle-hero.webp',
        width: 2048,
        height: 1152,
        alt: 'Оборудование РОСПАРК как части единой парковочной системы',
      },
    ],
  },
};

const assetRoot = '/images/landing/puzzle';
const previewFormUrl = '#preview-form';

const puzzlePieces = [
  {
    number: '01',
    title: 'Кто въезжает',
    text: 'Разовые посетители, сотрудники, арендаторы, гости или резиденты.',
  },
  {
    number: '02',
    title: 'Как идентифицируем',
    text: 'Госномер, карта, билет, QR-приглашение или собственный идентификатор.',
  },
  {
    number: '03',
    title: 'Как оплачивают',
    text: 'Онлайн, на выезде, в кассовом терминале или по правилам объекта.',
  },
  {
    number: '04',
    title: 'Кто управляет',
    text: 'Оператор, служба безопасности, арендаторы или управляющая компания.',
  },
];

const scenarios = [
  {
    tag: 'Контроль доступа',
    title: 'Закрытая парковка',
    text: 'Постоянные пользователи, гости, расписания и ограничения без обязательной оплаты.',
    links: [
      { label: 'Постоянные клиенты', href: '/vozmozhnosti/postoyannie-klienti' },
      { label: 'Гостевой доступ', href: '/stati/gostevoy-dostup-na-parkovku' },
    ],
  },
  {
    tag: 'Коммерческий сценарий',
    title: 'Платная парковка',
    text: 'Тарифы, распознавание номеров, несколько способов оплаты и контроль выезда.',
    links: [
      { label: 'Оплата парковки', href: '/vozmozhnosti/onlain-oplata' },
      { label: 'Демо оплаты', href: '/demo/web-skidki' },
    ],
  },
  {
    tag: 'Смешанный поток',
    title: 'Парковка для объекта',
    text: 'Посетители, арендаторы, сотрудники и спецтранспорт работают по разным правилам в одной системе.',
    links: [
      { label: 'Решения по объектам', href: '/resheniya' },
      { label: 'Выполненные проекты', href: '/keysy' },
    ],
  },
];

const deliverySteps = [
  ['Разбираем задачу', 'Фиксируем потоки, правила доступа, оплату и ограничения объекта.'],
  ['Собираем схему', 'Определяем сценарий, состав оборудования, ПО и точки интеграции.'],
  ['Производим и запускаем', 'Поставляем оборудование, выполняем монтаж и настройку системы.'],
  ['Остаёмся на связи', 'Поддерживаем систему после запуска и развиваем её вместе с объектом.'],
];

const proofProjects = [
  {
    title: 'Poklonka Place',
    subtitle: 'Арендаторы, гости и квоты',
    image: '/images/landing/proshche/cases/poklonka.avif',
    href: '/keysy/poklonka-place',
  },
  {
    title: 'Дом Чкалов',
    subtitle: 'Резиденты и торговая галерея',
    image: '/images/landing/proshche/cases/dom-chkalov.avif',
    href: '/keysy/chkalovskaya',
  },
  {
    title: 'EUROSPAR',
    subtitle: 'QR, приложение и оплата',
    image: '/images/landing/proshche/cases/eurospar.webp',
    href: '/keysy/spar-dnepropetrovskaya',
  },
];

const faq = [
  {
    question: 'Нужно ли заранее знать, какое оборудование покупать?',
    answer:
      'Нет. Для начала достаточно описать объект, пользователей и задачу. Состав оборудования определяется после разбора сценария и условий площадки.',
  },
  {
    question: 'Можно ли объединить постоянных, разовых и гостевых клиентов?',
    answer:
      'Да. Для разных групп задаются свои способы идентификации, права доступа, тарифы, лимиты и расписания в рамках одной системы.',
  },
  {
    question: 'РОСПАРК производит оборудование самостоятельно?',
    answer:
      'Да. РОСПАРК разрабатывает и производит оборудование и программное обеспечение, а также выполняет проектирование, монтаж и поддержку.',
  },
  {
    question: 'Можно ли интегрироваться с действующими системами объекта?',
    answer:
      'Возможность и состав интеграции определяются после технической оценки. На проектах могут потребоваться связи со СКУД, приложением, платёжными и учётными системами.',
  },
];

function PuzzleIcon() {
  return (
    <span className="puzzle-icon" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function PuzzlePage() {
  return (
    <main id="main-content" className="puzzle-landing">
      <section className="puzzle-hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">Парковочная система под ключ</span>
            <h1>
              Соберём парковочную систему
              {' '}
              <em>под задачи вашего объекта.</em>
            </h1>
            <p>
              Не нужно самостоятельно выбирать модели стоек, шлагбаумов и
              терминалов. Сначала определим пользователей и правила работы,
              затем предложим предварительный состав системы.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href={previewFormUrl}>
                Собрать решение под объект
                <span aria-hidden="true">↗</span>
              </a>
              <a className="secondary-link" href="#problem">
                Посмотреть схему ↓
              </a>
            </div>
            <div className="hero-proof">
              <span>
                <strong>350+</strong>
                объектов
              </span>
              <span>
                <strong>с 2010</strong>
                в парковках
              </span>
              <span>
                <strong>свои</strong>
                оборудование и ПО
              </span>
            </div>
          </div>

          <figure className="hero-art">
            <Image
              src={`${assetRoot}/puzzle-hero.webp`}
              alt="Въездная стойка, кассовый терминал и выездная стойка РОСПАРК объединены в одну систему"
              fill
              sizes="(max-width: 900px) 100vw, 52vw"
              priority
              unoptimized
            />
            <figcaption>
              <PuzzleIcon />
              <span>
                <small>Одна система</small>
                <strong>Въезд · оплата · выезд</strong>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="problem-section section" id="problem">
        <div className="split-heading">
          <span className="section-label">01 — С чего начать</span>
          <h2>
            Сначала — не оборудование.
            <br />
            Сначала — задача.
          </h2>
          <p>
            Ошибка — выбирать отдельные устройства, пока не определён сценарий
            всей парковки. Мы начинаем с четырёх вопросов.
          </p>
        </div>
        <div className="pieces-grid">
          {puzzlePieces.map((piece) => (
            <article className="piece-card" key={piece.number}>
              <span>{piece.number}</span>
              <PuzzleIcon />
              <h3>{piece.title}</h3>
              <p>{piece.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="solution-section" id="solution">
        <div className="solution-image">
          <Image
            src={`${assetRoot}/system-route.webp`}
            alt="Световой маршрут между въездной стойкой, оплатой и выездной стойкой РОСПАРК"
            fill
            sizes="100vw"
            unoptimized
          />
          <span className="image-shade" />
        </div>
        <div className="solution-copy">
          <span className="section-label">02 — Цельная система</span>
          <h2>Все части работают вместе.</h2>
          <p>
            Оборудование распознаёт пользователя. Программа применяет правила.
            Оплата связывается с визитом. Выезд открывается только тогда, когда
            условия выполнены.
          </p>
          <div className="system-parts" aria-label="Состав системы">
            <span>Въезд</span>
            <i aria-hidden="true">+</i>
            <span>Доступ</span>
            <i aria-hidden="true">+</i>
            <span>Оплата</span>
            <i aria-hidden="true">+</i>
            <span>Выезд</span>
            <i aria-hidden="true">+</i>
            <span>Управление</span>
          </div>
          <a className="outline-button" href={previewFormUrl}>
            Описать мою задачу
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="scenario-section section" id="scenarios">
        <div className="center-heading">
          <span className="section-label">03 — Сценарии</span>
          <h2>Какой пазл собираем для вас?</h2>
          <p>
            Не готовая коробка для всех, а сценарий под пользователей и правила
            конкретного объекта.
          </p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <article className="scenario-card" key={scenario.title}>
              <span className="scenario-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <small>{scenario.tag}</small>
              <h3>{scenario.title}</h3>
              <p>{scenario.text}</p>
              <div>
                {scenario.links.map((link) => (
                  <a href={link.href} key={link.href}>
                    {link.label} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="delivery-section section">
        <div className="delivery-art">
          <Image
            src={`${assetRoot}/entry-station.webp`}
            alt="Въездная стойка РОСПАРК на объекте"
            fill
            sizes="(max-width: 800px) 100vw, 46vw"
            unoptimized
          />
        </div>
        <div className="delivery-copy">
          <span className="section-label">04 — От задачи до запуска</span>
          <h2>Собираем не картинку. Собираем работающую парковку.</h2>
          <ol>
            {deliverySteps.map(([title, text], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="equipment-section section" id="equipment">
        <div className="equipment-heading">
          <span className="section-label">05 — Собственное оборудование</span>
          <h2>Части системы, за которые мы отвечаем.</h2>
          <p>
            Стойки въезда и выезда, кассовые терминалы и программное обеспечение
            разрабатываются как элементы одной архитектуры.
          </p>
        </div>
        <div className="equipment-feature">
          <Image
            src={`${assetRoot}/equipment-line.webp`}
            alt="Линейка оборудования РОСПАРК: въездная стойка, кассовый терминал и выездная стойка"
            width={2048}
            height={1152}
            sizes="100vw"
            style={{ width: '100%', height: 'auto' }}
            unoptimized
          />
        </div>
        <div className="equipment-grid">
          <figure>
            <Image
              src={`${assetRoot}/orange-entry.webp`}
              alt="Въездная стойка РОСПАРК Премиум"
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
            />
            <figcaption>
              <span>01</span>
              <strong>Въезд</strong>
            </figcaption>
          </figure>
          <figure>
            <Image
              src={`${assetRoot}/payment-terminal.webp`}
              alt="Кассовый терминал РОСПАРК Премиум"
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
            />
            <figcaption>
              <span>02</span>
              <strong>Оплата</strong>
            </figcaption>
          </figure>
          <figure>
            <Image
              src={`${assetRoot}/exit-station.webp`}
              alt="Выездная стойка РОСПАРК на объекте"
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
            />
            <figcaption>
              <span>03</span>
              <strong>Выезд</strong>
            </figcaption>
          </figure>
        </div>
        <a className="equipment-link" href="/oborudovanie">
          Посмотреть оборудование РОСПАРК
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="proof-section section">
        <div className="proof-heading">
          <span className="section-label">06 — Это уже работает</span>
          <h2>Разные объекты. Свой сценарий для каждого.</h2>
          <a href="/keysy">Все выполненные проекты ↗</a>
        </div>
        <div className="proof-projects">
          {proofProjects.map((project) => (
            <a href={project.href} key={project.title}>
              <Image
                src={project.image}
                alt={`Проект РОСПАРК — ${project.title}`}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                unoptimized
              />
              <span className="project-overlay" />
              <span className="project-copy">
                <strong>{project.title}</strong>
                <small>{project.subtitle}</small>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="faq-section section">
        <div className="faq-heading">
          <span className="section-label">07 — Частые вопросы</span>
          <h2>Перед тем как начать.</h2>
        </div>
        <div className="faq-list">
          {faq.map((item, index) => (
            <details key={item.question}>
              <summary>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.question}</strong>
                <i aria-hidden="true">+</i>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <PuzzlePreviewForm />

      <section className="puzzle-final">
        <div className="final-copy">
          <span>РОСПАРК · парковочная система под ключ</span>
          <h2>
            Не собирайте
            <br />
            парковку по частям.
          </h2>
          <p>
            Расскажите об объекте — мы поможем сложить въезд, оплату, доступ и
            управление в одну работающую систему.
          </p>
          <a className="primary-button light-button" href={previewFormUrl}>
            Собрать решение с РОСПАРК
            <span aria-hidden="true">↗</span>
          </a>
          <div className="final-contact">
            <a href="tel:+74993212040">+7 (499) 321-20-40</a>
            <span>Свяжемся в течение одного рабочего часа</span>
          </div>
        </div>
        <div className="final-art">
          <Image
            src={`${assetRoot}/puzzle-hero.webp`}
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 48vw"
            unoptimized
          />
        </div>
      </section>
    </main>
  );
}
