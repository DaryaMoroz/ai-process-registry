# REGISTRY_SCHEMA.md

# Концептуальная схема данных

**Проект:** ИИ-агент анализа реестра процессов  
**Уровень:** логический контракт сущностей MVP, без физической SQL-схемы

## 1. Назначение

Документ определяет согласованную модель официального read-only источника и отдельного аналитического слоя. Он фиксирует сущности, идентичность, связи, статусы и обязательную provenance, но не задаёт таблицы PostgreSQL, индексы, DDL или полный API.

Нормативные правила scoring находятся в `SCORING_ENGINE_SPEC.md` и `scoring_config_v1.1.yaml`; правила импорта МЛХ — в `REGISTRY_MAPPING_MLH.md`.

## 2. Слои данных

| Слой | Содержание | Изменяемость |
|---|---|---|
| Source | исходный Excel и его версии | read-only |
| Parsed | листы, строки, ячейки, raw/formula/cached/normalized | добавляется по результатам импорта, источник не меняется |
| Identity | процессы и fingerprint matching между версиями | версионируемый аналитический слой |
| Analysis | AnalysisUnit, карточки, факты, интервью, решения | изменяется с аудитом |
| Scoring | input snapshots, criterion results, score snapshots | immutable history |

`null` означает неизвестное или неинтерпретируемое значение. Он не заменяется `1`, нулём или предположением.

## 3. Общие идентификаторы и версии

- Все внутренние ID непрозрачны и не выводятся из номера строки Excel.
- `source_row_id`, `process_id` и `source_fingerprint` имеют разные назначения.
- Каждая версия Registry, MappingProfile, fingerprint algorithm и scoring methodology сохраняется явно.
- Сущности, влияющие на scoring, имеют traceability до источника или HumanDecision.
- Исторические ScoreSnapshot и SourceVersion не перезаписываются.

## 4. Registry

Представляет логический официальный реестр, имеющий одну или несколько загрузок.

Минимальные атрибуты:

- `registry_id`;
- `name`;
- `profile_id`;
- `created_at`;
- `status`.

Связи: `Registry 1 → N RegistryVersion`.

## 5. RegistryVersion

Представляет конкретный загруженный файл.

Атрибуты:

- `registry_version_id`;
- `registry_id`;
- `file_name`;
- `file_extension` (`xlsx` или `xlsm`);
- `file_checksum`;
- `file_size`;
- `uploaded_at`, `uploaded_by`;
- `profile_id`;
- `mapping_version`;
- `processing_status`;
- `source_read_only = true`.

Checksum вычисляется на исходном файле и не меняется в процессе обработки.

## 6. MappingProfile

Версионированный контракт импорта реестра определённого типа.

Атрибуты:

- `profile_id`;
- `mapping_version`;
- `fingerprint_version`;
- `supported_extensions`;
- `default_sheet_name`;
- `header_rule`;
- `table_boundary_rule`;
- `column_mappings`;
- `normalization_rules`;
- `row_classification_rules`;
- `validation_rules`;
- `effective_from`.

Для пилота: `profile_id = registry_mlh`, `mapping_version = 1.0.0`.

## 7. SourceSheet

Снимок выбранного листа конкретной версии реестра.

Атрибуты:

- `source_sheet_id`;
- `registry_version_id`;
- `sheet_name`;
- `sheet_index`;
- `is_selected`;
- `used_range`;
- `header_row_number`;
- `first_data_row_number`;
- `last_data_row_number`;
- `column_count`;
- `mapping_version`.

Для пилотного `Лист3`: `used_range = A8:S17`, заголовки в строке 8, данные 9–17, 19 колонок.

## 8. SourceRow

Строка конкретного SourceSheet.

Атрибуты:

- `source_row_id`;
- `source_sheet_id`;
- `excel_row_number`;
- `row_type`;
- `scoring_eligible`;
- `classification_rule_id`;
- `classification_evidence`;
- `mapping_version`;
- `created_at`.

Допустимые `row_type`:

- `PROCESS`;
- `GROUP_HEADER`;
- `AGGREGATE`;
- `TOTAL`;
- `EMPTY`;
- `UNKNOWN`.

Только `PROCESS` может иметь `scoring_eligible = true`. Номер строки хранится для трассировки, но не является `process_id` и не входит в source fingerprint.

## 9. SourceCell

Ячейка SourceRow с полным представлением чтения Excel.

