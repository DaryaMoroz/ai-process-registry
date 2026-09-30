# TEST_CASES.md

# Эталонные сценарии MVP

**Методика scoring:** `1.1`  
**Mapping-профиль пилота:** `registry_mlh / 1.0.0`

## 1. Назначение

Сценарии проверяют read-only ingestion, mapping, Data Quality, аналитический слой, интервью, Rule Engine, LLM boundaries, аудит и пользовательский результат. Ожидаемые scoring rules берутся только из `SCORING_ENGINE_SPEC.md` и `scoring_config_v1.1.yaml`; mapping — только из `REGISTRY_MAPPING_MLH.md`.

Если fixture не содержит явно указанного значения, оно считается `null`, а не минимальным или предполагаемым score.

## 2. Базовые сценарии ingestion и mapping

### TC-01. Загрузка валидного реестра

**Дано:** валидный `.xlsx` или `.xlsm`, совместимый с выбранным MappingProfile.  
**Когда:** пользователь загружает файл.  
**Тогда:** создаются RegistryVersion, выбранный SourceSheet, SourceRow/SourceCell и отчёт Data Quality; исходный файл не изменяется.

### TC-02. Исходный файл остаётся неизменным

**Дано:** вычислен checksum файла до импорта.  
**Когда:** выполнены parsing, mapping, DQ и scoring.  
**Тогда:** checksum исходного файла после обработки идентичен исходному; файл не был сохранён или перезаписан системой.

### TC-03. Официальные заголовки сохраняются

**Дано:** валидный реестр.  
**Когда:** создаются SourceCell и canonical mapping.  
**Тогда:** точный официальный заголовок хранится отдельно от canonical field; нормализация не изменяет источник.

### TC-04. Пустое значение

**Дано:** обязательный для критерия field пуст.  
**Когда:** выполняются mapping и scoring.  
**Тогда:** normalized value и соответствующий criterion score равны `null`; создаются предусмотренные mapping/scoring issue или missing input, значение не заменяется `1`.

### TC-05. Некорректный Excel

**Дано:** повреждённый или неподдерживаемый файл.  
**Когда:** выполняется загрузка.  
**Тогда:** обработка завершается контролируемой ошибкой; scoring не запускается; исходный файл не изменяется.

### TC-06. Нет целевого листа

**Дано:** лист по умолчанию отсутствует, другой лист явно не выбран.  
**Когда:** запускается import.  
**Тогда:** создаётся соответствующий DQ/error result; автоматический выбор неподтверждённого листа не выполняется.

### TC-07. Явный выбор другого листа

**Дано:** пользователь выбрал существующий лист, отличный от листа по умолчанию.  
**Когда:** лист проходит validation активного MappingProfile.  
**Тогда:** импорт использует выбранный лист и сохраняет его имя; при несовместимой структуре scoring не запускается.

### TC-08. Изменён порядок колонок

**Дано:** колонки не соответствуют правилам профиля.  
**Когда:** выполняется validation.  
**Тогда:** создаётся mapping-specific issue; система не выполняет молчаливое позиционное сопоставление, противоречащее профилю.

## 3. Фактический профиль `Лист3`

### TC-09. Структура пилотного диапазона

**Дано:** официальный `Реестр МЛХ.xlsm`.  
**Когда:** применяется `registry_mlh / 1.0.0` без явного выбора листа.  
**Тогда:** выбран `Лист3`; обнаружены `A8:S17`, строка заголовков 8, первая строка данных 9, последняя строка 17 и ровно 19 официальных колонок `A:S`.

### TC-10. Классификация PROCESS

**Дано:** строки 9–17 `Лист3`.  
**Когда:** применяется row classification.  
**Тогда:** строки `9, 10, 11, 12, 14, 17` классифицированы как `PROCESS` и только они могут получить `scoring_eligible = true`.

### TC-11. Классификация AGGREGATE

