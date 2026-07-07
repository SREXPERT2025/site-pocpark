"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { dispatchLeadFormEvent, type LeadFormEventParams } from "@/app/lib/analytics-events";
import { getLeadAttribution } from "@/app/lib/lead-attribution";

export type LeadFormPayload = {
  name: string;
  phone: string;
  company?: string;
  objectType?: string;
  projectInterests?: string[];
  comment?: string;
  consent: boolean;
  /** Откуда пришла заявка (логика/блок) */
  sourceSection?: string;
  /** Страница-источник */
  sourcePage?: string;
};

export type LeadFormProps = {
  /**
   * Откуда пришла заявка (логика/блок): hero / lead_bottom / contacts и т.п.
   */
  sourceSection?: string;
  /**
   * Страница-источник (например: /resheniya/biznes-centry)
   */
  sourcePage?: string;
  /** Подпись на кнопке */
  submitLabel?: string;
  /** Компактный режим (меньше отступов) */
  compact?: boolean;
  /** Минимальный набор полей (без компании и типа объекта) */
  minimalFields?: boolean;
  /** Необязательные контекстные сценарии для конкретной страницы */
  contextOptions?: string[];
  className?: string;
};

const CONTEXT_OPTIONS_BY_SOURCE_PAGE: Record<string, string[]> = {
  "/resheniya/torgovye-centry": [
    "Пиковый поток посетителей",
    "Бесплатное время",
    "Онлайн-оплата",
    "Льготы и исключения",
  ],
  "/resheniya/biznes-centry": [
    "Арендаторы",
    "Гостевые заявки",
    "Лимиты мест",
    "Отчетность для УК",
  ],
  "/resheniya/zastroyschiki": [
    "Резиденты",
    "Гостевой доступ",
    "Управляющая компания",
    "Безопасность двора",
  ],
  "/resheniya/skladskie-kompleksy": [
    "КПП",
    "Грузовой транспорт",
    "Пропуска",
    "Журнал событий",
  ],
  "/resheniya/dlya-rukovoditeley": [
    "Выручка и контроль оплат",
    "Снижение затрат",
    "Загрузка парковки",
    "Прозрачная отчетность",
  ],
  "/resheniya/dlya-inzhenerov": [
    "СКУД и API",
    "Схема оборудования",
    "Интеграции",
    "Надежность и резерв",
  ],
  "/resheniya/dlya-sluzhby-bezopasnosti": [
    "Журнал событий",
    "Стоп-листы",
    "Антихвост",
    "Offline-сценарии",
  ],
};

