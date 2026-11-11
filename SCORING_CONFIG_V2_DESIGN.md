# SCORING_CONFIG_V2_DESIGN.md

# «Навигатор эффективности»: design исполняемой конфигурации Methodology v2.0

## 1. Статус, authority и границы

| Параметр | Значение |
|---|---|
| Document version / date | 0.1 / 2026-10-22 |
| Document status | CONFIG DESIGN: READY FOR INDEPENDENT REVIEW |
| Главный нормативный источник, далее S | SCORING_ENGINE_SPEC_V2_DRAFT.md 0.4; DOCUMENT STATUS: FROZEN; freeze 2026-10-22; READY FOR CONFIG DESIGN |
| Conceptual authority, далее C | METHODOLOGY_V2_CONCEPT.md 0.3; CONCEPTUAL BASELINE FROZEN |
| Историческое задание, далее U | WORK_PROMPT_UPDATE_SCORING_V2_AFTER_NQ.md; только история интеграции |
| Цель | Однозначная структура будущего scoring_config_v2.0.yaml, без нового выбора методики |
| Созданные результаты | Только настоящий Markdown design; YAML, production-код, API/DTO, DB и activation не созданы |
| Нормативные пробелы | CONFIG_DESIGN_GAP: NONE; обоснование и границы в §20 |
| Проверка | Design self-check и трассировка; независимое review и runtime acceptance ещё не выполнены |

S имеет приоритет для scoring/config semantics. C сохраняет conceptual authority; закрытые S решения NQ не переоткрываются из-за исторических формулировок C. U не является новым заданием на редактирование S: его прежние статусы и рекомендованная модель не переопределяют текущий запрос. v1.1 используется только как provenance mappings, явно перенесённых в S §9.1; доступ к дополнительным историческим файлам для достраивания правил не требуется.

Названия полей, размещение правил и предлагаемые технические версии ниже — решения representation, не новые methodological decisions. Числа, enums, gates и последствия берутся из S. Документ не присваивает config статус FROZEN, READY FOR IMPLEMENTATION или ACTIVE. Файл S с DRAFT в историческом имени является разрешённой frozen source reference; запрет executable `_DRAFT` относится к исполняемым определениям, а не к этому имени.

## 2. Модель конфигурации и соглашения

### 2.1. Три разных слоя

1. **Config definitions**: неизменяемые в рамках версии шкалы, schemas логических inputs, gate/derivation/aggregation definitions, eligibility policies, ссылки на правила. Именно они будут представлены YAML.
2. **Assessment inputs**: конкретные versioned facts, qualified classifications, выбранные plans/paths/designs, ActorRoleBindings, AuthoritativeSources, применимые ConfirmationPolicy и evidence. Config задаёт требования к ним; не заполняет их фиктивными значениями.
3. **Derived results**: criterion scores, blockers, ranges, stages, trace, origins. Не задаются вручную в config или assessment.

Предметная квалификация уровня специалистом — подтверждаемый input с evidence rubric S, а не инструкция разработчику классифицировать свободный текст. Выбор фактического path/design, конкретные организационные полномочия и exact authority sources — данные оценки. Отсутствие этих данных даёт предусмотренную неполноту; отсутствие определения правила в config блокирует его загрузку. Эти случаи не смешиваются.

### 2.2. Типы и обязательность

| Обозначение | Представление и ограничения |
|---|---|
| object / map<K,T> | YAML mapping; ключи уникальны, неизвестные schema fields запрещены |
| list<T> / set<T> | YAML sequence; set дополнительно без повторов; порядок set не влияет на результат |
| id / ref | Непустая строка; ref разрешается в ровно одно versioned definition либо конкретный assessment record требуемого типа |
| version | Непустая точная строка; сравнение по identity, без неявного совместимого диапазона |
| enum | Только перечисленные case-sensitive значения; `Unknown` fact status отличается от `UNKNOWN` enum |
| integer / number | Конечное целое / конечное число; bool и числовой текст не являются number |
| boolean | Только true/false; отсутствие не является false |
| timestamp / date | Однозначное время с timezone / ISO date; assessment time фиксирован в контексте |
| score | integer 1..5 либо null; null — результат недостаточности, а не значение enum/score 0 |
| percentage | number [0,100], unit percent |
| O / C / N | Обязательно / условно обязательно при названной ветви / необязательное audit-поле |

Все поля из словарей ниже O, если явно не указано C или N. Поле с C не становится default, когда соответствующая ветвь активна. Пустая коллекция разрешена только там, где собственное правило доказывает достаточность такого состояния. Нулевой total не разрешается как REQUIRED coverage denominator.

Числовая граница представляется полями `lower`, `lower_inclusive`, `upper`, `upper_inclusive`; у открытого конца `upper=null` означает отсутствие верхней границы, не Unknown input. `domain` задаётся отдельно от score ranges: V1=0 имеет явную null branch и потому не является дырой numeric coverage. Числа сравниваются без округления/clamping; fixed units не конвертируются без отдельного разрешённого rule. Здесь новых conversion rules нет.

### 2.3. Единое владение definitions и references

Каждый rule из S §18 определяется ровно один раз по пути `BLOCK.rules.<full_rule_id>`. Full ID сохраняет суффикс `_v2.0`. `methodology.rule_index` содержит только ID → path → S reference, а не вторую исполняемую копию. `root_rule_ref`, `rule_refs`, `derivation_ref`, `policy_ref`, `input_ref` — ссылки. Таблицы настоящего design объясняют тот же rule, а не задают независимые варианты.

Rule definition содержит `rule_id:id`, `spec_refs:set<string>`, `kind:enum`, `input_refs:set<ref>`, `precondition_refs:set<ref>`, `definition:object`, `output:object`, `dependency_refs:set<ref>`. Kind: `GATE`, `NUMERIC_MAPPING`, `ENUM_MAPPING`, `DERIVATION`, `FILTER`, `SELECTION`, `COMPLETENESS`, `AGGREGATION`, `PREDICATE`, `POLICY`, `CONSISTENCY`, `STAGE`, `COMPATIBILITY`, `REUSE`. Набор допустимых kind — технический vocabulary representation.

`definition` допускает только типизированные операции: сравнение, exact enum lookup, AND/OR/NOT трёхзначных predicates, конечную ordered decision table, ссылки, проверки cardinality/completeness, multiply, divide для coverage, min/strict_min, max для V5 proxy, sum/count для осей и проверку множества. Произвольные скрипты, SQL, LLM prompts и eval-выражения не допускаются. У каждой decision table указаны порядок, required inputs и score/null/ineligible/exclusion outcome. Evidence qualification и input validation не заменяются искусственным score.

## 3. Proposed top-level structure и словарь блоков

Это дерево путей design, не YAML-файл и не исполняемый config:

```text
metadata
methodology
  type_catalog, context_requirements, rule_index, screening
axes
criteria
  V1, V2, V3, V4, V5, F1, F2, F3, F4, F5
  <id>: axis, root_rule_ref, inputs, rule_refs, rules
derivations
evidence_policy
confirmation_policy
applicability_policy
owner_filtering
blockers
aggregation
evidence_stages
compatibility
dependency_rules
validation_rules
```

| Блок | Назначение; обязательные поля и типы | Допустимость / S refs | Зависимости |
|---|---|---|---|
| metadata | versions: 5 version fields; source_baselines:list<object>; design_ref:id | Точные версии §4; S §§1–2,19,22 | Нет scoring dependencies |
| methodology | id:id; state:enum; type_catalog:map; context_requirements:map; rule_index:map; screening:object | id=methodology_v2; state=FUTURE_NOT_ACTIVE; §§3–9,18,19.4 | metadata; ссылки на все rule definitions |
| axes | VALUE,FEASIBILITY: objects с label:string, criterion_ids:set<id>, criterion_count:integer, maximum:integer, context_ref:ref | Ровно 5/25 каждая; §§3,15 | contexts, criteria |
| criteria | Ровно 10 objects; axis:enum; root_rule_ref:ref; inputs:map; rule_refs:set<ref>; rules:map | §9.1, §§10–14,18; dictionary §§8–13 design | Общие policies, derivations |
| derivations | rules:map<rule_id,definition> | Только определения §14 design; не unrestricted formulas; S §§9–14,18 | Eligible inputs, context, selected definitions |
| evidence_policy | statuses:set<enum>; source_types:set<enum>; fact_requirements:object; conflict_policy:object; trace_requirements:object; rules:map | S §§5–7,16,18 | confirmation, applicability, contexts |
| confirmation_policy | basis_definitions:map; policy_requirements:object; role_matrix:map; binding_requirements:object; source_requirements:object; qualification_requirements:object; lifecycle:object; rules:map | S §6, B-01/B-02 | Evidence, role/source/policy versioned inputs |
| applicability_policy | normal_branch:object; exclusion_allowlist:list<object>; invalid_states:set<enum>; rules:map | APPLIES/VALID и explicit exclusions §6; S §§5–7,10.4,12.5,13.1 | Confirmation + qualified context |
| owner_filtering | cause_requirements:object; owner_enum:set; relations:set; filtering:object; rules:map | NQ-02; S §8 | Atomic causes, propositions, hypothesis/scope |
| blockers | instance_requirements:object; shared_predicates:map; types:map; rules:map | Только пять типов и truth table §15; S §17 | Собственные evidence, owner, alternative review |
| aggregation | common_formula:object; axis_bindings:map; incompatibility_gate:ref; rules:map | Независимые /25; S §15 | Criterion results + intra-axis compatibility |
| evidence_stages | ordered_stage_rules:list; no_basis_outcome:null; rules:map | VERIFIED → INTERVIEW → PRE; S §19.1 | Полная evidence dependency closure |
| compatibility | intra_axis:map; cross_axis:object; migration:object; rules:map | S §§19.2,19.4 | Baseline/Hypothesis/Scope, versions, qualification |
| dependency_rules | graph_requirements:object; triggers:set; snapshot_requirements:object; reuse:object; rules:map | S §§6.3,19.3 | Все прямые и транзитивные dependencies |
| validation_rules | load_checks:map; assessment_checks:map; conformance_requirements:object | §19 design; S §§7,18,20,22 | Весь config, type/ref/rule index |

Названия labels не являются interpretation levels. `methodology.type_catalog` хранит общие логические типы записей, а enum конкретного mapping определяется у соответствующего rule и используется ссылкой. Структуры записей здесь — требования к оценочным данным и config schema, не физическая БД или DTO.

## 4. Metadata, версии и контексты

### 4.1. Version identities

| Поле metadata | Тип / обязательность | Предлагаемое значение будущего первого reviewed пакета |
|---|---|---|
| methodology_version | version / O | `2.0` |
| config_version | version / O | `2.0.0` |
| schema_version | version / O | `1.0.0` — первая schema этого design, не schema v1.1 |
| evidence_policy_version | version / O | `2.0.0` |
| confirmation_policy_version | version / O | `2.0.0` |
| source_baselines | list / O | S: document_version=0.4, status=FROZEN, freeze_date=2026-10-22; C: 0.3, FROZEN |
| design_ref | id / O | SCORING_CONFIG_V2_DESIGN.md:0.1 |

Предлагаемые версии не объявляют существование YAML/engine. Document version S, methodology, config, schema, evidence policy, confirmation policy и будущий contract — различные namespaces. В будущем принятом YAML эти литералы обязательны; изменение definition требует новой соответствующей version identity. Actual engine/contract version не выдумывается и не фиксируется настоящим design. Исполняемый config не может содержать unresolved version placeholder.

Source digest S: `0b8c52aca6ae3a8794c4d8cc394ead420beefe471140dc5687907c4359734787`.
Source digest C: `7b689fc3339f14a579322be931fd39befb547dbc19be0e8eea0eb40b04dee0f9`.
U digest: `714c58eae2f2864628f19c5d27d6e3c5b1d347500a64e9eba95e03e7da5321f6` (historical, не executable authority).

### 4.2. Context requirements

| Логический context | Required fields / типы | Правило |
|---|---|---|
| ProcessValueBaseline | baseline_id:id; baseline_version:version; process_id:id; primary_analysis_unit_id:id; effective_period:object; baseline_scope:object; population:object; case_unit:string; fact_snapshot_ref:ref | Один совместимый baseline всех V; S §3.1 |
| HypothesisAssessment | process_id:id; primary_analysis_unit_id:id; hypothesis_id:id; hypothesis_version:version; assessment_scope_id:id; scope_version:version; process_context_ref:ref; included/excluded actions/stages/cases:objects; expected_effect_refs:list<ref> | S §§3,9; исходный process scope и improvement scope различаются |
| Evidence context | period, population, case_unit, scope; applicability/validity qualification refs; assessment_time:timestamp | Условия предметной применимости и currentness, S §§5–6,19 |

До наличия Hypothesis + Scope FEASIBILITY assessment отсутствует. В существующем assessment недостающие обязательные детали дают null только затронутым критериям. VALUE не требует гипотезы. Scope сам по себе не создаёт AnalysisUnit, новый VALUE, эффект или FTE. Существенное изменение процесса → новый baseline; смена гипотезы не меняет VALUE автоматически. Multi-process и сложная декомпозиция не активируются этим config.

## 5. Evidence, confirmation и conflict policy

### 5.1. Fact requirements и provenance

`evidence_policy.statuses = {Confirmed, Derived, Inferred, Unknown}`. Source types: `registry`, `interview`, `document`, `system_data`, `calculated`. Fact definition содержит value/type/unit/range, status, source type/ref/version, proposition id/version/value, context refs, period/population/case unit, currentness basis, evidence refs и branch-specific confirmation/qualification refs. Для registry обязательны RegistryVersion/SourceRow/SourceCell. Derived требует rule ID/version и версии всех dependency facts; `calculated` — source type, не fact status.

Confirmed допустим только при всех gates. Derived допустим только через явно разрешённый derivation rule и eligible closure; Inferred/Unknown не дают numeric input. LLM-extraction/analyst guess остаётся candidate; выбор гипотезы не подтверждает её facts. Нет parser-эвристик для `1/24`, `1/1.5`, `#VALUE!`, «по необходимости», «маршруты», «площадь»; допустимую нормализацию предоставляет существующий parser/mapping, который здесь не меняется.

V1 и исходные quantitative inputs V2/V4/V5 принимают Confirmed; Derived используется только в явных outputs derivations этого пакета. Это не blanket-разрешение любых Derived percentages. V3 не допускает Derived вообще. FEASIBILITY structured judgments, gate/selection/completeness/owner decisions — Confirmed propositions; вычисленные group levels, validation, topology и source summaries — только явно заданные Derived. Не требуется human-confirm вычисленный балл.

### 5.2. ConfirmationPolicy и branch-specific gates — B-01

| Definition / поля | Типы, обязательность и значения |
|---|---|
| ConfirmationPolicy | policy_id:id, policy_version:version, proposition/scope applicability:object, mode:enum, allowed_basis:set<enum>, role_groups:list<set<domain_role>> C human branch, source_authority_requirements:object C source branch, distinct_actor_required:boolean C human branch |
| ActorRoleBinding | role_binding_id:id; actor_id:id; domain_role:enum; authorization_scope:object; authority_basis_ref:ref; binding_status:VERIFIED_ACTIVE/UNVERIFIED/REVOKED/INVALIDATED; valid_from:timestamp; valid_until:timestamp или явно bounded/open validity representation; verified_at:timestamp |
| AuthoritativeSource | source_id:id; source_type:string; authority_domain:object; issuer:string/ref; version:version; effective_period:object; status:CURRENT/SUPERSEDED/WITHDRAWN/UNKNOWN; scope_of_authority:object; source_ref:ref |
| ConfirmationRecord | confirmation_id:id; proposition id/version/value; confirmation_basis:enum; policy id/version; decision:enum; timestamp; evidence refs; context; batch_id N; actor/binding refs C human; authoritative source/version + authority/domain/scope + exact attestation refs C source |
| EvidenceQualificationRecord | record id/version; proposition/evidence/context refs; applicability:APPLIES/CONFIRMED_NOT_APPLICABLE/UNKNOWN; validity:VALID_FOR_CONTEXT/REVALIDATION_REQUIRED/INVALID_FOR_CONTEXT/UNKNOWN; period/population/case_unit/scope; evidence; qualifier; timestamp; competent authority/policy refs C subject interpretation |

