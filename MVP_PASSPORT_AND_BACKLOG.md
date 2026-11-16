# MVP_PASSPORT_AND_BACKLOG.md

# Паспорт MVP и backlog

## ИИ-агент анализа реестра процессов

**Статус документа:** синхронизирован после приёмки Slice 02 и freeze Methodology v2 baseline

**Версия:** 1.1
**Целевой набор пилота:** лист `Лист3` файла `Реестр МЛХ.xlsm`  
**Статус Rule Engine:** `METHODOLOGY 1.1 ACTIVE; SLICE 02 PRE-SCORE IMPLEMENTED / ACCEPTED / FROZEN`

**Итоговый статус проекта:** `SLICE 01/02 DONE / FROZEN; METHODOLOGY V2 FUTURE_NOT_ACTIVE; RUNTIME V2 DESIGN NEXT`

---

## Нормативные источники

Документ подготовлен на основании:

1. `PROJECT_CONTEXT.md`;
2. `TECH_SPEC.md`;
3. `SCORING_ENGINE_SPEC.md`, методика 1.1;
4. `REGISTRY_SCHEMA.md`;
5. `TEST_CASES.md`;
6. утверждённых решений по профилю МЛХ, идентификаторам, evidence и чтению Excel;
7. `Реестр МЛХ.xlsm` как официального read-only источника и тестовой книги.

`REGISTRY_MAPPING_MLH.md` создан и является нормативным профилем импорта МЛХ; повторное создание не требуется. Файл `МЛХ_последняя_редакция_с_изменениями.xlsx` не является официальным реестром и может использоваться только как дополнительный тестовый пример результатов обследования.

При актуализации состояния и roadmap приоритет: `PROJECT_CONTEXT.md` → `TECH_SPEC.md` → frozen Methodology v2 package → настоящий backlog. Для текущего runtime scoring authority остаётся `SCORING_ENGINE_SPEC.md`, executable config — `scoring_config_v1.1.yaml`.

Будущий normative baseline: `SCORING_ENGINE_SPEC_V2_DRAFT.md` v0.4 — FROZEN; `SCORING_CONFIG_V2_DESIGN.md` v0.1 — APPROVED / independent review PASS; `scoring_config_v2.0.yaml` v2.0.0 — FROZEN. Их исторические формулировки о следующих этапах читаются с учётом актуального `PROJECT_CONTEXT.md`. Они не заменяют текущий runtime v1.1. Methodology v2 = `FUTURE_NOT_ACTIVE`; runtime v2 ещё не реализован, runtime conformance = `NOT_YET_COMPLETED`, production activation отсутствует. Frozen Slice 02 contract — `SLICE_02_CONTRACT_PACKAGE.md`; evidence приёмки — `SLICE_02_ACCEPTANCE_RECORD.md`.

---

# 1. Цель MVP

Создать первую работающую версию системы, которая принимает официальный реестр процессов без изменения исходного файла и помогает эксперту последовательно пройти путь от загрузки Excel до объяснимой приоритизации процессов.

MVP должен доказать, что система способна:

1. безопасно прочитать реестр МЛХ;
2. выделить самостоятельные процессы на выбранном листе;
3. сформировать внутренние карточки анализа;
4. выявить отсутствующие, некорректные и противоречивые данные;
5. рассчитать доступную часть PRE-SCORE по методике 1.1;
6. сформировать вопросы для получения недостающих сведений;
7. сохранить ответы и подтверждение фактов отдельно от реестра;
8. пересчитать INTERVIEW-SCORE или VERIFIED SCORE;
9. показать процессы на матрице «Ценность × Реализуемость»;
10. сохранить происхождение каждого факта и объяснение каждого балла.

MVP не принимает решение вместо человека. Его результат — проверяемая аналитическая основа для выбора кандидатов на автоматизацию или реинжиниринг.

---

# 2. Что входит в MVP

## 2.1. Работа с реестром

- загрузка `.xlsx` и `.xlsm`;
- сохранение оригинальных байтов файла и checksum;
- создание версии загрузки;
- просмотр доступных листов;
- выбор листа пользователем;
- профиль МЛХ с листом `Лист3` по умолчанию;
- чтение заголовков и сохранённых значений ячеек;
- отсутствие пересчёта Excel;
- хранение формулы и cached result отдельно;
- поддержка конфигурируемого mapping;
- исключение заголовков, агрегирующих, итоговых и неопределённых строк из scoring;
- сохранение связи аналитических данных с исходной строкой и ячейкой.

## 2.2. Аналитический слой

- `Process Analysis Card` для каждого самостоятельного процесса;
- первичная `AnalysisUnit` для scoring;
- возможность после интервью декомпозировать процесс на внутренние AnalysisUnit;
- исходные и нормализованные поля;
- Confirmed, Derived, Inferred и Unknown facts;
- provenance и evidence;
- Data Quality Issues;
- missing data;
- conflicts;
- risks и blockers;
- вопросы и ответы интервью;
- история подтверждений и изменений;
- формирование и исследование нескольких гипотез улучшения одного процесса, углублённый сбор и подтверждение данных. Это границы MVP, а не утверждение об их реализации в Slice 02.

## 2.3. Scoring

- Rule Engine по `SCORING_ENGINE_SPEC.md`, версия 1.1;
- десять утверждённых критериев VALUE V1–V5 и FEASIBILITY F1–F5;
- текущая реализация Slice 02 — deterministic PRE-SCORE v1.1;
- INTERVIEW-SCORE и VERIFIED-SCORE — целевые стадии дальнейшего развития MVP/runtime; в текущем Slice 02 они не реализованы;
- независимые оси VALUE и FEASIBILITY;
- `known_sum`, coverage и range при неполных данных;
- отдельное хранение BLOCKER и RISK;
- explainability для каждого критерия;
- версия методики и input snapshot;
- воспроизводимый повторный расчёт.

## 2.4. Работа LLM Agent

- анализ текстовых полей и подтверждённых фактов;
- выявление пробелов и потенциальных противоречий;
- формирование вопросов по missing facts, conflicts, risks и blockers;
- структурирование ответов как кандидатов в факты;
- создание LLM hypotheses с обязательной маркировкой `Inferred`;
- подготовка понятного объяснения результата;
- запрет прямого изменения formal score.

## 2.5. Пользовательский интерфейс

- загрузка реестра;
- список процессов;
- карточка процесса;
- интервью;
- подтверждение фактов;
- просмотр scoring и evidence;
- матрица «Ценность × Реализуемость»;
- экспорт аналитического результата без изменения реестра.

## 2.6. Минимальные системные функции

- базовая аутентификация;
- разграничение действий просмотра, подтверждения и администрирования;
- аудит значимых действий;
- журнал ошибок обработки;
- конфигурирование mapping и версии scoring;
- повторный запуск обработки и scoring без потери истории.

---

# 3. Что явно не входит в MVP

- изменение официального Excel;
- добавление аналитических колонок в исходный реестр;
- автоматическая запись результатов обратно в Excel;
- RAG;
- Multi-Agent архитектура;
- BPMN;
- моделирование AS IS или TO BE;
- кадровая оптимизация и расчёт избытка или дефицита персонала;
- автоматическое проектирование нового процесса;
- полностью автономное интервью без участия пользователя;
- автоматическое утверждение процесса к реализации;
- обучение собственной LLM;
- автоматическая калибровка или изменение шкал 25/25;
- новые критерии scoring;
- использование суммы `/50` как основной модели приоритизации;
- полноценная корпоративная система управления процессами;
- универсальные mapping-профили для всех возможных реестров;
- интеграции с внешними ведомственными системами;
- OCR сканов и изображений;
- полнотекстовая база нормативных документов;
- сложная BI-аналитика;
- детальная физическая схема PostgreSQL;
- полный публичный REST API;
- мобильное приложение;
- real-time совместное редактирование.

