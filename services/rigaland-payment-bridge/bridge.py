#!/usr/bin/env python3
"""Minimal fixed-target payment bridge for the Riga Land PH Parking form."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import html
import http.client
import ipaddress
import json
import logging
import math
import os
import re
import socket
import sqlite3
import ssl
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass
from email.message import Message
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable, Protocol
from urllib.parse import quote, unquote_to_bytes, urlsplit, parse_qsl


BRIDGE_PATH = "/rigaland/payment-bridge"
UPSTREAM_HOST = "parking.rigaland.ru"
UPSTREAM_POST_PATH = "/pub/pay"
UPSTREAM_WAIT_PATH = "/pub/waitpay"
MAX_BODY_BYTES = 16 * 1024
MAX_NOTIFY_CHARS = 200
MAX_FIELD_BYTES = 512
RATE_LIMIT_SECONDS = 30
POLL_INTERVAL_SECONDS = 0.5
POLL_WINDOW_SECONDS = 10.0
UPSTREAM_TIMEOUT_SECONDS = 5.0
MAX_UPSTREAM_BODY_BYTES = 1024 * 1024
MAX_HTTP09_FIRST_LINE_BYTES = 8192
MAX_PSEUDO_HEADER_BYTES = 64 * 1024
MAX_PSEUDO_HEADER_LINES = 100
MAX_PSEUDO_HEADER_NAME_BYTES = 128
MAX_PSEUDO_HEADER_VALUE_BYTES = 8192

PAYMENT_LINK_FAILURE_MESSAGE = "Не удалось получить ссылку страницы оплаты."

CSP = (
    "default-src 'none'; base-uri 'none'; object-src 'none'; "
    "frame-ancestors 'none'; style-src 'unsafe-inline'; "
    "script-src 'unsafe-inline'; form-action https://yoomoney.ru; "
    "navigate-to https://yoomoney.ru"
)

SECURITY_HEADERS = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": CSP,
}

FIELD_NAME_RE = re.compile(r"^(?:client_id|code|notify|printbill|paycard|payqr|bank|paybtn[0-9]+)$")
PAYMENT_FIELD_RE = re.compile(r"^(?:paycard|payqr|paybtn[0-9]+)$")
CLIENT_ID_RE = re.compile(r"^[0-9]{1,20}$")
CODE_RE = re.compile(r"^[A-Za-z0-9]{1,64}$")
COOKIE_NAME_RE = re.compile(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")
HEX_BYTES = frozenset(b"0123456789abcdefABCDEF")
CLIENT_ID_HASH_KEY = os.urandom(32)

DIAGNOSTIC_CODE_BY_REASON = {
    "invalid_percent_encoding": "BRIDGE-INVALID-REQUEST",
    "invalid_text_encoding": "BRIDGE-INVALID-REQUEST",
    "invalid_body_size": "BRIDGE-INVALID-REQUEST",
    "invalid_form_field": "BRIDGE-INVALID-REQUEST",
    "invalid_field_name": "BRIDGE-INVALID-REQUEST",
    "unknown_field": "BRIDGE-INVALID-REQUEST",
    "duplicate_field": "BRIDGE-INVALID-REQUEST",
    "field_too_long": "BRIDGE-INVALID-REQUEST",
    "missing_required_field": "BRIDGE-INVALID-REQUEST",
    "invalid_required_field": "BRIDGE-INVALID-REQUEST",
    "invalid_client_id": "BRIDGE-INVALID-REQUEST",
    "invalid_code": "BRIDGE-INVALID-REQUEST",
    "invalid_notify": "BRIDGE-INVALID-REQUEST",
    "invalid_field_value": "BRIDGE-INVALID-REQUEST",
    "invalid_payment_action": "BRIDGE-INVALID-REQUEST",
    "duplicate_payment": "BRIDGE-DUPLICATE-PAYMENT",
    "rate_limit_unavailable": "BRIDGE-INTERNAL",
    "upstream_dns_failure": "BRIDGE-UPSTREAM-CONNECTION",
    "upstream_dns_empty": "BRIDGE-UPSTREAM-CONNECTION",
    "upstream_non_public_ip": "BRIDGE-UPSTREAM-CONNECTION",
    "upstream_request_failure": "BRIDGE-UPSTREAM-CONNECTION",
    "upstream_cookie_too_large": "BRIDGE-UPSTREAM-PARSE",
    "upstream_cookie_invalid": "BRIDGE-UPSTREAM-PARSE",
    "upstream_body_too_large": "BRIDGE-UPSTREAM-PARSE",
    "upstream_http09_rejected": "BRIDGE-UPSTREAM-HTTP09",
    "upstream_status": "BRIDGE-UPSTREAM-STATUS",
    "unexpected_upstream_redirect": "BRIDGE-INVALID-REDIRECT",
    "missing_initial_redirect": "BRIDGE-UPSTREAM-NO-LOCATION",
    "payment_poll_timeout": "BRIDGE-WAITPAY-TIMEOUT",
    "unexpected_poll_state": "BRIDGE-INVALID-REDIRECT",
}


class BridgeError(Exception):
    def __init__(
        self,
        status: int,
        reason: str,
        public_message: str,
        diagnostic_code: str | None = None,
        *,
        stage: str | None = None,
        exception_class: str | None = None,
        exception_message: str | None = None,
        elapsed_ms: int | None = None,
        http_status: int | None = None,
        header_bytes: int | None = None,
        body_bytes: int | None = None,
        location: str | None = None,
        location_header_count: int | None = None,
        set_cookie_count: int | None = None,
        poll_count: int | None = None,
        body_checkout_marker: bool | None = None,
        response_mode: str | None = None,
        first_line_class: str | None = None,
        first_line_length: int | None = None,
        curl_exit_code: int | None = None,
        retry_after_seconds: int | None = None,
        structure: "HTTP09StructureDiagnostics | None" = None,
    ) -> None:
        super().__init__(reason)
        self.status = status
        self.reason = reason
        self.public_message = public_message
        self.diagnostic_code = diagnostic_code or DIAGNOSTIC_CODE_BY_REASON.get(reason, "BRIDGE-INTERNAL")
        self.stage = stage
        self.exception_class = exception_class
        self.exception_message = exception_message
        self.elapsed_ms = elapsed_ms
        self.http_status = http_status
        self.header_bytes = header_bytes
        self.body_bytes = body_bytes
        self.location = location
        self.location_header_count = location_header_count
        self.set_cookie_count = set_cookie_count
        self.poll_count = poll_count
        self.body_checkout_marker = body_checkout_marker
        self.response_mode = response_mode
        self.first_line_class = first_line_class
        self.first_line_length = first_line_length
        self.curl_exit_code = curl_exit_code
        self.retry_after_seconds = retry_after_seconds
        self.structure = structure


@dataclass(frozen=True)
class ParsedForm:
    client_id: str
    code: str
    upstream_body: bytes
    payment_field: str


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int
    claim_age_seconds: float


@dataclass(frozen=True)
class UpstreamResponse:
    status: int
    location: str | None
    set_cookie_headers: tuple[str, ...]
    body_length: int = 0
    location_header_count: int | None = None
    header_bytes: int = 0
    elapsed_ms: int = 0
    body: bytes = b""
    content_type: str | None = None
    declared_content_length: int | None = None
    raw_body_bytes: int | None = None
    response_mode: str = "standard_http"
    first_line_class: str = "http_status"
    first_line_length: int | None = None
    curl_exit_code: int | None = None
    structure: "HTTP09StructureDiagnostics | None" = None


@dataclass(frozen=True)
class LocationSummary:
    present: bool
    classification: str
    hostname: str
    pathname: str


@dataclass(frozen=True)
class BodyDiagnostics:
    sha256: str
    marker_yoomoney: bool
    marker_checkout_path: bool
    marker_meta_refresh: bool
    marker_window_location: bool
    marker_location_href: bool
    marker_form_action: bool
    marker_href: bool
    checkout_marker: bool
    checkout_url: str | None


@dataclass(frozen=True)
class PseudoHeaderLineDiagnostics:
    line_index: int
    line_length: int
    is_empty: bool
    is_whitespace_only: bool
    colon_position: int
    is_header_syntax: bool
    header_name: str
    starts_with_space: bool
    starts_with_tab: bool
    ends_with_space: bool
    ends_with_cr: bool
    contains_control: bool
    matches_embedded_http_status: bool
    embedded_http_version: str
    embedded_http_status_code: int | None


@dataclass(frozen=True)
class HTTP09StructureDiagnostics:
    leading_bom: str
    leading_blank_lines_count: int
    newline_mode: str
    first_colon_position: int
    first_line_is_header_syntax: bool
    first_header_name: str
    header_names: tuple[str, ...]
    blank_line_offset: int
    printable_ascii_ratio: float
    utf8_decode_valid: bool
    cp1251_decode_valid: bool
    contains_location_header: bool
    contains_checkout_marker: bool
    contains_waitpay_marker: bool
    pseudo_header_line_count: int
    separator_length: int
    parsed_payload_bytes: int
    raw_response_bytes: int
    separator_offset: int
    header_blob_length: int
    header_blob_ends_with_crlf: bool
    header_blob_ends_with_lf: bool
    header_lines_count: int
    header_lines_bytes_with_separators: int
    header_line_meta: tuple[PseudoHeaderLineDiagnostics, ...]
    embedded_http_status_present: bool
    embedded_http_version: str
    embedded_http_status_code: int | None
    embedded_http_status_position: int
    embedded_http_status_count: int


@dataclass(frozen=True)
class PseudoHeaderBlock:
    separator_offset: int
    separator_length: int
    header_blob: bytes
    body_blob: bytes
    header_lines: tuple[bytes, ...]


class Upstream(Protocol):
    def create_payment(self, code: str, body: bytes) -> UpstreamResponse: ...

    def check_payment(self, client_id: str, cookie_header: str | None, timeout: float) -> UpstreamResponse: ...


class RateLimitStore(Protocol):
    def claim(self, client_id: str, code: str) -> RateLimitResult: ...


def client_id_hash(client_id: str) -> str:
    return hmac.new(CLIENT_ID_HASH_KEY, client_id.encode("ascii"), hashlib.sha256).hexdigest()[:24]


def _validate_percent_encoding(value: bytes) -> None:
    index = 0
    while index < len(value):
        if value[index] == 0x25:
            if index + 2 >= len(value) or value[index + 1] not in HEX_BYTES or value[index + 2] not in HEX_BYTES:
                raise BridgeError(400, "invalid_percent_encoding", "Некорректные данные формы.")
            index += 3
        else:
            index += 1


def _decode_form_component(value: bytes) -> bytes:
    _validate_percent_encoding(value)
    return unquote_to_bytes(value.replace(b"+", b" "))


def _decode_text(value: bytes) -> str:
    for encoding in ("utf-8", "windows-1251"):
        try:
            return value.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise BridgeError(400, "invalid_text_encoding", "Некорректные данные формы.")


def _contains_control_characters(value: str) -> bool:
    return any(ord(char) < 0x20 or ord(char) == 0x7F for char in value)


def parse_form_body(raw_body: bytes) -> ParsedForm:
    if not raw_body or len(raw_body) > MAX_BODY_BYTES:
        raise BridgeError(400, "invalid_body_size", "Некорректные данные формы.")

    decoded: dict[str, bytes] = {}
    raw_fields: list[tuple[str, bytes]] = []

    for raw_field in raw_body.split(b"&"):
        if not raw_field or b"=" not in raw_field:
            raise BridgeError(400, "invalid_form_field", "Некорректные данные формы.")

        raw_name, raw_value = raw_field.split(b"=", 1)
        name_bytes = _decode_form_component(raw_name)
        try:
            name = name_bytes.decode("ascii")
        except UnicodeDecodeError as exc:
            raise BridgeError(400, "invalid_field_name", "Неизвестное поле формы.") from exc

        if not FIELD_NAME_RE.fullmatch(name):
            raise BridgeError(400, "unknown_field", "Неизвестное поле формы.")
        if name in decoded:
            raise BridgeError(400, "duplicate_field", "Поле формы передано повторно.")

        value = _decode_form_component(raw_value)
        if len(value) > MAX_FIELD_BYTES:
            raise BridgeError(400, "field_too_long", "Значение поля слишком длинное.")

        decoded[name] = value
        raw_fields.append((name, raw_field))

    try:
        client_id = decoded["client_id"].decode("ascii")
        code = decoded["code"].decode("ascii")
    except KeyError as exc:
        raise BridgeError(400, "missing_required_field", "Не заполнены обязательные поля.") from exc
    except UnicodeDecodeError as exc:
        raise BridgeError(400, "invalid_required_field", "Некорректные данные формы.") from exc

    if not CLIENT_ID_RE.fullmatch(client_id) or int(client_id) <= 0:
        raise BridgeError(400, "invalid_client_id", "Некорректный номер клиента.")
    if not CODE_RE.fullmatch(code):
        raise BridgeError(400, "invalid_code", "Некорректный код билета.")

    notify_bytes = decoded.get("notify")
    if notify_bytes is not None:
        notify = _decode_text(notify_bytes)
        if len(notify) > MAX_NOTIFY_CHARS or _contains_control_characters(notify):
            raise BridgeError(400, "invalid_notify", "Некорректные данные для электронного чека.")

    for name, value in decoded.items():
        if name in {"client_id", "code", "notify"}:
            continue
        text = _decode_text(value)
        if _contains_control_characters(text):
            raise BridgeError(400, "invalid_field_value", "Некорректные данные формы.")

    payment_fields = [name for name in decoded if PAYMENT_FIELD_RE.fullmatch(name)]
    if len(payment_fields) != 1:
        raise BridgeError(400, "invalid_payment_action", "Выберите один способ оплаты.")

    upstream_body = b"&".join(raw_field for name, raw_field in raw_fields if name != "code")
    return ParsedForm(
        client_id=client_id,
        code=code,
        upstream_body=upstream_body,
        payment_field=payment_fields[0],
    )


class SQLiteRateLimiter:
    def __init__(
        self,
        database_path: Path,
        window_seconds: int = RATE_LIMIT_SECONDS,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self.database_path = database_path
        self.window_seconds = window_seconds
        self.clock = clock
        self._initialise()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.database_path, timeout=2.0, isolation_level=None)

    def _initialise(self) -> None:
        self.database_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        connection = self._connect()
        try:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS payment_claims ("
                "fingerprint TEXT PRIMARY KEY, claimed_at REAL NOT NULL)"
            )
        finally:
            connection.close()
        os.chmod(self.database_path, 0o600)

    @staticmethod
    def _fingerprint(client_id: str, code: str) -> str:
        material = f"{client_id}\x00{code}".encode("ascii")
        return hashlib.sha256(material).hexdigest()

    def claim(self, client_id: str, code: str) -> RateLimitResult:
        now = self.clock()
        cutoff = now - self.window_seconds
        fingerprint = self._fingerprint(client_id, code)

        try:
            connection = self._connect()
            try:
                connection.execute("BEGIN IMMEDIATE")
                connection.execute("DELETE FROM payment_claims WHERE claimed_at <= ?", (cutoff,))
                existing = connection.execute(
                    "SELECT claimed_at FROM payment_claims WHERE fingerprint = ?", (fingerprint,)
                ).fetchone()
                if existing is not None:
                    claim_age_seconds = max(0.0, now - float(existing[0]))
                    retry_after_seconds = max(
                        1,
                        math.ceil(self.window_seconds - claim_age_seconds),
                    )
                    connection.execute("ROLLBACK")
                    return RateLimitResult(
                        allowed=False,
                        retry_after_seconds=retry_after_seconds,
                        claim_age_seconds=claim_age_seconds,
                    )
                connection.execute(
                    "INSERT OR REPLACE INTO payment_claims (fingerprint, claimed_at) VALUES (?, ?)",
                    (fingerprint, now),
                )
                connection.execute("COMMIT")
                return RateLimitResult(
                    allowed=True,
                    retry_after_seconds=0,
                    claim_age_seconds=0.0,
                )
            finally:
                connection.close()
        except sqlite3.Error as exc:
            raise BridgeError(503, "rate_limit_unavailable", "Сервис временно недоступен.") from exc


def resolve_public_ip(host: str) -> str:
    try:
        answers = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise BridgeError(502, "upstream_dns_failure", PAYMENT_LINK_FAILURE_MESSAGE) from exc

    addresses: list[str] = []
    for answer in answers:
        address = answer[4][0]
        if address not in addresses:
            addresses.append(address)

    if not addresses:
        raise BridgeError(502, "upstream_dns_empty", PAYMENT_LINK_FAILURE_MESSAGE)

    for address in addresses:
        if not ipaddress.ip_address(address).is_global:
            raise BridgeError(502, "upstream_non_public_ip", PAYMENT_LINK_FAILURE_MESSAGE)

    addresses.sort(key=lambda address: ipaddress.ip_address(address).version)
    return addresses[0]


class _CountingHTTPReader:
    def __init__(self, reader: object, owner: "PinnedHTTPSConnection") -> None:
        self.reader = reader
        self.owner = owner

    def readline(self, *args: object, **kwargs: object) -> bytes:
        data = self.reader.readline(*args, **kwargs)  # type: ignore[attr-defined]
        if self.owner.stage in {"read_status", "read_headers"}:
            self.owner.header_bytes += len(data)
        return data

    def __getattr__(self, name: str) -> object:
        return getattr(self.reader, name)


def _staged_response_class(owner: "PinnedHTTPSConnection") -> type[http.client.HTTPResponse]:
    class StagedHTTPResponse(http.client.HTTPResponse):
        def __init__(self, *args: object, **kwargs: object) -> None:
            super().__init__(*args, **kwargs)  # type: ignore[arg-type]
            self.fp = _CountingHTTPReader(self.fp, owner)  # type: ignore[assignment]

        def _read_status(self) -> tuple[str, int, str]:
            owner.stage = "read_status"
            result = super()._read_status()
            owner.stage = "read_headers"
            return result

    return StagedHTTPResponse


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, pinned_ip: str, timeout: float) -> None:
        super().__init__(host, port=443, timeout=timeout, context=ssl.create_default_context())
        self.pinned_ip = pinned_ip
        self.stage = "connect"
        self.header_bytes = 0
        self.response_class = _staged_response_class(self)

    def connect(self) -> None:
        self.stage = "connect"
        raw_socket = socket.create_connection((self.pinned_ip, self.port), self.timeout, self.source_address)
        self.stage = "tls"
        try:
            self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)
        except Exception:
            raw_socket.close()
            raise
        self.stage = "send_request"


def safe_exception_message(exc: BaseException) -> str:
    if isinstance(exc, http.client.RemoteDisconnected):
        return "upstream closed connection before HTTP response"
    if isinstance(exc, http.client.BadStatusLine):
        return "invalid HTTP status line"
    if isinstance(exc, http.client.LineTooLong):
        return "HTTP line exceeds parser limit"
    if isinstance(exc, http.client.IncompleteRead):
        return "incomplete HTTP response body"
    if isinstance(exc, ssl.SSLCertVerificationError):
        return "TLS certificate verification failed"
    if isinstance(exc, ssl.SSLError):
        return "TLS protocol error"
    if isinstance(exc, socket.timeout):
        return "network operation timed out"

    message = re.sub(r"https?://\S+", "<url>", str(exc), flags=re.IGNORECASE)
    message = re.sub(
        r"(?i)\b(orderid|notify|cookie|set-cookie)\b\s*[:=]\s*[^\s,;]+",
        r"\1=<redacted>",
        message,
    )
    if "?" in message:
        message = message.split("?", 1)[0] + "?<redacted>"
    message = message.replace("\r", " ").replace("\n", " ")
    message = re.sub(r"\s+", " ", message).strip()
    return message[:200] or "-"


def _upstream_diagnostic_code(stage: str) -> str:
    if stage == "tls":
        return "BRIDGE-UPSTREAM-TLS"
    if stage in {"read_status", "read_headers", "read_body", "parse_location"}:
        return "BRIDGE-UPSTREAM-PARSE"
    return "BRIDGE-UPSTREAM-CONNECT"


def _upstream_failure(
    exc: BaseException,
    *,
    stage: str,
    started: float,
    http_status: int | None,
    header_bytes: int,
    body_bytes: int,
    location: str | None = None,
    location_header_count: int | None = None,
    set_cookie_count: int | None = None,
    response_mode: str | None = None,
    first_line_class: str | None = None,
    first_line_length: int | None = None,
    curl_exit_code: int | None = None,
    structure: HTTP09StructureDiagnostics | None = None,
) -> BridgeError:
    root = exc.__cause__ if isinstance(exc, BridgeError) and exc.__cause__ is not None else exc
    reason = exc.reason if isinstance(exc, BridgeError) else "upstream_request_failure"
    diagnostic_code = (
        exc.diagnostic_code
        if isinstance(exc, BridgeError) and reason not in {"upstream_request_failure", "upstream_dns_failure"}
        else _upstream_diagnostic_code(stage)
    )
    return BridgeError(
        exc.status if isinstance(exc, BridgeError) else 502,
        reason,
        PAYMENT_LINK_FAILURE_MESSAGE,
        diagnostic_code,
        stage=stage,
        exception_class=type(root).__name__,
        exception_message=safe_exception_message(root),
        elapsed_ms=max(0, round((time.monotonic() - started) * 1000)),
        http_status=http_status,
        header_bytes=header_bytes,
        body_bytes=body_bytes,
        location=location,
        location_header_count=location_header_count,
        set_cookie_count=set_cookie_count,
        response_mode=(
            response_mode
            if response_mode is not None
            else exc.response_mode if isinstance(exc, BridgeError) else None
        ),
        first_line_class=(
            first_line_class
            if first_line_class is not None
            else exc.first_line_class if isinstance(exc, BridgeError) else None
        ),
        first_line_length=(
            first_line_length
            if first_line_length is not None
            else exc.first_line_length if isinstance(exc, BridgeError) else None
        ),
        curl_exit_code=(
            curl_exit_code
            if curl_exit_code is not None
            else exc.curl_exit_code if isinstance(exc, BridgeError) else None
        ),
        structure=(
            structure
            if structure is not None
            else exc.structure if isinstance(exc, BridgeError) else None
        ),
    )


def _response_header_metadata(headers: Message) -> tuple[str | None, int | None]:
    content_types = tuple(headers.get_all("Content-Type", []))
    content_type = content_types[0] if len(content_types) == 1 else None
    if content_type is not None and (len(content_type) > 512 or _contains_control_characters(content_type)):
        content_type = None

    content_lengths = tuple(headers.get_all("Content-Length", []))
    declared_content_length: int | None = None
    if len(content_lengths) == 1 and re.fullmatch(r"[0-9]{1,20}", content_lengths[0].strip()):
        declared_content_length = int(content_lengths[0].strip())
    return content_type, declared_content_length


class FixedPHUpstream:
    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        cookie_header: str | None,
        timeout: float,
    ) -> UpstreamResponse:
        started = time.monotonic()
        stage = "dns_validation"
        connection: PinnedHTTPSConnection | None = None
        http_status: int | None = None
        header_bytes = 0
        body_bytes = 0
        location: str | None = None
        location_header_count: int | None = None
        set_cookie_count: int | None = None
        headers = {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "POCPARK-RigaLand-Payment-Bridge/1.0",
            "Connection": "close",
        }
        if body is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        if cookie_header:
            headers["Cookie"] = cookie_header

        try:
            pinned_ip = resolve_public_ip(UPSTREAM_HOST)
            connection = PinnedHTTPSConnection(UPSTREAM_HOST, pinned_ip, timeout=max(0.1, timeout))
            stage = "send_request"
            connection.stage = stage
            connection.request(method, path, body=body, headers=headers)

            stage = "read_status"
            connection.stage = stage
            response = connection.getresponse()
            http_status = response.status

            stage = "read_headers"
            connection.stage = stage
            header_bytes = connection.header_bytes

            stage = "parse_location"
            connection.stage = stage
            location_headers = tuple(response.headers.get_all("Location", []))
            location_header_count = len(location_headers)
            location = location_headers[0] if len(location_headers) == 1 else None
            set_cookie_headers = tuple(response.headers.get_all("Set-Cookie", []))
            set_cookie_count = len(set_cookie_headers)
            content_type, declared_content_length = _response_header_metadata(response.headers)

            stage = "read_body"
            connection.stage = stage
            response_body = response.read(MAX_UPSTREAM_BODY_BYTES + 1)
            body_bytes = len(response_body)
            if len(response_body) > MAX_UPSTREAM_BODY_BYTES:
                raise BridgeError(502, "upstream_body_too_large", PAYMENT_LINK_FAILURE_MESSAGE)
            return UpstreamResponse(
                response.status,
                location,
                set_cookie_headers,
                body_bytes,
                len(location_headers),
                header_bytes,
                max(0, round((time.monotonic() - started) * 1000)),
                response_body,
                content_type,
                declared_content_length,
            )
        except http.client.IncompleteRead as exc:
            body_bytes = len(exc.partial)
            failure = _upstream_failure(
                exc,
                stage="read_body",
                started=started,
                http_status=http_status,
                header_bytes=header_bytes,
                body_bytes=body_bytes,
                location=location,
                location_header_count=location_header_count,
                set_cookie_count=set_cookie_count,
            )
            raise failure from exc
        except (BridgeError, OSError, ssl.SSLError, http.client.HTTPException, ValueError) as exc:
            effective_stage = connection.stage if connection is not None else stage
            effective_header_bytes = connection.header_bytes if connection is not None else header_bytes
            failure = _upstream_failure(
                exc,
                stage=effective_stage,
                started=started,
                http_status=http_status,
                header_bytes=effective_header_bytes,
                body_bytes=body_bytes,
                location=location,
                location_header_count=location_header_count,
                set_cookie_count=set_cookie_count,
            )
            root = exc.__cause__ if isinstance(exc, BridgeError) and exc.__cause__ is not None else exc
            raise failure from root
        finally:
            if connection is not None:
                connection.close()

    def create_payment(self, code: str, body: bytes) -> UpstreamResponse:
        path = f"{UPSTREAM_POST_PATH}?code={quote(code, safe='')}"
        return self._request("POST", path, body, None, UPSTREAM_TIMEOUT_SECONDS)

    def check_payment(self, client_id: str, cookie_header: str | None, timeout: float) -> UpstreamResponse:
        path = f"{UPSTREAM_WAIT_PATH}?id={quote(client_id, safe='')}"
        return self._request("GET", path, None, cookie_header, timeout)


class CurlTransportError(Exception):
    pass


class CurlResponseParseError(Exception):
    def __init__(
        self,
        message: str,
        *,
        response_mode: str = "invalid",
        first_line_class: str = "other",
        first_line_length: int | None = None,
        structure: HTTP09StructureDiagnostics | None = None,
    ) -> None:
        super().__init__(message)
        self.response_mode = response_mode
        self.first_line_class = first_line_class
        self.first_line_length = first_line_length
        self.structure = structure


def _write_private_file(path: Path, data: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        remaining = memoryview(data)
        while remaining:
            written = os.write(descriptor, remaining)
            if written <= 0:
                raise OSError("failed to write temporary file")
            remaining = remaining[written:]
    finally:
        os.close(descriptor)


def _parse_curl_header_dump(
    raw_headers: bytes,
) -> tuple[int, str | None, tuple[str, ...], int, str | None, int | None]:
    blocks = [block for block in re.split(br"\r?\n\r?\n", raw_headers) if block.startswith(b"HTTP/")]
    if not blocks:
        raise CurlTransportError("missing HTTP status block")

    lines = blocks[-1].splitlines()
    status_match = re.fullmatch(br"HTTP/\d(?:\.\d)?[ \t]+([0-9]{3})(?:[ \t]+.*)?", lines[0])
    if status_match is None:
        raise CurlTransportError("invalid HTTP status line")

    status = int(status_match.group(1))
    locations: list[str] = []
    set_cookies: list[str] = []
    content_types: list[str] = []
    content_lengths: list[str] = []
    for line in lines[1:]:
        if b":" not in line or line[:1] in {b" ", b"\t"}:
            raise CurlTransportError("invalid HTTP header line")
        raw_name, raw_value = line.split(b":", 1)
        try:
            name = raw_name.decode("ascii").lower()
            value = raw_value.strip().decode("iso-8859-1")
        except UnicodeDecodeError as exc:
            raise CurlTransportError("invalid HTTP header encoding") from exc
        if name == "location":
            locations.append(value)
        elif name == "set-cookie":
            set_cookies.append(value)
        elif name == "content-type":
            content_types.append(value)
        elif name == "content-length":
            content_lengths.append(value)

    location = locations[0] if len(locations) == 1 else None
    content_type = content_types[0] if len(content_types) == 1 else None
    if content_type is not None and (len(content_type) > 512 or _contains_control_characters(content_type)):
        content_type = None
    declared_content_length: int | None = None
    if len(content_lengths) == 1 and re.fullmatch(r"[0-9]{1,20}", content_lengths[0].strip()):
        declared_content_length = int(content_lengths[0].strip())
    return (
        status,
        location,
        tuple(set_cookies),
        len(locations),
        content_type,
        declared_content_length,
    )


PSEUDO_HEADER_NAMES = frozenset(
    {"location", "set-cookie", "content-type", "content-length", "cache-control", "connection"}
)
PSEUDO_HEADER_SYNTAX_RE = re.compile(
    rb"^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*"
)
EMBEDDED_HTTP_STATUS_RE = re.compile(
    rb"^HTTP/1\.([01]) ([1-5][0-9]{2})(?: ([\x20-\x7E]{0,64}))?$"
)
INTERNAL_HTTP09_LOCATION_RE = re.compile(
    rb"^(?:waitpay|/pub/waitpay|pay|/pub/pay)\?id=[0-9]{1,20}$"
)


def _has_forbidden_http09_controls(value: bytes) -> bool:
    return any((byte < 0x20 and byte not in {0x09, 0x0A, 0x0D}) or byte == 0x7F for byte in value)


def _leading_prefix_details(raw_body: bytes) -> tuple[str, int, int]:
    leading_bom = "none"
    offset = 0
    if raw_body.startswith(b"\xef\xbb\xbf"):
        leading_bom = "utf8"
        offset = 3
    elif raw_body.startswith(b"\xff\xfe"):
        leading_bom = "utf16le"
        offset = 2
    elif raw_body.startswith(b"\xfe\xff"):
        leading_bom = "utf16be"
        offset = 2

    blank_lines = 0
    while True:
        if raw_body.startswith(b"\r\n", offset):
            blank_lines += 1
            offset += 2
        elif raw_body.startswith(b"\n", offset):
            blank_lines += 1
            offset += 1
        else:
            break
    return leading_bom, blank_lines, offset


def _newline_mode(raw_body: bytes) -> str:
    has_crlf = b"\r\n" in raw_body
    has_lf = re.search(br"(?<!\r)\n", raw_body) is not None
    has_cr = re.search(br"\r(?!\n)", raw_body) is not None
    kinds = sum((has_crlf, has_lf, has_cr))
    if kinds == 0:
        return "none"
    if kinds > 1:
        return "mixed"
    if has_crlf:
        return "crlf"
    if has_lf:
        return "lf"
    return "cr"


def _split_pseudo_header_block(
    data: bytes,
    structure: HTTP09StructureDiagnostics | None = None,
) -> PseudoHeaderBlock:
    crlf_offset = data.find(b"\r\n\r\n")
    lf_offset = data.find(b"\n\n")
    if crlf_offset >= 0 and (lf_offset < 0 or crlf_offset <= lf_offset):
        separator_offset = crlf_offset
        separator = b"\r\n\r\n"
        line_separator = b"\r\n"
    elif lf_offset >= 0:
        separator_offset = lf_offset
        separator = b"\n\n"
        line_separator = b"\n"
    else:
        raise CurlResponseParseError("pseudo-header terminator is missing", structure=structure)

    separator_length = len(separator)
    if separator_offset + separator_length > MAX_PSEUDO_HEADER_BYTES:
        raise CurlResponseParseError("pseudo-header block exceeds limit", structure=structure)
    header_blob = data[:separator_offset]
    body_blob = data[separator_offset + separator_length :]
    if header_blob.endswith(b"\r\n") or header_blob.endswith(b"\n"):
        raise CurlResponseParseError(
            "pseudo-header split invariant failed",
            structure=structure,
        )
    header_lines = tuple(header_blob.split(line_separator))
    return PseudoHeaderBlock(
        separator_offset=separator_offset,
        separator_length=separator_length,
        header_blob=header_blob,
        body_blob=body_blob,
        header_lines=header_lines,
    )


def _embedded_http_status_details(line: bytes) -> tuple[bool, str, int | None]:
    match = EMBEDDED_HTTP_STATUS_RE.fullmatch(line)
    if match is None:
        return False, "-", None
    version = f"HTTP/1.{match.group(1).decode('ascii')}"
    status_code = int(match.group(2))
    return True, version, status_code


def _pseudo_header_line_diagnostics(
    header_lines: tuple[bytes, ...],
) -> tuple[PseudoHeaderLineDiagnostics, ...]:
    diagnostics: list[PseudoHeaderLineDiagnostics] = []
    for line_index, line in enumerate(header_lines, start=1):
        colon_position = line.find(b":")
        header_match = PSEUDO_HEADER_SYNTAX_RE.match(line)
        matches_embedded_http_status, embedded_http_version, embedded_http_status_code = (
            _embedded_http_status_details(line)
        )
        header_name = "-"
        if header_match is not None and len(header_match.group(1)) <= MAX_PSEUDO_HEADER_NAME_BYTES:
            header_name = header_match.group(1).decode("ascii").lower()
        diagnostics.append(
            PseudoHeaderLineDiagnostics(
                line_index=line_index,
                line_length=len(line),
                is_empty=not line,
                is_whitespace_only=bool(line) and all(byte in {0x20, 0x09} for byte in line),
                colon_position=colon_position,
                is_header_syntax=header_match is not None,
                header_name=header_name,
                starts_with_space=line.startswith(b" "),
                starts_with_tab=line.startswith(b"\t"),
                ends_with_space=line.endswith(b" "),
                ends_with_cr=line.endswith(b"\r"),
                contains_control=any(byte < 0x20 or byte == 0x7F for byte in line),
                matches_embedded_http_status=matches_embedded_http_status,
                embedded_http_version=embedded_http_version,
                embedded_http_status_code=embedded_http_status_code,
            )
        )
    return tuple(diagnostics)


def analyze_http09_structure(raw_body: bytes) -> HTTP09StructureDiagnostics:
    leading_bom, leading_blank_lines_count, prefix_offset = _leading_prefix_details(raw_body)
    payload = raw_body[prefix_offset:]
    newline_index = payload.find(b"\n")
    first_line = payload if newline_index < 0 else payload[:newline_index]
    if first_line.endswith(b"\r"):
        first_line = first_line[:-1]
    first_colon_position = first_line.find(b":")
    header_match = PSEUDO_HEADER_SYNTAX_RE.match(first_line)
    first_line_is_header_syntax = header_match is not None
    first_header_name = "-"
    if header_match is not None and len(header_match.group(1)) <= MAX_PSEUDO_HEADER_NAME_BYTES:
        first_header_name = header_match.group(1).decode("ascii").lower()

    crlf_separator_offset = payload.find(b"\r\n\r\n")
    lf_separator_offset = payload.find(b"\n\n")
    if crlf_separator_offset >= 0 and (
        lf_separator_offset < 0 or crlf_separator_offset <= lf_separator_offset
    ):
        boundary_details: tuple[int, bytes] | None = (crlf_separator_offset, b"\r\n\r\n")
    elif lf_separator_offset >= 0:
        boundary_details = (lf_separator_offset, b"\n\n")
    else:
        boundary_details = None
    blank_line_offset = -1
    pseudo_header_line_count = 0
    separator_length = 0
    parsed_payload_bytes = 0
    separator_offset = -1
    header_blob_length = -1
    header_blob_ends_with_crlf = False
    header_blob_ends_with_lf = False
    header_lines_count = 0
    header_lines_bytes_with_separators = 0
    header_line_meta: tuple[PseudoHeaderLineDiagnostics, ...] = ()
    embedded_http_status_present = False
    embedded_http_version = "-"
    embedded_http_status_code: int | None = None
    embedded_http_status_position = -1
    embedded_http_status_count = 0
    header_names: list[str] = []
    if boundary_details is not None:
        boundary, separator = boundary_details
        separator_offset = boundary
        blank_line_offset = prefix_offset + boundary
        separator_length = len(separator)
        parsed_payload_bytes = len(payload) - boundary - separator_length
        header_block = payload[:boundary]
        header_blob_length = len(header_block)
        header_blob_ends_with_crlf = header_block.endswith(b"\r\n")
        header_blob_ends_with_lf = header_block.endswith(b"\n")
        line_separator = b"\r\n" if separator == b"\r\n\r\n" else b"\n"
        structural_lines = header_block.split(line_separator)
        pseudo_header_line_count = len(structural_lines)
        header_lines_count = len(structural_lines)
        header_lines_bytes_with_separators = sum(len(line) for line in structural_lines) + max(
            0, len(structural_lines) - 1
        ) * len(line_separator)
        header_line_meta = _pseudo_header_line_diagnostics(tuple(structural_lines))
        embedded_status_lines = [
            line for line in header_line_meta if line.matches_embedded_http_status
        ]
        embedded_http_status_count = len(embedded_status_lines)
        embedded_http_status_present = embedded_http_status_count > 0
        if embedded_status_lines:
            embedded_http_version = embedded_status_lines[0].embedded_http_version
            embedded_http_status_code = embedded_status_lines[0].embedded_http_status_code
            embedded_http_status_position = embedded_status_lines[0].line_index
        for line in structural_lines[:MAX_PSEUDO_HEADER_LINES]:
            match = PSEUDO_HEADER_SYNTAX_RE.match(line)
            if match is not None and len(match.group(1)) <= MAX_PSEUDO_HEADER_NAME_BYTES:
                header_names.append(match.group(1).decode("ascii").lower())

    printable_bytes = sum(0x20 <= byte <= 0x7E for byte in raw_body)
    printable_ascii_ratio = round(printable_bytes / len(raw_body), 4) if raw_body else 0.0
    try:
        raw_body.decode("utf-8")
        utf8_decode_valid = True
    except UnicodeDecodeError:
        utf8_decode_valid = False
    try:
        raw_body.decode("windows-1251")
        cp1251_decode_valid = True
    except UnicodeDecodeError:
        cp1251_decode_valid = False

    lower = raw_body.lower()
    return HTTP09StructureDiagnostics(
        leading_bom=leading_bom,
        leading_blank_lines_count=leading_blank_lines_count,
        newline_mode=_newline_mode(raw_body),
        first_colon_position=first_colon_position,
        first_line_is_header_syntax=first_line_is_header_syntax,
        first_header_name=first_header_name,
        header_names=tuple(header_names),
        blank_line_offset=blank_line_offset,
        printable_ascii_ratio=printable_ascii_ratio,
        utf8_decode_valid=utf8_decode_valid,
        cp1251_decode_valid=cp1251_decode_valid,
        contains_location_header=re.search(br"(?im)^location:[ \t]*", payload) is not None,
        contains_checkout_marker=b"/checkout/" in lower,
        contains_waitpay_marker=b"waitpay" in lower,
        pseudo_header_line_count=pseudo_header_line_count,
        separator_length=separator_length,
        parsed_payload_bytes=parsed_payload_bytes,
        raw_response_bytes=len(raw_body),
        separator_offset=separator_offset,
        header_blob_length=header_blob_length,
        header_blob_ends_with_crlf=header_blob_ends_with_crlf,
        header_blob_ends_with_lf=header_blob_ends_with_lf,
        header_lines_count=header_lines_count,
        header_lines_bytes_with_separators=header_lines_bytes_with_separators,
        header_line_meta=header_line_meta,
        embedded_http_status_present=embedded_http_status_present,
        embedded_http_version=embedded_http_version,
        embedded_http_status_code=embedded_http_status_code,
        embedded_http_status_position=embedded_http_status_position,
        embedded_http_status_count=embedded_http_status_count,
    )


def _strip_allowed_http09_prefix(
    raw_body: bytes,
    structure: HTTP09StructureDiagnostics,
) -> tuple[bytes, int]:
    if structure.leading_bom in {"utf16le", "utf16be"}:
        raise CurlResponseParseError("UTF-16 BOM is not allowed", structure=structure)
    if structure.leading_blank_lines_count > 2:
        raise CurlResponseParseError("too many leading blank lines", structure=structure)
    _, _, offset = _leading_prefix_details(raw_body)
    return raw_body[offset:], offset


def _first_line_details(raw_body: bytes) -> tuple[bytes, str, int]:
    newline_index = raw_body.find(b"\n")
    raw_line = raw_body if newline_index < 0 else raw_body[:newline_index]
    if raw_line.endswith(b"\r"):
        raw_line = raw_line[:-1]
    first_line_length = len(raw_line)
    if first_line_length > MAX_HTTP09_FIRST_LINE_BYTES:
        raise CurlResponseParseError(
            "HTTP/0.9 first line exceeds limit",
            first_line_length=first_line_length,
        )
    if _has_forbidden_http09_controls(raw_line):
        raise CurlResponseParseError(
            "HTTP/0.9 first line contains forbidden control character",
            first_line_length=first_line_length,
        )

    stripped = raw_line
    lower = stripped.lower()
    first_line_class = "other"
    if stripped.startswith(b"HTTP/"):
        first_line_class = "http_status"
    elif lower.startswith(b"location:"):
        first_line_class = "location_header"
    elif stripped.startswith(b"<"):
        first_line_class = "html"
    else:
        first_token = stripped.split(None, 1)[0] if stripped else b""
        try:
            decoded_token = first_token.decode("ascii")
        except UnicodeDecodeError:
            decoded_token = ""
        if decoded_token and yoomoney_checkout_url(decoded_token):
            first_line_class = "absolute_checkout_url"
        elif INTERNAL_HTTP09_LOCATION_RE.fullmatch(first_token):
            first_line_class = "internal_path"
    return raw_line, first_line_class, first_line_length


def _looks_like_pseudo_header(first_line: bytes) -> bool:
    return PSEUDO_HEADER_SYNTAX_RE.match(first_line) is not None


def _parse_pseudo_headers(
    raw_body: bytes,
    structure: HTTP09StructureDiagnostics,
) -> tuple[str | None, tuple[str, ...], int, str | None, int | None, int | None, bytes]:
    split_response = _split_pseudo_header_block(raw_body, structure)
    header_block = split_response.header_blob
    if _has_forbidden_http09_controls(header_block):
        raise CurlResponseParseError(
            "pseudo-header block contains forbidden control character",
            structure=structure,
        )

    lines = split_response.header_lines
    if len(lines) > MAX_PSEUDO_HEADER_LINES:
        raise CurlResponseParseError("too many pseudo-header lines", structure=structure)
    locations: list[str] = []
    set_cookies: list[str] = []
    content_types: list[str] = []
    content_lengths: list[str] = []
    embedded_http_status_code: int | None = None
    for line_index, line in enumerate(lines, start=1):
        if not line:
            raise CurlResponseParseError(
                f"empty pseudo-header line at index {line_index}",
                structure=structure,
            )
        if all(byte in {0x20, 0x09} for byte in line):
            raise CurlResponseParseError(
                f"whitespace-only pseudo-header line at index {line_index}",
                structure=structure,
            )
        if line[:1] in {b" ", b"\t"}:
            raise CurlResponseParseError(
                f"folded pseudo-header line at index {line_index}",
                structure=structure,
            )
        if b"\r" in line or b"\n" in line:
            raise CurlResponseParseError(
                f"unexpected newline in pseudo-header line at index {line_index}",
                structure=structure,
            )
        matches_embedded_status, _, status_code = _embedded_http_status_details(line)
        if matches_embedded_status:
            if embedded_http_status_code is not None:
                raise CurlResponseParseError(
                    "multiple embedded HTTP status lines",
                    structure=structure,
                )
            embedded_http_status_code = status_code
            continue
        if b":" not in line:
            raise CurlResponseParseError(
                f"pseudo-header line without colon at index {line_index}",
                structure=structure,
            )
        raw_name, raw_value = line.split(b":", 1)
        if not raw_name or len(raw_name) > MAX_PSEUDO_HEADER_NAME_BYTES:
            raise CurlResponseParseError("pseudo-header name exceeds limit", structure=structure)
        if len(raw_value) > MAX_PSEUDO_HEADER_VALUE_BYTES:
            raise CurlResponseParseError("pseudo-header value exceeds limit", structure=structure)
        if re.fullmatch(rb"[!#$%&'*+.^_`|~0-9A-Za-z-]+", raw_name) is None:
            raise CurlResponseParseError("invalid pseudo-header name", structure=structure)
        value_start = 0
        while value_start < len(raw_value) and raw_value[value_start] in {0x20, 0x09}:
            value_start += 1
        value_bytes = raw_value[value_start:]
        try:
            name = raw_name.decode("ascii").lower()
            value = value_bytes.decode("iso-8859-1")
        except UnicodeDecodeError as exc:
            raise CurlResponseParseError("invalid pseudo-header encoding", structure=structure) from exc
        if name in {"location", "set-cookie"} and _contains_control_characters(value):
            raise CurlResponseParseError("unsafe pseudo-header value", structure=structure)
        if name == "location":
            locations.append(value)
        elif name == "set-cookie":
            set_cookies.append(value)
        elif name == "content-type":
            content_types.append(value)
        elif name == "content-length":
            content_lengths.append(value)

    distinct_locations = tuple(dict.fromkeys(locations))
    if len(distinct_locations) > 1:
        raise CurlResponseParseError("conflicting Location headers", structure=structure)
    location = distinct_locations[0] if distinct_locations else None
    if (
        embedded_http_status_code is not None
        and 300 <= embedded_http_status_code < 400
        and location is None
    ):
        raise CurlResponseParseError(
            "embedded 3xx HTTP status requires Location",
            structure=structure,
        )
    content_type = content_types[0] if len(content_types) == 1 else None
    if content_type is not None and (len(content_type) > 512 or _contains_control_characters(content_type)):
        content_type = None
    declared_content_length: int | None = None
    if len(content_lengths) == 1 and re.fullmatch(r"[0-9]{1,20}", content_lengths[0]):
        declared_content_length = int(content_lengths[0])
    remaining_body = split_response.body_blob
    return (
        location,
        tuple(set_cookies),
        1 if location is not None else 0,
        content_type,
        declared_content_length,
        embedded_http_status_code,
        remaining_body,
    )


def _parse_curl_response(
    raw_headers: bytes,
    raw_body: bytes,
    *,
    curl_exit_code: int,
    elapsed_ms: int,
) -> UpstreamResponse:
    header_blocks = [
        block for block in re.split(br"\r?\n\r?\n", raw_headers) if block.startswith(b"HTTP/")
    ]
    if header_blocks:
        status_line = header_blocks[-1].splitlines()[0]
        if len(status_line) > MAX_HTTP09_FIRST_LINE_BYTES:
            raise CurlResponseParseError(
                "HTTP status line exceeds limit",
                response_mode="invalid",
                first_line_class="http_status",
                first_line_length=len(status_line),
            )
        try:
            (
                status,
                location,
                set_cookie_headers,
                location_count,
                content_type,
                declared_content_length,
            ) = _parse_curl_header_dump(raw_headers)
        except CurlTransportError as exc:
            raise CurlResponseParseError(
                str(exc),
                response_mode="invalid",
                first_line_class="http_status",
                first_line_length=len(status_line),
            ) from exc
        if len(raw_body) > MAX_UPSTREAM_BODY_BYTES:
            raise CurlResponseParseError(
                "upstream body exceeds limit",
                response_mode="standard_http",
                first_line_class="http_status",
                first_line_length=len(status_line),
            )
        return UpstreamResponse(
            status,
            location,
            set_cookie_headers,
            len(raw_body),
            location_count,
            len(raw_headers),
            elapsed_ms,
            raw_body,
            content_type,
            declared_content_length,
            len(raw_body),
            "standard_http",
            "http_status",
            len(status_line),
            curl_exit_code,
        )

    structure = analyze_http09_structure(raw_body)
    if not raw_body:
        raise CurlResponseParseError(
            "empty HTTP/0.9 response",
            first_line_length=0,
            structure=structure,
        )
    payload, _ = _strip_allowed_http09_prefix(raw_body, structure)
    try:
        first_line, first_line_class, first_line_length = _first_line_details(payload)
    except CurlResponseParseError as exc:
        exc.structure = structure
        raise
    if _has_forbidden_http09_controls(raw_body):
        raise CurlResponseParseError(
            "HTTP/0.9 response contains forbidden control character",
            first_line_class=first_line_class,
            first_line_length=first_line_length,
            structure=structure,
        )

    first_line_is_embedded_status, _, _ = _embedded_http_status_details(first_line)
    if first_line_class != "absolute_checkout_url" and (
        _looks_like_pseudo_header(first_line) or first_line_is_embedded_status
    ):
        try:
            (
                location,
                set_cookie_headers,
                location_count,
                content_type,
                declared_content_length,
                embedded_http_status_code,
                remaining_body,
            ) = _parse_pseudo_headers(payload, structure)
        except CurlResponseParseError as exc:
            exc.response_mode = "invalid"
            exc.first_line_class = first_line_class
            exc.first_line_length = first_line_length
            exc.structure = structure
            raise
        if len(remaining_body) > MAX_UPSTREAM_BODY_BYTES:
            raise CurlResponseParseError(
                "upstream body exceeds limit",
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                structure=structure,
            )
        parsed_response = UpstreamResponse(
            embedded_http_status_code or (303 if location_count else 200),
            location,
            set_cookie_headers,
            len(remaining_body),
            location_count,
            len(raw_headers),
            elapsed_ms,
            remaining_body,
            content_type,
            declared_content_length,
            len(raw_body),
            "pseudo_headers",
            first_line_class,
            first_line_length,
            curl_exit_code,
            structure,
        )
        if location_count == 0 and analyze_upstream_body(parsed_response).checkout_url is None:
            raise CurlResponseParseError(
                "pseudo-headers contain no usable redirect",
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                structure=structure,
            )
        return parsed_response

    stripped = first_line
    first_token = stripped.split(None, 1)[0] if stripped else b""
    if first_line_class == "absolute_checkout_url":
        checkout_url = first_token.decode("ascii")
        if not yoomoney_checkout_url(checkout_url):
            raise CurlResponseParseError(
                "unapproved absolute URL in HTTP/0.9 body",
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                structure=structure,
            )
        return UpstreamResponse(
            303,
            checkout_url,
            (),
            0,
            1,
            len(raw_headers),
            elapsed_ms,
            b"",
            None,
            None,
            len(raw_body),
            "absolute_url_body",
            first_line_class,
            first_line_length,
            curl_exit_code,
            structure,
        )

    if first_line_class == "internal_path":
        internal_location = first_token.decode("ascii")
        return UpstreamResponse(
            303,
            internal_location,
            (),
            0,
            1,
            len(raw_headers),
            elapsed_ms,
            b"",
            None,
            None,
            len(raw_body),
            "http09_body",
            first_line_class,
            first_line_length,
            curl_exit_code,
            structure,
        )

    if first_line_class == "html":
        if len(payload) > MAX_UPSTREAM_BODY_BYTES:
            raise CurlResponseParseError(
                "upstream body exceeds limit",
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                structure=structure,
            )
        return UpstreamResponse(
            200,
            None,
            (),
            len(payload),
            0,
            len(raw_headers),
            elapsed_ms,
            payload,
            "text/html",
            None,
            len(raw_body),
            "html_body",
            first_line_class,
            first_line_length,
            curl_exit_code,
            structure,
        )

    raise CurlResponseParseError(
        "unrecognised HTTP/0.9 response",
        first_line_class=first_line_class,
        first_line_length=first_line_length,
        structure=structure,
    )


def _curl_failure_stage(return_code: int) -> str:
    if return_code in {35, 51, 53, 58, 59, 60, 64, 66, 77, 80, 82, 83, 90, 91}:
        return "tls"
    if return_code in {5, 6, 7, 28}:
        return "connect"
    if return_code in {18, 52, 56}:
        return "read_body"
    return "send_request"


class CurlPHUpstream:
    """Optional system-curl transport. It is not selected unless --transport=curl is set."""

    def __init__(
        self,
        curl_path: Path = Path("/usr/bin/curl"),
        runner: Callable[..., subprocess.CompletedProcess[bytes]] = subprocess.run,
        resolver: Callable[[str], str] = resolve_public_ip,
    ) -> None:
        self.curl_path = curl_path
        self.runner = runner
        self.resolver = resolver

    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        cookie_header: str | None,
        timeout: float,
    ) -> UpstreamResponse:
        started = time.monotonic()
        stage = "dns_validation"
        http_status: int | None = None
        header_bytes = 0
        body_bytes = 0
        location: str | None = None
        location_count: int | None = None
        set_cookie_count: int | None = None
        response_mode: str | None = None
        first_line_class: str | None = None
        first_line_length: int | None = None
        curl_exit_code: int | None = None
        structure: HTTP09StructureDiagnostics | None = None

        try:
            pinned_ip = self.resolver(UPSTREAM_HOST)
            with tempfile.TemporaryDirectory(prefix="rigaland-curl-") as temporary_directory:
                temp_root = Path(temporary_directory)
                os.chmod(temp_root, 0o700)
                config_path = temp_root / "request.cfg"
                request_body_path = temp_root / "request-body.bin"
                response_headers_path = temp_root / "response-headers.bin"
                response_body_path = temp_root / "response-body.bin"
                cookie_jar_path = temp_root / "cookies.txt"

                url = f"https://{UPSTREAM_HOST}{path}"
                config = f'url = "{url.replace(chr(92), chr(92) * 2).replace(chr(34), chr(92) + chr(34))}"\n'
                _write_private_file(config_path, config.encode("ascii"))
                _write_private_file(response_headers_path, b"")
                _write_private_file(response_body_path, b"")

                cookie_lines = ["# Netscape HTTP Cookie File\n"]
                if cookie_header:
                    parsed_cookies = SimpleCookie()
                    parsed_cookies.load(cookie_header)
                    for name, morsel in sorted(parsed_cookies.items()):
                        cookie_lines.append(
                            f"{UPSTREAM_HOST}\tFALSE\t/pub/\tTRUE\t0\t{name}\t{morsel.value}\n"
                        )
                _write_private_file(cookie_jar_path, "".join(cookie_lines).encode("utf-8"))

                resolve_address = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
                arguments = [
                    str(self.curl_path),
                    "--http1.1",
                    "--http0.9",
                    "--max-redirs",
                    "0",
                    "--noproxy",
                    "*",
                    "--silent",
                    "--show-error",
                    "--connect-timeout",
                    str(max(0.1, min(3.0, timeout))),
                    "--max-time",
                    str(max(0.1, timeout)),
                    "--resolve",
                    f"{UPSTREAM_HOST}:443:{resolve_address}",
                    "--request",
                    method,
                    "--header",
                    "Accept: text/html,application/xhtml+xml",
                    "--header",
                    "User-Agent: POCPARK-RigaLand-Payment-Bridge-Curl/1.0",
                    "--header",
                    "Connection: close",
                    "--header",
                    "Expect:",
                    "--dump-header",
                    str(response_headers_path),
                    "--output",
                    str(response_body_path),
                    "--cookie",
                    str(cookie_jar_path),
                    "--cookie-jar",
                    str(cookie_jar_path),
                    "--config",
                    str(config_path),
                ]
                if body is not None:
                    _write_private_file(request_body_path, body)
                    arguments.extend(
                        [
                            "--header",
                            "Content-Type: application/x-www-form-urlencoded",
                            "--data-binary",
                            f"@{request_body_path}",
                        ]
                    )

                stage = "connect"
                completed = self.runner(
                    arguments,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=max(1.0, timeout + 2.0),
                    check=False,
                )
                curl_exit_code = completed.returncode
                header_bytes = response_headers_path.stat().st_size
                body_bytes = response_body_path.stat().st_size
                if body_bytes > MAX_UPSTREAM_BODY_BYTES + MAX_PSEUDO_HEADER_BYTES:
                    stage = "read_body"
                    raise BridgeError(
                        502,
                        "upstream_body_too_large",
                        PAYMENT_LINK_FAILURE_MESSAGE,
                        response_mode="invalid",
                        curl_exit_code=curl_exit_code,
                    )
                raw_headers = response_headers_path.read_bytes()
                response_body = response_body_path.read_bytes()

                if completed.returncode != 0:
                    stderr_message = completed.stderr.decode("utf-8", "replace")
                    if response_body:
                        structure = analyze_http09_structure(response_body)
                        try:
                            inspected_body, _ = _strip_allowed_http09_prefix(response_body, structure)
                            _, first_line_class, first_line_length = _first_line_details(inspected_body)
                        except CurlResponseParseError as inspection_error:
                            first_line_class = inspection_error.first_line_class
                            first_line_length = inspection_error.first_line_length
                    response_mode = "invalid"
                    transport_error = CurlTransportError(
                        stderr_message or f"curl exit code {completed.returncode}"
                    )
                    if (
                        completed.returncode == 1
                        and "received http/0.9 when not allowed" in stderr_message.lower()
                    ):
                        stage = "read_status"
                        raise BridgeError(
                            502,
                            "upstream_http09_rejected",
                            PAYMENT_LINK_FAILURE_MESSAGE,
                            "BRIDGE-UPSTREAM-HTTP09",
                            stage=stage,
                            response_mode=response_mode,
                            first_line_class=first_line_class,
                            first_line_length=first_line_length,
                            curl_exit_code=curl_exit_code,
                            structure=structure,
                        ) from transport_error
                    stage = _curl_failure_stage(completed.returncode)
                    raise transport_error

                stage = "parse_location"
                parsed_response = _parse_curl_response(
                    raw_headers,
                    response_body,
                    curl_exit_code=completed.returncode,
                    elapsed_ms=max(0, round((time.monotonic() - started) * 1000)),
                )
                http_status = parsed_response.status
                location = parsed_response.location
                location_count = parsed_response.location_header_count
                set_cookie_count = len(parsed_response.set_cookie_headers)
                response_mode = parsed_response.response_mode
                first_line_class = parsed_response.first_line_class
                first_line_length = parsed_response.first_line_length
                structure = parsed_response.structure
                return parsed_response
        except subprocess.TimeoutExpired as exc:
            failure = _upstream_failure(
                exc,
                stage=stage,
                started=started,
                http_status=http_status,
                header_bytes=header_bytes,
                body_bytes=body_bytes,
                location=location,
                location_header_count=location_count,
                set_cookie_count=set_cookie_count,
                response_mode=response_mode,
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                curl_exit_code=curl_exit_code,
                structure=structure,
            )
            raise failure from exc
        except (BridgeError, CurlTransportError, CurlResponseParseError, OSError, ValueError) as exc:
            if isinstance(exc, CurlResponseParseError):
                response_mode = exc.response_mode
                first_line_class = exc.first_line_class
                first_line_length = exc.first_line_length
                structure = exc.structure
            failure = _upstream_failure(
                exc,
                stage=stage,
                started=started,
                http_status=http_status,
                header_bytes=header_bytes,
                body_bytes=body_bytes,
                location=location,
                location_header_count=location_count,
                set_cookie_count=set_cookie_count,
                response_mode=response_mode,
                first_line_class=first_line_class,
                first_line_length=first_line_length,
                curl_exit_code=curl_exit_code,
                structure=structure,
            )
            root = exc.__cause__ if isinstance(exc, BridgeError) and exc.__cause__ is not None else exc
            raise failure from root

    def create_payment(self, code: str, body: bytes) -> UpstreamResponse:
        path = f"{UPSTREAM_POST_PATH}?code={quote(code, safe='')}"
        return self._request("POST", path, body, None, UPSTREAM_TIMEOUT_SECONDS)

    def check_payment(self, client_id: str, cookie_header: str | None, timeout: float) -> UpstreamResponse:
        path = f"{UPSTREAM_WAIT_PATH}?id={quote(client_id, safe='')}"
        return self._request("GET", path, None, cookie_header, timeout)


class ResponseCookieJar:
    def __init__(self) -> None:
        self._cookies: dict[str, str] = {}

    def update(self, set_cookie_headers: tuple[str, ...]) -> None:
        total_length = sum(len(header) for header in set_cookie_headers)
        if total_length > 16 * 1024:
            raise BridgeError(502, "upstream_cookie_too_large", "Сервис парковки вернул некорректный ответ.")

        for header in set_cookie_headers:
            if len(header) > 4096:
                raise BridgeError(502, "upstream_cookie_too_large", "Сервис парковки вернул некорректный ответ.")
            parsed = SimpleCookie()
            try:
                parsed.load(header)
            except Exception as exc:
                raise BridgeError(502, "upstream_cookie_invalid", "Сервис парковки вернул некорректный ответ.") from exc
            for name, morsel in parsed.items():
                value = morsel.value
                if not COOKIE_NAME_RE.fullmatch(name) or _contains_control_characters(value):
                    raise BridgeError(502, "upstream_cookie_invalid", "Сервис парковки вернул некорректный ответ.")
                self._cookies[name] = value

    def as_header(self) -> str | None:
        if not self._cookies:
            return None
        return "; ".join(f"{name}={value}" for name, value in sorted(self._cookies.items()))


def yoomoney_checkout_url(location: str | None) -> str | None:
    if not location:
        return None
    if any(char.isspace() or char in "\"'<>`\\" or ord(char) == 0x7F for char in location):
        return None
    parsed = urlsplit(location)
    try:
        port = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme != "https"
        or parsed.hostname != "yoomoney.ru"
        or port not in (None, 443)
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.path.startswith("/checkout/")
    ):
        return None
    return location


def is_expected_wait_location(location: str | None, client_id: str) -> bool:
    if not location:
        return False
    parsed = urlsplit(location)
    if parsed.scheme or parsed.netloc or parsed.fragment:
        return False
    if parsed.path not in {"waitpay", "/pub/waitpay"}:
        return False
    try:
        query = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
    except ValueError:
        return False
    return query == [("id", client_id)]


def _location_count(response: UpstreamResponse) -> int:
    if response.location_header_count is not None:
        return response.location_header_count
    return 1 if response.location is not None else 0


def _safe_log_component(value: str | None) -> str:
    if not value:
        return "-"
    return re.sub(r"[^A-Za-z0-9._~:/-]", "?", value[:200])


def summarize_location(response: UpstreamResponse, client_id: str) -> LocationSummary:
    location_count = _location_count(response)
    if location_count == 0:
        return LocationSummary(False, "missing", "-", "-")
    if location_count != 1 or response.location is None:
        return LocationSummary(True, "invalid", "-", "-")

    try:
        parsed = urlsplit(response.location)
        hostname = parsed.hostname or "-"
        port = parsed.port
    except ValueError:
        return LocationSummary(True, "invalid", "-", "-")

    pathname = parsed.path or "-"
    if yoomoney_checkout_url(response.location):
        classification = "checkout"
    elif is_expected_wait_location(response.location, client_id):
        classification = "waitpay"
    elif (
        not parsed.fragment
        and parsed.path in {"pay", "/pub/pay"}
        and (
            (not parsed.scheme and not parsed.netloc)
            or (
                parsed.scheme == "https"
                and hostname == UPSTREAM_HOST
                and port in (None, 443)
                and parsed.username is None
                and parsed.password is None
            )
        )
    ):
        classification = "internal"
    else:
        classification = "invalid"

    return LocationSummary(
        True,
        classification,
        _safe_log_component(hostname),
        _safe_log_component(pathname),
    )


def _normalised_content_type(content_type: str | None) -> str:
    if not content_type:
        return "-"
    message = Message()
    message["content-type"] = content_type
    media_type = message.get_content_type().lower()
    charset = message.get_param("charset", header="content-type")
    if isinstance(charset, str) and re.fullmatch(r"[A-Za-z0-9._-]{1,40}", charset):
        return f"{media_type};charset={charset.lower()}"
    return media_type


def _decode_upstream_body(response: UpstreamResponse) -> str:
    encodings: list[str] = []
    if response.content_type:
        message = Message()
        message["content-type"] = response.content_type
        charset = message.get_param("charset", header="content-type")
        if isinstance(charset, str) and re.fullmatch(r"[A-Za-z0-9._-]{1,40}", charset):
            encodings.append(charset)
    encodings.extend(["utf-8", "windows-1251", "iso-8859-1"])

    for encoding in dict.fromkeys(encodings):
        try:
            return response.body.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return response.body.decode("iso-8859-1", "replace")


CHECKOUT_URL_IN_HTML_RE = re.compile(
    r"https://yoomoney\.ru/checkout/[^\s\"'<>`\\\]\)]+(?=$|[\s\"'<>`\]\)])",
    re.IGNORECASE,
)


def analyze_upstream_body(response: UpstreamResponse) -> BodyDiagnostics:
    decoded = html.unescape(_decode_upstream_body(response))
    lower = decoded.lower()
    marker_yoomoney = "yoomoney.ru" in lower
    marker_checkout_path = "/checkout/" in lower
    marker_meta_refresh = bool(
        re.search(r"<meta\b[^>]{0,2048}http-equiv\s*=\s*[\"']?\s*refresh\b[^>]*>", lower, re.DOTALL)
    )
    marker_window_location = "window.location" in lower
    marker_location_href = "location.href" in lower
    marker_form_action = bool(re.search(r"<form\b[^>]{0,4096}\baction\s*=", lower, re.DOTALL))
    marker_href = bool(re.search(r"\bhref\s*=", lower))
    checkout_marker = marker_yoomoney and marker_checkout_path

    normalised_content_type = _normalised_content_type(response.content_type)
    stripped = lower.lstrip()
    is_html = normalised_content_type.startswith(("text/html", "application/xhtml+xml")) or stripped.startswith(
        ("<!doctype html", "<html", "<meta", "<form", "<script")
    )
    checkout_url: str | None = None
    if is_html and checkout_marker:
        for match in CHECKOUT_URL_IN_HTML_RE.finditer(decoded):
            candidate = match.group(0)
            if yoomoney_checkout_url(candidate):
                checkout_url = candidate
                break

    return BodyDiagnostics(
        sha256=hashlib.sha256(response.body).hexdigest(),
        marker_yoomoney=marker_yoomoney,
        marker_checkout_path=marker_checkout_path,
        marker_meta_refresh=marker_meta_refresh,
        marker_window_location=marker_window_location,
        marker_location_href=marker_location_href,
        marker_form_action=marker_form_action,
        marker_href=marker_href,
        checkout_marker=checkout_marker,
        checkout_url=checkout_url,
    )


def _response_state(response: UpstreamResponse, location: LocationSummary) -> str:
    if location.classification == "checkout":
        return "checkout"
    if location.classification == "waitpay":
        return "waitpay"
    if location.classification == "missing" and 200 <= response.status < 300:
        return "pending"
    if location.classification == "internal":
        return "internal"
    return "invalid"


def _response_body_file_bytes(response: UpstreamResponse) -> int:
    return response.raw_body_bytes if response.raw_body_bytes is not None else response.body_length


def _structural_log_values(
    structure: HTTP09StructureDiagnostics | None,
) -> tuple[object, ...]:
    if structure is None:
        return (
            "-", "-", "-", "-", "-", "-", "[]", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-",
            "-", "-", "-", "-", "-", "-", "-", "-", "[]", "-", "-", "-", "-", "-"
        )
    header_line_meta = json.dumps(
        [
            {
                "line_index": line.line_index,
                "line_length": line.line_length,
                "is_empty": line.is_empty,
                "is_whitespace_only": line.is_whitespace_only,
                "colon_position": line.colon_position,
                "is_header_syntax": line.is_header_syntax,
                "header_name": line.header_name,
                "starts_with_space": line.starts_with_space,
                "starts_with_tab": line.starts_with_tab,
                "ends_with_space": line.ends_with_space,
                "ends_with_cr": line.ends_with_cr,
                "contains_control": line.contains_control,
                "matches_embedded_http_status": line.matches_embedded_http_status,
                "embedded_http_version": line.embedded_http_version,
                "embedded_http_status_code": line.embedded_http_status_code,
            }
            for line in structure.header_line_meta
        ],
        ensure_ascii=True,
        separators=(",", ":"),
    )
    return (
        structure.leading_bom,
        structure.leading_blank_lines_count,
        structure.newline_mode,
        structure.first_colon_position,
        str(structure.first_line_is_header_syntax).lower(),
        structure.first_header_name,
        json.dumps(structure.header_names, ensure_ascii=True, separators=(",", ":")),
        structure.blank_line_offset,
        f"{structure.printable_ascii_ratio:.4f}",
        str(structure.utf8_decode_valid).lower(),
        str(structure.cp1251_decode_valid).lower(),
        str(structure.contains_location_header).lower(),
        str(structure.contains_checkout_marker).lower(),
        str(structure.contains_waitpay_marker).lower(),
        structure.pseudo_header_line_count,
        structure.separator_length,
        structure.parsed_payload_bytes,
        structure.raw_response_bytes,
        structure.separator_offset,
        structure.blank_line_offset,
        structure.header_blob_length,
        str(structure.header_blob_ends_with_crlf).lower(),
        str(structure.header_blob_ends_with_lf).lower(),
        structure.header_lines_count,
        structure.header_lines_bytes_with_separators,
        header_line_meta,
        str(structure.embedded_http_status_present).lower(),
        structure.embedded_http_version,
        structure.embedded_http_status_code if structure.embedded_http_status_code is not None else "-",
        structure.embedded_http_status_position,
        structure.embedded_http_status_count,
    )


def _log_upstream_response(
    event: str,
    request_id: str,
    response: UpstreamResponse,
    client_id: str,
    *,
    attempt: int | None = None,
) -> None:
    location = summarize_location(response, client_id)
    body = analyze_upstream_body(response)
    attempt_field = "" if attempt is None else f" attempt={attempt}"
    stage = "parse_location" if attempt is None else "poll_waitpay"
    logging.info(
        "event=%s request_id=%s client_id_hash=%s stage=%s%s elapsed_ms=%s http_status=%s "
        "response_mode=%s first_line_class=%s first_line_length=%s curl_exit_code=%s "
        "header_bytes=%s content_type=%s content_length_declared=%s raw_body_bytes=%s body_bytes=%s "
        "body_sha256=%s "
        "response_state=%s location_present=%s location_class=%s location_host=%s location_path=%s "
        "set_cookie_count=%s marker_yoomoney=%s marker_checkout_path=%s marker_meta_refresh=%s "
        "marker_window_location=%s marker_location_href=%s marker_form_action=%s marker_href=%s "
        "body_checkout_marker=%s body_checkout_url_found=%s "
        "leading_bom=%s leading_blank_lines_count=%s newline_mode=%s first_colon_position=%s "
        "first_line_is_header_syntax=%s first_header_name=%s header_names=%s blank_line_offset=%s "
        "printable_ascii_ratio=%s utf8_decode_valid=%s cp1251_decode_valid=%s "
        "contains_location_header=%s contains_checkout_marker=%s contains_waitpay_marker=%s "
        "pseudo_header_line_count=%s separator_length=%s parsed_payload_bytes=%s "
        "raw_response_bytes=%s separator_offset=%s structure_blank_line_offset=%s "
        "header_blob_length=%s header_blob_ends_with_crlf=%s header_blob_ends_with_lf=%s "
        "header_lines_count=%s header_lines_bytes_with_separators=%s header_line_meta=%s "
        "embedded_http_status_present=%s embedded_http_version=%s embedded_http_status_code=%s "
        "embedded_http_status_position=%s embedded_http_status_count=%s",
        event,
        request_id,
        client_id_hash(client_id),
        stage,
        attempt_field,
        response.elapsed_ms,
        response.status,
        response.response_mode,
        response.first_line_class,
        response.first_line_length if response.first_line_length is not None else "-",
        response.curl_exit_code if response.curl_exit_code is not None else "-",
        response.header_bytes,
        _normalised_content_type(response.content_type),
        response.declared_content_length if response.declared_content_length is not None else "-",
        _response_body_file_bytes(response),
        response.body_length,
        body.sha256,
        _response_state(response, location),
        str(location.present).lower(),
        location.classification,
        location.hostname,
        location.pathname,
        len(response.set_cookie_headers),
        str(body.marker_yoomoney).lower(),
        str(body.marker_checkout_path).lower(),
        str(body.marker_meta_refresh).lower(),
        str(body.marker_window_location).lower(),
        str(body.marker_location_href).lower(),
        str(body.marker_form_action).lower(),
        str(body.marker_href).lower(),
        str(body.checkout_marker).lower(),
        str(body.checkout_url is not None).lower(),
        *_structural_log_values(response.structure),
    )


def _exception_type(exc: BaseException) -> str:
    cause = exc.__cause__
    return type(cause).__name__ if cause is not None else type(exc).__name__


def _log_upstream_failure(
    event: str,
    request_id: str,
    client_id: str,
    exc: BridgeError,
    *,
    attempt: int | None = None,
) -> None:
    attempt_field = "" if attempt is None else f" attempt={attempt}"
    if exc.location_header_count is None:
        location_present = "-"
        location_class = "-"
        location_host = "-"
        location_path = "-"
    else:
        location_summary = summarize_location(
            UpstreamResponse(
                exc.http_status or 0,
                exc.location,
                (),
                location_header_count=exc.location_header_count,
            ),
            client_id,
        )
        location_present = str(location_summary.present).lower()
        location_class = location_summary.classification
        location_host = location_summary.hostname
        location_path = location_summary.pathname
    logging.warning(
        "event=%s request_id=%s client_id_hash=%s stage=%s%s exception_class=%s "
        "exception_message=%s elapsed_ms=%s http_status=%s header_bytes=%s body_bytes=%s "
        "response_mode=%s first_line_class=%s first_line_length=%s curl_exit_code=%s "
        "location_present=%s location_class=%s location_host=%s location_path=%s "
        "set_cookie_count=%s final_reason=%s diagnostic_code=%s "
        "leading_bom=%s leading_blank_lines_count=%s newline_mode=%s first_colon_position=%s "
        "first_line_is_header_syntax=%s first_header_name=%s header_names=%s blank_line_offset=%s "
        "printable_ascii_ratio=%s utf8_decode_valid=%s cp1251_decode_valid=%s "
        "contains_location_header=%s contains_checkout_marker=%s contains_waitpay_marker=%s "
        "pseudo_header_line_count=%s separator_length=%s parsed_payload_bytes=%s "
        "raw_response_bytes=%s separator_offset=%s structure_blank_line_offset=%s "
        "header_blob_length=%s header_blob_ends_with_crlf=%s header_blob_ends_with_lf=%s "
        "header_lines_count=%s header_lines_bytes_with_separators=%s header_line_meta=%s "
        "embedded_http_status_present=%s embedded_http_version=%s embedded_http_status_code=%s "
        "embedded_http_status_position=%s embedded_http_status_count=%s",
        event,
        request_id,
        client_id_hash(client_id),
        exc.stage or "-",
        attempt_field,
        exc.exception_class or _exception_type(exc),
        json.dumps(exc.exception_message or "-", ensure_ascii=True),
        exc.elapsed_ms if exc.elapsed_ms is not None else "-",
        exc.http_status if exc.http_status is not None else "-",
        exc.header_bytes if exc.header_bytes is not None else "-",
        exc.body_bytes if exc.body_bytes is not None else "-",
        exc.response_mode or "-",
        exc.first_line_class or "-",
        exc.first_line_length if exc.first_line_length is not None else "-",
        exc.curl_exit_code if exc.curl_exit_code is not None else "-",
        location_present,
        location_class,
        location_host,
        location_path,
        exc.set_cookie_count if exc.set_cookie_count is not None else "-",
        exc.reason,
        exc.diagnostic_code,
        *_structural_log_values(exc.structure),
    )


def _require_redirect(
    response: UpstreamResponse,
    client_id: str,
    *,
    stage: str = "parse_location",
) -> tuple[str, str | None]:
    if not 200 <= response.status < 400:
        raise BridgeError(
            502,
            "upstream_status",
            PAYMENT_LINK_FAILURE_MESSAGE,
            stage=stage,
            elapsed_ms=response.elapsed_ms,
            http_status=response.status,
            header_bytes=response.header_bytes,
            body_bytes=_response_body_file_bytes(response),
            response_mode=response.response_mode,
            first_line_class=response.first_line_class,
            first_line_length=response.first_line_length,
            curl_exit_code=response.curl_exit_code,
            structure=response.structure,
        )
    if _location_count(response) > 1:
        raise BridgeError(
            502,
            "unexpected_upstream_redirect",
            PAYMENT_LINK_FAILURE_MESSAGE,
            stage=stage,
            elapsed_ms=response.elapsed_ms,
            http_status=response.status,
            header_bytes=response.header_bytes,
            body_bytes=_response_body_file_bytes(response),
            response_mode=response.response_mode,
            first_line_class=response.first_line_class,
            first_line_length=response.first_line_length,
            curl_exit_code=response.curl_exit_code,
            structure=response.structure,
        )

    checkout_url = yoomoney_checkout_url(response.location)
    if checkout_url and 300 <= response.status < 400:
        return "checkout", checkout_url
    if is_expected_wait_location(response.location, client_id) and 300 <= response.status < 400:
        return "wait", None
    if response.location is None and 200 <= response.status < 300:
        return "pending", None
    raise BridgeError(
        502,
        "unexpected_upstream_redirect",
        PAYMENT_LINK_FAILURE_MESSAGE,
        stage=stage,
        elapsed_ms=response.elapsed_ms,
        http_status=response.status,
        header_bytes=response.header_bytes,
        body_bytes=_response_body_file_bytes(response),
        response_mode=response.response_mode,
        first_line_class=response.first_line_class,
        first_line_length=response.first_line_length,
        curl_exit_code=response.curl_exit_code,
        structure=response.structure,
    )


class PaymentBridge:
    def __init__(
        self,
        upstream: Upstream,
        rate_limiter: RateLimitStore,
        sleep: Callable[[float], None] = time.sleep,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self.upstream = upstream
        self.rate_limiter = rate_limiter
        self.sleep = sleep
        self.monotonic = monotonic

    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        request_id = request_id or uuid.uuid4().hex
        process_started = time.monotonic()
        parsed = parse_form_body(raw_body)
        logging.info(
            "event=request_started request_id=%s client_id_hash=%s elapsed_ms=%s",
            request_id,
            client_id_hash(parsed.client_id),
            max(0, round((time.monotonic() - process_started) * 1000)),
        )
        claim_result = self.rate_limiter.claim(parsed.client_id, parsed.code)
        if not claim_result.allowed:
            raise BridgeError(
                429,
                "duplicate_payment",
                "Платёж уже формируется.",
                retry_after_seconds=claim_result.retry_after_seconds,
            )

        cookie_jar = ResponseCookieJar()
        try:
            initial = self.upstream.create_payment(parsed.code, parsed.upstream_body)
        except BridgeError as exc:
            _log_upstream_failure("upstream_post_failed", request_id, parsed.client_id, exc)
            raise
        _log_upstream_response("upstream_post", request_id, initial, parsed.client_id)
        cookie_jar.update(initial.set_cookie_headers)
        state, checkout_url = _require_redirect(initial, parsed.client_id)
        initial_body = analyze_upstream_body(initial)
        if state == "checkout" and checkout_url:
            return checkout_url
        if state in {"wait", "pending"} and initial_body.checkout_url:
            logging.info(
                "event=checkout_found_in_body request_id=%s client_id_hash=%s stage=parse_location "
                "body_sha256=%s",
                request_id,
                client_id_hash(parsed.client_id),
                initial_body.sha256,
            )
            return initial_body.checkout_url
        if state != "wait":
            raise BridgeError(
                502,
                "missing_initial_redirect",
                PAYMENT_LINK_FAILURE_MESSAGE,
                stage="parse_location",
                elapsed_ms=initial.elapsed_ms,
                http_status=initial.status,
                header_bytes=initial.header_bytes,
                body_bytes=_response_body_file_bytes(initial),
                response_mode=initial.response_mode,
                first_line_class=initial.first_line_class,
                first_line_length=initial.first_line_length,
                curl_exit_code=initial.curl_exit_code,
                structure=initial.structure,
            )

        started = self.monotonic()
        deadline = started + POLL_WINDOW_SECONDS
        next_check = started + POLL_INTERVAL_SECONDS
        attempt = 0
        poll_count = 0
        body_checkout_marker = initial_body.checkout_marker
        last_response = initial

        def poll_timeout() -> BridgeError:
            return BridgeError(
                504,
                "payment_poll_timeout",
                PAYMENT_LINK_FAILURE_MESSAGE,
                stage="poll_waitpay",
                elapsed_ms=max(0, round((self.monotonic() - started) * 1000)),
                http_status=last_response.status,
                header_bytes=last_response.header_bytes,
                body_bytes=_response_body_file_bytes(last_response),
                poll_count=poll_count,
                body_checkout_marker=body_checkout_marker,
                response_mode=last_response.response_mode,
                first_line_class=last_response.first_line_class,
                first_line_length=last_response.first_line_length,
                curl_exit_code=last_response.curl_exit_code,
                structure=last_response.structure,
            )

        while True:
            now = self.monotonic()
            if now >= deadline:
                raise poll_timeout()

            self.sleep(max(0.0, min(next_check, deadline) - now))
            now = self.monotonic()
            if now >= deadline:
                raise poll_timeout()

            attempt += 1
            try:
                response = self.upstream.check_payment(
                    parsed.client_id,
                    cookie_jar.as_header(),
                    min(UPSTREAM_TIMEOUT_SECONDS, max(0.1, deadline - now)),
                )
            except BridgeError as exc:
                _log_upstream_failure(
                    "upstream_poll_failed",
                    request_id,
                    parsed.client_id,
                    exc,
                    attempt=attempt,
                )
                raise
            last_response = response
            poll_count += 1
            _log_upstream_response(
                "upstream_poll",
                request_id,
                response,
                parsed.client_id,
                attempt=attempt,
            )
            cookie_jar.update(response.set_cookie_headers)
            state, checkout_url = _require_redirect(response, parsed.client_id, stage="poll_waitpay")
            response_body = analyze_upstream_body(response)
            body_checkout_marker = body_checkout_marker or response_body.checkout_marker
            if state == "checkout" and checkout_url:
                return checkout_url
            if state in {"wait", "pending"} and response_body.checkout_url:
                logging.info(
                    "event=checkout_found_in_body request_id=%s client_id_hash=%s stage=poll_waitpay "
                    "attempt=%s body_sha256=%s",
                    request_id,
                    client_id_hash(parsed.client_id),
                    attempt,
                    response_body.sha256,
                )
                return response_body.checkout_url
            if state not in {"wait", "pending"}:
                raise BridgeError(
                    502,
                    "unexpected_poll_state",
                    PAYMENT_LINK_FAILURE_MESSAGE,
                    stage="poll_waitpay",
                    elapsed_ms=max(0, round((self.monotonic() - started) * 1000)),
                    http_status=response.status,
                    header_bytes=response.header_bytes,
                    body_bytes=_response_body_file_bytes(response),
                    poll_count=poll_count,
                    body_checkout_marker=body_checkout_marker,
                    response_mode=response.response_mode,
                    first_line_class=response.first_line_class,
                    first_line_length=response.first_line_length,
                    curl_exit_code=response.curl_exit_code,
                    structure=response.structure,
                )
            next_check += POLL_INTERVAL_SECONDS


def render_checkout_page(checkout_url: str) -> bytes:
    escaped_url = html.escape(checkout_url, quote=True)
    script_url = json.dumps(checkout_url).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    document = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Платёж сформирован</title>
<style>
html,body{{margin:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f3f5f4;color:#202522}}
body{{display:grid;place-items:center;padding:20px;box-sizing:border-box}}
main{{width:min(560px,100%);padding:32px 24px;background:#fff;border:1px solid #d6ddda;border-radius:16px;box-shadow:0 12px 36px rgba(26,45,34,.14);text-align:center}}
h1{{margin:0 0 16px;font-size:clamp(28px,7vw,40px)}}
p{{font-size:18px;line-height:1.5}}
.button{{display:block;margin:24px auto 16px;padding:17px 22px;border-radius:12px;background:#258f4e;color:#fff;text-decoration:none;font-size:21px;font-weight:750}}
.fallback{{overflow-wrap:anywhere;color:#145f34}}
</style>
</head>
<body>
<main>
<h1>Платёж сформирован</h1>
<p>Сейчас откроется защищённая страница оплаты.</p>
<a class="button" href="{escaped_url}" rel="noreferrer">Перейти к оплате</a>
<p>Если переход не произошёл, используйте <a class="fallback" href="{escaped_url}" rel="noreferrer">обычную ссылку</a>.</p>
</main>
<script>window.setTimeout(function(){{window.location.assign({script_url});}},700);</script>
</body>
</html>
"""
    return document.encode("utf-8")