Policy modes и allowed basis должны согласовываться:

| Mode | Basis и условия |
|---|---|
| ANY_OF_ROLE_GROUP | HUMAN_CONFIRMATION; хотя бы одна допустимая роль соответствующей группы |
| ALL_OF_ROLE_GROUPS | HUMAN_CONFIRMATION; все mandatory groups по отдельным propositions |
| AUTHORITATIVE_SOURCE_OR_ROLE | HUMAN_CONFIRMATION **или** AUTHORITATIVE_SOURCE_ATTESTATION по выполненной выбранной ветви |
| SOURCE_ATTESTATION | Только AUTHORITATIVE_SOURCE_ATTESTATION |

HUMAN_CONFIRMATION = capability CONFIRM + binding с предметными полномочиями и verified authority basis, действующий в confirmation time, + scope match + policy satisfaction. Сохраняются capabilities VIEW/PROPOSE/CONFIRM/RESOLVE_CONFLICT/MANAGE_ROLE_BINDINGS. Admin не доказывает компетенцию; self-declared role UNVERIFIED ineligible. При distinct_actor_required=false один actor удовлетворяет несколько групп только отдельными verified bindings. При true требуется различие actors согласно policy. Значение flag задаётся явно; независимое co-signing не вводится автоматически. Temporary delegation не шире исходного authority, имеет basis/scope/период.

AUTHORITATIVE_SOURCE_ATTESTATION = admissible source + достаточные authority/domain + current/effective source version для содержания и периода + source scope match + exact proposition extraction/attestation + policy satisfaction. Нет общего обязательного human binding поверх этой ветви. Участник технического переноса может быть audit actor N; загрузка документа и LLM extraction не attestation.

Содержание source и квалификация применимости независимы. Если квалификация требует предметной интерпретации, competent qualifier проходит human capability/binding/scope/policy gates для этой операции. Это не повторное подтверждение содержания source.

Concrete policy records обязательны как versioned assessment authority inputs; config проверяет их schema, mode/basis и соответствие предметной матрице ниже. Он не назначает реальным людям роли и не выбирает mode за организацию. Создание YAML не требует выдумать акторов, sources или установить универсальную confirmation basis. Отсутствующая применимая policy запрещает confirmation eligibility, а не отключает gate. Свободная policy не может расширить матрицу компетенций или разрешить LLM confirmation.

### 5.3. Предметные role requirements (S §6)

| Proposition family | Допустимая компетенция; не заменяет другие части |
|---|---|
| Business meaning/requirements/scope/business criticality | process_owner; executor при предметной необходимости, отражённой в policy |
| Data existence/coverage/availability/quality | data_owner, system_owner |
| Integration/interface/system facts | system_owner, IT, technical_expert |
| Technical maturity/validation | technical_expert, IT |
| Information security / personal data | information_security в пределах компетенции; legal part отдельно |
| Legal/regulatory/mandatory rules | legal_expert, regulatory_owner |
| External authority requirement | Authoritative document по source gates либо external_authority_representative |
| KPI meaning / expected effect | process_owner |
| Measurement design/comparability/attribution | analyst в пределах собственной компетенции |
| Measurement baseline/source availability | data_owner, system_owner |

`other` не даёт универсальных полномочий. Сложные business/technical/legal утверждения decomposed; один record роли не заменяет все части. Absence F1 требует business meaning и профильное evidence отсутствия специальной data dependency/достаточности контекста; F2/F3 — business scope и профильное отсутствие системного взаимодействия / technical component и uncertainty. Количество подписантов само по себе не фиксируется. Критичность — business proposition, техническая viability — другая proposition.

### 5.4. Lifecycle, invalidation, conflicts, trace

Confirmation lifecycle: PROPOSED → PENDING_CONFIRMATION → CONFIRMED либо REJECTED; ранее подтверждённая версия → SUPERSEDED/INVALIDATED. Редактирование proposition создаёт новую версию и новое подтверждение. Batch — оболочка с проверкой каждой proposition и допустимым частичным успехом; не коллективный bypass.

REVOKED после валидного human confirmation запрещает новые confirmations, оставляет историю audit-valid. INVALIDATED authority-at-confirmation пересматривает current eligibility всей closure. Аналогично проверяется binding qualifier. История immutable. Source currentness проверяется для применимого assessment context, не относительно произвольного времени чтения.

Conflicting eligible Confirmed propositions одного совместимого контекста → affecting criterion=null; source basis, новая дата, seniority и min не выбирают победителя. RESOLVE_CONFLICT требует capability + domain authority + evidence. Dispositions: CONTEXT_SEPARATED, SOURCE_SUPERSEDED, PROPOSITION_REVISED, ONE_VALUE_CONFIRMED_APPLICABLE. Исходные records сохраняются. Conflict в exclusion/applicability запрещает exclusion. Несколько причин null сохраняются одновременно без искусственного приоритета основного reason.

Trace каждого результата: context/version; root и component rule IDs; branch; fact/evidence/confirmation/qualification versions и basis-specific refs; included/excluded propositions с причинами; owner и residual; component mappings; **все** значения minimum и ties; missing/invalid/conflict reasons; concerns/blockers; selected definitions. Отсутствующий input не имеет synthetic evidence. Diagnostic labels S §7 сохраняются как внутренние обозначения, не внешний contract: MISSING_REQUIRED_INPUT, UNKNOWN_INPUT, UNCONFIRMED_INPUT, INVALID_INPUT, INELIGIBLE_EVIDENCE, INSUFFICIENT_EVIDENCE, CONTEXT_UNDEFINED, CONTEXT_MISMATCH, UNRESOLVED_SCORING_CONFLICT. Все применимые причины сохраняются без неутверждённого приоритета.

## 6. Applicability и B-02

| Branch | Обязательные gates | Outcome |
|---|---|---|
| Normal input | Допустимая confirmation basis/policy; sufficient eligible evidence; no affecting conflict; APPLIES + VALID_FOR_CONTEXT | Input может участвовать в собственном mapping |
| Explicit exclusion | Те же truth/evidence gates; CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT; rule-level allowlist | Исключается только названный item, без numeric score |
| UNKNOWN applicability либо validity UNKNOWN/REVALIDATION_REQUIRED/INVALID_FOR_CONTEXT | Ни ordinary ни exclusion branch не проходит | Mandatory affected input/criterion null |

Закрытый allowlist applicability exclusions:

- F1 readiness dimension, rule DERIVE_F1_READINESS_v2.0, S §10.4.
- F3 comparability dimension, rule F3_COMPARABILITY_v2.0, S §12.5.
- F4 core/additional domain, rule F4_DOMAIN_REVIEW_v2.0, S §13.1.

Иные исключения имеют собственные **selection/criticality** правила, а не общий N/A shortcut: F2/F3 доказанный OPTIONAL; unselected alternatives; F5 SECONDARY_CONTEXT/supporting nonmandatory. Gate CONFIRMED_NOT_REQUIRED F1–F3 — Confirmed proposition об отсутствии зависимости, применимая к текущему scope; её не нужно маркировать NOT_APPLICABLE. Нельзя исключить весь criterion, изменить /25 или получить 5 из пустого filtered set. F1 все dimensions excluded → null/уточнение достаточности; F3 exclusion не присваивает maturity/validation; F4 требует собственного полного review.

## 7. AtomicRootCause, owner filtering и общий порядок

Логическая запись AtomicRootCause: root_cause_id:id; cause_statement:string; atomicity_status:ATOMIC/COMPOUND_REQUIRES_DECOMPOSITION/PARTIALLY_DECOMPOSED/UNKNOWN; fact_status; primary_scoring_owner:F1/F2/F3/F4/F5/PROJECT_READINESS/UNKNOWN; candidate_scoring_owners:set; hypothesis/scope context; source/evidence/confirmation refs; affected_propositions:list<{proposition_ref,relation}>. Relation: PRIMARY_SCORING_EFFECT / LINKED_CONSEQUENCE / CONTEXT_ONLY. Для partial decomposition нужны refs подтверждённых atomic pieces и unresolved residual; это логические зависимости, не автоматический NLP-разбор.

Каждая подтверждённая атомарная adverse cause имеет ровно одного primary owner. Один source может доказывать независимые semantic propositions, но одна cause не размножается на несколько ограничителей. PRIMARY_SCORING_EFFECT допускается только у owner; LINKED_CONSEQUENCE и CONTEXT_ONLY видимы в trace без повторного penalty. Owner blockers совпадает с owner причины. PROJECT_READINESS (team/budget/vendor/token/account/provisioning/start readiness) не penalize F1–F5.

UNKNOWN owner сохраняет candidate owners + OWNER_CLASSIFICATION_REQUIRED risk. Только potentially affected criterion, где unresolved proposition меняет mandatory input/ветвь, получает null. Остальные вычисляются. Compound не раскладывается догадкой. Partial pieces учитываются, residual не удаляется; если residual может изменить mandatory набор, соответствующий F=null даже при уже известном score=1.

Границы owner: F1 informational resource; F2 exchange mechanism; F3 approach maturity/viability; F4 normative permission; F5 measurement. Данные только для измерения относятся к F5. Legal prohibition не становится technical failure F2/F3 либо measurement-method failure F5. API без проектного токена — Project Readiness, не no-mechanism F2. Независимые причины требуют разных causal mechanisms и evidence. Empty own set после filtering не даёт 5.

Порядок для F: context → requirement branch → applicability/criticality/owner → evidence/completeness/conflicts → explicit absence/adverse branches с их mandatory prerequisites → component mappings → strict_min → independent blockers/risks/trace. Для V: baseline + evidence/conflicts + input selection → mapping → отдельная агрегация.

`strict_min(S)`: mandatory unknown/conflict/ineligible → null; непустой полный набор scores → min; пустой набор → нет default score. Только absence F1–F3 и complete-review F4 имеют собственную положительную 5 branch. Независимые подтверждённые ограничения могут участвовать в min; несовместимые значения одной proposition — conflict, а не min. Проверки не short-circuit-ят сохранение остальных missing/conflict reasons.

## 8. VALUE definitions и Screening

Общий input descriptor каждого criterion: `fact_id:id`, `type_ref:ref`, `unit:string/enum`, `domain:object`, `allowed_statuses:set`, `source_policy_ref:ref`, `confirmation_policy_requirement_ref:ref`, `context_ref:ref`, `applicability_branch_ref:ref`, `derivation_ref:ref C Derived`, `required_when:branch ref`, `missing_outcome:null`, `conflict_outcome:null`, `provenance_requirement_ref:ref`. Все поля обязательны, кроме указанного C. Для всех V axis=VALUE, context=ProcessValueBaseline; context гипотезы не заменяет baseline. Source policy — §§5–6; выбранный source не меняет единицы или stage.

### 8.1. V1 — frequency

Root ID `V1_FREQUENCY_v2.0`; input annual_instances: Confirmed integer ≥0, instances_per_year. Rules: 1..11→1; 12..51→2; 52..249→3; 250..999→4; ≥1000→5. Zero→null + ZERO_OR_INACTIVE_PROCESS. Missing/Unknown/unconfirmed/invalid/fractional/context mismatch/conflict→null. Дробь не округляется. Derived input и эвристический parser не добавляются. Provenance — baseline fact и source coordinates/confirmation. Ссылки: S §§9.1,18.

### 8.2. V2 — annual labor

Root `V2_LABOR_v2.0`; inputs annual_instances: Confirmed number≥0, instances_per_year; hours_per_instance: Confirmed number≥0, person_hours_per_instance. Оба обязательны, finite и baseline-compatible. Fractional annual_instances допускается в V2, независимо от V1 integer restriction. Derived input annual_labor_hours:number≥0, person_hours_per_year, **только** DERIVE_ANNUAL_LABOR_HOURS_v2.0 = product двух inputs. Прямой registry total не заменяет derivation.

Ranges annual_labor_hours: [0,100)→1; [100,500)→2; [500,2000)→3; [2000,10000)→4; [10000,+∞)→5. Valid zero product→1. Missing любого operand/невалидность/несовместимость/affecting conflict→null; полный operand provenance обязателен.

Сохраняется `hours_per_instance_semantic_verification_required`, поступающий из существующего качества данных/семантической проверки, без нового числового trigger. PRE допускает допустимый numeric result с warning; VERIFIED требует подтверждения active person-hours, не waiting/calendar duration. 256 часов не threshold. Evidence closure V2 включает warning и его resolution; no double multiplication на headcount. S §§9.1,19.1.

### 8.3. V3 — manual work

Root `V3_MANUAL_WORK_v2.0`; единственный input manual_work_share_percent: **Confirmed**, finite number [0,100], percent, собственный baseline. Mapping: [0,10]→1; (10,30]→2; (30,60]→3; (60,85]→4; (85,100]→5.

Derived/Inferred/Unknown/LLM guess/unconfirmed/ineligible/invalid/missing→null, missing_facts включает manual_work_share_percent с точной причиной. Никаких manual_work_proxy, derivation refs, estimated input, paper_status/digitalization_level/machine_readability (Registry P/Q/R) как alternatives. Подтверждённый interview percent остаётся interview source, не PRE Registry. Conflicting Confirmed percentages одного baseline→null до resolution. Scoring в Deep Assessment, не Screening даже при заранее имеющемся fact. Provenance включает exact percentage proposition/version, confirmation basis, context qualification и source. S §§5,9.1–9.2.

### 8.4. V4 — repeatability

Root `V4_REPEATABILITY_v2.0`. Inputs: standard_scenario_share_percent: Confirmed finite number [0,100], percent; repeatability_level: Confirmed enum без unit. Quantitative mapping: [0,20)→1; [20,40)→2; [40,70)→3; [70,90)→4; [90,100]→5. Enum mapping: unique→1, mostly_unique→2, mixed→3, mostly_standard→4, standard→5.

Приоритет допустимого quantitative показателя; qualitative допускается, если процент определить невозможно. Нет допустимого процента/Confirmed enum→null. Eligibility недостаточного primary input не снимается выбором fallback; affecting conflict количественного и qualitative input блокирует V4, даже при приоритете quantitative. Конфликт не изобретается из сравнения строк: фиксируются затронутые несовместимые propositions, S §7. Нет новых Derived input rules. Входы характеризуют долю типовых случаев без существенного индивидуального решения; низкий V4 не запрещает гипотезу стандартизации. Deep Assessment, provenance обоих просмотренных inputs и причины selection/exclusion. S §9.1.

### 8.5. V5 — problematicity

Root `V5_PROBLEMATICITY_v2.0`. Inputs: problem_case_share_percent: Confirmed percentage; problem_proxy: Derived percentage по DERIVE_PROBLEM_PROXY_v2.0; problematicity_level: Confirmed enum. Proxy operands return_rate/error_rate/delay_rate/rework_rate/complaint_rate — Confirmed percentages [0,100] совместимого baseline; no arbitrary derived rates.