---

# 4. Пользовательские роли

| Роль | Основные действия | Ограничения |
|---|---|---|
| Аналитик | Загружает реестр, запускает анализ, просматривает карточки, проводит интервью, фиксирует ответы, формирует вывод | Не может менять formal scoring rules |
| Эксперт процесса | Подтверждает бизнес-факты, отвечает на вопросы, разрешает содержательные конфликты | Не изменяет исходный реестр через систему |
| Технический эксперт | Подтверждает данные, интеграции, технические ограничения, возможность MVP и измеримость | Подтверждает только сведения своей компетенции |
| Владелец решения | Просматривает матрицу, сравнивает процессы, принимает решение о дальнейшем обследовании или пилоте | Не получает автоматического решения от агента |
| Администратор | Управляет пользователями, mapping-профилями и активной версией методики | Не изменяет историю расчётов задним числом |
| Система | Парсит, проверяет, рассчитывает, хранит версии и аудит | Не подтверждает LLM-гипотезы от имени человека |

В небольшом пилоте один человек может совмещать роли аналитика и администратора. Права и происхождение подтверждения при этом должны сохраняться раздельно.

---

# 5. Основной end-to-end User Flow

1. Аналитик загружает `Реестр МЛХ.xlsm`.
2. Система сохраняет оригинал, checksum, имя файла и время загрузки.
3. Пользователь выбирает mapping-профиль МЛХ и лист. По умолчанию выбран `Лист3`.
4. Registry Parser читает книгу без пересчёта формул.
5. Registry Mapping определяет заголовки, колонки и строки-кандидаты.
6. Строки классифицируются как `PROCESS`, `GROUP_HEADER`, `AGGREGATE`, `TOTAL`, `EMPTY` или `UNKNOWN`.
7. Только `PROCESS` получает `scoring_eligible = true`.
8. Для каждой строки-процесса создаются `source_row_id`, `source_fingerprint`, `process_id`, Process Analysis Card и первичная AnalysisUnit.
9. Data Quality проверяет обязательные поля, типы, cached results, неоднозначные значения, возможные дубли и конфликты.
10. Из допустимых Registry facts создаются Confirmed facts. Детерминированные преобразования создают Derived facts.
11. Rule Engine рассчитывает PRE-SCORE. Неизвестные критерии остаются `null`.
12. Пользователь видит список процессов, coverage, ranges, risks и missing facts.
13. LLM Agent получает только разрешённый аналитический контекст и формирует вопросы.
14. Аналитик проводит интервью с подходящим экспертом.
15. LLM Agent структурирует ответ как кандидат в факт, но этот факт не участвует в scoring до подтверждения человеком.
16. Уполномоченный пользователь подтверждает, отклоняет или исправляет кандидат.
17. Backend создаёт новую версию карточки и input snapshot.
18. Rule Engine выполняет повторный расчёт и формирует INTERVIEW-SCORE.
19. При наличии всех десяти критериев 1–5, допустимого evidence и отсутствии влияющих конфликтов формируется VERIFIED SCORE.
20. Пользователь открывает матрицу «Ценность × Реализуемость», фильтрует процессы и изучает объяснение.
21. Владелец решения вручную фиксирует дальнейшее действие: дополнительное обследование, кандидат на MVP, стратегический проект или низкий приоритет.
22. Система сохраняет решение как действие человека, не как вывод Rule Engine.

---

# 6. Основные экраны

## 6.1. Загрузка реестра

**Показывает:**

- поле загрузки файла;
- допустимые форматы `.xlsx` и `.xlsm`;
- выбранный mapping-профиль;
- список листов после чтения метаданных;
- лист по умолчанию;
- checksum и версию загрузки;
- результат проверки структуры;
- ошибки и предупреждения.

**Действия:** загрузить, выбрать лист, запустить parsing, отменить обработку.

**Критические состояния:** повреждённый файл, неподдерживаемый формат, отсутствие целевого листа, несовпадение заголовков, ошибка чтения workbook.

## 6.2. Список процессов

**Показывает:**

- название процесса;
- источник: файл, лист и строка;
- row type;
- VALUE и FEASIBILITY либо ranges;
- отдельный coverage для каждой оси;
- PRE / INTERVIEW / VERIFIED;
- количество missing facts, conflicts, risks и blockers;
- состояние анализа.

**Действия:** поиск, сортировка, фильтрация, переход в карточку, массовый запуск PRE-SCORE, экспорт аналитической таблицы.

Точный score не показывается как окончательный, если ось содержит `null`.

## 6.3. Карточка процесса

**Разделы:**

1. исходная строка реестра;
2. нормализованные поля;
3. AnalysisUnit;
4. facts и evidence;
5. Data Quality Issues;
6. criteria VALUE;
7. criteria FEASIBILITY;
8. coverage и ranges;
9. conflicts;
10. risks и blockers;
11. questions;
12. история score snapshots;
13. объяснение результата.

Из карточки всегда можно перейти к координате исходной ячейки, но нельзя изменить оригинальный Excel.

## 6.4. Интервью

**Показывает:**

- вопросы, сгруппированные по missing facts, conflicts, risks и blockers;
- причину вопроса;
- связанный criterion;
- рекомендуемую роль респондента;
- приоритет вопроса;
- поле ответа;
- источник и респондента;
- статус ответа.

**Действия:** сохранить черновик, завершить ответ, создать fact candidate, перейти к подтверждению.

## 6.5. Подтверждение фактов

**Показывает:**

- исходный ответ;
- предложенное структурированное значение;
- единицу измерения;
- источник;
- затрагиваемые критерии;
- возможный конфликт;
- статус `Inferred`, `Confirmed`, `Rejected` или `Requires correction`.

**Действия:** подтвердить, исправить и подтвердить, отклонить, запросить уточнение.

До подтверждения LLM-extracted fact не передаётся Rule Engine как допустимый input.

## 6.6. Матрица «Ценность × Реализуемость»

**Показывает:**

- VALUE по вертикальной оси;
- FEASIBILITY по горизонтальной оси;
- отдельную точку для процесса только при наличии точных значений обеих осей;
- диапазон или специальное состояние для неполных оценок;
- статус score;
- наличие blocker;
- фильтры по министерству, статусу, coverage, risk и blocker.

**Действия:** открыть карточку, сравнить процессы, экспортировать представление.

BLOCKER не удаляет точку и не обнуляет score. Процесс с BLOCKER получает отдельную визуальную маркировку.

---

# 7. Компоненты системы

## 7.1. Registry Parser

Читает Excel как источник байтов, листов, ячеек, формул и cached values. Не определяет бизнес-смысл полей и не пересчитывает книгу.

## 7.2. Registry Mapping

Применяет mapping-профиль, определяет заголовки, диапазон данных, соответствие колонок, тип строки и нормализованные поля.

## 7.3. Data Quality

Проверяет пропуски, типы, Excel errors, отсутствие cached result, неоднозначность, конфликты, возможные дубли и готовность данных к scoring.

