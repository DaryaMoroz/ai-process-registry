# MVP_PASSPORT_AND_BACKLOG.md

# Паспорт MVP и backlog

## ИИ-агент анализа реестра процессов

**Статус документа:** готов к передаче в разработку  
**Версия:** 1.0  
**Целевой набор пилота:** лист `Лист3` файла `Реестр МЛХ.xlsm`  
**Статус Rule Engine:** `READY FOR IMPLEMENTATION`  
**Итоговый статус проекта:** `READY FOR CODEX`

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

`REGISTRY_MAPPING_MLH.md` на момент подготовки документа отсутствует. Его создание включено в обязательный этап 0. Файл `МЛХ_последняя_редакция_с_изменениями.xlsx` не является официальным реестром и может использоваться только как дополнительный тестовый пример результатов обследования.

При расхождении документов применяется приоритет, установленный в `PROJECT_CONTEXT.md`. Правила scoring определяются только `SCORING_ENGINE_SPEC.md`.

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
- история подтверждений и изменений.

## 2.3. Scoring

- Rule Engine по `SCORING_ENGINE_SPEC.md`, версия 1.1;
- десять утверждённых критериев;
- PRE-SCORE;
- INTERVIEW-SCORE;
- VERIFIED SCORE;
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

# 11. Порядок реализации MVP по этапам

## Этап 0. Нормативная и проектная база

- создать `REGISTRY_MAPPING_MLH.md`;
- синхронизировать `PROJECT_CONTEXT.md`, `TECH_SPEC.md`, `REGISTRY_SCHEMA.md` и `TEST_CASES.md` с утверждёнными решениями;
- зафиксировать scoring configuration 1.1 в машиночитаемом виде;
- подготовить репозиторий, правила ветвления, окружения и CI;
- подготовить обезличенные test fixtures.

**Результат:** единый непротиворечивый пакет требований.

## Этап 1. Read-only ingestion

- загрузка Excel;
- checksum и RegistryVersion;
- чтение листов;
- cached values без пересчёта;
- mapping листа `Лист3`;
- row classification;
- создание SourceRow, Process и AnalysisUnit;
- базовые Data Quality Issues.

**Результат:** процессы из `Лист3` отображаются в системе и связаны с исходными координатами.

## Этап 2. Первый вертикальный slice

- карточка одного процесса;
- Confirmed Registry facts;
- Derived facts;
- минимальное ядро Rule Engine: V1, V2 и расчёт неполной оси;
- частичный PRE-SCORE;
- coverage и ranges;
- отображение missing facts;
- один пользовательский flow от загрузки до объяснимого результата.

**Результат:** работающий end-to-end контур без интервью.

## Этап 3. Полный Rule Engine 1.1

- все десять критериев;
- evidence validation;
- PRE / INTERVIEW / VERIFIED;
- conflicts;
- risks и blockers;
- versioning и reproducibility;
- unit и component tests.

**Результат:** Rule Engine проходит acceptance-тесты методики.

## Этап 4. Interview loop и LLM Agent

- генерация вопросов;
- интервью;
- fact candidates;
- human confirmation;
- новый input snapshot;
- повторный scoring;
- объяснение изменений.

**Результат:** missing fact проходит путь до подтверждённого evidence.

## Этап 5. Список, матрица и экспорт

- список всех процессов;
- фильтрация и сортировка;
- матрица Value × Feasibility;
- визуализация incomplete scores;
- экспорт аналитического результата;
- human decision.

**Результат:** эксперт может сравнить процессы и зафиксировать решение.

## Этап 6. Hardening и приёмка

- права доступа;
- аудит;
- обработка ошибок;
- повторный запуск;
- performance на пилотном объёме;
- regression suite;
- инструкции запуска;
- итоговая демонстрация.

**Результат:** MVP соответствует Definition of Done.

---

# 12. Общий backlog

## 12.1. Приоритеты