Percent mapping (для direct/proxy одинаков): [0,1]→1; (1,5]→2; (5,15]→3; (15,30]→4; (30,100]→5. Enum: practically_none→1, rare→2, periodic→3, frequent→4, systemic→5.

Selection order: eligible Confirmed total percent → eligible Derived proxy → Confirmed enum при отсутствии допустимой статистики. Proxy = max доступных eligible rates; минимум один, missing rates не нули, не сумма/union. No eligible input→null. Общая conflict policy предшествует selection: fallback не обходит affecting conflict primary fact. Provenance proxy включает все использованные eligible rates и причины невключения прочих; direct quantitative/qualitative сохраняют свои evidence. S §9.1.

### 8.6. Screening (methodology.screening)

Вызов SCREENING_TRIAGE_v2.0 использует V1/V2 rules и annual labor derivation, но не VALUE aggregation. Ordered branches:

1. V1 либо V2 не рассчитан корректно → Insufficient Data.
2. Оба корректны и V2∈{4,5} → Priority A.
3. Оба корректны, V2=3 и V1∈{4,5} → Priority B.
4. Оба корректны, предыдущие условия false → остальные процессы; техническое обозначение результата `OTHER`, без нового приоритета.

Registry read-only; только eligible PROCESS rows существующего Parser/Mapping/DQ. Все такие процессы доступны, manual shortlist разрешён независимо от category и не подтверждает facts. V3–V5 не выполняются в Screening. Signals — context, не прокси. Нет V1+V2 VALUE/25, нормирования, shortlist limits/ranking, новых warning thresholds или human decision automation. S §§9.2,21.

## 9. F1 — Data Availability & Readiness

Axis=FEASIBILITY; root `F1_DATA_AVAILABILITY_READINESS_v2.0`; context HypothesisAssessment. Input/collection descriptors наследуют §§5–7; Confirmed для gates/классификаций/selections/counting evidence, Derived только по перечисленным ниже rules. Missing обязательного input, affecting conflict, inconsistent denominator, unresolved owner/applicability/completeness→null с trace всех причин.

### 9.1. Gate, requirement groups и sourcing

| Input / logical record | Тип / значения / условная обязательность |
|---|---|
| data_requirement_status | REQUIRED / CONFIRMED_NOT_REQUIRED / UNKNOWN; O |
| required_data_requirement_groups | list; C REQUIRED, непустой полный обоснованный перечень |
| Group | id, purpose, scope/period/population, coverage_basis, total_required_units, covered_required_units, criticality, selected_sourcing_plan_ref, completeness/evidence refs |
| coverage_basis | REQUIRED_FIELDS / REQUIRED_CASES / REQUIRED_RECORDS / REQUIRED_DATASETS / OTHER_DEFINED |
| Coverage unit | id/ref, status=PRESENT/CONFIRMED_ABSENT/UNKNOWN; countable unit, weight строго 1 |
| criticality | CRITICAL / NON_CRITICAL; обе входят в coverage |
| Sourcing plan | выбранный plan и bindings PRIMARY/JOINT_REQUIRED/SUBSTITUTE_SELECTED; resulting group composition; альтернативы и review evidence |
| access | data_resource_access_level + требуемый ресурс/source owner, способ и условия получения для resulting group |
| readiness | пять dimension records каждой resulting required group, §9.3 |
| critical analysis | required/critical/unavailable cause refs, primary owner, completeness substitutes/remediation review, viable substitute evidence |

В каждой группе homogeneous basis. OTHER_DEFINED требует unit/population/counting rule. Для любого basis фиксируются requirement universe, meaning covered unit и period/bounds. Counts выражают число заданных единиц; total>0, 0≤covered≤total и согласованность с учтёнными unit statuses обязательны; score-relevant UNKNOWN unit делает group coverage null. Нельзя удалить UNKNOWN units из denominator. Alternative groups не объединяются в pooled basis; JOINT_REQUIRED обеспечивает совместно одну потребность.

F1_REQUIREMENT_GATE_v2.0: UNKNOWN/missing/unconfirmed→null; REQUIRED→own components; доказанный CONFIRMED_NOT_REQUIRED через F1_CONFIRMED_NOT_REQUIRED_v2.0→5. Absence требует доказательства отсутствия специальной/дополнительной data dependency и достаточности доступного контекста. Отсутствие новых данных/пустой список недостаточны. F1_SOURCING_PLAN_v2.0 фиксирует выбранный resulting group, не best alternative; unselected остаются для trace/review. Существенное изменение requirements meaning→hypothesis/scope version, plan change→new assessment snapshot/recalculation. S §§10.1–10.2.

### 9.2. Coverage и access

F1_REQUIREMENT_GROUP_COVERAGE_v2.0: group percentage=100×covered/total; overall required_data_coverage_percent=strict_min(полных group percentages). Это min percentages до mapping, не среднее/weighted pooled. Invalid counts/total=0/missing completeness→null. F1_COVERAGE_v2.0: [0,20)→1; [20,40)→2; [40,70)→3; [70,90)→4; [90,100]→5. 0% — известный adverse fact.

F1_RESOURCE_ACCESS_v2.0:

| Enum | Score |
|---|---:|
| ROUTINELY_AVAILABLE | 5 |
| AVAILABLE_WITH_STANDARD_RETRIEVAL | 4 |
| MATERIALLY_CONSTRAINED_ACCESS | 3 |
| EXCEPTIONAL_OR_LIMITED_ACCESS | 2 |
| CONFIRMED_UNAVAILABLE | 1 |
| UNKNOWN | null |

Each level требует положительного evidence собственного состояния, не отрицания более высокого. F1_GROUP_ACCESS_MIN_v2.0 = strict_min(access resulting required groups выбранного plan). Нет numeric time/budget penalties. Permission→F4; mechanism→F2; project account provisioning→Project Readiness. Старый partial_or_after_approval не alias. Молчание не unavailable. S §§10.2–10.3.

### 9.3. Readiness

Dimensions: STRUCTURE, QUALITY, SEMANTIC_FIT, CONSISTENCY, FRESHNESS. Каждая имеет required property, observed state, transformation/remediability, fitness scope, evidence и applicability/validity qualification. Explicit exclusion только по §6.

| Dimension enum | Score | Trace aggregate enum |
|---|---:|---|
| AS_IS_FIT | 5 | READY |
| MINOR_PREPARATION | 4 | MINOR_PREPARATION |
| MODERATE_PREPARATION | 3 | MODERATE_PREPARATION |
| MAJOR_PREPARATION | 2 | MAJOR_PREPARATION |
| NOT_REMEDIABLE | 1 | UNUSABLE |
| UNKNOWN | null | UNKNOWN |

DERIVE_F1_READINESS_v2.0: strict_min(applicable dimension scores)→group readiness; strict_min(group readiness)→overall score и data_readiness_level. F1_READINESS_v2.0 хранит mapping aggregate enum=5..1/null; он не позволяет вводить shortcut level поверх неизвестных dimensions. Missing/Unknown applicability/state/validity→dependent readiness null; пустой набор после exclusion→null/уточнение достаточности модели.

data_freshness_fit=FIT/PARTIALLY_FIT/NOT_FIT/UNKNOWN — evidence dimension FRESHNESS. NOT_FIT не даёт 1 автоматически: требуется квалификация подготовки/устранимости. Freshness не четвёртый top-level component. Absent data отражается coverage, не synthetic readiness=1. S §10.4.

### 9.4. Critical override и итог

Derived critical_required_data_unavailable=true только при gate REQUIRED, конкретной CRITICAL потребности, подтверждённой объективной unavailable, owner F1 и полном review substitutes/remediation с отсутствием пригодной замены. Unknown review не отрицательный ответ, legal-only prohibition не F1 cause. Rule F1_CRITICAL_DATA_OVERRIDE_v2.0.

Ordered root branches: affecting conflict→null; eligible absence→5; REQUIRED с хотя бы одним unknown coverage/access/readiness→null; при всех трёх известных и доказанном critical predicate→1; при всех известных и достаточном critical analysis без predicate→F1_COMPONENT_MIN_v2.0=min трёх; unknown criticality/critical unavailable/substitute, способные изменить результат→null. Override не обходит mandatory Unknown. Blocker оценивается отдельно, может быть CONFIRMED при F1=null. S §10.5.

## 10. F2 — Integration Complexity

Axis FEASIBILITY; root `F2_INTEGRATION_COMPLEXITY_v2.0`. Confirmed inputs: requirement gate, requirements/criticality/selection/mechanism/service/viability, component qualifications и driver evidence; Derived path/interactions/topology только по собственным rules. Все требуют HypothesisAssessment, owner-local evidence и provenance; общие missing/conflict policy §§5–7 обязательны.

### 10.1. Inputs, paths и gates

integration_requirement_status=REQUIRED/CONFIRMED_NOT_REQUIRED/UNKNOWN. F2_REQUIREMENT_GATE_v2.0; absence evidence→F2_CONFIRMED_NOT_REQUIRED_v2.0→5, unknown→null. REQUIRED требует complete required_integrations и selected architecture/topology; пустота не absence.

IntegrationRequirement: interaction_id, source_system, target_system, purpose, criticality=CRITICAL/MATERIAL/OPTIONAL, context/evidence. IntegrationPath: id, interaction ref, role PRIMARY_PATH/ALTERNATIVE_FULL_PATH/DEGRADED_PATH, selected binding, service FULL/DEGRADED/UNKNOWN, technical_mechanism_status AVAILABLE/CONFIRMED_UNAVAILABLE/UNKNOWN, viability proposition, component qualifications, degradation cause/owner/evidence. Viability представляется qualified predicate TRUE/FALSE/UNKNOWN; TRUE соответствует VIABLE S §11.3, FALSE — положительно доказанная nonviability, не missing evidence. Это представление логики, не новая numeric шкала.

Included CRITICAL/MATERIAL: ровно один effective selected path, включая явно defined JOINT_REQUIRED combination либо decomposed interactions. Ноль→TECHNICAL_PATH_NOT_SELECTED/null; >1→MULTIPLE_TECHNICAL_PATHS_SELECTED/null. Не считать combination несколькими selected paths. OPTIONAL исключается только при подтверждённой criticality. Unknown criticality, влияющая на набор,→null. Unselected alternatives не входят в min; technical_fallback_available — summary complete review, не подмена списка. Доказанная critical no-path branch не требует фиктивного selected path. S §11.1.

### 10.2. Exact component mappings

| Rule ID без _v2.0 / input | Enum → score (UNKNOWN→null в каждом) |
|---|---|
| F2_INTERFACE / interface_standardization_level | STANDARD_DOCUMENTED→5; CUSTOM_DOCUMENTED→4; LEGACY_DOCUMENTED→3; LEGACY_OR_UNDOCUMENTED→2 |
| F2_FORMAT / format_compatibility_level | COMPATIBLE→5; MINOR_TRANSFORMATION→4; MATERIAL_TRANSFORMATION→3; MAJOR_TRANSFORMATION→2; INCOMPATIBLE→1 |
| F2_ADAPTER / adapter_complexity_level | NONE→5; CONFIGURATION_ONLY→4; CUSTOM_STANDARD_PATTERN→3; CUSTOM_COMPLEX→2; NO_VIABLE_ADAPTER→1 |
| F2_RELIABILITY / exchange_reliability_level | PROVEN_FOR_REQUIRED_MODE→5; PROVEN_WITH_MINOR_LIMITATIONS→4; PROVEN_WITH_MATERIAL_LIMITATIONS→3; UNPROVEN_BUT_TECHNICALLY_PLAUSIBLE→2; CONFIRMED_INADEQUATE→1 |

Interface не имеет score=1. NONE adapter — доказанная ненужность в существующем пути. Каждый qualified enum — отдельный положительно подтверждённый input, не LLM classification. F2_PATH_MIN_v2.0=strict_min четырёх mandatory components. S §11.2.

### 10.3. Path decisions и topology

- FULL + VIABLE и все components известны → path min; выбранный ALTERNATIVE_FULL_PATH без бонуса.
- MATERIAL + selected DEGRADED + VIABLE + degradation owner F2 → F2_MATERIAL_DEGRADED_PATH_v2.0=min(path min,2); missing component→null.
- То же с foreign owner → без F2 cap; own components всё ещё обязательны. UNKNOWN owner с влиянием на cap→null.
- MATERIAL с доказанным отсутствием viable FULL/DEGRADED→null/INCONSISTENT_INTERACTION_CRITICALITY.
- CRITICAL с одним materially degraded путём не выполнен; нужен FULL alternatives review. Нет viable FULL/substitute по complete F2-owned review → F2_CRITICAL_NO_MECHANISM_v2.0=1. Не нужны fictional interface properties отсутствующего пути.
- Unknown mechanism/service/viability/review→null. Противоречие viability и того же обязательного технического свойства→null/INCONSISTENT_PATH_STATE. Mechanism exists, permission/token pending не означает no mechanism.

DERIVE_F2_TOPOLOGY_v2.0 и F2_TOPOLOGY_v2.0:

| Проверка по selected architecture, сверху вниз | Enum / score |
|---|---|
| Положительно доказана неуправляемость координации текущего scope | UNMANAGEABLE_IN_CURRENT_SCOPE / 1 |
| Доказан complex driver: transactional consistency, cross-failure coordination, central orchestration либо cycle; viability подтверждена | COMPLEX_ORCHESTRATION / 2 |
| Ограниченный coordination driver и отсутствие complex driver доказаны | COORDINATED_MULTI_SYSTEM / 3 |
| Несколько независимых interactions, coordination drivers отсутствуют по evidence | LIMITED_MULTI_SYSTEM / 4 |
| Одно независимое interaction без coordination | SIMPLE / 5 |
| Существенный driver/viability неизвестен | UNKNOWN / null |

Число систем/интеграций не surrogate score; независимые interactions используются как structural rubric S, без numeric thresholds. F2_INTERACTIONS_MIN_v2.0=strict_min(all included interaction scores, topology score); unknown любого mandatory сохраняет F2=null даже при другом=1. Blocker отдельно; unmanageable topology не automatic blocker. S §§11.3–11.4.

## 11. F3 — Technical Solution Maturity

Axis FEASIBILITY; root `F3_TECHNICAL_SOLUTION_MATURITY_v2.0`; контекст HypothesisAssessment. Inputs Confirmed: requirement/scope/capability criticality/completeness, selected components/bindings, maturity qualification, tests/remediation/uncertainty evidence; Derived validation/requirement levels по своим rules. Нет оценки команды.

### 11.1. Required model и exact scales

Gate technical_solution_requirement_status=REQUIRED/CONFIRMED_NOT_REQUIRED/UNKNOWN. Eligible absence **technical component и technical uncertainty**→F3_CONFIRMED_NOT_REQUIRED_v2.0=5. UNKNOWN→null. REQUIRED требует solution_approach_defined=true и technical_success_criteria_defined=true, полноту required capabilities/components; false/missing не nonviability.

required_technical_capabilities[]: capability_id, purpose, success_condition, criticality CRITICAL/MATERIAL/OPTIONAL, hypothesis_version, assessment_scope_id, completeness COMPLETE/INCOMPLETE/UNKNOWN и evidence. technical_components[]: component_id, purpose, criticality, maturity, target validation, validation requirement, required bindings. Bindings: PRIMARY/JOINT_REQUIRED/SUPPORTING/ALTERNATIVE_NOT_SELECTED. Все CRITICAL/MATERIAL capabilities покрыты выбранным component/combination. SUPPORTING включается, если обязательность доказана. OPTIONAL подтверждённо исключён. Uncovered capability, unknown additional mandatory capability, incomplete/empty required set→null.

