# TECH_SPEC.md

# Техническая спецификация MVP

**Проект:** ИИ-агент анализа реестра процессов  
**Методика scoring:** `1.1`  
**Scope:** соответствует `MVP_PASSPORT_AND_BACKLOG.md`

## 1. Назначение системы

Система загружает официальный реестр процессов в режиме read-only, нормализует его по версионированному mapping-профилю, создаёт отдельный аналитический слой, поддерживает интервью и подтверждение фактов и передаёт допустимые данные в детерминированный Rule Engine.

Результат включает карточки процессов, Data Quality Issues, факты и evidence, score snapshots `Ценность /25 × Реализуемость /25`, risks, blockers и audit trail.

## 2. Нормативные зависимости

| Область | Источник |
|---|---|
| Формальные правила scoring | `SCORING_ENGINE_SPEC.md` |
| Машиночитаемая scoring-конфигурация | `scoring_config_v1.1.yaml` |
| Импорт реестра МЛХ | `REGISTRY_MAPPING_MLH.md` |
| Scope и этапы MVP | `MVP_PASSPORT_AND_BACKLOG.md` |
| Концептуальная модель данных | `REGISTRY_SCHEMA.md` |
| Приёмочные сценарии | `TEST_CASES.md` |

Техническая реализация не может изменять thresholds, enum mappings или правила eligibility, заданные нормативными источниками.

## 3. Архитектурный поток

`Registry Parser → Registry Mapping → Data Quality → Process Analysis Card → Rule Engine → Backend/Orchestrator → LLM Agent → UI`

Порядок отражает преобразование данных и границы ответственности, а не обязательную синхронность исполнения. Backend/Orchestrator управляет всем жизненным циклом, но не подменяет Parser, Mapping, Rule Engine или LLM Agent.

## 4. Registry Parser

### 4.1. Вход

- Excel `.xlsx` или `.xlsm`;
- выбранный `MappingProfile`;
- необязательное явное имя листа; иначе используется лист профиля по умолчанию.

### 4.2. Обязательное поведение

- открыть книгу без записи;
- не сохранять и не модифицировать исходный файл;
- не запускать Excel и не пересчитывать формулы;
- вычислить checksum до обработки и обеспечить его неизменность после обработки;
- получить список листов и выбрать лист по правилам профиля;
- прочитать значения и метаданные ячеек в пределах обнаруженной таблицы;
- сохранить для каждой ячейки `raw_value`, `formula`, `cached_value`, `normalized_value`, `source_cell_type`, `cell_type` и `cached_cell_type`;
- передать прочитанные данные в Mapping без бизнес-scoring.

Для формульной ячейки Parser использует только сохранённый cached result. Отсутствующий, ошибочный или неоднозначный cached result приводит к `normalized_value = null` и `DataQualityIssue`.

## 5. Registry Mapping

### 5.1. MappingProfile

`MappingProfile` — версионированная конфигурация структуры конкретного реестра. Он определяет:

- `profile_id` и `mapping_version`;
- поддерживаемые расширения;
- лист по умолчанию и правила выбора другого листа;
- строку заголовков и начало/конец таблицы;
- соответствие Excel-колонок canonical fields;
- типы и нормализацию;
- классификацию строк;
- правила fingerprint и mapping-specific validation.

Для пилота используется `registry_mlh`, версия `1.0.0`, лист по умолчанию `Лист3`. Фактическая структура — `A8:S17`, 19 колонок.

### 5.2. Результат Mapping

Mapping создаёт:

- `RegistryVersion`, `SourceSheet`, `SourceRow`, `SourceCell`;
- `row_type` из `PROCESS`, `GROUP_HEADER`, `AGGREGATE`, `TOTAL`, `EMPTY`, `UNKNOWN`;
- `scoring_eligible`;
- canonical field values и source references;
- идентификаторы и fingerprint по правилам профиля.

Только `PROCESS` может быть scoring-eligible. Тип `UNKNOWN` никогда не передаётся в scoring.

## 6. Data Quality

Компонент валидирует структуру, типы и интерпретируемость данных согласно активному MappingProfile. Он:

- регистрирует `DataQualityIssue` с code, severity, location и impact;
- не исправляет исходный Excel;
- не подставляет предполагаемое значение вместо `null`;
- блокирует scoring только когда это следует из mapping или scoring requirements;
- сохраняет формульные и cached значения для аудита.