| Приоритет | Значение |
|---|---|
| P0 | Обязательно для MVP |
| P1 | Нужно для удобной пилотной эксплуатации |
| P2 | Допустимо перенести после MVP |

## 12.2. Epic-level backlog

| Epic | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет |
|---|---|---|---|---|---|
| E0 Требования | Создать и утвердить `REGISTRY_MAPPING_MLH.md` | BSA | Утверждённые решения | Описаны лист, заголовки, 19 колонок, row types, cached values и IDs | P0 |
| E0 Требования | Синхронизировать нормативные документы | BSA | Паспорт MVP | Между документами нет противоречий по статусам, facts, IDs и Excel | P0 |
| E0 Требования | Подготовить машиночитаемую scoring configuration 1.1 | BSA + Backend | `SCORING_ENGINE_SPEC.md` | Конфигурация проходит completeness validation | P0 |
| E1 Ingestion | Реализовать read-only загрузку Excel | Backend | Mapping profile | Оригинал и checksum сохраняются, книга не изменяется | P0 |
| E1 Ingestion | Реализовать Parser и выбор листа | Backend | Excel fixture | Доступны листы, default `Лист3`, пересчёт отсутствует | P0 |
| E1 Ingestion | Реализовать Mapping и row classification | Backend + BSA | Parser, mapping profile | Только PROCESS попадает в scoring | P0 |
| E2 Quality | Реализовать Data Quality rules | Backend + QA | Parsed rows | Missing, invalid, errors, ambiguity и conflicts отображаются | P0 |
| E3 Cards | Создать Process Analysis Card и AnalysisUnit | Backend | Mapping | Каждая PROCESS row имеет прослеживаемую карточку | P0 |
| E4 Scoring | Реализовать Rule Engine 1.1 | Backend / Rule Engine developer | Scoring config | Все критерии детерминированы и объяснимы | P0 |
| E5 Interview | Реализовать questions и interview workflow | Backend + Frontend + LLM developer | Cards, DQ | Ответ не влияет на score до подтверждения | P0 |
| E6 Confirmation | Реализовать human confirmation | Backend + Frontend | Interview | Каждое подтверждение имеет actor, source и audit event | P0 |
| E7 Prioritization | Реализовать список и матрицу | Frontend + Backend + Designer | Scoring results | Оси раздельны, incomplete и blocker отображаются корректно | P0 |
| E8 Export | Реализовать аналитический экспорт | Backend + Frontend | List, cards | Экспорт не меняет официальный реестр | P1 |
| E9 Audit | Реализовать версии и аудит | Backend | Все изменяющие операции | Можно восстановить происхождение facts и scores | P0 |
| E10 QA | Автоматизировать acceptance suite | QA + разработчики | Вертикальные slices | Все P0 acceptance-тесты проходят | P0 |
| E11 Delivery | Подготовить запуск и демонстрацию | Backend + Frontend + QA | P0 backlog | Система разворачивается по инструкции | P0 |

---