Approach=true требует capabilities, selected components/bindings, main technical interaction logic. Success criteria=true требует для каждой included capability criterion_id, capability_id, tested proposition, target condition, acceptance condition, test method. Общий true без перечня ineligible. F3_CAPABILITY_COMPLETENESS_v2.0, F3_REQUIREMENT_GATE_v2.0; S §§12.1,12.4.

| Rule ID без _v2.0 / input | Exact enum → score; UNKNOWN→null |
|---|---|
| F3_PATTERN_MATURITY / solution_pattern_maturity | STANDARD_PROVEN→5; PROVEN_IN_COMPARABLE_CONTEXT→4; ESTABLISHED_REQUIRING_MATERIAL_ADAPTATION→3; EXPERIMENTAL_BUT_TECHNICALLY_GROUNDED→2; RESEARCH_GRADE_OR_NO_ESTABLISHED_METHOD→1 |
| F3_TARGET_VALIDATION / target_condition_validation_level | VALIDATED_IN_TARGET_CONTEXT→5; VALIDATED_IN_COMPARABLE_CONTEXT→4; PARTIALLY_VALIDATED→3; NOT_VALIDATED_BUT_TESTABLE→2; CONFIRMED_NOT_VIABLE→1 |
| F3_VALIDATION_REQUIREMENT / validation_requirement_level | NONE→5; CONFIRMATORY_TEST→4; BOUNDED_POC→3; CRITICAL_POC→2; R_AND_D→1 |

Maturity каждого уровня имеет positive evidence S §12.5: стандартный доказанный; доказанный comparable; established с определённой material adaptation; grounded experimental; подтверждённый research/no established method соответственно. Неподтверждение 5 не выбирает 4/3/2/1.

### 11.2. Comparability

F3_COMPARABILITY_v2.0 dimensions: FUNCTIONAL_TASK, INPUT_CHARACTERISTICS, SCALE_AND_LOAD, QUALITY_OR_ACCURACY_REQUIREMENTS, RUNTIME_ENVIRONMENT, INTEGRATION_DEPENDENCIES, RELIABILITY_AND_AVAILABILITY_REQUIREMENTS, TECHNICAL_SECURITY_CONSTRAINTS. State: MATCH/MATERIAL_DIFFERENCE_ADDRESSED/MATERIAL_DIFFERENCE_UNRESOLVED/UNKNOWN/CONFIRMED_NOT_APPLICABLE. Explicit qualified exclusion по §6; remaining applicable dimensions должны быть MATCH либо ADDRESSED с evidence устранения различия. Unresolved difference не comparable; UNKNOWN/invalid qualification не даёт положительный comparable результат. Сами comparability/exclusion не присваивают numeric maturity/validation; нужен собственный positive evidence level. S §12.5.

### 11.3. Validation derivation и remediation

Каждый mandatory success criterion имеет состояние TARGET_PASSED / COMPARABLE_PASSED / NOT_YET_VALIDATED_BUT_TESTABLE / CONFIRMED_FAILED / UNKNOWN, с exact conditions/test/analysis/evidence. DERIVE_F3_TARGET_VALIDATION_v2.0:

| Обязательное evidence state | Output |
|---|---|
| Conclusive own F3 mandatory failure и strengthened evidence ниже | CONFIRMED_NOT_VIABLE / 1; независимый conclusive failure сохраняется при других unknown tests |
| Все TARGET_PASSED | VALIDATED_IN_TARGET_CONTEXT / 5 |
| Все target/comparable passed, минимум один comparable и comparability доказана | VALIDATED_IN_COMPARABLE_CONTEXT / 4 |
| Passed + testable, есть оба вида, нет failure/unknown | PARTIALLY_VALIDATED / 3 |
| Все testable, bounded methods определены, ни одного passed | NOT_VALIDATED_BUT_TESTABLE / 2 |
| Mandatory unknown, не conclusively доказанный failure либо unfinished remediation qualification | null |

Strengthened negative evidence: defined success criterion/conditions; valid test/analysis; confirmed failure; own F3 cause; bounded remediation assessment; positive confirmation, что bounded remediation не удовлетворит выбранный approach. Remediation enum: BOUNDED_REMEDIATION_AVAILABLE / NO_BOUNDED_REMEDIATION_IDENTIFIED_CONFIRMED / UNKNOWN. Available remediation не даёт confirmed nonviable до retest; unknown→null. Foreign cause — linked consequence. Одного failed test недостаточно. S §12.6.

### 11.4. Remaining uncertainty, consistency и итог

remaining_technical_uncertainties[] содержит included capability/component refs, scope, uncertainty, success criteria, evidence и qualified required validation type. DERIVE_F3_VALIDATION_REQUIREMENT_v2.0=min по weakest unresolved material uncertainty: NONE=5 при доказанном отсутствии material uncertainty; CONFIRMATORY_TEST=4; BOUNDED_POC=3; CRITICAL_POC=2; R_AND_D=1; UNKNOWN→null. Пустой unconfirmed список не NONE. Время/стоимость/команда не input квалификации.

F3_CONSISTENCY_v2.0 проверяет proposition-level contradictions→component null/INCONSISTENT_TECHNICAL_EVIDENCE_STATE; нет invented blacklist необычных enum pairs. Conclusively nonviable + NONE совместимы. F3_COMPONENT_MIN_v2.0=strict_min(maturity,validation,requirement); F3_SOLUTION_MIN_v2.0=strict_min included components. Conclusive validation failure не обходит unknown maturity/requirement/completeness. R&D/PoC/score1 не blocker; viable alternative снимает соответствующий blocker, не повышает selected approach score. S §§12.3,12.7.

## 12. F4 — Regulatory & Organizational Constraints

Axis FEASIBILITY; root `F4_REGULATORY_ORGANIZATIONAL_CONSTRAINTS_v2.0`. Контекст HypothesisAssessment. Inputs Confirmed: domain applicability/completeness/outcomes, review item dispositions, mandatory constraints/effect qualification, compliant path/preservation/approval/selection. Derived итог review/effect resolution только по собственным rules. S §13; general evidence/owner/conflict/null policy обязательна.

### 12.1. Domains и completeness

Core domains всегда представлены ровно по одной entry: LEGAL_REGULATORY; INFORMATION_SECURITY; PERSONAL_DATA; MANDATORY_HUMAN_ROLE; MANDATORY_PROCESS_RULES; EXTERNAL_PARTIES; AUTHORITY_AND_MANDATE. Старый объединённый INFOSEC_PERSONAL_DATA не заменяет две entries.

constraint_domain_review: domain_id; domain_applicability=APPLIES/CONFIRMED_NOT_APPLICABLE/UNKNOWN; domain_review_completeness=COMPLETE/INCOMPLETE/UNKNOWN; domain_review_outcome=NO_MATERIAL_CONSTRAINT/CONSTRAINTS_IDENTIFIED/UNKNOWN; reviewed scope/sources/currentness/relevant obligations/review items/evidence/qualification refs. Entry missing→null, не N/A. Legacy REVIEWED_NO_MATERIAL_CONSTRAINT выражается отдельными dimensions review, не допускается как shortcut. Exclusion требует positive scope evidence и §6. APPLIES+COMPLETE+NO_MATERIAL_CONSTRAINT — положительное основание complete review.

Review item: id, proposition/source/evidence refs, status=CANDIDATE/ADMITTED/RESOLVED/REJECTED_AS_IRRELEVANT; candidate_evidence=UNSUPPORTED/EVIDENCE_ATTACHED; disposition с rationale/evidence. Unsupported candidate сам не блокирует COMPLETE. Evidence-backed potentially relevant candidate требует disposition; RESOLVED не означает автоматически «нет constraint». Additional relevant domain: explicit name, definition, reason_not_covered, owner, source_classes и confirmed relevance; включается в completeness наравне с core. LLM только предлагает candidate.

F4_DOMAIN_REVIEW_v2.0 + F4_DOMAIN_COMPLETENESS_v2.0: unknown applicability/outcome, incomplete applicable domain, unresolved backed relevant candidate или affecting conflict→F4=null. Допустимое domain exclusion не отменяет own complete-review gate; all domains excluded не synthetic 5. Требуется доказанная достаточность общего review. S §13.1.

### 12.2. Constraints и compliant paths

Каждая constraint: id; concrete obligation/source/currentness/competence; mandatory/applicability evidence; subject/bounds; hypothesis connection; own F4 cause; resolution mode/effect; compliant path review с preservation/selection, evidence. Project budget/team/vendor/start date не constraints F4.

| Resolution mode | Effect enum | Score |
|---|---|---:|
| ACCOMMODATED_AS_IS | ACCOMMODATED_BY_CURRENT_DESIGN | 5 |
| MINOR_INTERNAL_ADAPTATION | MINOR_ADAPTATION_REQUIRED | 4 |
| MATERIAL_INTERNAL_ADAPTATION | MATERIAL_ADAPTATION_OR_SCOPE_LIMITATION | 3 |
| EXTERNAL_OR_NORMATIVE_CHANGE | EXTERNAL_OR_NORMATIVE_CHANGE_REQUIRED | 2 |
| NO_COMPLIANT_PATH | TARGET_CHANGE_PROHIBITED | 1 |
| UNKNOWN | UNKNOWN | null |

F4_CONSTRAINT_EFFECT_v2.0 хранит единственный mapping, resolution mode — exact alias к effect, не вторая шкала. 5 — соблюдено current selected design; 4 — small design adaptation; 3 — material internal adaptation/scope limitation/internal rules в имеющемся authority; 2 — positively evidenced legitimate special external/normative/mandate route; 1 — применимый запрет и proved absence preserving compliant path. Minor/material не из стоимости/сроков.

F4_COMPLIANT_PATH_v2.0: hypothesis_preservation_status=PRESERVES_ESSENTIAL_MEANING/CHANGES_HYPOTHESIS/UNKNOWN. Changes meaning не viable path исходной гипотезы; unknown affecting preservation→null. Approval kind=ROUTINE_EXISTING_PROCEDURE/SPECIAL_EXTERNAL_DECISION/NORMATIVE_CHANGE/MANDATE_CHANGE/UNKNOWN. Routine approval не penalty, pending routine action — Project Readiness. Специальное решение→2 только при положительном легитимном пути, не надежде.

NO_COMPLIANT_PATH требует complete internal и external/normative alternatives review, preserving essential meaning. Unknown route→null, не1. Несколько paths с одинаковыми effect **и context/preservation outcome** допускают effect без selection; различающиеся effect/context требуют selected path, иначе null. Не выбирать best score. Изменение scope→новая версия.

### 12.3. Итог

При incomplete review/unknown required outcome/effect/preservation/conflict→null. При complete review без material applicable constraints→F4_COMPLETE_REVIEW_NO_MATERIAL_CONSTRAINT_v2.0=5, включая только accommodated constraints. Material=applicable mandatory effect1..4. Иначе F4_CONSTRAINTS_MIN_v2.0=strict_min(all applicable constraints). Нет absence F4. Complete review — самостоятельное положительное доказательство, не превращение пустого списка в 5. Blocker отдельно и может сосуществовать с F4=null из-за другого domain. NO_VIABLE_MVP_SCOPE retired; LEGAL_INFOSEC_PDN_BLOCK не automatic migration. S §§13.2–13.3.

## 13. F5 — Measurability of Effect

Axis FEASIBILITY; root `F5_EFFECT_MEASURABILITY_v2.0`; HypothesisAssessment. Inputs Confirmed: effects/roles/completeness/selection, indicator qualifications, baseline/source/method/comparability/attribution/exposure evidence. Derived summaries строго по rules ниже. Нет absence/N/A F5. VALUE не expected effect и не input F5.

### 13.1. Effect set, measurement designs, indicator requirements

expected_effects[]: effect_id, defined outcome change, role=PRIMARY/ADDITIONAL_DECISION_MATERIAL/SECONDARY_CONTEXT, scope linkage, expected_effect_defined:boolean, evidence/confirmation. expected_effect_set_completeness=COMPLETE/INCOMPLETE/UNKNOWN. Ровно один PRIMARY, COMPLETE set и true expected_effect_defined обязательны; иначе null. True означает описанный effect, не достигнутый effect/размер.

F5_EFFECT_SET_v2.0 и F5_EFFECT_SCOPE_GATE_v2.0: formal set=PRIMARY+все ADDITIONAL_DECISION_MATERIAL. Pre-scoring definition freeze фиксирует roles/set, selected measurement design каждого formal effect, indicator-set mode/formal indicators и scope; это assessment-definition version, не freeze методики. Нельзя demote effect из-за плохого F5. SECONDARY_CONTEXT не повышает/понижает formal score.

MeasurementDesign: design_id/version, effect_ref, selected flag/binding, context, indicator_set_mode=SINGLE_SUFFICIENT/JOINT_REQUIRED, formal_indicator_refs, source refs/roles, method/baseline/comparability/attribution definitions, evidence, review alternatives. Ровно один selected design на каждый formal effect; engine не выбирает best design. SINGLE_SUFFICIENT — один sufficient formal indicator. JOINT_REQUIRED — individual specs каждого mandatory indicator. Не смешивать unselected alternative с joint required. Для каждого indicator: id, definition, unit, effect/scope/population/case_unit, baseline/source/method/comparison/attribution specs и evidence.

### 13.2. Exact mappings

Все UNKNOWN→null; каждому level нужно положительное evidence собственного состояния, не отсутствие higher level.

| Rule ID без _v2.0 / input | Enum → score |
|---|---|
| F5_INDICATOR_TYPE / indicator_evidence_type | DIRECT_QUANTITATIVE→5; VALIDATED_QUANTITATIVE_PROXY→4; LIMITED_QUANTITATIVE_PROXY→3; STRUCTURED_QUALITATIVE→2; NO_SUITABLE_MEASUREMENT_INDICATOR→1 |
| F5_SCOPE_FIT / measurement_scope_fit | DIRECT_FIT→5; FIT_WITH_MINOR_ADJUSTMENT→4; FIT_WITH_MATERIAL_ADJUSTMENT→3; PARTIAL_FIT→2; NOT_FIT→1 |
| F5_BASELINE / baseline_status | AVAILABLE_AND_COMPATIBLE→5; COLLECTABLE_BEFORE_CHANGE_CONFIRMED→5; AVAILABLE_OR_COLLECTABLE_WITH_MINOR_ALIGNMENT→4; PARTIAL_WITH_VALID_RECONSTRUCTION→3; LIMITED_PROXY_BASELINE→2; CONFIRMED_NOT_OBTAINABLE→1 |
| F5_METHOD / measurement_method_status | REPRODUCIBLE_AND_VALIDATED→5; REPRODUCIBLE_WITH_MINOR_LIMITATIONS→4; DEFINED_WITH_MATERIAL_LIMITATIONS→3; WEAKLY_REPRODUCIBLE_OR_INDIRECT→2; NO_RELIABLE_METHOD→1 |
| F5_COMPARABILITY / before_after_comparability_level | DIRECTLY_COMPARABLE→5; COMPARABLE_WITH_MINOR_ADJUSTMENT→4; COMPARABLE_WITH_MATERIAL_ADJUSTMENT→3; LIMITED_COMPARABILITY→2; NOT_COMPARABLE→1 |
| F5_ATTRIBUTION / effect_attribution_level | DIRECTLY_ATTRIBUTABLE→5; ATTRIBUTABLE_WITH_CONTROLS→4; PLAUSIBLE_WITH_MATERIAL_CONFOUNDERS→3; LIMITED_ATTRIBUTION→2; NOT_ATTRIBUTABLE→1 |

