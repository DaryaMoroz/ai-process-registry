# FRONTEND_SPEC_SLICE_01.md

**Project:** ИИ-агент анализа реестра процессов  
**Slice:** 01  
**Version:** v0.3  
**Status:** READY FOR IMPLEMENTATION  
**Frontend:** Next.js / React / TypeScript

## 1. Scope

Первый frontend-slice:

```text
Registry Upload
      ↓
Process Selection
      ↓
Process Card
      ↓
V1 / V2 + partial PRE-SCORE
```

`Process Selection` является частью `/registry`, а не отдельным экраном.

## 2. Routes

```text
/registry
/process/[processId]
```

Дополнительный route для Process Selection в Slice 01 не требуется.

## 3. `/registry`

### Purpose

Загрузка существующего реестра, отображение результата backend parsing/validation и выбор backend-provided процесса для перехода в Process Card.

Исходный реестр не изменяется.

### Supported upload formats

UI upload control поддерживает:

```text
.xlsx
.xlsm
```

Backend остаётся авторитетным источником фактической проверки файла и совместимости mapping-профиля.

### States

```ts
type RegistryUploadState =
  | "EMPTY"
  | "READING"
  | "VALID"
  | "WARNING"
  | "ERROR";
```

#### EMPTY
- page title;
- explanatory text;
- upload / drag-and-drop;
- `.xlsx, .xlsm` hint;
- source registry unchanged notice.

#### READING
- file name;
- processing indicator;
- after safe metadata reading, backend-provided available sheets, default and selected sheet;
- the initial default sheet can be submitted for processing automatically; changing sheet starts processing for that sheet;
- continue disabled;
- Process Selection hidden/disabled.

#### VALID
- file name;
- success state;
- backend registry/parsing info;
- backend-provided `canContinue`;
- Process Selection available only when backend returns `canContinue = true` and process summaries.

#### WARNING
- file name;
- warning state;
- warning summary/details;
- continue only when backend returns `canContinue = true`;
- Process Selection available only when backend allows continuation.

#### ERROR
- file name if available;
- error state;
- user-readable error;
- replace/retry action;
- Process Selection unavailable.

### Registry information

When provided by backend, UI may show:
- file name;
- file extension;
- file size;
- checksum;
- registry version ID;
- mapping profile/version;
- selected sheet;
- read-only source notice.

These values are informational. Frontend does not validate mapping rules itself.

### Registry flow and sheet choice

```text
EMPTY → UploadRegistry → workbook metadata / availableSheets
→ backend defaultSheet / selectedSheet → SelectSheetForProcessing
→ READING → VALID | WARNING | ERROR → canContinue → selectableProcesses
```

After upload the backend alone reads workbook metadata and supplies available sheets. `Лист3` is the backend default of pilot profile `registry_mlh`; the frontend does not hardcode compatibility rules. The initially selected default can be submitted automatically, with no new user action. A user change submits only the current `registryVersionId` and exact sheet name. The backend validates its mapping compatibility; it never silently substitutes another sheet.

While processing a new selection, the previous sheet's selectable process list is withdrawn and continuation is unavailable. Late responses for an older selection must not replace the current view. Validation and `canContinue` always come from backend; the frontend neither reads workbook cells nor checks 19 headers, row type or eligibility. The application operations and read model are specified in section 17.1.

## 4. Process Selection on `/registry`

After successful processing, backend provides selectable process summaries.

Render for each selectable item:
- process name;
- internal backend process ID;
- source reference when available.

An official process code can be shown as metadata but cannot replace `processId` in the route. Only a current backend response with `canContinue = true` allows selection. An empty backend list remains empty; the frontend does not infer PROCESS rows.

Frontend must not:
- classify SourceRows;
- derive `PROCESS` from Excel data;
- calculate `scoring_eligible`;
- add rows to selection that backend did not return as selectable.

Selecting a process navigates to:

```text
/process/[processId]
```

## 5. `/process/[processId]`

### Required sections

1. Process Header
2. Score Status
3. VALUE
4. FEASIBILITY
5. Data Quality
6. Explainability
7. Source Drawer

## 6. Process Header

Render backend-provided:
- process name;
- process ID;
- registry source reference;
- score status.

Unavailable values are not fabricated.