## 7.4. Process Analysis Card

Собирает внутреннее представление процесса: source data, facts, evidence, AnalysisUnit, quality issues, questions, scores, risks, blockers и историю.

## 7.5. Rule Engine

Валидирует evidence и детерминированно применяет правила методики 1.1. Не анализирует свободный текст и не обращается к LLM.

## 7.6. LLM Agent

Работает с текстом, вопросами, кандидатами в факты и объяснениями. Не выставляет formal score и не подтверждает собственные выводы.

## 7.7. Backend / Orchestrator

Управляет последовательностью операций, версиями карточек, правами, подтверждениями, вызовами Rule Engine и LLM Agent, аудитом и обработкой ошибок.

## 7.8. Database

Хранит метаданные реестров, карточки, факты, evidence, вопросы, ответы, score snapshots, конфигурации и аудит. В паспорте фиксируются только логические сущности, без физической схемы.

## 7.9. Frontend

Предоставляет управляемый пользовательский flow от загрузки до матрицы, показывает неопределённость и не маскирует `null` как ноль или точную оценку.

---

# 8. Границы ответственности компонентов

| Операция | Ответственный компонент | Не должен делать |
|---|---|---|
| Чтение workbook | Registry Parser | Пересчитывать, сохранять или исправлять Excel |
| Выбор колонок и строк | Registry Mapping | Рассчитывать scoring |
| Проверка качества | Data Quality | Подменять missing значением по умолчанию |
| Сбор аналитического состояния | Process Analysis Card | Изменять source row |
| Расчёт 25/25 | Rule Engine | Читать свободный текст, вызывать LLM, придумывать facts |
| Формирование вопросов | LLM Agent | Подтверждать свои facts или менять score |
| Подтверждение facts | Пользователь через Backend | Переписывать происхождение факта |
| Управление flow и версиями | Backend / Orchestrator | Скрывать ошибки компонентов |
| Долговременное хранение | Database | Выполнять бизнес-решения |
| Представление результата | Frontend | Показывать неполный score как точный |
| Решение о пилоте | Владелец решения | Делегировать решение агенту автоматически |

Ключевой поток данных однонаправленный:

```text
Official Registry
→ Parser
→ Mapping
→ Data Quality / Process Analysis Card
→ Rule Engine
→ Result
→ LLM Explanation / User Interface
```

Ответы интервью проходят отдельный контур подтверждения:

```text
Interview Answer
→ LLM Fact Candidate
→ Human Confirmation
→ Confirmed Fact
→ New Input Snapshot
→ Rule Engine
```

---

# 9. Основные сущности данных

Детальная физическая структура БД на этом этапе не определяется.

| Сущность | Назначение |
|---|---|
| Registry | Логический официальный реестр |
| RegistryVersion | Конкретная загрузка с checksum и оригинальным файлом |
| MappingProfile | Версионированные правила чтения конкретного типа реестра |
| SourceSheet | Метаданные листа Excel |
| SourceRow | Строка конкретной загрузки с `source_row_id` |
| SourceCell | Raw value, formula, cached value, normalized value и координата |
| Process | Устойчивый внутренний объект с `process_id` |
| SourceFingerprint | Средство сопоставления процесса между версиями реестра |
| AnalysisUnit | Единица scoring, первичная или созданная декомпозицией |
| ProcessAnalysisCard | Текущее аналитическое представление AnalysisUnit |
| Fact | Значение со статусом Confirmed, Derived, Inferred или Unknown |
| SourceReference | Ссылка на реестр, документ, интервью, систему или эксперта |
| Derivation | Правило, версия и входные facts для Derived fact |
| DataQualityIssue | Missing, invalid, Excel error, ambiguity и другие проблемы |
| Conflict | Противоречие между источниками и его влияние на scoring |
| Question | Вопрос по missing, conflict, risk или blocker |
| InterviewSession | Контекст интервью и респондент |
| InterviewAnswer | Ответ с источником и статусом обработки |
| FactCandidate | Структурированное предложение LLM до подтверждения |
| Confirmation | Действие человека над fact candidate |
| CriterionResult | Score, rule_id, evidence, missing facts и conflict одного критерия |
| ScoreSnapshot | PRE, INTERVIEW или VERIFIED для конкретного input snapshot |
| Risk | Подтверждённое или проверяемое ограничение |
| Blocker | Подтверждённое критическое ограничение отдельно от score |
| HumanDecision | Решение ответственного лица о дальнейшем действии |
| AuditEvent | Кто, когда и что изменил или подтвердил |

---

# 10. Основные интеграционные контракты между компонентами

Контракты описаны концептуально и не определяют полный REST API.

| Отправитель → получатель | Вход | Выход | Обязательные гарантии |
|---|---|---|---|
| Upload → Parser | Оригинальные байты, filename, checksum | Workbook metadata, sheets, source cells | Без изменения и пересчёта файла |
| Parser → Mapping | Листы, координаты, raw/formula/cached values | Нормализованные поля и row candidates | Сохранение source coordinates |
| Mapping → Data Quality | Source rows, row types, normalized values | Issues, warnings, scoring eligibility | UNKNOWN и ошибки не маскируются |
| Mapping → Card Builder | PROCESS rows и source references | Process, AnalysisUnit, initial card | `process_id` не равен номеру строки |
| Card → Rule Engine | Structured facts, statuses, evidence, conflicts, methodology version | Criterion results, axis results, risks, blockers | Никакого свободного текста как score input |
| Rule Engine → Backend | Deterministic result и explanation metadata | Версионированный score snapshot | Одинаковый snapshot даёт одинаковый результат |
| Card / DQ → LLM Agent | Missing facts, conflicts, risks, разрешённый текстовый контекст | Questions, hypotheses, fact candidates, explanation draft | Каждый вывод LLM маркируется |
| LLM Agent → Confirmation | Fact candidate, source fragment, confidence | Представление для человека | Кандидат не участвует в scoring |
| Confirmation → Card | Решение пользователя, исправленное значение, source | Confirmed/Rejected fact и audit event | Автор и время обязательны |
| Backend → Frontend | View models карточек, списков и матрицы | Пользовательское представление | `null`, range и blocker отображаются явно |
| Frontend → Backend | Команда пользователя и actor context | Результат операции | Проверка полномочий и аудит |

Минимальный контракт Rule Engine должен включать:

```text
analysis_unit_id
input_snapshot_id
methodology_version
structured_facts
fact_statuses
evidence
conflicts
```

Минимальный результат Rule Engine должен включать:

```text
score_status
value criteria / score / known_sum / coverage / range
feasibility criteria / score / known_sum / coverage / range
rule_id and evidence for every criterion
missing_facts
conflicts
risks
blockers
```

---

# 11. Текущий baseline и ближайший порядок работ

## 11.1. Завершённое состояние и статусы

