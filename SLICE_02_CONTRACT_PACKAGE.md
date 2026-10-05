# SLICE_02_CONTRACT_PACKAGE.md

## 1. Document status

**Проект:** «ИИ-агент анализа реестра процессов»
**Vertical slice:** Slice 02 — Full Deterministic PRE-SCORE Process Card
**Версия integration contract:** 1.0.1 — локальная correction B-01; `resultContractVersion` сохраняется
**Дата консолидации:** 2026-10-02
**Статус:** SLICE 02 CONTRACT PACKAGE: READY FOR RE-REVIEW

Документ объединяет утверждённые backend/frontend решения и фиксирует точные application/read-model поля для их интеграции. Это нормативный integration contract, переданный на независимый re-review после локальной correction B-01; статус APPROVED этому документу не присвоен. Создание package не является разрешением запуска implementation.

Входные approval records, предоставленные владельцем проекта в задании:

| Область | Зафиксированный статус |
|---|---|
| Backend | BACKEND SLICE 02 DESIGN: APPROVED |
| Frontend review | REVIEW STATUS: PASS WITH NON-BLOCKING ISSUES |
| Frontend design | FRONTEND SLICE 02 DESIGN: APPROVED |
| Настоящий package | READY FOR RE-REVIEW; исходный FINAL REVIEW: BLOCKED по B-01; независимое approval исправленной редакции ещё не выполнено |

Названия и формы новых полей в §§8–13 — конкретизация integration contract этого package; они не выдаются за дословную цитату отдельного design-файла. Scoring semantics, domain entities и архитектурные решения не перепроектируются. Проверены актуальные нормативные Project files из §3. Старые pasted review notes не заменяют синхронизированные нормативные источники.

Термины **REQUIRED**, **OPTIONAL**, **MUST**, **MUST NOT** выражают обязательность. REQUIRED-поле присутствует в совместимом завершённом Slice 02 result даже при значении `null` или пустом массиве, если такое значение разрешено его контрактом. OPTIONAL presentation metadata не блокирует implementation или acceptance обязательного scope.

## 2. Frozen baseline

| Baseline | Статус |
|---|---|
| Slice 01 | SLICE 01: FROZEN |
| Frontend | FRONTEND BASELINE: FROZEN |
| Local | LOCAL BASELINE: FROZEN |
| Remote | REMOTE BASELINE: FROZEN |
| Frozen commit | `ceec1f6daddeb43058e54f3b42104d934b172034` |
| Согласованное состояние refs | `main = origin/main = ceec1f6` |

Commit и refs приняты из текущего задания как frozen baseline; Git в этой задаче не читался и не изменялся. Slice 02 расширяет существующий flow и read model. Исторический Slice 01 result остаётся историческим результатом и не мигрируется путём создания фиктивных evaluator outputs.

Сохраняются `/registry` и `/process/[processId]`; Process Selection остаётся внутри `/registry`. Source Drawer и disclosure остаются детализацией карточки. Новые основные экраны и новый REST API в Slice 02 не вводятся.

## 3. Normative sources

### 3.1. Актуальный комплект

| Физическое имя Project file | Канонический источник / версия | Нормативная область |
|---|---|---|
| `SCORING_ENGINE_SPEC.md` | Методика 1.1, актуальная синхронизированная редакция | Единственный источник scoring semantics, evidence/overlap/null/aggregation rules |
| `scoring_config_v1.1.yaml` | Methodology 1.1; config schema 1.0 | Исполняемая scoring configuration; не вводит правил вне scoring spec |
| `REGISTRY_MAPPING_MLH.md` | `registry_mlh`, mapping 1.0.0 | Excel, mapping, row classification и source traceability |
| `REGISTRY_SCHEMA.md` | Актуальная синхронизированная редакция | Domain/data model semantics, immutable snapshots и provenance |
| `MVP_PASSPORT_AND_BACKLOG.md` | Актуальная синхронизированная редакция | MVP scope и backlog; более широкий MVP не расширяет Slice 02 |
| `PROJECT_CONTEXT.md` | Актуальная синхронизированная редакция, methodology 1.1 | Принятые проектные решения и границы |
| `TECH_SPEC.md` | Актуальная синхронизированная редакция | Backend/Orchestrator, Rule Engine, версионирование и read-only источник |
| `TEST_CASES.md` | Актуальная редакция с TC-01–TC-64 | Нормативные приёмочные сценарии; numbering сохраняется |
| `UI_SPEC(1).md` | `UI_SPEC.md` v0.3; NORMATIVE UX SOURCE | UX/presentation semantics |
| `FRONTEND_SPEC_SLICE_01(1).md` | `FRONTEND_SPEC_SLICE_01.md` v0.3 | Frozen application/read-model baseline, особенно §§17.1–17.4, 20, 24–26 |
| `UI_TOKENS_v0.2.md` | UI_TOKENS v0.2 | Визуальные tokens и accessibility styling |
| `CODEX_FRONTEND_HANDOFF.md` | Handoff Slice 01 | Существующие операции, компоненты, lifecycle и implementation boundaries |

Суффикс `(1)` в физическом frontend filename не создаёт другую нормативную семантику. Здесь `UI_SPEC` и `FRONTEND_SPEC` означают указанные канонические документы v0.3. Config schema version не является methodology version или идентификатором evaluator completeness.

### 3.2. Приоритет по области

1. `SCORING_ENGINE_SPEC.md` — scoring semantics.
2. `scoring_config_v1.1.yaml` — executable configuration этих semantics.
3. `REGISTRY_MAPPING_MLH.md` — Excel/mapping semantics.
4. `REGISTRY_SCHEMA.md` — domain/data model semantics.
5. `MVP_PASSPORT_AND_BACKLOG.md` — MVP scope.
6. `UI_SPEC` / `FRONTEND_SPEC` — UX/presentation semantics; UI_TOKENS — styling.

`SLICE_02_CONTRACT_PACKAGE.md` не заменяет эти источники, не копирует всю методику и не изменяет thresholds, scales, evidence policy или mapping. Application camelCase names ниже являются проекцией существующего аналитического слоя. Transport, URL и HTTP methods не задаются этим package; существующая интеграция сохраняется.

Ключевые ссылки: scoring spec §§3, 7–8, 13, 17–23, 25–29, 33–38; schema §§18, 24–27, 30–31; TECH_SPEC §§10–11, 15–17; FRONTEND_SPEC §§17.2–17.4, 20, 24–26.

## 4. Slice 02 goal

**Full Deterministic PRE-SCORE Process Card.** Backend выполняет все десять evaluators `V1–V5`, `F1–F5` для выбранной primary AnalysisUnit и формирует один завершённый explainable PRE-SCORE snapshot. Каждый evaluator выдаёт `score ∈ {1,2,3,4,5}` или `null` по методике 1.1.

Full Rule Engine означает выполнение всех evaluators, а не обязательное наличие десяти numeric scores. `AVAILABLE` с двумя numeric и восемью `null` является успешным результатом. Frontend расширяет существующую Process Card Slice 01 и показывает backend result без вычисления scoring.

## 5. Scope / non-goals

| IN SCOPE | OUT OF SCOPE |
|---|---|
| Все 10 deterministic PRE evaluators | INTERVIEW workflow и VERIFIED workflow |
| Backward-compatible ProcessCardView extension | Fact confirmation UI и LLM extraction UI |
| `score \| null`, reason, missing inputs | Matrix, ranking, dashboard и export |
| Evidence, provenance, rule ID, applied-rule trace | Process matching |
| Отображение risks/conflicts/blockers отдельно от DQ | Workforce/FTE и staffing optimization |
| VALUE / FEASIBILITY aggregates и backend counts | Новая upload architecture и новые основные экраны |
| Snapshot compatibility, version provenance | Новый REST API |
| Existing lifecycle и backend-authorized retry | Новая scoring methodology, criteria или scales |
| Explainability, drawer, accessibility | Slice 01 redesign и Excel modifications |
| Slice 01 regression | Новые confirmation/interview commands |

Поддержка существующего stage enum не является implementation INTERVIEW/VERIFIED workflow. В завершённом Slice 02 result стадия `PRE_SCORE`; высокая полнота сама по себе не переводит результат в VERIFIED.

## 6. Architectural invariants