# 13. Backlog разработчика Rule Engine

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет |
|---|---|---|---|---|---|
| RE-01 | Реализовать загрузку scoring configuration 1.1 | Rule Engine developer | Машиночитаемая конфигурация | Версия и все rule_id доступны движку | P0 |
| RE-02 | Реализовать completeness validator | Rule Engine developer | RE-01 | При отсутствии критерия, шкалы, input или rule_id возвращается `SCORING_DISABLED` | P0 |
| RE-03 | Реализовать validation facts и evidence | Rule Engine developer | Canonical fact contract | Inferred и Unknown не участвуют в formal scoring | P0 |
| RE-04 | Реализовать V1 Frequency | Rule Engine developer | annual_instances | Проверены границы, zero и invalid inputs | P0 |
| RE-05 | Реализовать V2 Labor и Derived annual_labor_hours | Rule Engine developer | annual_instances, hours_per_instance | Derived содержит rule version и input fact IDs | P0 |
| RE-06 | Реализовать V3 Manual Work и PRE proxy | Rule Engine developer | Registry mappings | Фактический процент заменяет proxy без proxy-conflict | P0 |
| RE-07 | Реализовать V4 Repeatability | Rule Engine developer | Structured inputs | Количественный input имеет установленный приоритет | P0 |
| RE-08 | Реализовать V5 Problematicity | Rule Engine developer | Structured inputs | Proxy и fallback применяются только по спецификации | P0 |
| RE-09 | Реализовать F1 Data Availability | Rule Engine developer | F1 component facts | `confirmed_no_access = 1`, `unknown = null`, итог по min компонентов | P0 |
| RE-10 | Реализовать F2 Integration Simplicity | Rule Engine developer | Integration facts | При пересечении применяется минимальный подтверждённый score | P0 |
| RE-11 | Реализовать F3 Technical Feasibility | Rule Engine developer | Technical expert facts | VERIFIED требует допустимого технического источника | P0 |
| RE-12 | Реализовать F4 MVP 3 Months | Rule Engine developer | MVP scope facts | Все обязательные inputs известны для VERIFIED | P0 |
| RE-13 | Реализовать F5 Measurability | Rule Engine developer | KPI facts | Blocker хранится отдельно от score | P0 |
| RE-14 | Реализовать axis aggregation | Rule Engine developer | RE-04–RE-13 | Full score только при пяти известных criteria; иначе known_sum, coverage, range | P0 |
| RE-15 | Реализовать PRE / INTERVIEW / VERIFIED gate | Rule Engine developer | Evidence validator | VERIFIED невозможен при null или scoring conflict | P0 |
| RE-16 | Реализовать conflict handling | Rule Engine developer | Conflict contract | Движок не выбирает источник самостоятельно | P0 |
| RE-17 | Реализовать Risk / Blocker evaluation | Rule Engine developer | Structured restrictions | Blocker не меняет score и может сосуществовать с VERIFIED | P0 |
| RE-18 | Реализовать criterion explanation payload | Rule Engine developer | Criterion results | Для каждого score доступны rule_id, evidence и applied rule | P0 |
| RE-19 | Реализовать snapshot/version metadata | Rule Engine developer | Backend snapshot | Результат содержит methodology version и input snapshot | P0 |
| RE-20 | Создать unit tests границ всех шкал | Rule Engine developer + QA | RE-04–RE-13 | Проверены значения на границе, ниже и выше границы | P0 |
| RE-21 | Создать reproducibility tests | Rule Engine developer + QA | RE-19 | Одинаковый snapshot всегда даёт одинаковый JSON result | P0 |
| RE-22 | Создать regression fixtures методики 1.1 | QA + BSA | Утверждённые примеры | Изменение config обнаруживается тестами и версией | P0 |

---

# 14. Backlog разработчика LLM Agent

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет |
|---|---|---|---|---|---|
| LA-01 | Определить строгий входной контекст LLM Agent | LLM developer + BSA | Card contract | В prompt не передаются лишние данные и formal rules для изменения | P0 |
| LA-02 | Определить structured output schema | LLM developer + Backend | Fact/Question contracts | Невалидный ответ не записывается как fact | P0 |
| LA-03 | Формировать вопросы по missing facts | LLM developer | Rule Engine missing_facts | Каждый вопрос связан с field, criterion, reason и priority | P0 |
| LA-04 | Формировать вопросы по conflicts | LLM developer | Conflict contract | Вопрос показывает варианты без самостоятельного выбора истины | P0 |
| LA-05 | Формировать вопросы по risks и blockers | LLM developer | Risk contract | Указана рекомендуемая роль респондента | P0 |
| LA-06 | Структурировать Interview Answer в FactCandidate | LLM developer | Interview workflow | Candidate содержит value, unit, source fragment и confidence | P0 |
| LA-07 | Гарантировать маркировку LLM outputs как Inferred | LLM developer + Backend | LA-02 | До подтверждения candidate не допускается в scoring | P0 |
| LA-08 | Реализовать explanation draft | LLM developer | Rule Engine result | Объяснение не меняет score и ссылается на criterion results | P1 |
| LA-09 | Реализовать guardrails против выдуманных facts | LLM developer + QA | Output schema | При отсутствии evidence возвращается hypothesis или missing, не Confirmed | P0 |
| LA-10 | Реализовать обработку недоступности LLM | Backend + LLM developer | Orchestrator | Parser, cards и Rule Engine продолжают работать без LLM | P0 |
| LA-11 | Создать prompt regression set | LLM developer + QA + BSA | Типовые интервью | Структура ответов стабильна на контрольном наборе | P0 |
| LA-12 | Проверить утечку служебных и персональных данных | LLM developer + QA | Security rules | В модель уходит только разрешённый контекст | P0 |
| LA-13 | Реализовать наблюдаемость вызовов | LLM developer + Backend | Audit | Сохраняются prompt version, model, latency и result status без скрытых score changes | P1 |

