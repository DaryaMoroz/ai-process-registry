# REGISTRY_MAPPING_MLH.md

# Формальная спецификация импорта реестра МЛХ

**Статус документа:** нормативный mapping-профиль для MVP  
**Профиль:** `registry_mlh`  
**Версия mapping:** `1.0.0`  
**Официальный источник структуры:** `Реестр МЛХ.xlsm`  
**Контрольная сумма проверенного файла (SHA-256):** `7f5dbcf3a62ca03b7ff37e9f4cef432db8e927f7c4a3744d9611c9fa857a3f02`

Документ определяет импорт реестра МЛХ в read-only режиме. Он не определяет правила scoring. Формальные баллы рассчитываются только по `SCORING_ENGINE_SPEC.md` версии 1.1.

---

# 1. Назначение mapping-профиля

Профиль преобразует строки совместимого листа официального реестра МЛХ в технические `SourceRow`, внутренние `Process`, первичные `AnalysisUnit`, Confirmed Registry Facts и Data Quality Issues.

Профиль обязан:

- сохранить исходный Excel без изменений;
- сохранить исходные заголовки и значения;
- отделить исходное значение от нормализованного;
- читать формулы только вместе с сохранённым cached result, без пересчёта;
- классифицировать строки до создания scoring-сущностей;
- не считать агрегирующие, итоговые, пустые и неопределённые строки;
- не использовать номер строки или официальный код как постоянный `process_id`;
- не превращать неизвестное значение в минимальный балл.

Mapping не выполняет scoring и не добавляет бизнес-критерии.

---

# 2. Идентификатор, версия и форматы

```yaml
profile_id: registry_mlh
mapping_version: 1.0.0
fingerprint_version: mlh-fp-v1
default_sheet: Лист3
supported_extensions:
  - .xlsx
  - .xlsm
read_mode: read_only
formula_recalculation: forbidden
```

Расширение проверяется без учёта регистра. Файл также должен быть корректным OOXML ZIP-контейнером соответствующего типа. Форматы `.xls`, `.xlsb`, `.ods`, `.csv` этим профилем не поддерживаются.

Макросы из `.xlsm` не исполняются. Parser не сохраняет книгу поверх исходного файла.

Изменение правил заголовков, нормализации, классификации строк или fingerprint требует новой `mapping_version`. Изменение состава fingerprint требует новой `fingerprint_version`.

---

# 3. Выбор листа

1. Если пользователь явно выбрал лист из списка книги, используется точное имя выбранного листа.
2. Если лист не выбран, используется `Лист3`.
3. Если `Лист3` отсутствует и пользователь не выбрал другой лист, импорт останавливается с `MAPPING_SHEET_NOT_FOUND`. Произвольный лист не выбирается.
4. Parser архитектурно позволяет выбрать любой лист книги. Mapping-профиль применяется только после проверки совместимости заголовков выбранного листа.
5. Для `Лист3` нормативная строка заголовков — `8`.
6. Для другого выбранного листа Mapper ищет единственную строку с полным набором 19 заголовков этого профиля. Порядок колонок может отличаться. Поиск ограничен первыми 50 непустыми строками.
7. Если полная сигнатура не найдена или найдена более одного раза, scoring не запускается: `MAPPING_HEADER_NOT_FOUND` или `MAPPING_HEADER_AMBIGUOUS`.

В проверенной книге полную сигнатуру профиля имеют `Лист3` и `10_МЛХ`. Лист `Цифра` имеет другую структуру и не проходит профиль `registry_mlh` версии `1.0.0`.

---

# 4. Фактическая строка заголовков

Для `Лист3`:

```text
header_row = 8
header_range = A8:S8
```

Заголовок `N8` содержит перевод строки после слов `С кем сквозной `. При поиске заголовка последовательности пробелов, `CR`, `LF` и `CRLF` приводятся к одному пробелу. Сам исходный текст заголовка сохраняется без изменения.

Строки `1–7` относятся к оформлению и метаданным листа и не являются строками процессов. В частности, `A6` содержит примечание `*Обязательно к заполнению`.

---

# 5. Фактическая первая строка данных

Для `Лист3`:

```text
first_data_row = 9
```

Первая строка данных определяется как `header_row + 1`. Пустые строки после заголовка допускаются и классифицируются как `EMPTY`.

---

# 6. Определение конца таблицы

Для выбранного листа конец таблицы — последняя строка, в которой хотя бы одна сопоставленная колонка профиля содержит:

- literal value;
- formula;
- cached value;
- Excel error.

Учитываются только сопоставленные колонки, найденные по заголовкам профиля. Форматирование, стили, ширина колонок, merged cells и `worksheet dimension` не считаются данными.

Для `Лист3`:

```text
last_data_row = 17
data_range = A9:S17
source_rows = 9
```

Фактический XML dimension листа равен `A1:EA17` из-за форматирования. Колонки `T:EA` не расширяют таблицу данных.

---

# 7. Полное соответствие колонок

Буквы ниже фиксируют фактическую структуру проверенного `Лист3`. Runtime mapping выполняется по нормализованному официальному заголовку, а не по позиции колонки. Поэтому изменение порядка колонок при сохранении названий не ломает mapping.

Обозначения обязательности:

- `REQUIRED` — заголовок помечен `*` в официальном реестре;
- `CONDITIONAL` — условие записано в официальном заголовке;
- `OPTIONAL` — поле не помечено как обязательное.

| Колонка | Точное официальное название | Canonical field | Ожидаемый тип | Обязательность | Нормализация |
|---|---|---|---|---|---|
| A | `Министерство*` | `ministry` | string | REQUIRED | trim, Unicode NFKC, нормализация пробелов; регистр сохраняется |
| B | `Идентификатор процесса*` | `official_process_code` | string identifier | REQUIRED | trim, NFKC, нормализация пробелов; точки и знаки сохраняются; уникальность не предполагается |
| C | `Группа процессов` | `process_group` | string | OPTIONAL | trim, NFKC, нормализация пробелов |
| D | `Название процесса*` | `process_name` | string | REQUIRED | trim, NFKC, нормализация пробелов и переводов строк; исходная пунктуация сохраняется |
| E | `Ответственный за процесс*` | `process_owner` | string | REQUIRED | trim, NFKC, нормализация пробелов |
| F | `Статус процесса (статус реинжиниринга)*` | `reengineering_status` | enum/string | REQUIRED | token normalization и mapping статусов из раздела 7.1 |
| G | `Клиент*` | `client` | string | REQUIRED | trim, NFKC, нормализация пробелов |
| H | `Данные на входе (вход процесса)*` | `process_input` | string | REQUIRED | trim, NFKC, нормализация пробелов и переводов строк |
| I | `Результат на выходе*` | `process_output` | string | REQUIRED | trim, NFKC, нормализация пробелов и переводов строк |
| J | `Вид процесса*` | `process_kind` | enum | REQUIRED | `основной` → `core`; `вспомогательный` → `supporting` |
| K | `Человеко/часы (на исполнение 1 экземпляра процесса)` | `hours_per_instance` | non-negative decimal, hours | OPTIONAL | числовое значение без округления; правила раздела 7.2 |
| L | `Количество экземпляров процесса в год` | `annual_instances` | non-negative number, instances/year | OPTIONAL | числовое значение без округления; правила раздела 7.2 |
| M | `Признак сквозного процесса*` | `cross_process_flag` | enum | REQUIRED | `сквозной` → `cross_functional`; `несквозной` → `non_cross_functional` |
| N | `С кем сквозной \n(заполняется, если в предыдущем столбе выбрано "сквозной")` | `cross_process_parties` | string/list source | CONDITIONAL | trim, NFKC; в MVP хранится как один текст без автоматического разделения организаций |
| O | `Роль Министерства в сквозном потоке` | `ministry_role_in_cross_process` | string | OPTIONAL | trim, NFKC, token normalization; неизвестные роли не угадываются |
| P | `Тип процесса*` | `paper_status` | enum | REQUIRED | `бумажный` → `paper`; `безбумажный` → `paperless` |
| Q | `Формат процесса*` | `digitalization_level` | enum | REQUIRED | `цифровой` → `digital`; `частично цифровой` → `partially_digital`; `нецифровой` → `non_digital` |
| R | `Машиночитаемость в процессе*` | `machine_readability` | enum | REQUIRED | `машиночитаемый` → `machine_readable`; `частично машиночитаемый` → `partially_machine_readable`; `немашиночитаемый` → `non_machine_readable` |
| S | `Точка размещения в цифровом виде` | `digital_location` | string | OPTIONAL | trim, NFKC, нормализация пробелов; URL не конструируется и не проверяется по предположению |

## 7.1. Enum normalization