F5_INDICATOR_MIN_v2.0=strict_min(type,scope_fit); даже proved no suitable indicator + unknown fit→null, не1. Direct требует quantitative effect relation; validated proxy — validated relation+transferability; limited proxy — positive relation+material limitations; qualitative — reproducible structured design; no suitable indicator — positive review admissible indicator space. F5_PROXY_QUALIFICATION_v2.0 transferability рассматривает construct, population, process mechanism, measurement definition, operating conditions, direction, material confounders. Unknown material applicability→dependent null, не автоматическое понижение 4 до3. Scope fit связывает effect/indicator/included/excluded cases/adjustments; совпадение названия KPI недостаточно. S §14.2.

### 13.3. Baseline и exposure

COLLECTABLE_BEFORE_CHANGE_CONFIRMED требует **восемь** элементов: source, method, scope, population, period, units, responsible source owner, confirmed ability to collect before process change. Missing любого→нет допустимого 5 этой ветви; не автоматически иной level.

Exposure record: effect exposure boundary=NOT_STARTED/STARTED/UNKNOWN; start_time C STARTED. F5_BASELINE_EXPOSURE_v2.0: baseline должен предшествовать material exposure измеряемого scope. Development может начаться раньше без process exposure. Unknown affecting boundary→null. Обещание собрать baseline после exposure не pre-change baseline. PARTIAL_WITH_VALID_RECONSTRUCTION требует source window, method, assumptions, validation/reconciliation, scope/population fit, exposure boundary. LIMITED_PROXY_BASELINE требует positive proxy fitness; NOT_OBTAINABLE — positive impossibility. Нет универсальной длительности/выборки. S §14.3.

### 13.4. Required sources и method cap

Source record: source_ref/version; role=REQUIRED/SUPPORTING/ALTERNATIVE_NOT_SELECTED; status=AVAILABLE/COLLECTABLE/PARTIAL/UNAVAILABLE/UNKNOWN; source/collection method/ability/owner/scope/population/period/units/fitness evidence. SUPPORTING не снижает score, если не обязателен; mandatory source представлен REQUIRED. Alternatives не входят в aggregate. Foreign cause остаётся linked concern и не даёт synthetic favorable value своего source input.

F5_REQUIRED_SOURCES_v2.0 (после owner filtering, все mandatory statuses должны быть известны): все AVAILABLE→AVAILABLE; смесь AVAILABLE/COLLECTABLE с хотя бы одним COLLECTABLE→COLLECTABLE; минимум один PARTIAL, остальные AVAILABLE/COLLECTABLE/PARTIAL→PARTIAL; минимум один UNAVAILABLE→UNAVAILABLE. Score-relevant UNKNOWN→status/component null даже при другом UNAVAILABLE. Empty required-source set не получает AVAILABLE по vacuous all; sufficient source model требует evidence.

F5_SOURCE_LIMIT_v2.0:

| Design source status | При known eligible base method | При base method unknown |
|---|---|---|
| AVAILABLE / COLLECTABLE | base score, без cap | null |
| PARTIAL | min(base score,3) | null |
| UNAVAILABLE | 1 | null |
| UNKNOWN | null | null |

COLLECTABLE требует source, method/ability, owner и применимые scope/population/period/units/fitness; обещание не evidence. Подтверждённый UNAVAILABLE не обходит mandatory base method. S §14.4.

### 13.5. Comparability, attribution, joint/multiple aggregation

Comparability evidence: определения indicator/units/population/case unit, baseline/post-exposure windows, changed case mix, adjustments и residual fitness. No numeric cutoffs. Attribution evidence: intervention→effect + reviewed material confounders и controls. Уровни соответственно direct evidenced link; evidenced link с controls; plausible link с material confounders; limited attribution; positively proved impossibility. Unknown material confounder→attribution=null. Before/after разница сама по себе не причинность. Общепроцессный KPI требует доказательства измерения selected scope с учётом неизменённой части.

F5_JOINT_INDICATORS_v2.0: для JOINT_REQUIRED отдельно indicator/baseline/method/comparability каждого required indicator; каждый effect component=strict_min одноимённых indicator components. Attribution либо shared proven для **всего** design, либо indicator-specific со strict_min. SINGLE_SUFFICIENT использует selected indicator. F5_COMPONENT_MIN_v2.0: effect_F5=strict_min пяти обязательных components: indicator,baseline,method,comparability,attribution. F5_DECISION_MATERIAL_EFFECTS_v2.0: hypothesis_F5=strict_min всех formal effect_F5. Unknown одного не обходит known1 другого. kpi_count не input; terminal blocker design review отдельно. S §§14.5–14.6.

## 14. Derivations: закрытый каталог и зависимости

`derivations.rules` — единственное место определения перечисленных правил; criteria содержат refs. Другие summaries/min, описанные у criterion, находятся у соответствующих criterion rules, не второй раз здесь.

| Full ID без _v2.0 | Typed inputs → output | Mandatory gates и dependencies |
|---|---|---|
| DERIVE_ANNUAL_LABOR_HOURS | annual_instances:number≥0 × hours_per_instance:number≥0 → annual_labor_hours:number≥0 | Confirmed operands, finite output, compatible baseline/units; полная provenance; invalid/missing→null |
| DERIVE_PROBLEM_PROXY | set eligible percent rates → max:number[0,100] | Не менее одного; baseline/units; influencing conflict→null; missing alternatives не0 |
| DERIVE_F1_READINESS | applicable dimension enums → group scores → overall level/score | explicit exclusion qualification; полный required group set; strict_min; пустой/unknown→null |
| DERIVE_F2_TOPOLOGY | qualified selected architecture/coordination drivers → topology enum | ordered rubric §10.3; unknown material driver/viability→null |
| DERIVE_F3_TARGET_VALIDATION | mandatory success test states, comparability, cause/remediation → validation enum | complete criteria; conclusive negative exception только внутри validation component §11.3 |
| DERIVE_F3_VALIDATION_REQUIREMENT | material uncertainty classifications → requirement enum | weakest included material uncertainty; proven absence→NONE; unconfirmed empty→null |

Каждый Derived output хранит rule ID/version, context и input/evidence/confirmation/qualification versions, classification/selection/completeness/owner decisions closure. Никакого дополнительного generic «derive percentage from narrative» или V3 derivation нет. F1 group coverage, access min, critical predicate, F2 selected-path summary, F4 path-effect alias и F5 sources/effects aggregation — детерминированные вычисления соответствующих named rules с теми же Derived provenance requirements. Не вводить для них произвольные formulas/новые версии нормативных rule IDs.

## 15. Blocker configuration

### 15.1. Shared representation и трёхзначная логика

`blockers.types` — ровно пять entries из §15.2; owner и subject type фиксированы. Definition: type, subject_type, owner, rule_ref, shared_predicate_refs, additional_predicates, alternative_review_requirement_ref. Это schema definitions, не instance results.

Instance identity: type+subject_id/type+hypothesis_version+assessment_scope_id/scope_version. Runtime inputs: subject/context refs, own atomic cause refs, evidence/policy/qualification refs, predicate evidence и bounded alternative/remediation review. Ни score, ни человек не являются trigger статуса.

Shared predicates S §17.1:

1. Subject/context определены и применимы к selected hypothesis/scope.
2. Own cause принадлежит фиксированному F owner по §7.
3. Достаточные eligible/qualified/current grounds и no affecting conflicts по **каждой** предметной proposition.
4. Completeness bounded review admissible alternatives/remediation, сохраняющих текущую гипотезу/scope: границы поиска, классы/варианты, inclusion/exclusion rationale, evidence dispositions каждого и профильное confirmation полноты.
5. Положительно доказано отсутствие viable owner-local alternative.

Predicate имеет TRUE/FALSE/UNKNOWN с provenance. Проверки eligibility не создают FALSE предметного predicate: ineligible/conflicting/incomplete evidence→UNKNOWN. FALSE допустим только при eligible positive disproof необходимого условия. BLOCK_PREDICATE_LOGIC_v2.0:

| Conjunction | Blocker instance result |
|---|---|
| Все обязательные predicates TRUE | CONFIRMED |
| Есть disqualifying FALSE | CONFIRMED_ABSENT, даже если прочие UNKNOWN |
| Нет FALSE, есть UNKNOWN | UNKNOWN |

Eligible viable owner-local alternative сама достаточна для FALSE «нет альтернативы», даже при incomplete остальном review. CONFIRMED_ABSENT не означает отсутствие всех blockers. Пустой alternatives list не complete negative evidence; подтвердить нужно review space и отрицательный вывод, не «не нашли». Foreign normative prohibition не technical nonviability и не terminal method impossibility. S §§17.1–17.2.

### 15.2. Exact five types

| Type / rule ID | Subject / owner | Additional required predicates | Alternative review |
|---|---|---|---|
| CRITICAL_DATA_UNAVAILABLE / BLOCK_CRITICAL_DATA_UNAVAILABLE_v2.0 | DATA_REQUIREMENT / F1 | Данные REQUIRED и CRITICAL; positively proved F1-owned failure доступности необходимого ресурса | Complete substitute/remediation review; нет viable substitute данной потребности |
| CRITICAL_INTEGRATION_UNAVAILABLE / BLOCK_CRITICAL_INTEGRATION_UNAVAILABLE_v2.0 | INTERACTION / F2 | CRITICAL interaction; нет viable FULL path; собственная technical cause F2 | Complete FULL alternatives/substitutes; materially degraded не удовлетворяет critical requirement |
| NO_TECHNICALLY_VIABLE_APPROACH / BLOCK_NO_TECHNICALLY_VIABLE_APPROACH_v2.0 | TECHNICAL_CAPABILITY / F3 | CRITICAL capability; selected approach conclusively nonviable по §11.3 design / S §12.6 | Complete alternative-approach review; ни один viable approach не сохраняет гипотезу/scope |
| MANDATORY_CONSTRAINT_PROHIBITS_CHANGE / BLOCK_MANDATORY_CONSTRAINT_PROHIBITS_CHANGE_v2.0 | STRUCTURAL_CONSTRAINT / F4 | Applicable mandatory constraint затрагивает essential hypothesis | Complete internal+external/normative review; нет preserving compliant path |
| EFFECT_NOT_MEASURABLE / BLOCK_EFFECT_NOT_MEASURABLE_v2.0 | EXPECTED_EFFECT / F5 | Effect PRIMARY/ADDITIONAL_DECISION_MATERIAL; каждый admissible design имеет ≥1 confirmed own F5 terminal impossibility | Complete measurement-design alternatives review, не только selected design; ни одного viable design |

Для F5 terminal types (точно): NO_ADMISSIBLE_INDICATOR; NO_OBTAINABLE_BASELINE; NO_RELIABLE_MEASUREMENT_METHOD_OR_SOURCE; NO_COMPARABLE_MEASUREMENT_DESIGN; NO_MEANINGFUL_ATTRIBUTION_DESIGN. У каждого admissible design своё положительное terminal evidence; причины между designs могут отличаться. Просто низкий score/неудобный method/unknown source/unselected KPI не terminal.

### 15.3. Independence и consistency

CONFIRMED blocker допустим при criterion=1 **или null**, если own predicates достаточны; mandatory unknown другого scoring component его не отменяет. Blocker не обнуляет axis, не уменьшает максимум, не меняет range/stage автоматически. CONFIRMED blocker + score2..5 **того же subject/context** — inconsistent evidence/result state: dependency review обязателен, VERIFIED исключён до устранения противоречия; нельзя молча overwrite score/blocker. Это не load error валидной taxonomy, а validation оценки/результата.

Currentness ограничена snapshot/evidence/context versions; relevant change требует reassessment. Historical status сохраняется историческим. R&D/PoC/routine approvals/project budget-token-team и score1 сами не blockers. NO_VIABLE_MVP_SCOPE retired; NO_PROCESS_OWNER_OR_EXPERT — assessment/evidence issue. Assessment issues могут дать зависимый null, но не automatic F=1. Risks RISK_REQUIRES_VERIFICATION и OWNER_CLASSIFICATION_REQUIRED — concerns; сами не изменяют score и не выбирают null. S §§16–17.

## 16. Axes, aggregation и evidence stages

### 16.1. Axes и поля aggregation

axes.VALUE: Process Opportunity Value, criterion_ids={V1,V2,V3,V4,V5}; axes.FEASIBILITY: Hypothesis Feasibility, criterion_ids={F1,F2,F3,F4,F5}. Каждая criterion_count=5, maximum=25; contexts §4.2. Общий formula definition один, VALUE_AGGREGATION_v2.0 и FEASIBILITY_AGGREGATION_v2.0 ссылаются на него с собственным binding criterion set/context. Они не складываются в третью ось.

| Output каждой оси | Тип / точная формула при compatible context |
|---|---|
| known_count | integer0..5 = count eligible numeric scores |
| unknown_count | integer0..5 = 5-known_count |
| known_sum | integer0..25 = sum known; empty sum0 |
| coverage | number[0,1] = known_count/5; UI100% означает1, не100 в этом поле |
| range_min | integer5..25 = known_sum+unknown_count×1 |
| range_max | integer5..25 = known_sum+unknown_count×5 |
| full_score | integer5..25 при known_count5, иначе null |

Все null→known_count0, known_sum0, coverage0, range[5,25], full_score=null; не0/25. Пять known→range равен full score. Absence F1–F3 считается настоящим numeric5; F4/F5 обязательны. No weighting/normalization/probability confidence, /50, product, threshold19 или matrix zones. S §15.

Intra-axis compatibility gate применяется **до** normal aggregate/range: не COMPATIBLE→normal aggregate object отсутствует (representation outcome null с reason/ref); full_score/range не выдаются, mixing baselines/scopes ради known_count/coverage запрещён. Isolated criterion results сохраняются отдельно; их механическая сумма не публикуется как normal known_sum оси. Diagnostic count возможен только как диагностика отдельных results, не normal aggregate. При COMPATIBLE missing criteria дают обычный partial range выше. S §§15,19.2.

### 16.2. Deterministic stage derivation

EVIDENCE_STAGE_v2.0 выводится **отдельно каждой существующей axis snapshot**, в порядке:

1. VERIFIED_SCORE: все пять numeric1..5, coverage1, mandatory evidence eligible/qualified, complete gates, no affecting unresolved conflicts, valid compatible context/version refs, deterministic execution, все специфические проверки (включая active labor semantics V2) пройдены.
2. Иначе INTERVIEW_SCORE: в использованной eligible closure есть хотя бы один Confirmed non-registry assessment fact (`interview`, `document`, `system_data`), в том числе operand Derived. Partial score допустим.
3. Иначе PRE_SCORE: есть допустимая использованная evidence basis и используются только Confirmed registry + explicitly allowed Derived от них.
4. Нет eligible evidence basis→stage=null/отсутствует; это отсутствие основания, не новый stage enum.

Неиспользованный candidate/attached document не повышает stage. Inferred не допускается ни на одном stage. V3 остаётся Confirmed-only. Не предписывать stage вручную и не выводить его из workflow/AVAILABLE/ACCEPTED. Confirmed blocker не запрещает VERIFIED; low scores допустимы; VERIFIED одной оси не VERIFIED другой. На несовместимом контексте VERIFIED запрещён, отдельные допустимые facts могут определять PRE/INTERVIEW evidence maturity без normal aggregate; snapshot сохраняет причину incompatibility.

