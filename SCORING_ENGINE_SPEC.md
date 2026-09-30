# SCORING_ENGINE_SPEC.md

# Scoring Engine Specification v1.1

## Формальные правила методики «Ценность /25 × Реализуемость /25»

**Статус:** утверждённая спецификация Rule Engine
**Версия методики:** `1.1`
**Каноническое имя файла:** `SCORING_ENGINE_SPEC.md`
**Назначение:** единственный нормативный источник правил scoring для MVP
**Заменяет:** предыдущую неполную версию `SCORING_ENGINE_SPEC.md`

---

# 1. Назначение

Документ формализует работу Rule Engine для оценки процессов по двум независимым осям:

* **VALUE / Ценность** — максимум 25 баллов;
* **FEASIBILITY / Реализуемость** — максимум 25 баллов.

Каждая ось состоит из пяти критериев по шкале 1–5.

```text
VALUE = 5 критериев × 1..5 = максимум 25
FEASIBILITY = 5 критериев × 1..5 = максимум 25
```

Сумма:

```text
VALUE + FEASIBILITY = /50
```

может храниться как вспомогательная техническая величина, но **не должна использоваться вместо двумерной модели**.

Основной способ сравнения процессов:

**матрица «Ценность × Реализуемость».**

---

# 2. Нормативность спецификации

`SCORING_ENGINE_SPEC.md` является единственным нормативным источником правил Rule Engine.

Rule Engine и разработчик не должны:

* самостоятельно достраивать отсутствующие шкалы;
* использовать эвристики LLM вместо формальных правил;
* заменять отсутствующие значения предположениями;
* использовать правила другой версии без явного указания версии методики.

Если текущая версия спецификации:

* не содержит всех 10 критериев;
* не определяет значения 1–5;
* не содержит входные признаки;
* не содержит `rule_id`;

то scoring должен быть заблокирован:

```text
SCORING_DISABLED = true
reason = INCOMPLETE_SCORING_SPEC
```

---

# 3. Версионирование

Каждый расчёт должен сохранять:

```text
scoring_model_version
rule_version
calculated_at
input_snapshot_id
process_card_version
```

Для текущей версии:

```text
scoring_model_version = "1.1"
```

Каждый критерий имеет собственный `rule_id`.

Изменение методики не должно автоматически изменять ранее рассчитанные оценки.

---

# 4. Общая модель значения критерия

Каждый критерий принимает:

```text
1 | 2 | 3 | 4 | 5 | null
```

`null` означает:

> недостаточно допустимых и подтверждённых данных для детерминированной оценки.

Запрещено:

```text
MISSING → 1
MISSING → 3
MISSING → любое предполагаемое значение
```

Отсутствие информации не означает плохое состояние процесса.

---

# 5. Типы фактов

Используются четыре статуса достоверности:

```text
Confirmed
Derived
Inferred
Unknown
```

## 5.1. Confirmed

Факт непосредственно получен из допустимого источника и подтверждён.

Примеры:

* значение официального реестра;
* подтверждённый ответ эксперта;
* подтверждённый показатель информационной системы.

---

## 5.2. Derived

Факт получен **детерминированным версионируемым правилом** из допустимых Confirmed/Derived facts.

Derived fact должен содержать:

```json
{
  "derivation_rule_id": "string",
  "derivation_rule_version": "string",
  "input_fact_ids": []
}
```

Вывод LLM **не является Derived fact**.

---

## 5.3. Inferred

Предположение или интерпретация, сформированная LLM либо аналитиком без подтверждения.

Не участвует в formal scoring.

---

## 5.4. Unknown

Информации недостаточно.

---

# 6. Источники фактов

Минимально поддерживаются:

```text
registry
calculated
interview
document
system_data
llm_hypothesis
```

Дополнительно фиксируется роль источника:

```text
process_owner
executor
IT
information_security
data_owner
system_owner
analyst
other
```

---

# 7. Допустимые evidence по стадиям scoring

## 7.1. PRE-SCORE

Допустимы только:

* `Confirmed Registry facts`;
* `Derived facts`, детерминированно рассчитанные из допустимых Registry facts.

Не допускаются:

* неподтверждённые LLM-extracted facts;
* LLM hypotheses;
* interview facts до подтверждения человеком;
* предположения аналитика без подтверждённого источника.

---

## 7.2. INTERVIEW-SCORE

Допустимы:

* всё, что разрешено для PRE-SCORE;
* подтверждённые человеком Interview facts;
* подтверждённые Document facts;
* подтверждённые System Data facts;
* Derived facts из допустимых подтверждённых источников.

INTERVIEW-SCORE может быть неполным.

При наличии `null` рассчитываются:

* `known_sum`;
* `coverage`;
* `range`.

---

## 7.3. VERIFIED SCORE

VERIFIED SCORE разрешён только при одновременном выполнении всех условий:

1. Все **10 критериев** имеют значение 1–5.
2. Ни один критерий не равен `null`.
3. Все используемые evidence имеют статус `Confirmed` или `Derived`.
4. Все Derived facts рассчитаны детерминированными версионируемыми правилами.
5. Нет неразрешённых конфликтов, влияющих на scoring.
6. Критические технические сведения подтверждены профильным экспертом, если это требуется правилом критерия.
7. Сохранены версия методики и input snapshot.

Подтверждённый BLOCKER может существовать одновременно с VERIFIED SCORE.

---

# 8. Конфликты источников

Если два подтверждённых источника противоречат друг другу:

```text
conflict = true
```

Rule Engine не должен самостоятельно выбирать «правильный» источник.

Если конфликт влияет на конкретный критерий:

```text
criterion_score = null
```

до разрешения конфликта.

Если конфликт не влияет на входные признаки критерия, scoring этого критерия может продолжаться.

---

# 9. Coverage

Для каждой оси:

```text
coverage = known_criteria / 5
```

Пример:

```text
4 известных критерия из 5
coverage = 0.8 = 80%
```

---

# 10. Диапазон при неполных данных

Если часть критериев неизвестна:

```text
known_sum = сумма известных баллов
unknown_count = количество null

min_score = known_sum + unknown_count × 1
max_score = known_sum + unknown_count × 5
```

Пример:

```text
5 + 4 + 3 + 4 = 16
1 критерий = null

range = 17..21
coverage = 80%
```

При неполной оценке точный итог отсутствует:

```text
value_score = null
```

или:

```text
feasibility_score = null
```

---

# 11. VALUE — Ценность

---

## V1. Частота процесса

### rule_id

```text
V1_FREQUENCY_v1.1
```

### Назначение

Оценивает частоту выполнения процесса.

### Вход

```text
annual_instances
```

### Единица

```text
экземпляров процесса в год
```

### Правила

| Экземпляров в год | Балл |
| ----------------: | ---: |
|              1–11 |    1 |
|             12–51 |    2 |
|            52–249 |    3 |
|           250–999 |    4 |
|             ≥1000 |    5 |

### Missing

Если:

```text
annual_instances = null
```

то:

```text
score = null
```

### Нулевое значение

Если:

```text
annual_instances = 0
```

то автоматически балл не присваивается.

Создаётся:

```text
DataQualityIssue = ZERO_OR_INACTIVE_PROCESS
score = null
```

### Некорректные значения

Не интерпретируются автоматически:

```text
"по необходимости"
"маршруты"
"площадь"
"#VALUE!"
"1/24"
```

Результат:

```text
score = null
```

---

# 12. V2. Трудозатраты

### rule_id

```text
V2_LABOR_v1.1
```

### Назначение

Оценивает совокупный годовой объём человеческого труда.

### Входы

```text
annual_instances
hours_per_instance
```

### Единицы

```text
annual_instances = экземпляров в год
hours_per_instance = человеко-часов на экземпляр
annual_labor_hours = человеко-часов в год
```

### Derived formula

```text
annual_labor_hours =
annual_instances × hours_per_instance
```

### Правила

| Годовая трудоёмкость | Балл |
| -------------------: | ---: |
|         <100 чел.-ч. |    1 |
|              100–499 |    2 |
|            500–1 999 |    3 |
|          2 000–9 999 |    4 |
|              ≥10 000 |    5 |

### Missing

Если хотя бы один вход неизвестен:

```text
score = null
```

### Неоднозначные значения

Примеры:

```text
1/1.5
1/24
#VALUE!
text
```

не преобразуются автоматически.

### Проверка семантики

Если значение формально числовое, но выглядит аномальным:

```text
verification_required = true
```

Например:

```text
256 часов на экземпляр
```

может участвовать в PRE-SCORE, но до VERIFIED SCORE необходимо подтвердить, что это именно **активные человеко-часы**, а не календарная продолжительность.

---

# 13. V3. Доля ручной работы

### rule_id

```text
V3_MANUAL_WORK_v1.1
```

### Назначение

Оценивает долю работы, выполняемую человеком вручную.

### Основной VERIFIED input

```text
manual_work_share_percent
```

### Правила

| Доля ручной работы | Балл |
| -----------------: | ---: |
|              0–10% |    1 |
|            >10–30% |    2 |
|            >30–60% |    3 |
|            >60–85% |    4 |
|               >85% |    5 |

---

## 13.1. PRE-SCORE proxy

Если фактическая доля неизвестна, PRE-SCORE может использовать признаки официального реестра.

### paper_status

| Значение  | Балл |
| --------- | ---: |
| paperless |    1 |
| mixed     |    3 |
| paper     |    5 |

### digitalization_level

| Значение          | Балл |
| ----------------- | ---: |
| digital           |    1 |
| partially_digital |    3 |
| non_digital       |    5 |

### machine_readability

| Значение                   | Балл |
| -------------------------- | ---: |
| machine_readable           |    1 |
| partially_machine_readable |    3 |
| non_machine_readable       |    5 |

Для proxy должно быть известно минимум два признака.

```text
manual_proxy =
arithmetic_mean(available_scores)
```

Округление:

```text
1.00–1.49 → 1
1.50–2.49 → 2
2.50–3.49 → 3
3.50–4.49 → 4
4.50–5.00 → 5
```

Proxy имеет статус:

```text
Derived
```

### Приоритет

Подтверждённое фактическое значение:

```text
manual_work_share_percent
```

полностью заменяет PRE proxy при расчёте текущего score.

После появления подтверждённого фактического значения proxy:

* сохраняется в истории PRE-SCORE;
* больше не участвует в текущем scoring;
* не создаёт conflict с фактическим значением.

Conflict создаётся только при противоречии между двумя или более подтверждёнными фактическими источниками:

```text
conflict = true
```

---

# 14. V4. Повторяемость

### rule_id

```text
V4_REPEATABILITY_v1.1
```

### Назначение

Оценивает степень стандартизации процесса.

### Основной вход

```text
standard_scenario_share_percent
```

Это доля экземпляров процесса, проходящих по типовому сценарию без существенного индивидуального решения.

### Правила

| Доля стандартных случаев | Балл |
| -----------------------: | ---: |
|                     <20% |    1 |
|                   20–39% |    2 |
|                   40–69% |    3 |
|                   70–89% |    4 |
|                     ≥90% |    5 |

---

## 14.1. Качественная альтернатива

Если процент определить невозможно, допускается подтверждённый enum:

```text
unique = 1
mostly_unique = 2
mixed = 3
mostly_standard = 4
standard = 5
```

Если имеется подтверждённый количественный показатель, он имеет приоритет.

При противоречии:

```text
score = null
conflict = true
```

---

# 15. V5. Проблемность

### rule_id

```text
V5_PROBLEMATICITY_v1.1
```

### Назначение

Оценивает долю экземпляров процесса, в которых возникает существенная проблема.

### Проблемами считаются

* ошибки;
* возвраты;
* задержки;
* повторная работа;
* жалобы;
* нарушение сроков;
* иные подтверждённые отклонения.

### Основной вход

```text
problem_case_share_percent
```

### Правила

| Доля проблемных случаев | Балл |
| ----------------------: | ---: |
|                    0–1% |    1 |
|                   >1–5% |    2 |
|                  >5–15% |    3 |
|                 >15–30% |    4 |
|                    >30% |    5 |

---

## 15.1. Альтернативные показатели

Если общего показателя нет, допускаются:

```text
return_rate
error_rate
delay_rate
rework_rate
complaint_rate
```

Derived proxy:

```text
problem_proxy =
max(available_problem_rates)
```