LLM Agent не является отдельной группой агентов. В MVP используется один управляемый LLM-контур с несколькими типами заданий.

---

# 15. Общий backlog Frontend / Backend

| ID | User Story / Task | Исполнитель | Зависимости | Acceptance criteria | Приоритет |
|---|---|---|---|---|---|
| FB-01 | Создать проектный skeleton и локальный запуск | Backend + Frontend | Репозиторий | Команда поднимает систему по одной инструкции | P0 |
| FB-02 | Реализовать хранение оригинального файла и checksum | Backend | File storage decision | Повторная проверка подтверждает неизменность | P0 |
| FB-03 | Реализовать Registry Parser | Backend | Mapping profile | `.xlsx/.xlsm` читаются без пересчёта | P0 |
| FB-04 | Реализовать выбор листа и профиль МЛХ | Backend + Frontend | Parser | Default `Лист3`, пользователь может выбрать другой лист | P0 |
| FB-05 | Реализовать source cell representation | Backend | Parser | Сохраняются raw, formula, cached, normalized и coordinate | P0 |
| FB-06 | Реализовать row classification | Backend | Mapping | UNKNOWN создаёт issue и не получает scoring | P0 |
| FB-07 | Реализовать process identity | Backend | Mapping | source_row_id, process_id и fingerprint разделены | P0 |
| FB-08 | Реализовать Process Analysis Card | Backend | Entities contract | Карточка агрегирует данные без изменения source | P0 |
| FB-09 | Реализовать первичную AnalysisUnit | Backend | Card | Одна scoring unit создаётся на PROCESS row | P0 |
| FB-10 | Реализовать Data Quality pipeline | Backend | Parser, Mapping | Issues сохраняются и доступны UI | P0 |
| FB-11 | Реализовать orchestration PRE-SCORE | Backend | Rule Engine | Snapshot создаётся перед каждым расчётом | P0 |
| FB-12 | Реализовать экран загрузки | Frontend + Designer | Parser flow | Пользователь видит profile, sheet и validation result | P0 |
| FB-13 | Реализовать экран списка процессов | Frontend + Designer | Card summary | Доступны score/range, coverage и filters | P0 |
| FB-14 | Реализовать карточку процесса | Frontend + Designer | Card view model | Видны source, facts, criteria, evidence и issues | P0 |
| FB-15 | Реализовать экран интервью | Frontend + Backend + Designer | Questions | Ответ связан с вопросом, респондентом и источником | P0 |
| FB-16 | Реализовать подтверждение FactCandidate | Frontend + Backend | Confirmation rules | Confirm, correct, reject и request clarification аудируются | P0 |
| FB-17 | Реализовать повторный scoring | Backend | Confirmation | Новое подтверждение создаёт новый snapshot, старый сохраняется | P0 |
| FB-18 | Реализовать матрицу Value × Feasibility | Frontend + Designer | Full axis results | Нет замены матрицы суммой /50 | P0 |
| FB-19 | Реализовать отображение incomplete results | Frontend | Range contract | Null не показывается как 0; range виден пользователю | P0 |
| FB-20 | Реализовать отображение blocker/risk | Frontend | Risk contract | Blocker визуально отделён от score | P0 |
| FB-21 | Реализовать аналитический экспорт | Backend + Frontend | Result views | Экспорт содержит IDs, axes, coverage, status, blockers и risks | P1 |
| FB-22 | Реализовать basic access control | Backend + Frontend | Roles | Только разрешённые роли подтверждают facts и меняют config | P0 |
| FB-23 | Реализовать audit trail | Backend | Actor context | История значимых действий доступна для проверки | P0 |
| FB-24 | Реализовать обработку ошибок и повтор операции | Backend + Frontend | Component errors | Частичный сбой не выдаётся как успешный анализ | P0 |
| FB-25 | Реализовать сопоставление новой версии по fingerprint | Backend | Identity rules | Неоднозначное совпадение не разрешается автоматически | P1 |
| FB-26 | Реализовать декомпозицию AnalysisUnit | Backend + Frontend | Interview loop | Child units не изменяют исходную строку | P1 |
| FB-27 | Подготовить health checks и журналирование | Backend | Runtime | Состояние компонентов диагностируется | P1 |
| FB-28 | Провести accessibility и usability review | Designer + QA + Frontend | Основные экраны | Основной flow понятен аналитику без технических знаний | P1 |