The backend supplies the assembled `ProcessCardView`. The frontend does not join domain entities or choose the most recent score snapshot. A card may have `activeScoreSnapshot = null` while its score is pending or has failed.

## 7. Score Status

```ts
type ScoreStatus =
  | "PRE_SCORE"
  | "INTERVIEW_SCORE"
  | "VERIFIED_SCORE";
```

Display:

```text
PRE_SCORE       → PRE-SCORE
INTERVIEW_SCORE → INTERVIEW SCORE
VERIFIED_SCORE  → VERIFIED SCORE
```

Slice 01 is expected to exercise `PRE_SCORE`. Supporting the full enum in the view model does not add interview flow to this slice.

Frontend does not determine score status.

The score stage badge is sourced only from `activeScoreSnapshot.stage`. `scoreProcessing.state` is a distinct lifecycle state, not a score stage; before an active snapshot exists, show pending/running/failed text instead of fabricating a PRE-SCORE badge.

## 8. Score axis semantics

`ScoreAxisCard` is reused for VALUE and FEASIBILITY.

Render backend-provided:
- axis label;
- max score;
- full score;
- known sum;
- coverage;
- range;
- criteria;
- missing inputs / missing criteria;
- explainability action when available.

Frontend does not calculate any scoring value.

### Full result

If `fullScore != null`:
- `fullScore / maxScore` is the primary numeric result;
- coverage and range may be secondary metadata.

### Partial result

If `fullScore = null`:
- do not render `knownSum / maxScore` as if it were a final score;
- render range as the primary analytical result when backend supplies it;
- render `knownSum` only with explicit label `Известная сумма`;
- render coverage as secondary metadata;
- missing criterion score → `—`.

Example backend state:

```ts
{
  maxScore: 25,
  fullScore: null,
  knownSum: 18,
  coverage: 0.8,
  range: [19, 23]
}
```

Expected UI semantics:

```text
19–23 / 25
Известная сумма: 18
Coverage 80%
```

Formatting `0.8` as `80%` is presentation formatting only. Frontend must not derive coverage from criterion values.

## 9. VALUE block

Render:
- title `Ценность`;
- backend-provided max score;
- axis result according to section 8;
- V1/V2 criterion rows for Slice 01 when returned;
- remaining criteria/missing states only as returned by backend;
- explainability action when available.

Frontend contains no V1/V2 thresholds or scoring mappings.

## 10. FEASIBILITY block

Render:
- title `Реализуемость`;
- backend-provided max score;
- axis result according to section 8;
- criteria exactly as returned by backend;
- missing states without local assumptions.

Slice 01 may receive low or zero coverage for FEASIBILITY. Frontend does not fabricate values to make the card look complete.

## 11. Null rendering

```ts
null -> "—"
```

Never convert `null` to `0`, `1` or another assumed score.

`knownSum = 0`, if explicitly returned by backend, is not a score and must be labelled as known sum.

## 12. Data Quality

Frontend renders `DataQualityIssue` separately from Conflict, Risk, Blocker and criterion missing inputs.

Presentation contract:

```ts
type DataQualitySeverity = "INFO" | "WARNING" | "ERROR";

type DataQualityIssueViewModel = {
  id: string;
  code: string;
  severity: DataQualitySeverity;
  message: string;
  field?: string | null;
  affectsScoring?: boolean | null;
  sourceReferenceIds: string[];
};
```

Show:
- code / issue type;
- severity;
- short description;
- related field/location when available;
- scoring impact when backend provides it;
- source/explanation action when available.

Do not introduce a shared domain enum such as `MISSING | CONFLICT | REQUIRES_VERIFICATION` for Data Quality.

Slice 01 shows linked Data Quality issues and criterion missing inputs in their respective sections. Conflict, Risk and Blocker are separate domains and are not folded into either type.

## 13. Explainability

Criterion may expose backend-provided:
- criterion ID;
- label;
- score / null;
- explanation;
- rule ID;
- missing inputs;
- evidence/source refs.

Frontend does not generate criterion explanation and does not reproduce scoring rules.

## 14. Source Drawer

Side drawer for source/evidence details.

Possible content:
- source type;
- source name/reference;
- fact status;
- source role;
- registry sheet / row / column / coordinate;
- evidence fragment/value;
- derivation/verification metadata when available.

Source type and fact status are separate dimensions.

