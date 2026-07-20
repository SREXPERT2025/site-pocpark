#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const htmlPath = process.env.PUBPAY_HTML || path.join(projectRoot, "ph-parking", "pubpay.html");
const expectedBridgeUrl =
    process.env.EXPECTED_BRIDGE_URL ||
    "https://srtestrealme.ru:3002/rigaland/payment-bridge";
const html = new TextDecoder("windows-1251", { fatal: true }).decode(
    fs.readFileSync(htmlPath),
);
const startMarker = "<!-- APPLE BRIDGE TEST V1 START -->";
const endMarker = "<!-- APPLE BRIDGE TEST V1 END -->";
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const block = html.slice(start + startMarker.length, end);
const scriptMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
assert.ok(scriptMatch);
const script = scriptMatch[1];
assert.match(script, /var APPLE_BRIDGE_DEBUG = false;/);
assert.equal((script.match(/\bAPPLE_BRIDGE_DEBUG\b/g) || []).length, 2);
assert.doesNotMatch(html, /<div[^>]+id=["']apple_bridge_test_v1["']/i);

function runScenario({
    userAgent,
    platform,
    maxTouchPoints,
    search,
    cardCodeText = null,
    hasPaymentForm = true,
    hasPaymentButton = true,
    paymentButtonName = "paycard",
    clientIdValue = "42",
    clientIdCount = 1,
    formValid = true,
    debug = false,
    tableRows = [],
}) {
    const markerAttributes = {};
    let marker = null;
    let markerCreationCount = 0;
    const cardCode = cardCodeText === null ? null : { textContent: cardCodeText };
    const rowElements = tableRows.map((texts) => ({
        cells: texts.map((textContent) => ({ textContent })),
    }));
    const formAttributes = {};
    const formListeners = {};
    const buttonListeners = {};
    const appendedFields = [];
    let acceptedSubmissions = 0;
    let codeField = null;
    let paymentIdField = null;
    const clientFields = Array.from({ length: clientIdCount }, () => ({
        name: "client_id",
        value: clientIdValue,
    }));
    const paymentButton = {
        tagName: paymentButtonName.startsWith("paybtn") ? "BUTTON" : "INPUT",
        name: paymentButtonName,
        type: "submit",
        value: "Оплатить",
        textContent: "Оплатить",
        disabled: false,
        getAttribute(name) {
            if (name === "name") return this.name;
            if (name === "type") return this.type;
            if (name === "value") return this.value;
            return null;
        },
        addEventListener(name, listener) {
            if (!buttonListeners[name]) buttonListeners[name] = [];
            buttonListeners[name].push(listener);
        },
    };
    const form = {
        querySelector(selector) {
            if (selector === 'input[name="client_id"]') return clientFields[0] || null;
            if (selector === 'input[name="code"]') return codeField;
            if (selector === 'input[name="payment_id"]') return paymentIdField;
            return null;
        },
        querySelectorAll(selector) {
            if (selector === "input[name], button[name]") {
                return hasPaymentButton ? [paymentButton] : [];
            }
            if (selector === 'input[name="client_id"]') return clientFields;
            if (selector === 'input[name="code"]') return codeField ? [codeField] : [];
            if (selector === 'input[name="payment_id"]') {
                return paymentIdField ? [paymentIdField] : [];
            }
            assert.fail(`unexpected selector: ${selector}`);
        },
        appendChild(element) {
            element.parentNode = form;
            appendedFields.push(element);
            if (element.name === "code") codeField = element;
            if (element.name === "payment_id") paymentIdField = element;
        },
        removeChild(element) {
            const index = appendedFields.indexOf(element);
            if (index !== -1) appendedFields.splice(index, 1);
            if (element === codeField) codeField = null;
            if (element === paymentIdField) paymentIdField = null;
            element.parentNode = null;
        },
        setAttribute(name, value) {
            formAttributes[name] = value;
        },
        addEventListener(name, listener) {
            if (!formListeners[name]) formListeners[name] = [];
            formListeners[name].push(listener);
        },
        checkValidity() {
            return formValid;
        },
    };
    function insertMarker(element) {
        marker = element;
        markerCreationCount += 1;
    }
    const logo = {
        insertAdjacentElement(position, element) {
            assert.equal(position, "afterend");
            insertMarker(element);
        },
    };
    const document = {
        readyState: "complete",
        body: {
            firstChild: null,
            insertBefore(element) {
                insertMarker(element);
            },
        },
        getElementById(id) {
            if (id === "apple_bridge_test_v1") return marker;
            if (id === "apple_bridge_card_code") return cardCode;
            return null;
        },
        querySelector(selector) {
            if (selector === ".logo_cont") return logo;
            return null;
        },
        getElementsByTagName(name) {
            if (name === "form") return hasPaymentForm ? [form] : [];
            if (name === "tr") return rowElements;
            return [];
        },
        createElement(name) {
            const attributes = {};
            const element = {
                style: {},
                textContent: "",
                setAttribute(attributeName, value) {
                    attributes[attributeName] = value;
                },
                attributes,
            };
            if (name === "div") {
                element.setAttribute = function (attributeName, value) {
                    attributes[attributeName] = value;
                    markerAttributes[attributeName] = value;
                };
                return element;
            }
            assert.equal(name, "input");
            return element;
        },
    };
    const context = {
        document,
        navigator: { userAgent, platform, maxTouchPoints },
        URLSearchParams,
        window: { location: { search } },
    };
    const runtimeScript = debug
        ? script.replace("var APPLE_BRIDGE_DEBUG = false;", "var APPLE_BRIDGE_DEBUG = true;")
        : script;
    vm.runInNewContext(runtimeScript, context);

    function submit({ submitter = paymentButton, triggerClick = true } = {}) {
        if (triggerClick) {
            for (const listener of buttonListeners.click || []) {
                listener({ currentTarget: paymentButton });
            }
        }
        const event = {
            submitter,
            defaultPrevented: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
        };
        for (const listener of formListeners.submit || []) {
            listener(event);
        }
        if (formValid && !event.defaultPrevented) acceptedSubmissions += 1;
        return event;
    }

    return {
        formAttributes,
        markerAttributes,
        get marker() {
            return marker;
        },
        get markerCreationCount() {
            return markerCreationCount;
        },
        get codeField() {
            return codeField;
        },
        get paymentIdField() {
            return paymentIdField;
        },
        paymentButton,
        appendedFields,
        submit,
        get acceptedSubmissions() {
            return acceptedSubmissions;
        },
    };
}

const IPHONE_SAFARI =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const MAC_SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15";

function runIPhone(search, cardCodeText = null, options = {}) {
    return runScenario({
        userAgent: IPHONE_SAFARI,
        platform: "iPhone",
        maxTouchPoints: 5,
        search,
        cardCodeText,
        ...options,
    });
}

function assertActive(result, expectedCode) {
    assert.equal(result.formAttributes.action, expectedBridgeUrl);
    assert.equal(result.formAttributes.method, "post");
    assert.equal(result.formAttributes["data-apple-bridge-test"], "V1");
    assert.equal(result.codeField.name, "code");
    assert.equal(result.codeField.value, expectedCode);
    assert.equal(result.codeField.type, "hidden");
    assert.equal(result.paymentIdField, null);
    assert.equal(result.marker, null);
    assert.equal(result.markerCreationCount, 0);
}

function assertPaymentIdActive(result, expectedPaymentId) {
    assert.equal(result.formAttributes.action, expectedBridgeUrl);
    assert.equal(result.formAttributes.method, "post");
    assert.equal(result.formAttributes["data-apple-bridge-test"], "V1");
    assert.equal(result.paymentIdField.name, "payment_id");
    assert.equal(result.paymentIdField.value, expectedPaymentId);
    assert.equal(result.paymentIdField.type, "hidden");
    assert.equal(result.codeField, null);
    assert.equal(result.marker, null);
    assert.equal(result.markerCreationCount, 0);
}

function assertCodeNotFound(result) {
    assert.equal(result.formAttributes.action, undefined);
    assert.equal(result.codeField, null);
    assert.equal(result.paymentIdField, null);
    assert.equal(result.marker, null);
    assert.equal(result.markerCreationCount, 0);
}

function assertPaymentUnavailable(result) {
    assert.equal(result.formAttributes.action, undefined);
    assert.equal(result.formAttributes.method, undefined);
    assert.equal(result.codeField, null);
    assert.equal(result.paymentIdField, null);
    assert.equal(result.marker, null);
    assert.equal(result.markerCreationCount, 0);
    assert.equal(result.paymentButton.disabled, false);
    assert.equal(result.paymentButton.value, "Оплатить");
    assert.equal(result.appendedFields.length, 0);
}

function assertDebugState(result, state, text, borderColor) {
    assert.equal(result.markerCreationCount, 1);
    assert.ok(result.marker);
    assert.equal(result.markerAttributes["data-state"], state);
    assert.equal(result.marker.textContent, text);
    assert.equal(result.marker.style.borderColor, borderColor);
}

for (const search of [
    "?code=TESTCODE01",
    "?code=[TESTCODE01]",
    "?code=%5BTESTCODE01%5D",
]) {
    assertActive(runIPhone(search), "TESTCODE01");
}

const exactQrMode = runIPhone("?code=%5B67BDE3CDF1%5D", null, {
    clientIdValue: "1609",
    debug: true,
});
assert.equal(exactQrMode.formAttributes.action, expectedBridgeUrl);
assert.equal(exactQrMode.codeField.value, "67BDE3CDF1");
assert.equal(exactQrMode.paymentIdField, null);
assertDebugState(
    exactQrMode,
    "active",
    "APPLE BRIDGE TEST V1: ACTIVE",
    "#258f4e",
);
assert.equal(exactQrMode.submit().defaultPrevented, false);
assert.equal(exactQrMode.submit().defaultPrevented, true);
assert.equal(exactQrMode.acceptedSubmissions, 1);

const guardedSubmit = runIPhone("?code=TESTCODE01");
assertActive(guardedSubmit, "TESTCODE01");
const firstSubmitEvent = guardedSubmit.submit();
assert.equal(firstSubmitEvent.defaultPrevented, false);
assert.equal(guardedSubmit.acceptedSubmissions, 1);
assert.equal(guardedSubmit.paymentButton.disabled, true);
assert.equal(guardedSubmit.paymentButton.value, "Формируем платёж…");
const paymentFieldProxy = guardedSubmit.appendedFields.find(
    (field) => field.attributes["data-apple-bridge-payment-field"] === "V1",
);
assert.ok(paymentFieldProxy);
assert.equal(paymentFieldProxy.name, "paycard");
assert.equal(paymentFieldProxy.value, "Оплатить");

const appendedAfterFirstSubmit = guardedSubmit.appendedFields.length;
const secondSubmitEvent = guardedSubmit.submit();
assert.equal(secondSubmitEvent.defaultPrevented, true);
assert.equal(guardedSubmit.acceptedSubmissions, 1);
assert.equal(guardedSubmit.appendedFields.length, appendedAfterFirstSubmit);

const vehicleSearch = runIPhone("?id=1609", null, {
    clientIdValue: "1609",
});
assertPaymentIdActive(vehicleSearch, "1609");
const vehicleFirstSubmit = vehicleSearch.submit();
assert.equal(vehicleFirstSubmit.defaultPrevented, false);
assert.equal(vehicleSearch.acceptedSubmissions, 1);
assert.equal(vehicleSearch.paymentButton.disabled, true);
assert.equal(vehicleSearch.paymentButton.value, "Формируем платёж…");
const vehiclePaymentFieldProxy = vehicleSearch.appendedFields.find(
    (field) => field.attributes["data-apple-bridge-payment-field"] === "V1",
);
assert.ok(vehiclePaymentFieldProxy);
const vehicleSecondSubmit = vehicleSearch.submit();
assert.equal(vehicleSecondSubmit.defaultPrevented, true);
assert.equal(vehicleSearch.acceptedSubmissions, 1);

const debugVehicleSearch = runIPhone("?id=1609", null, {
    clientIdValue: "1609",
    debug: true,
});
assert.equal(debugVehicleSearch.paymentIdField.value, "1609");
assert.equal(debugVehicleSearch.codeField, null);
assertDebugState(
    debugVehicleSearch,
    "active",
    "APPLE BRIDGE TEST V1: ACTIVE",
    "#258f4e",
);

const invalidFormSubmit = runIPhone("?code=TESTCODE01", null, {
    formValid: false,
});
invalidFormSubmit.submit();
assert.equal(invalidFormSubmit.acceptedSubmissions, 0);
assert.equal(invalidFormSubmit.paymentButton.disabled, false);
assert.equal(invalidFormSubmit.paymentButton.value, "Оплатить");
assert.equal(
    invalidFormSubmit.appendedFields.some(
        (field) => field.attributes["data-apple-bridge-payment-field"] === "V1",
    ),
    false,
);

const fallbackPage = runIPhone("?id=9001", " [TESTCODE01] ");
assertActive(fallbackPage, "TESTCODE01");

const tableFallbackPage = runIPhone("?id=9001", null, {
    tableRows: [
        ["Клиент №", "9001"],
        ["Штрих-код:", " [TESTCODE01] "],
    ],
});
assertActive(tableFallbackPage, "TESTCODE01");

const invalidQueryWithFallback = runIPhone("?code=BAD%2FCODE", "TESTCODE01");
assertActive(invalidQueryWithFallback, "TESTCODE01");

const duplicateCode = runIPhone("?code=TESTCODE01&code=SECOND");
assertCodeNotFound(duplicateCode);

const invalidCode = runIPhone("?code=BAD%2FCODE");
assertCodeNotFound(invalidCode);

const missingCode = runIPhone("?id=9001");
assertCodeNotFound(missingCode);

const mismatchedPaymentId = runIPhone("?id=1609", null, {
    clientIdValue: "1610",
    debug: true,
});
assert.equal(mismatchedPaymentId.formAttributes.action, undefined);
assert.equal(mismatchedPaymentId.codeField, null);
assert.equal(mismatchedPaymentId.paymentIdField, null);
assertDebugState(
    mismatchedPaymentId,
    "code-not-found",
    "APPLE BRIDGE TEST V1: INACTIVE — CODE NOT FOUND",
    "#c62828",
);

for (const search of [
    "?id=0",
    "?id=-1",
    "?id=abc",
    "?id=1.5",
    "?id=%20",
    "?id=1609%0A",
    "?id=123456789012345678901",
    "?id=1609&id=1609",
    "?id=",
]) {
    const invalidPaymentId = runIPhone(search, null, { clientIdValue: "1609" });
    assertCodeNotFound(invalidPaymentId);
}

const codeHasPriority = runIPhone("?code=67BDE3CDF1&id=1609", null, {
    clientIdValue: "1609",
});
assertActive(codeHasPriority, "67BDE3CDF1");

const invalidClientId = runIPhone("?id=1609", null, {
    clientIdValue: "01609",
    debug: true,
});
assertDebugState(
    invalidClientId,
    "payment-unavailable",
    "APPLE BRIDGE TEST V1: INACTIVE — PAYMENT UNAVAILABLE",
    "#87918c",
);
assert.equal(invalidClientId.formAttributes.action, undefined);

const duplicateClientId = runIPhone("?id=1609", null, {
    clientIdValue: "1609",
    clientIdCount: 2,
    debug: true,
});
assertDebugState(
    duplicateClientId,
    "payment-unavailable",
    "APPLE BRIDGE TEST V1: INACTIVE — PAYMENT UNAVAILABLE",
    "#87918c",
);
assert.equal(duplicateClientId.formAttributes.action, undefined);

const queryCannotEnableDebug = runIPhone(
    "?code=TESTCODE01&APPLE_BRIDGE_DEBUG=true",
);
assertActive(queryCannotEnableDebug, "TESTCODE01");

const completedClient = runIPhone("?id=9001", "TESTCODE01", {
    hasPaymentForm: false,
    tableRows: [
        ["Штрих-код", "TESTCODE01"],
        ["Состояние", "Завершён"],
    ],
});
assertPaymentUnavailable(completedClient);

const missingPaymentButton = runIPhone("?code=TESTCODE01", null, {
    hasPaymentButton: false,
});
assertPaymentUnavailable(missingPaymentButton);

const invalidTableFallback = runIPhone("?id=9001", null, {
    tableRows: [["Штрих-код", "TESTCODE01 / Завершён"]],
});
assertCodeNotFound(invalidTableFallback);

const numericPayButton = runIPhone("?code=TESTCODE01", null, {
    paymentButtonName: "paybtn12",
});
assertActive(numericPayButton, "TESTCODE01");

const macSafari = runScenario({
    userAgent: MAC_SAFARI,
    platform: "MacIntel",
    maxTouchPoints: 0,
    search: "?code=%5BTESTCODE01%5D",
});
assertActive(macSafari, "TESTCODE01");

const androidChrome = runScenario({
    userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/136.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
    search: "?code=TESTCODE01",
});
assert.equal(androidChrome.formAttributes.action, undefined);

const androidVehicleSearch = runScenario({
    userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/136.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
    search: "?id=1609",
    clientIdValue: "1609",
});
assert.equal(androidVehicleSearch.formAttributes.action, undefined);
assert.equal(androidVehicleSearch.codeField, null);
assert.equal(androidVehicleSearch.paymentIdField, null);
assert.equal(androidChrome.codeField, null);
assert.equal(androidChrome.marker, null);
assert.equal(androidChrome.markerCreationCount, 0);
androidChrome.submit();
assert.equal(androidChrome.paymentButton.disabled, false);
assert.equal(androidChrome.paymentButton.value, "Оплатить");
assert.equal(androidChrome.formAttributes.action, undefined);

const macChrome = runScenario({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
    search: "?code=TESTCODE01",
});
assert.equal(macChrome.formAttributes.action, undefined);
assert.equal(macChrome.marker, null);
assert.equal(macChrome.markerCreationCount, 0);

const macChromeVehicleSearch = runScenario({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
    search: "?id=1609",
    clientIdValue: "1609",
});
assert.equal(macChromeVehicleSearch.formAttributes.action, undefined);
assert.equal(macChromeVehicleSearch.paymentIdField, null);

const debugActive = runIPhone("?code=TESTCODE01", null, { debug: true });
assertDebugState(
    debugActive,
    "active",
    "APPLE BRIDGE TEST V1: ACTIVE",
    "#258f4e",
);
assert.equal(
    debugActive.formAttributes.action,
    expectedBridgeUrl,
);

const debugBypass = runScenario({
    userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/136.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
    search: "?code=TESTCODE01",
    debug: true,
});
assertDebugState(
    debugBypass,
    "bypass",
    "APPLE BRIDGE TEST V1: BYPASS",
    "#87918c",
);
assert.equal(debugBypass.formAttributes.action, undefined);

const debugPaymentUnavailable = runIPhone("?id=9001", "TESTCODE01", {
    debug: true,
    hasPaymentForm: false,
});
assertDebugState(
    debugPaymentUnavailable,
    "payment-unavailable",
    "APPLE BRIDGE TEST V1: INACTIVE — PAYMENT UNAVAILABLE",
    "#87918c",
);
assert.equal(debugPaymentUnavailable.formAttributes.action, undefined);

const debugCodeNotFound = runIPhone("?id=9001", null, { debug: true });
assertDebugState(
    debugCodeNotFound,
    "code-not-found",
    "APPLE BRIDGE TEST V1: INACTIVE — CODE NOT FOUND",
    "#c62828",
);
assert.equal(debugCodeNotFound.formAttributes.action, undefined);

/* Ensure the page template exposes the PH card code as the server-rendered fallback. */
assert.match(html, /id="apple_bridge_card_code">%value%<\/td>/);

console.log("pubpay Apple normalization/fallback/browser routing tests: OK");