**Дано:** строки 9–17 `Лист3`.  
**Когда:** применяется row classification.  
**Тогда:** строки `13, 15, 16` классифицированы как `AGGREGATE`, имеют `scoring_eligible = false` и не создают scoring facts.

### TC-12. Формульные ячейки пилота

**Дано:** официальный `Реестр МЛХ.xlsm`.  
**Когда:** Parser читает `A9:S17`.  
**Тогда:** формулы найдены в точности в `K13`, `K15`, `L15`, `K16`, `L16`; формулы сохранены для аудита и не пересчитаны.

### TC-13. Cached results формул

**Дано:** формульные ячейки пилота.  
**Когда:** читаются сохранённые результаты книги.  
**Тогда:** cached values равны `K13=35`, `K15=10.5`, `L15=864`, `K16=3.5`, `L16=288`; они сохраняются, но строки AGGREGATE не участвуют в scoring.

### TC-14. `.xlsm` не пересчитывается

**Дано:** `Реестр МЛХ.xlsm` с формулами и cached results.  
**Когда:** выполняется полный import.  
**Тогда:** внешнее Excel-приложение/калькулятор не запускается, formulas и cached results не меняются, checksum файла остаётся прежним.

### TC-15. Отсутствующий cached result

**Дано:** formula cell без cached result либо с Excel error/неоднозначным значением.  
**Когда:** выполняется normalization.  
**Тогда:** `normalized_value = null` и создаётся предусмотренный DataQualityIssue; формула не рассчитывается системой.

### TC-16. UNKNOWN исключён из scoring

**Дано:** строка не может быть однозначно классифицирована.  
**Когда:** Mapping присваивает `row_type = UNKNOWN`.  
**Тогда:** `scoring_eligible = false`; Process/primary AnalysisUnit и scoring facts для строки не создаются.

## 4. Идентичность и AnalysisUnit

### TC-17. `official_process_code` не является `process_id`

**Дано:** две PROCESS rows с одинаковым официальным process code.  
**Когда:** создаются идентичности.  
**Тогда:** код сохраняется как source data, но не используется как внутренний ID; строки не объединяются только по коду.

### TC-18. Номер строки не является process_id

**Дано:** один процесс находится в разных строках двух версий реестра.  
**Когда:** выполняется version matching.  
**Тогда:** `source_row_id` различается по загрузкам, а подтверждённое однозначное сопоставление может сохранить общий `process_id`.

### TC-19. Fingerprint не содержит номер строки

**Дано:** одинаковые fingerprint-входы в разных номерах строк.  
**Когда:** вычисляется source fingerprint одной версии алгоритма.  
**Тогда:** fingerprint одинаков; row number, sheet/version IDs, изменяемые метрики и scores в payload отсутствуют.

### TC-20. Неоднозначное matching

**Дано:** один source fingerprint имеет несколько равноправных кандидатов.  
**Когда:** выполняется matching между версиями.  
**Тогда:** auto-merge не выполняется; создаются новый process_id, `AMBIGUOUS_PROCESS_MATCH` и задача на HumanDecision.

### TC-21. Первичная AnalysisUnit

**Дано:** одна scoring-eligible PROCESS row.  
**Когда:** строится аналитический слой.  
**Тогда:** создаётся ровно одна PRIMARY AnalysisUnit со ссылками на process_id и source_row_id; scoring адресован AnalysisUnit.

### TC-22. Декомпозиция после интервью

**Дано:** подтверждена необходимость разделить процесс.  
**Когда:** человек принимает решение о декомпозиции.  
**Тогда:** создаются внутренние DECOMPOSED AnalysisUnit; официальный SourceRow и Excel остаются неизменными; действие аудируется.

## 5. Факты, evidence и интервью

### TC-23. Источник факта трассируется до ячейки