workflow_stage описывает цепочку S §9.2: Registry→Screening→Shortlist→Opportunity Signals→Improvement Patterns→Improvement Hypotheses→Assessment Scope→Deep Assessment→две оси→Human Decision. Она не является enum stage scoring; lifecycle/calculation workflow gates этим config не создаются. S §19.1.

## 17. Compatibility и historical boundaries

AXIS_COMPATIBILITY_v2.0: intra VALUE — один compatible baseline с period/population/case unit/scope/fact snapshot; intra FEASIBILITY — одна hypothesis_version+scope_version+compatible process context. Перед aggregate/VERIFIED/reuse обязательно доказать совместимость relevant dependencies. Неизвестная совместимость не признаётся true.

Cross-axis input — ValueSnapshot+FeasibilitySnapshot; status COMPATIBLE/REVALIDATION_REQUIRED/INCOMPATIBLE/UNKNOWN. COMPATIBLE требует same Process/primary AnalysisUnit, compatible process baseline context и proved applicability hypothesis assumptions/evidence к исходному состоянию. Baseline scope и improvement scope могут различаться; это не incompatible само по себе и не перенос эффекта всего процесса. REVALIDATION_REQUIRED — прежняя совместимость утратила актуальность после relevant change; INCOMPATIBLE — proved mismatch; UNKNOWN — недостаток основания.

Только COMPATIBLE допускает обычное совместное представление пары для Human Decision без оговорки несовместимости. Прочие сохраняют отдельные snapshots и причину, не выбирают новую pair автоматически и не принимают решение. Новая VALUE baseline требует compatibility revalidation, но не обязательно recalc всех F при неизменной подходящей closure. Межосевая несовместимость сама не стирает отдельно валидные внутриосевые результаты/stages. S §19.2.

Historical v1.1 никогда не relabel в v2, не overwrite/recalc задним числом. Допустимые facts можно переиспользовать после новой проверки; v2 score требует v2 evaluation и new identity. slice02.pre-score.v1 не v2 identity; legacy snapshot не получает фиктивную гипотезу. Read-only registry/Parser/Mapping/Process primary AnalysisUnit/DQ/provenance/Slice01/02 не меняются. Никакого auto FTE/staffing/savings/headcount. Production activation и migration workflow не проектируются. S §19.4.

## 18. Dependencies, recalculation и immutable reuse

### 18.1. Dependency closure

Каждая rule definition перечисляет прямые typed dependencies; closure включает source facts → Derived → qualified classifications/selected definitions → criterion, а также confirmation basis-specific bindings/sources/policies, qualification, completeness, applicability, criticality, ownership, residuals, conflicts/dispositions и context/version. Graph не имеет derivation cycles, все refs разрешены и versioned.

| Result | Обязательные dependency families |
|---|---|
| V1 | annual_instances, baseline, general eligibility/conflict |
| V2 | оба operands, labor derivation, semantics warning/resolution, baseline |
| V3 | единственный Confirmed процент + его authority/qualification, baseline |
| V4 | examined quantitative/qualitative evidence и selection/conflict, baseline |
| V5 | examined direct/proxy rates/enum и selection/conflict, baseline |
| F1 | gate; complete groups/units/bases; selected sourcing; access/dimensions; critical review; own causes |
| F2 | gate; required interactions/criticality; selected effective paths/components; technical review; topology drivers; causes |
| F3 | gate; capability/component completeness/bindings; success criteria/tests/comparability/remediation; uncertainties; causes |
| F4 | все core/relevant additional domains/items/dispositions; constraints; preserving paths/approval/selection; causes |
| F5 | frozen definition effects/roles/completeness/designs; required indicators/sources; baseline/exposure; methods/comparison/attribution; causes |
| Blocker instance | subject/context+own cause; все predicates и complete alternatives/remediation review; независим от criterion numeric value |
| Aggregate/stage/pair | Собственные criteria, relevant dependency closure, gates/compatibility и versions |

Отсутствующий alternative input V4/V5 тоже зависимость selection: появление нового eligible primary input/conflict меняет результат. Аналогично полнота required collections — зависимость, а не только список уже вычисленных items.

### 18.2. Triggers и reuse gates

Relevant changes: facts/source versions; new conflict/disposition; hypothesis/scope/approach; process baseline; selections plans/paths/components/effect definitions; owner/criticality/applicability/completeness; evidence validity/currentness; binding/source/policy invalidation; methodology/config/schema/evidence/confirmation policy versions. Они замыкаются по affected dependencies; не требуется artificial recalc независимых criteria, но compatibility revalidation обязательна.

SNAPSHOT_REUSE_v2.0: criterion result_origin=RECALCULATED либо REUSED. Для REUSED обязательны reused_from_snapshot_id и provenance **конкретного** criterion result. Reuse допускается только при доказанной совместимости всех direct/transitive dependencies, evidence/context/methodology/config/evidence-policy identities; confirmation-policy/binding/source dependencies также проверяются как часть closure. Неизвестная совместимость→RECALCULATED, не optimistic reuse. Schema incompatibility не обходится переносом старого числа.

Новая axis snapshot всегда immutable и атомарна, даже при смеси reused/recalculated criteria. В ней заново оцениваются связанные blockers, aggregate, compatibility и stage. Reused numeric не обходит invalid eligibility. CONFIRMATION_INVALIDATION_v2.0 запускает cascade proposition→Derived→classifications→criterion→blocker/aggregate/stage; старые records/snapshots не стираются. Новая запись отражает текущее assessment, не исправляет историю. Determinism задан фиксированными versioned inputs/context, а не clock/LLM.

### 18.3. Snapshot requirement representation

`dependency_rules.snapshot_requirements` перечисляет обязательные logical references: axis snapshot id/version; Process/primary AnalysisUnit; VALUE baseline либо hypothesis/scope/process context; input snapshot/fact/Derived/evidence versions; registry coordinates C registry; confirmation basis и source/binding/policy refs C basis; qualification; conflicts/dispositions; collections/completeness/criticality/applicability/owner; selections; effect set/designs; rule/methodology/config/schema/evidence-policy/confirmation-policy identities; calculated_at; criterion results/origins; trace/concerns; compatibility; evidence_stage.

Это completeness requirement списка provenance, не DB/DTO design. Optional audit actor source attestation не превращается здесь в mandatory human-confirmation. Result stages и blockers производные. Definition IDs привязаны к этому reviewed пакету, source v1.1 IDs только transfer provenance. S §§6.3,18,19.3.

## 19. Config validation requirements

### 19.1. Load-blocking errors (fail closed)

**Любое** нарушение этой таблицы блокирует загрузку всего config, без частичной активации, замены default и превращения дефекта config в null процесса. Diagnostic names здесь локальные design labels, не API error contract.

| Check | Ошибка, блокирующая загрузку |
|---|---|
| YAML/schema | Невалидный YAML, duplicate map key, неизвестное поле/type, ошибочная обязательность, bool вместо number, nonfinite threshold, отсутствующий required top-level block |
| Version identity | Нет одного из пяти versions; не methodology2.0; definitions не привязаны к точному reviewed пакету; несовместимая schema; незаданные placeholders |
| Criterion identity | Unknown criterion ID; count≠10; отсутствует/дублируется V1–V5/F1–F5; неправильная axis или criterion set/count/maximum |
| Enums | Unknown enum/case/alias в закрытом словаре; потерян допустимый enum; один input с противоречащими enum definitions. Additional F4 domain — typed confirmed domain record, не самовольное расширение core enum |
| Numeric ranges | Overlap, uncovered boundary/допустимое значение domain, неверная inclusive boundary, несортированные или несовместимые bounds, неправильные units/types/scores |
| Explicit exceptional domain | Не задан V1=0→null; fractional V1 допускается; V2 zero запрещён; V3/rates outside[0,100] допускаются; implicit clamp/rounding |
| Rule IDs | Duplicate rule ID; missing mandatory rule любого из 90 IDs S §18; новый неописанный executable rule; rule index/path/identity mismatch |
| References | Unresolved/wrong-type ref внутри config, missing required dependency, derivation cycle, rules с несуществующими refs; отсутствие внешнего record schema/version contract requirement |
| Executable placeholders | TBD, RESERVED, _DRAFT, developer-decides, later, разумный default в executable definitions. Historical source filename S не executable placeholder |
| Outcomes | У обязательной branch нет deterministic score/null/ineligible/exclusion outcome; branch overlap без явного порядка; неизвестность превращается в1/3/5; empty strict_min→default5 |
| Evidence | Inferred/Unknown numeric eligibility; unrestricted Derived/LLM input; пропущены branch-specific confirmation/qualification/conflict/context gates; V3 proxy или Derived допускаются |
| Confirmation | Source basis требует universal human binding; human branch не требует active authority/CONFIRM; source gates обойдены; policy mode/basis противоречат; qualification заменяется truth confirmation; co-signing навязан без policy |
| Applicability | Exclusion разрешён без allowlist; NOT_APPLICABLE требует APPLIES; exclusion без VALID_FOR_CONTEXT/positive evidence; arbitrary criterion N/A/default5/denominator change |
| Ownership | Одна atomic cause допускает несколько primary owners; linked consequence штрафуется; PROJECT_READINESS scored; UNKNOWN owner молча выбран; blocker owner не соответствует type/cause |
| F definitions | Пропущены required groups/dimensions/selections/completeness; искажён min/critical override/degraded cap/validation remediation/preservation/effect-role rule; F4 core count≠7 |
| Blockers | Types≠точные пять; неверные subject/owner/predicate sets; score==1 trigger; missing alternative-review/three-valued/positive FALSE semantics; F5 terminal taxonomy искажена |
| Aggregation | Normalization, weights, /50/product, changing /25, суммирование incompatible contexts, range по incompatible/unknown context, отсутствующая independent axis binding |
| Stages | Manual stage selection; неверный порядок; VERIFIED с null/conflict/incompatibility/incomplete gates; blocker автоматически запрещает VERIFIED; source identity подменяется stage |
| Dependency/reuse | REUSED без source snapshot/provenance; отсутствует closure/compatibility gate; optimistic reuse; mutable historical overwrite; dependency invalidation не отражается |
| Migration/scope | Relabel historical v1.1; legacy slice marker как v2 identity; lifecycle/activation/decision automation вместо evidence gates |
| Normative coverage | Не совпадают precise mappings/major rules и traceability manifest; незакрытый CONFIG_DESIGN_GAP в executable scope |

Numeric coverage validator проверяет объединение ranges **вместе с explicit special branches** на заявленном domain. V1 integer zero покрыт отдельной null branch; interface enum F2 не обязан иметь numeric score1. Два baseline enums F5 с одинаковым score5 не duplicate-rule error. Множественные min ties допустимы и сохраняются.

### 19.2. Assessment/result validation — не ошибка загрузки config

| Условие конкретной оценки | Требуемый outcome |
|---|---|
| Missing/Unknown/unconfirmed/ineligible/invalid fact, required context или policy | Dependent criterion null / blocker predicate UNKNOWN; stage только по допустимым grounds |
| Unknown enum/type в assessment input | Invalid input, numeric result не выдается; это не разрешение неизвестного enum в config |
| Неразрешённый assessment record ref | Ineligible/insufficient evidence зависимого результата; не synthetic default |
| REQUIRED total0/covered>total, multiple selections, inconsistent evidence | Null затронутого criterion с причиной, все grounds сохранены |
| Mixed axis contexts | Normal aggregate/range suppressed; individual results и compatibility reason сохранены |
| Blocker CONFIRMED+same subject/context score2..5 | Inconsistent result validation, dependency review, запрет VERIFIED до разрешения; no silent overwrite |
| REUSED closure перестала быть compatible | Recalculation в новой snapshot; история не меняется |

Load validator проверяет определения требований; runtime валидирует фактическое их выполнение. Классификация отрицательного факта не равна ineligible evidence. Нормативного rule не хватает→CONFIG_DESIGN_GAP и блокировка config release; `null` не маскирует недостающий rule.

### 19.3. Conformance before YAML acceptance

Потребуются проверка schema/closed rule catalog, round-trip references и acceptance suite S §20. Конкретный implementation тестов здесь не создаётся. Обязательны все normative cases и B-01/B-02 regressions; each enum mapping, numeric boundary, invalid value, owner/eligibility/context/conflict permutation, ordering independent collections, identical versioned-input determinism. Static load checks не заменяют runtime execution и independent review.

## 20. CONFIG_DESIGN_GAP assessment

**CONFIG_DESIGN_GAP: NONE.** В заданном scoring/config scope S задаёт необходимые значения, ветви и последствия. Это результат проверки достаточности для design, не новое conceptual review и не закрытие product OQ.

| Рассмотренная граница | Решение design без нового methodological choice |
|---|---|
| Concrete actors, role bindings, source authority и ConfirmationPolicy mode для организации | Mandatory versioned inputs S §§6.1–6.2; config определяет обе basis и проверяет policy/компетенцию. Не изобретаются реальные полномочия, обязательное число подписантов или default mode |
| Minor/material, зрелость, scope fit и иные экспертные классификации без numeric cutoff | Подтверждённые structured inputs с точным positive-evidence rubric S; отсутствие evidence→null, не алгоритм LLM/free-text score |
| V1/V2 parser и semantic anomaly trigger | Parser/Mapping не меняется; numeric domains и propagated semantic-verification warning S §9.1; новых thresholds нет |
| Diagnostic main reason / naming assessment issues | Сохраняется набор причин, не назначается внешний DTO/приоритет; contract work S §§7,16 |
| Product OQ: shortlist ranking/limits/warning acceptance, matrix zones, lifecycle, multi-process, patterns/cases, activation | Исключены из executable scoring scope согласно S §21; не заполнены default и не объявлены закрытыми |
| Schema/config/policy version literals | Предложенные representation identities §4, не изменение methodology semantics и не утверждение существующего runtime |

Это не возможность вынести недостающее scoring правило в «настройку разработчика». Например, source/human branch разрешается только конкретной применимой policy в пределах S; отсутствие policy даёт ineligible evidence, а не произвольное решение движка. При независимом review обнаруженный действительно отсутствующий нормативный predicate/threshold/branch должен быть зарегистрирован как CONFIG_DESIGN_GAP с S section/точным отсутствующим определением и BLOCKED; YAML не выпускается с заглушкой.

## 21. Frozen Spec Rule → Config Design Section → Future YAML Path

### 21.1. Полный rule-ID manifest

Каждый ID ниже включает нормативный suffix `_v2.0`. Пути с точкой в ID читаются как map key целиком, например `criteria.V1.rules['V1_FREQUENCY_v2.0']`, а не как вложенная version object. Таблица — manifest для `methodology.rule_index`, не вторая копия definitions.