```ts
type SourceType =
  | "registry"
  | "calculated"
  | "interview"
  | "document"
  | "system_data"
  | "llm_hypothesis";

type FactStatus =
  | "Confirmed"
  | "Derived"
  | "Inferred"
  | "Unknown";
```

Slice 01 primarily expects:

```text
registry + Confirmed
calculated + Derived
```

The drawer loads `SourceDetailsView` by a backend `sourceReferenceId`. Derived evidence may contain a backend-provided trace and IDs of input source references; the frontend does not calculate the derived fact.

## 15. Component structure

```text
RegistryPage
 ├─ RegistryUpload
 ├─ RegistryFileSummary
 ├─ SheetSelection (within RegistryPage)
 ├─ RegistryValidationSummary
 ├─ RegistryIssues
 └─ ProcessSelection

ProcessPage
 ├─ ProcessHeader
 ├─ ScoreStatusBadge
 ├─ ScoreAxisCard (VALUE)
 │   └─ CriterionRow
 ├─ ScoreAxisCard (FEASIBILITY)
 │   └─ CriterionRow
 ├─ DataQualityPanel
 ├─ ExplainabilityTrigger
 └─ SourceDrawer
```

`ScoreAxisCard` reusable for both axes.

## 16. Recommended project structure

```text
src/
├── app/
│   ├── layout.tsx
│   ├── registry/
│   │   └── page.tsx
│   └── process/
│       └── [processId]/
│           └── page.tsx
│
├── features/
│   ├── registry/
│   │   ├── components/
│   │   │   ├── RegistryUpload.tsx
│   │   │   ├── RegistryFileSummary.tsx
│   │   │   ├── SheetSelection.tsx
│   │   │   ├── RegistryValidationSummary.tsx
│   │   │   ├── RegistryIssues.tsx
│   │   │   └── ProcessSelection.tsx
│   │   ├── api/
│   │   ├── model/
│   │   └── formatters/
│   │
│   └── process/
│       ├── components/
│       │   ├── ProcessHeader.tsx
│       │   ├── ScoreStatusBadge.tsx
│       │   ├── ScoreAxisCard.tsx
│       │   ├── CriterionRow.tsx
│       │   ├── DataQualityPanel.tsx
│       │   ├── ExplainabilityTrigger.tsx
│       │   └── SourceDrawer.tsx
│       ├── api/
│       ├── model/
│       └── formatters/
│
├── shared/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   ├── Skeleton.tsx
│   │   └── Drawer.tsx
│   ├── api/
│   └── lib/
│
└── styles/
    ├── tokens.css
    └── globals.css
```

`formatters` may perform only presentation formatting, for example:
- `null → —`;
- `0.8 → 80%`;
- `[19, 23] → 19–23`.

`formatters` must not calculate score, known sum, coverage, range or apply thresholds.

## 17. Application-level frontend/backend contracts

The following TypeScript-like contracts specify **application operations and backend read models**, not production code, endpoint URLs, HTTP methods or a full API. The backend owns parsing, mapping, `canContinue`, active snapshot selection and scoring. The frontend owns only presentation and invocation of these operations.

### 17.1. Registry operations and processing read model

```ts
UploadRegistry({ file, fileName, profileId? })
  → WorkbookMetadataResult

SelectSheetForProcessing({ registryVersionId, sheetName })
  → RegistryProcessingView           // initially READING; then final result

ReadRegistryProcessing({ registryVersionId })
  → RegistryProcessingView           // current selected sheet / current run
```

`file` means the original file bytes; `fileName` is supplied by the upload control. `profileId` is optional if backend applies the pilot profile by default. The backend validates the profile and derives extension, checksum and available sheets. It creates `registryVersionId` only on an accepted upload. A file rejected before version creation returns a safe upload error without requiring this ID. Workbook metadata reading never delegates workbook access to frontend.

