#!/usr/bin/env python3
"""Deterministic context gate for AI-widget fast routes.

The module is intentionally model-free.  It derives a small request-local
conversation state from the already supplied widget history, records the
current turn before routing, resolves an active assistant question, preserves
explicit project facts, and then decides whether a fast-route candidate may be
visible.  It does not call Qwen, Codex, CRM, MAX, or external services.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Iterable


SCHEMA_VERSION = "ROSPARK_FAST_ROUTE_CONTEXT_GATE_V1_1"
TRACE_VERSION = "ROSPARK_FAST_ROUTE_TRACE_V1_1"
ALLOWED_MODES = {"off", "shadow_only", "context_gated", "visible_legacy"}

CONTEXT_INDEPENDENT_ROUTES = {
    "security",
    "arithmetic",
    "identity",
    "exact_contact",
    "exact_known_link",
    "explicit_direct_handoff",
    "direct_handoff",
}
CONTEXT_DEPENDENT_ROUTES = {
    "boundary",
    "faq",
    "price",
    "compatibility",
    "availability",
    "technical_fact",
    "product_recommendation",
    "contextual_link",
    "solution",
}

QUESTION_RE = re.compile(r"\?")
LINK_REQUEST_RE = re.compile(r"\b(?:ссылк\w*|где\s+(?:посмотреть|найти)|покажи\w*\s+страниц\w*)\b", re.I)
HANDOFF_RE = re.compile(
    r"\b(?:зови|позови|соедини|переключи)\w*\b.{0,40}"
    r"\b(?:человек|менеджер|специалист)\w*\b|"
    r"\b(?:хочу|давайте)\b.{0,40}\b(?:менеджер|специалист|человек)\w*\b",
    re.I,
)
ARITHMETIC_RE = re.compile(r"^\s*(?:сколько\s+будет\s*)?-?\d+\s*[+\-*/]\s*-?\d+\s*[?!.]*\s*$", re.I)
STOP_QUESTIONS_RE = re.compile(
    r"\b(?:стоп|не\s+задавай\w*\s+(?:больше\s+)?вопрос\w*|"
    r"забудь\w*\s+предыдущ\w*\s+вопрос\w*)\b",
    re.I,
)

BOUNDARY_SUBJECT_RE = re.compile(
    r"\b(?:интернет\w*|сервер\w*|связ\w*|электропитан\w*|электрич\w*|"
    r"питан\w*|оборудован\w*|шлагбаум\w*)\b",
    re.I,
)
BOUNDARY_FAILURE_RE = re.compile(
    r"\b(?:отключ\w*|пропа(?:д|л|в)\w*|недоступ\w*|потер\w*|отказ\w*|"
    r"авари\w*|сломал\w*|не\s+работ\w*|перестан\w*\s+работ\w*)\b|"
    r"\bбез\s+(?:интернет\w*|связ\w*|электропитан\w*|электрич\w*|питан\w*)\b",
    re.I,
)
BOUNDARY_QUESTION_FRAME_RE = re.compile(
    r"\b(?:что\s+(?:будет|произойд[её]т)|как\s+(?:работает|выехать|заехать)|"
    r"будет\s+ли|можно\s+ли|что\s+делать|как\s+быть)\b|\?",
    re.I,
)
PROJECT_FACT_FRAME_RE = re.compile(
    r"\b(?:есть|уже|пока|протянут\w*|подвед\w*|подключ\w*|стоят|"
    r"наход\w*|будет\s+наход\w*|с\s+нуля|автоматизац\w*\s+нет)\b",
    re.I,
)

CABLING_GOAL_RE = re.compile(
    r"\b(?:кабел\w*|кабельн\w*|монтаж\w*|пролож\w*|подключ\w*|с\s+нуля)\b",
    re.I,
)
CABLING_ANSWER_RE = re.compile(
    r"\b(?:с\s+нуля|автоматизац\w*\s+нет|только\s+шлагбаум\w*|"
    r"кабел\w*\s+(?:есть|нет|протянут\w*)|силов\w*|слаботоч\w*|"
    r"питан\w*|шлагбаум\w*\s+(?:уже\s+)?(?:стоят|подключ\w*))\b",
    re.I,
)

GOAL_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("existing_system_and_cabling", CABLING_GOAL_RE),
    ("object_type", re.compile(r"\bкакой\s+(?:это\s+)?объект|тип\w*\s+объект", re.I)),
    ("passage_count", re.compile(r"\bсколько\s+(?:въезд|выезд|проезд)", re.I)),
    ("user_categories", re.compile(r"\bкто\s+(?:будет\s+)?(?:пользоваться|заезжать|проезжать)", re.I)),
    ("payment_scenario", re.compile(r"\b(?:как|кто)\s+(?:будет\s+)?оплач", re.I)),
    ("traffic_volume", re.compile(r"\bсколько\s+(?:машин|автомобил)", re.I)),
)


def _compact(value: str) -> str:
    return " ".join(str(value or "").split())


def _stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}-{digest}"


def require_mode(mode: str) -> str:
    value = str(mode or "").strip()
    if value not in ALLOWED_MODES:
        raise ValueError("invalid_fast_route_mode")
    return value


def route_category(route: str) -> str:
    if route in CONTEXT_INDEPENDENT_ROUTES:
        return "context_independent"
    if route in CONTEXT_DEPENDENT_ROUTES:
        return "context_dependent"
    return "not_fast_route"


def classify_question_goal(text: str) -> str:
    for name, pattern in GOAL_PATTERNS:
        if pattern.search(text):
            return name
    return "unknown"


def boundary_semantics(text: str) -> dict[str, bool]:
    subject = bool(BOUNDARY_SUBJECT_RE.search(text))
    failure = bool(BOUNDARY_FAILURE_RE.search(text))
    question_frame = bool(BOUNDARY_QUESTION_FRAME_RE.search(text))
    project_fact = bool(PROJECT_FACT_FRAME_RE.search(text))
    explicit = subject and failure and question_frame and not (
        project_fact and not QUESTION_RE.search(text)
    )
    return {
        "subject_match": subject,
        "failure_predicate_match": failure,
        "question_frame_match": question_frame,
        "project_fact_frame_match": project_fact,
        "explicit_intent_match": explicit,
    }


def extract_project_facts(text: str, question_goal: str) -> dict[str, Any]:
    lowered = text.casefold()
    facts: dict[str, Any] = {}
    if question_goal == "existing_system_and_cabling" or CABLING_ANSWER_RE.search(text):
        if "с нуля" in lowered or re.search(r"автоматизац\w*\s+нет", text, re.I):
            facts["existing_automation"] = False
        if re.search(r"шлагбаум\w*.*(?:стоят|подключ\w*)|(?:стоят|подключ\w*).*шлагбаум", text, re.I):
            facts["existing_barriers"] = True
        if re.search(r"(?:силов\w*|кабел\w*\s+питан\w*|питан\w*\s+кабел\w*)", text, re.I):
            facts["barrier_power_cabling"] = True
        if re.search(r"(?:слаботоч\w*|управляющ\w*\s+кабел\w*)\s+нет", text, re.I):
            facts["control_cabling"] = False
        if re.search(r"(?:сетев\w*\s+кабел\w*|локальн\w*\s+сет\w*|ethernet)\s+нет", text, re.I):
            facts["network_cabling"] = False
        if facts.get("existing_automation") is False and facts.get("existing_barriers") is True:
            facts["modernization_or_new_build"] = "automation_from_scratch_with_existing_barriers"
        elif facts.get("existing_automation") is False:
            facts["modernization_or_new_build"] = "automation_from_scratch"
    return facts


def _last_assistant_question(messages: Iterable[dict[str, str]]) -> dict[str, str] | None:
    items = list(messages)
    for index in range(len(items) - 2, -1, -1):
        item = items[index]
        if item.get("role") != "assistant":
            continue
        text = _compact(item.get("content", ""))
        if "?" not in text:
            continue
        question = text.rsplit("?", 1)[0].split(".")[-1].strip() + "?"
        return {
            "question_id": _stable_id("question", str(index), text),
            "question_goal": classify_question_goal(question),
            "question_text": question,
            "status": "active",
        }
    return None


def _explicit_independent_command(text: str) -> str | None:
    if STOP_QUESTIONS_RE.search(text):
        return "stop_or_forget_open_question"
    if HANDOFF_RE.search(text):
        return "explicit_direct_handoff"
    if ARITHMETIC_RE.search(text):
        return "arithmetic"
    if LINK_REQUEST_RE.search(text):
        return "contextual_link"
    return None


def resolve_relation(text: str, open_question: dict[str, str] | None) -> tuple[str, str, bool]:
    if not open_question:
        return "standalone_utterance", "no_active_open_question", False
    explicit_command = _explicit_independent_command(text)
    if explicit_command:
        return "independent_command", explicit_command, False
    semantics = boundary_semantics(text)
    if semantics["explicit_intent_match"]:
        return "independent_question", "explicit_boundary_question", False
    goal = open_question["question_goal"]
    if goal == "existing_system_and_cabling" and CABLING_ANSWER_RE.search(text):
        return "answer_to_previous_question", "cabling_answer_validator", True
    if "?" not in text and len(text.split()) <= 40:
        return "answer_to_previous_question", "short_answer_validator", True
    return "independent_question", "question_or_unresolved_validator", False


@dataclass(frozen=True)
class TurnContext:
    conversation_id: str
    message_id: str
    parent_message_id: str | None
    request_id: str | None
    current_turn_id: str
    turn_ingested: bool
    message_persisted: bool
    open_question_resolved: bool
    state_updated: bool
    relation: str
    relation_validator: str
    intent: str
    action_type: str
    current_turn_is_question: bool
    open_question: dict[str, Any] | None
    answered_question_ids: tuple[str, ...]
    facts_before: dict[str, Any]
    facts_after: dict[str, Any]
    fact_mutations: tuple[dict[str, Any], ...]
    boundary_semantics: dict[str, bool]
    explicit_command: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": SCHEMA_VERSION,
            "conversation_id": self.conversation_id,
            "message_id": self.message_id,
            "parent_message_id": self.parent_message_id,
            "request_id": self.request_id,
            "current_turn_id": self.current_turn_id,
            "turn_ingested": self.turn_ingested,
            "message_persisted": self.message_persisted,
            "open_question_resolved": self.open_question_resolved,
            "state_updated": self.state_updated,
            "relation_to_context": self.relation,
            "relation_validator": self.relation_validator,
            "intent": self.intent,
            "action_type": self.action_type,
            "current_turn_is_question": self.current_turn_is_question,
            "open_question": self.open_question,
            "answered_question_ids": list(self.answered_question_ids),
            "facts_before": self.facts_before,
            "facts_after": self.facts_after,
            "fact_mutations": list(self.fact_mutations),
            "boundary_semantics": self.boundary_semantics,
            "explicit_command": self.explicit_command,
        }


@dataclass(frozen=True)
class FastRouteDecision:
    candidate_route: str
    candidate_template_id: str | None
    category: str
    mode: str
    eligible: bool
    visible: bool
    next_route: str
    reason_codes: tuple[str, ...]
    context: TurnContext
    topic_match: bool
    command_match: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": SCHEMA_VERSION,
            "candidate_route": self.candidate_route,
            "candidate_template_id": self.candidate_template_id,
            "category": self.category,
            "mode": self.mode,
            "eligible": self.eligible,
            "visible": self.visible,
            "next_route": self.next_route,
            "current_turn_id": self.context.current_turn_id,
            "turn_ingested": self.context.turn_ingested,
            "message_persisted": self.context.message_persisted,
            "open_question_resolved": self.context.open_question_resolved,
            "state_updated": self.context.state_updated,
            "relation_to_context": self.context.relation,
            "open_question": self.context.open_question,
            "intent": self.context.intent,
            "action_type": self.context.action_type,
            "explicit_intent_match": self.context.boundary_semantics["explicit_intent_match"],
            "failure_predicate_match": self.context.boundary_semantics["failure_predicate_match"],
            "topic_match": self.topic_match,
            "command_match": self.command_match,
            "reason_codes": list(self.reason_codes),
        }


@dataclass
class FastRouteContextGate:
    mode_by_route: dict[str, str] = field(default_factory=dict)
    trace_version: str = TRACE_VERSION

    def __post_init__(self) -> None:
        self.mode_by_route = {
            str(route): require_mode(mode)
            for route, mode in self.mode_by_route.items()
        }

    def ingest(
        self,
        messages: list[dict[str, str]],
        *,
        conversation_id: str = "request-local",
        message_id: str = "message-local",
        parent_message_id: str | None = None,
        request_id: str | None = None,
        message_persisted: bool = True,
        facts_before: dict[str, Any] | None = None,
    ) -> TurnContext:
        if not messages or messages[-1].get("role") != "user":
            raise ValueError("last_message_must_be_user")
        text = _compact(messages[-1].get("content", ""))
        if not text:
            raise ValueError("empty_current_turn")
        current_turn_id = _stable_id("turn", conversation_id, str(len(messages)), text)
        open_question = _last_assistant_question(messages)
        relation, validator, answers_open_question = resolve_relation(text, open_question)
        goal = open_question["question_goal"] if open_question else "unknown"
        extracted = extract_project_facts(text, goal)
        before = dict(facts_before or {})
        after = dict(before)
        mutations: list[dict[str, Any]] = []
        for field_name, value in extracted.items():
            previous = after.get(field_name)
            after[field_name] = value
            mutations.append({
                "field": field_name,
                "previous": previous,
                "value": value,
                "source_turn_id": current_turn_id,
                "confidence": "explicit",
            })
        semantics = boundary_semantics(text)
        explicit_command = _explicit_independent_command(text)
        if relation == "answer_to_previous_question":
            intent = "provide_project_information"
            action_type = "remember_fact_and_continue"
        elif semantics["explicit_intent_match"]:
            intent = "ask_boundary_question"
            action_type = "answer_explicit_question"
        elif explicit_command:
            intent = explicit_command
            action_type = "execute_explicit_command"
        elif "?" in text:
            intent = "ask_question"
            action_type = "answer_directly"
        else:
            intent = "provide_project_information" if extracted else "continue_dialogue"
            action_type = "remember_fact_and_continue" if extracted else "continue_dialogue"
        answered_ids = (
            (open_question["question_id"],)
            if open_question and answers_open_question
            else ()
        )
        rendered_question = dict(open_question) if open_question else None
        if rendered_question and answers_open_question:
            rendered_question["status"] = "answered"
            rendered_question["answered_by_turn_id"] = current_turn_id
        return TurnContext(
            conversation_id=conversation_id,
            message_id=message_id,
            parent_message_id=parent_message_id,
            request_id=request_id,
            current_turn_id=current_turn_id,
            turn_ingested=True,
            message_persisted=bool(message_persisted),
            open_question_resolved=(open_question is None or relation != "unknown"),
            state_updated=True,
            relation=relation,
            relation_validator=validator,
            intent=intent,
            action_type=action_type,
            current_turn_is_question="?" in text,
            open_question=rendered_question,
            answered_question_ids=answered_ids,
            facts_before=before,
            facts_after=after,
            fact_mutations=tuple(mutations),
            boundary_semantics=semantics,
            explicit_command=explicit_command,
        )

    def decide(
        self,
        candidate_route: str,
        candidate_template_id: str | None,
        context: TurnContext,
    ) -> FastRouteDecision:
        category = route_category(candidate_route)
        mode = self.mode_by_route.get(candidate_route, "context_gated")
        reasons: list[str] = []
        eligible = True
        topic_match = True
        command_match = True

        if not context.turn_ingested:
            eligible = False
            reasons.append("fast_route_before_ingestion")
        if not context.message_persisted:
            eligible = False
            reasons.append("fast_route_before_message_persistence")
        if not context.open_question_resolved:
            eligible = False
            reasons.append("fast_route_before_open_question_resolution")
        if not context.state_updated:
            eligible = False
            reasons.extend(("fast_route_before_state_update", "state_update_skipped_by_fast_route"))
        if category == "not_fast_route":
            eligible = False
            reasons.append("not_a_fast_route")
        if category == "context_dependent" and (
            context.relation == "unknown" or context.intent == "unknown"
        ):
            eligible = False
            reasons.append("fast_route_context_unknown")
        if category == "context_dependent" and context.relation == "answer_to_previous_question":
            eligible = False
            reasons.extend((
                "open_question_answer_has_priority",
                "fast_route_blocked_by_open_question",
                "open_question_hijacked_by_fast_route",
            ))
            if candidate_route == "boundary":
                reasons.append("project_fact_not_boundary_request")

        if candidate_route == "boundary":
            semantics = context.boundary_semantics
            topic_match = semantics["subject_match"] and semantics["failure_predicate_match"]
            command_match = semantics["explicit_intent_match"]
            if not semantics["failure_predicate_match"] and semantics["subject_match"]:
                eligible = False
                reasons.append("keyword_only_boundary_match")
            if not semantics["explicit_intent_match"]:
                eligible = False
                reasons.append("boundary_intent_not_present")
            if semantics["project_fact_frame_match"] and not semantics["explicit_intent_match"]:
                eligible = False
                reasons.append("project_fact_misclassified_as_boundary_request")
        elif candidate_route in {
            "contextual_link",
            "direct_handoff",
            "explicit_direct_handoff",
            "arithmetic",
        }:
            # These candidates are emitted only by their narrow deterministic
            # recognizers in the gateway.  They remain context-independent, but
            # still reach this point only after ingestion and state update.
            command_match = True

        if not topic_match:
            eligible = False
            reasons.append("fast_route_topic_mismatch")
        if not command_match:
            eligible = False
            reasons.append("fast_route_command_mismatch")
        invariant_passed = (
            context.turn_ingested
            and context.message_persisted
            and context.open_question_resolved
            and context.state_updated
        )
        if mode == "off":
            visible = False
            reasons.append("fast_route_mode_off")
        elif mode == "shadow_only":
            visible = False
            reasons.append("fast_route_shadow_only")
        elif mode == "visible_legacy":
            # Legacy semantics may bypass contextual eligibility, but never the
            # mandatory ingestion/persistence/state invariants.
            visible = invariant_passed
            reasons.append("visible_legacy_route_used")
        else:
            visible = eligible
        if not reasons:
            reasons.append("fast_route_context_gate_passed")
        return FastRouteDecision(
            candidate_route=candidate_route,
            candidate_template_id=candidate_template_id,
            category=category,
            mode=mode,
            eligible=eligible,
            visible=visible,
            next_route=candidate_route if visible else "primary_conversation_path",
            reason_codes=tuple(dict.fromkeys(reasons)),
            context=context,
            topic_match=topic_match,
            command_match=command_match,
        )

    def telemetry(
        self,
        *,
        runtime_release: str,
        route: str,
        template_id: str | None,
        decision: FastRouteDecision | None,
        visible_response_source: str,
    ) -> dict[str, Any]:
        context = decision.context if decision else None
        return {
            "trace_version": self.trace_version,
            "runtime_release": runtime_release,
            "conversation_id": context.conversation_id if context else None,
            "message_id": context.message_id if context else None,
            "parent_message_id": context.parent_message_id if context else None,
            "request_id": context.request_id if context else None,
            "gateway_pid": None,
            "gateway_version": runtime_release,
            "turn_ingestion_version": SCHEMA_VERSION,
            "context_integrity_version": SCHEMA_VERSION,
            "sales_controller_version": "not_invoked_by_gateway",
            "engineering_lab_version": "not_invoked_by_gateway",
            "response_repair_version": "not_invoked_by_gateway",
            "evaluation_integrity_version": "not_invoked_by_gateway",
            "fast_route_gate_version": SCHEMA_VERSION,
            "route": route,
            "template_id": template_id,
            "candidate_routes": [decision.candidate_route] if decision else [],
            "candidate_route": decision.candidate_route if decision else None,
            "candidate_template_id": decision.candidate_template_id if decision else None,
            "selected_route": route,
            "route_mode": decision.mode if decision else None,
            "route_reason_codes": list(decision.reason_codes) if decision else [],
            "current_turn_id": context.current_turn_id if context else None,
            "relation_to_context": context.relation if context else "unknown",
            "open_question_id": (
                context.open_question.get("question_id")
                if context and context.open_question
                else None
            ),
            "open_question_goal": (
                context.open_question.get("question_goal")
                if context and context.open_question
                else None
            ),
            "fast_route_eligible": decision.eligible if decision else False,
            "reason_codes": list(decision.reason_codes) if decision else [],
            "turn_ingested": context.turn_ingested if context else False,
            "message_persisted": context.message_persisted if context else False,
            "open_question_resolved": (
                context.open_question_resolved if context else False
            ),
            "state_updated": context.state_updated if context else False,
            "final_context_consistency": decision.eligible if decision else True,
            "visible_response_source": visible_response_source,
        }