**Дано:** валидное normalized value PROCESS row.  
**Когда:** создаётся Confirmed Registry Fact.  
**Тогда:** SourceReference ведёт к RegistryVersion, SourceSheet, SourceRow и SourceCell и содержит mapping version.

### TC-24. Derived provenance

**Дано:** правило выводит Derived fact из подтверждённых входов.  
**Когда:** выполняется derivation.  
**Тогда:** сохранены input fact IDs, rule/formula ID, version и trace; результат воспроизводим.

### TC-25. PRE-SCORE использует только Registry evidence

**Дано:** есть Confirmed Registry facts, Confirmed Interview fact и LLM candidate.  
**Когда:** рассчитывается PRE-SCORE.  
**Тогда:** используются только Confirmed Registry facts и Derived исключительно из них; остальные данные исключены из input snapshot.

### TC-26. Вопрос по missing input

**Дано:** criterion имеет обязательный missing input.  
**Когда:** Orchestrator/LLM Agent готовит интервью.  
**Тогда:** создаётся Question со ссылкой на поле и причину; score не угадывается.

### TC-27. Ответ создаёт candidate, а не факт

**Дано:** участник ответил на Question.  
**Когда:** LLM извлекает структурированное значение.  
**Тогда:** создаётся FactCandidate/Inferred со ссылкой на InterviewAnswer; formal scoring его не использует.

### TC-28. Human confirmation допускает interview fact

**Дано:** FactCandidate подтверждён человеком.  
**Когда:** выполняется INTERVIEW-SCORE.  
**Тогда:** создан новый Confirmed fact с Confirmation и HumanDecision; он может участвовать в расчёте согласно evidence rules.

### TC-29. LLM inference не становится фактом автоматически

**Дано:** LLM предложил значение без подтверждения.  
**Когда:** запускается любой formal scoring.  
**Тогда:** значение исключено из input snapshot; LLM не создаёт CriterionResult.

### TC-30. Финальное решение остаётся за человеком

**Дано:** система сформировала scores, risks и explanation.  
**Когда:** пользователь рассматривает приоритет процесса.  
**Тогда:** система не принимает управленческое решение автоматически; HumanDecision фиксируется отдельно и аудируется.

## 6. Rule Engine и scoring stages

### TC-31. Неполный VALUE

**Дано:** известна только часть V1–V5.  
**Когда:** выполняется scoring.  
**Тогда:** `value_full_score = null`; рассчитаны `known_sum`, coverage и min/max range; неизвестные критерии остаются `null`.

### TC-32. Полный VALUE

**Дано:** все обязательные inputs V1–V5 известны и допустимы.  
**Когда:** выполняется Rule Engine.  
**Тогда:** каждый критерий имеет score `1–5`, `value_full_score` равен сумме пяти результатов, coverage равен `5/5`.

### TC-33. Полный FEASIBILITY

**Дано:** все обязательные inputs F1–F5 известны и допустимы.  
**Когда:** выполняется Rule Engine.  
**Тогда:** каждый критерий имеет score `1–5`, `feasibility_full_score` равен сумме пяти результатов, coverage равен `5/5`.

### TC-34. PRE-SCORE snapshot

**Дано:** только допустимые registry facts.  
**Когда:** рассчитывается PRE-SCORE.  
**Тогда:** ScoreSnapshot имеет stage `PRE_SCORE`, methodology version `1.1`, input_snapshot_id и explanation trace; неполнота допустима.

### TC-35. INTERVIEW-SCORE snapshot

**Дано:** часть недостающих inputs подтверждена после интервью.  
**Когда:** выполняется перерасчёт.  
**Тогда:** создаётся новый immutable ScoreSnapshot `INTERVIEW_SCORE`; PRE snapshot сохраняется.

### TC-36. VERIFIED SCORE

**Дано:** все 10 критериев имеют `1–5`, evidence Confirmed/Derived, специальные source requirements выполнены, влияющих open conflicts нет.  
**Когда:** выполняется completeness validation результата.  
**Тогда:** разрешён status `VERIFIED_SCORE`, сохранены methodology version и input snapshot.

