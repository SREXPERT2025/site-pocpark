"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dispatchLeadFormEvent, type LeadFormEventParams } from "@/app/lib/analytics-events";
import { getLeadAttribution } from "@/app/lib/lead-attribution";

export type LeadFormPayload = {
  name: string;
  phone: string;
  company?: string;
  objectType?: string;
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
  className?: string;
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
    className,
  } = props;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [objectType, setObjectType] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

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

  const payload: LeadFormPayload = useMemo(
    () => ({
      name: name.trim(),
      phone: phone.trim(),
      company: minimalFields ? undefined : company.trim() || undefined,
      objectType: minimalFields ? undefined : objectType.trim() || undefined,
      comment: comment.trim() || undefined,
      consent,
      sourceSection,
      sourcePage,
    }),
    [name, phone, company, objectType, comment, consent, sourceSection, sourcePage, minimalFields]
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
          phone: normalizePhone(payload.phone),
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
            <label className="text-sm font-semibold text-slate-900">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Андрей"
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete="name"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-900">Телефон</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 999 123-45-67"
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete="tel"
            />
          </div>

          {!minimalFields ? (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">Компания</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder='ООО "..."'
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">Тип объекта</label>
                <input
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  placeholder="ТЦ / БЦ / ЖК / Паркинг"
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">Комментарий</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Коротко опишите объект и задачу (кол-во въездов, типы клиентов, пожелания)"
            className="min-h-[120px] w-full min-w-0 resize-y rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
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
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold leading-tight text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {isSubmitting ? "Отправляем…" : submitLabel}
          </button>
        </div>

        {status === "success" ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Заявка отправлена. Мы свяжемся с вами в ближайшее время.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorText || "Проверьте поля и попробуйте еще раз."}
          </div>
        ) : null}
      </div>
    </form>
  );
}