```ts
type WorkbookMetadataResult = {
  registryVersionId: string;
  fileName: string;
  fileExtension: "xlsx" | "xlsm";
  fileSize: number;
  checksum: string;
  profileId: string;
  mappingVersion: string;
  availableSheets: { name: string }[];
  defaultSheet: string;
  selectedSheet: string;             // initially backend default
  state: "READING";
};

type RegistryProcessSummary = {
  processId: string;                 // internal backend ID; route parameter
  processName: string;
  sourceRef: string | null;          // display reference, e.g. file/sheet/row
  officialProcessCode?: string | null; // display only, never route ID
};

type RegistryProcessingView = {
  registryVersionId: string;
  fileName: string;
  fileExtension: "xlsx" | "xlsm";
  fileSize: number;
  checksum: string;
  profileId: string;
  mappingVersion: string;
  availableSheets: { name: string }[];
  defaultSheet: string;
  selectedSheet: string;
  state: "READING" | "VALID" | "WARNING" | "ERROR";
  canContinue: boolean;
  issues: DataQualityIssueViewModel[];
  selectableProcesses: RegistryProcessSummary[];
  error?: { code: string; message: string } | null; // safe UI text
};
```

`EMPTY` belongs to the frontend before upload. Once metadata arrives, frontend may automatically submit `defaultSheet`, or submit a different exact sheet name chosen by the user. `SelectSheetForProcessing` receives only the current version ID and sheet name; backend performs mapping compatibility validation and does not silently choose another sheet. During a new `READING`, `canContinue = false` and `selectableProcesses = []`. Frontend immediately hides the old sheet's process list and prevents stale responses from replacing the newer selection. In `ERROR` selection is unavailable. In `VALID` or `WARNING` selection is available only when backend returns `canContinue = true`. Backend returns only authorized selectable PROCESS records, never raw rows for frontend classification. `canContinue` must not be derived from issue severity.

### 17.2. One assembled Process Card read model

```ts
type ScoreCriterionViewModel = {
  id: string;
  label: string;                     // backend display label
  score: number | null;
  explanation: string | null;       // backend explanation; no local rule text
  ruleId: string | null;
  missingInputs: string[];
  sourceReferenceIds: string[];
};

type ScoreAxisViewModel = {
  maxScore: number;
  fullScore: number | null;
  knownSum: number;
  coverage: number;
  range: [number, number] | null;
  criteria: ScoreCriterionViewModel[];
};

type ProcessCardView = {
  processId: string;
  processName: string;
  sourceRegistry: {
    registryVersionId: string;
    fileName: string;
    sheetName: string;
    rowNumber: number;
    sourceReferenceId?: string | null;
    officialProcessCode?: string | null;
  };
  scoreProcessing: {
    state: "PENDING" | "RUNNING" | "AVAILABLE" | "FAILED";
    error: { code: string; message: string; retryable: boolean } | null;
  };
  activeScoreSnapshot: {
    scoreSnapshotId: string;
    inputSnapshotId: string;
    methodologyVersion: string;
    stage: ScoreStatus;
    value: ScoreAxisViewModel;
    feasibility: ScoreAxisViewModel;
  } | null;
  sourceFacts: {
    label: string;
    value: string | number | boolean | null;
    unit?: string | null;
    factStatus: FactStatus;
    sourceReferenceIds: string[];
  }[];
  dataQualityIssues: DataQualityIssueViewModel[];
};
```

`OpenProcessCard({ processId }) → ProcessCardView` opens the selected primary card and ensures PRE-SCORE if required (section 17.4). `ReadProcessCard({ processId }) → ProcessCardView` reads subsequent states. Route parameters are internal process IDs. Backend resolves the appropriate card/AnalysisUnit, selects the active score snapshot and assembles header, source facts, DQ and score results. Frontend does not join domain entities or choose the latest snapshot. A card can exist with `activeScoreSnapshot = null`; axis results are absent until backend returns an active snapshot. If an active result is returned, its stage, VALUE and FEASIBILITY come from that snapshot. FEASIBILITY may have zero coverage; criterion rows, including missing rows, are shown only as returned. `fullScore`, `knownSum`, coverage and range are separate backend fields and frontend must not recompute any of them.

### 17.3. Source details read model

```ts
ReadSourceDetails({ sourceReferenceId }) → SourceDetailsView

type SourceDetailsView = {
  sourceReferenceId: string;
  sourceType: SourceType;
  factStatus: FactStatus | null;
  sourceName?: string | null;
  sourceRole?: string | null;
  sheet?: string | null;
  row?: number | null;
  column?: string | null;
  coordinate?: string | null;
  excerptOrValue?: string | number | boolean | null;
  verificationState?: string | null;
  derivation?: {
    ruleId: string;
    ruleVersion: string;
    trace?: string | null;
    inputSourceReferenceIds: string[];
  } | null;
};
```