1. Методика остаётся `1.1`: VALUE — пять criteria по 1–5, `/25`; FEASIBILITY — пять criteria по 1–5, `/25`. Сводный `/50` не вводится.
2. Backend/Rule Engine — единственный источник formal scoring; LLM не участвует в назначении баллов.
3. PRE использует Confirmed Registry facts и допустимые Derived только из них. Подтверждение факта не отменяет stage-specific evidence eligibility.
4. `null` не равен нулю, единице, штрафу или подтверждённому отсутствию ограничения.
5. Criterion scores, aggregates, counts, reasons, evidence eligibility и classifications backend-owned.
6. Все десять criterion results и обе оси относятся к одному immutable active snapshot. Его выбирает backend; frontend не собирает результат из history.
7. Карточка и DQ существуют отдельно от technical scoring lifecycle. Неполнота business data не превращается в technical failure.
8. Missing Input, Risk, Conflict, Blocker, DQ и Technical Error различаются. Criterion не имеет mutually-exclusive состояния, объединяющего эти сущности.
9. Официальный Excel, его формулы и cached values читаются по frozen mapping; запись и пересчёт запрещены.
10. Новая application metadata не меняет идентичность Process/AnalysisUnit, domain schema semantics или frozen registry flow.

## 7. Scoring ownership

| Данные / решение | Владелец | Frontend действие |
|---|---|---|
| Criterion `score`, rules, thresholds | Rule Engine | Format/render |
| `knownSum`, `knownCount`, `unknownCount`, `coverage`, `range`, `fullScore` | Backend/Rule Engine | Render переданных полей |
| Overlap minimum F2–F5 | Rule Engine | Показ backend explanation/trace |
| Evidence eligibility и Derived validity | Backend/Rule Engine | Навигация к evidence, без inference |
| Reasons и missing inputs | Backend/Rule Engine | Показ готового текста и списка |
| Risk / Conflict / Blocker classification, status, affected criteria, confirmation | Backend | Раздельный показ |
| Data Quality severity и `canContinue` | Backend по mapping | Frozen DQ/continuation behavior |
| Active snapshot, compatibility и idempotency | Backend/Orchestrator | Потребление выбранного snapshot |

Frontend не рассчитывает ни один из этих business outputs. Schema/payload validation из §17 не является scoring: она обнаруживает невалидную форму/ссылки и не создаёт заменяющих данных.

## 8. ProcessCardView contract delta

### 8.1. Сохраняемый Slice 01 contract

Существующие имена, типы, nullable semantics и назначение сохраняются:

| Read model | EXISTING FROM SLICE 01 |
|---|---|
| `ScoreCriterionViewModel` | `id: string`, `label: string`, `score: number \| null`, `explanation: string \| null`, `ruleId: string \| null`, `missingInputs: string[]`, `sourceReferenceIds: string[]` |
| `ScoreAxisViewModel` | `maxScore: number`, `fullScore: number \| null`, `knownSum: number`, `coverage: number`, `range: [number, number] \| null`, `criteria: ScoreCriterionViewModel[]` |
| `ProcessCardView` | `processId`, `processName`, `sourceRegistry`, `scoreProcessing`, `activeScoreSnapshot`, `sourceFacts`, `dataQualityIssues` |
| `activeScoreSnapshot` | `scoreSnapshotId: string`, `inputSnapshotId: string`, `methodologyVersion: string`, `stage: ScoreStatus`, `value`, `feasibility`; весь snapshot допускает `null` |
| `scoreProcessing` | `state: PENDING \| RUNNING \| AVAILABLE \| FAILED`; `error: {code: string, message: string, retryable: boolean} \| null` |
| `sourceRegistry`, `sourceFacts`, `dataQualityIssues` | Полные existing shapes из FRONTEND_SPEC §17.2; не расширяются для расчёта scoring на frontend |
| `SourceDetailsView` | Existing shape и `ReadSourceDetails({sourceReferenceId})` из FRONTEND_SPEC §17.3 |

Новая frontend business model не создаётся. Не вводятся дубли `criterionId`, `reasonText`, `evidenceIds` вместо существующих `id`, `explanation`, `sourceReferenceIds`. Domain `criterion_id`, `rule_id` и `source_reference_ids` проецируются backend в existing names.

### 8.2. Точный additive delta

Все перечисленные новые поля **REQUIRED для совместимого завершённого Slice 02 snapshot**. Они отсутствуют в legacy Slice 01 payload без нарушения frozen contract. Base types сохраняются; Slice 02 refinement проверяет marker и наличие delta, без backfill legacy objects.

| Путь | Точный тип / форма | Назначение |
|---|---|---|
| `activeScoreSnapshot.resultContractVersion` | Literal string `slice02.pre-score.v1` | Backend assertion: выполнены все 10 evaluators и соблюдён этот result contract |
| `activeScoreSnapshot.engineVersion` | Непустой `string` | Версия фактически исполнявшегося engine build |
| `activeScoreSnapshot.scoringConfigVersion` | Непустой `string` | Backend immutable identity версии фактически использованной configuration; требования §11 |
| `activeScoreSnapshot.conflicts` | `ScoreConcernViewModel[]` с `type=CONFLICT` | Snapshot-scoped конфликты |
| `activeScoreSnapshot.risks` | `ScoreConcernViewModel[]` с `type=RISK` | Snapshot-scoped риски |
| `activeScoreSnapshot.blockers` | `ScoreConcernViewModel[]` с `type=BLOCKER` | Snapshot-scoped blockers |
| `value.scoreSnapshotId`, `feasibility.scoreSnapshotId` | Непустой `string` | Принадлежность обеих осей active snapshot |
| `value.knownCount`, `feasibility.knownCount` | Integer `0..5` | Backend count критериев с numeric score |
| `value.unknownCount`, `feasibility.unknownCount` | Integer `0..5` | Backend count критериев с `score=null` |
| `criteria[].reasonCode` | Непустой `string` | Backend structured reason code; §9 |
| `criteria[].provenance` | `{scoreSnapshotId: string, inputFactIds: string[]}` | Принадлежность результату и ссылки на snapshot input facts |
| `criteria[].appliedRuleTrace` | Непустой `string` | Backend explanation trace выполнения evaluator |
| `criteria[].conflictIds` | `string[]` | Ссылки на snapshot conflicts |
| `criteria[].riskIds` | `string[]` | Ссылки на snapshot risks |
| `criteria[].blockerIds` | `string[]` | Ссылки на snapshot blockers |

`criteria[]` относится к каждой из двух existing axis arrays. Пустые arrays явно передаются как `[]`; отсутствие required array — invalid payload. Snapshot-level provenance наследуется из `activeScoreSnapshot` и не дублируется в каждом result целиком.

### 8.3. Frontend contract dependencies

| Категория | Поля / зависимость | Implementation rule |
|---|---|---|
| EXISTING FROM SLICE 01 | Поля §8.1, source details, операции Open/Read/Retry, upload/sheet/selection | Не менять frozen contract, names или nullable baseline |
| REQUIRED FOR SLICE 02 | Полный delta §8.2; exactly 10 results; непустые backend explanation/ruleId; snapshot-scoped concern payload §13 | Без них Slice 02 result не проходит acceptance |
| OPTIONAL PRESENTATION METADATA | `activeScoreSnapshot.calculatedAt: string` в ISO 8601; `ScoreConcernViewModel.severity: string \| null` только при нормативно определённой backend severity; existing optional source names/roles/excerpts и readable Derived trace | Отсутствие не блокирует обязательный scope; frontend не придумывает значения |

`calculatedAt` отражает existing domain timestamp, не создаёт новый clock для scoring. Полная storage metadata, включая mapping/card/rule versions, сохраняется backend по исходным нормам; вся domain metadata не переносится механически в main UI contract.

## 9. Criterion result contract

### 9.1. Завершённый result

| Поле | Обязательное значение для Slice 02 |
|---|---|
| `id` | Один из `V1,V2,V3,V4,V5,F1,F2,F3,F4,F5`; правильная ось |
| `label` | Непустая backend display label |
| `score` | Integer `1..5` или `null`; `0`, NaN, fractional и string score запрещены |
| `explanation` | Непустая backend reason для numeric и `null`; existing nullable base type не меняется для legacy |
| `ruleId` | Непустой ID исполняемого evaluator rule из конфигурации, в том числе при `null` |
| `reasonCode` | Непустой backend code; frontend не выводит его из score, inputs или evidence |
| `missingInputs` | Backend field IDs недостающих/непригодных required inputs; `[]` допустим при отсутствии missing, например при конфликте |
| `sourceReferenceIds` | Backend evidence references; `[]` допустим, если input отсутствует; synthetic evidence запрещено |
| `provenance.scoreSnapshotId` | Точно равен `activeScoreSnapshot.scoreSnapshotId` |
| `provenance.inputFactIds` | Backend IDs конкретных snapshot facts, включая входы Derived; `[]` допустим при отсутствии inputs |
| `appliedRuleTrace` | Backend trace, включая причину неприменимости правила при `null`; не трактуется frontend как исполняемый код |
| `conflictIds`, `riskIds`, `blockerIds` | Backend references в соответствующих arrays того же active snapshot; пустые списки допустимы |

