#!/usr/bin/env python3
"""Изолированный адаптер cascade v3 для AI-виджета РОСПАРК.

Адаптер использует зафиксированный движок cascade v2 только для чтения,
разделяет preview- и production-профили и не предоставляет модели инструменты
доступа к POCPARK_AI, OpenClaw, CRM, MAX или парковочному оборудованию.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any
from urllib.parse import urlparse


SITE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AI_ROOT = Path("/Volumes/POCPARK_AI_DATA/POCPARK_AI")
DEFAULT_FAQ = SITE_ROOT / "docs/site/ai-widget/WIDGET_FAQ_V1_APPROVED.md"
DEFAULT_PROFILE = SITE_ROOT / "docs/site/ai-widget/WIDGET_AGENT_PROFILE_V1.md"
DEFAULT_PRODUCTION_PROFILE = (
    SITE_ROOT / "docs/site/ai-widget/WIDGET_PRODUCTION_PROFILE_V1.md"
)
DEFAULT_KNOWLEDGE = (
    SITE_ROOT / "docs/site/ai-widget/WIDGET_OWNER_DECISIONS_20260727.md",
    SITE_ROOT / "docs/site/ai-widget/WIDGET_CLAIM_LEDGER_V1.md",
    SITE_ROOT / "docs/site/ai-widget/WIDGET_DATA_AND_LEAD_POLICY_V1.md",
    SITE_ROOT / "docs/site/ai-widget/WIDGET_KB_V1_SOURCES.md",
)
DEFAULT_PRODUCTION_KNOWLEDGE = (
    SITE_ROOT / "docs/site/ai-widget/WIDGET_CLAIM_LEDGER_V1.md",
)

LEGACY_V2_SHA256 = "a8d8fcfdd1a2e33fa0273df254664af1941730063a6c48a4f7a7c24a359eca5f"
LEGACY_BASE_SHA256 = "02ec922e2e7de532e21bf6a00e5d18ee4b7a31ab4f26d4e23f7ffa2ad4a3fbc1"
FULL_230_QUESTIONS_SHA256 = "180dbc0de8c429e3a708da2b6a39ec5369b80df3e14a09f7121a41ab5d42d467"
ALLOWED_MODEL = "qwen3.6:27b"
EXPECTED_FAQ_COUNT = 26
EXPECTED_BOUNDARY_COUNT = 6
PRICE_REQUEST_RE = re.compile(
    r"\bцен(?:а|ы|е|у|ой|ами|ах)\b|\bстоимост\w*|"
    r"\bсколько\s+сто(?:ит|ят)\b|\bскока\s+(?:будет|сто(?:ит|ят))\b|"
    r"\bсмет\w*|"
    r"\b(?:какой|какая|каково|определить|рассчитать|оценить)"
    r"\s+бюджет(?:а|у|ом|е)?\b|"
    r"\bбюджет(?:а|у|ом|е)?\s+(?:нужен|нужна|потребуется|до|от|около|"
    r"в\s+пределах)\b|"
    r"\b(?:уложиться|вписаться)\s+в\s+(?:бюджет(?:а|у|ом|е)?|"
    r"(?:\d[\d\s]*|миллион\w*|тысяч\w*)\s*(?:рубл\w*|₽))|"
    r"\b(?:дешевле|дороже)\s+(?:ли|чем|на\s+сколько)\b|"
    r"\b(?:дешевле|дороже)\s+или\s+(?:дешевле|дороже)\b",
    re.I,
)
EMPLOYEE_ACCESS_RE = re.compile(
    r"\b(?:сотрудник|персонал|работник|резидент|постоянн\w+\s+пользовател)\w*",
    re.I,
)
TIMED_ACCESS_RE = re.compile(
    r"\b(?:расписан|график|временн\w+\s+окн|рабоч\w+\s+час|"
    r"огранич\w+\s+по\s+времен|ноч|на\s+ночь|после\s+работ)\w*",
    re.I,
)
SOLUTION_REQUIREMENT_GROUPS = (
    EMPLOYEE_ACCESS_RE,
    TIMED_ACCESS_RE,
    re.compile(r"\b(?:без\s+оплат|бесплатн|не\s+нужн\w+\s+оплат)\w*", re.I),
    re.compile(r"\b(?:номер\w*\s+автомоб|распознаван|anpr|rfid|метк|карт)\w*", re.I),
    re.compile(r"\b(?:въезд|выезд|доступ|лимит|зон|шлагбаум)\w*", re.I),
)
MONEY_AMOUNT_RE = re.compile(
    r"\b(?:\d[\d\s]*|миллион\w*|тысяч\w*)\s*(?:рубл\w*|₽)",
    re.I,
)
LEGACY_LENGTH_INSTRUCTION = (
    "Ответь по-русски, прямо и полезно, обычно от 50 до 70 слов."
)
PILOT_LENGTH_INSTRUCTION = (
    "Ответь по-русски, прямо и полезно. Длина должна соответствовать вопросу: "
    "для знакомства или простой справки достаточно одного-трёх предложений, "
    "для составной задачи можно дать более развёрнутый ответ."
)
PRODUCTION_FAQ_REPLACEMENTS = (
    (
        "Статус: утверждён для закрытого пилота, не для публичного запуска.",
        "Статус: утверждённая база ответов публичного AI-консультанта.",
    ),
    (
        "Публичный запуск остаётся отдельным этапом.",
        "Изменение ответов или правил требует повторной проверки.",
    ),
)
PRODUCTION_FORBIDDEN_PROMPT_PHRASES = (
    "закрытый пилот",
    "закрытого пилота",
    "тестовая заявка",
    "тестовый контакт",
    "не вводите реальные данные",
    "max не используется",
)
GENERIC_PADDING_PATTERNS = (
    re.compile(
        r"Это не является обещанием конкретной комплектации:\s*"
        r"итоговое решение зависит от исходных данных и технической оценки "
        r"объекта\.?",
        re.I,
    ),
    re.compile(
        r"Неподтвержд[её]нные параметры следует зафиксировать отдельно и "
        r"проверить до подготовки предложения\.?",
        re.I,
    ),
    re.compile(
        r"Проверку должен выполнять уполномоченный технический специалист\.?",
        re.I,
    ),
    re.compile(
        r"Самостоятельное вмешательство в оборудование исключается\.?",
        re.I,
    ),
    re.compile(
        r"Срок решения заранее не подтверждается\.?",
        re.I,
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_file(path: Path, label: str) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise ValueError(f"{label} не найден: {resolved}")
    return resolved


def require_loopback_endpoint(endpoint: str) -> str:
    parsed = urlparse(endpoint)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("Разрешён только локальный HTTP endpoint Ollama.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Endpoint не должен содержать учётные данные, query или fragment.")
    return endpoint.rstrip("/")


def require_output_outside_ai_root(output_dir: Path, ai_root: Path) -> Path:
    output = output_dir.expanduser().resolve()
    ai = ai_root.expanduser().resolve()
    if output == ai or ai in output.parents:
        raise ValueError("Результаты запрещено записывать внутрь рабочего POCPARK_AI.")
    return output


def verify_legacy_engine(ai_root: Path) -> tuple[Path, Path]:
    v2 = require_file(ai_root / "scripts/run_ai_widget_cascade_v2_eval.py", "cascade v2")
    base = require_file(ai_root / "scripts/run_ai_widget_cascade_eval.py", "base cascade")
    actual = {
        v2: sha256(v2),
        base: sha256(base),
    }
    expected = {
        v2: LEGACY_V2_SHA256,
        base: LEGACY_BASE_SHA256,
    }
    mismatched = [str(path) for path in actual if actual[path] != expected[path]]
    if mismatched:
        raise ValueError(
            "Контрольная сумма legacy-движка изменилась; нужен новый read-only review: "
            + ", ".join(mismatched)
        )
    return v2, base


def parse_current_template_file(path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    text = path.read_text(encoding="utf-8")
    heading = re.compile(r"^### ((?:FAQ|BND)-\d{3})\s+—\s+(.+)$", re.M)
    matches = list(heading.finditer(text))
    faq: dict[str, dict[str, Any]] = {}
    boundaries: dict[str, str] = {}

    for index, match in enumerate(matches):
        template_id, title = match.groups()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block = text[match.end():end].strip()
        if template_id.startswith("FAQ"):
            answer_match = re.search(
                r"\*\*Ответ:?\*\*\s*\n(.+?)(?=\n\*\*(?:Источник|Источники):\*\*|\n## |\Z)",
                block,
                re.S,
            )
            if not answer_match:
                raise ValueError(f"У {template_id} отсутствует блок ответа.")
            answer = re.sub(r"\s+", " ", answer_match.group(1)).strip()
            variants_match = re.search(
                r"\*\*Варианты вопроса:?\*\*(.+?)\n\*\*Ответ",
                block,
                re.S,
            )
            variants = (
                re.findall(r"^-\s+(.+?)\s*$", variants_match.group(1), re.M)
                if variants_match
                else []
            )
            source_match = re.search(r"\*\*Источники?:\*\*\s*([^\n]+)", block)
            faq[template_id] = {
                "title": title.strip(),
                "variants": variants,
                "answer": answer,
                "source": source_match.group(1).strip() if source_match else "",
            }
        else:
            body = re.split(r"\n## |\n\*\*", block, maxsplit=1)[0]
            answer = re.sub(r"\s+", " ", body).strip()
            if not answer:
                raise ValueError(f"У {template_id} отсутствует текст границы знаний.")
            boundaries[template_id] = answer

    if len(faq) != EXPECTED_FAQ_COUNT or len(boundaries) != EXPECTED_BOUNDARY_COUNT:
        raise ValueError(
            "Ожидались "
            f"{EXPECTED_FAQ_COUNT} FAQ и {EXPECTED_BOUNDARY_COUNT} BND, "
            f"получены {len(faq)} и {len(boundaries)}."
        )
    return faq, boundaries


def v3_boundary_patterns() -> tuple[tuple[str, re.Pattern[str]], ...]:
    return (
        (
            "BND-005",
            re.compile(
                PRICE_REQUEST_RE.pattern
                + r"|\b(?:закупочн|себестоим|марж|наценк)\w*",
                re.I,
            ),
        ),
        (
            "BND-001",
            re.compile(
                r"\bcame\b|\bкаме\b|hikvision|совместим|"
                r"(?:существующ|стар|действующ)\w*\s+"
                r"(?:оборуд|камер|шлагбаум|контроллер)|"
                r"(?:оборуд|камер|шлагбаум|контроллер)\w*.*"
                r"\b(?:стар|действующ)\w*|"
                r"оборудован\w*\s+другого\s+интегратор",
                re.I,
            ),
        ),
        (
            "BND-002",
            re.compile(
                r"гаранти|24\s*[xх/]\s*7|круглосуточ|восстанов|"
                r"точност|99\s*процент|"
                r"как\s+быстро\b.{0,50}\b(?:инженер|приед|реакц)|"
                r"\bвремя\s+(?:прибыт|реакц)\w*",
                re.I,
            ),
        ),
        ("BND-003", re.compile(r"интернет|электрич|питан|сервер.*(?:пропад|связ)", re.I)),
        ("BND-004", re.compile(r"географ|регион|город|монтаж.*(?:москв|росси)|работаете\s+в", re.I)),
        ("BND-006", re.compile(r"не\s+работ|ошибк|неисправ|сломал|причин|диагноз", re.I)),
    )


def is_employee_timed_access_request(question: str) -> bool:
    return bool(
        EMPLOYEE_ACCESS_RE.search(question)
        and TIMED_ACCESS_RE.search(question)
    )


def is_composite_solution_request(question: str) -> bool:
    matched_groups = sum(
        bool(pattern.search(question))
        for pattern in SOLUTION_REQUIREMENT_GROUPS
    )
    return matched_groups >= 2


def strip_generic_padding(answer: str) -> str:
    result = answer
    for pattern in GENERIC_PADDING_PATTERNS:
        result = pattern.sub("", result)
    return re.sub(r"\s+", " ", result).strip()


def runtime_sources(
    runtime_mode: str,
) -> tuple[Path, tuple[Path, ...]]:
    if runtime_mode == "preview":
        return DEFAULT_PROFILE, DEFAULT_KNOWLEDGE
    if runtime_mode == "production":
        return DEFAULT_PRODUCTION_PROFILE, DEFAULT_PRODUCTION_KNOWLEDGE
    raise ValueError("runtime mode must be preview or production")


def guarded_responder_prompt(
    base_responder_prompt: Any,
    runtime_mode: str = "preview",
) -> Any:
    def build(faq_text: str) -> str:
        prompt = base_responder_prompt(faq_text)
        if LEGACY_LENGTH_INSTRUCTION not in prompt:
            raise ValueError("Legacy responder length instruction changed.")
        prompt = prompt.replace(
            LEGACY_LENGTH_INSTRUCTION,
            PILOT_LENGTH_INSTRUCTION,
            1,
        )
        if runtime_mode == "production":
            for old, new in PRODUCTION_FAQ_REPLACEMENTS:
                if old not in prompt:
                    raise ValueError(
                        "Production FAQ guard changed: "
                        + old
                    )
                prompt = prompt.replace(old, new, 1)
            lowered = prompt.lower()
            found = [
                phrase
                for phrase in PRODUCTION_FORBIDDEN_PROMPT_PHRASES
                if phrase in lowered
            ]
            if found:
                raise ValueError(
                    "Production prompt contains preview-only language: "
                    + ", ".join(found)
                )
        return (
            prompt
            + "\nНе добавляй универсальную оговорку о комплектации, исходных "
            "данных или технической оценке в конец каждого ответа. Уточнение "
            "нужно только рядом с конкретным неподтверждённым утверждением.\n"
            + (
                "Работай как публичный AI-консультант РОСПАРК. Не называй "
                "сервис тестом, пилотом или демонстрационным режимом. "
                "Контактные данные собирает отдельная форма сайта, а не "
                "AI-модель.\n"
                if runtime_mode == "production"
                else ""
            )
        )

    return build


def guarded_boundary_for(base_boundary_for: Any) -> Any:
    def check(
        question: str,
        boundaries: dict[str, str],
    ) -> tuple[str | None, str | None]:
        template_id, answer = base_boundary_for(question, boundaries)
        if template_id == "BND-005" and is_composite_solution_request(question):
            return None, None
        return template_id, answer

    return check


def crm_payload_with_required_name(state: Any) -> tuple[dict[str, Any], list[str]]:
    object_value = state.object_name or state.object_type
    requirements = state.active_requirements()
    name = state.name or state.organization
    payload = {
        "name_or_organization": name,
        "contact": state.contact,
        "city": state.city,
        "object_type": state.object_type,
        "object_name": state.object_name,
        "topology": {
            "entrances": state.entrances,
            "exits": state.exits,
            "shared_passage": state.shared_passage,
            "parking_spaces": state.parking_spaces,
        },
        "requirements": requirements,
        "constraints": list(state.constraints),
        "consent": state.consent,
    }
    missing: list[str] = []
    if not name:
        missing.append("имя")
    if not payload["contact"]:
        missing.append("контакт")
    if not object_value:
        missing.append("объект или тип объекта")
    if not requirements:
        missing.append("содержательная потребность")
    if not payload["consent"]:
        missing.append("явное согласие")
    return payload, missing


def contains_unsupported_price_amount(question: str, answer: str) -> bool:
    return bool(PRICE_REQUEST_RE.search(question) and MONEY_AMOUNT_RE.search(answer))


UNCONFIRMED_CLAIM_RULES = (
    (
        "unconfirmed_mobile_app",
        re.compile(
            r"\b(?:использу\w*|есть|поддержива\w*|доступ\w*)\b.{0,80}"
            r"\bмобильн\w+\s+приложен\w*",
            re.I,
        ),
    ),
    (
        "unconfirmed_cargo_rules",
        re.compile(
            r"\b(?:ввести|задать|настроить|учитыва\w*|с\s+уч[её]том)\b.{0,100}"
            r"\b(?:объ[её]м\w+\s+груз\w*|весов\w+\s+огранич\w*)",
            re.I,
        ),
    ),
    (
        "unconfirmed_space_reservation",
        re.compile(
            r"\b(?:резервир\w+|зарезервир\w+)\s+мест\w*|"
            r"\bмест\w*\b.{0,50}\bдоступ\w*\s+только\s+сотрудник\w*",
            re.I,
        ),
    ),
    (
        "unconfirmed_multisite_management",
        re.compile(
            r"\b(?:объединя\w*|централизован\w*)\b.{0,100}"
            r"\b(?:нескольк\w+\s+(?:объект|здан|въезд)|"
            r"(?:объект|здан|въезд)\w*\s+из\s+одного\s+места)",
            re.I,
        ),
    ),
)


def unconfirmed_claim_flags(question: str, answer: str) -> list[str]:
    flags = [
        flag
        for flag, pattern in UNCONFIRMED_CLAIM_RULES
        if pattern.search(answer)
    ]
    if (
        re.search(r"\b(?:этап\w*|потом\s+добав|добав\w*\s+позже)\b", question, re.I)
        and re.search(
            r"^\s*да\b|\b(?:можно|подключаются|добавляются)\b.{0,80}"
            r"\b(?:позже|постепенно|затем|на\s+следующ\w+\s+этап)",
            answer,
            re.I,
        )
    ):
        flags.append("unconfirmed_phased_expansion")
    if (
        re.search(r"\bбез\b.{0,40}\b(?:кассир|охран)\w*", question, re.I)
        and re.search(
            r"^\s*да\b|\b(?:можно|позволя\w*)\b.{0,80}"
            r"\bбез\b.{0,40}\b(?:кассир|охран)\w*",
            answer,
            re.I,
        )
    ):
        flags.append("unconfirmed_unattended_operation")
    return flags


def guarded_fact_gate(base_fact_gate: Any) -> Any:
    def check(
        question: str,
        answer: str,
        route: str,
        template_id: str | None,
        expected_template: str | None,
        tool_success: bool,
    ) -> list[str]:
        flags = list(
            base_fact_gate(
                question,
                answer,
                route,
                template_id,
                expected_template,
                tool_success,
            )
        )
        if (
            contains_unsupported_price_amount(question, answer)
            and "unsupported_price_amount" not in flags
        ):
            flags.append("unsupported_price_amount")
        for flag in unconfirmed_claim_flags(question, answer):
            if flag not in flags:
                flags.append(flag)
        return flags

    return check


def load_legacy_module(ai_root: Path, v2_script: Path) -> ModuleType:
    scripts_dir = str((ai_root / "scripts").resolve())
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    spec = importlib.util.spec_from_file_location("rospark_ai_widget_legacy_v2", v2_script)
    if not spec or not spec.loader:
        raise ValueError("Не удалось загрузить legacy cascade v2.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def build_legacy_args(args: argparse.Namespace, output_dir: Path, endpoint: str) -> SimpleNamespace:
    return SimpleNamespace(
        questions=str(args.questions),
        output_dir=str(output_dir),
        faq=str(args.faq),
        v1_results="",
        only_v1_route_errors=False,
        case_ids=args.case_ids,
        model=args.model,
        endpoint=endpoint,
        timeout=args.timeout,
        max_tokens=args.max_tokens,
        parse_only=args.parse_only,
        resume=args.resume,
    )


def write_v3_manifest(
    output_dir: Path,
    args: argparse.Namespace,
    ai_root: Path,
    v2_script: Path,
    base_script: Path,
) -> None:
    manifest_path = output_dir / "cascade_v2_manifest.json"
    if not manifest_path.is_file():
        raise ValueError("Legacy run не создал manifest.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update(
        {
            "schema_version": 3,
            "adapter": str(Path(__file__).resolve()),
            "adapter_sha256": sha256(Path(__file__).resolve()),
            "legacy_v2_sha256": sha256(v2_script),
            "legacy_base_sha256": sha256(base_script),
            "source_ai_root": str(ai_root),
            "profile": str(DEFAULT_PROFILE),
            "profile_sha256": sha256(DEFAULT_PROFILE),
            "knowledge_files": [str(path) for path in DEFAULT_KNOWLEDGE],
            "knowledge_sha256": {str(path): sha256(path) for path in DEFAULT_KNOWLEDGE},
            "name_required": True,
            "external_sends": False,
            "max_enabled": False,
            "production_registry_enabled": False,
            "working_openclaw_modified": False,
        }
    )
    v3_path = output_dir / "cascade_v3_manifest.json"
    v3_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path.unlink()


def write_v3_validation(output_dir: Path) -> None:
    results_path = output_dir / "cascade_v2_results.jsonl"
    if not results_path.is_file():
        raise ValueError("Legacy run не создал файл результатов.")
    records = [
        json.loads(line)
        for line in results_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    checks = {
        "records_present": bool(records),
        "routes_correct": all(item.get("route_correct") is True for item in records),
        "questions_answered": all(
            item.get("user_question_answered") is True for item in records
        ),
        "fact_gate_clean": all(not item.get("dangerous_errors") for item in records),
        "model_errors_absent": all(not item.get("model_error") for item in records),
        "false_handoffs_absent": all(
            item.get("false_handoff") is False for item in records
        ),
        "external_sends_absent": all(
            not (item.get("tool_event") or {}).get("external_send")
            for item in records
        ),
    }
    named_missing_case = next(
        (item for item in records if item.get("case_id") == "I094"),
        None,
    )
    if named_missing_case:
        checks["missing_name_blocks_lead"] = (
            named_missing_case.get("crm_missing") == ["имя"]
            and named_missing_case.get("tool_event") is None
        )
    validation = {
        "schema_version": 3,
        "status": "passed" if all(checks.values()) else "failed",
        "records": len(records),
        "checks": checks,
        "failed_case_ids": [
            item["case_id"]
            for item in records
            if (
                item.get("route_correct") is not True
                or item.get("user_question_answered") is not True
                or item.get("dangerous_errors")
                or item.get("model_error")
                or item.get("false_handoff") is not False
                or (item.get("tool_event") or {}).get("external_send")
            )
        ],
    }
    (output_dir / "cascade_v3_validation.json").write_text(
        json.dumps(validation, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    legacy_summary = output_dir / "cascade_v2_summary.md"
    if legacy_summary.is_file():
        summary = legacy_summary.read_text(encoding="utf-8").replace(
            "# Результаты cascade v2",
            "# Результаты cascade v3",
            1,
        )
        summary += (
            "\n## Проверка адаптера v3\n\n"
            f"- статус: `{validation['status']}`;\n"
            f"- проверок: {sum(checks.values())}/{len(checks)};\n"
            "- внешних отправок: 0.\n"
        )
        (output_dir / "cascade_v3_summary.md").write_text(
            summary,
            encoding="utf-8",
        )
    if validation["status"] != "passed":
        raise ValueError(
            "Проверка cascade v3 не пройдена: "
            + ", ".join(name for name, passed in checks.items() if not passed)
        )


def run(args: argparse.Namespace) -> int:
    ai_root = args.ai_root.expanduser().resolve()
    v2_script, base_script = verify_legacy_engine(ai_root)
    questions = require_file(args.questions, "Набор вопросов")
    faq = require_file(args.faq, "FAQ")
    require_file(DEFAULT_PROFILE, "Профиль агента")
    for path in DEFAULT_KNOWLEDGE:
        require_file(path, "Файл базы знаний")

    if sha256(questions) != FULL_230_QUESTIONS_SHA256:
        raise ValueError("Набор 230 вопросов не совпадает с утверждённым контрольным снимком.")
    if args.model != ALLOWED_MODEL:
        raise ValueError(f"Разрешена только локальная модель {ALLOWED_MODEL}.")

    endpoint = require_loopback_endpoint(args.endpoint)
    output_dir = require_output_outside_ai_root(args.output_dir, ai_root)
    module = load_legacy_module(ai_root, v2_script)
    module.PROFILE = DEFAULT_PROFILE
    module.KNOWLEDGE_FILES = DEFAULT_KNOWLEDGE
    module.parse_template_file = parse_current_template_file
    module.BOUNDARY_PATTERNS = v3_boundary_patterns()
    module.responder_prompt = guarded_responder_prompt(module.responder_prompt)
    module.boundary_for = guarded_boundary_for(module.boundary_for)
    module.crm_payload = crm_payload_with_required_name
    module.fact_gate = guarded_fact_gate(module.fact_gate)

    legacy_args = build_legacy_args(args, output_dir, endpoint)
    result = int(module.run(legacy_args))
    if not args.parse_only and result == 0:
        write_v3_validation(output_dir)
        write_v3_manifest(output_dir, args, ai_root, v2_script, base_script)
    return result


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--questions", required=True, type=Path)
    result.add_argument("--output-dir", required=True, type=Path)
    result.add_argument("--faq", type=Path, default=DEFAULT_FAQ)
    result.add_argument("--ai-root", type=Path, default=DEFAULT_AI_ROOT)
    result.add_argument("--case-ids")
    result.add_argument("--model", default=ALLOWED_MODEL)
    result.add_argument("--endpoint", default="http://127.0.0.1:11434")
    result.add_argument("--timeout", type=float, default=240)
    result.add_argument("--max-tokens", type=int, default=180)
    result.add_argument("--parse-only", action="store_true")
    result.add_argument("--resume", action="store_true")
    return result


def main() -> int:
    try:
        return run(parser().parse_args())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"cascade v3 stopped: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
