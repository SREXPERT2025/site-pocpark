# Site ↔ AI Core Canonical Hash Contract V1 — offline report

Date: 2026-08-08

## Outcome

The production incident was reproduced as a cross-language byte mismatch:
Python serialized 57 integral binary64 values as `1.0` / `0.0`, while the Site
received JSON numbers and serialized them as `1` / `0`. The old hashes were:

- Runtime: `007616579dba3063eb2e741ef6c9796bd328a0ca40cfb53e445106a3dc4d96af`
- Site: `7ca5b36f50a53fd4ac6d3ea294a6952be846570f33c9755ce126143de4464fd0`

`CANONICAL_JSON_HASH_V1` replaces both language-default serializers. Its
contract revision is pinned to:

- Contract SHA: `6cd71a5596346925ecdd2ffeb9d45262d881ee93`
- Runtime SHA: `b9c58dbbd0cd28fcc0de9e2751b0ddd5a3a66763`
- Site target SHA: use the commit containing this report

The canonical incident hash is:

`692c85cf9cf5c4252037e6f0546375e5e3b579c554890c2699a301197241fe70`

Python Runtime and JavaScript Site produce byte-identical canonical UTF-8 and
the same SHA-256.

## Contract properties

- Unicode scalar key order; array order preserved.
- Explicit string escaping and strict UTF-8 without BOM.
- Exact fixed-point decimal rendering of accepted IEEE-754 binary64 values.
- `1.0 = 1`, `0.0 = 0`, `-0.0 = 0`.
- Exponent-form inputs never produce exponent notation in canonical bytes.
- NaN, infinity, unpaired surrogates, cyclic/non-JSON values, sparse arrays,
  and unsafe integer-valued numbers fail closed.
- Site always recomputes the Decision Package hash.
- Unknown canonicalization version, canonicalizer failure, and mismatch fail
  closed.

## Model-free acceptance

- Shared valid golden vectors: 22/22.
- Shared rejection vectors: 5/5.
- Failed live Decision Package regression: pass.
- Runtime response schema and canonical hash: pass.
- JSON transport and Site hash validation: pass.
- Ephemeral Site state mutation proposal and acknowledgement: pass.
- Wrong hash, unsupported version, and canonicalizer failure: fail closed.
- Existing Runtime suites: 55/55.
- Owner integration, public routing, config and Ubuntu-style dependency gates:
  pass with deterministic executors.
- Site TypeScript: pass.
- Site production build: pass.

Model requests: 0. Production mutations: 0. Public AI Core remains disabled in
the observed production baseline. No deployment, push, Gateway A change, or
Site Foundation B change was performed.

The next allowed release stage is a separately approved owner-canary package
using the exact Contract, Runtime, and Site commits above. Public activation is
not authorized by this report.
