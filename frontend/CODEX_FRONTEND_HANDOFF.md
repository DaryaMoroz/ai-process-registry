# CODEX_FRONTEND_HANDOFF.md

**Project:** ИИ-агент анализа реестра процессов  
**Scope:** frontend Slice 01  
**Status:** READY FOR CODEX  
**Recommended model for initial Codex task:** GPT-5.6 Sol High (as specified in `MVP_PASSPORT_AND_BACKLOG.md`); short mechanical follow-ups may use GPT-5.6 Sol Medium.

## Scope and sources

Build only **Registry Upload → Process Selection on the same page → one Process Card → V1/V2 and partial PRE-SCORE**. Routes: `/registry`, `/process/[processId]`. Do not create a separate Process List/Selection route.

Normative frontend sources, in working order: `UI_SPEC.md`, `FRONTEND_SPEC_SLICE_01.md` (especially sections 17, 22, 24–26), `UI_TOKENS.md`, approved Registry Upload and Process Card mockups. Context/boundary sources: `MVP_PASSPORT_AND_BACKLOG.md`, `REGISTRY_SCHEMA.md`, `TECH_SPEC.md`, `PROJECT_CONTEXT.md`, `REGISTRY_MAPPING_MLH.md`, `SCORING_ENGINE_SPEC.md`. In conflicts, obey project normative priority: scoring spec for scoring, mapping spec for Excel, MVP passport for scope; current frontend specs govern presentation and their functional corrections supersede illustrative mockup values. The mockup's numeric example and unapproved 100 MB limit are not contract fixtures.

## Component map and application contracts

- `/registry`: `RegistryUpload`, `RegistryFileSummary`, `SheetSelection`, `RegistryValidationSummary`, `RegistryIssues`, `ProcessSelection`.
- `/process/[processId]`: `ProcessHeader`, `ScoreStatusBadge`, two `ScoreAxisCard` instances with `CriterionRow`, `DataQualityPanel`, `ExplainabilityTrigger`, `SourceDrawer`.
- `UploadRegistry` → workbook metadata and available sheets; `SelectSheetForProcessing` → processing current selected sheet; `ReadRegistryProcessing` → current status, `canContinue`, DQ and backend-authorized selectable PROCESS.
- `OpenProcessCard` → assembled `ProcessCardView` and automatic idempotent ensure of selected-process PRE-SCORE; `ReadProcessCard` → PENDING/RUNNING/AVAILABLE/FAILED; `RetryProcessPreScore` only if backend marks failure retryable; `ReadSourceDetails` by `sourceReferenceId`.
- Section 17 of `FRONTEND_SPEC_SLICE_01.md` is the complete application-level field contract. BE-REQ-01/02/03 in section 25 bind backend integration. Transport paths/methods are implementation choices, not normative requirements.

An active score snapshot is selected by backend and may be null. If a partial axis has `fullScore = null`, display backend range as primary and labelled backend `knownSum`/coverage as secondary; never show known sum as exact `/25`. A score-processing failure leaves card and DQ visible. Source type and fact status remain separate. The frontend never derives scores, eligibility, severity-based continuation, score stage, formulas or range.

## Codex implementation decomposition

Complete each row as a small reviewable task. All rows use `FRONTEND_SPEC_SLICE_01.md`, `UI_SPEC.md` and `UI_TOKENS.md` as inputs; cited sections and backend read models are the additional inputs. The **prohibitions below apply to every row**. IDs below sequence existing FE/FB tasks; they do not create duplicate product backlog entries.

| ID | Scope and existing backlog | Additional input | Implement | Acceptance criteria | Dependencies |
|---|---|---|---|---|---|
| CX-FE-01 | Foundation; FE-01–04 | Spec §§15–17, tokens, BE-REQ-01–03 | App shell, both routes, shared primitives, typed backend read models, common safe loading/error presentation | Two routes render; types match contract; no scoring YAML/rules in frontend | None |
| CX-FE-02 | Upload; FE-10–11, FB-12 | Spec §§3, 17.1, FX-01/02/05 | Picker/drag-drop `.xlsx/.xlsm`, UploadRegistry call, EMPTY/READING/upload error | Original file submitted; metadata only from backend; continuation disabled during READING | CX-FE-01, BE-REQ-01 |
| CX-FE-03 | Registry processing; FE-12–14, FB-04/12 | Spec §§3, 12, 17.1, FX-02–06 | Metadata, sheet selector, default/changed sheet processing, validation and DQ | Old PROCESS list clears on sheet change; stale response ignored; backend `canContinue` governs; incompatible sheet error displayed | CX-FE-02, BE-REQ-01 |
| CX-FE-04 | Selection; FE-15–16 | Spec §§4, 17.1, FX-03/04/06 | Select only returned PROCESS and navigate using internal `processId` | WARNING with `canContinue=true` permits choice; official code never route ID | CX-FE-03 |
| CX-FE-05 | Card shell; FE-20–22, FB-08/14 | Spec §§5–7, 17.2, FX-07/12 | OpenProcessCard, header/source facts/DQ placeholders, active snapshot badge semantics | Card renders with null snapshot; no fabricated PRE-SCORE badge; no client domain joins | CX-FE-01, CX-FE-04, BE-REQ-02/03 |
| CX-FE-06 | Score lifecycle; FE-04/20, FB-11/24 | Spec §§17.4, 18–19, FX-07/08/10/11 | Refresh card state; PENDING/RUNNING/AVAILABLE/FAILED; existing generic retry conditioned by retryable | Score error keeps card/DQ, no zero; repeated open does not trigger duplicate run; non-retryable hides action | CX-FE-05, BE-REQ-03 |
| CX-FE-07 | Axes and criteria; FE-23–25, FB-19 | Spec §§8–11, 17.2, FX-09/12/13 | VALUE and FEASIBILITY cards, V1/V2 rows, range/knownSum/coverage formatting | Null criterion is `—`; backend range primary on partial; no local score calculations or thresholds | CX-FE-06, BE-REQ-02 |
| CX-FE-08 | DQ and evidence; FE-26–28 | Spec §§12–14, 17.3, FX-13–15 | DQ panel, criterion explanations, source-linked accessible drawer | DQ separate from missing; Confirmed Registry and Derived source details keep sourceType/factStatus distinct; derived input links use backend IDs | CX-FE-05/07, BE-REQ-02 |
| CX-FE-09 | Quality gate; FE-30–32 | Spec §§20, 24, 26, both mockups | Responsive/accessibility pass and contract fixture tests of complete flow | Keyboard and visible focus; no horizontal overflow; 15 fixture cases; no client scoring, row classification or source mutation | CX-FE-01–08 |

Backend consumers should implement BE-REQ-01–03 alongside the corresponding FE rows. Fixtures in spec §26 may be used to develop presentation before live integration; a fixture cannot substitute for the required integrated result in final acceptance.

## Prohibitions and Definition of Done

Do not change scoring methodology 1.1, mapping profile, backend entities, official Excel or approved mockup composition. Do not implement scoring, `knownSum`, coverage, range, thresholds, `scoring_config_v1.1.yaml` access, Excel row classification, interview, confirmation, matrix/dashboard, a full REST API or extra routes. No persistent user-facing "Start scoring" button.

Done when both routes complete the selected-process flow; backend controls sheets, selection, `canContinue`, active snapshot and scoring lifecycle; a partial PRE-SCORE renders honestly; card/DQ survive scoring failure; source provenance opens; UI matches tokens and accessibility rules; and section 26 contract fixtures plus integrated first-slice acceptance pass. See full Definition of Done in spec §24.