Перед сопоставлением enum выполняются: trim, NFKC, перевод в нижний регистр, `ё` → `е`, схлопывание whitespace.

Наблюдаемые и поддерживаемые статусы F:

| Source token | Canonical value |
|---|---|
| `в очереди на исследование` | `queued_for_research` |
| `проходит реинжиниринг` | `in_reengineering` |
| `прошёл реинжиниринг` / `прошел реинжиниринг` | `reengineered` |

Значение, отсутствующее в таблице enum, не подменяется ближайшим вариантом. `normalized_value = null`, raw сохраняется, создаётся `UNMAPPED_ENUM_VALUE`.

## 7.2. Numeric normalization

Для K и L принимаются:

- числовая Excel-ячейка;
- числовой cached result формулы;
- текст, целиком соответствующий одному числу с единственным десятичным разделителем `.` или `,` и без единиц измерения.

Запятая в однозначном десятичном числе заменяется на точку. Значение не округляется.

Не интерпретируются автоматически:

```text
1/24
1/1.5
по необходимости
маршруты
площадь
text
Excel error
```

Отрицательное значение становится `null` с `NEGATIVE_NUMBER`. Ноль сохраняется как факт. Для `annual_instances = 0` дополнительно создаётся `ZERO_OR_INACTIVE_PROCESS`, а V1 остаётся `null` согласно `SCORING_ENGINE_SPEC.md`.

---

# 8. Модель чтения ячейки

Для каждой сопоставленной ячейки сохраняется:

```json
{
  "coordinate": "K13",
  "original_header": "Человеко/часы (на исполнение 1 экземпляра процесса)",
  "source_cell_type": "n",
  "cell_type": "FORMULA",
  "raw_value": "35",
  "formula": "=K14+K15+K16+K17+K18+K19+K20+K21+K22+K23+K24+K25+K26",
  "cached_value": 35,
  "cached_cell_type": "NUMBER",
  "normalized_value": 35,
  "normalization_status": "OK"
}
```

Правила:

1. `raw_value` — декодированный payload Excel без бизнес-нормализации. Для shared string сохраняется строка, на которую указывает индекс. Для formula cell это сохранённый `<v>`; он не считается результатом нового вычисления.
2. `formula` — выражение из ячейки с ведущим `=`. Для literal cell — `null`.
3. `cached_value` заполняется только для formula cell и типизируется отдельно.
4. `normalized_value` получается из `raw_value` для literal cell или из `cached_value` для formula cell.
5. `source_cell_type` сохраняет исходный тип OOXML (`s`, `inlineStr`, `n`, `b`, `e`, `str`, `d` или blank).
6. `cell_type` принимает `BLANK`, `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `ERROR` или `FORMULA`.
7. Пустая ячейка и строка, содержащая только whitespace, дают `normalized_value = null`.
8. Исходное значение, формула и cached value не перезаписываются нормализованным значением.

---

# 9. Excel formulas без пересчёта

1. Parser не вызывает Excel, LibreOffice или иной calculation engine.
2. Parser не вызывает `calculate`, `recalculate`, `fullCalc` и не сохраняет книгу.
3. Для formula cell сохраняются formula и cached result как независимые атрибуты.
4. Валидный cached result может быть нормализован и использован как Registry fact только для строки `PROCESS` и только если тип значения соответствует mapping.
5. Отсутствующий cached result даёт `normalized_value = null` и `FORMULA_CACHE_MISSING`.
6. Cached Excel error даёт `normalized_value = null` и `FORMULA_CACHE_ERROR`.
7. Cached result неподходящего или неоднозначного типа даёт `normalized_value = null` и `FORMULA_CACHE_UNINTERPRETABLE`.
8. Ссылка формулы за пределы фактического диапазона выбранной таблицы не вычисляется. Создаётся `FORMULA_REFERENCE_OUTSIDE_TABLE`.
9. Формула в K или L, агрегирующая значения других строк, является признаком generic classification `AGGREGATE` независимо от наличия cached result; явный `rowType` профильного mapping имеет приоритет (§10.7).
10. Валидность cached result не доказывается повторным вычислением. В provenance указывается `value_origin = formula_cached_value`.
11. Shared formulas являются реальными формулами. Для `<f t="shared" si="..."/>` parser находит master той же группы `si` на том же листе, проверяет declared `ref` и раскрывает ссылки с относительным смещением, сохраняя абсолютные и смешанные ссылки. Исходный текст и атрибуты формулы, координата master, диапазон группы и раскрытая формула сохраняются отдельно от cached result. Раскрытие ссылок не является пересчётом Excel. Отсутствующий/неоднозначный master или выход за declared `ref` не компенсируются предположением.

На `Лист3` находятся восемь formula cells: `K13`, `L13`, `K14`, `L14`, `K15`, `L15`, `K16`, `L16`. `K13` — master shared-группы `si=0`, `ref=K13:L14`; `L13`, `K14`, `L14` — dependent cells. Все имеют сохранённые числовые cached results и после раскрытия ссылок ссылаются за пределы строки 17. Формулы сохраняются для аудита. Строки `13`, `15`, `16` не участвуют в scoring; строка `14` является `PROCESS` по явному решению профиля (§10.7).

---

# 10. Классификация строк

Generic classification выполняется в порядке §10.1–10.6 и определяет предварительный тип по raw/formula/cached данным колонок профиля. Затем применяется explicit profile classification (§10.7): если профиль явно задаёт `rowType`, он имеет приоритет над generic classification, включая признаки агрегирующих формул. Для строк без явного типа сохраняется generic classification. Для аудита сохраняются предварительный тип, его evidence и основание профильного override. `AnalysisUnit` создаётся только для итогового `PROCESS`.

## 10.1. EMPTY

`EMPTY`, если во всех сопоставленных ячейках строки отсутствуют literal value, formula, cached value и Excel error. Форматирование не считается содержимым.

## 10.2. TOTAL

`TOTAL`, если нормализованный текст любой из A:D равен одному из маркеров:

```text
итого
общий итог
всего
total
grand total
```

или начинается с `итого ` / `всего ` и остальные данные строки имеют характер итоговых значений. Маркер сравнивается после token normalization, но raw сохраняется.

## 10.3. AGGREGATE

`AGGREGATE`, если выполняется хотя бы одно условие:

1. K или L содержит формулу, которая ссылается минимум на две ячейки той же метрики в других строках и использует сложение или `SUM`;
2. формула K или L агрегирует диапазон других строк;
3. строка одновременно имеет имя в D и агрегирующую формулу из условий 1–2.

Cached result не меняет предварительный тип строки. Явный `rowType` профильного mapping имеет приоритет над этой эвристикой.

## 10.4. GROUP_HEADER

`GROUP_HEADER`, если:

- D пусто;
- хотя бы одно из A, B, C непусто;
- K:S не содержат значений или формул;
- строка не классифицирована как `TOTAL` или `AGGREGATE`.

## 10.5. PROCESS

`PROCESS`, если:

- `process_name` в D непусто;
- строка не классифицирована как `TOTAL` или `AGGREGATE`;
- отсутствуют взаимоисключающие структурные признаки.

Недостающие поля, кроме имени, создают Data Quality Issues, но не превращают известный самостоятельный процесс в минимальный score.

## 10.6. UNKNOWN

`UNKNOWN`, если строка имеет содержимое, но не удовлетворяет условиям предыдущих типов либо содержит конфликтующие признаки. `UNKNOWN` всегда требует проверки человеком и не допускается в scoring.

## 10.7. Фактическая классификация `Лист3`

Следующая таблица задаёт explicit rowType для `registry_mlh v1.0.0` на листе `Лист3` утверждённого источника с SHA-256 `7f5dbcf3a62ca03b7ff37e9f4cef432db8e927f7c4a3744d9611c9fa857a3f02`. Область действия привязана к checksum и листу, чтобы позиции строк этого источника не переопределяли строки других загрузок. Это profile-specific mapping, а не глобальный список строк в parser и не ограничение количества процессов. Для других источников и строк без явного profile mapping действуют generic rules; номера строк не являются постоянными идентификаторами процессов.

| Строки | Row type | Основание |
|---|---|---|
| 9, 10, 11, 12, 17 | `PROCESS` | явное решение профиля; непустое название |
| 14 | `PROCESS` | явное решение профиля имеет приоритет над агрегирующими shared formulas `K14`/`L14` |
| 13 | `AGGREGATE` | явное решение профиля; `K13` и раскрытая shared formula `L13` суммируют другие строки |
| 15 | `AGGREGATE` | `K15` и `L15` суммируют значения других строк |
| 16 | `AGGREGATE` | `K16` и `L16` суммируют значения других строк |
| — | `GROUP_HEADER`, `TOTAL`, `EMPTY`, `UNKNOWN` | среди строк 9–17 отсутствуют |

---

# 11. Формальные условия `scoring_eligible`

```text
scoring_eligible =
  row_type == PROCESS
  AND normalized.process_name != null
  AND primary_analysis_unit.status == ACTIVE