`reasonCode` является непрозрачным для presentation кодом backend, а не новым mutually-exclusive criterion state. Frontend всегда показывает `explanation`, а код доступен в secondary details; незнакомый непустой reason code не требует локального классификатора. Несколько причин и независимые concerns отражаются backend в explanation/trace и links. Новая reason precedence на frontend не вводится.

Для V3 сохраняются существующие YAML reason codes: `MISSING_REQUIRED_INPUT`, `UNKNOWN_INPUT`, `UNCONFIRMED_INPUT`, `INVALID_INPUT`, `INELIGIBLE_EVIDENCE`. При влияющем conflict backend передаёт свой conflict reason и `conflictIds`; frontend не выбирает источник.

### 9.2. Исполняемые rule IDs

| Criterion | `ruleId` для methodology 1.1 |
|---|---|
| V1 | `V1_FREQUENCY_v1.1` |
| V2 | `V2_LABOR_v1.1` |
| V3 | `V3_MANUAL_WORK_v1.1` |
| V4 | `V4_REPEATABILITY_v1.1` |
| V5 | `V5_PROBLEMATICITY_v1.1` |
| F1 | `F1_DATA_AVAILABILITY_v1.1` |
| F2 | `F2_INTEGRATION_SIMPLICITY_v1.1` |
| F3 | `F3_TECHNICAL_FEASIBILITY_v1.1` |
| F4 | `F4_MVP_3_MONTHS_v1.1` |
| F5 | `F5_MEASURABILITY_v1.1` |

Это traceability mapping из YAML, а не frontend scoring table. Frontend не выбирает rule по ID. Trace для F2–F5 сохраняет backend рассмотрение применимых правил и выбранный minimum; клиент не разрешает overlap. Trace для отсутствующего input подтверждает выполнение evaluator с `null`, а не пропуск evaluator.

Numeric score сосуществует с Risk/Blocker, если это следует из backend semantics. Не влияющий на данный score conflict также не требует frontend penalty. Влияющий unresolved scoring conflict обрабатывается backend как `null` по scoring spec.

Для numeric criterion backend передаёт непустые `sourceReferenceIds` и `provenance.inputFactIds`, достаточные для объяснения применённого правила. При `null` отсутствующие scoring inputs не получают фиктивных fact/evidence references. Если причина связана с исключённым evidence, backend explanation/trace фиксируют исключение; excluded candidate не добавляется в eligible input facts ради заполнения provenance.

Evidence navigation использует existing `ReadSourceDetails`. `sourceType` и `factStatus` остаются отдельными полями. Для Derived доступны rule ID/version и input source references; backend сохраняет immutable связь с конкретными facts. Frontend не реконструирует derivation formula и не трактует LLM output как Derived.

## 10. Axis aggregate contract

| Поле каждой оси | Slice 02 contract |
|---|---|
| `scoreSnapshotId` | REQUIRED; равен ID active snapshot |
| `maxScore` | REQUIRED existing; `25` |
| `fullScore` | REQUIRED existing; integer `5..25` при полной оси, иначе `null` |
| `knownSum` | REQUIRED existing; backend сумма известных баллов; при нуле известных — `0` |
| `knownCount` | REQUIRED new; backend count numeric criteria, integer `0..5` |
| `unknownCount` | REQUIRED new; backend count null criteria, integer `0..5` |
| `coverage` | REQUIRED existing; backend fraction `0..1`, не процент и не score progress |
| `range` | REQUIRED existing; для завершённого Slice 02 непустой tuple `[min,max]`, integer bounds в `5..25`, `min≤max`; legacy nullable shape сохраняется |
| `criteria` | REQUIRED existing; VALUE ровно V1–V5, FEASIBILITY ровно F1–F5 |

Нормативные backend invariants по действующей методике: `knownCount + unknownCount = 5`; coverage соответствует count; fullScore существует только при пяти известных criteria; incomplete range учитывает known sum и допустимые `1..5` каждого неизвестного критерия; full range равен `[fullScore,fullScore]`.

Backend является первичным владельцем aggregate correctness. Перед публикацией AVAILABLE snapshot backend обязан проверить cardinality, соответствие counts фактическим criterion results, coverage, knownSum, range, fullScore, нормативную aggregation formula и snapshot integrity. Точная арифметическая согласованность aggregates с criterion scores проверяется backend/contract test suite. Frontend выполняет обязательную defensive validation уже переданных fields по закрытому набору §17.1.1; он не считает numeric/null rows и не повторяет aggregation formulas.

UI «Оценены 2 из 5» использует backend `knownCount=2`, «Без оценки 3» — backend `unknownCount=3`. Denominator `5` — фиксированная cardinality контракта оси, не число, полученное перебором criterion rows. Frontend не считает known/null rows, не выводит counts из coverage и не выводит coverage из counts.

## 11. Snapshot/provenance contract

### 11.1. Минимальный набор

| Поле | Роль |
|---|---|
| Existing `scoreSnapshotId` | ID immutable результата одного расчёта |
| Existing `inputSnapshotId` | ID immutable входов, fact versions и conflict states |
| Existing `methodologyVersion` | `1.1`; само по себе не доказывает десять выполненных evaluators |
| Existing `stage` | `PRE_SCORE` для Slice 02 |
| REQUIRED `resultContractVersion` | Exact `slice02.pre-score.v1`; compatibility marker десяти-evaluator result |
| REQUIRED `engineVersion` | Фактическая сохранённая engine version; не выводится из methodology |
| REQUIRED `scoringConfigVersion` | Сохранённая immutable config identity, однозначно разрешаемая backend в фактически использованную approved configuration |

Для `scoringConfigVersion` запрещены имя файла без version identity, config schema version вместо configuration identity и значение, назначенное frontend. Backend version identity связывается с конкретным содержимым конфигурации; существующая version registry либо content-hash identity обеспечивает эту связь. Формат application поля — непрозрачный непустой string; frontend не парсит его. Разные effective configurations не получают одну и ту же identity. Семантическое изменение конфигурации требует новой methodology version по исходной спецификации и не выполняется в Slice 02.

Дискриминатор совместимости выбран один: `resultContractVersion`. Отдельный `evaluatorSet`, `evaluatorCount`, дублирующий config hash и версии в каждом criterion не являются REQUIRED полями read model. Engine/config fields сохраняют reproducibility provenance; они не заменяют marker completeness. Backend хранит остальные существующие domain metadata без изменения schema semantics.

### 11.2. Значение marker

Backend присваивает `slice02.pre-score.v1` только новому завершённому snapshot, для которого реально выполнены все десять evaluators, сохранены их десять unique results, reasons/trace/provenance и обе оси. `null` evaluator output считается выполнением; отсутствие evaluator output — нет.

Marker и результаты фиксируются атомарно при публикации active snapshot. Adapter не добавляет marker на основании methodology `1.1`, наличия осей или количества отображаемых строк. Historical Slice 01 snapshot не меняется и не получает новый marker постфактум.

### 11.3. Legacy compatibility и backend ensure

1. Legacy snapshot без marker остаётся совместимым с frozen Slice 01 представлением в legacy контексте; поля legacy contract не заполняются синтетически.
2. При открытии карточки в Slice 02 backend проверяет пригодность активного результата для required contract. Старый V1/V2-only snapshot не удовлетворяет этому условию, даже с methodology `1.1`.
3. Backend idempotently обеспечивает новый полный evaluator run через existing `OpenProcessCard`; `PENDING/RUNNING` отражают новый required result. На время этого расчёта `activeScoreSnapshot=null`; старый immutable snapshot хранится backend как history.
4. Успех создаёт новый `scoreSnapshotId` и активирует его атомарно. Тот же input snapshot переиспользуется только backend при фактически идентичных immutable входах; frontend ничего не выбирает.
5. Legacy-only `AVAILABLE` payload, полученный consumer, ожидающим Slice 02, не проходит Slice 02 acceptance: показывается contract incompatibility из §17, без добавления восьми null и без автоматического retry. Backend устраняет incompatibility через existing ensure, не через client migration.

Idempotency identity включает process/AnalysisUnit, input snapshot, methodology, actual config/engine identity и required result contract. Одного `inputSnapshotId + methodologyVersion` недостаточно для reuse старого двух-evaluator результата. Повторное открытие текущей попытки или её failure не создаёт повторный run; retry действует по §12.

