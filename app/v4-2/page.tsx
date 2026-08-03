'use client';

import Image from 'next/image';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

const problems = [
  {
    number: '01',
    title: 'Закрыть въезд для посторонних',
    text: 'Шлагбаум пропускает только разрешённые автомобили.',
  },
  {
    number: '02',
    title: 'Открывать по номеру машины',
    text: 'Камера узнаёт автомобиль без ручной проверки пропуска.',
  },
  {
    number: '03',
    title: 'Убрать ручные пропуска',
    text: 'Сотрудники и гости въезжают по понятным правилам.',
  },
  {
    number: '04',
    title: 'Принимать оплату',
    text: 'Подберём оплату онлайн, в терминале или при выезде.',
  },
  {
    number: '05',
    title: 'Обойтись без билетов',
    text: 'Номер автомобиля может стать идентификатором визита.',
  },
  {
    number: '06',
    title: 'Заменить старую систему',
    text: 'Проверим, что можно сохранить и что действительно нужно обновить.',
  },
];

const changes = [
  ['Охрана проверяет машины вручную', 'Система определяет автомобиль'],
  ['Пропуска теряются и передаются другим', 'Доступ работает по заданным правилам'],
  ['На въезде образуется очередь', 'Разрешённый автомобиль проезжает быстрее'],
  ['Оплату приходится проверять отдельно', 'Оплата связана с разрешением на выезд'],
  ['Нет полной картины по парковке', 'Проезды и события видны ответственному'],
];

const journeySteps = [
  {
    number: '01',
    label: 'Подъезд',
    title: 'Автомобиль подъезжает',
    text: 'Водитель видит понятный въезд и не ищет охранника.',
    image: '/images/landing/v4-1/hero-object.webp',
    status: 'Автомобиль у въезда',
  },
  {
    number: '02',
    label: 'Определение',
    title: 'Система понимает, кто приехал',
    text: 'Камера, билет или карта определяют визит — по правилам объекта.',
    image: '/images/landing/v4-1/journey-detect.webp',
    status: 'Автомобиль определён',
  },
  {
    number: '03',
    label: 'Проезд',
    title: 'Шлагбаум открывается',
    text: 'Разрешённый автомобиль проезжает без ручной сверки списков.',
    image: '/images/landing/v4-1/journey-open.webp',
    status: 'Доступ разрешён',
  },
  {
    number: '04',
    label: 'Оплата',
    title: 'Оплата — когда она нужна',
    text: 'Онлайн, в терминале или при выезде — под выбранный сценарий.',
    image: '/images/landing/v4-1/journey-pay.webp',
    status: 'Оплата подтверждена',
  },
  {
    number: '05',
    label: 'Контроль',
    title: 'Владелец видит события',
    text: 'Проезды и данные для контроля собраны в одном месте.',
    image: '/images/landing/v4-1/journey-control.webp',
    status: 'Событие сохранено',
  },
];

const objectSolutions = [
  {
    id: 'zhk',
    tab: 'ЖК',
    eyebrow: 'ЖК и управляющие компании',
    title: 'Жители въезжают свободно. Гости — по правилам.',
    text: 'Разделяем постоянный и гостевой доступ, помогаем убрать ручные списки и контролировать посторонние автомобили.',
    features: ['Въезд по номеру', 'Гостевые заявки', 'История проездов'],
    image: '/images/landing/v4-1/object-zhk.webp',
  },
  {
    id: 'bc',
    tab: 'Бизнес-центр',
    eyebrow: 'Бизнес-центры',
    title: 'Один въезд — разные правила для арендаторов и гостей.',
    text: 'Настраиваем доступ организаций, лимиты, гостевые визиты и отчётность для управляющей компании.',
    features: ['Доступ арендаторов', 'Лимиты организаций', 'Гостевой проезд'],
    image: '/images/landing/v4-1/object-bc.webp',
  },
  {
    id: 'retail',
    tab: 'Торговый объект',
    eyebrow: 'Магазины и торговые центры',
    title: 'Посетителю легко въехать, оплатить и выехать.',
    text: 'Подбираем сценарий для потока разовых клиентов, оплаты и бесплатного времени по правилам объекта.',
    features: ['Разовые посетители', 'Оплата парковки', 'Скидки и льготное время'],
    image: '/images/landing/v4-1/object-retail.webp',
  },
  {
    id: 'enterprise',
    tab: 'Предприятие',
    eyebrow: 'Предприятия',
    title: 'Сотрудники и транспорт проезжают по заданным правилам.',
    text: 'Организуем доступ по спискам, времени и категориям транспорта, сохраняя историю въездов и выездов.',
    features: ['Списки сотрудников', 'Доступ по времени', 'Контроль транспорта'],
    image: '/images/landing/v4-1/object-enterprise.webp',
  },
];