Атрибуты:

- `source_cell_id`;
- `source_row_id`;
- `coordinate`;
- `column_letter`;
- `official_header`;
- `canonical_field`;
- `raw_value`;
- `formula`;
- `cached_value`;
- `normalized_value`;
- `source_cell_type`;
- `cell_type`;
- `cached_cell_type`;
- `normalization_status`;
- `mapping_version`.

Правила:

- `formula` сохраняется как текст формулы;
- формула не вычисляется системой;
- `cached_value` читается из сохранённого результата книги;
- `source_cell_type` хранит исходный OOXML-тип, а `cached_cell_type` — тип cached result формульной ячейки;
- `normalized_value` формируется только из допустимого raw/cached value;
- отсутствующий, ошибочный или неоднозначный cached result даёт `normalized_value = null` и DataQualityIssue.

## 10. Process

Стабильная внутренняя идентичность процесса между версиями Registry.

Атрибуты:

- `process_id`;
- `registry_id`;
- `current_name`;
- `identity_status`;
- `created_at`;
- `retired_at`.

Официальный process code может храниться как факт, но не является `process_id` и не считается гарантированно уникальным.

## 11. SourceFingerprint

Результат версионированного нормализованного fingerprint для сопоставления PROCESS rows.

Атрибуты:

- `source_fingerprint_id`;
- `source_row_id`;
- `process_id`;
- `fingerprint_value`;
- `fingerprint_version`;
- `input_fields`;
- `normalization_trace`;
- `match_status`;
- `matched_registry_version_id`;
- `created_at`.

Состав входных полей и исключения определяются MappingProfile. Номер строки, номер/имя листа, идентификатор загрузки, изменяемые метрики и scores в fingerprint не входят. Неоднозначное matching не выполняет auto-merge и требует HumanDecision.

## 12. AnalysisUnit

Единица formal scoring.

Атрибуты:

- `analysis_unit_id`;
- `process_id`;
- `source_row_id` для первичной единицы;
- `parent_analysis_unit_id` для декомпозиции;
- `unit_type` (`PRIMARY` или `DECOMPOSED`);
- `name`;
- `status`;
- `scoring_eligible`;
- `created_at`, `created_by`.

Для каждой scoring-eligible PROCESS row создаётся одна PRIMARY AnalysisUnit. Декомпозиция создаёт внутренние units и не изменяет SourceRow или Excel.

## 13. ProcessAnalysisCard

Агрегат аналитического состояния Process/AnalysisUnit.

Атрибуты:

- `analysis_card_id`;
- `process_id`;
- `analysis_unit_id`;
- `card_version`;
- `status`;
- `active_score_snapshot_id`;
- `created_at`, `updated_at`.

Карточка связывает facts, evidence, DQ issues, questions, interviews, conflicts, risks, blockers, decisions и score snapshots. Она не копирует и не изменяет официальный реестр.

## 14. Fact

Структурированное утверждение об AnalysisUnit.

Атрибуты:

- `fact_id`;
- `analysis_unit_id`;
- `field_id`;
- `value`;
- `unit`;
- `fact_status`;
- `source_type`;
- `source_role`;
- `effective_at`;
- `created_at`;
- `supersedes_fact_id`;
- `is_active`.

`fact_status` и `source_type` — независимые атрибуты.

Допустимые статусы:

- `Confirmed`;
- `Derived`;
- `Inferred`;
- `Unknown`.

Допустимые `source_type`: `registry`, `calculated`, `interview`, `document`, `system_data`, `llm_hypothesis`. Роль источника (`process_owner`, `executor`, `IT`, `information_security`, `data_owner`, `system_owner`, `technical_expert`, `analyst`, `other`) хранится отдельно в `source_role`. `Derived` — статус, а не source type. `Inferred` не участвует в formal scoring до подтверждения.

## 15. SourceReference

Прослеживаемая ссылка от факта, кандидата, решения или результата к evidence.

Атрибуты:

- `source_reference_id`;
- `target_entity_type`, `target_entity_id`;
- `source_type`;
- `registry_version_id`;
- `source_sheet_id`;
- `source_row_id`;
- `source_cell_id`;
- `interview_answer_id`;
- `document_reference`;
- `system_reference`;
- `human_decision_id`;
- `excerpt_or_value`;
- `captured_at`.

Заполняются только применимые поля, но любой Confirmed fact должен иметь допустимое evidence.

