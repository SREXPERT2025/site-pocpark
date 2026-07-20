from __future__ import annotations

import http.client
import io
import logging
import subprocess
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

import bridge


def observed_four_line_http09_fixture() -> bytes:
    server_line = b"Server: " + (b"P" * 33)
    location_line = (
        b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId="
        + (b"t" * 36)
    )
    content_length_line = b"Content-Length: 0"
    embedded_status_line = b"HTTP/1.1 303 See Other"
    response = b"\r\n".join(
        (server_line, location_line, content_length_line, embedded_status_line)
    ) + b"\r\n\r\n"
    assert len(server_line) == 41
    assert len(location_line) == 104
    assert len(response) == 194
    assert response.find(b"\r\n\r\n") == 190
    return response


class MemoryRateLimiter:
    def __init__(self, allowed: bool = True, retry_after_seconds: int = 29) -> None:
        self.allowed = allowed
        self.retry_after_seconds = retry_after_seconds
        self.calls: list[tuple[str, str]] = []

    def claim(self, client_id: str, code: str) -> bridge.RateLimitResult:
        self.calls.append((client_id, code))
        return bridge.RateLimitResult(
            allowed=self.allowed,
            retry_after_seconds=0 if self.allowed else self.retry_after_seconds,
            claim_age_seconds=0.0 if self.allowed else 1.0,
        )


class FakeUpstream:
    def __init__(self, initial: bridge.UpstreamResponse, polls: list[bridge.UpstreamResponse] | None = None) -> None:
        self.initial = initial
        self.polls = list(polls or [])
        self.create_calls: list[tuple[str, bytes]] = []
        self.poll_calls: list[tuple[str, str | None, float]] = []

    def create_payment(self, code: str, body: bytes) -> bridge.UpstreamResponse:
        self.create_calls.append((code, body))
        return self.initial

    def check_payment(self, client_id: str, cookie_header: str | None, timeout: float) -> bridge.UpstreamResponse:
        self.poll_calls.append((client_id, cookie_header, timeout))
        return self.polls.pop(0)


class FakeClock:
    def __init__(self) -> None:
        self.value = 0.0

    def monotonic(self) -> float:
        return self.value

    def sleep(self, duration: float) -> None:
        self.value += duration


class FakeWallClock:
    def __init__(self, value: float = 1_000.0) -> None:
        self.value = value

    def time(self) -> float:
        return self.value


class FormParsingTests(unittest.TestCase):
    def test_preserves_native_form_bytes_and_removes_only_code(self) -> None:
        body = (
            b"client_id=42&printbill=on&notify=%F2%E5%F1%F2%40mail.ru&"
            b"paycard=%CE%EF%EB%E0%F2%E0+%EA%E0%F0%F2%EE%E9&bank=&code=AB12CD"
        )
        parsed = bridge.parse_form_body(body)

        self.assertEqual(parsed.client_id, "42")
        self.assertEqual(parsed.code, "AB12CD")
        self.assertEqual(parsed.payment_field, "paycard")
        self.assertEqual(
            parsed.upstream_body,
            b"client_id=42&printbill=on&notify=%F2%E5%F1%F2%40mail.ru&"
            b"paycard=%CE%EF%EB%E0%F2%E0+%EA%E0%F0%F2%EE%E9&bank=",
        )

    def test_accepts_numeric_paybtn(self) -> None:
        parsed = bridge.parse_form_body(b"client_id=7&notify=&paybtn12=&bank=test&code=XYZ9")
        self.assertEqual(parsed.payment_field, "paybtn12")

    def test_rejects_unknown_target_url_field(self) -> None:
        with self.assertRaisesRegex(bridge.BridgeError, "unknown_field"):
            bridge.parse_form_body(b"client_id=7&payqr=x&code=XYZ9&url=https%3A%2F%2Flocalhost")

    def test_rejects_bare_paybtn_and_multiple_actions(self) -> None:
        for body in (
            b"client_id=7&paybtn=&code=XYZ9",
            b"client_id=7&paycard=x&payqr=x&code=XYZ9",
        ):
            with self.subTest(body=body):
                with self.assertRaises(bridge.BridgeError):
                    bridge.parse_form_body(body)

    def test_rejects_invalid_required_values_and_duplicate_fields(self) -> None:
        bodies = (
            b"client_id=0&paycard=x&code=ABC",
            b"client_id=1&paycard=x&code=A-B",
            b"client_id=1&client_id=2&paycard=x&code=ABC",
            b"client_id=1&paycard=x&code=ABC%ZZ",
        )
        for body in bodies:
            with self.subTest(body=body):
                with self.assertRaises(bridge.BridgeError):
                    bridge.parse_form_body(body)

    def test_notify_limit_is_enforced(self) -> None:
        body = b"client_id=1&notify=" + (b"a" * 201) + b"&paycard=x&code=ABC"
        with self.assertRaisesRegex(bridge.BridgeError, "invalid_notify"):
            bridge.parse_form_body(body)


class RedirectPolicyTests(unittest.TestCase):
    def test_allows_only_exact_yoomoney_checkout_https_url(self) -> None:
        allowed = "https://yoomoney.ru/checkout/payments/v2/contract?orderId=secret"
        self.assertEqual(bridge.yoomoney_checkout_url(allowed), allowed)

        denied = (
            "http://yoomoney.ru/checkout/x",
            "https://yoomoney.ru.evil.example/checkout/x",
            "https://user@yoomoney.ru/checkout/x",
            "https://yoomoney.ru:444/checkout/x",
            "https://yoomoney.ru/not-checkout/x",
            "https://yoomoney.ru/checkout/x\tignored",
            "https://yoomoney.ru/checkout/x\x01",
            "https://yoomoney.ru/checkout/x<script>",
            "https://127.0.0.1/checkout/x",
            "https://10.0.0.1/checkout/x",
        )
        for location in denied:
            with self.subTest(location=location):
                self.assertIsNone(bridge.yoomoney_checkout_url(location))

    def test_wait_location_must_match_exact_client(self) -> None:
        self.assertTrue(bridge.is_expected_wait_location("waitpay?id=42", "42"))
        self.assertTrue(bridge.is_expected_wait_location("/pub/waitpay?id=42", "42"))
        self.assertFalse(bridge.is_expected_wait_location("/pub/waitpay?id=43", "42"))
        self.assertFalse(bridge.is_expected_wait_location("https://parking.rigaland.ru/pub/waitpay?id=42", "42"))
        self.assertFalse(bridge.is_expected_wait_location("/pub/waitpay?id=42&url=https://evil.example", "42"))

    def test_safe_location_classification_never_includes_query(self) -> None:
        cases = (
            (bridge.UpstreamResponse(303, "https://yoomoney.ru/checkout/order?orderId=secret", ()), "checkout", "yoomoney.ru", "/checkout/order"),
            (bridge.UpstreamResponse(303, "/pub/waitpay?id=42", ()), "waitpay", "-", "/pub/waitpay"),
            (bridge.UpstreamResponse(302, "https://parking.rigaland.ru/pub/pay?code=secret", ()), "internal", "parking.rigaland.ru", "/pub/pay"),
            (bridge.UpstreamResponse(200, None, ()), "missing", "-", "-"),
            (bridge.UpstreamResponse(302, "https://evil.example/path?token=secret", ()), "invalid", "evil.example", "/path"),
        )
        for response, expected_class, expected_host, expected_path in cases:
            with self.subTest(expected_class=expected_class):
                summary = bridge.summarize_location(response, "42")
                self.assertEqual(summary.classification, expected_class)
                self.assertEqual(summary.hostname, expected_host)
                self.assertEqual(summary.pathname, expected_path)
                self.assertNotIn("?", summary.pathname)
                self.assertNotIn("secret", summary.pathname)

    @mock.patch("bridge.socket.getaddrinfo")
    def test_dns_guard_rejects_private_or_mixed_answers(self, getaddrinfo: mock.Mock) -> None:
        getaddrinfo.return_value = [
            (2, 1, 6, "", ("203.0.113.5", 443)),
            (2, 1, 6, "", ("127.0.0.1", 443)),
        ]
        with self.assertRaisesRegex(bridge.BridgeError, "upstream_non_public_ip"):
            bridge.resolve_public_ip(bridge.UPSTREAM_HOST)