---

# 16. Набор acceptance-тестов

## 16.1. Трассировка исходных TEST_CASES

| Acceptance set | Основание | Проверяемый результат |
|---|---|---|
| AT-01 Upload and immutability | TC-01, TC-02 | Файл принят, registry_id и checksum созданы, оригинал не изменён |
| AT-02 Source preservation | TC-03, TC-28 | Официальные названия сохранены, порядок колонок не критичен |
| AT-03 Missing | TC-04, TC-20 | Пустое значение становится null, фиктивный score отсутствует |
| AT-04 VALUE math | TC-05, TC-06 | known_sum, coverage, range и full score рассчитаны корректно |
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
| AT-37 | Подтверждён manual_work_share_percent | V3 proxy исключён из текущего scoring и сохранён в истории |
| AT-38 | Proxy V3 отличается от фактического значения | Само отличие не создаёт conflict |
| AT-39 | Два подтверждённых фактических V3 источника противоречат | Создаётся conflict, score = null до разрешения |
| AT-40 | VERIFIED SCORE с подтверждённым blocker | VERIFIED сохраняется, blocker отображается отдельно |
| AT-41 | После интервью процесс декомпозирован | Созданы внутренние AnalysisUnit, source row не изменён |

---

# 17. Definition of Done MVP

MVP считается готовым, когда одновременно выполнены условия:

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

# 19. Что должно быть готово до перехода в Codex

Для начала разработки в Codex должны быть доступны:

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

Документы `PROJECT_CONTEXT.md`, `TECH_SPEC.md`, `REGISTRY_SCHEMA.md` и `TEST_CASES.md` необходимо синхронизировать с уже утверждёнными решениями. Это обязательная задача этапа 0, но не новая методическая неопределённость.

Рекомендуемая модель для первого запроса в Codex/WORK:

```text
GPT-5.6 Sol High
```

Для отдельных коротких механических задач после создания архитектурного каркаса допустим `GPT-5.6 Sol Medium`.

Первый запрос в Codex должен ограничивать работу одним вертикальным slice и запрещать преждевременную разработку полного API, полной схемы БД и компонентов вне MVP.

## BLOCKING DECISION

Неразрешённых продуктовых или методических решений, блокирующих передачу проекта в Codex, нет.

---

# 20. Рекомендуемый первый вертикальный slice

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

После успешного slice можно безопасно расширить обработку на все процессы `Лист3`, а затем добавить interview loop и LLM Agent.

---

# Итоговый статус

```text
READY FOR CODEX
```

Методических решений, блокирующих начало разработки, нет. Первый этап Codex должен начинаться с нормативной синхронизации и рекомендованного вертикального slice, без расширения scope.
