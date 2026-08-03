'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';

const assetRoot = '/images/landing/test2';

const problems = [
  {
    number: '01',
    title: 'Закрыть въезд для посторонних',
    text: 'Поставить шлагбаум и пропускать только разрешённые автомобили.',
    task: 'Нужно закрыть въезд для посторонних',
  },
  {
    number: '02',
    title: 'Открывать по номеру машины',
    text: 'Камера узнаёт автомобиль — без ручной проверки пропуска.',
    task: 'Нужен въезд по номеру автомобиля',
  },
  {
    number: '03',
    title: 'Принимать оплату',
    text: 'Организовать оплату онлайн, на выезде или через терминал.',
    task: 'Нужно принимать оплату за парковку',
  },
  {
    number: '04',
    title: 'Убрать ручную проверку',
    text: 'Сократить звонки охране и ежедневную выдачу пропусков.',
    task: 'Нужно сократить ручную работу охраны',
  },
  {
    number: '05',
    title: 'Обойтись без билетов',
    text: 'Рассмотреть проезд по номеру автомобиля или другим способом.',
    task: 'Нужна парковка без парковочных билетов',
  },
  {
    number: '06',
    title: 'Заменить старую систему',
    text: 'Проверить, что можно сохранить, а что лучше обновить.',
    task: 'Нужно обновить существующую парковочную систему',
  },
];

const beforeItems = [
  'Охрана сверяет машины вручную',
  'Пропуска теряются и передаются другим',
  'На въезде возникает очередь',
  'Оплату сложно проверить',
  'Непонятно, кто и когда въезжал',
];

const afterItems = [
  'Разрешённые машины проезжают по правилам',
  'Номер автомобиля может заменить пропуск',
  'Гостей можно оформить заранее',
  'Оплата связана с разрешением на выезд',
  'Информация о проездах сохраняется',
];

const journey = [
  ['01', 'Автомобиль подъезжает'],
  ['02', 'Камера, карта или билет определяет въезд'],
  ['03', 'Шлагбаум открывается'],
  ['04', 'При необходимости клиент оплачивает'],
  ['05', 'Владелец видит проезды и события'],
];

const solutions = [
  {
    label: 'Без пропусков',
    title: 'Въезд по номерам',
    text: 'Для офиса, предприятия, ЖК и других объектов с постоянными посетителями.',
    image: `${assetRoot}/entry-scene.webp`,
    task: 'Интересует въезд по номерам автомобилей',
  },
  {
    label: 'Для разовых гостей',
    title: 'Парковка с билетами',
    text: 'Для торговых центров, гостиниц и платных парковок с большим потоком.',
    image: `${assetRoot}/terminals-pair.webp`,
    task: 'Интересует парковка с билетами',
  },
  {
    label: 'Жители и гости',
    title: 'Парковка для ЖК',
    text: 'Постоянный доступ жителей и понятное оформление гостевого въезда.',
    image: '/images/landing/proshche/object-zastroyschiki.avif',
    task: 'Нужно решение для парковки ЖК',
  },
  {
    label: 'Сотрудники и транспорт',
    title: 'Парковка предприятия',
    text: 'Доступ по спискам и графику, ограничения по времени и журнал проездов.',
    image: '/images/landing/proshche/object-skladskie-kompleksy.avif',
    task: 'Нужно решение для парковки предприятия',
  },
];

const projects = [
  {
    name: 'Poklonka Place',
    type: 'Бизнес-центр',
    text: 'Доступ арендаторов и гостей, парковочные квоты и единый журнал проездов.',
    image: '/images/landing/proshche/cases/poklonka.avif',
    href: '/keysy/poklonka-place',
  },
  {
    name: 'Дом Чкалов',
    type: 'Комплекс апартаментов',
    text: 'Доступ резидентов и разграничение парковки с торговой галереей.',
    image: '/images/landing/proshche/cases/dom-chkalov.avif',
    href: '/keysy/chkalovskaya',
  },
  {
    name: 'EUROSPAR',
    type: 'Торговый объект',
    text: 'Разовые посетители, QR-сценарии и возможность оплаты на выезде.',
    image: '/images/landing/proshche/cases/eurospar.webp',
    href: '/keysy/spar-dnepropetrovskaya',
  },
];

const faq = [
  {
    question: 'Можно начать только со шлагбаума?',
    answer:
      'Да. Сначала уточним, кто должен въезжать и как открывать проезд. Камеры, оплату и другие возможности можно рассматривать отдельно.',
  },
  {
    question: 'Обязательно использовать парковочные билеты?',
    answer:
      'Нет. Для некоторых объектов подходит въезд по номеру автомобиля, карте или другому удобному способу. Выбор зависит от посетителей и правил парковки.',
  },
  {
    question: 'Нужно менять всю старую систему?',
    answer:
      'Не всегда. Сначала можно оценить установленное оборудование и понять, какие элементы имеет смысл сохранить, а какие — обновить.',
  },
  {
    question: 'Можно сделать парковку без постоянного оператора?',
    answer:
      'Большинство обычных въездов, выездов и оплат можно автоматизировать. Необходимость охраны или удалённого контроля зависит от режима объекта.',
  },
  {
    question: 'От чего зависит стоимость?',
    answer:
      'От типа объекта, количества въездов и выездов, способа проезда, оплаты и необходимых функций. Менеджер поможет определить разумный состав без лишнего оборудования.',
  },
];