Статус:

```text
Derived
```

---

## 15.2. Качественный fallback

Если статистика отсутствует, допускается подтверждённый enum:

```text
practically_none = 1
rare = 2
periodic = 3
frequent = 4
systemic = 5
```

Количественный подтверждённый показатель имеет приоритет.

---

# 16. VALUE total

Если известны все пять критериев:

```text
value_score =
V1 + V2 + V3 + V4 + V5
```

Если хотя бы один:

```text
null
```

то:

```text
value_score = null
```

и рассчитываются:

```text
value_known_sum
value_coverage
value_range
```

---

# 17. FEASIBILITY — Реализуемость

---

## 17.1. Единое правило пересечения условий F2–F5

Если несколько правил одного критерия F2–F5 одновременно применимы на основании подтверждённых данных, используется:

```text
criterion_score = min(applicable_confirmed_rule_scores)
```

Реализуемость определяется наиболее существенным подтверждённым ограничителем.

Дополнительно:

* неизвестное ограничение не снижает score автоматически;
* для неизвестного ограничения создаётся `RISK_REQUIRES_VERIFICATION`;
* если данных недостаточно для однозначного применения правил, `score = null`;
* для VERIFIED SCORE должны быть известны все обязательные входные признаки соответствующего критерия.

---

# 18. F1. Доступность данных

### rule_id

```text
F1_DATA_AVAILABILITY_v1.1
```

### Назначение

Оценивает возможность реально использовать необходимые данные в MVP.

Критерий состоит из трёх компонентов:

1. полнота данных;
2. доступ;
3. готовность.

---

## 18.1. Полнота

Input:

```text
data_coverage_percent
```

| Полнота | Балл |
| ------: | ---: |
|    <20% |    1 |
|  20–39% |    2 |
|  40–69% |    3 |
|  70–89% |    4 |
|    ≥90% |    5 |

---

## 18.2. Доступ

Input:

```text
data_access_level
```

| Значение                  | Балл  |
| ------------------------- | ----: |
| confirmed_no_access       |     1 |
| strongly_restricted       |     2 |
| partial_or_after_approval |     3 |
| mostly_available          |     4 |
| confirmed_ready           |     5 |
| unknown                   |  null |

Неизвестность никогда не преобразуется в минимальный балл.

---

## 18.3. Готовность

Input:

```text
data_readiness_level
```

| Значение                          | Балл |
| --------------------------------- | ---: |
| unusable                          |    1 |
| major_preparation                 |    2 |
| partial_structure                 |    3 |
| mostly_ready                      |    4 |
| structured_machine_readable_ready |    5 |

---

## 18.4. Итог F1

Используется принцип слабого звена:

```text
data_score =
min(
    coverage_score,
    access_score,
    readiness_score
)
```

Для VERIFIED SCORE все три компонента должны быть известны.

Если хотя бы один компонент:

```text
null
```

то:

```text
F1 = null
```

---

# 19. F2. Простота интеграций

### rule_id

```text
F2_INTEGRATION_SIMPLICITY_v1.1
```

### Назначение

Оценивает сложность подключения будущего решения к существующим информационным системам.

Для каждой интеграции рекомендуется хранить:

```text
system_name
critical
mechanism
api_documented
access_confirmed
custom_development_required
approval_required
```

### 5 баллов

Интеграции не требуются;

**или одновременно:**

* требуется не более двух интеграций;
* существуют готовые документированные API;
* доступ подтверждён;
* custom connector не требуется.

### 4 балла

* 1–2 понятные доступные интеграции;
* требуется настройка или небольшая адаптация.

### 3 балла

* три и более доступных интеграции;

или:

* одна интеграция требует собственного адаптера/коннектора, но механизм технически понятен.

### 2 балла

* несколько закрытых систем;
* сложные согласования;
* стандартного API нет;
* существует реалистичный workaround.

Например:

* файловый обмен;
* экспорт/импорт;
* промежуточный шлюз.

### 1 балл

Есть критически необходимая система, для которой подтверждено отсутствие:

* API;
* файлового обмена;
* другого допустимого способа интеграции.

### BLOCKER

Если ограничение подтверждено:

```text
BLOCKER = CRITICAL_INTEGRATION_UNAVAILABLE
```

Если пока не подтверждено:

```text
RISK_REQUIRES_VERIFICATION
```

---

# 20. F3. Техническая реализуемость

### rule_id

```text
F3_TECHNICAL_FEASIBILITY_v1.1
```

### Назначение

Оценивает реализуемость предполагаемого решения относительно команды:

```text
BSA
Frontend
Backend
Designer
QA
```

### Входы

Минимально:

```text
required_technologies
critical_competencies
ml_cv_ds_required
rd_required
technical_dependencies
technical_risks
```

### 5 баллов

* критических competency gaps нет;
* используется стандартный стек;
* R&D / PoC не требуется;
* технологии понятны.

### 4 балла

* критических gaps нет;
* не более одного умеренного технологического риска;
* команда в основном обладает необходимыми компетенциями.

### 3 балла

* решение реализуемо;
* требуется изучение новой технологии и/или небольшой PoC;
* есть несколько умеренных рисков;
* критических неподконтрольных gaps нет.

### 2 балла

* присутствует существенный технологический риск;

или:

* нужна компетенция, которой в команде нет, но существует реалистичный способ её привлечь, заменить сервисом или ограничением scope.

### 1 балл

* отсутствует критическая компетенция и нет реалистичного способа закрыть её;

или:

* успех зависит от неопределённого исследовательского результата.

### Source requirement

Для VERIFIED SCORE F3 должен подтверждаться профильным техническим источником:

```text
IT
system_owner
technical_expert
```

Ответ владельца бизнес-процесса сам по себе недостаточен.

---

# 21. F4. MVP за 3 месяца

### rule_id

```text
F4_MVP_3_MONTHS_v1.1
```

### Назначение

Оценивает возможность выделить самостоятельный полезный результат, реализуемый примерно за три месяца.

### Входы

```text
mvp_scope_defined
end_to_end_scenario_defined
secondary_functions_excludable
critical_external_dependencies
technical_time_estimate
user_value_demonstrable
```

### 5 баллов

За 3 месяца реалистично получить:

* работающий end-to-end MVP;
* основной пользовательский сценарий;
* измеримый результат.

### 4 балла

End-to-end MVP реалистичен, но:

* часть функций исключается;
* scope ограничивается;
* используются ограниченные данные, пользователи или подразделения.

### 3 балла

Возможен сильно ограниченный, но полезный MVP.

Например:

* один тип документа;
* один сценарий;
* одно подразделение;
* одна интеграция.

### 2 балла

Возможен только:

* PoC;
* технический prototype;
* demo fragment без полного пользовательского сценария.

### 1 балл

* даже ограниченный prototype за три месяца малореалистичен;

или:

* невозможно выделить самостоятельный полезный scope.

### BLOCKER

Если невозможность подтверждена:

```text
BLOCKER = NO_VIABLE_MVP_SCOPE
```

---

# 22. F5. Измеримость результата

### rule_id

```text
F5_MEASURABILITY_v1.1
```

### Назначение

Оценивает возможность доказать эффект изменений.

### Входы

```text
primary_kpi_defined
kpi_count
baseline_available
baseline_collectable
before_after_comparable
measurement_method_defined
```

### 5 баллов

Есть одновременно:

* основной KPI;
* baseline;
* способ измерения;
* прямое сравнение before/after.

### 4 балла

* определено несколько количественных KPI;
* baseline можно собрать до начала разработки;
* сравнение before/after реалистично.

### 3 балла

* есть минимум один количественный KPI;
* baseline частичный либо требует дополнительного сбора.

### 2 балла

* эффект измеряется преимущественно качественно;
* используются косвенные показатели;
* полноценного baseline нет.

### 1 балл

* объективный KPI не определён;
* достоверное сравнение с исходным состоянием невозможно.

### BLOCKER

Подтверждённая невозможность измерить эффект может создавать:

```text
BLOCKER = EFFECT_NOT_MEASURABLE
```

---

# 23. FEASIBILITY total

Если все пять критериев известны:

```text
feasibility_score =
F1 + F2 + F3 + F4 + F5
```

Если хотя бы один критерий:

```text
null
```

то:

```text
feasibility_score = null
```

и рассчитываются:

```text
feasibility_known_sum
feasibility_coverage
feasibility_range
```

---

# 24. Интерпретация /25

Стартовая конфигурация v1.1:

| Баллы | Уровень       |
| ----: | ------------- |
|   5–9 | low           |
| 10–14 | below_average |
| 15–18 | medium        |
| 19–22 | high          |
| 23–25 | very_high     |

Порог высокой оценки:

```text
>=19
```

Значения должны храниться в конфигурации.

---

# 25. Матрица Value × Feasibility

Основной способ приоритизации:

```text
                       FEASIBILITY
                  low               high

VALUE   high      strategic         MVP candidate
                  constrained

        low       low priority      local improvement
```

Rule Engine не должен автоматически объявлять процесс приоритетным только по сумме `/50`.

---

# 26. BLOCKER

BLOCKER — не штрафной балл.

Он хранится отдельно от 25/25.

Минимальные типы:

```text
NO_PROCESS_OWNER_OR_EXPERT
CRITICAL_DATA_UNAVAILABLE
LEGAL_INFOSEC_PDN_BLOCK
CRITICAL_INTEGRATION_UNAVAILABLE
NO_VIABLE_MVP_SCOPE
EFFECT_NOT_MEASURABLE
```

Если ограничение пока не подтверждено:

```text
RISK_REQUIRES_VERIFICATION
```

BLOCKER:

* не обнуляет VALUE;
* не обнуляет FEASIBILITY;
* может существовать одновременно с VERIFIED SCORE.

---

# 27. RISK

RISK — обстоятельство, которое:

* увеличивает сложность;
* может изменить оценку;
* требует дополнительной проверки;
* не запрещает продолжение анализа.

---

# 28. Приоритет evidence

Rule Engine не использует универсальное правило:

> «источник X всегда важнее источника Y».

Используются следующие принципы:

1. Подтверждённый количественный факт имеет приоритет перед качественным enum.
2. Подтверждённый фактический показатель имеет приоритет перед PRE proxy.
3. Registry fact не перезаписывается Interview fact.
4. Противоречие источников создаёт `conflict`.
5. LLM hypothesis никогда не имеет приоритета над Confirmed/Derived evidence.
6. Derived fact допустим только при наличии provenance.
7. При конфликте Rule Engine не выбирает значение самостоятельно.

---

# 29. Формат результата одного критерия

Пример:

```json
{
  "criterion": "frequency",
  "rule_id": "V1_FREQUENCY_v1.1",
  "score": 4,
  "status": "Derived",
  "evidence": [
    {
      "fact_id": "fact-001",
      "field": "annual_instances",
      "value": 870,
      "source_type": "registry",
      "status": "Confirmed"
    }
  ],
  "applied_rule": "250 <= annual_instances < 1000",
  "methodology_version": "1.1",
  "missing_facts": [],
  "conflict": false
}
```

При отсутствии данных:

```json
{
  "criterion": "problematicity",
  "rule_id": "V5_PROBLEMATICITY_v1.1",
  "score": null,
  "status": "Unknown",
  "evidence": [],
  "missing_facts": [
    "problem_case_share_percent"
  ],
  "conflict": false
}
```

---

# 30. Итоговый формат Rule Engine

Пример:

```json
{
  "process_id": "MLH-001",
  "analysis_unit_id": "MLH-001-A",
  "score_status": "INTERVIEW_SCORE",
  "methodology_version": "1.1",

  "value": {
    "criteria": {
      "frequency": 5,
      "labor": 4,
      "manual_work": 5,
      "repeatability": 4,
      "problematicity": null
    },
    "score": null,
    "known_sum": 18,
    "coverage": 0.8,
    "range": [19, 23]
  },

  "feasibility": {
    "criteria": {
      "data_availability": 4,
      "integration_simplicity": 3,
      "technical_feasibility": 4,
      "mvp_3_months": 5,
      "measurability": 4
    },
    "score": 20,
    "known_sum": 20,
    "coverage": 1.0,
    "range": [20, 20]
  },

  "blockers": [],

  "risks": [
    "Не подтверждён доступ к внешнему API"
  ],

  "conflicts": [],

  "missing_facts": [
    "problem_case_share_percent"
  ]
}
```