### TC-37. VERIFIED невозможен при null

**Дано:** хотя бы один criterion result равен `null`.  
**Когда:** запрашивается VERIFIED status.  
**Тогда:** статус отклоняется; сохраняется допустимый PRE/INTERVIEW result с missing explanation.

### TC-38. F1 unknown → null

**Дано:** `data_access_level = unknown` либо обязательный компонент F1 неизвестен.  
**Когда:** рассчитывается F1.  
**Тогда:** соответствующий component/F1 result равен `null`; неизвестность не преобразуется в `1`.

### TC-39. F1 confirmed_no_access → 1

**Дано:** `data_access_level = confirmed_no_access` с подтверждённым evidence и остальные обязательные компоненты F1 известны.  
**Когда:** рассчитывается F1.  
**Тогда:** access component равен `1`, итог F1 рассчитывается по утверждённому weak-link правилу.

### TC-40. F2–F5 overlap

**Дано:** для одного критерия F2–F5 одновременно применимы несколько правил на подтверждённых данных.  
**Когда:** вычисляется criterion result.  
**Тогда:** выбран минимальный score среди применимых подтверждённых правил; trace содержит все применимые правила и выбранный результат.

### TC-41. Неизвестное ограничение F2–F5

**Дано:** потенциальное ограничение неизвестно и данных недостаточно для однозначного правила.  
**Когда:** выполняется scoring.  
**Тогда:** score равен `null`, создаётся `RISK_REQUIRES_VERIFICATION`; автоматический штраф не применяется.

### TC-42. V3 фактическая доля заменяет proxy

**Дано:** существует PRE proxy и подтверждён `manual_work_share_percent`.  
**Когда:** выполняется текущий scoring.  
**Тогда:** V3 использует только подтверждённое фактическое значение; proxy исключён из текущего расчёта и сохранён в PRE history.

### TC-43. V3 proxy mismatch не создаёт conflict

**Дано:** V3 proxy отличается от подтверждённого `manual_work_share_percent`.  
**Когда:** строится карточка и score.  
**Тогда:** Conflict не создаётся только из-за этого расхождения; фактическое значение имеет приоритет.

### TC-44. Confirmed-vs-confirmed conflict

**Дано:** два подтверждённых фактических источника содержат несовместимые значения одного scoring input.  
**Когда:** формируется input snapshot.  
**Тогда:** создаётся Conflict, затронутый criterion score равен `null`, VERIFIED запрещён до HumanDecision.

### TC-45. VERIFIED вместе с BLOCKER

**Дано:** выполнены все условия VERIFIED и отдельно подтверждён blocker.  
**Когда:** Rule Engine формирует результат.  
**Тогда:** сохраняются VERIFIED SCORE и CONFIRMED Blocker одновременно; score не обнуляется.

### TC-46. Возможный blocker без подтверждения

**Дано:** LLM выявил возможный blocker без подтверждённого evidence.  
**Когда:** обновляется карточка.  
**Тогда:** создаётся candidate/risk с требованием проверки, но не CONFIRMED Blocker.

### TC-47. Risk не останавливает допустимый scoring

**Дано:** существует Risk, который по спецификации не делает обязательный input неизвестным.  
**Когда:** выполняется Rule Engine.  
**Тогда:** допустимый score рассчитывается, Risk отображается отдельно и не обнуляет результат.

## 7. Детерминированность, версии и конфигурация

### TC-48. Воспроизводимость

**Дано:** одинаковые `input_snapshot_id` и `methodology_version`.  
**Когда:** расчёт выполняется повторно.  
**Тогда:** CriterionResults, axes, coverage, ranges, risks/blockers и trace детерминированно совпадают.

### TC-49. Новая версия методики не переписывает историю