`sourceType` and `factStatus` remain separate. A Confirmed Registry fact links to the original coordinate. For a Derived calculated fact, `derivation` is present with rule ID/version and input source reference IDs; a human-readable trace may be supplied by backend. The frontend never calculates the derived fact or reconstructs its formula.

### 17.4. PRE-SCORE lifecycle and retry

The backend creates the primary Process Analysis Card during registry processing. At the **first opening of a selected card**, `OpenProcessCard` idempotently ensures PRE-SCORE for that process when neither a suitable active result nor an existing attempt for the same input/version exists. It does not trigger scoring for all listed processes and requires no permanent user-facing "Start scoring" action. Reopening during `PENDING`/`RUNNING` or after `FAILED` does not create a duplicate calculation; after failure only a backend-authorized retry starts a new attempt. Backend creates the input snapshot before calling Rule Engine and manages the active score snapshot.

```text
card available without snapshot
→ PENDING → RUNNING → AVAILABLE (activeScoreSnapshot provided)
                    └──→ FAILED (card and DQ remain available)
```

The frontend obtains status and outcome via `ReadProcessCard`, using the implementation's chosen refresh mechanism. `PENDING`/`RUNNING` show stable placeholders; no stage badge or numeric axis is invented when the snapshot is null. On `AVAILABLE`, backend supplies an active snapshot. On `FAILED`, backend supplies safe `code`, `message` and `retryable`. No score is displayed as zero. If `retryable = true`, the existing generic retry handling can call backend `RetryProcessPreScore({ processId })`; backend owns idempotence and history. If false, no retry action is shown. A scoring failure does not retroactively change a successfully validated registry to upload `ERROR`. Frontend must not retry automatically by calculating or substituting values.

## 18. Loading

Use stable skeleton/loading placeholders.

Avoid layout jumps.

Required loading states:
- upload/reading;
- workbook metadata and sheet selection;
- registry validation;
- process selection loading;
- process card loading;
- PRE-SCORE `PENDING` / `RUNNING` after a card is available;
- source details loading.

## 19. Errors

Handle:
- upload failure;
- unsupported/invalid file response;
- parsing failure;
- validation/mapping failure;
- process list loading failure;
- process loading failure;
- PRE-SCORE failure with backend `retryable` flag, separately from card loading failure;
- source details loading failure.

Do not expose raw stack traces in main UI.

Retry action must not silently reinterpret backend errors.
Scoring `FAILED` retains the process header and DQ issues. Offer retry only if backend marks that failure retryable. A card without an active snapshot is not a zero score or completed PRE-SCORE.

## 20. Accessibility

- keyboard-accessible controls;
- visible focus;
- semantic buttons;
- sufficient contrast;
- status not only by color;
- keyboard closable drawer;
- Process Selection usable from keyboard;
- disabled actions expose correct disabled semantics.

## 21. Styling

Follow `UI_TOKENS.md`.

Approved mockup composition remains the visual baseline. Required functional corrections from this specification have priority over stale mockup labels or values.

## 22. Slice 01 frontend backlog