## 16. Derivation

Provenance для Derived fact.

Атрибуты:

- `derivation_id`;
- `output_fact_id`;
- `input_fact_ids`;
- `rule_id` или `formula_id`;
- `rule_version`;
- `expression_or_trace`;
- `computed_at`;
- `computation_status`.

Derived fact допустим для scoring только если все обязательные входные facts допустимы для соответствующей стадии и результат воспроизводим.

## 17. DataQualityIssue

Структурированная проблема качества источника или нормализации.

Атрибуты:

- `data_quality_issue_id`;
- `registry_version_id`;
- `source_sheet_id`, `source_row_id`, `source_cell_id`;
- `issue_code`;
- `severity`;
- `message`;
- `raw_context`;
- `impact`;
- `status`;
- `mapping_version`;
- `created_at`, `resolved_at`.

Issue codes и последствия для профиля МЛХ определяет `REGISTRY_MAPPING_MLH.md`.

## 18. Conflict

Несовместимость двух или более подтверждённых фактов.

Атрибуты:

- `conflict_id`;
- `analysis_unit_id`;
- `field_id`;
- `conflicting_fact_ids`;
- `affected_criterion_ids`;
- `status` (`OPEN`, `RESOLVED`);
- `resolution_decision_id`;
- `created_at`, `resolved_at`.

Open conflict, влияющий на criterion, даёт `score = null` и запрещает VERIFIED SCORE. Несовпадение V3 proxy и подтверждённого фактического manual share само по себе не создаёт Conflict.

## 19. Question

Вопрос для получения или уточнения факта.

Атрибуты:

- `question_id`;
- `analysis_unit_id`;
- `target_field_ids`;
- `reason`;
- `text`;
- `priority`;
- `status`;
- `generated_by`;
- `created_at`.

## 20. InterviewSession

Сеанс сбора данных у пользователя/эксперта.

Атрибуты:

- `interview_session_id`;
- `analysis_unit_id`;
- `participant_id`;
- `started_at`, `completed_at`;
- `status`;
- `created_by`.

## 21. InterviewAnswer

Ответ в рамках InterviewSession.

Атрибуты:

- `interview_answer_id`;
- `interview_session_id`;
- `question_id`;
- `answer_text`;
- `submitted_by`;
- `submitted_at`;
- `source_attachment_refs`.

Ответ сам по себе не является подтверждённым Fact; из него создаются FactCandidate и последующие Confirmation.

## 22. FactCandidate

Потенциальный структурированный факт, извлечённый LLM или введённый для проверки.

Атрибуты:

- `fact_candidate_id`;
- `analysis_unit_id`;
- `field_id`;
- `proposed_value`;
- `unit`;
- `source_reference_ids`;
- `extraction_trace`;
- `status` (`PENDING`, `ACCEPTED`, `REJECTED`);
- `created_at`, `created_by`.

До принятия кандидат соответствует `Inferred` и не входит в scoring input.

## 23. Confirmation

Результат human review FactCandidate или факта.

Атрибуты:

- `confirmation_id`;
- `fact_candidate_id` или `fact_id`;
- `decision` (`CONFIRM`, `REJECT`, `CORRECT`);
- `confirmed_value`;
- `comment`;
- `actor_id`;
- `decided_at`;
- `human_decision_id`.

Только подтверждение/коррекция создаёт новый Confirmed fact. Оригинальный candidate сохраняется для аудита.

## 24. CriterionResult

Результат одного из 10 критериев для конкретного input snapshot.

Атрибуты:

- `criterion_result_id`;
- `score_snapshot_id`;
- `criterion_id` (`V1`–`V5`, `F1`–`F5`);
- `rule_id`;
- `score` (`1–5` или `null`);
- `input_fact_ids`;
- `source_reference_ids`;
- `applied_rule_trace`;
- `missing_inputs`;
- `conflict_ids`;
- `risk_ids`;
- `methodology_version`.

LLM-generated score не является допустимым CriterionResult.

## 25. ScoreSnapshot

Неизменяемый результат одного запуска Rule Engine.

Атрибуты:

