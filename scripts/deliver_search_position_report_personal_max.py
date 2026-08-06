#!/usr/bin/env python3
"""Deliver a long search-position report to the director's personal MAX safely."""

from __future__ import annotations

import argparse
import fcntl
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_REPORT_ROOT = (ROOT / "generated/seo_position_reports").resolve()
POCPARK_AI_ROOT = Path("/Volumes/POCPARK_AI_DATA/POCPARK_AI")
DEFAULT_SENDER = POCPARK_AI_ROOT / "scripts/send_daily_email_report_max.py"
DEFAULT_DELIVERY_LOG = POCPARK_AI_ROOT / "generated/daily_reports/max_personal_delivery.jsonl"
DEFAULT_STATE = ROOT / "generated/seo_position_reports/personal_max_delivery.jsonl"
DEFAULT_LOCK = ROOT / "generated/seo_position_reports/personal_max_delivery.lock"
MAX_PART_CHARS = 3300
APPROVAL = "recurring-personal-search-position-report"


class DeliveryError(ValueError):
    """Expected safe-delivery failure."""


def jsonl_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            rows.append(value)
    return rows


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def split_report(text: str, limit: int = MAX_PART_CHARS) -> list[str]:
    lines = text.splitlines()
    parts: list[str] = []
    current: list[str] = []
    current_size = 0
    for line in lines:
        addition = len(line) + 1
        if addition > limit:
            raise DeliveryError("REPORT_LINE_TOO_LONG")
        if current and current_size + addition > limit:
            parts.append("\n".join(current).strip() + "\n")
            current = []
            current_size = 0
        current.append(line)
        current_size += addition
    if current:
        parts.append("\n".join(current).strip() + "\n")
    return parts


def already_sent(log_path: Path, report_path: Path) -> bool:
    expected = str(report_path)
    return any(
        row.get("status") == "sent"
        and row.get("recipient") == "director_only"
        and row.get("max_send_called") is True
        and row.get("report_path") == expected
        and bool(row.get("message_id"))
        for row in jsonl_rows(log_path)
    )


def validate_report(path: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(ALLOWED_REPORT_ROOT):
        raise DeliveryError("REPORT_OUTSIDE_ALLOWED_ROOT")
    if not resolved.is_file() or resolved.suffix.casefold() != ".txt":
        raise DeliveryError("REPORT_FILE_INVALID")
    if resolved.stat().st_size <= 0:
        raise DeliveryError("REPORT_FILE_EMPTY")
    return resolved


def deliver(args: argparse.Namespace) -> dict[str, Any]:
    report_path = validate_report(args.report_path)
    if args.send and args.approval != APPROVAL:
        raise DeliveryError("PERSONAL_RECURRING_APPROVAL_REQUIRED")
    if not args.sender_script.is_file():
        raise DeliveryError("PERSONAL_MAX_SENDER_MISSING")
    parts = split_report(report_path.read_text(encoding="utf-8"))
    args.lock.parent.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    with args.lock.open("a+", encoding="utf-8") as lock_stream:
        fcntl.flock(lock_stream.fileno(), fcntl.LOCK_EX)
        for index, content in enumerate(parts, 1):
            part_path = report_path.with_name(
                f"{report_path.stem}.part-{index:02d}-of-{len(parts):02d}.txt"
            )
            part_path.write_text(
                f"РОСПАРК — позиции сайта в поиске — часть {index}/{len(parts)}\n\n"
                + content,
                encoding="utf-8",
            )
            if already_sent(args.delivery_log, part_path):
                results.append({"part": index, "status": "already_sent"})
                continue
            if not args.send:
                row = {
                    "status": "dry_run",
                    "recipient": "director_only",
                    "part": index,
                    "parts_total": len(parts),
                    "report_path": str(report_path),
                    "part_path": str(part_path),
                    "max_send_called": False,
                }
                results.append(row)
                continue
            command = [sys.executable, str(args.sender_script), "--report-path", str(part_path)]
            completed = subprocess.run(
                command,
                cwd=args.sender_script.parents[1],
                text=True,
                capture_output=True,
                check=False,
            )
            if completed.returncode != 0:
                raise DeliveryError(
                    f"PERSONAL_MAX_SENDER_FAILED_PART_{index}:"
                    + completed.stderr.strip()[:300]
                )
            if not already_sent(args.delivery_log, part_path):
                raise DeliveryError(f"PERSONAL_MAX_LOG_NOT_CONFIRMED_PART_{index}")
            row = {
                "status": "sent",
                "recipient": "director_only",
                "part": index,
                "parts_total": len(parts),
                "report_path": str(report_path),
                "part_path": str(part_path),
                "max_send_called": True,
            }
            append_jsonl(args.state, row)
            results.append(row)
    return {
        "status": "sent" if args.send else "dry_run",
        "recipient": "director_only",
        "parts_total": len(parts),
        "parts": results,
    }


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--report-path", type=Path, required=True)
    value.add_argument("--approval", default="")
    value.add_argument("--send", action="store_true")
    value.add_argument("--sender-script", type=Path, default=DEFAULT_SENDER)
    value.add_argument("--delivery-log", type=Path, default=DEFAULT_DELIVERY_LOG)
    value.add_argument("--state", type=Path, default=DEFAULT_STATE)
    value.add_argument("--lock", type=Path, default=DEFAULT_LOCK)
    return value


def main(argv: Iterable[str] | None = None) -> int:
    try:
        result = deliver(parser().parse_args(argv))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