| ID | Task | Acceptance result | Priority |
|---|---|---|---|
| FE-01 | App shell + UI tokens | `/registry` and `/process/[processId]` use one visual system | P0 |
| FE-02 | Shared UI primitives | Button/Card/Badge/Alert/Skeleton/Drawer available | P0 |
| FE-03 | View-model types | Types follow section 17: registry metadata/processing, assembled card, nullable active snapshot, source details; no scoring rules or YAML dependency | P0 |
| FE-04 | Common loading/error handling | Upload/card/scoring/source failures separated; stable layouts and safe messages; retry only where backend allows it | P0 |
| FE-10 | Registry Upload EMPTY | Drag/drop and picker accept `.xlsx/.xlsm`; submit original file, filename and optional profile to `UploadRegistry` | P0 |
| FE-11 | Registry Upload READING | Show metadata/sheets when returned; processing disables selection/continuation and hides old sheet results | P0 |
| FE-12 | Registry File Summary | Backend file/checksum/profile/available/default/selected sheet/read-only metadata rendered; sheet selection sends only ID and name | P0 |
| FE-13 | Registry Validation Summary | VALID/WARNING/ERROR and `canContinue` rendered solely from backend; incompatible sheet does not fall back silently | P0 |
| FE-14 | Registry Issues | Backend DQ issues rendered with severity and source action, separate from missing criteria | P0 |
| FE-15 | Process Selection | Only backend-authorized selectable processes from current allowed sheet shown | P0 |
| FE-16 | Registry → Process navigation | Internal `processId` opens `/process/[processId]`; official code is display-only; opening ensures selected process PRE-SCORE | P0 |
| FE-20 | Process Page loading/error | Assemble no domain entities on client; card loading distinct from PENDING/RUNNING/FAILED scoring; card/DQ persist on score failure | P0 |
| FE-21 | Process Header | Backend name/internal ID/source and active snapshot status rendered; null snapshot never gets a fabricated stage badge | P0 |
| FE-22 | Score Status Badge | PRE/INTERVIEW/VERIFIED mapping applies only to backend active snapshot stage | P0 |
| FE-23 | ScoreAxisCard | Reusable for backend VALUE and FEASIBILITY when active snapshot exists; otherwise stable placeholder | P0 |
| FE-24 | Partial result semantics | `fullScore=null` never rendered as `knownSum / max`; backend range primary, knownSum/coverage secondary | P0 |
| FE-25 | V1/V2 Criterion Rows | Backend score/null/explanation/rule ID/missing/source IDs shown, no thresholds or derived arithmetic in frontend | P0 |
| FE-26 | Data Quality Panel | Card DQ and criterion missing inputs separate; no conflation with Conflict/Risk/Blocker | P0 |
| FE-27 | Explainability entry points | Backend criterion/source ID opens Source Drawer; no local scoring explanation | P0 |
| FE-28 | Source Drawer | Backend source details show `sourceType` and `factStatus` separately; Derived trace/input refs only if supplied | P0 |
| FE-30 | Responsive behavior | Axis cards stack without horizontal overflow | P1 |
| FE-31 | Accessibility | Keyboard/focus/drawer/process-selection checks pass | P0 |
| FE-32 | Frontend contract fixtures/tests | Section 26 scenarios cover registry/sheet transitions, card lifecycle, null/partial score and both source types using backend results only | P0 |

## 23. Non-goals

Slice 01 does not implement:
- frontend scoring logic;
- score formulas;
- thresholds or enum scoring mappings;
- direct read of `scoring_config_v1.1.yaml`;
- row classification logic;
- conflict resolution logic;
- registry editing;
- Excel write-back;
- autonomous interview flow;
- fact confirmation flow;
- matrix/dashboard flow;
- chatbot UI;
- extra screens outside Registry Upload → Process Selection → Process Card.

## 24. Definition of Done

1. `/registry` supports EMPTY / READING / VALID / WARNING / ERROR.
2. Upload control accepts `.xlsx` and `.xlsm`.
3. Warning continuation follows backend `canContinue`.
4. Valid/allowed registry flow displays backend-provided Process Selection.
5. Frontend does not classify Excel rows or derive scoring eligibility.
6. Selected process navigates to `/process/[processId]`.
7. `/process/[processId]` renders Process Card.
8. VALUE and FEASIBILITY are separate.
9. Partial PRE-SCORE distinguishes `fullScore` from `knownSum`.
10. `fullScore = null` is never presented as an exact `/25` score.
11. `null → —`.
12. Coverage/ranges/known sum are rendered from backend only.
13. Data Quality is visible and not conflated with Conflict/Risk/Blocker.
14. Explainability opens backend source data.
15. Source Drawer keeps `sourceType` and `factStatus` separate.
16. PRE/INTERVIEW/VERIFIED enum is display-compatible.
17. No scoring logic or scoring YAML dependency exists in frontend.
18. Styling follows `UI_TOKENS.md`.
19. Accessibility requirements of section 20 are met.
20. Slice 01 fixtures/tests cover upload states, partial result, null and source drawer.
21. `availableSheets` and backend default/selected sheet are shown; switching sheet clears old selection until current processing finishes.
22. Backend assembles ProcessCardView and selects active snapshot; no client joining or latest-snapshot search.
23. First card opening idempotently ensures selected-process PRE-SCORE without a permanent scoring action; pending/running/failed stay distinct from score stage.
24. A score failure leaves card/DQ visible; only backend-allowed retry is offered and a null snapshot is never shown as zero.