| Область | Статус | Граница готовности |
|---|---|---|
| Slice 01 | DONE / FROZEN | Read-only ingestion → карточка → V1/V2 и неполная ось; исторический scope сохранён в §20 |
| Slice 02 | DONE / IMPLEMENTED / ACCEPTED / FROZEN | Все десять deterministic PRE-SCORE evaluators v1.1 и Process Card; implementation commit `0257430e87ec37bb560993fd2cab7490b133b513` |
| Runtime v1.1 | CURRENT / ACTIVE | `SCORING_ENGINE_SPEC.md` + `scoring_config_v1.1.yaml`; existing backend/frontend |
| Scoring spec v2 v0.4 | FROZEN | `SCORING_ENGINE_SPEC_V2_DRAFT.md`; normative authority будущего scoring |
| Config design v2 v0.1 | APPROVED / review PASS | `SCORING_CONFIG_V2_DESIGN.md`; CONFIG_DESIGN_GAP: NONE |
| Config v2 v2.0.0 | FROZEN | `scoring_config_v2.0.yaml`; B-01/B-02 CLOSED, rule catalog 90/90 PASS |
| Runtime v2 | PLANNED / NOT IMPLEMENTED | Freeze документов/config не является runtime implementation |
| Runtime conformance v2 | PLANNED / NOT_YET_COMPLETED | Отдельный acceptance gate до integration |
| Production activation v2 | PLANNED / NOT ACTIVE | Methodology v2 = FUTURE_NOT_ACTIVE; switch не выполнен |

DONE означает завершение указанного scope, а не всего epic или MVP. FROZEN / APPROVED описывает принятый артефакт и не означает ACTIVE runtime. NEXT — ближайшая задача; PLANNED — последующая работа с зависимостями; DEFERRED / OUT OF MVP — вне текущего MVP без отдельного решения.

## 11.2. Последовательность после Slice 02

```text
Slice 02 / v1.1 complete
→ Methodology v2 baseline frozen
→ runtime v2 preparation / design + review (NEXT)
→ runtime v2 implementation (PLANNED)
→ runtime conformance acceptance gate (PLANNED)
→ integration with existing application (PLANNED)
→ migration / explicit activation (PLANNED)
```

Новые work packages не получают Slice numbers до утверждения runtime design: `TBD AFTER RUNTIME DESIGN`. Slice 01/02 не перенумеровываются. Ранее намеченный Slice 03 evidence loop остаётся неутверждённым PLANNED scope (§21), а не следующим implementation contract.

## 11.3. Work packages v2

| Workstream | Статус / зависимости | Что нужно сделать | Acceptance / gate |
|---|---|---|---|
| A. Runtime v2 design | NEXT; frozen v2 package | Создать и провести review `SCORING_RUNTIME_DESIGN_V2.md`: config loading/validation, deterministic execution, dependency evaluation, evidence/context handling, blocker evaluation, aggregation, evidence stages, compatibility, recalculation/reuse, error/fail-closed semantics | Design принят после review; scope и проверяемые implementation packages согласованы. Это DESIGN task; код и новые methodology decisions не входят |
| B. Config Loader / Validator | PLANNED; после принятого A | Загрузка frozen `scoring_config_v2.0.yaml`; schema/structural validation; rule/reference validation; fail-closed behavior; version identity checks | Невалидный config отвергается целиком без defaults/частичной активации; version identities и ссылки проверяются по frozen package |
| C. Deterministic Rule Engine v2 | PLANNED; после A и B | Исполнение frozen rules V1–V5, F1–F5; evidence/context, blockers, aggregation, evidence stages, dependency closure, compatibility, recalculation/reuse и invalidation | Реализация соответствует frozen package без изменения methodology ради удобства; реализация сама по себе не закрывает D и не активирует v2 |
| D. Conformance testing | PLANNED; после B/C, до E | Normative cases frozen spec §20; boundary cases; B-01/B-02 regressions; deterministic repeatability; collection-order invariance; invalid config rejection; evidence/context/conflict cases; reuse/recalculation/invalidation | Отдельный runtime conformance acceptance gate: зафиксирован PASS для runtime по frozen spec/config. Static/config review PASS его не заменяет; до PASS integration не начинается |
| E. Integration with existing application | PLANNED; только после D PASS | Интеграция runtime с existing backend; API/contracts при необходимости; frontend adaptation; сохранение historical v1.1 results | Интеграция проверена; historical v1.1 не перезаписывается и не получает silent relabel v1.1 → v2; готовность integration не является activation |
| F. Migration / activation | PLANNED; после D и E | Подготовить migration strategy, activation criteria, rollback/compatibility и explicit switch v1.1 → v2 | Отдельное решение об activation после выполнения критериев; до явного switch v1.1 остаётся CURRENT, v2 — FUTURE_NOT_ACTIVE. Freeze config ≠ activation |

Таблица определяет задачи и acceptance boundaries, а не архитектуру, API/DTO, schema, loader technology или способ исполнения rules. Эти решения не принимаются ради roadmap и требуют отдельного design/review. В этой синхронизации runtime design не создаётся.

## 11.4. Остальной MVP

PLANNED: evidence collection / interview, human confirmation, гипотезы и углублённое обследование, LLM support, матрица, аналитический экспорт, access control, расширение аудита, hardening и итоговая приёмка. Выполненные части ingestion, карточки, PRE-SCORE и отображения результата остаются DONE; оставшиеся части общих epics не считаются завершёнными из-за приёмки Slice 02. Их уточнение и нарезка — после runtime design, с сохранением scope §§1–3.

DEFERRED / OUT OF MVP: BPMN, AS-IS, TO-BE, кадровая оптимизация/расчёт избытка или дефицита персонала, внешние production integrations и остальные исключения §3. Интеграция E означает existing application, а не добавление внешних production integrations.

---

# 12. Общий backlog

## 12.1. Приоритеты

| Приоритет | Значение |
|---|---|
| P0 | Обязательно для MVP |
| P1 | Нужно для удобной пилотной эксплуатации |
| P2 | Допустимо перенести после MVP |

## 12.2. Epic-level backlog

Статусы относятся к текущему scope; порядок ближайших v2 работ задаёт §11.3. PLANNED в широком epic не открывает повторно его завершённую часть Slice 01/02.