class BodyDiagnosticsTests(unittest.TestCase):
    def test_extracts_html_entity_encoded_checkout_url_and_records_markers(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque&source=waitpay"
        body = (
            b'<html><head><meta http-equiv="refresh" '
            b'content="0;url=https://yoomoney.ru/checkout/order?orderId=opaque&amp;source=waitpay">'
            b'</head><body><script>window.location.href="/pending";</script>'
            b'<form action="/retry"><a href="/help">wait</a></form></body></html>'
        )
        response = bridge.UpstreamResponse(
            200,
            None,
            (),
            body_length=len(body),
            location_header_count=0,
            body=body,
            content_type="text/html; charset=utf-8",
            declared_content_length=len(body),
        )

        diagnostics = bridge.analyze_upstream_body(response)

        self.assertEqual(diagnostics.checkout_url, checkout)
        self.assertTrue(diagnostics.checkout_marker)
        self.assertTrue(diagnostics.marker_yoomoney)
        self.assertTrue(diagnostics.marker_checkout_path)
        self.assertTrue(diagnostics.marker_meta_refresh)
        self.assertTrue(diagnostics.marker_window_location)
        self.assertTrue(diagnostics.marker_location_href)
        self.assertTrue(diagnostics.marker_form_action)
        self.assertTrue(diagnostics.marker_href)
        self.assertRegex(diagnostics.sha256, r"^[0-9a-f]{64}$")

    def test_does_not_extract_checkout_from_unapproved_hostname(self) -> None:
        body = b'<html><a href="https://yoomoney.ru.evil.example/checkout/order">pay</a></html>'
        response = bridge.UpstreamResponse(
            200,
            None,
            (),
            body_length=len(body),
            body=body,
            content_type="text/html",
        )

        diagnostics = bridge.analyze_upstream_body(response)

        self.assertIsNone(diagnostics.checkout_url)
        self.assertTrue(diagnostics.checkout_marker)


class StrictHTTPParserTests(unittest.TestCase):
    class SocketFixture:
        def __init__(self, response: bytes) -> None:
            self.response = response

        def makefile(self, mode: str) -> io.BytesIO:
            self.assert_mode(mode)
            return io.BytesIO(self.response)

        @staticmethod
        def assert_mode(mode: str) -> None:
            if mode != "rb":
                raise AssertionError(mode)

    def test_python_http_parser_accepts_saved_ph_header_shape(self) -> None:
        raw = (
            b"HTTP/1.1 200 OK\r\n"
            b"Server: openresty\r\n"
            b"Content-Type: text/html; charset=windows-1251\r\n"
            b"Content-Length: 0\r\n"
            b"Connection: close\r\n\r\n"
        )
        response = http.client.HTTPResponse(self.SocketFixture(raw))  # type: ignore[arg-type]
        response.begin()
        self.assertEqual(response.status, 200)

    @mock.patch("bridge.PinnedHTTPSConnection")
    @mock.patch("bridge.resolve_public_ip", return_value="93.184.216.34")
    def test_bad_status_line_is_safely_classified(
        self,
        resolve: mock.Mock,
        connection_class: mock.Mock,
    ) -> None:
        del resolve
        connection = connection_class.return_value
        connection.stage = "read_status"
        connection.getresponse.side_effect = http.client.BadStatusLine(
            "https://yoomoney.ru/checkout/x?orderId=secret"
        )

        with self.assertRaises(bridge.BridgeError) as caught:
            bridge.FixedPHUpstream().create_payment("ABC123", b"client_id=42&paycard=x")

        error = caught.exception
        self.assertEqual(error.reason, "upstream_request_failure")
        self.assertEqual(error.diagnostic_code, "BRIDGE-UPSTREAM-PARSE")
        self.assertEqual(error.stage, "read_status")
        self.assertEqual(error.exception_class, "BadStatusLine")
        self.assertEqual(error.exception_message, "invalid HTTP status line")
        self.assertNotIn("orderId", error.exception_message or "")

    def test_safe_exception_message_removes_url_and_query(self) -> None:
        message = bridge.safe_exception_message(
            OSError("failed https://example.test/path?orderId=secret&notify=private")
        )
        self.assertNotIn("secret", message)
        self.assertNotIn("notify", message.lower())
        self.assertNotIn("example.test", message)

    def test_required_diagnostic_codes_are_mapped(self) -> None:
        self.assertEqual(bridge._upstream_diagnostic_code("connect"), "BRIDGE-UPSTREAM-CONNECT")
        self.assertEqual(bridge._upstream_diagnostic_code("tls"), "BRIDGE-UPSTREAM-TLS")
        self.assertEqual(bridge._upstream_diagnostic_code("read_status"), "BRIDGE-UPSTREAM-PARSE")
        self.assertEqual(
            bridge.BridgeError(502, "missing_initial_redirect", bridge.PAYMENT_LINK_FAILURE_MESSAGE).diagnostic_code,
            "BRIDGE-UPSTREAM-NO-LOCATION",
        )
        self.assertEqual(
            bridge.BridgeError(502, "unexpected_upstream_redirect", bridge.PAYMENT_LINK_FAILURE_MESSAGE).diagnostic_code,
            "BRIDGE-INVALID-REDIRECT",
        )
        self.assertEqual(
            bridge.BridgeError(504, "payment_poll_timeout", bridge.PAYMENT_LINK_FAILURE_MESSAGE).diagnostic_code,
            "BRIDGE-WAITPAY-TIMEOUT",
        )
        self.assertEqual(
            bridge.BridgeError(502, "upstream_http09_rejected", bridge.PAYMENT_LINK_FAILURE_MESSAGE).diagnostic_code,
            "BRIDGE-UPSTREAM-HTTP09",
        )


class TolerantCurlParserTests(unittest.TestCase):
    @staticmethod
    def parse(raw_headers: bytes = b"", raw_body: bytes = b"") -> bridge.UpstreamResponse:
        return bridge._parse_curl_response(
            raw_headers,
            raw_body,
            curl_exit_code=0,
            elapsed_ms=12,
        )

    def test_standard_http11_redirect_remains_standard(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque"
        headers = (
            b"HTTP/1.1 303 See Other\r\n"
            b"Location: https://yoomoney.ru/checkout/order?orderId=opaque\r\n"
            b"Content-Length: 0\r\n\r\n"
        )

        response = self.parse(headers, b"")

        self.assertEqual(response.status, 303)
        self.assertEqual(response.location, checkout)
        self.assertEqual(response.response_mode, "standard_http")
        self.assertEqual(response.first_line_class, "http_status")
        self.assertEqual(response.header_bytes, len(headers))
        self.assertEqual(response.raw_body_bytes, 0)
        self.assertEqual(response.curl_exit_code, 0)

    def test_exact_real_crlf_pseudo_headers_exclude_separator_from_lines(self) -> None:
        checkout = "https://yoomoney.ru/checkout/payments/v2/contract?orderId=test"
        raw = (
            b"Server: PH Parking\r\n"
            b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId=test\r\n"
            b"Content-Length: 0\r\n"
            b"\r\n"
        )
        structure = bridge.analyze_http09_structure(raw)
        payload, _ = bridge._strip_allowed_http09_prefix(raw, structure)
        split_response = bridge._split_pseudo_header_block(payload, structure)

        self.assertEqual(split_response.separator_offset, raw.find(b"\r\n\r\n"))
        self.assertEqual(split_response.separator_length, 4)
        self.assertEqual(
            split_response.header_lines,
            (
                b"Server: PH Parking",
                b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId=test",
                b"Content-Length: 0",
            ),
        )
        self.assertNotIn(b"", split_response.header_lines)
        self.assertEqual(split_response.body_blob, b"")

        response = self.parse(raw_body=raw)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(bridge.summarize_location(response, "42").classification, "checkout")
        self.assertEqual(response.body_length, 0)
        self.assertEqual(response.structure.pseudo_header_line_count, 3)  # type: ignore[union-attr]
        self.assertEqual(response.structure.separator_length, 4)  # type: ignore[union-attr]
        self.assertEqual(response.structure.parsed_payload_bytes, 0)  # type: ignore[union-attr]

        service = bridge.PaymentBridge(FakeUpstream(response), MemoryRateLimiter())
        self.assertEqual(
            service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123"),
            checkout,
        )

    def test_observed_194_byte_four_line_structure_is_safely_classified(self) -> None:
        raw = observed_four_line_http09_fixture()
        checkout = "https://yoomoney.ru/checkout/payments/v2/contract?orderId=" + ("t" * 36)
        structure = bridge.analyze_http09_structure(raw)
        split_response = bridge._split_pseudo_header_block(raw, structure)

        self.assertEqual(structure.raw_response_bytes, 194)
        self.assertEqual(structure.separator_offset, 190)
        self.assertEqual(structure.blank_line_offset, 190)
        self.assertEqual(structure.separator_length, 4)
        self.assertEqual(structure.parsed_payload_bytes, 0)
        self.assertEqual(structure.header_blob_length, 190)
        self.assertFalse(structure.header_blob_ends_with_crlf)
        self.assertFalse(structure.header_blob_ends_with_lf)
        self.assertEqual(structure.header_lines_count, 4)
        self.assertEqual(structure.header_lines_bytes_with_separators, 190)
        self.assertEqual(structure.header_names, ("server", "location", "content-length"))
        self.assertEqual(len(split_response.header_lines), 4)
        self.assertEqual(split_response.body_blob, b"")

        fourth_line = structure.header_line_meta[3]
        self.assertEqual(fourth_line.line_index, 4)
        self.assertGreater(fourth_line.line_length, 0)
        self.assertFalse(fourth_line.is_empty)
        self.assertFalse(fourth_line.is_whitespace_only)
        self.assertEqual(fourth_line.colon_position, -1)
        self.assertFalse(fourth_line.is_header_syntax)
        self.assertEqual(fourth_line.header_name, "-")
        self.assertFalse(fourth_line.starts_with_space)
        self.assertFalse(fourth_line.starts_with_tab)
        self.assertFalse(fourth_line.ends_with_space)
        self.assertFalse(fourth_line.ends_with_cr)
        self.assertFalse(fourth_line.contains_control)
        self.assertTrue(fourth_line.matches_embedded_http_status)
        self.assertEqual(fourth_line.embedded_http_version, "HTTP/1.1")
        self.assertEqual(fourth_line.embedded_http_status_code, 303)
        self.assertTrue(structure.embedded_http_status_present)
        self.assertEqual(structure.embedded_http_version, "HTTP/1.1")
        self.assertEqual(structure.embedded_http_status_code, 303)
        self.assertEqual(structure.embedded_http_status_position, 4)
        self.assertEqual(structure.embedded_http_status_count, 1)

        response = self.parse(raw_body=raw)
        self.assertEqual(response.status, 303)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(response.location, checkout)
        self.assertEqual(bridge.summarize_location(response, "42").classification, "checkout")
        service = bridge.PaymentBridge(FakeUpstream(response), MemoryRateLimiter())
        self.assertEqual(
            service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123"),
            checkout,
        )

    def test_embedded_status_exact_checkout_fixture_is_payment_ready(self) -> None:
        checkout = "https://yoomoney.ru/checkout/payments/v2/contract?orderId=test"
        raw = (
            b"Server: PH Parking\r\n"
            b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId=test\r\n"
            b"Content-Length: 0\r\n"
            b"HTTP/1.1 303 See Other\r\n\r\n"
        )

        response = self.parse(raw_body=raw)
        structure = response.structure
        self.assertIsNotNone(structure)
        assert structure is not None
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(response.status, 303)
        self.assertTrue(structure.embedded_http_status_present)
        self.assertEqual(structure.embedded_http_status_code, 303)
        self.assertEqual(structure.pseudo_header_line_count, 4)
        self.assertEqual(structure.header_names, ("server", "location", "content-length"))
        self.assertEqual(bridge.summarize_location(response, "42").classification, "checkout")
        service = bridge.PaymentBridge(FakeUpstream(response), MemoryRateLimiter())
        self.assertEqual(
            service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123"),
            checkout,
        )

    def test_embedded_status_is_allowed_first_or_last(self) -> None:
        status = b"HTTP/1.1 303 See Other"
        headers = (
            b"Server: PH Parking",
            b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId=test",
            b"Content-Length: 0",
        )
        for lines, expected_position in (
            ((status,) + headers, 1),
            (headers + (status,), 4),
        ):
            with self.subTest(expected_position=expected_position):
                response = self.parse(raw_body=b"\r\n".join(lines) + b"\r\n\r\n")
                structure = response.structure
                self.assertIsNotNone(structure)
                assert structure is not None
                self.assertEqual(response.status, 303)
                self.assertEqual(response.response_mode, "pseudo_headers")
                self.assertEqual(structure.embedded_http_status_position, expected_position)
                self.assertEqual(structure.embedded_http_status_count, 1)

    def test_embedded_303_waitpay_uses_existing_classification(self) -> None:
        raw = (
            b"HTTP/1.0 303 See Other\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"Content-Length: 0\r\n\r\n"
        )

        response = self.parse(raw_body=raw)
        structure = response.structure
        self.assertIsNotNone(structure)
        assert structure is not None
        self.assertEqual(response.status, 303)
        self.assertEqual(structure.embedded_http_version, "HTTP/1.0")
        self.assertEqual(bridge.summarize_location(response, "42").classification, "waitpay")

    def test_embedded_303_without_location_is_rejected(self) -> None:
        raw = b"Server: PH Parking\r\nHTTP/1.1 303 See Other\r\nContent-Length: 0\r\n\r\n"

        with self.assertRaisesRegex(
            bridge.CurlResponseParseError,
            "embedded 3xx HTTP status requires Location",
        ):
            self.parse(raw_body=raw)

    def test_multiple_embedded_status_lines_are_rejected(self) -> None:
        raw = (
            b"HTTP/1.1 302 Found\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"HTTP/1.0 303 See Other\r\n\r\n"
        )

        with self.assertRaisesRegex(
            bridge.CurlResponseParseError,
            "multiple embedded HTTP status lines",
        ) as caught:
            self.parse(raw_body=raw)
        self.assertEqual(caught.exception.structure.embedded_http_status_count, 2)  # type: ignore[union-attr]

    def test_malformed_embedded_status_variants_are_rejected(self) -> None:
        malformed_lines = (
            b"HTTP/2 303 See Other",
            b"HTP/1.1 303 See Other",
            b"HTTP/1.1 099 Invalid",
            b"HTTP/1.1 303 See\tOther",
            b"HTTP/1.1 303 " + (b"X" * 65),
        )
        for malformed in malformed_lines:
            with self.subTest(malformed_length=len(malformed)):
                raw = malformed + b"\r\nLocation: /pub/waitpay?id=42\r\n\r\n"
                with self.assertRaises(bridge.CurlResponseParseError):
                    self.parse(raw_body=raw)

    def test_unknown_nonempty_line_without_colon_remains_rejected(self) -> None:
        raw = (
            b"Server: PH Parking\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"UNKNOWN NONHEADER LINE\r\n\r\n"
        )

        with self.assertRaisesRegex(
            bridge.CurlResponseParseError,
            "pseudo-header line without colon at index 3",
        ):
            self.parse(raw_body=raw)

    def test_embedded_200_without_checkout_is_rejected(self) -> None:
        raw = b"HTTP/1.1 200 OK\r\nServer: PH Parking\r\nContent-Length: 0\r\n\r\n"

        with self.assertRaisesRegex(
            bridge.CurlResponseParseError,
            "pseudo-headers contain no usable redirect",
        ):
            self.parse(raw_body=raw)

    def test_embedded_303_external_location_uses_existing_allowlist(self) -> None:
        raw = (
            b"HTTP/1.1 303 See Other\r\n"
            b"Location: https://evil.example/checkout/test\r\n"
            b"Content-Length: 0\r\n\r\n"
        )
        response = self.parse(raw_body=raw)

        self.assertEqual(bridge.summarize_location(response, "42").classification, "invalid")
        with self.assertRaisesRegex(bridge.BridgeError, "unexpected_upstream_redirect"):
            bridge._require_redirect(response, "42")

    def test_final_whitespace_only_line_is_reported_not_ignored(self) -> None:
        raw = (
            b"Server: PH Parking\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"Content-Length: 0\r\n"
            b" \t\r\n\r\n"
        )

        with self.assertRaisesRegex(
            bridge.CurlResponseParseError,
            "whitespace-only pseudo-header line at index 4",
        ) as caught:
            self.parse(raw_body=raw)

        structure = caught.exception.structure
        self.assertIsNotNone(structure)
        assert structure is not None
        fourth_line = structure.header_line_meta[3]
        self.assertFalse(fourth_line.is_empty)
        self.assertTrue(fourth_line.is_whitespace_only)
        self.assertTrue(fourth_line.starts_with_space)
        self.assertTrue(fourth_line.contains_control)

    def test_exact_real_lf_pseudo_headers_exclude_separator_from_lines(self) -> None:
        raw = (
            b"Server: PH Parking\n"
            b"Location: /pub/waitpay?id=42\n"
            b"Content-Length: 0\n"
            b"\n"
        )
        structure = bridge.analyze_http09_structure(raw)
        split_response = bridge._split_pseudo_header_block(raw, structure)

        self.assertEqual(split_response.separator_offset, raw.find(b"\n\n"))
        self.assertEqual(split_response.separator_length, 2)
        self.assertEqual(len(split_response.header_lines), 3)
        self.assertNotIn(b"", split_response.header_lines)
        self.assertEqual(split_response.body_blob, b"")
        response = self.parse(raw_body=raw)
        self.assertEqual(bridge.summarize_location(response, "42").classification, "waitpay")
        self.assertEqual(response.structure.separator_length, 2)  # type: ignore[union-attr]

    def test_crlf_pseudo_headers_can_preserve_nonempty_html_body(self) -> None:
        html_body = b"<html><body>safe marker</body></html>"
        raw = (
            b"Server: PH Parking\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"Content-Type: text/html\r\n\r\n"
            + html_body
        )

        response = self.parse(raw_body=raw)

        self.assertEqual(response.body, html_body)
        self.assertEqual(response.body_length, len(html_body))
        self.assertEqual(response.structure.parsed_payload_bytes, len(html_body))  # type: ignore[union-attr]

    def test_empty_line_inside_header_sequence_is_rejected(self) -> None:
        raw = (
            b"Server: PH Parking\r\n\r\n"
            b"Location: https://yoomoney.ru/checkout/payments/v2/contract?orderId=test\r\n\r\n"
        )

        with self.assertRaises(bridge.CurlResponseParseError):
            self.parse(raw_body=raw)

    def test_pseudo_headers_without_final_separator_are_rejected(self) -> None:
        raw = b"Server: PH Parking\r\nLocation: /pub/waitpay?id=42\r\nContent-Length: 0"

        with self.assertRaisesRegex(bridge.CurlResponseParseError, "terminator is missing"):
            self.parse(raw_body=raw)

    def test_http09_location_checkout_with_crlf_pseudo_headers(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque"
        raw = (
            b"Location: https://yoomoney.ru/checkout/order?orderId=opaque\r\n"
            b"Content-Type: text/html; charset=utf-8\r\n"
            b"Content-Length: 0\r\n\r\n"
        )

        response = self.parse(raw_body=raw)

        self.assertEqual(response.status, 303)
        self.assertEqual(response.location, checkout)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(response.first_line_class, "location_header")
        self.assertEqual(response.header_bytes, 0)
        self.assertEqual(response.raw_body_bytes, len(raw))

    def test_unknown_standard_headers_before_checkout_location_are_ignored(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque"
        raw = (
            b"Date: Fri, 17 Jul 2026 16:00:00 GMT\r\n"
            b"Server: PH-Parking\r\n"
            b"Location: https://yoomoney.ru/checkout/order?orderId=opaque\r\n\r\n"
        )

        response = self.parse(raw_body=raw)

        self.assertEqual(response.location, checkout)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertIsNotNone(response.structure)
        self.assertEqual(response.structure.first_header_name, "date")  # type: ignore[union-attr]
        self.assertEqual(response.structure.header_names, ("date", "server", "location"))  # type: ignore[union-attr]

    def test_date_content_length_and_waitpay_location_are_parsed(self) -> None:
        raw = (
            b"Date: Fri, 17 Jul 2026 16:00:00 GMT\n"
            b"Content-Length: 0\n"
            b"Location: /pub/waitpay?id=42\n\n"
        )

        response = self.parse(raw_body=raw)

        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(response.declared_content_length, 0)
        self.assertEqual(bridge.summarize_location(response, "42").classification, "waitpay")

    def test_x_served_by_and_unknown_x_headers_are_ignored(self) -> None:
        raw = (
            b"X-Served-By: edge-a\r\n"
            b"X-PH-Unknown: ignored-value\r\n"
            b"Location: /pub/waitpay?id=42\r\n\r\n"
        )

        response = self.parse(raw_body=raw)

        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(
            response.structure.header_names,  # type: ignore[union-attr]
            ("x-served-by", "x-ph-unknown", "location"),
        )

    def test_utf8_bom_before_pseudo_headers_is_allowed(self) -> None:
        raw = b"\xef\xbb\xbfDate: now\r\nLocation: /pub/waitpay?id=42\r\n\r\n"

        response = self.parse(raw_body=raw)

        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(response.structure.leading_bom, "utf8")  # type: ignore[union-attr]

    def test_one_or_two_leading_blank_lines_are_allowed(self) -> None:
        cases = (
            (b"\r\nDate: now\r\nLocation: /pub/waitpay?id=42\r\n\r\n", 1),
            (b"\n\nDate: now\nLocation: /pub/waitpay?id=42\n\n", 2),
        )
        for raw, expected_count in cases:
            with self.subTest(expected_count=expected_count):
                response = self.parse(raw_body=raw)
                self.assertEqual(response.location, "/pub/waitpay?id=42")
                self.assertEqual(  # type: ignore[union-attr]
                    response.structure.leading_blank_lines_count,
                    expected_count,
                )

    def test_three_leading_blank_lines_are_rejected(self) -> None:
        raw = b"\n\n\nDate: now\nLocation: /pub/waitpay?id=42\n\n"

        with self.assertRaisesRegex(bridge.CurlResponseParseError, "too many leading blank lines"):
            self.parse(raw_body=raw)

    def test_duplicate_identical_location_is_allowed_but_conflicting_is_rejected(self) -> None:
        identical = (
            b"Date: now\r\n"
            b"Location: /pub/waitpay?id=42\r\n"
            b"Location: /pub/waitpay?id=42\r\n\r\n"
        )
        response = self.parse(raw_body=identical)
        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(response.location_header_count, 1)

        conflicting = (
            b"Location: /pub/waitpay?id=42\r\n"
            b"Location: /pub/waitpay?id=43\r\n\r\n"
        )
        with self.assertRaisesRegex(bridge.CurlResponseParseError, "conflicting Location"):
            self.parse(raw_body=conflicting)

    def test_http09_location_waitpay_with_lf_pseudo_headers(self) -> None:
        raw = b"Location: /pub/waitpay?id=42\nConnection: close\n\n"

        response = self.parse(raw_body=raw)

        self.assertEqual(response.status, 303)
        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(bridge.summarize_location(response, "42").classification, "waitpay")

    def test_http09_body_containing_only_checkout_url(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque"

        response = self.parse(raw_body=checkout.encode("ascii"))

        self.assertEqual(response.status, 303)
        self.assertEqual(response.location, checkout)
        self.assertEqual(response.response_mode, "absolute_url_body")
        self.assertEqual(response.first_line_class, "absolute_checkout_url")
        self.assertEqual(response.body, b"")

    def test_header_dump_without_status_falls_back_to_http09_body(self) -> None:
        checkout = b"https://yoomoney.ru/checkout/order?orderId=opaque"

        response = self.parse(b"Malformed: ignored\r\n\r\n", checkout)

        self.assertEqual(response.response_mode, "absolute_url_body")
        self.assertEqual(response.location, checkout.decode("ascii"))
        self.assertGreater(response.header_bytes, 0)

    def test_set_cookie_and_location_are_parsed_without_returning_cookie_to_browser(self) -> None:
        raw = (
            b"Set-Cookie: sid=hidden; Path=/; HttpOnly\r\n"
            b"Location: /pub/waitpay?id=42\r\n\r\n"
        )

        response = self.parse(raw_body=raw)
        cookie_jar = bridge.ResponseCookieJar()
        cookie_jar.update(response.set_cookie_headers)

        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(len(response.set_cookie_headers), 1)
        self.assertEqual(cookie_jar.as_header(), "sid=hidden")
        self.assertEqual(response.first_line_class, "other")

    def test_pseudo_headers_preserve_html_body_for_checkout_search(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?orderId=opaque&source=body"
        html_body = (
            b'<html><meta http-equiv="refresh" '
            b'content="0;url=https://yoomoney.ru/checkout/order?orderId=opaque&amp;source=body"></html>'
        )
        raw = b"Content-Type: text/html; charset=utf-8\n\n" + html_body

        response = self.parse(raw_body=raw)
        diagnostics = bridge.analyze_upstream_body(response)

        self.assertEqual(response.status, 200)
        self.assertIsNone(response.location)
        self.assertEqual(response.body, html_body)
        self.assertEqual(response.body_length, len(html_body))
        self.assertEqual(response.raw_body_bytes, len(raw))
        self.assertEqual(diagnostics.checkout_url, checkout)
        self.assertTrue(diagnostics.marker_meta_refresh)

    def test_pseudo_headers_without_location_or_checkout_are_parse_error(self) -> None:
        raw = b"Date: now\r\nServer: PH-Parking\r\n\r\n<html><body>waiting</body></html>"

        with self.assertRaisesRegex(bridge.CurlResponseParseError, "no usable redirect"):
            self.parse(raw_body=raw)

    def test_internal_http09_paths_are_classified_without_external_navigation(self) -> None:
        locations = (
            "waitpay?id=42",
            "/pub/waitpay?id=42",
            "pay?id=42",
            "/pub/pay?id=42",
        )
        for location in locations:
            with self.subTest(location=location):
                response = self.parse(raw_body=location.encode("ascii"))
                self.assertEqual(response.response_mode, "http09_body")
                self.assertEqual(response.first_line_class, "internal_path")
                self.assertEqual(response.location, location)
        self.assertEqual(
            bridge.summarize_location(self.parse(raw_body=b"/pub/pay?id=42"), "42").classification,
            "internal",
        )

    def test_unknown_external_locations_are_blocked(self) -> None:
        pseudo_response = self.parse(raw_body=b"Location: https://evil.example/checkout/x\r\n\r\n")
        self.assertEqual(bridge.summarize_location(pseudo_response, "42").classification, "invalid")
        with self.assertRaisesRegex(bridge.BridgeError, "unexpected_upstream_redirect"):
            bridge._require_redirect(pseudo_response, "42")

        with self.assertRaises(bridge.CurlResponseParseError):
            self.parse(raw_body=b"https://evil.example/checkout/x")

    def test_safe_http09_log_contains_metadata_but_no_url_or_cookie(self) -> None:
        raw = (
            b"Date: Fri, 17 Jul 2026 16:00:00 GMT\r\n"
            b"Server: PH-Parking\r\n"
            b"Location: https://yoomoney.ru/checkout/order?orderId=opaque\r\n"
            b"Set-Cookie: sid=hidden; Path=/; HttpOnly\r\n\r\n"
        )
        response = self.parse(raw_body=raw)

        with self.assertLogs(level=logging.INFO) as captured:
            bridge._log_upstream_response("upstream_post", "request-safe-http09", response, "42")

        log_text = "\n".join(captured.output)
        separator_offset = raw.find(b"\r\n\r\n")
        self.assertIn("response_mode=pseudo_headers", log_text)
        self.assertIn("first_line_class=other", log_text)
        self.assertIn(f"first_line_length={response.first_line_length}", log_text)
        self.assertIn("curl_exit_code=0", log_text)
        self.assertIn("header_bytes=0", log_text)
        self.assertIn(f"raw_body_bytes={len(raw)}", log_text)
        self.assertIn(" body_bytes=0", log_text)
        self.assertIn("location_class=checkout", log_text)
        self.assertIn("location_host=yoomoney.ru", log_text)
        self.assertIn("location_path=/checkout/order", log_text)
        self.assertIn("set_cookie_count=1", log_text)
        self.assertIn("leading_bom=none", log_text)
        self.assertIn("leading_blank_lines_count=0", log_text)
        self.assertIn("newline_mode=crlf", log_text)
        self.assertIn("first_colon_position=4", log_text)
        self.assertIn("first_line_is_header_syntax=true", log_text)
        self.assertIn("first_header_name=date", log_text)
        self.assertIn('header_names=["date","server","location","set-cookie"]', log_text)
        self.assertIn("utf8_decode_valid=true", log_text)
        self.assertIn("cp1251_decode_valid=true", log_text)
        self.assertIn("contains_location_header=true", log_text)
        self.assertIn("contains_checkout_marker=true", log_text)
        self.assertIn("contains_waitpay_marker=false", log_text)
        self.assertIn("pseudo_header_line_count=4", log_text)
        self.assertIn("separator_length=4", log_text)
        self.assertIn("parsed_payload_bytes=0", log_text)
        self.assertIn(f"raw_response_bytes={len(raw)}", log_text)
        self.assertIn(f"separator_offset={separator_offset}", log_text)
        self.assertIn(f"header_blob_length={separator_offset}", log_text)
        self.assertIn("header_blob_ends_with_crlf=false", log_text)
        self.assertIn("header_blob_ends_with_lf=false", log_text)
        self.assertIn("header_lines_count=4", log_text)
        self.assertIn(f"header_lines_bytes_with_separators={separator_offset}", log_text)
        self.assertIn('header_line_meta=[{"line_index":1', log_text)
        self.assertNotIn("orderId", log_text)
        self.assertNotIn("opaque", log_text)
        self.assertNotIn("sid=hidden", log_text)
        self.assertNotIn("PH-Parking", log_text)
        self.assertNotIn("Fri, 17 Jul", log_text)

    def test_rejects_too_long_first_line(self) -> None:
        with self.assertRaisesRegex(bridge.CurlResponseParseError, "first line exceeds limit"):
            self.parse(raw_body=b"A" * (bridge.MAX_HTTP09_FIRST_LINE_BYTES + 1))

    def test_rejects_forbidden_control_character(self) -> None:
        with self.assertRaisesRegex(bridge.CurlResponseParseError, "forbidden control character"):
            self.parse(raw_body=b"Location: /pub/waitpay?id=42\x00\r\n\r\n")

    def test_rejects_folded_and_oversized_pseudo_headers(self) -> None:
        invalid_responses = (
            b"Location: /pub/waitpay?id=42\r\n folded: value\r\n\r\n",
            b"Content-Type: text/html\r\n"
            + (b"Cache-Control: no-store\r\n" * 2700)
            + b"\r\n",
        )
        for raw_body in invalid_responses:
            with self.subTest(size=len(raw_body)):
                with self.assertRaises(bridge.CurlResponseParseError):
                    self.parse(raw_body=raw_body)

    def test_rejects_header_name_value_and_line_count_limits(self) -> None:
        too_long_name = (
            (b"X" * (bridge.MAX_PSEUDO_HEADER_NAME_BYTES + 1))
            + b": value\r\nLocation: /pub/waitpay?id=42\r\n\r\n"
        )
        too_long_value = (
            b"Date: now\r\nX-Large: "
            + (b"a" * (bridge.MAX_PSEUDO_HEADER_VALUE_BYTES + 1))
            + b"\r\nLocation: /pub/waitpay?id=42\r\n\r\n"
        )
        too_many_lines = (
            b"".join(f"X-Test-{index}: value\r\n".encode("ascii") for index in range(100))
            + b"Location: /pub/waitpay?id=42\r\n\r\n"
        )
        for raw_body in (too_long_name, too_long_value, too_many_lines):
            with self.subTest(size=len(raw_body)):
                with self.assertRaises(bridge.CurlResponseParseError):
                    self.parse(raw_body=raw_body)

    def test_utf16_bom_and_cr_only_prefix_are_rejected(self) -> None:
        invalid_prefixes = (
            b"\xff\xfeD\x00a\x00t\x00e\x00:\x00 \x00x\x00",
            b"\xfe\xff\x00D\x00a\x00t\x00e\x00:\x00 \x00x",
            b"\rDate: now\r\nLocation: /pub/waitpay?id=42\r\n\r\n",
        )
        for raw_body in invalid_prefixes:
            with self.subTest(prefix=raw_body[:2]):
                with self.assertRaises(bridge.CurlResponseParseError):
                    self.parse(raw_body=raw_body)

    def test_rejects_empty_response(self) -> None:
        with self.assertRaisesRegex(bridge.CurlResponseParseError, "empty HTTP/0.9 response"):
            self.parse()


class CurlTransportTests(unittest.TestCase):
    def test_curl_transport_is_http11_pinned_and_cleans_all_temporary_files(self) -> None:
        observed: dict[str, object] = {}

        def fake_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            observed["arguments"] = list(arguments)
            observed["kwargs"] = dict(kwargs)
            header_path = Path(arguments[arguments.index("--dump-header") + 1])
            body_path = Path(arguments[arguments.index("--output") + 1])
            cookie_path = Path(arguments[arguments.index("--cookie-jar") + 1])
            config_path = Path(arguments[arguments.index("--config") + 1])
            observed["temporary_root"] = header_path.parent
            observed["config"] = config_path.read_text("ascii")
            observed["cookie_jar"] = cookie_path.read_text("utf-8")
            request_body_argument = arguments[arguments.index("--data-binary") + 1]
            observed["request_body"] = Path(request_body_argument[1:]).read_bytes()
            header_path.write_bytes(
                b"HTTP/1.1 303 See Other\r\n"
                b"Location: /pub/waitpay?id=42\r\n"
                b"Content-Type: text/html; charset=windows-1251\r\n"
                b"Content-Length: 4\r\n"
                b"Set-Cookie: sid=hidden; Path=/; HttpOnly\r\n\r\n"
            )
            body_path.write_bytes(b"wait")
            return subprocess.CompletedProcess(arguments, 0, stdout=b"", stderr=b"")

        transport = bridge.CurlPHUpstream(
            runner=fake_runner,
            resolver=lambda host: "93.184.216.34",
        )
        response = transport._request(
            "POST",
            "/pub/pay?code=ABC123",
            b"client_id=42&paycard=x",
            "session=hidden",
            4.0,
        )

        arguments = observed["arguments"]
        self.assertIsInstance(arguments, list)
        self.assertIn("--http1.1", arguments)
        self.assertIn("--http0.9", arguments)
        self.assertIn("--max-redirs", arguments)
        self.assertIn("--resolve", arguments)
        self.assertIn("--dump-header", arguments)
        self.assertIn("--output", arguments)
        self.assertIn("--cookie", arguments)
        self.assertIn("--cookie-jar", arguments)
        self.assertIn("--connect-timeout", arguments)
        self.assertIn("--max-time", arguments)
        self.assertFalse(any("ABC123" in value for value in arguments))
        self.assertFalse(any("session=hidden" in value for value in arguments))
        self.assertEqual(observed["request_body"], b"client_id=42&paycard=x")
        self.assertIn("session", observed["cookie_jar"])
        self.assertEqual(response.status, 303)
        self.assertEqual(response.location, "/pub/waitpay?id=42")
        self.assertEqual(response.body_length, 4)
        self.assertEqual(response.body, b"wait")
        self.assertEqual(response.content_type, "text/html; charset=windows-1251")
        self.assertEqual(response.declared_content_length, 4)
        self.assertEqual(response.response_mode, "standard_http")
        self.assertEqual(response.curl_exit_code, 0)
        self.assertEqual(len(response.set_cookie_headers), 1)
        temporary_root = observed["temporary_root"]
        self.assertIsInstance(temporary_root, Path)
        self.assertFalse(temporary_root.exists())

    def test_curl_failure_is_stage_classified_and_also_cleans_temporary_files(self) -> None:
        observed: dict[str, Path] = {}

        def failing_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            del kwargs
            header_path = Path(arguments[arguments.index("--dump-header") + 1])
            observed["temporary_root"] = header_path.parent
            return subprocess.CompletedProcess(
                arguments,
                35,
                stdout=b"",
                stderr=b"curl: TLS failed for https://parking.rigaland.ru/pub/pay?orderId=secret",
            )

        transport = bridge.CurlPHUpstream(
            runner=failing_runner,
            resolver=lambda host: "93.184.216.34",
        )
        with self.assertRaises(bridge.BridgeError) as caught:
            transport.create_payment("ABC123", b"client_id=42&paycard=x")

        error = caught.exception
        self.assertEqual(error.stage, "tls")
        self.assertEqual(error.diagnostic_code, "BRIDGE-UPSTREAM-TLS")
        self.assertNotIn("orderId", error.exception_message or "")
        self.assertEqual(error.curl_exit_code, 35)
        self.assertFalse(observed["temporary_root"].exists())

    def test_http09_pseudo_response_is_accepted_and_temporary_files_are_cleaned(self) -> None:
        observed: dict[str, object] = {}

        def fake_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            del kwargs
            observed["arguments"] = list(arguments)
            header_path = Path(arguments[arguments.index("--dump-header") + 1])
            body_path = Path(arguments[arguments.index("--output") + 1])
            observed["temporary_root"] = header_path.parent
            body_path.write_bytes(b"Location: /pub/waitpay?id=42\r\nConnection: close\r\n\r\n")
            return subprocess.CompletedProcess(arguments, 0, stdout=b"", stderr=b"")

        transport = bridge.CurlPHUpstream(
            runner=fake_runner,
            resolver=lambda host: "93.184.216.34",
        )
        response = transport._request("GET", "/pub/waitpay?id=42", None, None, 4.0)

        arguments = observed["arguments"]
        self.assertIsInstance(arguments, list)
        self.assertIn("--http1.1", arguments)
        self.assertIn("--http0.9", arguments)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(response.location, "/pub/waitpay?id=42")
        temporary_root = observed["temporary_root"]
        self.assertIsInstance(temporary_root, Path)
        self.assertFalse(temporary_root.exists())

    def test_production_curl_path_preserves_four_line_split_diagnostics(self) -> None:
        raw_body = observed_four_line_http09_fixture()
        observed: dict[str, Path] = {}

        def fake_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            del kwargs
            header_path = Path(arguments[arguments.index("--dump-header") + 1])
            body_path = Path(arguments[arguments.index("--output") + 1])
            observed["temporary_root"] = header_path.parent
            body_path.write_bytes(raw_body)
            return subprocess.CompletedProcess(arguments, 0, stdout=b"", stderr=b"")

        transport = bridge.CurlPHUpstream(
            runner=fake_runner,
            resolver=lambda host: "93.184.216.34",
        )
        response = transport.create_payment("ABC123", b"client_id=42&paycard=x")

        self.assertEqual(response.status, 303)
        self.assertEqual(response.response_mode, "pseudo_headers")
        self.assertEqual(response.raw_body_bytes, 194)
        self.assertIsNotNone(response.structure)
        structure = response.structure
        assert structure is not None
        self.assertEqual(structure.separator_offset, 190)
        self.assertEqual(structure.blank_line_offset, 190)
        self.assertEqual(structure.header_blob_length, 190)
        self.assertEqual(structure.header_lines_count, 4)
        self.assertEqual(structure.header_lines_bytes_with_separators, 190)
        self.assertEqual(len(structure.header_line_meta), 4)
        self.assertTrue(structure.embedded_http_status_present)
        self.assertEqual(structure.embedded_http_status_code, 303)
        self.assertEqual(structure.embedded_http_status_position, 4)
        self.assertEqual(structure.embedded_http_status_count, 1)

        with self.assertLogs(level=logging.INFO) as captured:
            bridge._log_upstream_response("upstream_post", "request-safe-four-lines", response, "42")
        log_text = "\n".join(captured.output)
        self.assertIn("raw_response_bytes=194", log_text)
        self.assertIn("separator_offset=190", log_text)
        self.assertIn("structure_blank_line_offset=190", log_text)
        self.assertIn("header_blob_length=190", log_text)
        self.assertIn("header_blob_ends_with_crlf=false", log_text)
        self.assertIn("header_blob_ends_with_lf=false", log_text)
        self.assertIn("header_lines_count=4", log_text)
        self.assertIn("header_lines_bytes_with_separators=190", log_text)
        self.assertIn('"line_index":4', log_text)
        self.assertIn('"colon_position":-1', log_text)
        self.assertIn('"is_header_syntax":false', log_text)
        self.assertIn('"matches_embedded_http_status":true', log_text)
        self.assertIn("embedded_http_status_present=true", log_text)
        self.assertIn("embedded_http_version=HTTP/1.1", log_text)
        self.assertIn("embedded_http_status_code=303", log_text)
        self.assertIn("embedded_http_status_position=4", log_text)
        self.assertIn("embedded_http_status_count=1", log_text)
        self.assertIn("location_class=checkout", log_text)
        self.assertNotIn("orderId", log_text)
        self.assertFalse(observed["temporary_root"].exists())

    def test_repeated_http09_not_allowed_error_has_dedicated_code(self) -> None:
        def failing_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            del kwargs
            return subprocess.CompletedProcess(
                arguments,
                1,
                stdout=b"",
                stderr=b"curl: (1) Received HTTP/0.9 when not allowed",
            )

        transport = bridge.CurlPHUpstream(
            runner=failing_runner,
            resolver=lambda host: "93.184.216.34",
        )
        with self.assertRaises(bridge.BridgeError) as caught:
            transport.create_payment("ABC123", b"client_id=42&paycard=x")

        error = caught.exception
        self.assertEqual(error.stage, "read_status")
        self.assertEqual(error.diagnostic_code, "BRIDGE-UPSTREAM-HTTP09")
        self.assertEqual(error.curl_exit_code, 1)
        self.assertNotEqual(error.diagnostic_code, "BRIDGE-UPSTREAM-CONNECT")

    def test_unrecognised_http09_failure_logs_only_structural_metadata(self) -> None:
        raw_body = b"opaque-sensitive-first-line\r\n\r\nbody-not-for-log"

        def fake_runner(arguments: list[str], **kwargs: object) -> subprocess.CompletedProcess[bytes]:
            del kwargs
            body_path = Path(arguments[arguments.index("--output") + 1])
            body_path.write_bytes(raw_body)
            return subprocess.CompletedProcess(arguments, 0, stdout=b"", stderr=b"")

        transport = bridge.CurlPHUpstream(
            runner=fake_runner,
            resolver=lambda host: "93.184.216.34",
        )
        with self.assertRaises(bridge.BridgeError) as caught:
            transport.create_payment("ABC123", b"client_id=42&paycard=x")

        error = caught.exception
        self.assertEqual(error.diagnostic_code, "BRIDGE-UPSTREAM-PARSE")
        self.assertEqual(error.response_mode, "invalid")
        self.assertEqual(error.first_line_class, "other")
        self.assertEqual(error.first_line_length, len(b"opaque-sensitive-first-line"))
        self.assertEqual(error.curl_exit_code, 0)
        self.assertIsNotNone(error.structure)

        with self.assertLogs(level=logging.WARNING) as captured:
            bridge._log_upstream_failure("upstream_post_failed", "request-safe-structure", "42", error)
        log_text = "\n".join(captured.output)
        self.assertIn("leading_bom=none", log_text)
        self.assertIn("first_line_is_header_syntax=false", log_text)
        self.assertIn("header_names=[]", log_text)
        self.assertNotIn("opaque-sensitive", log_text)
        self.assertNotIn("body-not-for-log", log_text)


class PaymentFlowTests(unittest.TestCase):
    def test_direct_checkout_response(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?id=opaque"
        upstream = FakeUpstream(bridge.UpstreamResponse(303, checkout, ("sid=hidden; Path=/; HttpOnly",)))
        limiter = MemoryRateLimiter()
        service = bridge.PaymentBridge(upstream, limiter)

        result = service.process(b"client_id=42&notify=&payqr=x&bank=&code=ABC123")

        self.assertEqual(result, checkout)
        self.assertEqual(upstream.create_calls[0][0], "ABC123")
        self.assertNotIn(b"code=", upstream.create_calls[0][1])

    def test_wait_poll_forwards_cookie_and_stops_on_checkout(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?id=opaque"
        upstream = FakeUpstream(
            bridge.UpstreamResponse(303, "waitpay?id=42", ("sid=hidden; Path=/; HttpOnly",)),
            [
                bridge.UpstreamResponse(302, "/pub/waitpay?id=42", ()),
                bridge.UpstreamResponse(303, checkout, ()),
            ],
        )
        clock = FakeClock()
        service = bridge.PaymentBridge(
            upstream,
            MemoryRateLimiter(),
            sleep=clock.sleep,
            monotonic=clock.monotonic,
        )

        result = service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123")

        self.assertEqual(result, checkout)
        self.assertEqual(len(upstream.poll_calls), 2)
        self.assertEqual(upstream.poll_calls[0][1], "sid=hidden")
        self.assertGreaterEqual(clock.value, 1.0)

    def test_initial_wait_response_can_supply_checkout_in_html_body(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?id=opaque"
        body = f'<html><a href="{checkout}">pay</a></html>'.encode()
        upstream = FakeUpstream(
            bridge.UpstreamResponse(
                303,
                "waitpay?id=42",
                (),
                body_length=len(body),
                location_header_count=1,
                body=body,
                content_type="text/html; charset=utf-8",
            )
        )
        service = bridge.PaymentBridge(upstream, MemoryRateLimiter())

        result = service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123")

        self.assertEqual(result, checkout)
        self.assertEqual(upstream.poll_calls, [])

    def test_poll_wait_location_body_checkout_stops_without_checkout_redirect(self) -> None:
        checkout = "https://yoomoney.ru/checkout/order?id=opaque"
        body = f'<html><script>window.location.href="{checkout}";</script></html>'.encode()
        upstream = FakeUpstream(
            bridge.UpstreamResponse(303, "waitpay?id=42", ()),
            [
                bridge.UpstreamResponse(
                    302,
                    "/pub/waitpay?id=42",
                    (),
                    body_length=len(body),
                    location_header_count=1,
                    body=body,
                    content_type="text/html; charset=utf-8",
                    declared_content_length=len(body),
                )
            ],
        )
        clock = FakeClock()
        service = bridge.PaymentBridge(
            upstream,
            MemoryRateLimiter(),
            sleep=clock.sleep,
            monotonic=clock.monotonic,
        )

        with self.assertLogs(level=logging.INFO) as captured:
            result = service.process(b"client_id=42&notify=&paycard=x&bank=&code=ABC123")

        self.assertEqual(result, checkout)
        self.assertEqual(len(upstream.poll_calls), 1)
        log_text = "\n".join(captured.output)
        self.assertIn("response_state=waitpay", log_text)
        self.assertIn("body_checkout_url_found=true", log_text)
        self.assertIn("event=checkout_found_in_body", log_text)
        self.assertNotIn("order?id=opaque", log_text)

    def test_poll_timeout_logs_every_attempt_without_sensitive_values(self) -> None:
        initial = bridge.UpstreamResponse(
            303,
            "/pub/waitpay?id=42",
            ("sid=hidden; Path=/; HttpOnly",),
            body_length=4,
            location_header_count=1,
            header_bytes=120,
            elapsed_ms=12,
        )
        poll_body = b"<html><body>waiting</body></html>"
        polls = [
            bridge.UpstreamResponse(
                200,
                None,
                (),
                body_length=len(poll_body),
                location_header_count=0,
                header_bytes=80,
                elapsed_ms=4,
                body=poll_body,
                content_type="text/html; charset=utf-8",
                declared_content_length=len(poll_body),
            )
            for _ in range(19)
        ]
        clock = FakeClock()
        service = bridge.PaymentBridge(
            FakeUpstream(initial, polls),
            MemoryRateLimiter(),
            sleep=clock.sleep,
            monotonic=clock.monotonic,
        )

        with self.assertLogs(level=logging.INFO) as captured:
            with self.assertRaises(bridge.BridgeError) as caught:
                service.process(
                    b"client_id=42&notify=private&paycard=x&bank=&code=ABC123",
                    "request-safe-1",
                )

        error = caught.exception
        self.assertEqual(error.reason, "payment_poll_timeout")
        self.assertEqual(error.diagnostic_code, "BRIDGE-WAITPAY-TIMEOUT")
        self.assertEqual(error.stage, "poll_waitpay")
        self.assertEqual(error.poll_count, 19)
        self.assertFalse(error.body_checkout_marker)
        self.assertEqual(len(service.upstream.poll_calls), 19)  # type: ignore[attr-defined]
        log_text = "\n".join(captured.output)
        self.assertIn("event=request_started", log_text)
        self.assertIn("request_id=request-safe-1", log_text)
        self.assertIn("attempt=19", log_text)
        self.assertIn("response_state=pending", log_text)
        self.assertIn("content_type=text/html;charset=utf-8", log_text)
        self.assertIn(f"content_length_declared={len(poll_body)}", log_text)
        self.assertIn("body_sha256=", log_text)
        self.assertIn("marker_yoomoney=false", log_text)
        self.assertIn("body_checkout_marker=false", log_text)
        self.assertIn("location_class=missing", log_text)
        self.assertNotIn("client_id=42", log_text)
        self.assertNotIn("ABC123", log_text)
        self.assertNotIn("private", log_text)
        self.assertNotIn("sid=hidden", log_text)
        self.assertNotIn("waitpay?id", log_text)

    def test_duplicate_payment_is_blocked_before_upstream(self) -> None:
        upstream = FakeUpstream(bridge.UpstreamResponse(303, "https://yoomoney.ru/checkout/x", ()))
        service = bridge.PaymentBridge(upstream, MemoryRateLimiter(allowed=False, retry_after_seconds=29))
        with self.assertRaisesRegex(bridge.BridgeError, "duplicate_payment") as caught:
            service.process(b"client_id=42&paycard=x&code=ABC123")
        self.assertEqual(caught.exception.retry_after_seconds, 29)
        self.assertEqual(upstream.create_calls, [])

    def test_claim_survives_payment_ready(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "claims.sqlite3"
            clock = FakeWallClock()
            limiter = bridge.SQLiteRateLimiter(database_path, clock=clock.time)
            upstream = FakeUpstream(bridge.UpstreamResponse(303, "https://yoomoney.ru/checkout/x", ()))
            service = bridge.PaymentBridge(upstream, limiter)

            self.assertEqual(
                service.process(b"client_id=42&paycard=x&code=ABC123"),
                "https://yoomoney.ru/checkout/x",
            )
            clock.value += 1
            with self.assertRaises(bridge.BridgeError) as caught:
                service.process(b"client_id=42&paycard=x&code=ABC123")

            self.assertEqual(caught.exception.reason, "duplicate_payment")
            self.assertEqual(caught.exception.retry_after_seconds, 29)
            self.assertEqual(len(upstream.create_calls), 1)

    def test_claim_survives_no_location_and_pending_does_not_poll(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "claims.sqlite3"
            clock = FakeWallClock()
            limiter = bridge.SQLiteRateLimiter(database_path, clock=clock.time)
            upstream = FakeUpstream(
                bridge.UpstreamResponse(
                    200,
                    None,
                    (),
                    body=b"<html><body>pending</body></html>",
                    content_type="text/html; charset=windows-1251",
                )
            )
            service = bridge.PaymentBridge(upstream, limiter)

            with self.assertRaises(bridge.BridgeError) as first_error:
                service.process(b"client_id=42&paycard=x&code=ABC123")
            clock.value += 1
            with self.assertRaises(bridge.BridgeError) as second_error:
                service.process(b"client_id=42&paycard=x&code=ABC123")

            self.assertEqual(first_error.exception.reason, "missing_initial_redirect")
            self.assertEqual(first_error.exception.diagnostic_code, "BRIDGE-UPSTREAM-NO-LOCATION")
            self.assertEqual(second_error.exception.reason, "duplicate_payment")
            self.assertEqual(len(upstream.create_calls), 1)
            self.assertEqual(upstream.poll_calls, [])

    def test_parallel_identical_requests_allow_one_upstream(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            limiter = bridge.SQLiteRateLimiter(Path(temp_dir) / "claims.sqlite3")
            upstream = FakeUpstream(bridge.UpstreamResponse(303, "https://yoomoney.ru/checkout/x", ()))
            service = bridge.PaymentBridge(upstream, limiter)
            barrier = threading.Barrier(3)
            results: list[str] = []
            errors: list[bridge.BridgeError] = []

            def run_request() -> None:
                barrier.wait()
                try:
                    results.append(service.process(b"client_id=42&paycard=x&code=ABC123"))
                except bridge.BridgeError as exc:
                    errors.append(exc)

            threads = [threading.Thread(target=run_request) for _ in range(2)]
            for thread in threads:
                thread.start()
            barrier.wait()
            for thread in threads:
                thread.join(timeout=2)

            self.assertEqual(results, ["https://yoomoney.ru/checkout/x"])
            self.assertEqual([error.reason for error in errors], ["duplicate_payment"])
            self.assertEqual(len(upstream.create_calls), 1)


class SQLiteRateLimiterTests(unittest.TestCase):
    def test_first_claim_and_server_time_retry_after_boundaries(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            clock = FakeWallClock()
            limiter = bridge.SQLiteRateLimiter(
                Path(temp_dir) / "claims.sqlite3",
                clock=clock.time,
            )

            first = limiter.claim("42", "ABC123")
            self.assertTrue(first.allowed)
            self.assertEqual(first.retry_after_seconds, 0)
            self.assertEqual(first.claim_age_seconds, 0.0)

            clock.value += 1
            after_one_second = limiter.claim("42", "ABC123")
            self.assertFalse(after_one_second.allowed)
            self.assertEqual(after_one_second.retry_after_seconds, 29)
            self.assertEqual(after_one_second.claim_age_seconds, 1.0)

            clock.value += 28
            after_twenty_nine_seconds = limiter.claim("42", "ABC123")
            self.assertFalse(after_twenty_nine_seconds.allowed)
            self.assertEqual(after_twenty_nine_seconds.retry_after_seconds, 1)

            clock.value += 1
            after_thirty_seconds = limiter.claim("42", "ABC123")
            self.assertTrue(after_thirty_seconds.allowed)
            self.assertEqual(after_thirty_seconds.retry_after_seconds, 0)

    def test_claim_key_distinguishes_client_and_code(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            limiter = bridge.SQLiteRateLimiter(Path(temp_dir) / "claims.sqlite3")

            self.assertTrue(limiter.claim("42", "ABC123").allowed)
            self.assertTrue(limiter.claim("42", "XYZ789").allowed)
            self.assertTrue(limiter.claim("43", "ABC123").allowed)

    def test_rate_limit_survives_new_store_instance(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "claims.sqlite3"
            clock = FakeWallClock()
            first = bridge.SQLiteRateLimiter(database_path, clock=clock.time)
            second = bridge.SQLiteRateLimiter(database_path, clock=clock.time)

            self.assertTrue(first.claim("42", "ABC123").allowed)
            repeated = second.claim("42", "ABC123")
            self.assertFalse(repeated.allowed)
            self.assertEqual(repeated.retry_after_seconds, 30)


class StaticBridge:
    checkout_url = "https://yoomoney.ru/checkout/order?orderId=opaque"

    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        return self.checkout_url


class CheckoutURLBridge:
    def __init__(self, checkout_url: str) -> None:
        self.checkout_url = checkout_url

    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        return self.checkout_url


class ErrorBridge:
    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        raise bridge.BridgeError(
            502,
            "upstream_request_failure",
            bridge.PAYMENT_LINK_FAILURE_MESSAGE,
            "BRIDGE-UPSTREAM-CONNECT",
            stage="connect",
            exception_class="TimeoutError",
            exception_message="network operation timed out",
            elapsed_ms=5000,
        )


class PollTimeoutBridge:
    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        raise bridge.BridgeError(
            504,
            "payment_poll_timeout",
            bridge.PAYMENT_LINK_FAILURE_MESSAGE,
            stage="poll_waitpay",
            poll_count=19,
            body_checkout_marker=False,
        )


class DuplicateBridge:
    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        raise bridge.BridgeError(
            429,
            "duplicate_payment",
            "Платёж уже формируется.",
            retry_after_seconds=29,
        )


class NoLocationBridge:
    def process(self, raw_body: bytes, request_id: str | None = None) -> str:
        del raw_body, request_id
        raise bridge.BridgeError(
            502,
            "missing_initial_redirect",
            bridge.PAYMENT_LINK_FAILURE_MESSAGE,
            stage="parse_location",
            http_status=200,
        )


class RequestFinishedLogHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__(level=logging.INFO)
        self._condition = threading.Condition()
        self._messages: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        message = record.getMessage()
        with self._condition:
            self._messages.append(message)
            self._condition.notify_all()

    def wait_for_success_finished(self, request_id: str, timeout: float = 2.0) -> bool:
        required = (
            "event=request_finished",
            f"request_id={request_id}",
            "http_status=303",
            "final_reason=payment_ready",
        )
        with self._condition:
            return self._condition.wait_for(
                lambda: any(
                    all(marker in message for marker in required)
                    for message in self._messages
                ),
                timeout=timeout,
            )

    def text(self) -> str:
        with self._condition:
            return "\n".join(self._messages)


class HTTPHandlerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.server = bridge.BridgeHTTPServer(("127.0.0.1", 0), StaticBridge())  # type: ignore[arg-type]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method: str, path: str, body: bytes | None = None) -> http.client.HTTPResponse:
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=2)
        headers = {}
        if body is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        response.body = response.read()  # type: ignore[attr-defined]
        connection.close()
        return response

    def test_root_and_unknown_routes_are_404(self) -> None:
        for path in ("/", "/unknown", "/rigaland/payment-bridge/"):
            with self.subTest(path=path):
                response = self.request("GET", path)
                self.assertEqual(response.status, 404)
                self.assertEqual(response.getheader("Cache-Control"), "no-store")
                self.assertIn("navigate-to https://yoomoney.ru", response.getheader("Content-Security-Policy", ""))
                self.assertRegex(response.getheader("X-Bridge-Request-Id", ""), r"^[0-9a-f]{32}$")
                self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-NOT-FOUND")

    def test_bridge_get_is_405_and_successful_post_returns_direct_303(self) -> None:
        response = self.request("GET", bridge.BRIDGE_PATH)
        self.assertEqual(response.status, 405)
        self.assertEqual(response.getheader("Allow"), "POST")

        response = self.request(
            "POST",
            bridge.BRIDGE_PATH,
            b"client_id=42&paycard=x&code=ABC123",
        )
        self.assertEqual(response.status, 303)
        self.assertEqual(response.reason, "See Other")
        self.assertEqual(response.getheader("Location"), StaticBridge.checkout_url)
        self.assertEqual(response.getheader("Cache-Control"), "no-store")
        self.assertEqual(response.getheader("Referrer-Policy"), "no-referrer")
        self.assertEqual(response.getheader("X-Content-Type-Options"), "nosniff")
        self.assertRegex(response.getheader("X-Bridge-Request-Id", ""), r"^[0-9a-f]{32}$")
        self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-OK")
        self.assertEqual(response.getheader("Content-Length"), "0")
        self.assertIsNone(response.getheader("Content-Type"))
        self.assertEqual(response.body, b"")  # type: ignore[attr-defined]

    def test_http_303_redirect_semantics_convert_post_to_get(self) -> None:
        original = urllib.request.Request(
            "https://bridge.example/rigaland/payment-bridge",
            data=b"client_id=42&paycard=x&code=ABC123",
            method="POST",
        )
        redirected = urllib.request.HTTPRedirectHandler().redirect_request(
            original,
            None,
            303,
            "See Other",
            {},
            StaticBridge.checkout_url,
        )

        self.assertIsNotNone(redirected)
        assert redirected is not None
        self.assertEqual(redirected.get_method(), "GET")
        self.assertIsNone(redirected.data)
        self.assertEqual(redirected.full_url, StaticBridge.checkout_url)

    def test_invalid_checkout_url_is_never_sent_as_location(self) -> None:
        invalid_urls = (
            "http://yoomoney.ru/checkout/order?orderId=invalid",
            "https://evil.example/checkout/order?orderId=invalid",
            "https://user@yoomoney.ru/checkout/order?orderId=invalid",
            "https://yoomoney.ru:444/checkout/order?orderId=invalid",
            "https://yoomoney.ru/payment/order?orderId=invalid",
            "https://yoomoney.ru/checkout/order?orderId=invalid\x01",
        )

        for invalid_url in invalid_urls:
            with self.subTest(invalid_url=invalid_url):
                self.server.bridge = CheckoutURLBridge(invalid_url)  # type: ignore[assignment]
                response = self.request(
                    "POST",
                    bridge.BRIDGE_PATH,
                    b"client_id=42&paycard=x&code=ABC123",
                )

                self.assertEqual(response.status, 502)
                self.assertIsNone(response.getheader("Location"))
                self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-INVALID-REDIRECT")
                self.assertNotIn(invalid_url.encode(), response.body)  # type: ignore[attr-defined]

    def test_success_logs_do_not_contain_checkout_url_or_order_id(self) -> None:
        root_logger = logging.getLogger()
        previous_level = root_logger.level
        handler = RequestFinishedLogHandler()
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)
        try:
            response = self.request(
                "POST",
                bridge.BRIDGE_PATH,
                b"client_id=42&paycard=x&code=ABC123",
            )
            request_id = response.getheader("X-Bridge-Request-Id", "")
            self.assertTrue(
                handler.wait_for_success_finished(request_id),
                "timed out waiting for the complete request_finished success log",
            )
        finally:
            root_logger.removeHandler(handler)
            root_logger.setLevel(previous_level)

        log_text = handler.text()
        self.assertEqual(response.status, 303)
        self.assertIn("event=payment_ready", log_text)
        self.assertIn("event=request_finished", log_text)
        self.assertIn("http_status=303", log_text)
        self.assertIn("final_reason=payment_ready", log_text)
        self.assertNotIn("yoomoney.ru", log_text)
        self.assertNotIn("/checkout/", log_text)
        self.assertNotIn("orderId", log_text)
        self.assertNotIn("opaque", log_text)

    def test_error_page_contains_safe_diagnostic_and_request_id(self) -> None:
        self.server.bridge = ErrorBridge()  # type: ignore[assignment]
        response = self.request(
            "POST",
            bridge.BRIDGE_PATH,
            b"client_id=42&paycard=x&code=ABC123",
        )

        request_id = response.getheader("X-Bridge-Request-Id", "")
        self.assertEqual(response.status, 502)
        self.assertRegex(request_id, r"^[0-9a-f]{32}$")
        self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-UPSTREAM-CONNECT")
        self.assertIn("Не удалось получить ссылку страницы оплаты".encode(), response.body)  # type: ignore[attr-defined]
        self.assertIn(b"BRIDGE-UPSTREAM-CONNECT", response.body)  # type: ignore[attr-defined]
        self.assertIn(request_id.encode(), response.body)  # type: ignore[attr-defined]

    def test_poll_timeout_page_contains_safe_poll_diagnostics(self) -> None:
        self.server.bridge = PollTimeoutBridge()  # type: ignore[assignment]
        response = self.request(
            "POST",
            bridge.BRIDGE_PATH,
            b"client_id=42&paycard=x&code=ABC123",
        )

        request_id = response.getheader("X-Bridge-Request-Id", "")
        self.assertEqual(response.status, 504)
        self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-WAITPAY-TIMEOUT")
        self.assertIn(b"BRIDGE-WAITPAY-TIMEOUT", response.body)  # type: ignore[attr-defined]
        self.assertIn(request_id.encode(), response.body)  # type: ignore[attr-defined]
        self.assertIn(b"poll_count: <code>19</code>", response.body)  # type: ignore[attr-defined]
        self.assertIn(b"body_checkout_marker: <code>false</code>", response.body)  # type: ignore[attr-defined]

    def test_duplicate_page_has_retry_after_countdown_and_no_sensitive_values(self) -> None:
        self.server.bridge = DuplicateBridge()  # type: ignore[assignment]
        response = self.request(
            "POST",
            bridge.BRIDGE_PATH,
            b"client_id=987654&notify=private-marker&paycard=x&code=SENSITIVE123",
        )

        request_id = response.getheader("X-Bridge-Request-Id", "")
        body = response.body  # type: ignore[attr-defined]
        self.assertEqual(response.status, 429)
        self.assertEqual(response.reason, "Too Many Requests")
        self.assertEqual(response.getheader("Retry-After"), "29")
        self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-DUPLICATE-PAYMENT")
        self.assertIn("Платёж уже формируется".encode(), body)
        self.assertIn("Подождите".encode(), body)
        self.assertIn(b'id="retry-countdown"', body)
        self.assertIn(b"setInterval", body)
        self.assertIn("Вернуться к билету".encode(), body)
        self.assertIn(request_id.encode(), body)
        self.assertNotIn(b"SENSITIVE123", body)
        self.assertNotIn(b"987654", body)
        self.assertNotIn(b"private-marker", body)
        self.assertNotIn(b"yoomoney.ru", body)
        self.assertNotIn(b"cookie", body.lower())
        self.assertNotIn(b"<form", body.lower())

    def test_no_location_page_remains_separate_and_user_friendly(self) -> None:
        self.server.bridge = NoLocationBridge()  # type: ignore[assignment]
        response = self.request(
            "POST",
            bridge.BRIDGE_PATH,
            b"client_id=42&paycard=x&code=ABC123",
        )

        request_id = response.getheader("X-Bridge-Request-Id", "")
        body = response.body  # type: ignore[attr-defined]
        self.assertEqual(response.status, 502)
        self.assertIsNone(response.getheader("Retry-After"))
        self.assertEqual(response.getheader("X-Bridge-Result"), "BRIDGE-UPSTREAM-NO-LOCATION")
        self.assertIn("Платёжная ссылка пока не получена".encode(), body)
        self.assertIn("Подождите 30 секунд".encode(), body)
        self.assertIn("Вернуться к билету".encode(), body)
        self.assertIn(request_id.encode(), body)
        self.assertNotIn(b"BRIDGE-UPSTREAM-NO-LOCATION", body)
        self.assertNotIn(b"<form", body.lower())


if __name__ == "__main__":
    unittest.main()
