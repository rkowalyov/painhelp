# Copilot instructions for painhelp

Purpose: help Copilot-style assistants quickly understand how this repo works and where to make safe changes.

---

## Build / test / lint
- This repository is a static frontend (single HTML + JSON scenarios). No build, test or lint scripts are present.
- Quick local preview (serves files over HTTP so fetch() works):
  - Python: `python -m http.server 8000` then open `http://localhost:8000/1st-pain-quiz-styled.html`
  - Node (if available): `npx serve .` or `npx http-server .`
- There is no test runner configured. For any added JS/CI tooling, update this file.

---

## High-level architecture
- Entry point: `1st-pain-quiz-styled.html` — the quiz engine (HTML/CSS/JS in a single file).
- Scenarios: `scenarios/*.json` — data-driven quiz definitions. `scenarios/pain-v1.json` is the current scenario.
- Archive: `arc/` holds historical implementations.
- Flow: HTML loads a scenario JSON via fetch(), renders hero → questions → email → scoring → sends data to Bitrix24 CRM (webhook).

Key runtime pieces in `1st-pain-quiz-styled.html`:
- DEFAULT_SCENARIO_URL: `./scenarios/pain-v1.json`
- SCENARIO_QUERY_KEY: `quiz` — `?quiz=name` will select `./scenarios/name.json` (sanitizes input and forbids `..`).
- resolveScenarioUrl() enforces safety: only alphanum, underscore, dot, dash, slash; rejects `..`.
- sendToCRM(result) posts a payload to Bitrix24; if webhook missing or placeholder, demo mode is used.

---

## Scenario JSON: schema & conventions
- Top-level keys used by the engine:
  - `meta`: title, subtitle, trust_badges (array), cta_start, webhook (Bitrix24 URL), source_label, optional `email_title`, `email_subtitle`, `email_fear`.
  - `questions`: ordered array. Each question object typically contains:
    - `id` (string) — unique identifier used in state and CRM mapping
    - `crm_field` (optional) — Bitrix field name (e.g., `UF_CRM_PAIN_LOCATION`)
    - `text` — question text
    - `options` — array of { label, value, score }
    - optional scoring flags:
      - `flag: "chronic_if_gte_index"` with `chronic_threshold` (index) — used to mark `isChronic`
      - `flag: "failed_treatment_if_value"` with `failed_treatment_value` — used to mark `failedTreatment`
  - `scoring`: named buckets (`low`, `medium`, `high`) each with `max`, `title`, `text`, `cta` (array)
  - `crm_fields`: mapping for final fields: `score`, `result`, `is_chronic`, `failed_treatment`, `source`, `quiz_date`

- Conventions:
  - `id` values should be short, ascii-friendly, and stable (used as keys in stored answers and CRM payload).
  - `crm_field` should match Bitrix24 custom field names (e.g., `UF_CRM_*`).
  - Option `value` is what is stored/sent to CRM; `score` is numeric and used for aggregated scoring.

---

## CRM / integration notes
- The engine expects a Bitrix24-style webhook in `meta.webhook`. The code will normalize the URL and append `.json` if needed.
- Payload shape:
  - `fields.TITLE` set to `meta.source_label` (or `quiz` fallback)
  - `fields.EMAIL` is an array: [{ VALUE: state.email, VALUE_TYPE: "WORK" }]
  - For each question with `crm_field`, the engine sets `fields[crm_field] = answer_value`.
  - Final fields from `crm_fields` mapping: score (number), result (category), is_chronic / failed_treatment = `Y` or `N`, quiz_date = ISO string.
- If webhook is absent or contains placeholders, the UI logs demo mode and does not POST.
- On success, engine shows CRM lead ID; on error, sets `.crm-status.err` text.

---

## Key code patterns / important places to edit
- To add/change quiz content: edit or add `scenarios/*.json`. No code changes needed if you follow the JSON schema.
- To change which scenario the engine loads by default: edit `DEFAULT_SCENARIO_URL` in `1st-pain-quiz-styled.html`.
- To allow a scenario path outside `scenarios/`, supply a query param with a path (e.g., `?quiz=./other/path/foo.json`) — keep in mind resolveScenarioUrl() sanitizes input.
- To add analytics events, see `trackEvent(name, data)` — events are pushed to `window.dataLayer`.

---

## Files to check when changing behavior
- `1st-pain-quiz-styled.html` — UI, flow, scoring, CRM integration.
- `scenarios/*.json` — data that drives questions and CRM mappings.

---

## Existing AI assistant configs
- No Claude/OpenCode, Cursor, Aider, Windsurf, or other assistant config files detected. Add references here if you introduce them.

---

Summary: created repository-specific instructions describing how the static quiz engine works, where scenarios live, the scenario JSON schema, and CRM integration details. Update this file if you add build steps, tests, CI, or assistant configs.

If you'd like this file edited (add CI steps, test commands, or more examples), say so and specify what to include.