| Epic | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет | Статус |
|---|---|---|---|---|---|---|
| E0 Требования | Создать и утвердить `REGISTRY_MAPPING_MLH.md` | BSA | Утверждённые решения | Описаны лист, заголовки, 19 колонок, row types, cached values и IDs | P0 | DONE — Slice 01/02 scope |
| E0 Требования | Синхронизировать нормативные документы | BSA | Паспорт MVP | Между документами нет противоречий по статусам, facts, IDs и Excel | P0 | DONE — текущий baseline; дальнейшая синхронизация по принятым designs PLANNED |
| E0 Требования | Подготовить машиночитаемую scoring configuration 1.1 | BSA + Backend | `SCORING_ENGINE_SPEC.md` | Конфигурация проходит completeness validation | P0 | DONE — Slice 01/02 scope |
| E1 Ingestion | Реализовать read-only загрузку Excel | Backend | Mapping profile | Оригинал и checksum сохраняются, книга не изменяется | P0 | DONE — Slice 01/02 scope |
| E1 Ingestion | Реализовать Parser и выбор листа | Backend | Excel fixture | Доступны листы, default `Лист3`, пересчёт отсутствует | P0 | DONE — Slice 01/02 scope |
| E1 Ingestion | Реализовать Mapping и row classification | Backend + BSA | Parser, mapping profile | Только PROCESS попадает в scoring | P0 | DONE — Slice 01/02 scope |
| E2 Quality | Реализовать Data Quality rules | Backend + QA | Parsed rows | Missing, invalid, errors, ambiguity и conflicts отображаются | P0 | PLANNED — расширение MVP; принятая часть Slice 01/02 DONE |
| E3 Cards | Создать Process Analysis Card и AnalysisUnit | Backend | Mapping | Каждая PROCESS row имеет прослеживаемую карточку | P0 | DONE — Slice 01/02 scope |
| E4 Scoring | Реализовать Rule Engine 1.1 | Backend / Rule Engine developer | Scoring config | Все критерии детерминированы и объяснимы | P0 | DONE — все PRE evaluators v1.1; INTERVIEW/VERIFIED workflow PLANNED |
| E5 Interview | Реализовать questions и interview workflow | Backend + Frontend + LLM developer | Cards, DQ | Ответ не влияет на score до подтверждения | P0 | PLANNED |
| E6 Confirmation | Реализовать human confirmation | Backend + Frontend | Interview | Каждое подтверждение имеет actor, source и audit event | P0 | PLANNED |
| E7 Prioritization | Реализовать список и матрицу | Frontend + Backend + Designer | Scoring results | Оси раздельны, incomplete и blocker отображаются корректно | P0 | PLANNED — расширение MVP; принятая часть Slice 01/02 DONE |
| E8 Export | Реализовать аналитический экспорт | Backend + Frontend | List, cards | Экспорт не меняет официальный реестр | P1 | PLANNED |
| E9 Audit | Реализовать версии и аудит | Backend | Все изменяющие операции | Можно восстановить происхождение facts и scores | P0 | PLANNED — расширение MVP; принятая часть Slice 01/02 DONE |
| E10 QA | Автоматизировать acceptance suite | QA + разработчики | Вертикальные slices | Все P0 acceptance-тесты проходят | P0 | PLANNED — расширение MVP; принятая часть Slice 01/02 DONE |
| E11 Delivery | Подготовить запуск и демонстрацию | Backend + Frontend + QA | P0 backlog | Система разворачивается по инструкции | P0 | PLANNED — расширение MVP; принятая часть Slice 01/02 DONE |

---

# 13. Исторический backlog Rule Engine v1.1 и оставшийся scope

RE-01–RE-22 сохраняют исходную нумерацию. DONE ограничен принятым deterministic PRE-SCORE Slice 02; это не утверждение о готовности interview/confirmation и VERIFIED workflow или о реализации v2. Новые v2 задачи вынесены в §11.3; v1.1 задачи не нужно реализовывать заново.

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет | Статус |
|---|---|---|---|---|---|---|
| RE-01 | Реализовать загрузку scoring configuration 1.1 | Rule Engine developer | Машиночитаемая конфигурация | Версия и все rule_id доступны движку | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-02 | Реализовать completeness validator | Rule Engine developer | RE-01 | При отсутствии критерия, шкалы, input или rule_id возвращается `SCORING_DISABLED` | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-03 | Реализовать validation facts и evidence | Rule Engine developer | Canonical fact contract | Inferred и Unknown не участвуют в formal scoring | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-04 | Реализовать V1 Frequency | Rule Engine developer | annual_instances | Проверены границы, zero и invalid inputs | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-05 | Реализовать V2 Labor и Derived annual_labor_hours | Rule Engine developer | annual_instances, hours_per_instance | Derived содержит rule version и input fact IDs | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-06 | Реализовать V3 только по Confirmed manual_work_share_percent | Rule Engine developer | Fact/evidence contract, scoring config | Допустимый Confirmed процент даёт score по шкале; отсутствующий, Unknown, неподтверждённый или недопустимый для стадии input даёт null с причиной; V3 proxy запрещён | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-07 | Реализовать V4 Repeatability | Rule Engine developer | Structured inputs | Количественный input имеет установленный приоритет | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-08 | Реализовать V5 Problematicity | Rule Engine developer | Structured inputs | Proxy и fallback применяются только по спецификации | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-09 | Реализовать F1 Data Availability | Rule Engine developer | F1 component facts | `confirmed_no_access = 1`, `unknown = null`, итог по min компонентов | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-10 | Реализовать F2 Integration Simplicity | Rule Engine developer | Integration facts | При пересечении применяется минимальный подтверждённый score | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-11 | Реализовать F3 Technical Feasibility | Rule Engine developer | Technical expert facts | VERIFIED требует допустимого технического источника | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-12 | Реализовать F4 MVP 3 Months | Rule Engine developer | MVP scope facts | Все обязательные inputs известны для VERIFIED | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-13 | Реализовать F5 Measurability | Rule Engine developer | KPI facts | Blocker хранится отдельно от score | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-14 | Реализовать axis aggregation | Rule Engine developer | RE-04–RE-13 | Full score только при пяти известных criteria; иначе known_sum, coverage, range | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-15 | Реализовать PRE / INTERVIEW / VERIFIED gate | Rule Engine developer | Evidence validator | VERIFIED невозможен при null или scoring conflict | P0 | PLANNED — INTERVIEW/VERIFIED workflow; PRE gate DONE |
| RE-16 | Реализовать conflict handling | Rule Engine developer | Conflict contract | Движок не выбирает источник самостоятельно | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-17 | Реализовать Risk / Blocker evaluation | Rule Engine developer | Structured restrictions | Blocker не меняет score и может сосуществовать с VERIFIED | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-18 | Реализовать criterion explanation payload | Rule Engine developer | Criterion results | Для каждого score доступны rule_id, evidence и applied rule | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-19 | Реализовать snapshot/version metadata | Rule Engine developer | Backend snapshot | Результат содержит methodology version и input snapshot | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-20 | Создать unit tests границ всех шкал | Rule Engine developer + QA | RE-04–RE-13 | Проверены значения на границе, ниже и выше границы | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-21 | Создать reproducibility tests | Rule Engine developer + QA | RE-19 | Одинаковый snapshot всегда даёт одинаковый JSON result | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |
| RE-22 | Создать regression fixtures методики 1.1 | QA + BSA | Утверждённые примеры | Изменение config обнаруживается тестами и версией | P0 | DONE — в пределах PRE-SCORE v1.1 / Slice 02 |

---

# 14. Backlog разработчика LLM Agent

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет | Статус |
|---|---|---|---|---|---|---|
| LA-01 | Определить строгий входной контекст LLM Agent | LLM developer + BSA | Card contract | В prompt не передаются лишние данные и formal rules для изменения | P0 | PLANNED |
| LA-02 | Определить structured output schema | LLM developer + Backend | Fact/Question contracts | Невалидный ответ не записывается как fact | P0 | PLANNED |
| LA-03 | Формировать вопросы по missing facts | LLM developer | Rule Engine missing_facts | Каждый вопрос связан с field, criterion, reason и priority | P0 | PLANNED |
| LA-04 | Формировать вопросы по conflicts | LLM developer | Conflict contract | Вопрос показывает варианты без самостоятельного выбора истины | P0 | PLANNED |
| LA-05 | Формировать вопросы по risks и blockers | LLM developer | Risk contract | Указана рекомендуемая роль респондента | P0 | PLANNED |
| LA-06 | Структурировать Interview Answer в FactCandidate | LLM developer | Interview workflow | Candidate содержит value, unit, source fragment и confidence | P0 | PLANNED |
| LA-07 | Гарантировать маркировку LLM outputs как Inferred | LLM developer + Backend | LA-02 | До подтверждения candidate не допускается в scoring | P0 | PLANNED |
| LA-08 | Реализовать explanation draft | LLM developer | Rule Engine result | Объяснение не меняет score и ссылается на criterion results | P1 | PLANNED |
| LA-09 | Реализовать guardrails против выдуманных facts | LLM developer + QA | Output schema | При отсутствии evidence возвращается hypothesis или missing, не Confirmed | P0 | PLANNED |
| LA-10 | Реализовать обработку недоступности LLM | Backend + LLM developer | Orchestrator | Parser, cards и Rule Engine продолжают работать без LLM | P0 | PLANNED |
| LA-11 | Создать prompt regression set | LLM developer + QA + BSA | Типовые интервью | Структура ответов стабильна на контрольном наборе | P0 | PLANNED |
| LA-12 | Проверить утечку служебных и персональных данных | LLM developer + QA | Security rules | В модель уходит только разрешённый контекст | P0 | PLANNED |
| LA-13 | Реализовать наблюдаемость вызовов | LLM developer + Backend | Audit | Сохраняются prompt version, model, latency и result status без скрытых score changes | P1 | PLANNED |