---

# 31. Score status

Допустимые состояния:

```text
PRE_SCORE
INTERVIEW_SCORE
VERIFIED_SCORE
```

## PRE_SCORE

Использованы только:

* Confirmed Registry facts;
* допустимые Derived facts из них.

## INTERVIEW_SCORE

Использованы подтверждённые дополнительные факты, но условия VERIFIED ещё не выполнены.

## VERIFIED_SCORE

Все условия раздела 7.3 выполнены.

---

# 32. Требования к конфигурации

Все числовые пороги и mappings должны храниться вне программного кода.

Минимально конфигурируются:

```text
frequency_thresholds
labor_thresholds
manual_work_thresholds
repeatability_thresholds
problematicity_thresholds
data_availability_thresholds
integration_rules
technical_feasibility_rules
mvp_rules
measurability_rules
interpretation_levels
blocker_rules
methodology_version
```

Изменение конфигурации создаёт новую версию методики.

---

# 33. Explainability

Для каждого score должно быть возможно определить:

* критерий;
* итоговый балл;
* использованный input;
* источник input;
* статус evidence;
* применённый `rule_id`;
* версию методики;
* основание балла;
* missing facts;
* conflicts;
* связанные risks/blockers.

---

# 34. Воспроизводимость

При одинаковых:

* input snapshot;
* facts;
* fact statuses;
* conflicts;
* methodology version;

Rule Engine должен выдавать одинаковый результат.

LLM не участвует непосредственно в расчёте formal score.

---

# 35. Что Rule Engine не делает

Rule Engine не должен:

* анализировать свободный текст;
* проводить интервью;
* формулировать естественно-языковые вопросы;
* выбирать между конфликтующими источниками;
* придумывать отсутствующие факты;
* создавать automation hypotheses;
* изменять официальный реестр.

Его задача:

```text
structured facts
→ validate evidence
→ apply deterministic rules
→ return explainable score
```

---

# 36. Что Rule Engine передаёт LLM Agent

После расчёта Rule Engine возвращает:

* рассчитанные criteria;
* `null` criteria;
* missing facts;
* conflicts;
* risks;
* blockers;
* coverage;
* range;
* evidence;
* applied rule IDs;
* score status.

LLM Agent использует это для:

* подготовки вопросов;
* выбора следующего эксперта;
* объяснения результата;
* формирования гипотез.

---

# 37. Проверка полноты спецификации

Перед запуском scoring система должна проверить:

1. Определены все 10 criteria.
2. Для каждого определены баллы 1–5.
3. Для каждого существует `rule_id`.
4. Определены входные fields.
5. Определены единицы измерения, где применимо.
6. Определено поведение при Missing.
7. Определено поведение при Conflict.
8. Определены evidence requirements.
9. Определена methodology version.
10. Конфигурация успешно загружена.

Если любое условие не выполнено:

```text
SCORING_DISABLED = true
```

---

# 38. Acceptance Criteria Rule Engine v1.1

Реализация считается соответствующей спецификации, если:

* одинаковый input всегда даёт одинаковый score;
* LLM не может напрямую изменить score;
* Missing не превращается в 1 или другое default value;
* range рассчитывается корректно;
* PRE использует только Registry/Derived evidence;
* LLM-extracted fact до подтверждения не участвует в scoring;
* VERIFIED невозможен при `null`;
* VERIFIED невозможен при unresolved scoring conflict;
* BLOCKER хранится отдельно от score;
* BLOCKER может сосуществовать с VERIFIED SCORE;
* Derived содержит provenance;
* каждый criterion result содержит `rule_id`;
* thresholds вынесены в конфигурацию;
* старые результаты сохраняют свою methodology version.

---

# 39. Стартовые пороги и калибровка

Числовые пороги версии 1.1 являются **стартовой нормативной конфигурацией MVP**.

Они используются для разработки и тестирования Rule Engine.

После пилотирования пороги могут быть откалиброваны на реальных данных.

Изменение порогов требует:

```text
new methodology version
```

Например:

```text
1.2
```

Исторические оценки, рассчитанные по версии 1.1, не пересчитываются автоматически.
