#!/usr/bin/env python3
"""Validate SERP observations, append history and build a compact report."""

from __future__ import annotations

import argparse
import csv
import json
import os
import tempfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CORE = ROOT / "reports/seo/rospark_semantic_core_approved_2026-07-30.csv"
DEFAULT_HISTORY = ROOT / "reports/seo/rospark_search_position_history.csv"
DEFAULT_OUTPUT = ROOT / "generated/seo_position_reports"
ENGINES = ("Yandex", "Google")
STATUSES = {"found", "not_found_top_100", "captcha", "unavailable"}
ROSPARK_HOSTS = {
    "роспарк.рф",
    "www.роспарк.рф",
    "xn--80aukedde.xn--p1ai",
    "www.xn--80aukedde.xn--p1ai",
}
HISTORY_FIELDS = (
    "measurement_datetime_msk",
    "report_period",
    "search_engine",
    "region",
    "device",
    "scope",
    "cluster",
    "query",
    "priority",
    "target_page",
    "result_url",
    "position_type",
    "current_position",
    "previous_position",
    "change",
    "impressions",
    "clicks",
    "ctr",
    "average_position",
    "status",
    "note",
)


class PositionReportError(ValueError):
    """Expected validation failure."""


def read_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def load_core(path: Path) -> list[dict[str, str]]:
    rows = read_rows(path)
    if len(rows) != 54:
        raise PositionReportError(f"SEMANTIC_CORE_EXPECTED_54:GOT_{len(rows)}")
    if any(row.get("status") != "approved" for row in rows):
        raise PositionReportError("SEMANTIC_CORE_HAS_UNAPPROVED_ROWS")
    if len({row.get("query", "").strip().casefold() for row in rows}) != 54:
        raise PositionReportError("SEMANTIC_CORE_QUERIES_NOT_UNIQUE")
    return rows


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary.write(content)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_name = temporary.name
        os.replace(temporary_name, path)
    finally:
        if temporary_name and Path(temporary_name).exists():
            Path(temporary_name).unlink()


def parse_position(value: Any, status: str) -> int | None:
    if status != "found":
        return None
    try:
        position = int(value)
    except (TypeError, ValueError) as exc:
        raise PositionReportError("FOUND_POSITION_MISSING") from exc
    if position < 1 or position > 100:
        raise PositionReportError("FOUND_POSITION_OUT_OF_RANGE")
    return position


def validate_result_url(value: Any, status: str) -> str:
    result_url = str(value or "").strip()
    if status != "found":
        return result_url
    host = (urlparse(result_url).hostname or "").casefold()
    if host not in ROSPARK_HOSTS:
        raise PositionReportError(f"FOUND_URL_NOT_ROSPARK:{host or 'missing'}")
    return result_url


def load_observations(path: Path, approved: Mapping[str, dict[str, str]]) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    measured_at = str(payload.get("measured_at_msk") or "").strip()
    try:
        datetime.fromisoformat(measured_at)
    except ValueError as exc:
        raise PositionReportError("MEASURED_AT_MSK_INVALID") from exc
    region = str(payload.get("region") or "Москва").strip()
    device = str(payload.get("device") or "desktop").strip()
    raw = payload.get("observations")
    if not isinstance(raw, list):
        raise PositionReportError("OBSERVATIONS_NOT_LIST")
    observations: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in raw:
        if not isinstance(item, Mapping):
            raise PositionReportError("OBSERVATION_NOT_OBJECT")
        query = str(item.get("query") or "").strip()
        query_key = query.casefold()
        if query_key not in approved:
            raise PositionReportError(f"QUERY_NOT_APPROVED:{query}")
        engine = str(item.get("search_engine") or "").strip()
        if engine not in ENGINES:
            raise PositionReportError(f"SEARCH_ENGINE_INVALID:{engine}")
        key = (query_key, engine)
        if key in seen:
            raise PositionReportError(f"DUPLICATE_OBSERVATION:{query}:{engine}")
        seen.add(key)
        status = str(item.get("status") or "").strip()
        if status not in STATUSES:
            raise PositionReportError(f"STATUS_INVALID:{status}")
        observations.append(
            {
                "query": query,
                "query_key": query_key,
                "search_engine": engine,
                "status": status,
                "position": parse_position(item.get("position"), status),
                "result_url": validate_result_url(item.get("result_url"), status),
                "note": str(item.get("note") or "").replace("\n", " ").strip()[:300],
            }
        )
    expected_count = len(approved) * len(ENGINES)
    if len(observations) != expected_count:
        raise PositionReportError(
            f"OBSERVATIONS_EXPECTED_{expected_count}:GOT_{len(observations)}"
        )
    return {
        "measured_at_msk": measured_at,
        "region": region,
        "device": device,
        "observations": observations,
    }


def numeric(value: str | None) -> int | None:
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def position_history(
    rows: Iterable[Mapping[str, str]], *, query: str, engine: str, region: str, device: str
) -> list[int]:
    matched: list[tuple[str, int]] = []
    for row in rows:
        if row.get("position_type") != "manual_serp":
            continue
        if row.get("query", "").casefold() != query.casefold():
            continue
        if row.get("search_engine") != engine:
            continue
        if row.get("region") != region or row.get("device") != device:
            continue
        value = numeric(row.get("current_position"))
        if value is not None:
            matched.append((row.get("measurement_datetime_msk", ""), value))
    matched.sort(key=lambda item: item[0])
    return [value for _, value in matched]


