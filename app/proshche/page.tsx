import type { Metadata } from 'next';
import Image from 'next/image';

import { canonicalUrl } from '@/app/config/site-url';
import { ObjectScenarios } from './ObjectScenarios';

export const metadata: Metadata = {
  title: 'РОСПАРК — с нами проще',
  description:
    'Простое объяснение парковочной системы под ключ: въезд, оплата, выезд, оборудование, программное обеспечение и поддержка.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: canonicalUrl('/proshche'),
  },
  openGraph: {
    title: 'РОСПАРК — с нами проще',
    description:
      'Въезд, оплата и выезд в одной парковочной системе. Посмотрите понятный сценарий и подберите решение для своего объекта.',
    url: canonicalUrl('/proshche'),
    type: 'website',
    images: [
      {
        url: '/images/landing/proshche/premium-terminals.webp',
        width: 1440,
        height: 1788,
        alt: 'Въездная и выездная стойки РОСПАРК',
      },
    ],
  },
};

const assetRoot = '/images/landing/proshche';
const quizUrl = '/quiz?source=landing-proshche-v1';

const projects = [
  {
    name: 'Мосфильм',
    type: 'Режимный объект',
    result: 'Спецтранспорт, гостевые потоки и контроль доступа',
    image: `${assetRoot}/cases/mosfilm.avif`,
    href: '/keysy/mosflim',
  },
  {
    name: 'Poklonka Place',
    type: 'Бизнес-центр класса А',
    result: 'Зонирование, квоты арендаторов и бесконтактный доступ',
    image: `${assetRoot}/cases/poklonka.avif`,
    href: '/keysy/poklonka-place',
  },
  {
    name: 'Депо. Три вокзала',
    type: 'Фудмолл',
    result: 'Высокий трафик без очередей в часы пик',
    image: `${assetRoot}/cases/depo.avif`,
    href: '/keysy/depo3vokzala',
  },
  {
    name: 'Дом Чкалов',
    type: 'Комплекс апартаментов',
    result: 'Доступ резидентов и разделение с торговой галереей',
    image: `${assetRoot}/cases/dom-chkalov.avif`,
    href: '/keysy/chkalovskaya',
  },
  {
    name: 'EUROSPAR',
    type: 'Сетевая розница',
    result: 'Интеграция с приложением, QR и оплата на выезде',
    image: `${assetRoot}/cases/eurospar.webp`,
    href: '/keysy/spar-dnepropetrovskaya',
  },
];

