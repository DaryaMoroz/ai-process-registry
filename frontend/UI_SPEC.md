# UI_SPEC.md

**Project:** ИИ-агент анализа реестра процессов  
**Version:** v0.3  
**Status:** NORMATIVE UX SOURCE  
**Scope:** Registry Upload + Process Selection + Process Card

## 1. Purpose

Документ фиксирует согласованное UX/UI-поведение frontend-части проекта для первого вертикального slice.

Базовые правила продукта:
- официальный реестр загружается **как есть**;
- исходный реестр не изменяется;
- агент создаёт внутренний аналитический слой поверх реестра;
- оценка представляется двумя независимыми осями:
  - **VALUE / Ценность — до 25**;
  - **FEASIBILITY / Реализуемость — до 25**;
- первичный результат может иметь статус **PRE-SCORE**;
- после подтверждения дополнительных фактов backend может вернуть **INTERVIEW SCORE**;
- после полной верификации backend может вернуть **VERIFIED SCORE**;
- отсутствие данных не трактуется как низкий балл;
- при неполных данных точный итоговый score отсутствует, показываются `known sum`, coverage и диапазон;
- frontend не рассчитывает score, `known sum`, coverage или range;
- frontend не читает scoring YAML и не содержит scoring rules.

## 2. UX principles

Интерфейс — light enterprise / gov-tech:
- профессиональный;
- спокойный;
- аналитический;
- объяснимый;
- пригодный для работы с официальными данными.

Не использовать:
- chatbot-style UI;
- AI neon;
- glassmorphism;
- декоративный futuristic UI;
- избыточные градиенты.

Интерфейс должен явно сообщать:
> Исходный реестр не изменяется. Аналитика формируется в отдельном внутреннем слое.

## 3. Screen: Registry Upload

### Goal

Загрузить официальный реестр, показать результат чтения/валидации и после успешной обработки дать выбрать процесс для анализа.

### Main structure

1. Page header
2. Upload area
3. File information
4. Available sheets and selected sheet (within this screen)
5. Parsing / validation result
6. Warnings / errors
7. Process Selection
8. Continue / open process action

### Supported files

Frontend file picker и подсказка пользователю поддерживают:
- `.xlsx`;
- `.xlsm`.

Backend остаётся авторитетным источником фактического результата проверки файла.

После загрузки backend возвращает метаданные workbook, список листов и лист по умолчанию. Frontend показывает выбранный лист и может без дополнительной кнопки передать backend лист по умолчанию для обработки; при смене листа отправляет идентификатор загрузки и точное имя листа. Совместимость листа с mapping-профилем проверяет backend. Frontend не читает workbook, не ищет 19 заголовков и не подбирает другой лист при ошибке.

### States

#### EMPTY
- upload area;
- выбор файла / drag-and-drop;
- подсказка `.xlsx, .xlsm`;
- пояснение, что исходный файл останется неизменным.

#### READING
- имя файла;
- доступные, default и selected sheet, когда backend вернул метаданные;
- processing indicator;
- continuation action disabled;
- Process Selection недоступен; после смены листа прежний список больше не показывается.

#### VALID
- имя файла;
- success state;
- информация о прочитанном реестре;
- backend-provided `canContinue`;
- Process Selection доступен после получения списка процессов только при backend `canContinue = true`.

#### WARNING
- имя файла;
- warning summary;
- data-quality warnings;
- continuation action только если backend прислал `canContinue = true`;
- Process Selection доступен только если backend разрешает продолжение.

#### ERROR
- error state;
- понятное сообщение;
- retry / replace file action;
- Process Selection недоступен.

## 4. Process Selection

Process Selection является частью экрана Registry Upload и не создаёт отдельный экран в Slice 01.

Frontend получает от backend готовый список процессов, доступных для выбора.

Для элемента выбора достаточно отображать backend-provided:
- process name;
- process ID;
- source reference, если доступен.