| Frozen Spec Rule | Config Design Section | Future YAML Path |
|---|---|---|
| S §§3–6; `COMMON_CONTEXT_EVIDENCE_v2.0` | §5.1 | `evidence_policy.rules['COMMON_CONTEXT_EVIDENCE_v2.0']` |
| S §7; `COMMON_CONFLICT_NULL_v2.0` | §5.4 | `evidence_policy.rules['COMMON_CONFLICT_NULL_v2.0']` |
| S §8; `COMMON_OWNER_FILTER_v2.0` | §7 | `owner_filtering.rules['COMMON_OWNER_FILTER_v2.0']` |
| S §9; `COMMON_STRICT_MIN_v2.0` | §7 | `aggregation.rules['COMMON_STRICT_MIN_v2.0']` |
| S §10; `F1_DATA_AVAILABILITY_READINESS_v2.0` | §9 | `criteria.F1.rules['F1_DATA_AVAILABILITY_READINESS_v2.0']` |
| S §10; `F1_REQUIREMENT_GATE_v2.0` | §9 | `criteria.F1.rules['F1_REQUIREMENT_GATE_v2.0']` |
| S §10; `F1_CONFIRMED_NOT_REQUIRED_v2.0` | §9 | `criteria.F1.rules['F1_CONFIRMED_NOT_REQUIRED_v2.0']` |
| S §10; `F1_COVERAGE_v2.0` | §9 | `criteria.F1.rules['F1_COVERAGE_v2.0']` |
| S §10; `F1_RESOURCE_ACCESS_v2.0` | §9 | `criteria.F1.rules['F1_RESOURCE_ACCESS_v2.0']` |
| S §10; `F1_READINESS_v2.0` | §9 | `criteria.F1.rules['F1_READINESS_v2.0']` |
| S §10; `F1_CRITICAL_DATA_OVERRIDE_v2.0` | §9 | `criteria.F1.rules['F1_CRITICAL_DATA_OVERRIDE_v2.0']` |
| S §10; `F1_COMPONENT_MIN_v2.0` | §9 | `criteria.F1.rules['F1_COMPONENT_MIN_v2.0']` |
| S §11; `F2_INTEGRATION_COMPLEXITY_v2.0` | §10 | `criteria.F2.rules['F2_INTEGRATION_COMPLEXITY_v2.0']` |
| S §11; `F2_REQUIREMENT_GATE_v2.0` | §10 | `criteria.F2.rules['F2_REQUIREMENT_GATE_v2.0']` |
| S §11; `F2_CONFIRMED_NOT_REQUIRED_v2.0` | §10 | `criteria.F2.rules['F2_CONFIRMED_NOT_REQUIRED_v2.0']` |
| S §11; `F2_INTERFACE_v2.0` | §10 | `criteria.F2.rules['F2_INTERFACE_v2.0']` |
| S §11; `F2_FORMAT_v2.0` | §10 | `criteria.F2.rules['F2_FORMAT_v2.0']` |
| S §11; `F2_ADAPTER_v2.0` | §10 | `criteria.F2.rules['F2_ADAPTER_v2.0']` |
| S §11; `F2_RELIABILITY_v2.0` | §10 | `criteria.F2.rules['F2_RELIABILITY_v2.0']` |
| S §11; `F2_PATH_MIN_v2.0` | §10 | `criteria.F2.rules['F2_PATH_MIN_v2.0']` |
| S §11; `F2_CRITICAL_NO_MECHANISM_v2.0` | §10 | `criteria.F2.rules['F2_CRITICAL_NO_MECHANISM_v2.0']` |
| S §11; `F2_MATERIAL_DEGRADED_PATH_v2.0` | §10 | `criteria.F2.rules['F2_MATERIAL_DEGRADED_PATH_v2.0']` |
| S §11; `F2_TOPOLOGY_v2.0` | §10 | `criteria.F2.rules['F2_TOPOLOGY_v2.0']` |
| S §11; `F2_INTERACTIONS_MIN_v2.0` | §10 | `criteria.F2.rules['F2_INTERACTIONS_MIN_v2.0']` |
| S §12; `F3_TECHNICAL_SOLUTION_MATURITY_v2.0` | §11 | `criteria.F3.rules['F3_TECHNICAL_SOLUTION_MATURITY_v2.0']` |
| S §12; `F3_REQUIREMENT_GATE_v2.0` | §11 | `criteria.F3.rules['F3_REQUIREMENT_GATE_v2.0']` |
| S §12; `F3_CONFIRMED_NOT_REQUIRED_v2.0` | §11 | `criteria.F3.rules['F3_CONFIRMED_NOT_REQUIRED_v2.0']` |
| S §12; `F3_PATTERN_MATURITY_v2.0` | §11 | `criteria.F3.rules['F3_PATTERN_MATURITY_v2.0']` |
| S §12; `F3_TARGET_VALIDATION_v2.0` | §11 | `criteria.F3.rules['F3_TARGET_VALIDATION_v2.0']` |
| S §12; `F3_VALIDATION_REQUIREMENT_v2.0` | §11 | `criteria.F3.rules['F3_VALIDATION_REQUIREMENT_v2.0']` |
| S §12; `F3_COMPONENT_MIN_v2.0` | §11 | `criteria.F3.rules['F3_COMPONENT_MIN_v2.0']` |
| S §12; `F3_SOLUTION_MIN_v2.0` | §11 | `criteria.F3.rules['F3_SOLUTION_MIN_v2.0']` |
| S §13; `F4_REGULATORY_ORGANIZATIONAL_CONSTRAINTS_v2.0` | §12 | `criteria.F4.rules['F4_REGULATORY_ORGANIZATIONAL_CONSTRAINTS_v2.0']` |
| S §13; `F4_DOMAIN_COMPLETENESS_v2.0` | §12 | `criteria.F4.rules['F4_DOMAIN_COMPLETENESS_v2.0']` |
| S §13; `F4_COMPLETE_REVIEW_NO_MATERIAL_CONSTRAINT_v2.0` | §12 | `criteria.F4.rules['F4_COMPLETE_REVIEW_NO_MATERIAL_CONSTRAINT_v2.0']` |
| S §13; `F4_CONSTRAINT_EFFECT_v2.0` | §12 | `criteria.F4.rules['F4_CONSTRAINT_EFFECT_v2.0']` |
| S §13; `F4_CONSTRAINTS_MIN_v2.0` | §12 | `criteria.F4.rules['F4_CONSTRAINTS_MIN_v2.0']` |
| S §14; `F5_EFFECT_MEASURABILITY_v2.0` | §13 | `criteria.F5.rules['F5_EFFECT_MEASURABILITY_v2.0']` |
| S §14; `F5_EFFECT_SCOPE_GATE_v2.0` | §13 | `criteria.F5.rules['F5_EFFECT_SCOPE_GATE_v2.0']` |
| S §14; `F5_INDICATOR_TYPE_v2.0` | §13 | `criteria.F5.rules['F5_INDICATOR_TYPE_v2.0']` |
| S §14; `F5_SCOPE_FIT_v2.0` | §13 | `criteria.F5.rules['F5_SCOPE_FIT_v2.0']` |
| S §14; `F5_INDICATOR_MIN_v2.0` | §13 | `criteria.F5.rules['F5_INDICATOR_MIN_v2.0']` |
| S §14; `F5_BASELINE_v2.0` | §13 | `criteria.F5.rules['F5_BASELINE_v2.0']` |
| S §14; `F5_METHOD_v2.0` | §13 | `criteria.F5.rules['F5_METHOD_v2.0']` |
| S §14; `F5_SOURCE_LIMIT_v2.0` | §13 | `criteria.F5.rules['F5_SOURCE_LIMIT_v2.0']` |
| S §14; `F5_COMPARABILITY_v2.0` | §13 | `criteria.F5.rules['F5_COMPARABILITY_v2.0']` |
| S §14; `F5_ATTRIBUTION_v2.0` | §13 | `criteria.F5.rules['F5_ATTRIBUTION_v2.0']` |
| S §14; `F5_COMPONENT_MIN_v2.0` | §13 | `criteria.F5.rules['F5_COMPONENT_MIN_v2.0']` |
| S §15; `FEASIBILITY_AGGREGATION_v2.0` | §16.1 | `aggregation.rules['FEASIBILITY_AGGREGATION_v2.0']` |
| S §16; `RISK_REQUIRES_VERIFICATION_v2.0` | §15.3 | `evidence_policy.rules['RISK_REQUIRES_VERIFICATION_v2.0']` |
| S §9.1; `V1_FREQUENCY_v2.0` | §8.1 | `criteria.V1.rules['V1_FREQUENCY_v2.0']` |
| S §9.1; `V2_LABOR_v2.0` | §8.2 | `criteria.V2.rules['V2_LABOR_v2.0']` |
| S §9.1; `DERIVE_ANNUAL_LABOR_HOURS_v2.0` | §8.2, §14 | `derivations.rules['DERIVE_ANNUAL_LABOR_HOURS_v2.0']` |
| S §9.1; `V3_MANUAL_WORK_v2.0` | §8.3 | `criteria.V3.rules['V3_MANUAL_WORK_v2.0']` |
| S §9.1; `V4_REPEATABILITY_v2.0` | §8.4 | `criteria.V4.rules['V4_REPEATABILITY_v2.0']` |
| S §9.1; `V5_PROBLEMATICITY_v2.0` | §8.5 | `criteria.V5.rules['V5_PROBLEMATICITY_v2.0']` |
| S §9.1; `DERIVE_PROBLEM_PROXY_v2.0` | §8.5, §14 | `derivations.rules['DERIVE_PROBLEM_PROXY_v2.0']` |
| S §9.2; `SCREENING_TRIAGE_v2.0` | §8.6 | `methodology.screening.rules['SCREENING_TRIAGE_v2.0']` |
| S §15; `VALUE_AGGREGATION_v2.0` | §16.1 | `aggregation.rules['VALUE_AGGREGATION_v2.0']` |
| S §10; `F1_REQUIREMENT_GROUP_COVERAGE_v2.0` | §9 | `criteria.F1.rules['F1_REQUIREMENT_GROUP_COVERAGE_v2.0']` |
| S §10; `F1_SOURCING_PLAN_v2.0` | §9 | `criteria.F1.rules['F1_SOURCING_PLAN_v2.0']` |
| S §10.4; `DERIVE_F1_READINESS_v2.0` | §9.3, §14 | `derivations.rules['DERIVE_F1_READINESS_v2.0']` |
| S §10; `F1_GROUP_ACCESS_MIN_v2.0` | §9 | `criteria.F1.rules['F1_GROUP_ACCESS_MIN_v2.0']` |
| S §11; `F2_PATH_SELECTION_v2.0` | §10 | `criteria.F2.rules['F2_PATH_SELECTION_v2.0']` |
| S §11.4; `DERIVE_F2_TOPOLOGY_v2.0` | §10.3, §14 | `derivations.rules['DERIVE_F2_TOPOLOGY_v2.0']` |
| S §12; `F3_CAPABILITY_COMPLETENESS_v2.0` | §11 | `criteria.F3.rules['F3_CAPABILITY_COMPLETENESS_v2.0']` |
| S §12; `F3_COMPARABILITY_v2.0` | §11 | `criteria.F3.rules['F3_COMPARABILITY_v2.0']` |
| S §12.6; `DERIVE_F3_TARGET_VALIDATION_v2.0` | §11.3, §14 | `derivations.rules['DERIVE_F3_TARGET_VALIDATION_v2.0']` |
| S §12.7; `DERIVE_F3_VALIDATION_REQUIREMENT_v2.0` | §11.4, §14 | `derivations.rules['DERIVE_F3_VALIDATION_REQUIREMENT_v2.0']` |
| S §12; `F3_CONSISTENCY_v2.0` | §11 | `criteria.F3.rules['F3_CONSISTENCY_v2.0']` |
| S §13; `F4_DOMAIN_REVIEW_v2.0` | §12 | `criteria.F4.rules['F4_DOMAIN_REVIEW_v2.0']` |
| S §13; `F4_COMPLIANT_PATH_v2.0` | §12 | `criteria.F4.rules['F4_COMPLIANT_PATH_v2.0']` |
| S §14; `F5_EFFECT_SET_v2.0` | §13 | `criteria.F5.rules['F5_EFFECT_SET_v2.0']` |
| S §14; `F5_PROXY_QUALIFICATION_v2.0` | §13 | `criteria.F5.rules['F5_PROXY_QUALIFICATION_v2.0']` |
| S §14; `F5_BASELINE_EXPOSURE_v2.0` | §13 | `criteria.F5.rules['F5_BASELINE_EXPOSURE_v2.0']` |
| S §14; `F5_REQUIRED_SOURCES_v2.0` | §13 | `criteria.F5.rules['F5_REQUIRED_SOURCES_v2.0']` |
| S §14; `F5_JOINT_INDICATORS_v2.0` | §13 | `criteria.F5.rules['F5_JOINT_INDICATORS_v2.0']` |
| S §14; `F5_DECISION_MATERIAL_EFFECTS_v2.0` | §13 | `criteria.F5.rules['F5_DECISION_MATERIAL_EFFECTS_v2.0']` |
| S §17; `BLOCK_PREDICATE_LOGIC_v2.0` | §15 | `blockers.rules['BLOCK_PREDICATE_LOGIC_v2.0']` |
| S §§6.1–6.2; `CONFIRMATION_ELIGIBILITY_v2.0` | §5.2–5.3 | `confirmation_policy.rules['CONFIRMATION_ELIGIBILITY_v2.0']` |
| S §§5–7; `EVIDENCE_CONTEXT_ELIGIBILITY_v2.0` | §6 | `applicability_policy.rules['EVIDENCE_CONTEXT_ELIGIBILITY_v2.0']` |
| S §6.3; `CONFIRMATION_INVALIDATION_v2.0` | §5.4, §18 | `dependency_rules.rules['CONFIRMATION_INVALIDATION_v2.0']` |
| S §19.1; `EVIDENCE_STAGE_v2.0` | §16.2 | `evidence_stages.rules['EVIDENCE_STAGE_v2.0']` |
| S §19.2; `AXIS_COMPATIBILITY_v2.0` | §17 | `compatibility.rules['AXIS_COMPATIBILITY_v2.0']` |
| S §19.3; `SNAPSHOT_REUSE_v2.0` | §18.2 | `dependency_rules.rules['SNAPSHOT_REUSE_v2.0']` |
| S §17; `BLOCK_CRITICAL_DATA_UNAVAILABLE_v2.0` | §15 | `blockers.rules['BLOCK_CRITICAL_DATA_UNAVAILABLE_v2.0']` |
| S §17; `BLOCK_CRITICAL_INTEGRATION_UNAVAILABLE_v2.0` | §15 | `blockers.rules['BLOCK_CRITICAL_INTEGRATION_UNAVAILABLE_v2.0']` |
| S §17; `BLOCK_NO_TECHNICALLY_VIABLE_APPROACH_v2.0` | §15 | `blockers.rules['BLOCK_NO_TECHNICALLY_VIABLE_APPROACH_v2.0']` |
| S §17; `BLOCK_MANDATORY_CONSTRAINT_PROHIBITS_CHANGE_v2.0` | §15 | `blockers.rules['BLOCK_MANDATORY_CONSTRAINT_PROHIBITS_CHANGE_v2.0']` |
| S §17; `BLOCK_EFFECT_NOT_MEASURABLE_v2.0` | §15 | `blockers.rules['BLOCK_EFFECT_NOT_MEASURABLE_v2.0']` |

**Rule-ID coverage: 90/90 unique IDs S §18**, включая пять BLOCK IDs. Duplicate definitions: 0 по manifest. При сборке YAML каждая запись должна реально разрешиться в собственный definition; наличие строки manifest само по себе не заменяет rule.

### 21.2. Major rules без самостоятельного ID и cross-cutting coverage