export default function Test2Page() {
  const [task, setTask] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function chooseTask(value: string) {
    setTask(value);
    setSubmitted(false);
    window.requestAnimationFrame(() => {
      document
        .getElementById('test2-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main-content" className="test2-landing">
      <section className="test2-hero">
        <div className="test2-hero-copy">
          <span className="test2-kicker">
            Шлагбаумы · камеры · оплата · контроль въезда
          </span>
          <h1>
            Решим вашу задачу
            <br />
            <em>с парковкой</em>
          </h1>
          <p>
            Нужно закрыть въезд, убрать ручные пропуска, принимать оплату или
            заменить старую систему? Подберём понятный вариант — от шлагбаума
            до автоматического проезда.
          </p>
          <div className="test2-hero-actions">
            <a className="test2-button test2-button-primary" href="#test2-form">
              Рассчитать парковку
              <span aria-hidden="true">→</span>
            </a>
            <a className="test2-text-link" href="#problems">
              Посмотреть варианты
            </a>
          </div>
          <small className="test2-helper">
            Расскажите, что происходит на объекте. Разбираться в оборудовании
            не нужно.
          </small>
        </div>

        <figure className="test2-hero-visual">
          <Image
            src={`${assetRoot}/hero-arrival.webp`}
            alt="Водитель подъезжает к шлагбауму и получает разрешение на въезд"
            fill
            sizes="(max-width: 900px) 100vw, 52vw"
            priority
            unoptimized
          />
          <figcaption>
            <span className="status-dot" />
            <span>
              <small>Проезд без ручной проверки</small>
              <strong>Доступ разрешён</strong>
            </span>
          </figcaption>
        </figure>
      </section>

      <section className="test2-trust" aria-label="Подтверждённые факты о РОСПАРК">
        <div>
          <strong>350+</strong>
          <span>реализованных объектов</span>
        </div>
        <div>
          <strong>с 2010 года</strong>
          <span>занимаемся парковками</span>
        </div>
        <div>
          <strong>собственная</strong>
          <span>разработка и производство</span>
        </div>
      </section>

      <section className="test2-section test2-problems" id="problems">
        <div className="test2-heading">
          <span className="test2-kicker">Начнём с вашей ситуации</span>
          <h2>Что нужно изменить на парковке?</h2>
          <p>
            Выберите ближайшую задачу. Менеджер уточнит детали и поможет
            подобрать вариант.
          </p>
        </div>

        <div className="test2-problem-grid">
          {problems.map((problem) => (
            <button
              type="button"
              className="test2-problem-card"
              key={problem.number}
              onClick={() => chooseTask(problem.task)}
            >
              <span className="problem-number">{problem.number}</span>
              <h3>{problem.title}</h3>
              <p>{problem.text}</p>
              <span className="problem-action">
                Это моя задача <i aria-hidden="true">→</i>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="test2-before-after">
        <div className="test2-before-after-image">
          <Image
            src={`${assetRoot}/entry-scene.webp`}
            alt="Современная въездная стойка РОСПАРК на парковке"
            fill
            sizes="(max-width: 900px) 100vw, 46vw"
            unoptimized
          />
        </div>
        <div className="test2-before-after-copy">
          <span className="test2-kicker">Знакомая проблема</span>
          <h2>Парковка может работать проще</h2>
          <div className="compare-columns">
            <div className="compare-column is-before">
              <span>Сейчас</span>
              <ul>
                {beforeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="compare-column is-after">
              <span>После автоматизации</span>
              <ul>
                {afterItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <a className="test2-inline-cta" href="#test2-form">
            Обсудить мою задачу <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section className="test2-section test2-journey" id="how">
        <div className="test2-heading test2-heading-light">
          <span className="test2-kicker">Как это работает</span>
          <h2>Водителю всё понятно. Владельцу всё видно.</h2>
          <p>
            Обычный путь автомобиля — без инженерных схем и лишних действий.
          </p>
        </div>
        <div className="journey-list">
          {journey.map(([number, title], index) => (
            <div className="journey-step" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              {index < journey.length - 1 && (
                <i aria-hidden="true">→</i>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="test2-section test2-solutions" id="solutions">
        <div className="test2-heading">
          <span className="test2-kicker">Понятные варианты</span>
          <h2>Подберём парковку под ваш объект</h2>
          <p>
            Не каталог оборудования, а готовое направление для вашей задачи.
          </p>
        </div>
        <div className="solution-grid">
          {solutions.map((solution) => (
            <article className="solution-card" key={solution.title}>
              <div className="solution-image">
                <Image
                  src={solution.image}
                  alt={solution.title}
                  fill
                  sizes="(max-width: 720px) 100vw, 50vw"
                  unoptimized
                />
              </div>
              <div className="solution-content">
                <span>{solution.label}</span>
                <h3>{solution.title}</h3>
                <p>{solution.text}</p>
                <button type="button" onClick={() => chooseTask(solution.task)}>
                  Узнать, подойдёт ли мне
                  <i aria-hidden="true">→</i>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="test2-proof">
        <div className="test2-proof-intro">
          <div>
            <span className="test2-kicker">Опыт на реальных объектах</span>
            <h2>Не просто поставляем оборудование — запускаем парковку</h2>
          </div>
          <a href="/keysy">
            Смотреть все проекты <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <a className="project-card" href={project.href} key={project.name}>
              <div className="project-image">
                <Image
                  src={project.image}
                  alt={project.name}
                  fill
                  sizes="(max-width: 720px) 100vw, 33vw"
                  unoptimized
                />
              </div>
              <span>{project.type}</span>
              <h3>{project.name}</h3>
              <p>{project.text}</p>
              <i aria-hidden="true">Открыть проект →</i>
            </a>
          ))}
        </div>

        <div className="equipment-proof">
          <div className="equipment-proof-image">
            <Image
              src={`${assetRoot}/equipment-scene.webp`}
              alt="Линейка оборудования РОСПАРК"
              fill
              sizes="(max-width: 900px) 100vw, 54vw"
              unoptimized
            />
          </div>
          <div className="equipment-proof-copy">
            <span className="test2-kicker">РОСПАРК</span>
            <h3>Оборудование и программа — в одних руках</h3>
            <p>
              Самостоятельно разбираться в моделях не потребуется. Мы
              разрабатываем и производим оборудование и программное обеспечение,
              подбирая необходимый состав под задачу объекта.
            </p>
            <a href="/oborudovanie">
              Посмотреть оборудование <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <section className="test2-section test2-faq">
        <div className="test2-heading">
          <span className="test2-kicker">Коротко о главном</span>
          <h2>Что обычно спрашивают до расчёта</h2>
        </div>
        <div className="faq-list">
          {faq.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="test2-form-section" id="test2-form">
        <div className="test2-form-copy">
          <span className="test2-kicker">Первый шаг — короткий разговор</span>
          <h2>Расскажите о парковке — предложим варианты решения</h2>
          <p>
            Не нужно готовить техническое задание. Опишите задачу своими словами,
            а менеджер уточнит детали и объяснит возможные варианты.
          </p>
          <div className="form-reassurance">
            <span>01</span>
            <p>
              <strong>Без технических терминов</strong>
              Достаточно типа объекта, города и того, что хотите изменить.
            </p>
          </div>
          <div className="form-reassurance">
            <span>02</span>
            <p>
              <strong>Без обязательства покупать</strong>
              Сначала разберём задачу и обсудим подходящие направления.
            </p>
          </div>
        </div>

        <form className="test2-form" onSubmit={submitPreview}>
          <label>
            Какой у вас объект?
            <select name="objectType" defaultValue="" required>
              <option value="" disabled>
                Выберите тип объекта
              </option>
              <option>Жилой комплекс</option>
              <option>Бизнес-центр</option>
              <option>Предприятие или склад</option>
              <option>Магазин или торговый центр</option>
              <option>Платная парковка</option>
              <option>Другое</option>
            </select>
          </label>
          <label>
            В каком городе находится объект?
            <input
              type="text"
              name="city"
              placeholder="Например, Москва"
              required
            />
          </label>
          <label>
            Что нужно решить?
            <textarea
              name="task"
              value={task}
              onChange={(event) => {
                setTask(event.target.value);
                setSubmitted(false);
              }}
              placeholder="Например: закрыть въезд для посторонних и открывать шлагбаум по номерам"
              rows={4}
              required
            />
          </label>
          <label>
            Телефон для связи
            <input
              type="tel"
              name="phone"
              placeholder="+7 (___) ___-__-__"
              required
            />
          </label>
          <button className="test2-button test2-button-primary" type="submit">
            Получить варианты решения
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">
            На демостенде форма работает в режиме предпросмотра и не отправляет
            введённые данные.
          </p>
          {submitted && (
            <p className="form-preview-success" role="status">
              Макет формы проверен. Данные не сохранены и не отправлены.
            </p>
          )}
        </form>
      </section>

      <section className="test2-final">
        <span>Не знаете, какой вариант выбрать?</span>
        <h2>Это нормально. Начнём с вашей задачи.</h2>
        <a className="test2-button test2-button-light" href="#test2-form">
          Рассчитать мою парковку
          <span aria-hidden="true">→</span>
        </a>
      </section>

      <a className="test2-mobile-cta" href="#test2-form">
        Рассчитать парковку
      </a>
    </main>
  );
}