Frontend не:
- классифицирует Excel-строки;
- определяет `PROCESS`;
- определяет `scoring_eligible`;
- включает в список строки, не предоставленные backend как selectable process.

Выбор процесса переводит пользователя на `/process/[processId]`.

`processId` — внутренний ID backend. Официальный код процесса допустим как подпись, но не как параметр маршрута. При позднем ответе для ранее выбранного листа текущий список не подменяется.

## 5. Screen: Process Card

### Goal

Показать аналитическую карточку выбранного процесса.

### Main structure

1. Process Header
2. Score Status
3. VALUE
4. FEASIBILITY
5. Data Quality
6. Explainability entry points
7. Source Drawer

### Process Header

Показываются доступные backend-данные:
- process name;
- process ID;
- source registry reference;
- score status.

Недоступные значения не выдумываются.

### Score Status

Поддерживаются backend stages:
- `PRE_SCORE` → **PRE-SCORE**;
- `INTERVIEW_SCORE` → **INTERVIEW SCORE**;
- `VERIFIED_SCORE` → **VERIFIED SCORE**.

Slice 01 реализует flow с partial PRE-SCORE. Поддержка отображения enum не означает реализацию interview flow в этом slice.

Frontend не определяет score status самостоятельно.

Карточка может существовать без активного score snapshot. При первом открытии выбранной карточки backend автоматически обеспечивает PRE-SCORE, если подходящего результата ещё нет. Пока backend сообщает `PENDING` или `RUNNING`, показываются header, доступные Data Quality Issues и устойчивые placeholders осей. Badge стадии показывается только при наличии backend active snapshot; frontend не назначает PRE-SCORE по факту загрузки страницы.

При `FAILED` карточка и Data Quality остаются видимыми, баллы не показываются как ноль. Безопасное сообщение приходит с backend. Повтор доступен в общей обработке ошибок только при `retryable = true`; постоянной кнопки «Запустить scoring» нет.

## 6. VALUE / FEASIBILITY

Оси всегда отображаются отдельно.

Нельзя сводить их в один основной `/50`.

### VALUE
Label: **Ценность**  
Maximum: backend-provided, для методики 1.1 — **25**

### FEASIBILITY
Label: **Реализуемость**  
Maximum: backend-provided, для методики 1.1 — **25**

Для каждой оси backend может передать:
- `fullScore`;
- `knownSum`;
- `coverage`;
- `range`;
- criteria;
- missing inputs / missing criteria.

Frontend только отображает эти значения.

### Full score

Если `fullScore != null`:
- точный score является основным числовым результатом оси;
- range может отображаться как вторичная информация;
- `knownSum` не должен дублировать основной score без необходимости.

### Partial PRE-SCORE

Если `fullScore = null`:
- **нельзя** показывать `knownSum` как точный score вида `18 / 25`;
- основным аналитическим результатом становится backend-provided range;
- `knownSum` показывается только с явной подписью `Известная сумма`;
- coverage показывается как вторичная metadata;
- missing criterion score отображается как `—`.

Пример отображения partial result:

```text
19–23 / 25
Известная сумма: 18
Coverage 80%
```

Все значения приходят с backend.

Frontend может выполнить только presentation formatting, например `0.8 → 80%`; это не является вычислением coverage.

### Null

Отсутствующее значение отображается как:

```text
—
```

Не использовать вместо `null`:
- `0`;
- `1`;
- фиктивный score;
- локально рассчитанное предположение.

## 7. Data Quality

Data Quality отображает только backend `DataQualityIssue`.

Минимально показываются:
- issue code;
- severity;
- short description / message;
- related field or source location, если доступны;
- влияет ли issue на scoring, если backend предоставляет этот признак;
- source/explanation action, если доступен.

Presentation severity:
- `INFO`;
- `WARNING`;
- `ERROR`.

Не смешивать в один frontend domain enum:
- `DataQualityIssue`;
- `Conflict`;
- `Risk`;
- `Blocker`;
- missing criterion input.