```

Дополнительные правила:

- `GROUP_HEADER`, `AGGREGATE`, `TOTAL`, `EMPTY`, `UNKNOWN` всегда имеют `scoring_eligible = false`;
- отсутствие отдельного scoring input делает соответствующий критерий `null`, но не исключает остальные критерии;
- invalid K не запрещает V1, если L валиден;
- invalid L запрещает V1 и V2, но не остальные критерии;
- дубли official process code не меняют `scoring_eligible`;
- неоднозначный cross-version matching не меняет тип текущей строки и не разрешает автоматическое объединение процессов;
- scoring применяется к `AnalysisUnit`, а не непосредственно к Excel-строке.

Для проверенного `Лист3` `scoring_eligible = true` у шести строк: `9, 10, 11, 12, 14, 17`.

---

# 12. Идентификаторы

## 12.1. `source_row_id`

Идентификатор строки конкретной загрузки:

```text
source_row_id = UUIDv5(
  NS_SOURCE_ROW_MLH,
  registry_version_id + "\n" + exact_sheet_name + "\n" + excel_row_number
)
```

Свойства:

- уникален в пределах конкретной версии загрузки;
- воспроизводим для повторного parsing той же версии;
- меняется при новой `registry_version_id`;
- может использовать номер строки, потому что не является постоянной идентичностью процесса.

## 12.2. `process_id`

`process_id` — непрозрачный UUID, назначаемый системой при первом появлении процесса. Он не вычисляется из номера строки, official process code или fingerprint.

При загрузке новой версии `process_id` переиспользуется только после однозначного matching по правилам раздела 14. Во всех остальных случаях создаётся новый `process_id` и сохраняется необходимость проверки связи.

## 12.3. `source_fingerprint`

```text
source_fingerprint =
  "mlh-fp-v1:" + sha256(UTF-8(canonical_json(identity_fields)))