### 11.4. Защита целостности

`value.scoreSnapshotId`, `feasibility.scoreSnapshotId`, `criteria[].provenance.scoreSnapshotId` и `concerns[].scoreSnapshotId` равны одному active `scoreSnapshotId`. Входные facts/evidence/Derived provenance разрешаются backend относительно его `inputSnapshotId`, без подмены актуальными live fact values.

Поздний ответ другой карточки или предыдущего запроса не заменяет текущую карточку: сохраняется existing request relevance handling. Frontend не выбирает «самый новый» snapshot по timestamp/ID и не соединяет старые criteria с новой осью. Обновление result выполняется целой read model, без сохранения части предыдущего score payload.

## 12. Lifecycle

Сохраняется `PENDING → RUNNING → AVAILABLE` или `FAILED`.

| `scoreProcessing.state` | Обязательный contract | Frontend behavior |
|---|---|---|
| PENDING | Card/source/DQ доступны; required result ещё не готов; `activeScoreSnapshot=null`, `error=null` | Stable placeholders, status text; не создавать десять criterion outputs |
| RUNNING | Идёт backend evaluator run; `activeScoreSnapshot=null`, `error=null` | Busy status; нет numeric summaries или fabricated stage badge |
| AVAILABLE | Compatible active snapshot §11; ровно десять результатов; `error=null` | Render PRE-SCORE, в том числе partial axes и любые нормативные concerns |
| FAILED | Technical calculation failure; `activeScoreSnapshot=null`; safe `error={code,message,retryable}` | Header/source/DQ сохраняются; техническая ошибка отделена от business null |

Coverage `<100%` не является technical error и не даёт retry. `AVAILABLE` с V1/V2 numeric и остальными `null` — success, а не warning о сбое расчёта.

`RetryProcessPreScore({processId})` вызывается только после `FAILED` с backend `retryable=true`; используется existing generic retry handling. При `retryable=false` retry action отсутствует. При разрешённом повторе backend управляет attempt/history/idempotency. Автоматические повторные вычисления из-за missing facts, low coverage или contract error запрещены.

`OpenProcessCard` обеспечивает расчёт для выбранного процесса при первом открытии, не для всего registry. Повторное открытие при PENDING/RUNNING/FAILED не создаёт duplicate attempt. Постоянная кнопка «Запустить scoring» не добавляется. Card/source loading error и Source Drawer error сохраняют существующую отдельную обработку; score failure не переводит успешно обработанный registry в upload ERROR.

## 13. Risks/conflicts/blockers/DQ

### 13.1. Разделение семантики

| Сущность | Значение | Backend response / UI location |
|---|---|---|
| Missing Input | Нет пригодного required input для конкретного правила | Criterion `missingInputs` + reason; не DQ ERROR автоматически |
| Risk | Неопределённость/ограничение, в том числе requires verification | Snapshot `risks`; независимый от score indicator |
| Conflict | Противоречащие подтверждённые фактические источники | Snapshot `conflicts`; affected criterion links; backend применяет null только где conflict влияет |
| Blocker | Отдельный подтверждённый stop factor с backend status; неподтверждённый потенциальный stop factor остаётся Risk / requires verification по действующей policy | Snapshot `blockers`; confirmation/status показываются явно; не score=0 |
| Data Quality | Existing mapping/source quality issue | Card `dataQualityIssues` и existing DQ panel |
| Technical Error | Сбой выполнения, чтения карточки/источника либо отдельная ошибка payload contract | Lifecycle/card/drawer error; не missing criterion и не business concern |

Неподтверждённый потенциальный blocker не становится CONFIRMED Blocker: backend применяет действующую policy и выдаёт Risk requires verification. Наличие `SUSPECTED` в existing domain status enum не разрешает frontend самостоятельно создавать blocker. Numeric score и Blocker/Risk не являются взаимоисключающими.

### 13.2. Точный concern read model

`ScoreConcernViewModel` — presentation проекция existing Conflict/Risk/Blocker, не новая domain entity. Она используется в трёх раздельных snapshot arrays.

| Поле | Тип и обязательность |
|---|---|
| `id` | REQUIRED непустой `string`, unique внутри concern type/snapshot |
| `scoreSnapshotId` | REQUIRED `string`, равен active snapshot ID |
| `type` | REQUIRED `CONFLICT \| RISK \| BLOCKER`; соответствует содержащему array |
| `code` | REQUIRED непустой backend `string`; domain risk/blocker code либо backend conflict code |
| `description` | REQUIRED непустое backend human-readable explanation |
| `status` | REQUIRED непустой backend `string`, проекция existing entity status; не criterion score state |
| `affectedCriterionIds` | REQUIRED массив допустимых criterion IDs; `[]` означает concern уровня процесса без criterion links |
| `confirmationState` | REQUIRED `CONFIRMED \| UNCONFIRMED \| UNKNOWN \| NOT_APPLICABLE`, назначает backend; это confirmation concern, не `factStatus` evidence |
| `sourceReferenceIds` | REQUIRED `string[]`, backend evidence refs; `[]` допустим для отсутствующего evidence/verification risk |
| `severity` | OPTIONAL `string \| null`; передаётся только при нормативно определённой backend severity |

Backend определяет type, code, status, affected criteria, confirmation state, evidence и нормативную severity. Frontend отображает эти fields и связи. Arrays/links относятся к snapshot state, а не к независимо меняющемуся current concern. Criterion link разрешается в соответствующий array; при непустом `affectedCriterionIds` linked criterion входит в него. Client inference из цвета, null, score=1 или missing inputs запрещён.

DataQualityIssueViewModel не заменяется этим concern type. Source Drawer сохраняет separate `sourceType`, `factStatus`, verificationState и Derived details. Отсутствующая optional severity не заменяется выдуманным уровнем опасности.

### 13.3. F1–F5 Unknown semantics

F1 unknown access не равен `confirmed_no_access`. В unknown branch backend возвращает null/reason. Подтверждённый `confirmed_no_access` получает нормативный access component score `1`; итог F1 рассчитывает backend по действующим component/min rules, без assumptions о missing остальных inputs. Для теста итогового F1=1 остальные обязательные компоненты подаются валидными и известными.

Для F2–F5 отсутствие информации не равно подтверждённому отсутствию ограничения. Неизвестное ограничение не получает frontend penalty. Backend создаёт `RISK_REQUIRES_VERIFICATION` по policy; при недостаточности данных для однозначного правила возвращает `null`. При нескольких подтверждённых применимых правилах backend выбирает minimum. UI показывает готовые score/null, reason и risk, не воспроизводя overlap.

## 14. V3 special rule

Единственный scoring input V3 — **Confirmed `manual_work_share_percent`**, допустимый для стадии PRE. В PRE допустимым остаётся Registry evidence по нормативной stage policy; Confirmed interview percent не превращается в Registry fact.

| Состояние input | V3 result | Integration requirement |
|---|---|---|
| Missing / null | `null` | Backend reason и `missingInputs` содержат required field |
| Unknown | `null` | Не подставлять процент, score или proxy |
| Unconfirmed | `null` | Кандидат не участвует в scoring |
| LLM-extracted до confirmation | `null` | Не становится Confirmed/Derived на frontend или adapter |
| Ineligible для PRE evidence | `null` | Confirmation сама по себе не отменяет source/stage policy |
| Invalid percent | `null` | Причина invalid input; нет fallback |
| Противоречащие Confirmed percent facts | `null` до resolution | Backend conflict сохраняет источники; client не выбирает значение |
| Допустимый Confirmed Registry percent | Numeric по YAML scale | Балл вычисляет только backend; шкала не копируется в package/UI |

`paper_status`, `digitalization_level`, `machine_readability` и иные косвенные Registry facts не являются V3 scoring inputs. `manual_work_proxy` запрещён; старый V3 PRE proxy **superseded**. Mapping продолжает хранить P/Q/R как source facts, но neither evaluator nor adapter nor frontend превращает их в percent/V3 score.

В текущих 19 колонках `registry_mlh` нет фактического `manual_work_share_percent`; поэтому current pilot PRE V3=`null`. Запрещены возвращение proxy через compatibility adapter, backfill historical snapshots и сопоставление physical frontend filename `(1)` с прежней proxy semantics. V5 normative problem proxy не является V3 proxy; существующая V5 методика остаётся без изменения.

## 15. Pilot expected result

Ожидание относится к текущему валидному pilot fixture `registry_mlh` с пригодными V1/V2 inputs. Повреждённые, zero/inactive или missing source values обрабатываются по mapping/scoring spec и не исправляются UI для достижения этого fixture.