const cases = [
  {
    type: 'Бизнес-центр класса А',
    name: 'Poklonka Place',
    task: 'Зонирование, квоты арендаторов и бесконтактный доступ.',
    image: '/images/landing/proshche/cases/poklonka.avif',
  },
  {
    type: 'Комплекс апартаментов',
    name: 'Дом Чкалов',
    task: 'Доступ резидентов и разделение с торговой галереей.',
    image: '/images/landing/proshche/cases/dom-chkalov.avif',
  },
  {
    type: 'Сетевая розница',
    name: 'EUROSPAR',
    task: 'Интеграция с приложением, QR и оплата на выезде.',
    image: '/images/landing/proshche/cases/eurospar.webp',
  },
];

const faq = [
  [
    'Можно начать только со шлагбаума?',
    'Да. Состав решения зависит от задачи. Сначала можно закрыть въезд, а дополнительные возможности предусмотреть на следующих этапах.',
  ],
  [
    'Обязательно использовать парковочные билеты?',
    'Нет. В зависимости от объекта проезд можно организовать по номеру автомобиля, карте, билету или другому подходящему идентификатору.',
  ],
  [
    'Нужно менять всю старую систему?',
    'Не всегда. Сначала специалисты проверяют существующее оборудование и определяют, что можно сохранить, интегрировать или заменить.',
  ],
  [
    'Можно сделать парковку без постоянного оператора?',
    'Многие действия можно автоматизировать. Конкретный состав автоматики и порядок поддержки зависят от правил и условий объекта.',
  ],
  [
    'От чего зависит стоимость?',
    'От количества проездов, способов доступа и оплаты, существующего оборудования, интеграций и работ на объекте. Не обязательно устанавливать всё сразу.',
  ],
  [
    'Что произойдёт после заявки?',
    'Менеджер уточнит задачу и исходные данные, после чего предложит подходящий вариант дальнейшей проработки проекта.',
  ],
];