Набор DQ rules для МЛХ определяется `REGISTRY_MAPPING_MLH.md`; компонент не вводит новую бизнес-методику.

## 7. Идентичность процессов

- `source_row_id` идентифицирует строку конкретной загрузки.
- `process_id` — внутренний стабильный непрозрачный ID.
- `source_fingerprint` помогает сопоставлять процессы между версиями.

Номер строки и официальный process code не используются как постоянный `process_id`. Fingerprint не содержит номер строки и другие поля, исключённые mapping-профилем. Неоднозначное matching не приводит к автоматическому объединению; требуется `HumanDecision`.

## 8. Process Analysis Card и AnalysisUnit

Для каждой scoring-eligible строки `PROCESS` создаются:

1. `Process` с устойчивой идентичностью.
2. Первичная `AnalysisUnit`, связанная с исходной строкой.
3. `ProcessAnalysisCard`, объединяющая facts, evidence, DQ, вопросы, конфликты, risks, blockers и score snapshots.

Scoring всегда выполняется для `AnalysisUnit`. После интервью возможна декомпозиция процесса на несколько внутренних AnalysisUnit без изменения Registry, RegistryVersion или SourceRow.

## 9. Fact и evidence model

### 9.1. Статус факта

- `Confirmed`;
- `Derived`;
- `Inferred`;
- `Unknown`.

Статус хранится независимо от `source_type`. Неизвестное значение представляется `null`.

Минимальные `source_type`: `registry`, `calculated`, `interview`, `document`, `system_data`, `llm_hypothesis`; роль источника хранится отдельным атрибутом.

### 9.2. Источник и provenance

Каждый факт имеет `SourceReference`. Для `Derived` дополнительно обязательна `Derivation`, содержащая ссылки на входные факты, rule/formula ID и версию преобразования. Derived fact допустим только при допустимых подтверждённых входах.

### 9.3. LLM-extracted facts

LLM создаёт `FactCandidate` со статусом `Inferred`. Только отдельное действие человека создаёт `Confirmation` и допускает превращение кандидата в подтверждённый факт. До подтверждения кандидат не является входом formal scoring.

## 10. Rule Engine

Rule Engine:

- загружает и валидирует `scoring_config_v1.1.yaml`;
- рассчитывает только 10 утверждённых критериев V1–V5 и F1–F5;
- применяет thresholds, enum mappings, missing behavior и evidence rules из конфигурации;
- формирует `CriterionResult` и неизменяемый `ScoreSnapshot`;
- рассчитывает `full_score`, `known_sum`, `coverage` и `min/max range` для обеих осей;
- сохраняет explanation trace, `methodology_version` и `input_snapshot_id`;
- при одинаковых входном snapshot и версии методики возвращает одинаковый результат.

Rule Engine не вызывает LLM и не принимает LLM-оценку как formal score.

### 10.1. Стадии

| Стадия | Допустимые данные | Полнота |
|---|---|---|
| `PRE_SCORE` | Confirmed Registry facts и Derived только из них | может быть неполной |
| `INTERVIEW_SCORE` | подтверждённые факты интервью/документов/систем и допустимые Derived | может быть неполной |
| `VERIFIED_SCORE` | все 10 результатов `1–5`, только Confirmed/Derived evidence, нет влияющих unresolved conflicts | обязательна полная |

При любом `null` статус `VERIFIED_SCORE` запрещён. Подтверждённый blocker может сосуществовать с VERIFIED SCORE.

### 10.2. Обязательные правила 1.1

- F1: `confirmed_no_access → 1`, `unknown → null`.
- F2–F5: при пересечении подтверждённых применимых правил выбирается минимальный score; неизвестное ограничение создаёт `RISK_REQUIRES_VERIFICATION`, но не штрафует автоматически; при недостатке данных score равен `null`.
- V3: подтверждённый `manual_work_share_percent` заменяет proxy в текущем расчёте; proxy остаётся в PRE history и его несовпадение с фактом не создаёт conflict.
- Конфликт подтверждённых фактических источников делает затронутый результат `null` до разрешения.

## 11. Score snapshots и версия входов

Перед расчётом Orchestrator создаёт неизменяемый input snapshot допустимых facts, derivations, conflict states и evidence references. Rule Engine связывает результат с:

- `input_snapshot_id`;
- `methodology_version`;
- версией scoring-конфигурации;
- временем расчёта;
- стадией scoring.