| Ось / критерии | Backend fields | UI |
|---|---|---|
| VALUE: V1,V2 numeric; V3,V4,V5 null | `knownCount=2`, `unknownCount=3`, `coverage=0.4`, `knownSum=S`, `range=[S+3,S+15]`, `fullScore=null`, `maxScore=25` | Range primary; полнота 2/5; known sum secondary |
| FEASIBILITY: F1–F5 null | `knownCount=0`, `unknownCount=5`, `coverage=0`, `knownSum=0`, `range=[5,25]`, `fullScore=null`, `maxScore=25` | Range 5–25; полнота 0/5; без score 0/25 |

`S=V1+V2` и формула range выше описывают нормативное ожидание backend test, а не frontend algorithm.

Обязательный opaque backend fixture: V1=2, V2=1; VALUE `knownSum=3`, `knownCount=2`, `unknownCount=3`, `coverage=0.4`, `range=[6,18]`, `fullScore=null`; FEASIBILITY как в таблице. Он содержит реальные десять evaluator outputs в одном compatible active snapshot. Frontend tests берут эти поля готовыми и не пересчитывают их.

## 16. Frontend presentation contract

### 16.1. Process Card information architecture

1. Header: processName, existing internal processId/source registry details.
2. Lifecycle/status: PENDING/RUNNING/AVAILABLE/FAILED отдельно от stage badge.
3. VALUE / FEASIBILITY summaries: две оси, backend range/fullScore и metadata.
4. V1–V5 group: пять backend criterion results.
5. F1–F5 group: пять backend criterion results.
6. Incomplete-data explanation: смысл range и coverage.
7. Data Quality: existing panel, отдельно от criterion missing.
8. Risks / Conflicts / Blockers: раздельные группы и criterion links.
9. Source Drawer: существующая source navigation и immutable evidence details.
10. About calculation / provenance: раскрываемые rule/trace/version/snapshot details.

Main layer criterion: backend label, numeric score либо «Нет оценки» (`—` с доступным текстовым названием), короткая backend explanation. Secondary layer: `ruleId`, evidence/confirmation, trace, methodology/config/engine identity, snapshot IDs. Technical metadata не конкурирует с основным результатом.

Criteria отображаются в порядке V1–V5 и F1–F5. Это presentation ordering уже полученных результатов, не генерация недостающих rows. Если завершённый payload невалиден, весь result не публикуется (§17).

### 16.2. Range UX

Для incomplete axis (`fullScore=null`) основной wording:

> Возможный диапазон при текущей полноте данных: 6–18 баллов из 25

Пояснение:

> Границы учитывают известные оценки и допустимые значения неизвестных критериев. Это не вероятностный прогноз.

Числа берутся из backend `range` и `maxScore`. `knownSum` показывается только с подписью «Известная сумма: 3» как secondary metadata. Coverage подписывается «Полнота данных», например 40%; «Оценены 2 из 5» и «Без оценки 3» берут backend counts.

Incomplete result не отображается как `3/25` или `0/25`. FEASIBILITY coverage 0/5 показывает диапазон 5–25, а не нулевой score. Coverage bar, если используется existing presentation primitive, обозначает полноту данных и не имеет подписи progress of score.

Для полной оси primary — backend `fullScore` из 25; range является secondary, без повторного суммирования. Frontend не рассчитывает качественный interpretation level по thresholds. Новое поле interpretation level не REQUIRED для Slice 02.

### 16.3. Explainability и accessibility

Disclosure показывает backend explanation, reasonCode, missing inputs, rule ID, appliedRuleTrace и links на concerns/evidence. Source Drawer открывается по backend sourceReferenceId, не по сконструированной Excel coordinate. Derived provenance содержит existing derivation ruleId/ruleVersion/inputSourceReferenceIds; client не рассчитывает факт.

REQUIRED: semantic buttons; keyboard navigation; visible focus; disclosure `aria-expanded` и связанный content; dialog/drawer accessible name, фокус внутри при открытии, Escape/close и возврат focus к trigger; stage/lifecycle/null/risk/error не обозначаются только цветом; контраст по UI_TOKENS; корректные disabled semantics; читаемые status updates без перехвата focus; отсутствие horizontal overflow при stacking axes. «Нет оценки» доступно assistive technologies, даже если визуально показан `—`.

Source loading/error остаётся локальным к drawer и не превращает AVAILABLE calculation в FAILED. Отсутствие source excerpt не создаёт criterion score или новый risk.

## 17. Invalid payload behavior

### 17.1. Что считается contract/data error

Если response заявляет совместимый Slice 02 AVAILABLE, но имеет одно из нарушений ниже, frontend не публикует scoring section:

- отсутствует required marker/field либо marker неизвестен/несовместим;
- не хватает criterion ID, есть duplicate ID, unknown ID или criterion в неправильной оси;
- axis/criterion/concern snapshot ID отличается от active ID;
- provenance version identity отсутствует, stage/methodology несовместимы или snapshot evidence links некорректны;
- axis payload structurally inconsistent: неправильные типы/bounds, missing count/range, inverted range, запрещённый score, неверная структура criteria, либо contradictory aggregate combination, нарушающая хотя бы один обязательный invariant §17.1.1;
- required reason/rule/trace отсутствует либо links на snapshot concerns не разрешаются;
- AVAILABLE без active snapshot, ошибка одновременно с AVAILABLE либо иная lifecycle inconsistency.

Exactly ten validation проверяет набор IDs и uniqueness, не выводит numeric/null counts. Frontend validation проверяет presence/types/allowed IDs/identity/references и обязательную согласованность уже полученных aggregate fields по §17.1.1. Проверка counts и агрегированной арифметики относительно criterion scores остаётся backend/contract suite: frontend не дублирует aggregation formulas и не считает known/null rows ради validation. Backend обязан не публиковать математически несогласованный snapshot, даже если его форма проходит schema.

### 17.1.1. REQUIRED defensive aggregate validation

Для каждой оси AVAILABLE Slice 02 result frontend MUST выполнить все проверки A–F. Это закрытый минимальный набор runtime checks переданных backend fields. Он не создаёт business values и не разрешает вторую реализацию Rule Engine.

| Check | Обязательный runtime invariant | Граница frontend validation |
|---|---|---|
| A — Cardinality | `knownCount` и `unknownCount` — integers в `0..5`; сумма двух переданных counts равна `5` | Проверять переданные counts; не выводить их из numeric/null criterion rows |
| B — Coverage consistency | Переданная `coverage` точно соответствует переданному `knownCount` по таблице ниже | Сравнивать с фиксированным допустимым сочетанием; не вычислять coverage для отображения и не заменять backend coverage |
| C — fullScore / completeness | При `knownCount<5` поле `fullScore` MUST быть `null`. При `knownCount=5` и `unknownCount=0` оно MUST быть non-null integer в `5..25` | Проверять наличие/nullability/bounds; не суммировать criteria и не назначать fullScore |
| D — range / full result | `range` MUST существовать как tuple двух integer bounds в `5..25` с `lower<=upper`. Для полной оси `range` MUST равняться `[fullScore,fullScore]` | Для incomplete axis проверять только shape/bounds/order; не вычислять ожидаемые rangeMin/rangeMax. Для полной оси сравнивать переданные endpoints с переданным fullScore |
| E — maxScore | `maxScore` MUST равняться `25` для VALUE и FEASIBILITY | Несовместимое значение — contract/data error; не менять maximum |
| F — knownSum sanity | `knownSum` MUST быть integer в `0..25` | Только shape/bounds; не суммировать criterion scores и не проверять их сумму на frontend |

Обязательные допустимые сочетания для check B:

| Backend `knownCount` | Backend `coverage` |
|---|---|
| 0 | 0 |
| 1 | 0.2 |
| 2 | 0.4 |
| 3 | 0.6 |
| 4 | 0.8 |
| 5 | 1 |

Таблица определяет equality validation уже переданных fields, а не источник coverage для UI. Frontend всегда отображает backend coverage после успешной validation; несовместимое сочетание отклоняется без замены значений.

Для incomplete axis `knownCount<5`, `fullScore=null`, и structurally valid backend range остаётся неизменным. Точное соответствие range normative aggregation formula и точное соответствие knownSum/counts criterion scores проверяются backend/contract tests, не frontend runtime. Дополнительное вычисление expected knownSum, coverage, range или fullScore из criteria запрещено. Cross-field validation не выводит evidence eligibility, risk classification или новые reason codes.