## 25. Backend requirements bound to this slice

These are application-level implementation requirements, not endpoint definitions or new domain entities. Their owners are backend; frontend consumes the results. Existing FB tasks remain the backlog entries (see section 22 and handoff document).

| ID | Requirement | Consumers | Acceptance criteria |
|---|---|---|---|
| BE-REQ-01 | Return workbook metadata/available sheets, then processing result for exact selected sheet (section 17.1) | RegistryUpload, SheetSelection, RegistryValidationSummary, ProcessSelection | One registryVersionId links operations; incompatible sheet yields ERROR with no silent substitute; backend owns canContinue and authorized PROCESS list; changing sheet cannot retain the old selectable list |
| BE-REQ-02 | Return assembled ProcessCardView and SourceDetailsView by source reference ID (sections 17.2–17.3) | ProcessPage, axes, DQ, explainability, SourceDrawer | Backend selects active snapshot; card without snapshot is valid; V1/V2 link explanation/rule ID/evidence; Derived trace links input evidence; sourceType and factStatus remain separate |
| BE-REQ-03 | Ensure selected-process PRE-SCORE automatically on first card opening and report lifecycle/retryability (section 17.4) | ProcessPage and common loading/error components | No duplicate calculation for same input/version; success activates snapshot; failure preserves card/DQ and carries safe message and retryable flag; retry is backend-owned |

## 26. Minimum Codex contract fixtures

All fixtures represent **backend results or local EMPTY state**, not frontend-computed scoring expectations. They contain no threshold tables, formulas or scoring YAML. Fixture score numbers must be supplied as opaque backend outputs and must not be recalculated by frontend tests. Include a `processId` distinct from any `officialProcessCode` and a backend selected source sheet. The list below defines minimal semantic cases; file format and factory naming are implementation choices.

| Fixture | Minimal result / assertion |
|---|---|
| FX-01 Registry EMPTY | No uploaded file or backend read model; upload controls visible |
| FX-02 Registry READING | Metadata and available sheets available; `canContinue=false`, no selectable processes; loading visible |
| FX-03 Registry VALID | Selected sheet, `canContinue=true`, backend selectable PROCESS list; only its internal IDs navigate |
| FX-04 Registry WARNING | Issue present and `canContinue=true`; selection remains available despite warning |
| FX-05 Registry ERROR | Safe error, `canContinue=false`, empty selection; replacement/retry presentation |
| FX-06 Change sheet | Previously allowed selection withdrawn, new sheet READING with empty list; late old-sheet result ignored; new backend result applied |
| FX-07 Process Card PENDING | Header/DQ present, `activeScoreSnapshot=null`, axes use placeholders, no score badge |
| FX-08 Process Card RUNNING | Same nullable snapshot, busy state distinct from registry processing |
| FX-09 Partial PRE-SCORE AVAILABLE | Active snapshot stage PRE_SCORE; backend VALUE `fullScore=null`, backend `knownSum`, `coverage`, `range`, V1/V2; FEASIBILITY returned separately; range primary |
| FX-10 FAILED retryable | Header/DQ persist, no fabricated score, safe failure and existing retry action available |
| FX-11 FAILED non-retryable | Header/DQ persist, safe failure, no retry action |
| FX-12 Null active snapshot | Read model with `activeScoreSnapshot=null`; frontend never searches snapshot history or shows 0 |
| FX-13 Null criterion | Backend criterion `score=null` and missingInputs; displays `—` within criterion without DQ ERROR inference |
| FX-14 Registry Confirmed source | `sourceType=registry`, `factStatus=Confirmed`, sheet/row/coordinate and excerpt/value |
| FX-15 Calculated Derived source | `sourceType=calculated`, `factStatus=Derived`, backend derivation rule/version/trace and input source IDs |

For FX-09 with only V1/V2 known, one consistent backend-result fixture is `V1.score: 5`, `V2.score: 5`, `knownSum: 10`, `coverage: 0.4`, `range: [13, 25]`, `fullScore: null`; the remaining criteria are backend `null`. These are supplied fixture fields, not values to calculate in frontend. The screenshot's illustrative values are not normative test inputs. Test FE-32 against the returned fields and lifecycle, never against locally reconstructed methodology.
