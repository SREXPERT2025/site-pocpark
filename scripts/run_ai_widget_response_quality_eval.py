#!/usr/bin/env python3
"""Локальная ручная регрессия ключевых вопросов AI-консультанта."""

from __future__ import annotations

import argparse
from pathlib import Path

import ai_widget_cascade_v3_adapter as adapter
from run_ai_widget_pilot_gateway import PilotEngine, validate_request


CASES = (
    (
        "/parkovka",
        {"landingVariant": "parkovka", "selectedProblem": "Убрать ручные пропуска"},
        "Как убрать очередь на въезде?",
    ),
    (
        "/parkovka",
        {"landingVariant": "parkovka", "selectedProblem": "Обойтись без билетов"},
        "Что выбрать: госномера, карты или билеты?",
    ),
    (
        "/parkovka",
        {"landingVariant": "parkovka", "selectedProblem": "Убрать ручные пропуска"},
        "Как организовать въезд для гостей?",
    ),
    (
        "/parkovka-pod-klyuch",
        {"landingVariant": "puzzle2", "selectedFunctions": ["Въезд по госномеру"]},
        "Что подойдёт для нашего объекта?",
    ),
    (
        "/parkovka-pod-klyuch",
        {"landingVariant": "puzzle2", "selectedFunctions": ["Доступ для гостей"]},
        "Как организовать гостевой въезд?",
    ),
    (
        "/parkovka-pod-klyuch",
        {"landingVariant": "puzzle2", "selectedFunctions": ["Въезд по госномеру"]},
        "Нужны ли билеты или достаточно госномеров?",
    ),
    ("/", None, "Rfrbt ,sdf.n ltvj ljcnegs?"),
    (
        "/",
        None,
        "У Яндекс Заправки спрашивают: API есть у вас? "
        "Можно по API открыть шлагбаум на въезд и выезд?",
    ),
    ("/demo", None, "Зови человека! С ним буду говорить."),
    ("/contacts", None, "Скок будет 2+2?"),
    (
        "/vozmozhnosti/razovie-klienti",
        None,
        "Что означает проезд разового клиента по собственному идентификатору?",
    ),
    (
        "/demo",
        None,
        "Если клиент въехал по собственному идентификатору, как он оплатит?",
    ),
    ("/", None, "Где посмотреть оборудование? Дай точную ссылку."),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "cases",
        nargs="*",
        type=int,
        help="Номера кейсов; без аргументов выполняются все.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    selected_cases = set(args.cases or range(1, len(CASES) + 1))
    if not selected_cases or min(selected_cases) < 1 or max(selected_cases) > len(CASES):
        raise SystemExit(f"Номера кейсов должны быть в диапазоне 1-{len(CASES)}.")
    engine = PilotEngine(
        ai_root=Path("/Volumes/POCPARK_AI_DATA/POCPARK_AI"),
        endpoint="http://127.0.0.1:11434",
        model=adapter.ALLOWED_MODEL,
        timeout=180,
        max_tokens=320,
        keep_alive="2h",
        runtime_mode="production",
    )
    for index, (source_page, page_context, question) in enumerate(CASES, 1):
        if index not in selected_cases:
            continue
        request = {
            "sourcePage": source_page,
            "messages": [{"role": "user", "content": question}],
        }
        if page_context:
            request["pageContext"] = page_context
        payload = validate_request(request)
        result = engine.answer(payload)
        print(f"\n[{index}] {question}\n{result.answer}\nroute={result.route}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