Нарушение хотя бы одного REQUIRED check A–F делает весь score result active snapshot invalid/incompatible для presentation. Frontend применяет §17.2 без client repair, padding, aggregate recomputation или synthetic values.

### 17.2. Обязательная реакция

1. Сохранять valid header/source/DQ части карточки; изолировать невалидный score payload. Если невалидна сама card envelope, применять existing card-load error.
2. Показывать отдельную безопасную ошибку представления результата: «Не удалось отобразить результат расчёта: данные результата не соответствуют контракту». Не раскрывать raw stack trace.
3. Не показывать оси/criteria из предыдущего snapshot как текущий результат и не публиковать часть десяти-evaluator payload. Обе оси входят в один atomic active snapshot: если одна ось нарушает любой REQUIRED check, весь score result этого snapshot отклоняется для presentation. Вторая ось не отображается как частично валидный результат; axis summaries, criterion groups и остальные snapshot-scoped score details не рендерятся. Доступные header/source facts/DQ сохраняются.
4. Не добавлять synthetic null, labels/reasons/rules; не пересчитывать sums/counts/coverage/ranges и не подменять evidence/provenance.
5. Не изменять backend `scoreProcessing.state` на FAILED в доменной модели: client contract error является отдельным presentation error, а не утверждением о backend calculation failure.
6. Не предлагать и не запускать scoring retry автоматически только из-за client contract/data error. Existing retry применяется исключительно к backend FAILED с retryable=true.

Legacy result не является повреждённым в legacy context, но не может быть показан как совместимый Slice 02 (§11.3). Неизвестная future resultContractVersion не понижается автоматически к этой версии.

## 18. Backend responsibilities

Backend/Rule Engine MUST:

- загрузить/валидировать existing config 1.1; completeness failure блокирует расчёт по normative policy, без default rules;
- выполнить все десять deterministic evaluators для выбранной primary AnalysisUnit;
- применять только stage-eligible evidence, сохранять input facts и Derived provenance;
- выбирать rules, применять existing F2–F5 overlap minimum и F1 component semantics;
- формировать score/null, structured reasonCode, explanation, missingInputs, ruleId и trace для каждого result;
- формировать раздельные conflicts/risks/blockers и their evidence/confirmation/affected criteria;
- рассчитывать обе оси, counts, coverage и ranges, гарантировать mathematical consistency;
- создавать immutable score snapshot и актуальные version identities;
- устанавливать compatibility marker только после реального десяти-evaluator run;
- выбирать active snapshot и атомарно собирать ProcessCardView, не смешивая snapshots;
- выполнять compatibility-aware lazy ensure, retry/idempotency и safe lifecycle errors;
- отдавать snapshot-bound source details через existing operation;
- сохранять Slice 01 registry behavior, source data, historical results и read-only Excel.

Backend не разрешает factual conflict выбором удобного источника, не импортирует unconfirmed LLM fact в PRE и не меняет методику в adapter.

## 19. Frontend responsibilities

| ALLOWED | FORBIDDEN |
|---|---|
| Format/render backend read models | Scoring formulas, thresholds и enum-to-score mappings |
| `null → Нет оценки / —` | Подстановка zero, one, penalty, synthetic null results |
| Percentage formatting existing backend fraction | Расчёт coverage, knownCount/unknownCount, knownSum |
| Range formatting existing tuple | Range/fullScore calculation или precision inference |
| Display backend labels/explanations | YAML parsing и локальная генерация scoring reason |
| Presentation ordering, disclosure и source navigation | Evidence eligibility / Derived validity inference |
| Structural contract validation §17 | Snapshot selection, history joins, client migration |
| Existing Open/Read/authorized Retry invocation | Risk/conflict/blocker/DQ classification inference |

Frontend не рассчитывает overlap, counts по criterion rows, severity из missing inputs или score status из completeness. Percentage formatting, fixed cardinality labels, sorting полученных IDs и runtime schema validation не создают business results.

## 20. Acceptance criteria

| ID | Обязательный результат |
|---|---|
| S02-AC-01 | AVAILABLE compatible result имеет ровно 10 unique IDs: V1–V5 и F1–F5 по одному, в правильных осях |
| S02-AC-02 | Frontend не рассчитывает scoring и не содержит scoring YAML/thresholds/formulas |
| S02-AC-03 | `null ≠ zero`; каждый null отображается как «Нет оценки»/доступное `—` |
| S02-AC-04 | Incomplete axis не представляется как exact X/25; primary — backend range |
| S02-AC-05 | Aggregates и known/unknown counts backend-owned; UI не выводит их из rows |
| S02-AC-06 | Каждый null имеет непустую backend explanation, reasonCode, ruleId и trace |
| S02-AC-07 | Evidence/source references и snapshot/Derived provenance доступны; отсутствие evidence не заполняется выдуманными ссылками |
| S02-AC-08 | DQ, Missing, Risk, Conflict, Blocker и Technical Error разделены; numeric score допускает независимые concerns |
| S02-AC-09 | V3 использует только eligible Confirmed percent; V3 proxy/fallback нигде не возвращаются |
| S02-AC-10 | FEASIBILITY coverage 0/5 и knownSum=0 не становятся score 0/25 |
| S02-AC-11 | AVAILABLE partial, включая 2 numeric + 8 null, — успешный результат без scoring retry |
| S02-AC-12 | Старый V1/V2-only snapshot не получает marker/восемь synthetic null и не становится Slice 02 result |
| S02-AC-13 | Active snapshot backend-selected; все results/axes/concerns принадлежат одному snapshot |
| S02-AC-14 | Slice 01 upload/sheet/selection/card flow и existing operations проходят regression |
| S02-AC-15 | Keyboard, focus, disclosure/drawer и accessible status/null/error semantics проходят проверки |
| S02-AC-16 | Technical FAILED отделён от business null; card/DQ сохранены; retry только backend-authorized |
| S02-AC-17 | Missing/duplicate/unknown/wrong-axis criterion, incompatible resultContractVersion, mixed snapshot IDs, malformed fields и contradictory aggregate combinations по §17.1.1 вызывают controlled contract/data error. Весь atomic score result отвергается для presentation; no client repair, synthetic completion или aggregate recomputation; доступные header/source facts/DQ сохраняются |
| S02-AC-18 | Source Excel remains read-only; нет write-back или formula recalculation |
| S02-AC-19 | Methodology 1.1, обе оси /25, exact required delta и immutable config/engine provenance сохранены |
| S02-AC-20 | F1 unknown не равен confirmed_no_access; F2–F5 unknown не получают автоматический penalty |

## 21. Test matrix

BE — evaluator/backend/Orchestrator tests; CT — integration/read-model contract tests; FE — fixtures/render/navigation tests. FE fixtures содержат готовые backend fields; FE tests не воспроизводят scoring formula. IDs S02-Txx принадлежат package, не меняют TEST_CASES numbering. Упоминание source TC не означает включения их out-of-scope workflow в Slice 02.