function normalizePhone(raw: string): string {
  // Лёгкая нормализация: оставляем + и цифры
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

export default function LeadForm(props: LeadFormProps) {
  const {
    sourceSection,
    sourcePage,
    submitLabel = "Получить КП",
    compact = false,
    minimalFields = false,
    contextOptions,
    className,
  } = props;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [objectType, setObjectType] = useState("");
  const [projectInterests, setProjectInterests] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const formId = useId();

  const fieldIds = {
    name: `${formId}-name`,
    phone: `${formId}-phone`,
    phoneHint: `${formId}-phone-hint`,
    company: `${formId}-company`,
    objectType: `${formId}-object-type`,
    comment: `${formId}-comment`,
    consent: `${formId}-consent`,
    consentHint: `${formId}-consent-hint`,
    submitHint: `${formId}-submit-hint`,
  };

  function getEventParams(): LeadFormEventParams {
    return {
      form_name: "lead_form",
      source_page:
        sourcePage ||
        (typeof window !== "undefined" ? window.location.pathname : undefined),
      source_section: sourceSection,
    };
  }

  function handleFormStart() {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    dispatchLeadFormEvent("form_start", getEventParams());
  }

  useEffect(() => {
    dispatchLeadFormEvent("form_view", getEventParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveContextOptions = useMemo(
    () => contextOptions ?? (sourcePage ? CONTEXT_OPTIONS_BY_SOURCE_PAGE[sourcePage] : undefined) ?? [],
    [contextOptions, sourcePage]
  );

  function toggleProjectInterest(option: string) {
    setProjectInterests((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  }

  const payload: LeadFormPayload = useMemo(
    () => ({
      name: name.trim(),
      phone: phone.trim(),
      company: minimalFields ? undefined : company.trim() || undefined,
      objectType: minimalFields ? undefined : objectType.trim() || undefined,
      projectInterests: projectInterests.length > 0 ? projectInterests : undefined,
      comment: comment.trim() || undefined,
      consent,
      sourceSection,
      sourcePage,
    }),
    [
      name,
      phone,
      company,
      objectType,
      projectInterests,
      comment,
      consent,
      sourceSection,
      sourcePage,
      minimalFields,
    ]
  );

  const canSubmit = useMemo(() => {
    if (!payload.consent) return false;
    if (!payload.name) return false;
    if (!payload.phone) return false;

    // минимальная валидация телефона: 10+ цифр
    const digits = normalizePhone(payload.phone).replace(/\D/g, "");
    if (digits.length < 10) return false;

    return true;
  }, [payload]);

  const phoneDigits = normalizePhone(phone).replace(/\D/g, "");
  const phoneLooksInvalid = phone.trim().length > 0 && phoneDigits.length < 10;

  const submitHint = useMemo(() => {
    if (!name.trim()) return "Введите имя.";
    if (!phone.trim()) return "Введите телефон.";
    if (phoneLooksInvalid) return "Проверьте номер: нужно не меньше 10 цифр.";
    if (!consent) return "Подтвердите согласие на обработку данных.";
    return null;
  }, [consent, name, phone, phoneLooksInvalid]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setErrorText(null);

    if (!canSubmit) {
      setStatus("error");
      setErrorText("Проверьте имя, телефон и согласие на обработку данных.");
      dispatchLeadFormEvent("form_error", {
        ...getEventParams(),
        error_type: "validation",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      dispatchLeadFormEvent("form_submit", getEventParams());

      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          message: payload.comment,
          phone: normalizePhone(payload.phone),
          source: sourceSection,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
          utm: getLeadAttribution(),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setStatus("success");
      dispatchLeadFormEvent("form_success", getEventParams());
      setName("");
      setPhone("");
      setCompany("");
      setObjectType("");
      setProjectInterests([]);
      setComment("");
      setConsent(false);
    } catch (err) {
      setStatus("error");
      setErrorText("Не удалось отправить заявку. Попробуйте еще раз или свяжитесь с нами по телефону.");
      dispatchLeadFormEvent("form_error", {
        ...getEventParams(),
        error_type: "network",
      });
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={handleFormStart}
      className={
        className ||
        `w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${
          compact ? "p-4 sm:p-6" : "p-5 sm:p-8"
        }`
      }
    >
      <div className="grid min-w-0 gap-5 sm:gap-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor={fieldIds.name} className="text-sm font-semibold text-slate-900">
              Имя
            </label>
            <input
              id={fieldIds.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Андрей"
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete="name"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor={fieldIds.phone} className="text-sm font-semibold text-slate-900">
              Телефон
            </label>
            <input
              id={fieldIds.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 999 123-45-67"
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-invalid={phoneLooksInvalid}
              aria-describedby={fieldIds.phoneHint}
            />
            <p id={fieldIds.phoneHint} className="text-xs leading-5 text-slate-500">
              Можно указать номер в привычном формате.
            </p>
          </div>

          {!minimalFields ? (
            <>
              <div className="grid gap-2">
                <label htmlFor={fieldIds.company} className="text-sm font-semibold text-slate-900">
                  Компания
                </label>
                <input
                  id={fieldIds.company}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder='ООО "..."'
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
                  autoComplete="organization"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor={fieldIds.objectType} className="text-sm font-semibold text-slate-900">
                  Тип объекта
                </label>
                <input
                  id={fieldIds.objectType}
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  placeholder="ТЦ / БЦ / ЖК / Паркинг"
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            </>
          ) : null}
        </div>

        {effectiveContextOptions.length > 0 ? (
          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-slate-900">
              Что важно обсудить
            </legend>
            <div className="flex flex-wrap gap-2">
              {effectiveContextOptions.map((option) => {
                const selected = projectInterests.includes(option);

                return (
                  <label
                    key={option}
                    className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProjectInterest(option)}
                      className="sr-only"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Можно пропустить или выбрать несколько пунктов.
            </p>
          </fieldset>
        ) : null}

        <div className="grid gap-2">
          <label htmlFor={fieldIds.comment} className="text-sm font-semibold text-slate-900">
            Комментарий
          </label>
          <textarea
            id={fieldIds.comment}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Коротко опишите объект и задачу (кол-во въездов, типы клиентов, пожелания)"
            className="min-h-[120px] w-full min-w-0 resize-y rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label htmlFor={fieldIds.consent} className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              id={fieldIds.consent}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
              required
              aria-describedby={fieldIds.consentHint}
            />
            <span className="min-w-0 break-words">
              Я даю согласие на обработку моих персональных данных для обработки обращения,
              подготовки расчёта и связи со мной. Подтверждаю, что ознакомлен с{" "}
              <Link href="/privacy" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">
                Политикой обработки персональных данных
              </Link>{" "}
              и{" "}
              <Link
                href="/soglasie-na-obrabotku-personalnyh-dannyh"
                className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                Согласием на обработку персональных данных
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            aria-describedby={submitHint ? fieldIds.submitHint : undefined}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold leading-tight text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {isSubmitting ? "Отправляем…" : submitLabel}
          </button>
        </div>

        <p id={fieldIds.consentHint} className="sr-only">
          Согласие требуется для отправки заявки.
        </p>

        {submitHint ? (
          <p
            id={fieldIds.submitHint}
            aria-live="polite"
            className="text-xs leading-5 text-slate-500"
          >
            Чтобы отправить заявку: {submitHint}
          </p>
        ) : null}

        {status === "success" ? (
          <div role="status" aria-live="polite" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Заявка отправлена. Мы свяжемся с вами в ближайшее время.
          </div>
        ) : null}

        {status === "error" ? (
          <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorText || "Проверьте поля и попробуйте еще раз."}
          </div>
        ) : null}
      </div>
    </form>
  );
}