LLM Agent не является отдельной группой агентов. В MVP используется один управляемый LLM-контур с несколькими типами заданий.

---

# 15. Общий backlog Frontend / Backend

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет | Статус |
|---|---|---|---|---|---|---|
| FB-01 | Создать проектный skeleton и локальный запуск | Backend + Frontend | Репозиторий | Команда поднимает систему по одной инструкции | P0 | DONE — принятый scope Slice 01/02 |
| FB-02 | Реализовать хранение оригинального файла и checksum | Backend | File storage decision | Повторная проверка подтверждает неизменность | P0 | DONE — принятый scope Slice 01/02 |
| FB-03 | Реализовать Registry Parser | Backend | Mapping profile | `.xlsx/.xlsm` читаются без пересчёта | P0 | DONE — принятый scope Slice 01/02 |
| FB-04 | Реализовать выбор листа и профиль МЛХ | Backend + Frontend | Parser | Default `Лист3`, пользователь может выбрать другой лист | P0 | DONE — принятый scope Slice 01/02 |
| FB-05 | Реализовать source cell representation | Backend | Parser | Сохраняются raw, formula, cached, normalized и coordinate | P0 | DONE — принятый scope Slice 01/02 |
| FB-06 | Реализовать row classification | Backend | Mapping | UNKNOWN создаёт issue и не получает scoring | P0 | DONE — принятый scope Slice 01/02 |
| FB-07 | Реализовать process identity | Backend | Mapping | source_row_id, process_id и fingerprint разделены | P0 | DONE — принятый scope Slice 01/02 |
| FB-08 | Реализовать Process Analysis Card | Backend | Entities contract | Карточка агрегирует данные без изменения source | P0 | DONE — принятый scope Slice 01/02 |
| FB-09 | Реализовать первичную AnalysisUnit | Backend | Card | Одна scoring unit создаётся на PROCESS row | P0 | DONE — принятый scope Slice 01/02 |
| FB-10 | Реализовать Data Quality pipeline | Backend | Parser, Mapping | Issues сохраняются и доступны UI | P0 | DONE — принятый scope Slice 01/02 |
| FB-11 | Реализовать orchestration PRE-SCORE | Backend | Rule Engine | Snapshot создаётся перед каждым расчётом | P0 | DONE — принятый scope Slice 01/02 |
| FB-12 | Реализовать экран загрузки | Frontend + Designer | Parser flow | Пользователь видит profile, sheet и validation result | P0 | DONE — принятый scope Slice 01/02 |
| FB-13 | Реализовать экран списка процессов | Frontend + Designer | Card summary | Доступны score/range, coverage и filters | P0 | PLANNED — полный scope; часть Slice 01/02 DONE |
| FB-14 | Реализовать карточку процесса | Frontend + Designer | Card view model | Видны source, facts, criteria, evidence и issues | P0 | DONE — принятый scope Slice 01/02 |
| FB-15 | Реализовать экран интервью | Frontend + Backend + Designer | Questions | Ответ связан с вопросом, респондентом и источником | P0 | PLANNED |
| FB-16 | Реализовать подтверждение FactCandidate | Frontend + Backend | Confirmation rules | Confirm, correct, reject и request clarification аудируются | P0 | PLANNED |
| FB-17 | Реализовать повторный scoring | Backend | Confirmation | Новое подтверждение создаёт новый snapshot, старый сохраняется | P0 | PLANNED |
| FB-18 | Реализовать матрицу Value × Feasibility | Frontend + Designer | Full axis results | Нет замены матрицы суммой /50 | P0 | PLANNED |
| FB-19 | Реализовать отображение incomplete results | Frontend | Range contract | Null не показывается как 0; range виден пользователю | P0 | DONE — принятый scope Slice 01/02 |
| FB-20 | Реализовать отображение blocker/risk | Frontend | Risk contract | Blocker визуально отделён от score | P0 | DONE — принятый scope Slice 01/02 |
| FB-21 | Реализовать аналитический экспорт | Backend + Frontend | Result views | Экспорт содержит IDs, axes, coverage, status, blockers и risks | P1 | PLANNED |
| FB-22 | Реализовать basic access control | Backend + Frontend | Roles | Только разрешённые роли подтверждают facts и меняют config | P0 | PLANNED |
| FB-23 | Реализовать audit trail | Backend | Actor context | История значимых действий доступна для проверки | P0 | PLANNED — полный scope; часть Slice 01/02 DONE |
| FB-24 | Реализовать обработку ошибок и повтор операции | Backend + Frontend | Component errors | Частичный сбой не выдаётся как успешный анализ | P0 | PLANNED — полный scope; часть Slice 01/02 DONE |
| FB-25 | Реализовать сопоставление новой версии по fingerprint | Backend | Identity rules | Неоднозначное совпадение не разрешается автоматически | P1 | PLANNED |
| FB-26 | Реализовать декомпозицию AnalysisUnit | Backend + Frontend | Interview loop | Child units не изменяют исходную строку | P1 | PLANNED |
| FB-27 | Подготовить health checks и журналирование | Backend | Runtime | Состояние компонентов диагностируется | P1 | PLANNED |
| FB-28 | Провести accessibility и usability review | Designer + QA + Frontend | Основные экраны | Основной flow понятен аналитику без технических знаний | P1 | PLANNED |

---

# 16. Набор acceptance-тестов

Таблицы §16 сохраняют acceptance baseline v1.1 и полного MVP; наличие сценария здесь не означает, что весь MVP уже принят. Runtime conformance v2 — отдельный gate D (§11.3), основанный на frozen v2 spec/config, а не на переименовании v1.1 tests.

## 16.1. Трассировка исходных TEST_CASES

