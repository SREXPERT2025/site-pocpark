'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';

const journeySteps = [
  {
    number: '01',
    label: 'Подъезд',
    title: 'Автомобиль подъезжает',
    text: 'Водитель видит понятный въезд и не ищет охранника или нужный пропуск.',
    image: '/images/landing/v4-1/hero-object.webp',
    status: 'Автомобиль у въезда',
  },
  {
    number: '02',
    label: 'Распознавание',
    title: 'Система понимает, кто приехал',
    text: 'Камера читает номер, либо водитель использует билет или карту — в зависимости от правил объекта.',
    image: '/images/landing/v4-1/journey-detect.webp',
    status: 'Номер распознан',
  },
  {
    number: '03',
    label: 'Проезд',
    title: 'Шлагбаум открывается',
    text: 'Разрешённый автомобиль проезжает без звонка на пост охраны и ручной сверки списков.',
    image: '/images/landing/v4-1/journey-open.webp',
    status: 'Доступ разрешён',
  },
  {
    number: '04',
    label: 'Оплата',
    title: 'Оплата — когда она нужна',
    text: 'Для платной парковки можно подобрать удобный сценарий: онлайн, через терминал или при выезде.',
    image: '/images/landing/v4-1/journey-pay.webp',
    status: 'Оплата подтверждена',
  },
  {
    number: '05',
    label: 'Контроль',
    title: 'Владелец видит, что происходит',
    text: 'Проезды, события и данные для контроля собраны в одном месте и доступны ответственному сотруднику.',
    image: '/images/landing/v4-1/journey-control.webp',
    status: 'Событие сохранено',
  },
];

const objectSolutions = [
  {
    id: 'zhk',
    tab: 'ЖК',
    eyebrow: 'ЖК и управляющие компании',
    title: 'Жители въезжают свободно. Гости — по понятным правилам.',
    text: 'Разделяем постоянный и гостевой доступ, помогаем убрать ручные списки и контролировать посторонние автомобили.',
    features: ['Въезд по номеру', 'Гостевые заявки', 'История проездов'],
    image: '/images/landing/v4-1/object-zhk.webp',
  },
  {
    id: 'bc',
    tab: 'Бизнес-центр',
    eyebrow: 'Бизнес-центры',
    title: 'Один въезд — разные правила для арендаторов и гостей.',
    text: 'Настраиваем доступ организаций, лимиты, гостевые визиты и понятную отчётность для управляющей компании.',
    features: ['Доступ арендаторов', 'Лимиты организаций', 'Гостевой проезд'],
    image: '/images/landing/v4-1/object-bc.webp',
  },
  {
    id: 'retail',
    tab: 'Торговый объект',
    eyebrow: 'Магазины и торговые центры',
    title: 'Посетителю легко въехать, оплатить и выехать.',
    text: 'Подбираем сценарий для большого потока разовых клиентов, оплаты и бесплатного времени по правилам объекта.',
    features: ['Разовые посетители', 'Оплата парковки', 'Скидки и льготное время'],
    image: '/images/landing/v4-1/object-retail.webp',
  },
  {
    id: 'enterprise',
    tab: 'Предприятие',
    eyebrow: 'Предприятия',
    title: 'Сотрудники и служебный транспорт проезжают по заданным правилам.',
    text: 'Организуем доступ по спискам, времени и категориям транспорта, сохраняя историю въездов и выездов.',
    features: ['Списки сотрудников', 'Доступ по времени', 'Контроль транспорта'],
    image: '/images/landing/v4-1/object-enterprise.webp',
  },
];

const beforeItems = [
  ['01', 'Охрана вручную сверяет машины и открывает шлагбаум'],
  ['02', 'Пропуска теряются, передаются другим и создают путаницу'],
  ['03', 'На въезде образуется очередь, а оплату сложно проверить'],
  ['04', 'Руководитель не видит полной картины по парковке'],
];

const afterItems = [
  ['01', 'Разрешённые автомобили проезжают по заданным правилам'],
  ['02', 'Номер машины может заменить обычный пропуск'],
  ['03', 'Оплата и разрешение на выезд связаны между собой'],
  ['04', 'Проезды и события видны ответственному сотруднику'],
];