def format_rank(position: int | None, status: str) -> str:
    if position is None:
        return ">100" if status == "not_found_top_100" else f"нет измерения ({status})"
    page = (position - 1) // 10 + 1
    place = (position - 1) % 10 + 1
    return f"№{position} (стр. {page}, место {place})"


def format_delta(delta: int | None) -> str:
    if delta is None:
        return "первое измерение"
    if delta > 0:
        return f"+{delta}"
    return str(delta)


def build(args: argparse.Namespace) -> dict[str, Any]:
    core = load_core(args.core)
    approved = {row["query"].strip().casefold(): row for row in core}
    payload = load_observations(args.observations, approved)
    history = read_rows(args.history)
    measured_at = payload["measured_at_msk"]
    region = payload["region"]
    device = payload["device"]
    if any(
        row.get("position_type") == "manual_serp"
        and row.get("measurement_datetime_msk") == measured_at
        and row.get("region") == region
        and row.get("device") == device
        for row in history
    ):
        raise PositionReportError("MEASUREMENT_ALREADY_RECORDED")
    lookup = {
        (item["query_key"], item["search_engine"]): item
        for item in payload["observations"]
    }
    new_rows: list[dict[str, str]] = []
    report_values: dict[tuple[str, str], dict[str, Any]] = {}
    for core_row in core:
        query = core_row["query"].strip()
        for engine in ENGINES:
            observation = lookup.get((query.casefold(), engine))
            if observation is None:
                observation = {
                    "query": query,
                    "search_engine": engine,
                    "status": "unavailable",
                    "position": None,
                    "result_url": "",
                    "note": "measurement missing from run",
                }
            old_positions = position_history(
                history,
                query=query,
                engine=engine,
                region=region,
                device=device,
            )
            current = observation["position"]
            previous = old_positions[-1] if old_positions else None
            delta = previous - current if previous is not None and current is not None else None
            best_values = old_positions + ([current] if current is not None else [])
            best = min(best_values) if best_values else None
            report_values[(query.casefold(), engine)] = {
                "status": observation["status"],
                "current": current,
                "previous": previous,
                "delta": delta,
                "best": best,
            }
            new_rows.append(
                {
                    "measurement_datetime_msk": measured_at,
                    "report_period": measured_at[:10],
                    "search_engine": engine,
                    "region": region,
                    "device": device,
                    "scope": core_row.get("scope", ""),
                    "cluster": core_row.get("cluster", ""),
                    "query": query,
                    "priority": core_row.get("priority", ""),
                    "target_page": core_row.get("target_page", ""),
                    "result_url": observation["result_url"],
                    "position_type": "manual_serp",
                    "current_position": "" if current is None else str(current),
                    "previous_position": "" if previous is None else str(previous),
                    "change": "" if delta is None else str(delta),
                    "impressions": "",
                    "clicks": "",
                    "ctr": "",
                    "average_position": "",
                    "status": observation["status"],
                    "note": observation["note"],
                }
            )
    args.history.parent.mkdir(parents=True, exist_ok=True)
    write_header = not args.history.exists() or args.history.stat().st_size == 0
    with args.history.open("a", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=HISTORY_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerows(new_rows)

    lines = [
        "РОСПАРК — позиции сайта в поиске",
        f"Измерение: {measured_at}",
        f"Регион: {region}; устройство: {device}",
        "Формат: текущая позиция; изменение к прошлому замеру; лучшая позиция.",
        "",
    ]
    found_count = 0
    for index, core_row in enumerate(core, 1):
        query = core_row["query"].strip()
        engine_parts = []
        for engine in ENGINES:
            value = report_values[(query.casefold(), engine)]
            if value["current"] is not None:
                found_count += 1
            current_text = format_rank(value["current"], value["status"])
            previous_text = "—" if value["previous"] is None else f"№{value['previous']}"
            best_text = "—" if value["best"] is None else f"№{value['best']}"
            engine_name = "Яндекс" if engine == "Yandex" else "Google"
            engine_parts.append(
                f"{engine_name}: {current_text}; было {previous_text}; "
                f"{format_delta(value['delta'])}; лучшая {best_text}"
            )
        lines.append(f"{index}. {query}")
        lines.append("   " + " | ".join(engine_parts))
    lines.extend(
        [
            "",
            f"Проверено запросов: {len(core)}.",
            f"Найдено позиций: {found_count} из {len(core) * len(ENGINES)}.",
            "CAPTCHA и недоступные измерения не заменяются предположениями.",
        ]
    )
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = measured_at[:10] + "_" + measured_at[11:16].replace(":", "")
    report_path = output_dir / f"{stamp}_search_positions.txt"
    json_path = output_dir / f"{stamp}_search_positions.json"
    atomic_write(report_path, "\n".join(lines) + "\n")
    atomic_write(
        json_path,
        json.dumps(
            {
                "measured_at_msk": measured_at,
                "queries": len(core),
                "observations_expected": len(core) * len(ENGINES),
                "observations_received": len(payload["observations"]),
                "positions_found": found_count,
                "report_path": str(report_path),
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
    )
    return {
        "status": "built",
        "report_path": str(report_path),
        "json_path": str(json_path),
        "history_rows_appended": len(new_rows),
    }


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--observations", type=Path, required=True)
    value.add_argument("--core", type=Path, default=DEFAULT_CORE)
    value.add_argument("--history", type=Path, default=DEFAULT_HISTORY)
    value.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    return value


def main() -> int:
    try:
        result = build(parser().parse_args())
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