| Acceptance set | Основание | Проверяемый результат |
|---|---|---|
| AT-01 Upload and immutability | TC-01, TC-02 | Файл принят, registry_id и checksum созданы, оригинал не изменён |
| AT-02 Source preservation | TC-03, TC-28 | Официальные названия сохранены, порядок колонок не критичен |
| AT-03 Missing | TC-04, TC-20 | Пустое значение становится null, фиктивный score отсутствует |
| AT-04 VALUE math | TC-31, TC-32 | known_sum, coverage, range и full score рассчитаны корректно |
| AT-05 FEASIBILITY math | TC-07 | Полная ось даёт точный score и range score..score |
| AT-06 PRE-SCORE | TC-08 | PRE использует только Confirmed Registry и допустимые Derived facts |
| AT-07 Missing question | TC-09 | По missing создаётся связанный вопрос |
| AT-08 Interview answer | TC-10 | Ответ хранится отдельно, source registry не меняется |
| AT-09 VERIFIED gate | TC-11 | VERIFIED только при 10 известных criteria и допустимом evidence |
| AT-10 Conflict | TC-12 | Оба значения сохранены, criterion становится null до разрешения |
| AT-11 LLM isolation | TC-13 | LLM inference не участвует в formal scoring |
| AT-12 Blocker | TC-14, TC-15 | Confirmed blocker отличается от requires verification |
| AT-13 Risk | TC-16 | Risk не останавливает остальные расчёты автоматически |
| AT-14 Reproducibility | TC-17 | Одинаковый snapshot и версия дают одинаковый результат |
| AT-15 Methodology versions | TC-18 | Старый score не затирается новой версией правил |
| AT-16 Explainability | TC-19, TC-29 | Для score доступны rule_id, evidence, source, actor и time |
| AT-17 Two-axis model | TC-21, TC-22 | Высокая одна ось не маскирует низкую другую |
| AT-18 Export | TC-23 | Экспорт отделён от официального реестра |
| AT-19 Multiple processes | TC-24 | Карточки не перемешиваются и сохраняют source_ref |
| AT-20 Duplicate warning | TC-25 | Возможный дубль не удаляется и не объединяется автоматически |
| AT-21 Invalid workbook | TC-26 | Понятная ошибка, некорректный результат не создаётся |
| AT-22 Missing target sheet | TC-27 | Произвольный лист не выбирается молча |
| AT-23 Human decision | TC-30 | Высокий score не создаёт автоматическое утверждение |

`DOC-S02-01`: **CLOSED** — трассировка AT-04 исправлена на `TC-31 / TC-32`; нумерация и содержание tests не изменены.

## 16.2. Дополнительные тесты по утверждённым решениям

| ID | Сценарий | Ожидаемый результат |
|---|---|---|
| AT-24 | Загрузка `.xlsm` с формулами | Книга не пересчитывается |
| AT-25 | Формула имеет cached result | Используется cached result, формула сохраняется отдельно |
| AT-26 | Cached result отсутствует | normalized value = null и создан Data Quality Issue |
| AT-27 | Cached result содержит Excel error | Значение не интерпретируется автоматически |
| AT-28 | В колонке B повторяется официальный код | Создаются разные source_row_id/process_id |
| AT-29 | Номер строки изменён в новой версии | process_id не зависит напрямую от номера строки |
| AT-30 | Fingerprint неоднозначен | Создаётся issue, автоматическое сопоставление запрещено |
| AT-31 | Строка классифицирована как AGGREGATE или TOTAL | Карточка для scoring не создаётся |
| AT-32 | Row type = UNKNOWN | Строка не участвует в scoring до подтверждения |
| AT-33 | F1 access = unknown | F1 = null, а не 1 |
| AT-34 | F1 access = confirmed_no_access | Компонент access получает 1 |
| AT-35 | Для F2–F5 применимы несколько подтверждённых правил | Выбирается минимальный применимый score |
| AT-36 | Ограничение неизвестно | Score не снижается автоматически, создаётся RISK_REQUIRES_VERIFICATION или null по правилам полноты |
| AT-37 | Есть допустимый Confirmed manual_work_share_percent | V3 рассчитан по утверждённой шкале, evidence и rule_id сохранены |
| AT-38 | Есть только paper_status / digitalization_level / machine_readability | V3 = null; косвенные поля не дают score, V3 proxy запрещён |
| AT-39 | Два подтверждённых фактических V3 источника противоречат | Создаётся conflict, score = null до разрешения |
| AT-40 | VERIFIED SCORE с подтверждённым blocker | VERIFIED сохраняется, blocker отображается отдельно |
| AT-41 | После интервью процесс декомпозирован | Созданы внутренние AnalysisUnit, source row не изменён |
| AT-42 | manual_work_share_percent отсутствует или Unknown | V3 = null; указаны reason и missing input |
| AT-43 | manual_work_share_percent не подтверждён, включая LLM-extracted | V3 = null; неподтверждённое значение не используется |
| AT-44 | Одинаковые допустимые Confirmed V3 inputs и версия методики | Одинаковый детерминированный результат |
| AT-45 | Confirmed interview percent передан в PRE-SCORE | Input исключён из PRE; V3 = null при отсутствии допустимого Registry percent |

---

# 17. Definition of Done MVP

Условия ниже сохраняют baseline приёмки MVP v1.1. Они не означают готовности всего MVP после Slice 02 и не разрешают activation v2; v2 дополнительно требует последовательных gates A–F (§11.3). MVP считается готовым, когда одновременно выполнены условия:

1. Все P0 backlog items завершены.
2. Официальный файл сохраняется без изменений; checksum подтверждён.
3. `.xlsx` и `.xlsm` обрабатываются в read-only режиме.
4. Профиль МЛХ корректно читает `Лист3`.
5. Заголовки, агрегирующие, итоговые и UNKNOWN rows не участвуют в scoring.
6. Для PROCESS rows созданы прослеживаемые карточки и AnalysisUnit.
7. Missing не преобразуется в минимальный score.
8. Rule Engine реализует методику 1.1 без изменения критериев и шкал.
9. PRE, INTERVIEW и VERIFIED проходят установленные gate rules.
10. LLM-extracted facts не участвуют в scoring до подтверждения.
11. Для каждого criterion result доступны rule_id и evidence.
12. Coverage и ranges корректны.
13. Conflicts не разрешаются автоматически.
14. Risk и Blocker отделены от score.
15. Матрица использует две независимые оси.
16. Пользователь может пройти flow загрузка → карточка → интервью → подтверждение → повторный score → матрица.
17. История facts, confirmations и score snapshots сохраняется.
18. Все P0 acceptance-тесты проходят автоматически или по утверждённому приёмочному сценарию.
19. Нет известных дефектов уровня Blocker или Critical.
20. Подготовлены инструкция запуска, краткая инструкция пользователя и сценарий демонстрации.

---

# 18. Основные технические риски

| Риск | Вероятность / влияние | Меры | Владелец |
|---|---|---|---|
| В Excel отсутствуют корректные cached results | Средняя / высокая | Null + DQ issue, запрет пересчёта, тестовые fixtures | Backend + QA |
| Неверная классификация агрегирующей строки | Средняя / высокая | Версионированный mapping, UNKNOWN и ручная проверка | BSA + Backend |
| Fingerprint ошибочно сопоставит разные процессы | Средняя / высокая | Консервативное matching, collision issue, human confirmation | Backend + BSA |
| PRE-SCORE будет иметь низкий coverage | Высокая / средняя | Не скрывать ranges, быстро переходить к интервью | BSA + LLM developer |
| Ответ интервью будет интерпретирован неверно | Средняя / высокая | FactCandidate и обязательное human confirmation | LLM developer + Frontend |
| LLM сформирует неподтверждённый факт | Средняя / высокая | Inferred по умолчанию, schema validation, scoring isolation | LLM developer + Backend |
| Разные реализации scoring дадут разные результаты | Низкая / высокая | Единая config 1.1, boundary tests, snapshots | Rule Engine developer + QA |
| Конфигурация изменится без новой версии | Низкая / высокая | Hash/version config, immutable score snapshots | Backend |
| Длинные русскоязычные поля ухудшат интерфейс | Высокая / средняя | Collapsible text, отдельное source view, usability test | Designer + Frontend |
| Персональные или служебные данные уйдут в LLM | Средняя / высокая | Минимизация контекста, access control, logging policy | Backend + LLM developer |
| LLM временно недоступна | Средняя / средняя | Core flow без LLM, retry и понятная ошибка | Backend |
| Команда начнёт расширять scope | Средняя / высокая | Зафиксированный out-of-scope и P0 gate | Product owner + BSA |
| Официальный реестр изменит структуру | Средняя / средняя | Mapping version и validation signature | BSA + Backend |
| Формулы Excel содержат ссылки вне текущего листа | Высокая / средняя | Использовать только cached values, сохранять warning | Backend + QA |