export default function V41Page() {
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [objectIndex, setObjectIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const journey = journeySteps[journeyIndex];
  const solution = objectSolutions[objectIndex];

  function openConsultation() {
    setSubmitted(false);
    setModalOpen(true);
  }

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main id="main-content" className="v41">
      <section className="v41-hero" aria-labelledby="v41-title">
        <Image
          className="v41-hero-image"
          src="/images/landing/v4-1/hero-object.webp"
          alt="Автомобиль подъезжает к автоматизированному въезду бизнес-центра"
          fill
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="v41-hero-shade" />
        <div className="v41-shell v41-masthead">
          <a href="/" aria-label="РОСПАРК — на главную">
            РОСПАРК
          </a>
          <a href="tel:+74993212040">+7 (499) 321-20-40</a>
          <button type="button" onClick={openConsultation}>
            Рассчитать парковку
          </button>
        </div>
        <div className="v41-shell v41-hero-grid">
          <div className="v41-hero-copy">
            <p className="v41-eyebrow">РОСПАРК · парковочные решения</p>
            <h1 id="v41-title">
              Автоматизированная парковка
              <span>для вашего объекта</span>
            </h1>
            <p className="v41-lead">
              Удобный въезд, оплата и полный контроль в одной системе.
              Подберём решение под вашу задачу — от простого шлагбаума до
              автоматического проезда.
            </p>
            <button
              className="v41-cta v41-cta-light"
              type="button"
              onClick={openConsultation}
            >
              Рассчитать парковку
              <span aria-hidden="true">↗</span>
            </button>
            <p className="v41-cta-note">
              Расскажите об объекте — разбираться в оборудовании не нужно
            </p>
          </div>

          <div className="v41-live-card" aria-label="Пример работы въезда">
            <div className="v41-live-top">
              <span className="v41-live-dot" />
              <span>Въезд контролируется</span>
              <small>10:42</small>
            </div>
            <div className="v41-plate">А 123 ВС 77</div>
            <div className="v41-live-result">
              <span>Автомобиль распознан</span>
              <strong>Доступ разрешён</strong>
            </div>
            <div className="v41-barrier" aria-hidden="true">
              <i />
              <b />
            </div>
          </div>
        </div>
        <div className="v41-shell v41-proof">
          <span>16 лет опыта</span>
          <i />
          <span>350+ объектов</span>
          <i />
          <span>Собственная разработка и производство</span>
        </div>
      </section>

      <section className="v41-shift" aria-labelledby="v41-shift-title">
        <div className="v41-shell">
          <header className="v41-section-heading">
            <p className="v41-eyebrow v41-eyebrow-blue">
              Знакомая ситуация?
            </p>
            <h2 id="v41-shift-title">
              Парковка может работать <em>проще</em>
            </h2>
            <p>
              Не добавляем сложности. Убираем лишние ручные действия и делаем
              понятным проезд для водителя и контроль для владельца.
            </p>
          </header>

          <div className="v41-shift-grid">
            <article className="v41-state v41-state-before">
              <div className="v41-state-title">
                <small>Сейчас</small>
                <strong>Много ручной работы</strong>
              </div>
              <div className="v41-state-list">
                {beforeItems.map(([number, text]) => (
                  <div key={number}>
                    <span>{number}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="v41-shift-arrow" aria-hidden="true">
              <span>→</span>
            </div>

            <article className="v41-state v41-state-after">
              <div className="v41-state-title">
                <small>После автоматизации</small>
                <strong>Понятные правила проезда</strong>
              </div>
              <div className="v41-state-list">
                {afterItems.map(([number, text]) => (
                  <div key={number}>
                    <span>{number}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="v41-journey" aria-labelledby="v41-journey-title">
        <div className="v41-shell">
          <header className="v41-section-heading v41-section-heading-dark">
            <p className="v41-eyebrow">Один понятный путь</p>
            <h2 id="v41-journey-title">
              Водителю всё понятно.
              <em>Владельцу всё видно.</em>
            </h2>
          </header>

          <div className="v41-journey-stage">
            <figure className="v41-journey-visual">
              <Image
                key={journey.image}
                src={journey.image}
                alt={journey.title}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                unoptimized
              />
              <figcaption>
                <span className="v41-live-dot" />
                {journey.status}
              </figcaption>
            </figure>

            <div className="v41-journey-copy" aria-live="polite">
              <span className="v41-journey-number">{journey.number}</span>
              <p>{journey.label}</p>
              <h3>{journey.title}</h3>
              <div>{journey.text}</div>
            </div>
          </div>

          <div className="v41-journey-tabs" role="tablist">
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

      <section className="v41-objects" aria-labelledby="v41-objects-title">
        <div className="v41-shell">
          <header className="v41-section-heading">
            <p className="v41-eyebrow v41-eyebrow-blue">
              Решение зависит от объекта
            </p>
            <h2 id="v41-objects-title">
              Узнаём вашу задачу — <em>подбираем нужный сценарий</em>
            </h2>
          </header>

          <div className="v41-object-tabs" role="tablist">
            {objectSolutions.map((item, index) => (
              <button
                key={item.id}
                className={index === objectIndex ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={index === objectIndex}
                onClick={() => setObjectIndex(index)}
              >
                {item.tab}
              </button>
            ))}
          </div>

          <article className="v41-object-card">
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
            <div className="v41-object-copy">
              <p className="v41-eyebrow v41-eyebrow-blue">
                {solution.eyebrow}
              </p>
              <h3>{solution.title}</h3>
              <div className="v41-object-text">{solution.text}</div>
              <ul>
                {solution.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className="v41-cta v41-cta-blue"
                type="button"
                onClick={openConsultation}
              >
                Рассчитать парковку
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="v41-finale" aria-label="Следующий шаг">
        <div className="v41-shell">
          <p>Не знаете, какой вариант нужен?</p>
          <h2>Начните с задачи, а не с оборудования.</h2>
          <button
            className="v41-cta v41-cta-light"
            type="button"
            onClick={openConsultation}
          >
            Рассчитать парковку
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <button
        className="v41-mobile-cta"
        type="button"
        onClick={openConsultation}
      >
        Рассчитать парковку
      </button>

      {modalOpen ? (
        <div
          className="v41-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="v41-form-title"
        >
          <button
            className="v41-modal-backdrop"
            type="button"
            aria-label="Закрыть форму"
            onClick={() => setModalOpen(false)}
          />
          <div className="v41-modal-card">
            <button
              className="v41-modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            {submitted ? (
              <div className="v41-form-success">
                <span>✓</span>
                <p className="v41-eyebrow v41-eyebrow-blue">
                  Предпросмотр формы
                </p>
                <h2>Данные никуда не отправлены</h2>
                <p>
                  Это безопасная тестовая версия. После согласования подключим
                  форму к рабочему реестру лидов.
                </p>
                <button
                  className="v41-cta v41-cta-blue"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Понятно
                </button>
              </div>
            ) : (
              <>
                <p className="v41-eyebrow v41-eyebrow-blue">
                  Консультация по объекту
                </p>
                <h2 id="v41-form-title">
                  Расскажите о парковке — предложим варианты
                </h2>
                <p className="v41-form-intro">
                  Не нужно составлять техническое задание. Опишите задачу
                  своими словами.
                </p>
                <form onSubmit={submitPreview}>
                  <label>
                    Какой у вас объект?
                    <select name="object" defaultValue="" required>
                      <option value="" disabled>
                        Выберите объект
                      </option>
                      <option>Жилой комплекс</option>
                      <option>Бизнес-центр</option>
                      <option>Торговый объект</option>
                      <option>Предприятие</option>
                      <option>Другое</option>
                    </select>
                  </label>
                  <div className="v41-form-row">
                    <label>
                      Город
                      <input name="city" placeholder="Москва" required />
                    </label>
                    <label>
                      Примерно сколько мест?
                      <input
                        name="spaces"
                        inputMode="numeric"
                        placeholder="Например, 120"
                      />
                    </label>
                  </div>
                  <label>
                    Что нужно изменить?
                    <textarea
                      name="task"
                      rows={3}
                      placeholder="Например: закрыть въезд для посторонних и убрать ручные пропуска"
                      required
                    />
                  </label>
                  <div className="v41-form-row">
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
                  <button
                    className="v41-cta v41-cta-blue v41-form-submit"
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
