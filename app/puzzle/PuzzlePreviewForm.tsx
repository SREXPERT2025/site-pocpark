'use client';

import { useState } from 'react';

export function PuzzlePreviewForm() {
  const [completed, setCompleted] = useState(false);

  return (
    <section className="preview-form-section section" id="preview-form">
      <div className="preview-form-copy">
        <span className="section-label">Подбор решения</span>
        <h2>С чего начнём ваш проект?</h2>
        <p>
          Отметьте исходные условия. На демостенде ответы никуда не отправляются
          — этот блок нужен только для проверки сценария страницы.
        </p>
      </div>
      <form
        className="preview-form"
        onSubmit={(event) => {
          event.preventDefault();
          setCompleted(true);
        }}
      >
        <label>
          <span>Тип объекта</span>
          <select name="objectType" defaultValue="">
            <option value="" disabled>
              Выберите вариант
            </option>
            <option value="retail">Торговый объект</option>
            <option value="business">Бизнес-центр</option>
            <option value="residential">Жилой комплекс</option>
            <option value="industrial">Склад или производство</option>
            <option value="other">Другой объект</option>
          </select>
        </label>
        <label>
          <span>Главная задача</span>
          <select name="task" defaultValue="">
            <option value="" disabled>
              Что нужно организовать
            </option>
            <option value="access">Контроль доступа</option>
            <option value="paid">Платную парковку</option>
            <option value="guests">Гостевые проезды</option>
            <option value="upgrade">Модернизацию действующей системы</option>
          </select>
        </label>
        <label>
          <span>Количество въездов и выездов</span>
          <select name="lanes" defaultValue="">
            <option value="" disabled>
              Выберите диапазон
            </option>
            <option value="1-2">1–2 проезда</option>
            <option value="3-4">3–4 проезда</option>
            <option value="5+">5 и более</option>
            <option value="unknown">Пока не знаю</option>
          </select>
        </label>
        <label>
          <span>Нужна оплата</span>
          <select name="payment" defaultValue="">
            <option value="" disabled>
              Выберите вариант
            </option>
            <option value="yes">Да</option>
            <option value="no">Нет</option>
            <option value="mixed">Только для части пользователей</option>
            <option value="unknown">Нужно подсказать</option>
          </select>
        </label>
        <button type="submit">
          Показать следующий шаг
          <span aria-hidden="true">→</span>
        </button>
        {completed && (
          <p className="preview-result" role="status">
            Спасибо. В рабочей версии следующим шагом будет короткое обращение к
            специалисту РОСПАРК. На демостенде данные не сохранялись и не
            отправлялись.
          </p>
        )}
        <small>
          Демо-режим: форма не запрашивает контакты и не отправляет данные.
        </small>
      </form>
    </section>
  );
}