- `score_snapshot_id`;
- `analysis_unit_id`;
- `input_snapshot_id`;
- `score_stage` (`PRE_SCORE`, `INTERVIEW_SCORE`, `VERIFIED_SCORE`);
- `methodology_version`;
- `scoring_config_version`;
- `mapping_version`;
- `value_full_score`;
- `value_known_sum`;
- `value_coverage`;
- `value_min`, `value_max`;
- `feasibility_full_score`;
- `feasibility_known_sum`;
- `feasibility_coverage`;
- `feasibility_min`, `feasibility_max`;
- `criterion_result_ids`;
- `risk_ids`, `blocker_ids`;
- `calculated_at`;
- `engine_version`.

VERIFIED SCORE возможен только при 10 результатах `1–5`, допустимом evidence и отсутствии влияющих unresolved conflicts. Наличие подтверждённого Blocker не запрещает VERIFIED SCORE.

## 26. Risk

Неопределённость или ограничение, не являющееся автоматически blocker.

Атрибуты:

- `risk_id`;
- `analysis_unit_id`;
- `risk_code`;
- `description`;
- `affected_criterion_ids`;
- `evidence_refs`;
- `status`;
- `created_at`, `resolved_at`.

Для неизвестного потенциального ограничения F2–F5 используется `RISK_REQUIRES_VERIFICATION`; оно не снижает score автоматически.

## 27. Blocker

Подтверждённый или предполагаемый стоп-фактор, отдельный от score.

Атрибуты:

- `blocker_id`;
- `analysis_unit_id`;
- `blocker_code`;
- `status` (`SUSPECTED`, `CONFIRMED`, `RESOLVED`);
- `evidence_refs`;
- `confirmed_by`, `confirmed_at`;
- `created_at`.

Blocker не обнуляет formal scores. `CONFIRMED` Blocker может быть связан с VERIFIED ScoreSnapshot.

## 28. HumanDecision

Явное решение человека, меняющее аналитическое состояние.

Атрибуты:

- `human_decision_id`;
- `decision_type`;
- `target_entity_type`, `target_entity_id`;
- `decision_value`;
- `reason`;
- `actor_id`;
- `decided_at`.

Примеры: confirmation, conflict resolution, identity match approval, rejection of candidate, blocker confirmation.

## 29. AuditEvent

Неизменяемая запись значимого действия.

Атрибуты:

- `audit_event_id`;
- `event_type`;
- `entity_type`, `entity_id`;
- `actor_type`, `actor_id`;
- `occurred_at`;
- `before_state_ref`, `after_state_ref`;
- `correlation_id`;
- `metadata`.

Аудируются загрузка, mapping, DQ, matching, создание/изменение facts, derivations, candidates, confirmations, conflicts, human decisions и расчёты.

## 30. Ключевые связи и инварианты

| Связь | Инвариант |
|---|---|
| Registry → RegistryVersion | версия источника immutable |
| RegistryVersion → SourceSheet → SourceRow → SourceCell | полная source traceability |
| SourceRow(PROCESS) → Process | только через versioned matching |
| SourceRow(PROCESS) → AnalysisUnit(PRIMARY) | ровно одна первичная unit на eligible row |
| AnalysisUnit → ProcessAnalysisCard | scoring выполняется по unit |
| Fact → SourceReference | Confirmed требует evidence |
| Fact(Derived) → Derivation → input Facts | воспроизводимая provenance обязательна |
| FactCandidate → Confirmation → Fact(Confirmed) | LLM-кандидат не подтверждает себя |
| input_snapshot_id → CriterionResult → ScoreSnapshot | результат воспроизводим и immutable |
| Conflict → CriterionResult | open scoring conflict даёт null |
| Blocker → ScoreSnapshot | blocker отдельный от score |
| HumanDecision → AuditEvent | решение всегда аудируется |

## 31. Scoring eligibility и snapshots

В input snapshot попадают только facts, допустимые для выбранной стадии:

- PRE: Confirmed Registry facts и Derived только из них;
- INTERVIEW: подтверждённые facts допустимых источников и Derived;
- VERIFIED: полный непротиворечивый набор для всех 10 критериев.

Каждый snapshot содержит ссылки на конкретные версии facts, derivations, conflict states, `methodology_version`, `mapping_version` и уникальный `input_snapshot_id`. Повторный расчёт не изменяет предыдущий ScoreSnapshot.

## 32. Что намеренно не определяется

Документ не определяет:

- физические таблицы, типы столбцов и индексы PostgreSQL;
- детали ORM;
- endpoint paths и transport DTO;
- новые DQ rules;
- новые scoring criteria или thresholds;
- RAG, Multi-Agent, BPMN или TO BE модели.