| Frozen Spec Rule | Config Design Section | Future YAML Path |
|---|---|---|
| S §§1–2: frozen authority, future/not active, source precedence | §§1,4 | metadata.source_baselines; methodology.state |
| S §§3–3.1: Process/primary AnalysisUnit, independent axis objects | §§4.2,16.1 | methodology.context_requirements; axes |
| S §3: до Hypothesis+Scope FEASIBILITY не существует | §§4.2,16.2 | methodology.context_requirements.HypothesisAssessment |
| S §3.1: baseline scope≠improvement scope; VALUE≠effect/ROI/FTE | §§4.2,8,13,17 | axes.VALUE.context_ref; methodology.context_requirements |
| S §5: statuses/source types, exact input/provenance and Derived closure | §§5.1,8,14,18 | evidence_policy.fact_requirements; methodology.type_catalog |
| S §§5–6: normal и explicit exclusion, не universal APPLIES | §§5.2,6 | applicability_policy.normal_branch; applicability_policy.exclusion_allowlist |
| S §6: business/data/technical/legal/measurement role matrix | §5.3 | confirmation_policy.role_matrix |
| S §6.1: RBAC≠authority, ActorRoleBinding, scope/delegation/distinct actors | §5.2 | confirmation_policy.binding_requirements; confirmation_policy.policy_requirements |
| S §6.2 / B-01: source attestation без mandatory human binding | §5.2 | confirmation_policy.basis_definitions.AUTHORITATIVE_SOURCE_ATTESTATION |
| S §6.2: human branch с CONFIRM/active binding/scope | §5.2 | confirmation_policy.basis_definitions.HUMAN_CONFIRMATION |
| S §6.2: EvidenceQualificationRecord отдельно от content confirmation | §§5.2,6 | confirmation_policy.qualification_requirements |
| S §§6.2–6.3: record/version/batch lifecycle, REVOKED/INVALIDATED | §§5.4,18 | confirmation_policy.lifecycle; dependency_rules.triggers |
| S §6.3: conflict dispositions с competent authority | §5.4 | evidence_policy.conflict_policy |
| S §7: invalid fact≠missing rule, multiple null reasons | §§5.4,19 | evidence_policy.conflict_policy; validation_rules.load_checks |
| S §8.1: AtomicRootCause/candidates/residual/relations/no synthetic fan-out | §7 | owner_filtering.cause_requirements; owner_filtering.filtering |
| S §8: PROJECT_READINESS outside score | §§7,15.3 | owner_filtering.owner_enum; owner_filtering.filtering |
| S §9: strict_min не min известных; positive 5 branches only | §§7,9–13 | aggregation.rules['COMMON_STRICT_MIN_v2.0']; criteria |
| S §9.1: precise V bounds/units, V1 zero vs V2 zero/fraction | §§8.1–8.2 | criteria.V1.inputs; criteria.V2.inputs; criteria.V1.rules; criteria.V2.rules |
| S §9.1: V2 labor semantics warnings, no new anomaly cutoff | §§8.2,16.2 | criteria.V2.inputs; evidence_stages.ordered_stage_rules |
| S §9.1: V3 only Confirmed manual_work_share_percent; no P/Q/R/proxy | §8.3 | criteria.V3.inputs; criteria.V3.rules['V3_MANUAL_WORK_v2.0'] |
| S §9.1: V4 quantitative/qualitative conflict and fallback | §8.4 | criteria.V4.rules['V4_REPEATABILITY_v2.0'] |
| S §9.1: V5 priority/direct/proxy/enum; max available≥1 | §§8.5,14 | criteria.V5.rules; derivations.rules['DERIVE_PROBLEM_PROXY_v2.0'] |
| S §9.2: Screening separate, A/B/Insufficient, manual addition | §8.6 | methodology.screening |
| S §10.2: homogeneous groups/unit weights/completeness/sourcing | §§9.1–9.2 | criteria.F1.inputs; criteria.F1.rules |
| S §10.4 / B-02: readiness dimension explicit qualified exclusion | §§6,9.3 | applicability_policy.exclusion_allowlist; derivations.rules['DERIVE_F1_READINESS_v2.0'] |
| S §10.5: mandatory unknown precedence vs critical override | §9.4 | criteria.F1.rules['F1_CRITICAL_DATA_OVERRIDE_v2.0'] |
| S §§11.1–11.3: effective selection/joint/no-path, FULL/DEGRADED/cap | §§10.1–10.3 | criteria.F2.inputs; criteria.F2.rules |
| S §11.4: topology ordered coordination rubric | §§10.3,14 | derivations.rules['DERIVE_F2_TOPOLOGY_v2.0'] |
| S §§12.4–12.5: capabilities/bindings/positive evidence/comparability | §§11.1–11.2 | criteria.F3.inputs; criteria.F3.rules |
| S §12.5 / B-02: comparability dimension exclusion | §§6,11.2 | applicability_policy.exclusion_allowlist; criteria.F3.rules['F3_COMPARABILITY_v2.0'] |
| S §§12.6–12.7: strengthened failure/remediation/uncertainty/consistency | §§11.3–11.4,14 | derivations.rules; criteria.F3.rules['F3_CONSISTENCY_v2.0'] |
| S §13.1: seven domains + additional, backed candidate dispositions | §12.1 | criteria.F4.inputs; criteria.F4.rules['F4_DOMAIN_REVIEW_v2.0'] |
| S §13.1 / B-02: domain exclusion ≠criterion5 | §§6,12.1–12.3 | applicability_policy.exclusion_allowlist; criteria.F4.rules |
| S §13.2: aliases/resolution/preservation/approval/path selection | §12.2 | criteria.F4.rules['F4_CONSTRAINT_EFFECT_v2.0']; criteria.F4.rules['F4_COMPLIANT_PATH_v2.0'] |
| S §13.3: complete review not absence | §12.3 | criteria.F4.rules['F4_COMPLETE_REVIEW_NO_MATERIAL_CONSTRAINT_v2.0'] |
| S §14.1: effect set roles, pre-scoring freeze, selected design | §13.1 | criteria.F5.inputs; criteria.F5.rules['F5_EFFECT_SET_v2.0'] |
| S §14.2: proxy transferability and mandatory scope fit | §13.2 | criteria.F5.rules['F5_PROXY_QUALIFICATION_v2.0']; criteria.F5.rules['F5_INDICATOR_MIN_v2.0'] |
| S §14.3: eight baseline items, reconstruction, exposure boundary | §13.3 | criteria.F5.rules['F5_BASELINE_EXPOSURE_v2.0']; criteria.F5.inputs |
| S §14.4: required sources summary, cap3/unavailable1/no Unknown bypass | §13.4 | criteria.F5.rules['F5_REQUIRED_SOURCES_v2.0']; criteria.F5.rules['F5_SOURCE_LIMIT_v2.0'] |
| S §§14.5–14.6: comparability/attribution/joint/formal effects min | §13.5 | criteria.F5.rules; criteria.F5.inputs |
| S §15: two independent /25, exact metrics, no normalization | §16.1 | aggregation.common_formula; aggregation.axis_bindings; axes |
| S §§16–17: risk/evidence issues≠business blocker | §15.3 | evidence_policy.rules['RISK_REQUIRES_VERIFICATION_v2.0']; blockers |
| S §17.1: eligible FALSE vs missing UNKNOWN, false-first conjunction | §15.1 | blockers.shared_predicates; blockers.rules['BLOCK_PREDICATE_LOGIC_v2.0'] |
| S §17.2: five exact blocker subject/owner predicates, F5 terminal designs | §15.2 | blockers.types; blockers.rules |
| S §17.3: blocker independent, consistency/currentness, retired codes | §15.3 | blockers.instance_requirements; validation_rules.assessment_checks |
| S §18: exact unique IDs and explanatory trace incl ties/exclusions | §§2.3,5.4,21.1 | methodology.rule_index; evidence_policy.trace_requirements |
| S §19.1: stage derivation, no basis→unset, blocker≠stage prohibition | §16.2 | evidence_stages.ordered_stage_rules; evidence_stages.no_basis_outcome |
| S §19.2: intra compatibility blocks normal aggregate/range | §§16.1,17 | compatibility.intra_axis; aggregation.incompatibility_gate |
| S §19.2: cross compatibility gates pair only | §17 | compatibility.cross_axis |
| S §19.3: version identities/closure/recalc/reuse/new immutable snapshot | §§4,18 | metadata; dependency_rules |
| S §19.4: historical migration/read-only/legacy isolation | §17 | compatibility.migration |
| S §20: normative acceptance examples incl B-01/B-02 | §§19.3,22 | validation_rules.conformance_requirements |
| S §§21–22: remaining product OQ excluded; no executable placeholder | §§1,19–20,22 | methodology.state; validation_rules.load_checks |

**Traceability completeness result: COMPLETE FOR DESIGN.** Все 90 rule IDs S §18 назначены одному definition path; major cross-cutting rules S §§1–22 представлены в таблице выше. S §23 содержит status/history/self-check, а не дополнительную numeric branch; authority/history покрыты §§1,4 design. Это coverage документа, не заявление о готовом YAML или успешном runtime execution.

## 22. Точный checklist completeness будущего scoring_config_v2.0.yaml

Каждый пункт обязателен. «Present» означает реально определён и разрешается по refs, а не только упомянут в комментарии.

- [ ] Все 15 top-level blocks §3 присутствуют, schema валидна, duplicate/unknown keys отсутствуют; общий vocabulary однозначен.
- [ ] methodology_version=2.0 и exact config/schema/evidence/confirmation policy identities §4 фиксированы; source S0.4/C0.3 и reviewed design refs закреплены; methodology остаётся future/not active до отдельной activation.
- [ ] Ровно V1–V5/F1–F5, по пять на VALUE/FEASIBILITY, maximum25, правильные context refs и root rules; не добавлен одиннадцатый criterion.
- [ ] Все 90 unique IDs manifest §21.1 определены ровно один раз; все mandatory rules/ref/dependencies разрешаются; mappings нигде не дублируются независимо.
- [ ] Все input descriptors имеют type/unit/domain/status/source/context/confirmation/applicability/required-branch/null/conflict/provenance requirements.
- [ ] Numeric mapping bounds/inclusivity полностью совпадают с §§8–9/S; domain покрыт ranges или explicit outcome branches без overlap/gaps; V1 zero→null и fractional invalid; V2 zero→1 и fractional operand допустим.
- [ ] V2 annual labor только product допустимых operands; semantic warning сохраняется, active person-hours gate VERIFIED действует; нет invented thresholds/conversions/registry total shortcut.
- [ ] V3 единственный Confirmed manual_work_share_percent, no Derived/proxy/P-Q-R/LLM/fallback; missing_facts и conflict semantics сохранены.
- [ ] V4 quantitative/enum selection/conflict и V5 direct/max-proxy/enum с минимум одним rate и отсутствием synthetic0 реализованы точно.
- [ ] Screening использует только V1/V2 triage с Insufficient-first/A/B/Other; manual addition допустим, V3–V5/normal VALUE aggregation не подменяются Screening.
- [ ] F1 requirement gate/positive absence/groups/bases/unit statuses/count denominator/weight1/selected sourcing/access/readiness dimensions/freshness представлены; no pooled bases/default5.
- [ ] F1 critical override требует own critical unavailable и complete substitute review; mandatory coverage/access/readiness Unknown сохраняет F1=null; blocker independent.
- [ ] F2 interactions/criticality/effective selected paths/joint/FULL/DEGRADED/no-path ветвь/четыре mappings/cap min(path,2)/topology/strict min/null consistency представлены.
- [ ] F3 capabilities/selected bindings/completeness/success criteria/positive maturity/comparability/test validation/remediation/remaining uncertainty/consistency представлены; conclusive failure exception ограничена validation component.
- [ ] F4 все seven core и relevant additional domains, applicability/completeness/outcome и backed candidate dispositions; exact effects/aliases/preservation/approval/path selection/complete review представлены, absence branch не создана.
- [ ] F5 frozen formal effect set с одним PRIMARY, selected design, single/joint indicators, все mappings, proxy transferability, eight baseline items/exposure/reconstruction, sources/method caps, comparability/attribution/formal-effect strict min представлены.
- [ ] AtomicRootCause/atomic pieces/residual/candidate owners/relations реализуют one adverse atomic cause→one primary owner; foreign consequences не penalty; UNKNOWN affects только relevant mandatory branches; PROJECT_READINESS вне scoring.
- [ ] Truth confirmation, context applicability, evidence validity различаются; normal=APPLIES+VALID, exclusion=CONFIRMED_NOT_APPLICABLE+VALID только explicit allowlist; пустота не synthetic5/N/A.
- [ ] HUMAN_CONFIRMATION и AUTHORITATIVE_SOURCE_ATTESTATION имеют собственные полный gates, policy/mode/role/source requirements; source content не требует общего human binding, qualification interpretation требует competent authority.
- [ ] ActorRoleBinding scope/period/basis/delegation, AuthoritativeSource authority/domain/version/currentness/scope/exact attestation, ConfirmationRecord и EvidenceQualificationRecord requirements представлены; batch/version/REVOKED/INVALIDATED/conflict dispositions не потеряны.
- [ ] Пять blockers имеют точные type/subject/owner/identity/shared+additional predicates и alternative-review requirements; F5 terminal taxonomy полна; no score==1 trigger; TRUE/FALSE/UNKNOWN logic и independently proved FALSE реализованы.
- [ ] Blocker consistency/currentness и distinction risk/assessment issue/Project Readiness сохранены; blocker не меняет score/range/denominator и не запрещает VERIFIED.
- [ ] Independent axis formulas дают exact known_count/known_sum/coverage/range/full_score; zero-known=[5,25]/null; никаких normalization,/50/product/threshold19/matrix zones.
- [ ] Intra-axis incompatibility/неустановленная compatibility подавляет normal aggregate/range; cross-axis gate не уничтожает отдельно valid axes и требует qualified pair.
- [ ] EVIDENCE_STAGE выводится VERIFIED→INTERVIEW→PRE по eligible dependency closure; no basis→unset; пять known+полные gates/compatible context/no conflict обязательны VERIFIED; stages не вручную и не workflow/lifecycle labels.
- [ ] Dependency closure включает facts/Derived/qualifications/policies/bindings/sources/owners/completeness/selections/conflicts/context/versions; changes invalidируют только затронутую closure с повторной проверкой dependents.
- [ ] REUSED требует compatible closure/source snapshot/provenance; RECALCULATED при недоказанной совместимости; blockers/aggregation/compatibility/stage перепроверяются, snapshots immutable/atomic.
- [ ] v1.1 history не relabel/overwrite, legacy slice marker не v2, reusable facts requalified; registry/mapping/Slice01/02 не изменяются, activation не включена config по умолчанию.
- [ ] Все load-blocking checks §19.1 проходят; assessment invalid inputs дают предусмотренные null/UNKNOWN/consistency outcomes, не маскируют missing config rule.
- [ ] Полная traceability §21 сверена с реальными YAML paths; no executable TBD/RESERVED/_DRAFT/developer-decides/default placeholders, нет CONFIG_DESIGN_GAP в executable scope.
- [ ] Все normative cases S §20, включая targeted B-01/B-02 и F1/F3/F4 regression, прошли future schema/engine conformance suite; границы/enums/invalid inputs/conflicts/ownership/reuse/migration проверены.
- [ ] Идентичные versioned inputs/rules дают одинаковый результат и trace minimum ties; перестановка независимых collections не меняет score; source/qualification/authority invalidation создаёт новые состояния с сохранением истории.
- [ ] Независимое review design и последующего YAML завершено в рамках отдельного этапа; completeness не объявляется runtime/production readiness и не закрывает product OQ S §21.

Текущий результат: design complete для независимого review; checklist выше — критерии **будущего** YAML и его acceptance, ещё не выполненные runtime проверки.

**CONFIG_DESIGN_GAP: NONE**

**TRACEABILITY: COMPLETE FOR DESIGN — 90/90 rule IDs + major rules**

**CONFIG DESIGN: READY FOR INDEPENDENT REVIEW**

На этом design завершён. scoring_config_v2.0.yaml не создан; implementation и production activation не начаты; существующие файлы и Git не изменены.