```

`canonical_json`:

- фиксированный порядок ключей;
- Unicode NFKC;
- lower case;
- `ё` → `е`;
- NBSP → обычный пробел;
- whitespace схлопывается;
- внешние пробелы удаляются;
- пунктуация и цифры сохраняются;
- отсутствующее optional field представляется как `null`.

Если `process_name = null`, fingerprint не создаётся и возникает `PROCESS_NAME_MISSING`.

---

# 13. Состав fingerprint

## 13.1. Входят

| Canonical field | Причина |
|---|---|
| `ministry` | организационный контекст процесса |
| `official_process_code` | полезный, но не уникальный классификационный признак |
| `process_group` | контекст группы, допускается `null` |
| `process_name` | основной смысловой идентификатор |
| `process_kind` | различает основной и вспомогательный контекст |

Ни одно поле, включая `official_process_code`, не используется как уникальный ключ отдельно.

## 13.2. Не входят

- имя файла, checksum и `registry_version_id`;
- имя листа и номер строки;
- `process_owner`;
- `reengineering_status`;
- `client`;
- `process_input` и `process_output`;
- K и L;
- признаки сквозности и участники M:O;
- P:R;
- `digital_location`;
- любые аналитические данные, интервью, LLM hypotheses и scores.

Исключённые поля могут изменяться между версиями и не должны сами по себе создавать новую идентичность процесса.

---

# 14. Matching между версиями

1. Matching выполняется только между строками `PROCESS`.
2. Совпадение fingerprint считается кандидатом, а не доказательством уникальности.
3. Если один fingerprint новой версии соответствует ровно одному существующему `process_id`, и этот `process_id` ещё не сопоставлен другой строке текущей версии, `process_id` переиспользуется автоматически.
4. Если совпадений нет, создаётся новый `process_id`.
5. Если найдено более одного кандидата, несколько новых строк имеют одинаковый fingerprint или один существующий process претендует на несколько строк, автоматическое объединение запрещено.
6. При неоднозначности создаются новый `process_id`, `AMBIGUOUS_PROCESS_MATCH` и identity review task. Ни одна строка не удаляется и не объединяется.
7. Возможное сходство по названию может использоваться только для списка кандидатов. Fuzzy match не переиспользует `process_id` автоматически.
8. Решение человека о связи версий хранится в аналитическом слое с actor, timestamp и source references. Исходные строки не изменяются.

---

# 15. Confirmed Registry Facts

Для `PROCESS`-строки непустое валидное canonical field создаёт Confirmed Registry Fact:

```json
{
  "fact_status": "Confirmed",
  "fact_source": "registry",
  "canonical_field": "annual_instances",
  "value": 12,
  "unit": "instances_per_year",
  "source_row_id": "...",
  "source_ref": {
    "sheet": "Лист3",
    "row": 9,
    "column": "L",
    "coordinate": "L9"
  },
  "value_origin": "literal",
  "mapping_version": "1.0.0"
}
```

Правила:

1. Факт создаётся только из валидного `normalized_value`.
2. Нормализация регистра, whitespace, числа или утверждённого enum не превращает Registry fact в LLM inference.
3. Для formula cell `value_origin = formula_cached_value`, а formula сохраняется в evidence.
4. Для `AGGREGATE`, `GROUP_HEADER`, `TOTAL`, `EMPTY`, `UNKNOWN` scoring facts не создаются.
5. `null`, invalid и ambiguous значения не создают Confirmed fact. Для них создаются Unknown state и Data Quality Issue.
6. Raw source value всегда остаётся доступным рядом с фактом.
7. PRE-SCORE получает только Confirmed Registry Facts и допустимые Derived facts из них.

---

# 16. Derived Facts

Derived fact создаётся только детерминированным версионируемым правилом и содержит `derivation_rule_id`, версию и `input_fact_ids`.

Для этого mapping-профиля разрешены следующие downstream derivations:

| Derived fact | Входы | Владелец правила | Условие |
|---|---|---|---|
| `annual_labor_hours` | `annual_instances × hours_per_instance` | Rule Engine, V2 | оба Confirmed/Derived input валидны |

Mapping не рассчитывает баллы V1–V5/F1–F5. Он передаёт нормализованные facts и provenance. `annual_labor_hours` рассчитывается в аналитическом/Rule Engine слое, чтобы единственным источником scoring-логики оставался `SCORING_ENGINE_SPEC.md`.

Колонки P/Q/R (`paper_status`, `digitalization_level`, `machine_readability`) продолжают парситься и храниться как Registry facts. Они не являются scoring inputs V3. V3 proxy запрещён; `manual_work_proxy` не создаётся. В официальных 19 колонках нет `manual_work_share_percent`, поэтому данный профиль сам по себе не предоставляет допустимый фактический input V3 и результат V3 для текущего PRE-SCORE равен `null`. Mapping, нормализация, row classification и версии профиля не изменяются.

LLM output не является Derived fact.

---

# 17. Первичная AnalysisUnit

Для каждой строки `PROCESS` создаётся ровно одна первичная единица:

```json
{
  "analysis_unit_id": "uuid",
  "process_id": "uuid",
  "source_row_id": "uuid",
  "unit_type": "PRIMARY",
  "parent_analysis_unit_id": null,
  "name": "<normalized process_name>",
  "status": "ACTIVE",
  "scoring_eligible": true
}
```

Для остальных row types первичная AnalysisUnit не создаётся.

После интервью первичная единица может быть декомпозирована на внутренние дочерние `AnalysisUnit`. Это действие выполняет аналитический слой, а не Registry Mapping. Исходная строка, `source_row_id`, formula/cached values и официальный Excel не изменяются.

---

# 18. Data Quality Issues профиля

| Code | Severity по умолчанию | Условие | Влияние |
|---|---|---|---|
| `MAPPING_SHEET_NOT_FOUND` | ERROR | выбранный/default лист отсутствует | импорт листа остановлен |
| `MAPPING_HEADER_NOT_FOUND` | ERROR | полная сигнатура заголовков не найдена | scoring листа запрещён |
| `MAPPING_HEADER_AMBIGUOUS` | ERROR | найдено несколько строк заголовков | scoring листа запрещён |
| `MAPPING_HEADER_DUPLICATE` | ERROR | один официальный заголовок встречается более одного раза | scoring листа запрещён |
| `MAPPING_REQUIRED_COLUMN_MISSING` | ERROR | отсутствует одна из 19 колонок профиля | версия 1.0.0 неприменима |
| `UNMAPPED_COLUMN_WITH_DATA` | WARNING | есть непустая колонка вне mapping | raw сохраняется, scoring её не использует |
| `MISSING_REQUIRED_VALUE` | ERROR | пусто поле, отмеченное `*` | criterion-specific; процесс не получает фиктивное значение |
| `PROCESS_NAME_MISSING` | ERROR | D пусто у строки-кандидата процесса | `UNKNOWN`, scoring запрещён |
| `INVALID_NUMBER` | ERROR | K/L не интерпретируется однозначно | normalized null |
| `NEGATIVE_NUMBER` | ERROR | K/L < 0 | normalized null |
| `ZERO_OR_INACTIVE_PROCESS` | WARNING | `annual_instances = 0` | V1 null по scoring spec |
| `UNMAPPED_ENUM_VALUE` | WARNING | неизвестный token enum | normalized null для canonical enum |
| `UNSUPPORTED_CELL_TYPE` | ERROR | тип Excel нельзя безопасно прочитать | normalized null |
| `EXCEL_ERROR_VALUE` | ERROR | literal cell содержит Excel error | normalized null |
| `FORMULA_CACHE_MISSING` | ERROR | formula есть, cached result отсутствует | normalized null |
| `FORMULA_CACHE_ERROR` | ERROR | cached result — Excel error | normalized null |
| `FORMULA_CACHE_UNINTERPRETABLE` | ERROR | cached result не соответствует expected type | normalized null |
| `FORMULA_REFERENCE_OUTSIDE_TABLE` | WARNING | formula ссылается вне data range | не пересчитывать; сохранить evidence |
| `AGGREGATE_METRIC_FORMULA` | INFO | K/L агрегирует другие строки и итоговый row type — AGGREGATE | row type AGGREGATE; explicit PROCESS не исключается из scoring |
| `CONDITIONAL_VALUE_MISSING` | WARNING | M=`cross_functional`, N пусто | уточнение данных |
| `UNEXPECTED_CROSS_PROCESS_DETAIL` | INFO | M=`non_cross_functional`, но N/O заполнено | проверка согласованности |
| `OFFICIAL_PROCESS_CODE_NOT_UNIQUE` | INFO | B повторяется | не использовать B как ID |
| `POSSIBLE_DUPLICATE_PROCESS` | WARNING | похожие процессы в одной версии | не объединять автоматически |
| `SOURCE_FINGERPRINT_COLLISION` | WARNING | одинаковый fingerprint у нескольких строк | identity review |
| `AMBIGUOUS_PROCESS_MATCH` | WARNING | matching между версиями не 1:1 | новый process_id, human review |
| `UNKNOWN_ROW_TYPE` | WARNING | строка классифицирована `UNKNOWN` | scoring запрещён |

Data Quality Issue всегда содержит `registry_version_id`, sheet, row, field/coordinate, raw evidence, code, severity и признак `affects_scoring`.

---

# 19. Mapping-specific validation rules

```text
MLH-V-001  Файл имеет расширение .xlsx или .xlsm и является валидным OOXML.
MLH-V-002  Исходный checksum фиксируется до parsing и совпадает после анализа.
MLH-V-003  Выбранный лист существует; без выбора используется только Лист3.
MLH-V-004  Найдена ровно одна полная сигнатура 19 заголовков.
MLH-V-005  Каждый официальный заголовок встречается ровно один раз.
MLH-V-006  Mapping выполняется по заголовку; буква колонки является наблюдаемой координатой, не ключом mapping.
MLH-V-007  На Лист3 header_row=8, first_data_row=9, last_data_row=17.
MLH-V-008  Стили и пустые styled cells за S не считаются данными.
MLH-V-009  REQUIRED value может быть null только с DQ issue; null не заменяется значением.
MLH-V-010  K/L принимаются только при однозначной numeric normalization.
MLH-V-011  Formula никогда не пересчитывается; invalid/missing cache даёт null.
MLH-V-012  Aggregating formula в K/L даёт generic AGGREGATE; explicit profile rowType имеет приоритет.
MLH-V-013  UNKNOWN, GROUP_HEADER, AGGREGATE, TOTAL и EMPTY не участвуют в scoring.
MLH-V-014  Повтор B не считается уникальной идентичностью и не объединяет строки.
MLH-V-015  source_row_id, process_id и source_fingerprint создаются разными правилами.
MLH-V-016  Fingerprint не содержит лист, номер строки, version id, mutable metrics или scores.
MLH-V-017  Ambiguous matching не разрешается автоматически.
MLH-V-018  Confirmed facts создаются только из PROCESS rows и валидных normalized values.
MLH-V-019  Derived facts не содержат LLM inference и имеют версионированное правило.
MLH-V-020  На каждую PROCESS row создаётся одна PRIMARY AnalysisUnit.
```

---

# 20. Acceptance tests mapping-профиля на `Лист3`

Все тесты работают с read-only копией официального файла. Тестовый runner не сохраняет книгу и после тестов повторно вычисляет SHA-256.

| ID | Проверка | Ожидаемый результат |
|---|---|---|
| MLH-MAP-01 | Открыть официальный `.xlsm` | файл прочитан без исполнения макросов и пересчёта |
| MLH-MAP-02 | Проверить checksum до и после | оба значения равны `7f5dbcf3a62ca03b7ff37e9f4cef432db8e927f7c4a3744d9611c9fa857a3f02` |
| MLH-MAP-03 | Не передавать sheet name | выбран `Лист3` |
| MLH-MAP-04 | Прочитать структуру `Лист3` | header `A8:S8`, first row `9`, last row `17` |
| MLH-MAP-05 | Проверить все заголовки | 19 точных заголовков сопоставлены с 19 canonical fields |
| MLH-MAP-06 | Проверить styled range | dimension `A1:EA17` не создаёт колонки данных после S |
| MLH-MAP-07 | Прочитать строки | создано 9 `SourceRow`, номера 9–17 |
| MLH-MAP-08 | Классифицировать строки | PROCESS: 9,10,11,12,14,17; AGGREGATE: 13,15,16 |
| MLH-MAP-09 | Проверить scoring eligibility | ровно 6 строк имеют `scoring_eligible=true` |
| MLH-MAP-10 | Проверить формулы | найдены `K13`, `L13`, `K14`, `L14`, `K15`, `L15`, `K16`, `L16` в A9:S17; shared formulas раскрыты, cached values сохранены отдельно |
| MLH-MAP-11 | Проверить cached results | K13=35; L13=2880; K14=17.5; L14=1440; K15=10.5; L15=864; K16=3.5; L16=288 |
| MLH-MAP-12 | Проверить ссылки формул | для каждой из восьми формул создан `FORMULA_REFERENCE_OUTSIDE_TABLE`; пересчёта нет; explicit rowType строки 14 остаётся `PROCESS` |
| MLH-MAP-13 | Проверить прямые numeric facts строки 9 | `hours_per_instance=4`, `annual_instances=12`, source refs K9/L9 |
| MLH-MAP-14 | Проверить enum строки 9 | P9=`paper`, Q9=`non_digital`, R9=`non_machine_readable` |
| MLH-MAP-15 | Проверить enum строки 16 | P16=`paperless`, Q16=`partially_digital`, R16=`machine_readable`; строка остаётся AGGREGATE |
| MLH-MAP-16 | Проверить official code | повторяющиеся `ОП.` и `ОП.ОТЧЕТЫ.` не используются как process_id и не объединяются |
| MLH-MAP-17 | Создать идентификаторы | 9 уникальных source_row_id; 6 PROCESS rows получают отдельные process_id и fingerprints |
| MLH-MAP-18 | Переместить строку в тестовой копии | source_row_id меняется, fingerprint сохраняется, process_id может быть переиспользован только при 1:1 matching |
| MLH-MAP-19 | Переставить колонки в тестовой копии | mapping остаётся корректным по заголовкам |
| MLH-MAP-20 | Удалить cached result в тестовой копии | normalized null + `FORMULA_CACHE_MISSING`, книга не пересчитывается |
| MLH-MAP-21 | Подставить cached Excel error в тестовой копии | normalized null + `FORMULA_CACHE_ERROR` |
| MLH-MAP-22 | Проверить facts | Confirmed Registry Facts создаются только для 6 PROCESS rows и только по валидным значениям |
| MLH-MAP-23 | Проверить AnalysisUnit | создано 6 PRIMARY AnalysisUnit; для строк 13,15,16 AnalysisUnit не создаются |
| MLH-MAP-24 | Проверить разделение ответственности | mapping не выставляет V1–V5/F1–F5 и не вызывает LLM |
| MLH-MAP-25 | Выбрать несовместимый лист `Цифра` | профиль отклонён с mapping error; произвольная структура не импортируется молча |

---

# Итоговый статус

```text
MAPPING STATUS: READY FOR IMPLEMENTATION
```

Фактических блокирующих неопределённостей для реализации mapping-профиля МЛХ не выявлено.