def _render_ticket_return_page(
    title: str,
    message_html: str,
    request_id: str,
    *,
    countdown_script: str = "",
) -> bytes:
    safe_request_id = html.escape(request_id)
    return (
        "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        f"<title>{html.escape(title)}</title>"
        "<style>html,body{margin:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,"
        "Segoe UI,Arial,sans-serif;background:#f3f5f4;color:#202522}"
        "body{display:grid;place-items:center;padding:20px;box-sizing:border-box}"
        "main{width:min(560px,100%);padding:32px 24px;background:#fff;border:1px solid #d6ddda;"
        "border-radius:16px;box-shadow:0 12px 36px rgba(26,45,34,.14);text-align:center;box-sizing:border-box}"
        "h1{margin:0 0 16px;font-size:clamp(28px,7vw,40px)}p{font-size:18px;line-height:1.5}"
        ".button{display:inline-block;margin:22px auto 8px;padding:15px 22px;border:0;border-radius:12px;"
        "background:#258f4e;color:#fff;font:inherit;font-size:18px;font-weight:750;cursor:pointer}"
        ".request-id{margin-top:24px;color:#69726d;font-size:12px;line-height:1.5;overflow-wrap:anywhere}"
        "</style></head><body><main>"
        f"<h1>{html.escape(title)}</h1>{message_html}"
        '<button class="button" type="button" onclick="window.history.back()">Вернуться к билету</button>'
        f'<p class="request-id">Код запроса: <code>{safe_request_id}</code></p>'
        f"</main>{countdown_script}</body></html>"
    ).encode("utf-8")