---

# 19. Исторические prerequisites первого handoff в Codex

Ниже сохранён checklist первого handoff; он не является новым NEXT backlog после завершённых Slice 01/02. Текущий следующий шаг задаёт §11.3 A. Для начала разработки требовались:

1. `MVP_PASSPORT_AND_BACKLOG.md`;
2. актуальный `PROJECT_CONTEXT.md`;
3. актуальный `TECH_SPEC.md`;
4. `SCORING_ENGINE_SPEC.md` версии 1.1;
5. актуальный `REGISTRY_SCHEMA.md`;
6. актуальный `TEST_CASES.md`;
7. утверждённый `REGISTRY_MAPPING_MLH.md`;
8. read-only копия `Реестр МЛХ.xlsm`;
9. машиночитаемая scoring configuration 1.1;
10. каталог обезличенных test fixtures;
11. выбранный репозиторий и базовые правила работы команды;
12. первый вертикальный slice с чёткими acceptance criteria.

Исходная синхронизация документов и baseline v1.1 выполнены. Дальнейшая документация актуализируется по отдельно принятым designs без изменения frozen methodology/config; это не повторное создание этапа 0.

Рекомендуемая модель для первого запроса в Codex/WORK:

```text
GPT-5.6 Sol High
```

Для отдельных коротких механических задач после создания архитектурного каркаса допустим `GPT-5.6 Sol Medium`.

Первый запрос в Codex должен ограничивать работу одним вертикальным slice и запрещать преждевременную разработку полного API, полной схемы БД и компонентов вне MVP.

## BLOCKING DECISION

Неразрешённых продуктовых или методических решений, блокирующих передачу проекта в Codex, нет.

---

# 20. Frozen historical baseline — Slice 01

Раздел сохранён как историческая спецификация первого вертикального slice. Slice 01 завершён и заморожен; он не является следующим этапом реализации.

## Название

```text
MLH Registry → One Process Card → PRE-SCORE
```

## Цель

Доказать основной технический контур на одном реальном процессе без попытки сразу реализовать весь продукт.

## Scope slice

1. Загрузить `Реестр МЛХ.xlsm`.
2. Сохранить оригинал и checksum.
3. Выбрать профиль МЛХ и лист `Лист3`.
4. Прочитать строки без пересчёта Excel.
5. Выбрать одну строку, классифицированную как PROCESS.
6. Создать SourceRow, Process, primary AnalysisUnit и Process Analysis Card.
7. Создать Confirmed Registry facts и допустимые Derived facts.
8. Реализовать и запустить V1 Frequency, V2 Labor и общий механизм неполной оси.
9. Получить значения V1/V2 и `null` для ещё не реализованных или неизвестных criteria.
10. Рассчитать known_sum, coverage и ranges.
11. Показать карточку процесса с source references, DQ issues, criterion results, rule_id и evidence.
12. Доказать, что исходный файл не изменился.

## Что не входит в первый slice

- интервью;
- подтверждение LLM facts;
- VERIFIED SCORE;
- матрица всех процессов;
- экспорт;
- fingerprint matching между версиями;
- декомпозиция AnalysisUnit;
- расширенное администрирование.

## Acceptance criteria slice

- приложение принимает тестовый `.xlsm`;
- checksum до и после совпадает;
- выбран `Лист3`;
- Excel не пересчитан;
- процесс связан с исходной строкой и ячейками;
- официальный код не используется как process_id;
- cached result обрабатывается по правилам;
- V1 и V2 используют только допустимые Registry/Derived facts;
- missing criteria остаются null;
- coverage и ranges соответствуют спецификации;
- V1 и V2 содержат rule_id и evidence;
- результат повторного запуска идентичен при том же input snapshot.

## Почему этот slice первый

Он одновременно проверяет наиболее рискованные части MVP:

- чтение реального `.xlsm`;
- неизменность реестра;
- mapping;
- качество данных;
- идентичность процесса;
- внутреннюю карточку;
- интеграционный контракт Rule Engine и механику неполной оси;
- объяснимый результат.

После Slice 01 детерминированный PRE-SCORE был расширен и принят в Slice 02. Дальнейший evidence-collection loop сохраняется как PLANNED scope в §21; ближайший шаг — runtime v2 design (§11.3 A).

---

# 21. Planned Slice 03 baseline — неутверждённый design

**Slice 03 — Evidence Collection & Human Confirmation** сохраняется как ранее намеченный PLANNED design baseline; это не текущий NEXT шаг. Его место и окончательная нарезка — `TBD AFTER RUNTIME DESIGN`, без перенумерации завершённых Slice 01/02. Этот backlog baseline является planned scope, не утверждённым и не замороженным контрактом; реализация не должна начинаться до отдельного design и review.

Предполагаемые каналы сбора evidence:

- ручное интервью;
- существующий расширенный Excel-шаблон;
- DOCX.

Предполагаемая общая цепочка:

```text
source → FactCandidate → Human Confirmation → Confirmed Fact → new ScoreSnapshot
```

Будущие design topics:

- модели `FactCandidate` / `Confirmed Fact`;
- provenance и audit-связи;
- конфликты между источниками;
- mapping расширенного Excel;
- DOCX extraction;
- interview questions;
- human-readable explanations;
- отображение данных из разных evidence channels без изменения нормативных evidence stages; новое название или semantics `INTERVIEW_SCORE` этим backlog не утверждаются.

Эти пункты не являются frozen contract Slice 03 и не меняют runtime или semantics Slice 01/02.

---

# Итоговый статус

```text
SLICE 01 / SLICE 02: DONE / FROZEN (SLICE 02 IMPLEMENTED / ACCEPTED)
CURRENT RUNTIME: METHODOLOGY v1.1
METHODOLOGY v2: FUTURE_NOT_ACTIVE; SPEC / CONFIG FROZEN; CONFIG DESIGN APPROVED
NEXT: SCORING_RUNTIME_DESIGN_V2.md — DESIGN + REVIEW
PLANNED: LOADER / VALIDATOR → ENGINE → CONFORMANCE GATE → INTEGRATION → MIGRATION / ACTIVATION
RUNTIME v2: NOT IMPLEMENTED; CONFORMANCE: NOT_YET_COMPLETED; PRODUCTION ACTIVATION: ABSENT
SLICE 03 EVIDENCE LOOP: PLANNED / NOT APPROVED / TBD AFTER RUNTIME DESIGN
```

Следующий этап — создание и review runtime v2 design. Frozen package не активирует v2. Настоящая синхронизация меняет только backlog; runtime design, production-код, tests, contracts и frozen-файлы не создаются и не изменяются.