function ArrowMark() {
  return (
    <span className="arrow-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export default function ProshchePage() {
  return (
    <main id="main-content" className="proshche-landing">
      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>Производим с 2010 года</span>
            <span>350+ объектов</span>
          </div>
          <h1>
            <Image
              className="hero-logo"
              src={`${assetRoot}/rospark-logo-white.svg`}
              alt="РОСПАРК"
              width={690}
              height={104}
              unoptimized
              priority
            />
            <span>С нами проще!</span>
          </h1>
          <p className="hero-lead">
            Нужно организовать парковку? Оборудование, программа и запуск — в
            одних руках.
          </p>
          <div className="hero-actions">
            <a className="button" href={quizUrl}>
              Получить решение
              <span aria-hidden="true">↗</span>
            </a>
            <a className="text-link" href="#how">
              Как это работает ↓
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src={`${assetRoot}/premium-terminals.webp`}
            alt="Въездная и выездная стойки РОСПАРК"
            fill
            sizes="(max-width: 920px) 100vw, 46vw"
            unoptimized
            priority
          />
          <div className="hero-product-label">
            <span>Новая линейка</span>
            <strong>РОСПАРК Премиум</strong>
          </div>
        </div>
      </section>

      <div className="ticker" aria-label="Преимущества РОСПАРК">
        <div>
          <span>Своё производство</span>
          <i>◆</i>
          <span>Свой программный комплекс</span>
          <i>◆</i>
          <span>Проектирование и монтаж</span>
          <i>◆</i>
          <span>Поддержка после запуска</span>
        </div>
      </div>

      <section className="process section" id="how">
        <div className="section-heading">
          <span className="section-number">01 / 05</span>
          <h2>
            Въезд.
            <br />
            Оплата.
            <br />
            Выезд.
          </h2>
          <p>
            Один понятный путь для водителя. Одна система управления для вас.
          </p>
        </div>
        <figure className="wide-figure">
          <Image
            src={`${assetRoot}/entry-payment-exit.webp`}
            alt="Сценарий РОСПАРК: въезд по номеру, оплата и автоматический выезд"
            width={1896}
            height={829}
            sizes="(max-width: 640px) 720px, 100vw"
            unoptimized
          />
          <figcaption aria-label="Камера видит номер, затем клиент оплачивает, после чего шлагбаум открывается">
            <span className="flow-step">Камера видит номер</span>
            <span className="flow-arrow" aria-hidden="true">
              →
            </span>
            <span className="flow-step">Клиент оплачивает</span>
            <span className="flow-arrow" aria-hidden="true">
              →
            </span>
            <span className="flow-step">Шлагбаум открывается</span>
          </figcaption>
        </figure>
      </section>

      <section className="scenarios section dark-section">
        <div className="section-heading compact">
          <span className="section-number">02 / 05</span>
          <h2>Гости. Скидки. Любые сценарии.</h2>
        </div>
        <figure className="scenario-figure">
          <Image
            src={`${assetRoot}/scenarios.webp`}
            alt="Сценарии для разовых, постоянных и гостевых клиентов"
            width={1896}
            height={829}
            sizes="100vw"
            unoptimized
          />
        </figure>
        <div className="scenario-tags">
          <span>По госномеру</span>
          <span>По карте</span>
          <span>QR-приглашения</span>
          <span>Скидки по чеку</span>
          <span>Гости и арендаторы</span>
          <span>Онлайн-оплата</span>
        </div>
      </section>

      <ObjectScenarios />

      <section className="one-system section">
        <div className="section-heading">
          <span className="section-number">03 / 05</span>
          <h2>
            Всё связано.
            <br />
            Всё под контролем.
          </h2>
          <p>
            Оборудование, оплата, доступ и отчётность работают как единая
            система.
          </p>
        </div>
        <Image
          className="control-image"
          src={`${assetRoot}/unified-control.webp`}
          alt="Единое управление оборудованием, оплатой, доступом и отчётностью"
          width={1896}
          height={829}
          sizes="100vw"
          unoptimized
        />
      </section>

      <section className="projects-section section">
        <div className="section-heading">
          <span className="section-number">04 / 05</span>
          <h2>
            Это уже
            <br />
            работает.
          </h2>
          <p>
            Реальные объекты. Разные задачи. Системы РОСПАРК в ежедневной
            эксплуатации.
          </p>
        </div>
        <div className="projects-grid">
          {projects.map((project, index) => (
            <a className="project-card" href={project.href} key={project.name}>
              <Image
                src={project.image}
                alt={`Проект РОСПАРК — ${project.name}`}
                fill
                sizes={index === 0 ? '100vw' : '(max-width: 640px) 100vw, 50vw'}
                unoptimized
              />
              <span className="project-shade" />
              <span className="project-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="project-info">
                <small>{project.type}</small>
                <strong>{project.name}</strong>
                <span>{project.result}</span>
              </span>
              <span className="project-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
        <a className="projects-link" href="/keysy">
          Смотреть все выполненные проекты
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="made-here section dark-section">
        <div className="made-copy">
          <span className="section-number">05 / 05</span>
          <h2>
            Сделано
            <br />
            в РОСПАРК.
          </h2>
          <div className="proof-grid">
            <div>
              <strong>2010</strong>
              <span>работаем с парковками</span>
            </div>
            <div>
              <strong>350+</strong>
              <span>реализованных объектов</span>
            </div>
            <div>
              <strong>Свои</strong>
              <span>оборудование и ПО</span>
            </div>
          </div>
        </div>
        <div className="media-card">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={`${assetRoot}/payment-terminal.webp`}
            aria-label="Оплата на терминале РОСПАРК"
          >
            <source src={`${assetRoot}/payment-demo.mp4`} type="video/mp4" />
          </video>
          <span>Оборудование + ПО + запуск</span>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-symbol">
          <ArrowMark />
        </div>
        <p>Задач много.</p>
        <h2>
          Решение одно —
          <br />
          РОСПАРК
        </h2>
        <a className="button button-light" href={quizUrl}>
          Рассчитать мой проект
          <span aria-hidden="true">↗</span>
        </a>
        <div className="final-meta">
          <a href="tel:+74993212040">+7 (499) 321-20-40</a>
          <span>Свяжемся в течение одного рабочего часа</span>
        </div>
      </section>
    </main>
  );
}