def render_duplicate_payment_page(retry_after_seconds: int, request_id: str) -> bytes:
    retry_after_seconds = max(1, int(retry_after_seconds))
    message_html = (
        '<p>Подождите <strong id="retry-countdown" '
        f'data-retry-after="{retry_after_seconds}">{retry_after_seconds}</strong> секунд и попробуйте снова.</p>'
    )
    countdown_script = (
        "<script>(function(){var node=document.getElementById('retry-countdown');"
        f"var remaining={retry_after_seconds};"
        "var timer=window.setInterval(function(){remaining=Math.max(0,remaining-1);"
        "node.textContent=String(remaining);if(remaining===0){window.clearInterval(timer);}},1000);})();</script>"
    )
    return _render_ticket_return_page(
        "Платёж уже формируется",
        message_html,
        request_id,
        countdown_script=countdown_script,
    )


def render_no_location_page(request_id: str) -> bytes:
    return _render_ticket_return_page(
        "Платёжная ссылка пока не получена",
        "<p>Подождите 30 секунд, затем снова откройте билет и повторите оплату.</p>",
        request_id,
    )


def render_message_page(
    title: str,
    message: str,
    diagnostic_code: str | None = None,
    request_id: str | None = None,
    *,
    poll_count: int | None = None,
    body_checkout_marker: bool | None = None,
) -> bytes:
    diagnostics = ""
    if diagnostic_code and request_id:
        poll_diagnostics = ""
        if poll_count is not None:
            poll_diagnostics += f"<br>poll_count: <code>{poll_count}</code>"
        if body_checkout_marker is not None:
            poll_diagnostics += (
                "<br>body_checkout_marker: "
                f"<code>{str(body_checkout_marker).lower()}</code>"
            )
        diagnostics = (
            '<p class="diagnostic">Диагностический код: '
            f"<code>{html.escape(diagnostic_code)}</code><br>"
            f"Код запроса: <code>{html.escape(request_id)}</code>"
            f"{poll_diagnostics}</p>"
        )
    return (
        "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        f"<title>{html.escape(title)}</title>"
        "<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;"
        "margin:0;padding:24px;background:#f3f5f4;color:#202522}main{max-width:560px;margin:12vh auto;"
        "background:#fff;border:1px solid #d6ddda;border-radius:14px;padding:28px}"
        ".diagnostic{margin-top:24px;padding-top:18px;border-top:1px solid #d6ddda;color:#4d5651;"
        "font-size:14px;line-height:1.7}code{overflow-wrap:anywhere}</style></head>"
        f"<body><main><h1>{html.escape(title)}</h1><p>{html.escape(message)}</p>{diagnostics}</main></body></html>"
    ).encode("utf-8")


class BridgeHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, server_address: tuple[str, int], bridge: PaymentBridge) -> None:
        super().__init__(server_address, BridgeRequestHandler)
        self.bridge = bridge


class BridgeRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server: BridgeHTTPServer

    def setup(self) -> None:
        super().setup()
        self.request_id = uuid.uuid4().hex
        self.request_started_at = time.monotonic()

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_html(
        self,
        status: int,
        body: bytes,
        result_code: str,
        *,
        final_reason: str | None = None,
        allow: str | None = None,
        retry_after_seconds: int | None = None,
        head_only: bool = False,
    ) -> None:
        self.send_response(status)
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        self.send_header("X-Bridge-Request-Id", self.request_id)
        self.send_header("X-Bridge-Result", result_code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        if allow:
            self.send_header("Allow", allow)
        if retry_after_seconds is not None:
            self.send_header("Retry-After", str(max(1, int(retry_after_seconds))))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)
        self.close_connection = True
        logging.info(
            "event=request_finished request_id=%s elapsed_ms=%s http_status=%s final_reason=%s",
            self.request_id,
            max(0, round((time.monotonic() - self.request_started_at) * 1000)),
            status,
            final_reason or result_code,
        )

    def _not_found(self, *, head_only: bool = False) -> None:
        result = "BRIDGE-NOT-FOUND"
        self._send_html(
            404,
            render_message_page("404", "Страница не найдена.", result, self.request_id),
            result,
            head_only=head_only,
        )

    def _method_not_allowed(self, *, head_only: bool = False) -> None:
        result = "BRIDGE-METHOD-NOT-ALLOWED"
        self._send_html(
            405,
            render_message_page(
                "Метод не поддерживается",
                "Для этого адреса разрешён только POST.",
                result,
                self.request_id,
            ),
            result,
            allow="POST",
            head_only=head_only,
        )

    def _invalid_request(self, status: int, message: str) -> None:
        result = "BRIDGE-INVALID-REQUEST"
        self._send_html(
            status,
            render_message_page("Ошибка", message, result, self.request_id),
            result,
        )

    def do_POST(self) -> None:
        logging.info("event=request_received request_id=%s method=POST", self.request_id)
        if self.path != BRIDGE_PATH:
            self._not_found()
            return

        if self.headers.get("Transfer-Encoding") is not None:
            self._invalid_request(400, "Некорректные данные формы.")
            return

        content_types = self.headers.get_all("Content-Type", [])
        lengths = self.headers.get_all("Content-Length", [])
        if len(content_types) != 1 or len(lengths) != 1:
            self._invalid_request(400, "Некорректные заголовки запроса.")
            return

        content_type = Message()
        content_type["content-type"] = content_types[0]
        if content_type.get_content_type() != "application/x-www-form-urlencoded":
            self._invalid_request(415, "Неподдерживаемый тип данных.")
            return

        try:
            content_length = int(lengths[0])
        except ValueError:
            self._invalid_request(400, "Некорректная длина запроса.")
            return
        if content_length <= 0 or content_length > MAX_BODY_BYTES:
            self._invalid_request(413, "Слишком большой запрос.")
            return

        raw_body = self.rfile.read(content_length)
        if len(raw_body) != content_length:
            self._invalid_request(400, "Запрос передан не полностью.")
            return

        try:
            checkout_url = self.server.bridge.process(raw_body, self.request_id)
            logging.info("event=payment_ready request_id=%s", self.request_id)
            self._send_html(200, render_checkout_page(checkout_url), "BRIDGE-OK", final_reason="payment_ready")
        except BridgeError as exc:
            logging.warning(
                "event=request_failed request_id=%s stage=%s exception_class=%s "
                "exception_message=%s elapsed_ms=%s http_status=%s header_bytes=%s body_bytes=%s "
                "response_mode=%s first_line_class=%s first_line_length=%s curl_exit_code=%s "
                "poll_count=%s body_checkout_marker=%s retry_after_seconds=%s "
                "final_reason=%s diagnostic_code=%s",
                self.request_id,
                exc.stage or "-",
                exc.exception_class or _exception_type(exc),
                json.dumps(exc.exception_message or "-", ensure_ascii=True),
                max(0, round((time.monotonic() - self.request_started_at) * 1000)),
                exc.http_status if exc.http_status is not None else "-",
                exc.header_bytes if exc.header_bytes is not None else "-",
                exc.body_bytes if exc.body_bytes is not None else "-",
                exc.response_mode or "-",
                exc.first_line_class or "-",
                exc.first_line_length if exc.first_line_length is not None else "-",
                exc.curl_exit_code if exc.curl_exit_code is not None else "-",
                exc.poll_count if exc.poll_count is not None else "-",
                str(exc.body_checkout_marker).lower() if exc.body_checkout_marker is not None else "-",
                exc.retry_after_seconds if exc.retry_after_seconds is not None else "-",
                exc.reason,
                exc.diagnostic_code,
            )
            if exc.reason == "duplicate_payment":
                retry_after_seconds = max(1, exc.retry_after_seconds or RATE_LIMIT_SECONDS)
                response_body = render_duplicate_payment_page(retry_after_seconds, self.request_id)
            elif exc.reason == "missing_initial_redirect":
                retry_after_seconds = None
                response_body = render_no_location_page(self.request_id)
            else:
                retry_after_seconds = None
                response_body = render_message_page(
                    "Оплата не сформирована",
                    exc.public_message,
                    exc.diagnostic_code,
                    self.request_id,
                    poll_count=exc.poll_count,
                    body_checkout_marker=exc.body_checkout_marker,
                )
            self._send_html(
                exc.status,
                response_body,
                exc.diagnostic_code,
                final_reason=exc.reason,
                retry_after_seconds=retry_after_seconds,
            )
        except Exception as exc:
            logging.error(
                "event=unexpected_failure request_id=%s exception_class=%s exception_message=%s "
                "final_reason=unexpected_failure",
                self.request_id,
                type(exc).__name__,
                json.dumps(safe_exception_message(exc), ensure_ascii=True),
            )
            result = "BRIDGE-INTERNAL"
            self._send_html(
                500,
                render_message_page(
                    "Ошибка",
                    PAYMENT_LINK_FAILURE_MESSAGE,
                    result,
                    self.request_id,
                ),
                result,
                final_reason="unexpected_failure",
            )

    def do_GET(self) -> None:
        logging.info("event=request_received request_id=%s method=GET", self.request_id)
        if self.path == BRIDGE_PATH:
            self._method_not_allowed()
        else:
            self._not_found()

    def do_HEAD(self) -> None:
        logging.info("event=request_received request_id=%s method=HEAD", self.request_id)
        if self.path == BRIDGE_PATH:
            self._method_not_allowed(head_only=True)
        else:
            self._not_found(head_only=True)

    def do_OPTIONS(self) -> None:
        logging.info("event=request_received request_id=%s method=%s", self.request_id, self.command)
        if self.path == BRIDGE_PATH:
            self._method_not_allowed()
        else:
            self._not_found()

    do_PUT = do_OPTIONS
    do_DELETE = do_OPTIONS
    do_PATCH = do_OPTIONS