| ID / сценарий | BE validation | CT validation | FE fixture / assertion | Traceability |
|---|---|---|---|---|
| S02-T01 All results | Реальный запуск V1–V5/F1–F5, сохранено 10 outputs | Exact unique IDs и axis membership | Ровно полученные 10 rows, без генерации | TC-50, S02-AC-01 |
| S02-T02 Numeric criterion | Нормативное rule применение и boundaries | Integer 1..5, rule/reason/evidence/trace | Backend number и label/explanation показаны | TC-52 |
| S02-T03 Missing input | Null/reason/missing field, остальные evaluators продолжаются | Required null result существует | «Нет оценки», причина; не DQ error автоматически | TC-04, TC-26, TC-59 |
| S02-T04 Unknown input | Unknown не подставляется | Null и backend reason | Нет default score | TC-38, TC-60 |
| S02-T05 Unconfirmed evidence | Candidate/Inferred исключён | Reason и evidence state доступны | Нет client confirmation или score inference | TC-29, TC-61–62 |
| S02-T06 Ineligible evidence | PRE source policy, включая Confirmed interview percent; explicit negative fixture: manual_work_share_percent со статусом Derived → V3=null по existing Confirmed-only rule | Stage/input provenance и reason; Derived percent не допускается как V3 input | Показ backend null/reason; нет преобразования sourceType/factStatus или client confirmation | TC-25, TC-42, TC-64 |
| S02-T07 Conflict | Влияющий Confirmed-vs-Confirmed conflict → null; оба источника сохранены | Links/status/affected IDs согласованы | Conflict отдельно от missing/DQ | TC-44 |
| S02-T08 Risk | Unknown constraint → normative verification risk, без automatic penalty | Risk и confirmation/evidence fields | Risk сосуществует с numeric или null | TC-41, TC-47 |
| S02-T09 Blocker | Confirmed blocker сохраняется отдельно, scores не обнуляются | Blocker links/status/evidence | Numeric + Blocker, без state replacement | TC-45 (инвариант), TC-46 |
| S02-T10 V3 no proxy | P/Q/R не дают V3 score; отсутствующий percent → null | Нет manual_work_proxy inputs/trace/adapter backfill | Нет inferred percent/proxy reason | TC-42–43, TC-59–64 |
| S02-T11 VALUE 2/5 | Backend fixture V1=2,V2=1 даёт 3; counts 2/3; range [6,18] | Все поля fixture переданы | Диапазон 6–18, known sum secondary, не 3/25 | TC-31 |
| S02-T12 FEASIBILITY 0/5 | KnownSum=0, counts 0/5, coverage=0, range [5,25], fullScore=null | Все F outputs существуют как null | 5–25 и полнота 0/5, не 0/25 | S02-AC-10 |
| S02-T13 Full axis | Пять numeric; exact sum и collapsed range | Count/fullScore/range consistency backend-side | Exact returned fullScore/25 | TC-32–33 |
| S02-T14 Incomplete axis | FullScore null, normative backend range | Non-null range и count fields required | Wording о полноте и не-прогнозе | TC-31 |
| S02-T15 Backend range | Boundary arithmetic тестируется только BE | Tuple/bounds/version binding | FE render предоставленного range; не вычислять из criteria | S02-AC-04–05 |
| S02-T16 Backend counts | Backend корректно считает known/unknown и первично проверяет aggregate correctness | Missing count → invalid; typed negative fixtures T16-A/B/C из §21.1 отвергаются как contract/data error | Defensive checks переданных counts/coverage/fullScore; весь score result hidden при error, no row count/recalculation/repair; header/source/DQ retained | S02-AC-05, S02-AC-17 |
| S02-T17 AVAILABLE 2+8 | Все evaluators завершены; 2 numeric + 8 null → success | Marker/10 IDs/axes required | AVAILABLE, без error/retry по coverage | S02-AC-11 |
| S02-T18 PENDING/RUNNING | Single lazy attempt, no duplicate | Null active snapshot/error; card/DQ retained | Stable placeholders; нет synthetic 10/null/stage | FRONTEND_SPEC §17.4 |
| S02-T19 FAILED | Technical failure с safe code/message | Null snapshot, non-null error | Header/DQ retained, не score=0 | S02-AC-16 |
| S02-T20 Retry true | Авторизованный retry/idempotency/history | Backend retryable=true | Existing action вызывает RetryProcessPreScore | FRONTEND_SPEC §17.4 |
| S02-T21 Retry false | Повтор не разрешён backend | Backend retryable=false | Retry action отсутствует | FRONTEND_SPEC §17.4 |
| S02-T22 Evidence/provenance | Registry coordinate, Derived rule/version/input refs, immutable facts | Same snapshot IDs, resolvable sources | Drawer разделяет sourceType/factStatus и открывает input refs | TC-23–24, TC-52 |
| S02-T23 Old V1/V2 snapshot | Reuse отклонён; fresh 10-evaluator run; history не изменена | Methodology 1.1 без marker недостаточна | Legacy не выдан за Slice 02, нет восьми synthetic null | TC-49 (history), S02-AC-12 |
| S02-T24 Incompatible provenance | Publish смешанных identities запрещён | Missing/unknown marker либо несовместимые versions отвергнуты | Safe contract error, без выбора другого snapshot | S02-AC-13,17 |
| S02-T25 Mixed snapshots | Atomically assembled read model | Axis/criterion/concern snapshot mismatch rejected | Score section suppressed; card/DQ доступны | S02-AC-13,17 |
| S02-T26 Duplicate ID | Backend не сохраняет duplicate outputs | Duplicate из 10 ID отвергается | Не merge/replace duplicates | S02-AC-01,17 |
| S02-T27 Missing ID | Пропущенный evaluator не получает success marker | Missing ID отвергается | Не создавать null row | S02-AC-01,17 |
| S02-T28 Unknown/wrong-axis ID | Approved evaluator set only | Unknown ID либо F в VALUE отвергнут | Нет синтетической/чужой row | S02-AC-01,17 |
| S02-T29 Axis structural/cross-field aggregate error | Backend consistency gate перед AVAILABLE | Missing tuple/count, invalid types/bounds и negative fixtures T29-A/B/C/D из §21.1 → contract/data error | Весь atomic score result rejected for presentation; no synthetic repair/recalculation; safe error, header/source/DQ retained; вторая ось не показана отдельно | S02-AC-17 |
| S02-T30 F1 unknown/no access | Unknown→null; known no-access component→1, итог при valid known компонентах→1 | Два разных backend fixtures/reasons | Null и numeric 1 различаются; нет default penalty | TC-38–39 |
| S02-T31 F2–F5 overlap/unknown | Minimum подтверждённых applicable rules; unknown не штрафуется | Backend trace/risk/null доступны | Trace render, без локального minimum | TC-40–41 |
| S02-T32 Upload regression | Existing metadata/sheets/canContinue/process list | Frozen fields/operations intact | Upload→sheet→selection на /registry | TC-01, TC-07, FRONTEND_SPEC FX-01–06 |
| S02-T33 Selection/card regression | Только authorized PROCESS; internal IDs; selected sheet | No card/sheet/process mix | Old-sheet late response ignored; route по processId | TC-09–18, FX-06–12 |
| S02-T34 Read-only source | Excel bytes/formulas/caches не записываются/не пересчитываются | Источник совпадает с RegistryVersion | Нет edit/write-back controls | TC-02, TC-12–15 |
| S02-T35 Accessibility/disclosure/drawer | Источник/explanation доступны через existing read operation | Labels/links/status payload готовы | Keyboard, focus trap/return, Escape, aria-expanded, null/status text, contrast | FRONTEND_SPEC §20 |
| S02-T36 Drawer/source error | Safe source-read error, score immutable | Отделён от calculation lifecycle | Drawer error не меняет AVAILABLE; локальная обработка | FX-14–15, S02-AC-07 |
| S02-T37 Reproducibility | Same input + actual versions + contract → same result; history immutable | Config/engine identity и marker persist | About calculation показывает backend provenance | TC-48–49 |
| S02-T38 Invalid config | Completeness gate блокирует run, не default scores | Нет ложного AVAILABLE с marker | Safe technical failure, backend retry policy | TC-50–51 |

### 21.1. Explicit negative fixtures для S02-T16/S02-T29

Каждый fixture начинается с otherwise valid AVAILABLE Slice 02 read model: десять unique criterion IDs, compatible marker, один snapshot, валидная card envelope и вторая валидная ось. Изменяются только указанные backend aggregate fields одной оси. Fixtures представляют полученные backend payloads и не конструируются путём frontend scoring calculation.

| Fixture | Намеренно несовместимые переданные поля | Expected validation |
|---|---|---|
| T16-A — count cardinality | `knownCount=2`, `unknownCount=2`, корректные integer types; остальные поля valid partial fixture | Check A fails: два переданных counts не дают cardinality 5 |
| T16-B — coverage mismatch | `knownCount=2`, `unknownCount=3`, `coverage=0.6`; остальные поля valid partial fixture | Check B fails: для переданного knownCount=2 допустима только переданная coverage=0.4 |
| T16-C — fullScore missing | `knownCount=5`, `unknownCount=0`, `coverage=1`, `fullScore=null`; остальные поля structurally valid full-axis fixture | Check C fails: полная ось требует non-null fullScore |
| T29-A — maxScore mismatch | `maxScore=24`; остальные поля valid fixture | Check E fails: Slice 02 axis maximum должен быть 25 |
| T29-B — full range mismatch | `knownCount=5`, `unknownCount=0`, `coverage=1`, backend `fullScore=20`, `range=[19,20]`; остальные поля valid full-axis fixture | Check D fails: переданные endpoints не равны переданному fullScore |
| T29-C — incomplete with fullScore | `knownCount=2`, `unknownCount=3`, `coverage=0.4`, `fullScore=3`; остальные поля valid partial fixture | Check C fails: incomplete axis требует null. Дополнительно non-null значение вне fullScore bounds не принимается |
| T29-D — inverted range | `knownCount=2`, `unknownCount=3`, `coverage=0.4`, `fullScore=null`, `range=[18,6]`; остальные поля valid partial fixture | Check D fails: lower>upper при integer bounds внутри 5..25 |