Missing criterion отображается внутри соответствующего criterion/axis и сам по себе не становится `ERROR`.

В первом slice показываются связанные с карточкой Data Quality Issues и missing inputs критериев; отображение Conflict/Risk/Blocker в этот flow не добавляется.

## 8. Explainability

Пользователь должен иметь доступ к backend-provided:
- criterion;
- score / null;
- explanation;
- rule ID;
- evidence;
- source reference;
- fact/evidence status;
- missing inputs, если доступны.

Frontend только отображает объяснение backend и не строит scoring explanation самостоятельно.

## 9. Source Drawer

Side drawer открывается из evidence-linked элементов.

Показывает доступные backend-данные:
- source type;
- source name / reference;
- fact status, если применимо;
- source role, если применимо;
- registry sheet / row / column / coordinate;
- evidence fragment / value;
- derivation or verification metadata, если применимо.

`source type` и `fact status` — разные поля и не объединяются в один `origin`.

Поддерживаемые `source_type`:
```text
registry
calculated
interview
document
system_data
llm_hypothesis
```

Поддерживаемые `fact_status`:
```text
Confirmed
Derived
Inferred
Unknown
```

Slice 01 преимущественно использует:
- `registry + Confirmed`;
- `calculated + Derived`.

## 10. Interaction

- primary actions — blue;
- secondary actions — quieter;
- warning/error semantic only;
- loading states keep layout stable;
- missing data shown neutrally;
- technical values easy to scan;
- `canContinue` и возможность продолжить после warning определяет backend;
- frontend не выводит raw stack traces в основной UI.

## 11. Responsive

Desktop-first.

На меньшей ширине:
- VALUE и FEASIBILITY могут становиться вертикально;
- Process Selection растягивается на доступную ширину;
- Source Drawer может занимать большую долю viewport;
- горизонтальный overflow основного контента не допускается.

## 12. Mockup alignment

Утверждённая визуальная концепция экранов `Registry Upload` и `Process Card` сохраняется.

Обязательные функциональные уточнения для реализации mockup `Registry Upload`:
- поддержать `.xlsx` и `.xlsm`;
- после успешного parsing/validation показать Process Selection внутри того же экрана;
- продолжение после WARNING зависит от backend `canContinue`.
- доступные листы и лист по умолчанию приходят от backend; при смене листа прежние результаты PROCESS скрываются до новой проверки.

Обязательные функциональные уточнения для реализации mockup `Process Card`:
- partial result не показывает `knownSum` как точный `/25` score;
- при `fullScore = null` основной результат — range;
- `knownSum` и coverage — вторичная metadata;
- Source Drawer отдельно показывает `sourceType` и `factStatus`.
- при `PENDING`, `RUNNING` или `FAILED` без активного snapshot числовой score и badge завершённой стадии не выдумываются.

Это не является пересмотром общей визуальной композиции mockup'ов.

## 13. Responsibility boundaries

Frontend:
- отображает Registry Upload states;
- принимает `.xlsx` и `.xlsm` через UI upload control;
- отображает validation results;
- отображает backend-provided Process Selection;
- отображает Process Card;
- показывает PRE-SCORE / INTERVIEW SCORE / VERIFIED SCORE, если backend их возвращает;
- показывает VALUE / FEASIBILITY отдельно;
- корректно различает `fullScore` и `knownSum`;
- показывает coverage/ranges;
- `null → —`;
- показывает Data Quality;
- открывает Source Drawer.

Frontend не:
- рассчитывает score;
- рассчитывает `knownSum`;
- вычисляет coverage/range;
- содержит thresholds или scoring mappings;
- читает scoring YAML;
- классифицирует строки Excel;
- определяет `scoring_eligible`;
- подставляет missing;
- разрешает conflicts;
- изменяет registry;
- определяет PRE/INTERVIEW/VERIFIED stage.
