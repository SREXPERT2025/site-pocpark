#!/usr/bin/env python3
"""Формирует обезличенный пакет ручного QA для cascade v3."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-zА-Яа-яЁё]{2,}")
PHONE_RE = re.compile(r"(?<![\w-])\+?\d[\d\s()\-]{8,}\d")
RISK_PATTERNS = (
    (
        "price",
        re.compile(
            r"\bцен(?:а|ы|е|у|ой|ами|ах|ник\w*)\b|"
            r"\b(?:стоимост|бюджет|смет|рубл|марж|наценк|закупоч)\w*",
            re.I,
        ),
    ),
    (
        "compatibility",
        re.compile(
            r"\b(?:совместим|интеграц)\w*|\bapi\b|\b1с\b|\bcrm\b|"
            r"\bcame\b|\bhikvision\b",
            re.I,
        ),
    ),
    ("guarantee", re.compile(r"гарантир|точност|срок|24\s*[xх/]\s*7", re.I)),
    ("diagnosis", re.compile(r"не\s+работ|неисправ|ошибк|сломал|диагноз", re.I)),
    ("handoff", re.compile(r"заявк|менеджер|переда|уведом", re.I)),
    (
        "internal-disclosure",
        re.compile(
            r"подтвержден[оы]\s+(?:директор|владелец)|SRC-|claim ledger|"
            r"внутренн\w+\s+(?:документ|источник)|названи\w+\s+файл",
            re.I,
        ),
    ),
)


def redact(text: str) -> str:
    text = EMAIL_RE.sub("<EMAIL>", text)
    return PHONE_RE.sub("<PHONE>", text)


def load_results(path: Path) -> list[dict[str, Any]]:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise ValueError(f"Файл результатов не найден: {resolved}")
    return [
        json.loads(line)
        for line in resolved.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def review_labels(record: dict[str, Any]) -> list[str]:
    labels: list[str] = []
    if record.get("route_actual") in {"security", "crm"}:
        labels.append(str(record["route_actual"]))
    if record.get("boundary_id"):
        labels.append("boundary")
    if record.get("fact_gate_actions"):
        labels.append("fact-gate-action")
    combined = f"{record.get('question', '')}\n{record.get('answer', '')}"
    answer = str(record.get("answer", ""))
    labels.extend(
        name
        for name, pattern in RISK_PATTERNS
        if pattern.search(answer if name == "internal-disclosure" else combined)
    )
    if (
        record.get("route_correct") is not True
        or record.get("user_question_answered") is not True
        or record.get("dangerous_errors")
        or record.get("model_error")
        or record.get("false_handoff") is not False
        or (record.get("tool_event") or {}).get("external_send")
    ):
        labels.append("automated-failure")
    return list(dict.fromkeys(labels))


def render_report(records: list[dict[str, Any]]) -> str:
    queued = [(record, review_labels(record)) for record in records]
    queued = [(record, labels) for record, labels in queued if labels]
    counts = Counter(label for _, labels in queued for label in labels)
    failures = [record["case_id"] for record, labels in queued if "automated-failure" in labels]
    lines = [
        "# Cascade v3 — пакет ручного QA",
        "",
        f"- всего результатов: {len(records)};",
        f"- в очереди ручной проверки: {len(queued)};",
        f"- автоматических ошибок: {len(failures)};",
        "- телефоны и email в этом отчёте замаскированы.",
        "",
        "## Категории",
        "",
        "| Категория | Сценарии |",
        "|---|---:|",
    ]
    lines.extend(f"| `{label}` | {counts[label]} |" for label in sorted(counts))
    lines.extend(["", "## Сценарии", ""])
    for record, labels in queued:
        lines.extend(
            [
                f"### {record['case_id']} — {', '.join(f'`{label}`' for label in labels)}",
                "",
                f"**Маршрут:** `{record.get('route_actual')}`.",
                "",
                f"**Вопрос:** {redact(str(record.get('question', '')))}",
                "",
                f"**Ответ:** {redact(str(record.get('answer', '')))}",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--results", required=True, type=Path)
    result.add_argument("--output", required=True, type=Path)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        report = render_report(load_results(args.results))
        output = args.output.expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(report, encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"review packet stopped: {error}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