Для каждого T16/T29 negative fixture CT и FE MUST подтвердить одинаковый outcome: controlled contract/data error; весь score payload active snapshot rejected for presentation, включая вторую valid ось; no synthetic values, completion, repair или aggregate recomputation; header/source facts/DQ retained; backend lifecycle не меняется frontend; scoring retry автоматически не запускается и не предлагается только из-за contract validation error.

Negative fixture T29-C MUST дополнительно проверяться с non-null `fullScore=10` — допустимым integer внутри `5..25`. Этот variant изолирует нарушение completeness/nullability от basic bounds validation.

N-01 explicit evaluator fixture входит в existing S02-T06: `manual_work_share_percent` имеет статус Derived при otherwise valid percent/source data; backend V3 MUST вернуть null с explanation/reason и required missing input, без proxy/fallback. FE получает этот null result готовым. Новые criterion semantics или workflow не вводятся. Матрица сохраняет 38 основных сценариев; negative fixtures являются cases существующих T06/T16/T29.

QA gate включает BE evaluator boundaries по существующему YAML, CT cross-layer invariants, FE fixtures и интегрированный выбранный процесс. Frontend snapshots/screenshots проверяют presentation semantics, не служат источником expected arithmetic. Fixtures не заменяют final live integration acceptance.

## 22. Slice 01 regression requirements

Сохраняются:

- `.xlsx/.xlsm` upload оригинального файла; metadata/available/default/selected sheets от backend;
- explicit selected-sheet validation; отсутствует silent fallback на другой лист;
- EMPTY/READING/VALID/WARNING/ERROR и backend `canContinue` независимо от client severity inference;
- список backend-authorized selectable PROCESS, исключение AGGREGATE/TOTAL/UNKNOWN;
- сброс предыдущих selectableProcesses/selection при смене листа, защита от late response;
- navigation по internal `processId`, отдельному от officialProcessCode и Excel row number;
- one assembled ProcessCardView, card/header/sourceFacts/DQ без snapshot;
- idempotent lazy selected-process scoring, no registry-wide run и no permanent scoring button;
- существующие null/partial/range semantics обеих осей и sourceType/factStatus distinction;
- card/DQ retention при scoring FAILED, backend-authorized retry и separate source errors;
- existing styling/UI_TOKENS, responsive layout, keyboard/focus/disabled semantics;
- read-only original workbook, cached-values policy и immutable Slice 01 history.

Compatibility-aware ensure §11 расширяет suitability check для нового result contract, сохраняя существующие operations/lifecycle. Это не redesign загрузки, карточки, mapping или scoring methodology.

## 23. Codex implementation boundaries

Рекомендуемая модель для последующей реализации и сложных contract checks: **GPT-6.1 Sol, reasoning High**. Implementation начинается только после отдельного approval и явного задания; в текущей задаче implementation не запускался.

| MUST IMPLEMENT | MUST PRESERVE | MUST NOT IMPLEMENT |
|---|---|---|
| Все 10 PRE evaluators по approved YAML/spec | Methodology 1.1 и VALUE/FEASIBILITY /25 | Scoring changes, новые criteria/scales/thresholds |
| Exact additive read-model delta §§8–13 | Frozen Slice 01 fields/operations/routes | Slice 01 redesign или параллельную frontend business model |
| Backend reasons/evidence/trace/counts/axes | Backend scoring ownership | Client-side scoring, counts/ranges/evidence inference |
| Snapshot marker, provenance и compatibility-aware ensure | Historical immutable snapshots | Legacy backfill/synthetic null/marker promotion |
| Раздельное concern/DQ presentation | SourceType/factStatus и domain classifications | Frontend classification/confirmation/conflict resolution |
| Range/coverage semantics и accessible disclosures | Existing lifecycle/authorized retry | Retry из-за low coverage/contract mismatch |
| Invalid payload behavior и CT/FE fixtures | Registry upload/selection/read-only mapping | New upload architecture, new REST API design |
| Slice 01 regression и live selected-process integration | Excel original/cached values и baseline styling | V3 proxy/fallback, Excel modifications/recalculation |
| About calculation / source navigation | Two main routes | Interview UI, VERIFIED workflow, matrix/ranking/dashboard/export/matching/FTE/workforce optimization |

Настоящий package — specification artifact. Он не содержит production code, endpoint design или команд Git/Codex. В рамках его создания существующие файлы, normative numbering и frozen baseline не изменяются.

## 24. Documentation follow-ups

### DOC-S02-01 — Existing acceptance traceability defect

**Статус:** DOCUMENTATION FOLLOW-UP REQUIRED
**Источник:** `MVP_PASSPORT_AND_BACKLOG.md` §16.1, строка `AT-04 VALUE math`
**Класс:** existing documentation traceability defect
**Влияние:** non-blocking для Slice 02 design и настоящего contract package

Текущая строка AT-04 ссылается на `TC-05 / TC-06`. В актуальном `TEST_CASES.md` они означают «Некорректный Excel» и «Нет целевого листа» и не проверяют VALUE math.

Однозначно определимое предполагаемое корректное соответствие:

| Acceptance set | Актуальные TC IDs | Проверяемый результат |
|---|---|---|
| AT-04 VALUE math | `TC-31` «Неполный VALUE» и `TC-32` «Полный VALUE» | known_sum, coverage, partial range и exact full score |

Исправление ссылки выполняется отдельным documentation follow-up. В этой задаче `MVP_PASSPORT_AND_BACKLOG.md` не меняется, TEST_CASES numbering не меняется. §21 этого package использует актуальные TC IDs непосредственно. Другие строки старой traceability table не являются основанием для расширения Slice 02 или изменения источников в этой задаче.

## 25. Approval checklist

### 25.1. Final self-check консолидации

| Проверка | Результат package self-check |
|---|---|
| Scope согласован с supplied APPROVED backend/frontend decisions | PASS: Full Deterministic PRE-SCORE Process Card; новые workflow не добавлены |
| Methodology v1.1 и 25/25 | PASS: scales/criteria/thresholds не изменены |
| V3 proxy отсутствует | PASS: eligible Confirmed percent only; explicit запрет integration fallback |
| Client-side scoring отсутствует | PASS: frontend format/render/navigation/schema validation |
| Counts backend-owned | PASS: exact knownCount/unknownCount REQUIRED; no row count calculation |
| Range backend-owned | PASS: range tuple REQUIRED; arithmetic только backend/tests |
| Snapshot safety | PASS: resultContractVersion + exact IDs + same-snapshot bindings + legacy ensure |
| Slice 01 frozen/backward compatibility | PASS: baseline names/types preserved; additive refinement и отдельное legacy handling |
| Exact required fields | PASS: §§8–13 задают names/types/nullability/links; optional отдельно |
| Scope не расширен | PASS: no interview/VERIFIED/matrix/export/matching/FTE/API redesign |
| Invalid payload behavior | PASS: REQUIRED A–F cross-field checks; contradictory typed aggregates отклоняются атомарно; no synthetic null, repair, recalc или client snapshot selection |
| Correction B-01 | IMPLEMENTED FOR RE-REVIEW: §§10, 17, AC-17 и T16/T29 согласованы; frontend defensive validation не повторяет Rule Engine; CT/FE negative fixtures заданы, runtime tests в этой document-only задаче не выполнялись |
| Documentation follow-up | PASS: AT-04 defect зарегистрирован; sources/numbering не изменены |
| Blocking integration questions | NONE: required application contract определён; approval review остаётся отдельным gate |

Self-check проверяет specification completeness и consistency с прочитанными normative sources и supplied approval decisions. Он не означает исполнения runtime tests, независимого final review или approval.

### 25.2. Независимый final review gate

- [ ] Проверить delta без нарушения frozen ProcessCardView и broader domain norms.
- [ ] Подтвердить marker semantics, immutable config/engine provenance и legacy snapshot transition.
- [ ] Проверить backend-only arithmetic/eligibility/overlap/classification и ten-result atomicity.
- [ ] Подтвердить V3 no-proxy, F1/F2–F5 Unknown semantics и pilot expected result.
- [ ] Проверить lifecycle/retry/invalid payload, REQUIRED aggregate checks A–F, atomic rejection и separate concerns/DQ/technical errors; независимо подтвердить закрытие B-01.
- [ ] Подтвердить acceptance matrix, Slice 01 regression и accessibility contract.
- [ ] Принять DOC-S02-01 как non-blocking follow-up без изменений исходных файлов.
- [ ] Выдать отдельное независимое решение по package; implementation approval не предполагается автоматически.

**SLICE 02 CONTRACT PACKAGE: READY FOR RE-REVIEW**