**Дано:** существует ScoreSnapshot методики `1.1`, затем активируется новая версия в отдельном тестовом контексте.  
**Когда:** выполняется новый расчёт.  
**Тогда:** создаётся новый snapshot с новой version metadata; исторический snapshot `1.1` не меняется.

### TC-50. Полнота scoring config

**Дано:** `scoring_config_v1.1.yaml`.  
**Когда:** выполняется completeness validation.  
**Тогда:** найдены ровно 10 criterion IDs и их rule IDs, все thresholds, enum mappings, mandatory inputs, units, missing/null behavior, evidence и stage eligibility, Derived/conflict policies, F2–F5 overlap, V3 proxy replacement, F1 access mapping, axis aggregation, interpretation levels, blocker/risk rules и metadata version `1.1`.

### TC-51. Неполная scoring config блокирует запуск

**Дано:** из копии конфигурации удалён обязательный threshold, enum mapping или criterion.  
**Когда:** Rule Engine запускает validation.  
**Тогда:** конфигурация отклоняется до расчёта; hard-coded/default значение не применяется.

### TC-52. Explainability результата

**Дано:** рассчитан любой criterion.  
**Когда:** пользователь открывает explanation.  
**Тогда:** показаны criterion ID, rule ID, допустимые inputs/evidence, applied rule, score/null, missing/conflict/risk reason и methodology version.

## 8. Пользовательские результаты

### TC-53. Несколько процессов

**Дано:** RegistryVersion содержит несколько PROCESS rows.  
**Когда:** построены карточки.  
**Тогда:** каждая PRIMARY AnalysisUnit рассчитывается независимо; факты и результаты не смешиваются.

### TC-54. Возможные дубли

**Дано:** несколько похожих PROCESS rows в одной версии.  
**Когда:** Mapping выявляет возможный duplicate.  
**Тогда:** строки не объединяются автоматически; создаётся предусмотренный issue/review task.

### TC-55. Матрица высокой ценности и низкой реализуемости

**Дано:** обе оси полностью рассчитаны, VALUE высокий, FEASIBILITY низкая.  
**Когда:** строится матрица.  
**Тогда:** AnalysisUnit помещена по двум отдельным координатам; сумма `/50` не заменяет матрицу.

### TC-56. Матрица низкой ценности и высокой реализуемости

**Дано:** обе оси полностью рассчитаны, VALUE низкий, FEASIBILITY высокая.  
**Когда:** строится матрица.  
**Тогда:** позиция отражает обе оси без автоматического управленческого решения.

### TC-57. Неполный score в списке

**Дано:** одна или обе оси не имеют full score.  
**Когда:** открывается список процессов.  
**Тогда:** UI показывает `null`, coverage и диапазон, а не вымышленную точку или сумму.

### TC-58. Экспорт аналитической таблицы

**Дано:** сформированы карточки и snapshots.  
**Когда:** пользователь экспортирует аналитическое представление.  
**Тогда:** экспорт содержит source identifiers, AnalysisUnit, stage/version, axes, coverage, risks/blockers и audit references; официальный Excel не изменяется.

## 9. Критерии приёмки MVP

MVP считается прошедшим документальный набор acceptance tests, если:

1. Все P0-сценарии ingestion, mapping, identity, facts и Rule Engine проходят на утверждённых fixtures.
2. `Реестр МЛХ.xlsm` остаётся byte-identical по checksum.
3. Фактическая структура и классификация `Лист3` совпадают с TC-09–TC-13.
4. Ни `UNKNOWN`, ни неподтверждённый FactCandidate не участвуют в scoring.
5. PRE, INTERVIEW и VERIFIED snapshots соответствуют evidence и completeness rules.
6. Rule Engine проходит config completeness validation и тест детерминированности.
7. LLM не вычисляет formal score и не подтверждает собственные hypotheses.
8. Источник, derivation, human confirmation и изменения версий полностью аудируются.