Новый факт, confirmation, conflict resolution или новая версия методики создают новый snapshot и новый расчёт. Исторические результаты не перезаписываются.

## 12. LLM Agent

LLM Agent получает от Orchestrator только необходимый контекст карточки и может:

- сформировать вопросы по missing facts;
- вести интервью;
- извлечь `FactCandidate` из ответа;
- указать возможное противоречие или риск;
- подготовить текстовое объяснение уже рассчитанного результата.

LLM Agent не вычисляет formal score, не изменяет YAML, не подтверждает собственный FactCandidate и не записывает данные в официальный Excel.

## 13. Backend / Orchestrator

Backend/Orchestrator:

- управляет загрузками, состояниями обработки и версиями;
- вызывает Parser, Mapping, DQ и Card Builder;
- формирует input snapshots и вызывает Rule Engine;
- организует интервью и human confirmation;
- хранит карточки, результаты и audit events;
- предоставляет UI необходимые операции;
- проверяет полномочия и идемпотентность команд.

Этот документ определяет концептуальные взаимодействия, но не полный REST API.

## 14. UI

MVP включает экраны:

- загрузка реестра;
- список процессов;
- карточка процесса;
- интервью;
- подтверждение фактов;
- матрица `Ценность × Реализуемость`.

UI явно различает confirmed facts, LLM candidates, unknowns, conflicts, risks, blockers и стадии score. Пользователь видит evidence и explanation trace, но не может редактировать официальный Registry через интерфейс.

## 15. Концептуальные интеграционные контракты

| Откуда → куда | Передаётся | Ключевой инвариант |
|---|---|---|
| Parser → Mapping | workbook/sheet/cell representation | нет пересчёта и записи в Excel |
| Mapping → Data Quality | canonical values, row types, source references | профиль и версия указаны |
| Mapping → Card Builder | только scoring-eligible PROCESS rows | traceability до SourceCell |
| Card/Orchestrator → Rule Engine | input snapshot допустимых facts/evidence | LLM candidate исключён |
| Rule Engine → Orchestrator | criterion results, axes, trace, risks/blockers | детерминированность и версия |
| Orchestrator ↔ LLM Agent | вопросы, ответы, candidates | confirmation выполняет человек |
| Orchestrator → UI | cards, snapshots, DQ, conflicts, decisions | официальный источник read-only |

Детальные endpoint definitions и физическая SQL-схема не входят в этот документ.

## 16. Versioning и audit

Система сохраняет:

- checksum и метаданные исходного файла;
- `mapping_version` и `fingerprint_version`;
- `methodology_version` и версию YAML;
- `input_snapshot_id`;
- actor, timestamp, before/after для human confirmation и conflict resolution;
- создание facts/candidates/derivations, запуск расчёта и статус результата;
- все `AuditEvent`, необходимые для восстановления происхождения решения.

Изменение mapping или методики не переписывает исторические сущности и snapshots.

## 17. Нефункциональные требования

### 17.1. Детерминированность

Одинаковые нормализованные входы, input snapshot и methodology version дают одинаковый formal result.

### 17.2. Объяснимость

Каждый criterion result содержит rule ID, входы, evidence, применённое правило, score/null и причину.

### 17.3. Трассируемость

Для Registry facts сохраняется путь до RegistryVersion, SourceSheet, SourceRow и SourceCell. Для Derived facts сохраняется полный derivation graph.

### 17.4. Безопасность и целостность

Оригинальный файл недоступен для записи; команды изменения аналитического слоя авторизуются и аудируются.

### 17.5. Проверка конфигурации

При старте Rule Engine выполняется completeness validation YAML: наличие всех 10 criterion IDs и rule IDs, thresholds, enums, inputs, units, missing/evidence/stage policies, aggregation, interpretation levels, blocker/risk rules и version metadata. Невалидная конфигурация блокирует расчёт, а не приводит к значениям по умолчанию.

## 18. Границы MVP

В MVP отсутствуют:

- RAG;
- Multi-Agent;
- BPMN;
- проектирование TO BE;
- изменение или пересчёт Excel;
- полный публичный REST API;
- детальная физическая схема PostgreSQL;
- новые критерии или альтернативная scoring methodology.

Разработка выполняется небольшими проверяемыми вертикальными slices согласно `MVP_PASSPORT_AND_BACKLOG.md`.