def build_server(
    host: str,
    port: int,
    database_path: Path,
    transport: str = "python",
) -> BridgeHTTPServer:
    limiter = SQLiteRateLimiter(database_path)
    upstream: Upstream
    if transport == "python":
        upstream = FixedPHUpstream()
    elif transport == "curl":
        upstream = CurlPHUpstream()
    else:
        raise ValueError("unsupported transport")
    bridge = PaymentBridge(upstream, limiter)
    return BridgeHTTPServer((host, port), bridge)


def main() -> None:
    parser = argparse.ArgumentParser(description="Riga Land payment bridge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3102)
    parser.add_argument("--state-db", type=Path, required=True)
    parser.add_argument("--transport", choices=("python", "curl"), default="python")
    args = parser.parse_args()

    if args.host not in {"127.0.0.1", "::1"}:
        raise SystemExit("The bridge must listen on loopback only")
    if not 1 <= args.port <= 65535:
        raise SystemExit("Invalid port")

    os.umask(0o077)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s level=%(levelname)s %(message)s")
    server = build_server(args.host, args.port, args.state_db, args.transport)
    logging.info(
        "event=bridge_started host=loopback port=%s transport=%s http09_allowed=%s",
        args.port,
        args.transport,
        str(args.transport == "curl").lower(),
    )
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        logging.info("event=bridge_stopped")


if __name__ == "__main__":
    main()