export default function V42Page() {
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [objectIndex, setObjectIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAllProblems, setShowAllProblems] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const journey = journeySteps[journeyIndex];
  const solution = objectSolutions[objectIndex];

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => {
      modalRef.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    });

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setModalOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [modalOpen]);

  function openConsultation(task = '') {
    openerRef.current = document.activeElement as HTMLElement | null;
    if (task) setSelectedTask(task);
    setSubmitted(false);
    setModalOpen(true);
  }

  function chooseObject(index: number) {
    setObjectIndex(index);
  }

  function discussObject() {
    openConsultation(`Нужно решение для объекта: ${solution.tab}`);
  }

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !modalRef.current) return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <main id="main-content" className="v42">
      <section className="v42-hero" aria-labelledby="v42-title">
        <Image
          className="v42-hero-image"
          src="/images/landing/v4-1/hero-object.webp"
          alt="Автомобиль подъезжает к автоматизированному въезду бизнес-центра"
          fill
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="v42-hero-shade" />
        <div className="v42-shell v42-masthead">
          <a href="/" aria-label="РОСПАРК — на главную">
            РОСПАРК
          </a>
          <a href="tel:+74993212040">+7 (499) 321-20-40</a>
          <button type="button" onClick={() => openConsultation()}>
            Рассчитать парковку
          </button>
        </div>
        <div className="v42-shell v42-hero-grid">
          <div className="v42-hero-copy">
            <p className="v42-eyebrow">
              Шлагбаумы · въезд по номеру · билеты · оплата
            </p>
            <h1 id="v42-title">
              Решим вашу задачу
              <span>с въездом и парковкой</span>
            </h1>
            <p className="v42-lead">
              Подберём решение для вашего объекта — от простого шлагбаума до
              автоматического въезда, оплаты и контроля.
            </p>
            <button
              className="v42-cta v42-cta-light"
              type="button"
              onClick={() => openConsultation()}
            >
              Рассчитать парковку
              <span aria-hidden="true">↗</span>
            </button>
            <p className="v42-cta-note">
              Не нужно техническое задание. Достаточно рассказать, что сейчас
              не устраивает.
            </p>
          </div>

          <div className="v42-live-card" aria-label="Пример работы въезда">
            <div className="v42-live-top">
              <span className="v42-live-dot" />
              <span>Въезд контролируется</span>
              <small>10:42</small>
            </div>
            <div className="v42-plate">А 123 ВС 77</div>
            <div className="v42-live-result">
              <span>Автомобиль распознан</span>
              <strong>Доступ разрешён</strong>
            </div>
            <div className="v42-barrier" aria-hidden="true">
              <i />
              <b />
            </div>
          </div>
        </div>
        <div className="v42-shell v42-proof">
          <span>С 2010 года</span>
          <i />
          <span>350+ объектов</span>
          <i />
          <span>Собственная разработка и производство</span>
        </div>
      </section>

      <section className="v42-problems" aria-labelledby="v42-problems-title">
        <div className="v42-shell">
          <header className="v42-heading">
            <p className="v42-eyebrow v42-eyebrow-blue">
              Начнём с вашей ситуации
            </p>
            <h2 id="v42-problems-title">Что нужно изменить на парковке?</h2>
            <p>
              Выберите ближайшую задачу. Менеджер уточнит детали и поможет
              подобрать вариант.
            </p>
          </header>
          <div
            className={`v42-problem-grid ${showAllProblems ? 'show-all' : ''}`}
          >
            {problems.map((problem, index) => (
              <button
                type="button"
                className={index > 3 ? 'v42-problem-extra' : ''}
                key={problem.number}
                onClick={() => openConsultation(problem.title)}
              >
                <span>{problem.number}</span>
                <h3>{problem.title}</h3>
                <p>{problem.text}</p>
                <strong>Это моя задача →</strong>
              </button>
            ))}
          </div>
          <button
            className="v42-more-problems"
            type="button"
            aria-expanded={showAllProblems}
            onClick={() => setShowAllProblems((value) => !value)}
          >
            {showAllProblems ? 'Скрыть дополнительные задачи' : 'Другие задачи'}
          </button>
        </div>
      </section>

      <section className="v42-options" aria-labelledby="v42-options-title">
        <div className="v42-shell v42-options-grid">
          <header className="v42-heading v42-heading-dark">
            <p className="v42-eyebrow">Варианты под задачу и бюджет</p>
            <h2 id="v42-options-title">
              Сначала — не оборудование. <em>Сначала — задача.</em>
            </h2>
            <p>
              Не заставляем вас выбирать камеры, стойки и терминалы. Сначала
              определяем, что должно измениться на объекте.
            </p>
          </header>
          <div className="v42-option-cards">
            <article>
              <span>01</span>
              <h3>Решить главную проблему</h3>
              <p>
                Начать с необходимого: например, закрыть въезд или открывать
                шлагбаум по номеру.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Сделать удобнее</h3>
              <p>
                Добавить правила для гостей, оплату и понятный контроль для
                ответственного сотрудника.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Предусмотреть развитие</h3>
              <p>
                Заложить возможность подключить новые проезды, камеры и
                сценарии позднее.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="v42-changes" aria-labelledby="v42-changes-title">
        <div className="v42-shell">
          <header className="v42-heading">
            <p className="v42-eyebrow v42-eyebrow-blue">
              Знакомая ситуация?
            </p>
            <h2 id="v42-changes-title">
              Что меняется <em>после автоматизации</em>
            </h2>
          </header>
          <div className="v42-change-list">
            {changes.map(([before, after], index) => (
              <article key={before}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{before}</p>
                <b aria-hidden="true">→</b>
                <strong>{after}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v42-journey" aria-labelledby="v42-journey-title">
        <div className="v42-shell">
          <header className="v42-heading v42-heading-dark">
            <p className="v42-eyebrow">Один понятный путь</p>
            <h2 id="v42-journey-title">
              Водителю всё понятно. <em>Владельцу всё видно.</em>
            </h2>
          </header>
          <div className="v42-journey-stage">
            <figure>
              <Image
                key={journey.image}
                src={journey.image}
                alt={journey.title}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                unoptimized
              />
              <figcaption>
                <span className="v42-live-dot" />
                {journey.status}
              </figcaption>
            </figure>
            <div className="v42-journey-copy" aria-live="polite">
              <span>{journey.number}</span>
              <p>{journey.label}</p>
              <h3>{journey.title}</h3>
              <div>{journey.text}</div>
            </div>
          </div>
          <div className="v42-journey-tabs" role="tablist">
            {journeySteps.map((step, index) => (
              <button
                key={step.number}
                className={index === journeyIndex ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={index === journeyIndex}
                onClick={() => setJourneyIndex(index)}
              >
                <span>{step.number}</span>
                {step.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="v42-objects" aria-labelledby="v42-objects-title">
        <div className="v42-shell">
          <header className="v42-heading">
            <p className="v42-eyebrow v42-eyebrow-blue">
              Решение зависит от объекта
            </p>
            <h2 id="v42-objects-title">
              Узнаём вашу задачу — <em>подбираем нужный сценарий</em>
            </h2>
          </header>
          <div className="v42-object-tabs" role="tablist">
            {objectSolutions.map((item, index) => (
              <button
                key={item.id}
                className={index === objectIndex ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={index === objectIndex}
                onClick={() => chooseObject(index)}
              >
                {item.tab}
              </button>
            ))}
          </div>
          <article className="v42-object-card">
            <figure>
              <Image
                key={solution.image}
                src={solution.image}
                alt={solution.eyebrow}
                fill
                sizes="(max-width: 900px) 100vw, 53vw"
                unoptimized
              />
            </figure>
            <div>
              <p className="v42-eyebrow v42-eyebrow-blue">
                {solution.eyebrow}
              </p>
              <h3>{solution.title}</h3>
              <p>{solution.text}</p>
              <ul>
                {solution.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className="v42-cta v42-cta-blue"
                type="button"
                onClick={discussObject}
              >
                Обсудить такой объект
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="v42-cases" aria-labelledby="v42-cases-title">
        <div className="v42-shell">
          <header className="v42-heading v42-heading-dark">
            <p className="v42-eyebrow">Это уже работает</p>
            <h2 id="v42-cases-title">Реальные проекты РОСПАРК</h2>
          </header>
          <div className="v42-case-grid">
            {cases.map((item) => (
              <article key={item.name}>
                <figure>
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                    unoptimized
                  />
                </figure>
                <div>
                  <span>{item.type}</span>
                  <h3>{item.name}</h3>
                  <p>{item.task}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v42-process" aria-labelledby="v42-process-title">
        <div className="v42-shell">
          <header className="v42-heading">
            <p className="v42-eyebrow v42-eyebrow-blue">Как работаем</p>
            <h2 id="v42-process-title">
              От вашей задачи <em>до работающего въезда</em>
            </h2>
          </header>
          <ol>
            <li>
              <span>01</span>
              <h3>Разбираем задачу</h3>
              <p>Уточняем объект, пользователей и правила проезда.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Предлагаем вариант</h3>
              <p>Показываем состав решения без лишнего оборудования.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Производим и устанавливаем</h3>
              <p>Готовим оборудование, программу и работы на объекте.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Запускаем и поддерживаем</h3>
              <p>Проверяем сценарии, обучаем сотрудников и сопровождаем.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="v42-faq" aria-labelledby="v42-faq-title">
        <div className="v42-shell v42-faq-grid">
          <header className="v42-heading">
            <p className="v42-eyebrow v42-eyebrow-blue">
              До разговора с менеджером
            </p>
            <h2 id="v42-faq-title">Коротко о главном</h2>
            <p>
              Стоимость и состав системы зависят от объекта. Не обязательно
              устанавливать всё сразу.
            </p>
          </header>
          <div className="v42-faq-list">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="v42-finale" aria-label="Следующий шаг">
        <div className="v42-shell">
          <p>Начните с задачи, а не с оборудования</p>
          <h2>Расскажите о парковке — предложим подходящий вариант</h2>
          <button
            className="v42-cta v42-cta-light"
            type="button"
            onClick={() => openConsultation()}
          >
            Рассчитать парковку
            <span aria-hidden="true">↗</span>
          </button>
          <small>Или позвоните: +7 (499) 321-20-40</small>
        </div>
      </section>

      <button
        className="v42-mobile-cta"
        type="button"
        onClick={() => openConsultation()}
      >
        Рассчитать парковку
      </button>

      {modalOpen ? (
        <div
          className="v42-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="v42-form-title"
          ref={modalRef}
          onKeyDown={trapFocus}
        >
          <button
            className="v42-modal-backdrop"
            type="button"
            aria-label="Закрыть форму"
            onClick={() => setModalOpen(false)}
          />
          <div className="v42-modal-card">
            <button
              className="v42-modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            {submitted ? (
              <div className="v42-form-success">
                <span>✓</span>
                <p className="v42-eyebrow v42-eyebrow-blue">
                  Предпросмотр формы
                </p>
                <h2>Данные никуда не отправлены</h2>
                <p>
                  Это безопасная тестовая версия. После согласования форму
                  можно подключить к рабочему реестру лидов.
                </p>
                <button
                  className="v42-cta v42-cta-blue"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Понятно
                </button>
              </div>
            ) : (
              <>
                <p className="v42-eyebrow v42-eyebrow-blue">
                  Консультация по объекту
                </p>
                <h2 id="v42-form-title">
                  Расскажите о парковке — предложим вариант
                </h2>
                <p className="v42-form-intro">
                  Не нужно составлять техническое задание. Опишите задачу
                  своими словами.
                </p>
                <form onSubmit={submitPreview}>
                  <div className="v42-form-row">
                    <label>
                      Как к вам обращаться?
                      <input name="name" placeholder="Имя" required />
                    </label>
                    <label>
                      Телефон
                      <input
                        name="phone"
                        type="tel"
                        placeholder="+7 999 000-00-00"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Какой у вас объект?
                    <select name="object" defaultValue={solution.tab} required>
                      <option>ЖК</option>
                      <option>Бизнес-центр</option>
                      <option>Торговый объект</option>
                      <option>Предприятие</option>
                      <option>Другое</option>
                    </select>
                  </label>
                  <label>
                    Что нужно изменить?
                    <textarea
                      name="task"
                      rows={3}
                      value={selectedTask}
                      onChange={(event) => setSelectedTask(event.target.value)}
                      placeholder="Например: закрыть въезд для посторонних"
                      required
                    />
                  </label>
                  <label className="v42-consent">
                    <input name="consent" type="checkbox" required />
                    <span>
                      Согласен на обработку данных для ответа на обращение
                    </span>
                  </label>
                  <button
                    className="v42-cta v42-cta-blue v42-form-submit"
                    type="submit"
                  >
                    Рассчитать парковку
                    <span aria-hidden="true">↗</span>
                  </button>
                  <small>
                    Тестовый предпросмотр: данные не отправляются и не
                    сохраняются.
                  </small>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
