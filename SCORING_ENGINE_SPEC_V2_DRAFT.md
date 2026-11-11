# SCORING_ENGINE_SPEC_V2_DRAFT.md

# «Навигатор эффективности»: полная формализация Methodology v2.0

## 1. Document Status и нормативные границы

| Параметр | Значение |
|---|---|
| Версия документа | 0.4 |
| Дата | 2026-10-22 |
| Тип | Frozen normative baseline полной scoring specification Methodology v2.0 |
| DOCUMENT STATUS | FROZEN |
| Следующий допустимый этап | READY FOR CONFIG DESIGN |
| Freeze date | 2026-10-22 |
| Целевая methodology version | 2.0 — future, not active |
| Conceptual authority | `METHODOLOGY_V2_CONCEPT.md` 0.3 — CONCEPTUAL BASELINE FROZEN |
| Действующая scoring methodology | 1.1; `SCORING_ENGINE_SPEC.md` и `scoring_config_v1.1.yaml` |
| Основание редакции 0.4 | Targeted correction B-01/B-02 после FINAL READ-ONLY REVIEW версии 0.3: REVIEW STATUS BLOCKED; исправлены только confirmation basis и applicability eligibility со связанными regression references |
| Основание freeze | FINAL READ-ONLY REVIEW v0.3 выявил только B-01/B-02; targeted correction v0.4 их устранила; TARGETED FINAL RE-REVIEW B-01/B-02: PASS; B-01 — CLOSED; B-02 — CLOSED; related F1/F3/F4 regression — PASS; новых blocker-level дефектов не найдено; READY FOR FREEZE подтверждён review |
| История | 0.1 — F1–F5 draft; 0.2 — targeted correction после PASS WITH TARGETED CORRECTIONS; 0.3 — полный перенос VALUE и интеграция утверждённых NQ; 0.4 — targeted correction B-01/B-02 и последующий formal freeze без изменения версии и правил |
| Configuration / implementation | READY FOR CONFIG DESIGN; scoring_config_v2.0.yaml ещё не создан; runtime implementation не разрешена; API/contracts v2.0 ещё не определены; production activation отсутствует |

По решению владельца проекта версия 0.4 зафиксирована как frozen normative baseline Methodology v2.0 scoring specification. Техническое имя файла SCORING_ENGINE_SPEC_V2_DRAFT.md сохраняется; слово DRAFT в имени и исторических формулировках не меняет текущий DOCUMENT STATUS: FROZEN. Freeze — статусная и нормативно-редакционная операция без изменения methodological decisions. READY FOR CONFIG DESIGN разрешает следующий этап проектирования конфигурации; эта операция не создаёт YAML и не разрешает runtime implementation или production activation.

Документ формализует две независимые оси: Process Opportunity Value /25 и Hypothesis Feasibility /25, evidence, confirmation, blockers, stages и versioning. Это спецификация правил будущей методики, не production implementation, API/DTO или физическая схема хранения. Все числовые mappings сохранены; решения NQ-02–NQ-10 интегрированы в соответствующие разделы, а не оставлены заглушками.

Нормативные слова «должен», «запрещено», «обязательно» относятся к будущей v2.0. Документ не меняет действующую v1.1 и не разрешает новый scoring в production. Неполнота evidence конкретной оценки означает null по правилам ниже; она не является разрешением додумать правило или факт.

В редакции 0.4 и при её freeze не выполнялось новое conceptual review и не пересматривались NQ-02–NQ-10. Основание targeted correction — два blocker-level замечания B-01/B-02 FINAL READ-ONLY REVIEW версии 0.3; других blocker-level дефектов интеграции review не выявил. Последующий TARGETED FINAL RE-REVIEW подтвердил PASS, closure B-01/B-02 и related F1/F3/F4 regression PASS без новых blocker-level дефектов. Основанием closure NQ по-прежнему служит решение владельца методики в handoff, а не самооценка автора. Frozen concept, v1.1, Slice 01/02, другие проектные файлы, production-код, API/contracts и Git не изменяются. YAML v2.0 не создаётся. READY FOR IMPLEMENTATION не присвоен; Methodology v2.0 не active в production и не имеет статуса PRODUCTION READY.

## 2. Прочитанные источники и приоритет

| ID | Источник и прочитанная редакция | Применение |
|---|---|---|
| C | `METHODOLOGY_V2_CONCEPT.md`, документ 0.3, FROZEN, 2026-10-21 | Conceptual authority, объекты осей, scope, null, history |
| B | `SCORING_ENGINE_SPEC.md`, methodology 1.1, синхронизация 2026-10-01 | Действующие правила и исторические инварианты; не шаблон новых F |
| Y | `scoring_config_v1.1.yaml`, methodology 1.1, schema 1.0, 2026-10-01 | Проверка baseline mappings, evidence и aggregation; не редактируется |
| M | `REGISTRY_MAPPING_MLH.md`, registry_mlh 1.0.0, 2026-10-05 | Read-only источник, PROCESS, primary AnalysisUnit, provenance |
| P | `MVP_PASSPORT_AND_BACKLOG.md`, документ 1.0, редакция 2026-10-01 | Границы действующего MVP, human confirmation и ownership |
| A | `AI_AGENT_LOGIC_SPEC_v2.md`, 2026-10-08 | Контекст измерений, period/population/scope, LLM isolation |
| S | `SLICE_02_CONTRACT_PACKAGE.md`, contract 1.0.1, 2026-10-02 | Snapshot/compatibility и неизменность Slice 01/02; не контракт v2 |
| H | `WORK_HANDOFF_METHODOLOGY_V2_FEASIBILITY.md`, приложенная редакция | Утверждённые шкалы F1; F2–F5 v0.2; cross-criterion review PASS |
| T | `WORK_PROMPT_FORMALIZE_SCORING_V2.md`, исходное задание | История создания 0.1 |
| N | `WORK_HANDOFF_NQ_02_10.md`, утверждённые designs v0.2 | Нормативные решения NQ-02–NQ-10 для настоящей интеграции |
| U | `WORK_PROMPT_UPDATE_SCORING_V2_AFTER_NQ.md`, приложенная редакция | Scope formal integration update и остановка до YAML/implementation |

Приоритет настоящей редакции: C → N → B/Y для canonical numeric VALUE и совместимых исторических инвариантов → редактируемая версия 0.2. H сохраняет numeric F mappings там, где N их конкретизирует; M определяет mapping, а не scoring. P/S не расширяются. В 0.3 повторно сверены C, B/Y и исходный draft; сведения M/P/A/S в таблице отражают чтение при подготовке 0.1.

Согласование обозначений без изменения баллов: N задаёт dimension state F1 `AS_IS_FIT`/`NOT_REMEDIABLE`; прежняя агрегированная шкала `data_readiness_level` сохраняет `READY`/`UNUSABLE` с теми же 5/1 (§10.4). Resolution modes F4 из N явно сопоставлены прежним effect enums (§13.2). Старый объединённый INFOSEC_PERSONAL_DATA заменён в новой evidence model двумя core domains INFORMATION_SECURITY и PERSONAL_DATA; это изменение полноты review, не numeric mapping. NQ-04 теперь прямо утверждает MATERIAL degraded cap `min(path_component_score,2)`, ранее оставленный открытым в 0.2. Эти изменения не являются противоречиями числовых шкал.

Прямое противоречие источников нельзя разрешать эвристикой: оно фиксируется отдельно, без исполнения спорной ветви. В интеграционной редакции 0.3 прямых противоречий источников не было зафиксировано. Последующий FINAL READ-ONLY REVIEW выявил B-01/B-02 в общем confirmation/eligibility layer самого draft; targeted correction 0.4 устранила их без изменения утверждённых решений источников. TARGETED FINAL RE-REVIEW B-01/B-02: PASS; related F1/F3/F4 regression: PASS; новых blocker-level дефектов не обнаружено. На этом основании версия 0.4 зафиксирована как frozen scoring specification.

Существенные различия источников учтены явно:

- A называет VALUE ценностью автоматизации и ставит варианты улучшения после VERIFIED; для v2 действует C: Process Opportunity Value и гипотеза до её FEASIBILITY.
- Иллюстративные шкалы V1/V3 и source coordinates в A не заменяют B/Y/M. Статус Derived отделён от source type `calculated`.
- Старые F3 team competence и F4 «MVP за 3 месяца» не копируются; `kpi_count` исключён из formal F5.
- S содержит marker `slice02.pre-score.v1`, methodology 1.1 и статус READY FOR RE-REVIEW. Они не переносятся в v2 и не переутверждаются этим документом.
- H вводит critical-data override; C §15.1 уже определяет обязательный приоритет null: при REQUIRED и неизвестном coverage/access/readiness F1=null. Override не обходит это правило (§10.5); независимый review подтвердил, что NQ-01 не является открытым нормативным вопросом.

## 3. Объект scoring и Assessment Scope

FEASIBILITY /25 — **Hypothesis Feasibility конкретной версии Improvement Hypothesis в её Assessment Scope**. Контекст связывает Process, primary AnalysisUnit, версию гипотезы и фиксированные границы изменения.

Assessment Scope определяет включённые и исключённые действия, этапы и случаи, потребности изменения, применимость evidence/ограничений и границы ожидаемого эффекта. Новая гипотеза или scope не создают AnalysisUnit автоматически. Базовый вариант — один Process / primary AnalysisUnit; multi-process и сложная декомпозиция остаются вне этой формализации.

**Process Opportunity Value × Hypothesis Feasibility** — две разные оси. V1–V5 относятся к исходному Process / AnalysisUnit. Альтернативные гипотезы могут использовать один VALUE при том же baseline, но разные F1–F5. VALUE не является экономией, ROI, денежным или кадровым эффектом гипотезы. Эффект фиксируется отдельно; F5 оценивает только его доказуемость в данном scope.

До создания FEASIBILITY assessment необходимы гипотеза и Assessment Scope. До их появления FEASIBILITY assessment не существует: нельзя создавать фиктивную ось с пятью null. В уже созданной оценке неизвестная обязательная деталь контекста даёт null затронутым критериям и задачу уточнения. Lifecycle SELECTED/ASSESSED/ACCEPTED не приравнивается к evidence stage; lifecycle gates здесь не проектируются.

Изменение scope, approach или существенных facts создаёт новый контекст оценки; применимость прежнего evidence проверяется заново. Исторический snapshot не перезаписывается.

### 3.1. ProcessValueBaseline и единицы осей

ProcessValueBaseline фиксирует `baseline_id`, `baseline_version`, Process, primary AnalysisUnit, effective period, baseline scope, population, case unit и fact snapshot. Baseline scope описывает исходный процесс и не подменяется границами улучшения. Все V1–V5 одной оси должны относиться к одному совместимому baseline.

VALUE snapshot ссылается на ProcessValueBaseline. FEASIBILITY snapshot ссылается на hypothesis_version, assessment_scope_id/scope_version и совместимый process context. Изменение гипотезы само по себе не создаёт новый VALUE. Существенное изменение исходного процесса создаёт новый baseline и VALUE snapshot. Пара для Human Decision требует отдельной проверки совместимости (§19).

Частичный Assessment Scope не получает автоматически весь ожидаемый эффект процесса. Значения expected effects и их доказательства хранятся в контексте гипотезы и scope; VALUE не становится новой осью Expected Effect, ROI или staffing.

## 4. Терминология и обозначения

| Термин | Нормативный смысл |
|---|---|
| Requirement | Подтверждённая потребность выбранного изменения, а не факт наличия ресурса |
| Applicability | Относится ли proposition/требование к данной версии гипотезы и scope |
| Criticality | Роль требования в достижении выбранного изменения; подтверждается до агрегации |
| Evidence proposition | Конкретное утверждение, которое доказывает источник, с контекстом применения |
| Confirmed Absence of Requirement | Доказанное отсутствие соответствующей зависимости; ветвь только F1–F3 |
| Root cause | Атомарная причина ограничения, отличённая от её следствий |
| Primary scoring owner | Единственный критерий, который учитывает данный semantic constraint как ограничитель score |
| Linked consequence | Связанное следствие, объясняемое в другом критерии без повторного штрафа за ту же причину |
| Measurement design | Способ доказать эффект изменения, включая indicator, baseline, method, comparability и attribution |
| Feasibility blocker | Подтверждённое препятствие выбранному изменению, отдельное от баллов |
| Assessment/evidence blocker | Препятствие получению/подтверждению evidence, не доказательство нереализуемости изменения |
| Normative gap | Недостающее правило спецификации; не Unknown fact и не business blocker |
| ProcessValueBaseline | Versioned исходный контекст V1–V5: процесс, период, scope, population, case unit |
| AtomicRootCause | Подтверждаемая атомарная причина с owner, candidate owners и связями propositions |
| Selected plan/path/design | Явно зафиксированный способ обеспечения требования/измерения; движок не выбирает лучший балл |
| Technical capability / component | Что должно быть возможно / каким выбранным решением это обеспечивается |
| Decision-material effect | PRIMARY или ADDITIONAL_DECISION_MATERIAL effect, обязательный для F5 |
| ActorRoleBinding / ConfirmationPolicy | Проверенные предметные полномочия / условия допустимого подтверждения |
| EvidenceQualificationRecord | Применимость и валидность evidence для конкретного контекста отдельно от истинности; ordinary-input либо explicit-exclusion branch по §§5–6 |
| Confirmation basis | HUMAN_CONFIRMATION либо AUTHORITATIVE_SOURCE_ATTESTATION; branch-specific доказательство содержания proposition, отдельно от qualification контекста |
| workflow_stage / evidence_stage | Этап работы / доказательная зрелость отдельной оси; разные измерения |
| Project Readiness | Команда, бюджет, подрядчик, аккаунты, выделение проектной инфраструктуры и готовность начать; вне scoring |
| data_readiness_level | Пригодность информационного ресурса в F1; не Project Readiness |

Имена новых inputs, rule IDs и диагностических причин ниже — нормативные обозначения draft, не DTO/API/storage contract. `eligible(x)` означает допустимость evidence по §5. `strict_min(S)` определён в §9. `UNKNOWN` — значение соответствующего enum; `Unknown` — статус факта. Отсутствующее обязательное поле не становится enum по умолчанию.

## 5. Evidence: статусы, допустимость, контекст

| Статус | Допуск в formal scoring |
|---|---|
| Confirmed | Допустим при валидном значении, компетентном подтверждении, достаточном evidence и совместимом контексте |
| Derived | Допустим только по явно определённому детерминированному versioned rule с полным provenance допустимых входов |
| Inferred | Не допускается; включая LLM extraction и неподтверждённое мнение аналитика |
| Unknown | Не даёт числовой input; обязательный Unknown → criterion `null` |

Фактический input должен иметь значение/единицу, источник и reference, статус, контекст ProcessValueBaseline либо Process/hypothesis/scope, применимые period/population/case unit, основание актуальности и confirmation record по необходимости. Confirmation record связывает confirmation basis, время, точную proposition/version/value, policy и evidence; для HUMAN_CONFIRMATION — actor/role binding, для AUTHORITATIVE_SOURCE_ATTESTATION — authoritative source/version и exact extraction/attestation (§6.2). Human binding не является общим требованием source-based подтверждения содержания. Derived сохраняет rule ID/version и IDs версий исходных facts; цепочка не может заканчиваться Inferred.

Официальный registry fact подтверждает содержимое исходного реестра, но не автоматически пригодность для новой гипотезы. Registry fields P/Q/R не доказывают F1 readiness и не создают V3 proxy. Источники `registry`, `interview`, `document`, `system_data`, `calculated` различаются; LLM hypothesis не становится Confirmed через выбор гипотезы человеком.

Для числового результата одновременно необходимы:

1. Валидный тип/enum/range без автоматического округления или смыслового преобразования.
2. Допустимый статус и происхождение; выполненные условия соответствующей confirmation basis по §6, включая компетенцию/полномочия человека для HUMAN_CONFIRMATION либо authority источника для AUTHORITATIVE_SOURCE_ATTESTATION.
3. Доказанная применимость к ProcessValueBaseline для VALUE либо к версии гипотезы и scope для FEASIBILITY.
4. Совместимые периоды, совокупности и единицы; преобразование только по явному правилу.
5. Достаточность evidence для конкретной ветви и отсутствие влияющего unresolved conflict.

Общая eligibility различает назначение evidence, а не требует APPLIES для любой операции:

| Branch | Обязательная context qualification | Допустимое использование |
|---|---|---|
| Normal scoring-input branch | APPLIES + VALID_FOR_CONTEXT | Proposition используется как обычный scoring input в разрешённом criterion rule |
| Explicit exclusion branch | CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT | Только доказательство исключения конкретного item/dimension/domain, если данное rule явно допускает applicability exclusion |

Обе ветви дополнительно требуют допустимой confirmation basis, достаточного evidence и отсутствия влияющего unresolved conflict (§6.2). `eligible(x)` читается относительно назначения в конкретном rule: допустимость exclusion evidence не делает его ordinary numeric input. CONFIRMED_NOT_APPLICABLE само по себе не даёт score, default 5, N/A всего criterion и не меняет denominator /25. Без explicit exclusion branch rule не вправе исключать item; применяется его обычная mandatory-input/null policy. UNKNOWN applicability либо validity UNKNOWN / REVALIDATION_REQUIRED / INVALID_FOR_CONTEXT не дают ни ordinary scoring input, ни formal exclusion. Подтверждённость содержания source не подменяет ни одну context qualification.

Пустой список, отсутствие найденного документа, молчание респондента и незаполненная форма не являются positive evidence отрицательного утверждения. Для «не требуется», «недоступно», «нет допустимого пути» нужны обследованная область, конкретное основание и компетентное подтверждение. Нельзя принять общий ответ «всё хорошо» как одновременно пять подтверждённых критериев.

Evidence stages отдельной оси определены в §19. PRE допускает только Confirmed Registry и явно разрешённые Derived от него; INTERVIEW допускает Confirmed interview/document/system_data. Статусы facts не меняются от перехода этапа. Для V3 действует более строгое правило: только Confirmed manual_work_share_percent, без Derived. VERIFIED — производный статус полноты и допустимости evidence оси, а не человеческое решение о качестве гипотезы.

## 6. Матрица ролей подтверждения

Принцип H для human confirmation и предметной интерпретации: **Analyst structures; competent domain owner confirms.** Аналитик вправе подтверждать measurement design в пределах собственной компетенции; это не делает его универсальным подтверждающим все факты. Подтверждение самого содержания authoritative source имеет отдельную basis AUTHORITATIVE_SOURCE_ATTESTATION (§6.2); матрица ролей не создаёт для него обязательного human binding.

| Proposition | Допустимые профильные роли / основания | Граница |
|---|---|---|
| Business meaning, requirement, scope, критичность для бизнес-результата | `process_owner`, при необходимости `executor` | Не подтверждает техническую/правовую часть только бизнес-полномочием |
| Data existence, coverage, availability, quality | `data_owner`, `system_owner` | Не заменяет заключение о законности использования |
| Integration/interface/system facts | `system_owner`, `IT`, `technical_expert` | Техническая пригодность отдельно от permission |
| Technical maturity/validation | `technical_expert`, `IT` | Компетенции текущей команды не входят в score |
| ИБ/ПДн | `information_security` | Только в пределах компетенции; правовые вопросы требуют профильного основания |
| Legal/regulatory/mandatory rules | `legal_expert`, `regulatory_owner` | Применимость нормы к scope должна быть обоснована |
| Требование внешнего органа | Authoritative document или `external_authority_representative` | Само отсутствие ответа внешней стороны не подтверждает запрет |
| KPI business meaning, expected effect | `process_owner` | Не доказывает автоматически измеримость |
| Measurement design, comparability, attribution | `analyst` | Подтверждение method не подтверждает существование источника данных |
| Baseline/source availability для измерения | `data_owner`, `system_owner` | Обещание аналитика собрать данные недостаточно |

Роли `legal_expert`, `regulatory_owner`, `external_authority_representative` добавляются в нормативный словарь будущей v2; existing enum/contracts не редактируются. `technical_expert` уже присутствует в Y/S, его имя не является новой оценкой команды.

Для сложного утверждения нужны подтверждения его отдельных business/technical/legal частей соответствующими компетенциями. Один человек может совмещать роли, но подтверждённые propositions и полномочия должны быть различимы. Роль `other` не даёт общего допуска. Формальная проверка полномочий и совместного подтверждения определена ниже по утверждённому NQ-09.

Для Confirmed Absence F1 проверяются смысл потребности владельцем процесса и отсутствие специальной data dependency/достаточность контекста профильным источником о данных; для F2/F3 — business scope и профильное утверждение об отсутствии системного взаимодействия/технического компонента. Это перечень предметов подтверждения, не обязательное число подписантов.

### 6.1. RBAC, domain authority и policy

HUMAN_CONFIRMATION требует одновременно application capability и предметных полномочий для proposition/scope. Эти human gates не переносятся на AUTHORITATIVE_SOURCE_ATTESTATION для подтверждения самого содержания source. Минимальные RBAC capabilities: VIEW, PROPOSE, CONFIRM, RESOLVE_CONFLICT, MANAGE_ROLE_BINDINGS. Admin permission не означает domain expertise. Self-declared роль имеет статус UNVERIFIED и не даёт допуска.

ActorRoleBinding содержит role_binding_id, actor_id, domain_role, authorization_scope, authority_basis_ref, binding_status (VERIFIED_ACTIVE / UNVERIFIED / REVOKED / INVALIDATED), valid_from, valid_until, verified_at. Authorization scope ограничивает предмет, процессы/системы, организационную область и применимые сроки подтверждения. Authority basis должен быть проверен уполномоченным основанием; наличие права управлять bindings не доказывает произвольно назначенную компетенцию.

ConfirmationPolicy фиксирует policy id/version, разрешённые confirmation basis для proposition/scope, применимые role groups/source authority requirements и distinct_actor_required для human branch. Policy должна удовлетворяться по выбранной basis; разрешение source branch не освобождает от отдельной context qualification. Режимы:

| Mode | Условие |
|---|---|
| ANY_OF_ROLE_GROUP | HUMAN_CONFIRMATION любой допустимой ролью указанной группы с human gates |
| ALL_OF_ROLE_GROUPS | HUMAN_CONFIRMATION: удовлетворены все обязательные группы для соответствующих propositions с human gates |
| AUTHORITATIVE_SOURCE_OR_ROLE | HUMAN_CONFIRMATION с human gates либо AUTHORITATIVE_SOURCE_ATTESTATION с source gates; basis явно фиксируется, human binding не требуется source branch для содержания |
| SOURCE_ATTESTATION | AUTHORITATIVE_SOURCE_ATTESTATION: допустимый source/authority/currentness/scope и exact extraction/attestation; без обязательного human binding для содержания; применимость квалифицируется отдельно |

HUMAN_CONFIRMATION требует RBAC capability CONFIRM + eligible ActorRoleBinding, VERIFIED_ACTIVE и действующий в confirmation time + authority scope match + ConfirmationPolicy satisfaction. Один actor может удовлетворять несколько групп только через отдельные verified bindings и если distinct_actor_required=false. Независимый co-signing не предполагается по умолчанию. Он не заменяет atomic decomposition: business, technical и legal propositions остаются отдельными.

Temporary delegation должна иметь проверяемое authority basis, делегированный scope и ограниченный период в ActorRoleBinding; она не шире исходных полномочий. Истечение или отзыв запрещают новые confirmations; проверка ранее сделанных определяется правилами ниже, без автоматического удаления истории. Конкретные UI/RBAC contracts остаются implementation work, не дополнительным scoring criterion.

### 6.2. Sources, propositions и records

AuthoritativeSourceRecord содержит source id/type, authority domain, issuer, version/effective period, status CURRENT / SUPERSEDED / WITHDRAWN / UNKNOWN, scope of authority и source ref. AUTHORITATIVE_SOURCE_ATTESTATION требует одновременно admissible AuthoritativeSourceRecord, достаточные source authority/domain, current/effective source version для подтверждаемого содержания и периода, source scope match, exact proposition extraction/attestation с reference на точное содержание и ConfirmationPolicy satisfaction. UNKNOWN source authority/currentness/scope либо неподтверждённая точность extraction не дают этой basis.

Human ActorRoleBinding не требуется для подтверждения самого содержания authoritative source. Если actor участвует в техническом переносе/attestation, это фиксируется для audit, но не превращается в обязательное предметное human confirmation содержания. Сам факт загрузки документа или LLM extraction не является AUTHORITATIVE_SOURCE_ATTESTATION: LLM output остаётся candidate до выполнения всех source gates.

Source-based confirmation не подтверждает applicability proposition к scoring context автоматически. Она по-прежнему требует отдельного EvidenceQualificationRecord. Если context applicability/validity требует предметной интерпретации, qualification выполняется соответствующей competent role с human RBAC/ActorRoleBinding/authority scope/policy checks; source authority не заменяет её компетенцию. Это не требование повторно human-confirm содержание источника и не shortcut для присвоения APPLIES либо CONFIRMED_NOT_APPLICABLE.

Confirmation lifecycle: PROPOSED → PENDING_CONFIRMATION → CONFIRMED либо REJECTED; ранее подтверждённая версия может стать SUPERSEDED или INVALIDATED. LLM вправе создать PROPOSED/FactCandidate, но не CONFIRMED. Выбор гипотезы не подтверждает её предположений.

ConfirmationRecord связывает confirmation id, proposition id/version/value, confirmation_basis (HUMAN_CONFIRMATION / AUTHORITATIVE_SOURCE_ATTESTATION), policy/version, decision, timestamp, evidence refs, context и optional batch id. При HUMAN_CONFIRMATION обязательны actor и eligible role binding reference. При AUTHORITATIVE_SOURCE_ATTESTATION обязательны AuthoritativeSourceRecord/source version reference, authority/domain/scope и exact extraction/attestation references; human actor/role binding не являются обязательными полями этой basis. Record не может быть CONFIRMED без полного набора gates выбранной basis; общего обязательного human binding поверх двух ветвей нет. Изменение proposition требует новой версии и нового подтверждения; edit-and-confirm допустим только как проверенная операция, создающая новый record после всех проверок. Batch — оболочка workflow: eligibility и policy проверяются отдельно для каждой proposition, частичный успех допустим.

EvidenceQualificationRecord отделяет truth confirmation от applicability/currentness: applicability = APPLIES / CONFIRMED_NOT_APPLICABLE / UNKNOWN; validity = VALID_FOR_CONTEXT / REVALIDATION_REQUIRED / INVALID_FOR_CONTEXT / UNKNOWN; сохраняются period, population, case unit, scope, evidence, qualifier и timestamp. Subject/context interpretation подтверждается компетентной ролью по §6.1; confirmation basis содержания и authority этой qualification различимы.

Общий eligibility gate: CONFIRMED workflow с выполненными gates выбранной confirmation basis + выполненная ConfirmationPolicy + достаточное evidence + отсутствие affecting conflict + context branch по §5. Normal scoring-input branch требует APPLIES + VALID_FOR_CONTEXT. Explicit exclusion branch требует CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT и явного разрешения exclusion в конкретном rule. Для exclusion не требуется противоречащее ему APPLIES; подтверждается истинность неприменимости item к данному context. Ни наличие source attestation, ни human confirmation без qualification не даёт formal exclusion. UNKNOWN, REVALIDATION_REQUIRED и INVALID_FOR_CONTEXT не допускают exclusion.

Для Derived допустимость проверяется по dependency closure входов, их branch-specific confirmation/qualification и versioned derivation, без human confirmation вычисленного балла. Exclusion evidence нельзя использовать как числовое значение или implicit default 5; явный итог criterion определяется только его собственным rule после допустимого исключения items.

### 6.3. Отзыв, invalidation и conflicts

Для human ActorRoleBinding (включая binding экспертной qualification) REVOKED означает: authority была валидна в момент confirmation, затем прекратилась. Историческое подтверждение остаётся audit-valid; новые confirmations запрещены. INVALIDATED означает: authority не была валидна в момент confirmation. Тогда текущая eligibility зависимостей пересматривается по цепочке proposition → Derived → classifications → criterion → blocker → aggregate/evidence stage. История immutable; каскад отражается в новых результатах, а не стирании старых.

RESOLVE_CONFLICT требует одноимённой RBAC capability и eligible domain authority. Допустимы evidence-based dispositions CONTEXT_SEPARATED, SOURCE_SUPERSEDED, PROPOSITION_REVISED, ONE_VALUE_CONFIRMED_APPLICABLE. Нужны конкретные evidence и context; seniority, самая новая дата или предпочтение пользователя сами по себе недостаточны. Исходные Confirmed facts не удаляются. Не разрешённый affecting conflict оставляет зависимый score null.

Человек подтверждает facts, selections, applicability и evidence, но не score, blocker status или VERIFIED. Rule Engine выводит их по правилам. NQ-09 — отдельный confirmation/implementation layer, не одиннадцатый критерий и не изменение numeric mappings.

## 7. Conflict policy и null semantics

Конфликт допустимых Confirmed источников, относящихся к одной proposition и совместимому контексту, не разрешается движком. Оба основания сохраняются; затронутый criterion = `null` до human resolution. Ни новая дата, ни должность, ни авторитетный формат файла не выбирают победителя автоматически. Разные scopes/периоды сначала проверяются на применимость; они не сливаются в один показатель.

Конфликт source-based и human-confirmed propositions подчиняется той же policy: confirmation basis не выбирает победителя. Конфликт в доказательстве exclusion/applicability/validity запрещает formal exclusion; затронутый criterion остаётся null, а не получает APPLIES или default 5.

Derived, зависящий от конфликтующего input, не обходит конфликт. Противоречие `CONFIRMED_NOT_REQUIRED` и подтверждённой потребности затрагивает gate и даёт `null`, а не 5. Конфликт только по excluded OPTIONAL item не влияет на criterion, если его исключение/criticality сами не спорны. Не влияющие конфликты остаются видимыми и не останавливают остальные критерии.

| Причина | Результат |
|---|---|
| Required context undefined | `null`; уточнить гипотезу/scope |
| Mandatory input missing / UNKNOWN | `null`; не 1, не 3 |
| Unconfirmed / Inferred input | `null`, если отсутствует другой допустимый input, разрешённый данным правилом |
| Invalid value / ineligible source / insufficient evidence | `null` с конкретной причиной |
| Incompatible scope/period/population/unit | `null` до допустимого основания/преобразования |
| Unresolved affecting conflict | `null` независимо от предполагаемого низшего балла |
| Confirmed adverse state | Числовой score по соответствующей таблице, если обязательные основания известны |
| Подтверждённая неприменимость отдельного item | Item исключается только по explicit exclusion branch: CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT и допустимые confirmation/evidence; не score, не default 5 и не N/A всего критерия |
| Rule отсутствует в спецификации | Normative gap; выпуск config блокируется, правило не имитируется `null`-заглушкой |

Несколько причин могут сосуществовать. В draft используются понятные labels `MISSING_REQUIRED_INPUT`, `UNKNOWN_INPUT`, `UNCONFIRMED_INPUT`, `INVALID_INPUT`, `INELIGIBLE_EVIDENCE`, `INSUFFICIENT_EVIDENCE`, `CONTEXT_UNDEFINED`, `CONTEXT_MISMATCH`, `UNRESOLVED_SCORING_CONFLICT`. Это proposed diagnostic vocabulary; внешний reason contract и приоритет основной причины не заданы.

## 8. Root cause, primary owner и запрет двойного учёта

Каждый существенный semantic constraint разбивается до атомарной причины и получает ровно одного primary scoring owner. Идентификатор причины, конкретная proposition, источник, scope, owner и связи со следствиями должны прослеживаться. Движок не делает такую декомпозицию из свободного текста.

| Owner | Предмет ограничения |
|---|---|
| F1 | Данные как информационный ресурс: coverage, access, readiness |
| F2 | Технический механизм взаимодействия систем |
| F3 | Зрелость и доказанность solution approach |
| F4 | Нормативная и обязательная организационная среда |
| F5 | Доказуемость эффекта и measurement design |
| Project Readiness, вне formal FEASIBILITY | Команда, бюджет, подрядчик, аккаунт/токен/заявка, выделение инфраструктуры, готовность запуска |

Один source fact может доказывать несколько **разных** criterion-specific propositions. Однако одно ограничение не получает несколько score penalties после переименования следствия. Нет арифметического вычитания штрафов: owner filtering выполняется до min и специальных ветвей.

| Ситуация | Нормативное разграничение |
|---|---|
| Внутреннее качество/структура данных и преобразование при обмене | F1 — ресурс; F2 — совместимость между системами. Одну и ту же проблему формата нельзя повторить как два ограничения |
| Надёжность канала и доказанность решения | F2 — механизм обмена; F3 — solution approach. Отказ одного канала не доказывает независимую незрелость технологии |
| Технически возможный механизм запрещён нормой | F4 — prohibition; F2 не получает техническую невозможность, F1 не получает critical override только из этого запрета |
| Данных объективно не существует, независимо от permission | F1; запрет доступа, если он отдельно существует, описывается отдельной proposition F4 |
| Данные нужны только для доказательства эффекта | F5; не автоматически F1 |
| Measurement запрещён нормой, method сам по себе работоспособен | F4 — допустимость; F5 — качество measurement design. Запрет не превращается повторно в `NO_RELIABLE_METHOD` |
| API существует, токен ещё не выдан проектной команде | Project Readiness; не отсутствие механизма F2. Обязательные нормы использования отдельно F4 |
| Нужна инфраструктура | Необходимые объективные технические условия относятся к своему F; факт невыделения ресурсов текущему проекту — Project Readiness |

Если owner, applicability или атомарность неоднозначны и влияют на результат, требуются уточнение/evidence; нельзя молча выбрать более высокий score. Исключение чужого ограничения не означает «подставить 5» и не освобождает от обязательных facts своего критерия. Операция owner filtering выполняется по §8.1; пустой набор не порождает числовой input. Сохраняются реальные ограничения в concerns, даже если они не дают второй penalty.

### 8.1. AtomicRootCause и operational filtering

Последовательность: raw facts → atomic root causes → primary owner → criterion-specific propositions → criterion inputs/enums → score. AtomicRootCause содержит root_cause_id, cause_statement, atomicity_status (ATOMIC / COMPOUND_REQUIRES_DECOMPOSITION / PARTIALLY_DECOMPOSED / UNKNOWN), fact_status, primary_scoring_owner (F1 / F2 / F3 / F4 / F5 / PROJECT_READINESS / UNKNOWN), candidate_scoring_owners[], hypothesis/scope context, source/evidence, confirmation info, affected_propositions[]. Relation каждой proposition: PRIMARY_SCORING_EFFECT, LINKED_CONSEQUENCE или CONTEXT_ONLY.

1. Определить причинный смысл и границы facts. Compound input не раскладывается движком догадкой: зафиксировать необходимые atomic propositions и unresolved residual.
2. Подтверждённым atomic pieces назначить ровно одного primary owner. Независимость нескольких причин требует разных causal mechanisms и separately evidenced propositions; реальная overdetermination разрешена.
3. В каждый criterion input включать собственные PRIMARY_SCORING_EFFECT propositions; LINKED_CONSEQUENCE/CONTEXT_ONLY сохранять для trace, но не повторного penalty. Один source fact может поддержать разные semantic questions, это не разрешение synthetic fan-out одной причины в несколько low enums.
4. При UNKNOWN owner оставить candidate owners и OWNER_CLASSIFICATION_REQUIRED risk. Null получает только потенциально затронутый criterion, для которого unresolved proposition влияет на обязательный input/ветвь; остальные вычисляются. Не угадывать adverse score.
5. При PARTIALLY_DECOMPOSED оценить подтверждённые atomic pieces; residual не удалять. Если residual может изменить mandatory input/состав, итог соответствующего критерия null даже при известном atomic score=1.
6. После filtering заново проверить достаточность полного набора собственных propositions. Пустой набор не означает 5; явные положительные ветви — доказанная CONFIRMED_NOT_REQUIRED F1–F3 и complete review F4. Project Readiness причины не penalize F1–F5. Blocker owner совпадает с owner причины.

Owner filtering сохраняет evidence visibility. Он не делает подтверждённую недоступность несуществующей, но запрещает использовать чужую причину как собственную техническую/измерительную невозможность. Требуется evidence собственного компонента, а не автоматическое благоприятное значение после удаления ограничения.

## 9. Порядок расчёта, applicability и strict min

Порядок расчёта FEASIBILITY нормализован как последовательность проверок, а не исполняемый API. Для VALUE обязательный контекст — ProcessValueBaseline; наличие гипотезы не является input V1–V5. VALUE использует evidence/conflict/null checks и selection rules §9.1, затем независимую агрегацию §15.

1. Проверить версию гипотезы, Assessment Scope и идентичности Process/AnalysisUnit.
2. Проверить criterion-specific gate и определить применимую ветвь/обязательные propositions.
3. Проверить applicability, criticality, evidence eligibility и primary owner; неизвестность обязательной классификации не считается исключением item.
4. Проверить достаточность обязательного evidence и влияющие conflicts. Неполноту и конфликты сохранять одновременно.
5. Применить только доказанную специальную ветвь: Confirmed Absence F1–F3, определённый adverse override.
6. Рассчитать оставшиеся component scores по таблицам.
7. Применить strict min к полному применимому набору.
8. Независимо оценить основания risks/blockers; сохранить trace и snapshot context.

```text
strict_min(S):
  S определён после applicability/criticality/scope/evidence/owner filtering
  если обязательный элемент S неизвестен или имеет влияющий conflict: null
  если S непуст и все элементы — допустимые scores 1..5: min(S)
  пустой S не даёт default score;
    только явно определённые ветви (F1–F3 absence, F4 complete review) дают 5
```

Числовой minimum известных значений не доказывает итог при неизвестном обязательном компоненте — даже если среди известных уже есть 1. Отсутствующие descriptions не становятся фиктивными components с score 5. Для explicitly unavailable технического пути не требуются характеристики несуществующего интерфейса как будто он AVAILABLE; обязательны доказательства соответствующей специальной ветви. F1 сохраняет более конкретный frozen-инвариант §10.5.

Пересечение независимых, применимых, подтверждённых ограничений разрешается min. Конфликтующие значения одной proposition не являются «несколькими применимыми правилами», их нельзя разрешить min. Отсутствие доказательства применимости не даёт права отбросить потенциально обязательный элемент.

### 9.1. VALUE V1–V5 — explicit canonical transfer

Все пять V относятся к ProcessValueBaseline, а не expected effect выбранной гипотезы. Каждый score — целое 1–5 либо null. Отрицательные, нечисловые, бесконечные, неоднозначные или выходящие за допустимый range inputs дают null с причиной; значения не округляются/не clamp-ятся автоматически. Строки «по необходимости», «маршруты», «площадь», «#VALUE!», «1/24», «1/1.5» не интерпретируются эвристически. Evidence/conflict policy §§5–7 применяется до mappings. Числовые границы ниже точно перенесены из B/Y; integer-like текст требует разрешённого parser/mapping, которого этот документ не меняет.

| Критерий / input | Единица и допустимый тип | Интервалы → score |
|---|---|---|
| V1 Частота: annual_instances | integer ≥0; instances_per_year | 1–11 → 1; 12–51 → 2; 52–249 → 3; 250–999 → 4; ≥1000 → 5 |
| V2 Годовая трудоёмкость: annual_labor_hours | конечное number ≥0; person_hours_per_year | [0,100) → 1; [100,500) → 2; [500,2000) → 3; [2000,10000) → 4; ≥10000 → 5 |
| V3 Доля ручной работы: manual_work_share_percent | конечное number [0,100]; percent; только Confirmed | [0,10] → 1; (10,30] → 2; (30,60] → 3; (60,85] → 4; (85,100] → 5 |
| V4 Повторяемость: standard_scenario_share_percent | конечное number [0,100]; percent | [0,20) → 1; [20,40) → 2; [40,70) → 3; [70,90) → 4; [90,100] → 5 |
| V5 Проблемность: problem_case_share_percent или разрешённый problem_proxy | конечное number [0,100]; percent | [0,1] → 1; (1,5] → 2; (5,15] → 3; (15,30] → 4; (30,100] → 5 |

V1: annual_instances=0 → null и ZERO_OR_INACTIVE_PROCESS. Дробная частота не округляется и не допускается как integer input V1. Missing → null/missing annual_instances. Это не изменяет отличающийся numeric input V2.

V2: оба inputs annual_instances (number ≥0 instances_per_year) и hours_per_instance (number ≥0 person_hours_per_instance) обязательны и совместимы по baseline. Единственная перенесённая derivation: annual_labor_hours = annual_instances × hours_per_instance; output Derived, person_hours_per_year, полный provenance. Любой missing/invalid/несовместимый input → null. При нулевом допустимом произведении V2=1; это не отменяет V1 zero behavior. Поле total из реестра не подменяет проверенную derivation без разрешённого правила. Формально числовая аномалия сохраняет hours_per_instance_semantic_verification_required: предварительный PRE расчёт допустим, VERIFIED требует подтверждения активных человеко-часов, не календарного ожидания. Пример 256 часов — не новый threshold.

V3: единственный input — Confirmed manual_work_share_percent. Derived, Inferred, analyst guess, LLM-extracted/unconfirmed или Registry P/Q/R (paper_status, digitalization_level, machine_readability) → null; manual_work_proxy и fallback запрещены. Missing/Unknown/unconfirmed/invalid/ineligible → null с missing_facts=[manual_work_share_percent] и точной причиной. Противоречащие Confirmed значения одного baseline → conflict и null до разрешения. PRE evidence допускает только Confirmed Registry процент; Interview не переименовывается в Registry. V3–V5 вычисляются в Deep Assessment, а не в первичном Screening даже при заранее собранных facts.

V4 измеряет долю случаев по типовому сценарию без существенного индивидуального решения. Подтверждённый количественный показатель приоритетен. Если процент определить невозможно, допустим Confirmed repeatability_level:

| Enum V4 | Score |
|---|---:|
| unique | 1 |
| mostly_unique | 2 |
| mixed | 3 |
| mostly_standard | 4 |
| standard | 5 |

Противоречие Confirmed quantitative и qualitative inputs → V4=null/conflict, а не выбор предпочтительного score. Нет допустимого процента или Confirmed enum → null. Низкая стандартизация не доказывает бесполезность гипотезы стандартизации.

V5: проблемы — ошибки, возвраты, задержки, повторная работа, жалобы, нарушение сроков и иные подтверждённые существенные отклонения. Приоритет: Confirmed problem_case_share_percent → Derived problem_proxy → Confirmed qualitative enum. При отсутствии общего процента problem_proxy=max(available eligible return_rate, error_rate, delay_rate, rework_rate, complaint_rate); нужен хотя бы один допустимый показатель percent [0,100] совместимого baseline, Derived с полным provenance. Это максимум доступных rates, не сумма и не доля объединения случаев. Missing alternatives не подменяются нулями; без допустимых rates proxy=null. Общая conflict policy действует до выбора; fallback не обходит конфликт основного факта.

При отсутствии допустимой статистики Confirmed problematicity_level:

| Enum V5 | Score |
|---|---:|
| practically_none | 1 |
| rare | 2 |
| periodic | 3 |
| frequent | 4 |
| systemic | 5 |

Без quantitative/proxy/Confirmed enum V5=null. Разрешённый V5 proxy не разрешает V3 proxy.

### 9.2. Screening и граница полной оси VALUE

Registry остаётся read-only; все PROCESS rows проходят Parser / Mapping / Data Quality → Screening V1/V2. Annual labor derivation и thresholds выше используются для triage, а не synthetic V1+V2 как VALUE /25. Остальные registry facts — Opportunity Signals/context без scoring proxy.

При корректно рассчитанных V1/V2: Priority A — V2=4–5; Priority B — V2=3 и V1=4–5. Если V1 или V2 нельзя корректно рассчитать — Insufficient Data. Остальные процессы доступны; пользователь может вручную добавить любой процесс. Shortlist не является решением об автоматизации. Warnings/семантическая проверка сохраняются; дополнительные policies сортировки и warning-sensitive shortlist остаются концептуальными OQ (§21), без нового threshold.

Workflow: Registry → Screening → Shortlist → Opportunity Signals → Improvement Patterns → Improvement Hypotheses → Assessment Scope → Deep Assessment → Process Opportunity Value × Hypothesis Feasibility → Human Decision. Signals могут собираться при Screening. Formal VALUE Deep Assessment включает V3–V5 и применимые V1/V2 одного baseline; сумма и range определены в §15. Ни ожидаемый эффект части процесса, ни Project Readiness, ни staffing/headcount из VALUE не выводятся.

## 10. F1 — Data Availability & Readiness

**Root rule:** `F1_DATA_AVAILABILITY_READINESS_v2.0`. Основание: H §8, C §15.1. Объект — данные для работы выбранного изменения, не данные только для измерения его эффекта.

### 10.1. Gate и обязательные inputs

| `data_requirement_status` | Действие |
|---|---|
| `CONFIRMED_NOT_REQUIRED` | При допустимом доказательстве отсутствия специальной/дополнительной data dependency и достаточности доступного контекста → F1=5 |
| `UNKNOWN` / missing / unconfirmed | F1=null |
| `REQUIRED` | Оценивать required_data_coverage_percent, coverage_basis, access, readiness и critical requirements |

Отсутствие новых данных не доказывает отсутствие зависимости: существующий набор может быть критическим. Пустой requirements list не является absence. Для REQUIRED перечень и его полнота должны быть обоснованы; каждой потребности нужны смысл, scope, `criticality = CRITICAL | NON_CRITICAL`, состояние доступности и evidence. `NON_CRITICAL` не означает OPTIONAL: такая потребность сохраняется в coverage.

### 10.2. Coverage

Вход `required_data_coverage_percent`: конечное число в percent `[0,100]`. Неопределённое основание процента делает input недостаточным. `coverage_basis` — `REQUIRED_FIELDS | REQUIRED_CASES | REQUIRED_RECORDS | REQUIRED_DATASETS | OTHER_DEFINED`; для каждого основания фиксируются совокупность требований, что означает покрытая единица, период/границы; OTHER_DEFINED требует явного описания.

| Интервал | coverage_score |
|---|---:|
| `[0,20)` | 1 |
| `[20,40)` | 2 |
| `[40,70)` | 3 |
| `[70,90)` | 4 |
| `[90,100]` | 5 |
| Unknown, invalid, недоказанный basis | null |

Пороги сохранены; 0% — подтверждённое неблагоприятное состояние, не Unknown. По NQ-03 `required_data_requirement_groups[]` объединяет требования только с homogeneous coverage basis. Group содержит id, purpose, basis, total_required_units, covered_required_units, criticality, selected sourcing plan, scope/period/population и evidence полноты. OTHER_DEFINED требует явных unit/population/counting rule. Unit status = PRESENT / CONFIRMED_ABSENT / UNKNOWN. Вес каждой единицы внутри группы равен 1; criticality не изменяет weight. Score-relevant UNKNOWN → group coverage=null; считать только известные единицы в знаменателе запрещено.

group_coverage_percent = covered_required_units / total_required_units × 100. REQUIRED denominator=0, отрицательные counts или covered>required — inconsistent input, F1=null. Overall required_data_coverage_percent = strict minimum полных group percentages, затем mapping таблицы. Разные bases/units не суммируются. Missing group/completeness не заменяются пустой группой.

При alternatives обязателен selected sourcing plan с bindings PRIMARY, JOINT_REQUIRED, SUBSTITUTE_SELECTED. Оценивается resulting required group по выбранному plan, а не все альтернативы сразу. Unselected alternatives исключены из aggregation, но сохраняются для trace/alternative review. JOINT_REQUIRED означает совместное обеспечение потребности, а не выбор лучшего ресурса. Plan change → новый snapshot/recalculation; существенное изменение смысла потребности → hypothesis/scope versioning. Полнота sourcing и coverage units должна быть доказана до вычисления percentages.

### 10.3. Access

| `data_resource_access_level` | access_score |
|---|---:|
| `ROUTINELY_AVAILABLE` | 5 |
| `AVAILABLE_WITH_STANDARD_RETRIEVAL` | 4 |
| `MATERIALLY_CONSTRAINED_ACCESS` | 3 |
| `EXCEPTIONAL_OR_LIMITED_ACCESS` | 2 |
| `CONFIRMED_UNAVAILABLE` | 1 |
| `UNKNOWN` | null |

Access относится к получению data resource. Legal permission и mandatory approvals принадлежат F4; API existence — F2; provisioning аккаунта/токена текущему проекту — Project Readiness. Старый `partial_or_after_approval` не является автоматическим mapping в новый enum. Access квалифицируется для resulting required group/selected plan, а не по случайному самому доступному dataset. Положительное evidence подтверждает: обычную доступность (5); доступность через стандартное извлечение (4); реальные существенные ограничения доступа (3); исключительный/ограниченный режим получения (2); объективную недоступность (1). Отсутствие ответа — UNKNOWN, не CONFIRMED_UNAVAILABLE. Для каждого уровня фиксируются источник/владелец, требуемый ресурс, проверенный способ и условия получения; уровень не выбирается LLM из текста и не выводится из неподтверждённости более высокого.

Overall access_score = strict_min(group access scores выбранного plan). Unknown обязательной группы → null. Дополнительные числовые thresholds или time/budget penalties не вводятся.

### 10.4. Readiness и freshness

| `data_readiness_level` | readiness_score |
|---|---:|
| `READY` | 5 |
| `MINOR_PREPARATION` | 4 |
| `MODERATE_PREPARATION` | 3 |
| `MAJOR_PREPARATION` | 2 |
| `UNUSABLE` | 1 |
| `UNKNOWN` | null |

Readiness выводится из пяти dimensions каждой required group: STRUCTURE, QUALITY, SEMANTIC_FIT, CONSISTENCY, FRESHNESS. Для каждой dimension задаются applicability = APPLIES / CONFIRMED_NOT_APPLICABLE / UNKNOWN и evidence пригодности к использованию в данном scope. CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT с допустимыми confirmation/evidence исключает только данную dimension по explicit exclusion branch §§5–6.2. Score-relevant Unknown applicability, REVALIDATION_REQUIRED либо INVALID_FOR_CONTEXT не дают exclusion и оставляют зависимую readiness null. Это не numeric score dimension, не default 5 и не N/A критерия.

| Dimension state по NQ-03 | Score | Положительное основание |
|---|---:|---|
| AS_IS_FIT | 5 | Пригодно для требуемого использования без подготовки |
| MINOR_PREPARATION | 4 | Определена малая подготовка, сохраняющая смысл/пригодность |
| MODERATE_PREPARATION | 3 | Доказана необходимость умеренной подготовки |
| MAJOR_PREPARATION | 2 | Доказана необходимость существенной подготовки |
| NOT_REMEDIABLE | 1 | Непригодность неустранима для выбранного использования; не отсутствие обследования |
| UNKNOWN | null | Недостаточно evidence состояния либо способа подготовки |

Evidence включает требуемое свойство, наблюдаемое состояние, подтверждённое преобразование/устранимость и область пригодности; raw facts/freshness сначала получают компетентную structured qualification, не эвристический score из свободного текста. Group readiness = strict_min(applicable dimension scores), overall readiness = strict_min(group readiness scores). Пустой набор dimensions после filtering не даёт default 5 и требует уточнения достаточности модели.

Для trace агрегированный data_readiness_level соответствует итоговому score: 5 READY; 4 MINOR_PREPARATION; 3 MODERATE_PREPARATION; 2 MAJOR_PREPARATION; 1 UNUSABLE. Dimension AS_IS_FIT / NOT_REMEDIABLE и aggregate READY / UNUSABLE — разные уровни модели с неизменным numeric mapping; aggregate enum не является shortcut поверх неизвестных dimensions.

data_freshness_fit = FIT / PARTIALLY_FIT / NOT_FIT / UNKNOWN сохраняется как evidence dimension FRESHNESS. Например NOT_FIT требует определить возможность и объём подготовки; сам по себе не означает score=1. Freshness не четвёртый top-level component. Absent data учитывается coverage, а не synthetic readiness=1. Если readiness обязательной группы не доказана, F1=null; её нельзя заполнить на основании coverage дефицита.

### 10.5. Critical override и итог

`critical_required_data_unavailable=true` допускается как Derived только при совместном доказательстве:

- gate REQUIRED;
- конкретная потребность CRITICAL для текущей версии гипотезы/scope;
- её объективная недоступность подтверждена;
- primary_scoring_owner=F1;
- полный review substitutes/remediation подтвердил отсутствие пригодной замены, а не просто отсутствие записи о замене.

Сведения о замене UNKNOWN не эквивалентны «нет замены». Запрет нормативного использования сам по себе не даёт F1 override: его owner F4.

| Условия после context/evidence/conflict checks | F1 |
|---|---:|
| Доказанная absence branch | 5 |
| REQUIRED, хотя бы один обязательный coverage/access/readiness неизвестен | null |
| REQUIRED, все три компонента известны, critical predicate доказан | 1, независимо от высокого общего coverage |
| REQUIRED, все три компонента известны, critical analysis достаточен, predicate не выполняется | `min(coverage_score, access_score, readiness_score)` |
| Criticality/наличие критически недоступных требований или замены неизвестны и могут изменить результат | null |
| Влияющий conflict в любой используемой ветви | null |

Critical-data override сохраняется для подтверждённого критического дефицита при известных обязательных компонентах и не позволяет общему проценту его скрыть. Утверждённое правило C §15.1: если gate=REQUIRED и хотя бы один обязательный component coverage/access/readiness неизвестен, F1=null. Critical-data override НЕ обходит mandatory-input/null policy. Это решённая семантика, а не открытый вопрос NQ-01.

Blocker predicate `CRITICAL_DATA_UNAVAILABLE` проверяется отдельно по §17. Evidence достаточный для blocker не обязан давать полную оценку F1; blocker и F1=null могут сосуществовать.

## 11. F2 — Integration Complexity

**Root rule:** `F2_INTEGRATION_COMPLEXITY_v2.0`. Основание: H §9, C §15.2. Только техническая интеграция, без permission/project launch penalties.

### 11.1. Gate, требования и пути

`integration_requirement_status = REQUIRED | CONFIRMED_NOT_REQUIRED | UNKNOWN`. Доказанная absence→5; Unknown/missing/unconfirmed→null. При REQUIRED нужны полнота списка `required_integrations[]` и описание topology. REQUIRED с пустым списком не даёт 5.

Каждый IntegrationRequirement содержит interaction_id, source_system, target_system, purpose и criticality = CRITICAL / MATERIAL / OPTIONAL. Его IntegrationPath содержит interaction, path role PRIMARY_PATH / ALTERNATIVE_FULL_PATH / DEGRADED_PATH, selection, service FULL / DEGRADED / UNKNOWN, mechanism, interface, format, adapter, reliability, viability и degradation root cause/owner/evidence. technical_fallback_available — только summary доказанного review paths, не замена списка и completeness.

Для каждого included CRITICAL/MATERIAL interaction нужен ровно один effective selected path. 0 selected → null/TECHNICAL_PATH_NOT_SELECTED; >1 → null/MULTIPLE_TECHNICAL_PATHS_SELECTED. Для joint paths фиксируется JOINT_REQUIRED combination либо выполняется decomposition; комбинация описывает один эффективный способ удовлетворения requirement, движок не угадывает её состав. Unselected alternatives не включаются в path min. Специальная доказанная ветвь полного отсутствия пути (§11.3) не требует фиктивно выбрать несуществующий path.

OPTIONAL исключается при подтверждённой классификации. CRITICAL/MATERIAL включаются; неизвестная criticality, способная менять набор оценки, блокирует итог числом. Число интеграций не является scoring input.

### 11.2. Component mappings

| Компонент | Input enum | Score |
|---|---|---:|
| interface_standardization_level | `STANDARD_DOCUMENTED` | 5 |
| interface_standardization_level | `CUSTOM_DOCUMENTED` | 4 |
| interface_standardization_level | `LEGACY_DOCUMENTED` | 3 |
| interface_standardization_level | `LEGACY_OR_UNDOCUMENTED` | 2 |
| interface_standardization_level | `UNKNOWN` | null |
| format_compatibility_level | `COMPATIBLE` | 5 |
| format_compatibility_level | `MINOR_TRANSFORMATION` | 4 |
| format_compatibility_level | `MATERIAL_TRANSFORMATION` | 3 |
| format_compatibility_level | `MAJOR_TRANSFORMATION` | 2 |
| format_compatibility_level | `INCOMPATIBLE` | 1 |
| format_compatibility_level | `UNKNOWN` | null |
| adapter_complexity_level | `NONE` | 5 |
| adapter_complexity_level | `CONFIGURATION_ONLY` | 4 |
| adapter_complexity_level | `CUSTOM_STANDARD_PATTERN` | 3 |
| adapter_complexity_level | `CUSTOM_COMPLEX` | 2 |
| adapter_complexity_level | `NO_VIABLE_ADAPTER` | 1 |
| adapter_complexity_level | `UNKNOWN` | null |
| exchange_reliability_level | `PROVEN_FOR_REQUIRED_MODE` | 5 |
| exchange_reliability_level | `PROVEN_WITH_MINOR_LIMITATIONS` | 4 |
| exchange_reliability_level | `PROVEN_WITH_MATERIAL_LIMITATIONS` | 3 |
| exchange_reliability_level | `UNPROVEN_BUT_TECHNICALLY_PLAUSIBLE` | 2 |
| exchange_reliability_level | `CONFIRMED_INADEQUATE` | 1 |
| exchange_reliability_level | `UNKNOWN` | null |

Score 1 для interface не добавляется: техническая невозможность определяется mechanism/path conditions. `NONE` adapter означает доказанную ненужность адаптера в существующем пути, а не Unknown.

### 11.3. Selected path decision table

technical_mechanism_status = AVAILABLE / CONFIRMED_UNAVAILABLE / UNKNOWN. Viability должна быть подтверждена для собственного технического механизма; чужие ограничения не превращаются в F2 nonviability. FULL означает выполнение требуемого режима, DEGRADED — явно описанное снижение относительно требования. Неизвестная viability/service или несовместимые утверждения → null; для внутренних противоречий используется INCONSISTENT_PATH_STATE. Нельзя одновременно утверждать viability и подтверждённую несовместимость того же обязательного свойства в одном контексте; конфликтующие propositions требуют разрешения, а не min.

| Условие | interaction_score |
|---|---|
| Selected FULL + VIABLE, все mandatory path components известны | strict_min(interface, format, adapter, reliability) |
| Selected ALTERNATIVE_FULL_PATH + VIABLE | Та же оценка выбранного альтернативного пути; без бонуса за альтернативу |
| MATERIAL, selected DEGRADED + VIABLE, degradation owner=F2 | min(path_component_score, 2); обязательный component Unknown → null |
| MATERIAL, selected DEGRADED + VIABLE, degradation имеет foreign owner | Без F2 cap за чужую причину; собственные технические components всё равно должны быть доказаны |
| MATERIAL, подтверждённо нет viable FULL или DEGRADED | null/INCONSISTENT_INTERACTION_CRITICALITY; требуется уточнение классификации, не automatic 1/2 |
| CRITICAL, только materially degraded path | Requirement не удовлетворён; требуется оценка FULL alternatives |
| CRITICAL, отсутствие viable FULL и viable substitute положительно доказано полным review, owner F2 | 1; независимо вычисляется blocker по §17 |
| Mechanism/viability/требуемый alternative review Unknown | null; отсутствие найденного пути не равно доказанному отсутствию |
| Механизм существует, permission/токен не оформлен | F4 или Project Readiness по причине; не техническая недоступность F2 |

MATERIAL degraded cap — утверждённое NQ-04 решение min(path_component_score,2), не fixed 2 и не неограниченный normal min. Полный путь имеет приоритет как предмет выполнения CRITICAL requirement, но движок не выбирает альтернативный лучший score: selection подтверждается человеком как часть assessment context. При изменении path создаётся новый snapshot, при изменении содержания улучшения — новая версия гипотезы/scope. Для no-path ветви обязательны доказательства отсутствия допустимых FULL substitutes, а не характеристики несуществующего интерфейса.

### 11.4. Topology и aggregation

| `integration_topology_complexity` | Score |
|---|---:|
| `SIMPLE` | 5 |
| `LIMITED_MULTI_SYSTEM` | 4 |
| `COORDINATED_MULTI_SYSTEM` | 3 |
| `COMPLEX_ORCHESTRATION` | 2 |
| `UNMANAGEABLE_IN_CURRENT_SCOPE` | 1 |
| `UNKNOWN` | null |

Topology описывает структуру взаимодействий, порядок/координацию и связность, не количество систем. Подтверждённая topology=1 не создаёт автоматически blocker отсутствия критического взаимодействия. Topology квалифицируется по selected required architecture, включая joint interactions, с положительным evidence coordination drivers:

- SIMPLE=5: одно независимое взаимодействие без coordination.
- LIMITED_MULTI_SYSTEM=4: несколько независимых interactions без coordination drivers.
- COORDINATED_MULTI_SYSTEM=3: ограниченный coordination driver, без complex driver.
- COMPLEX_ORCHESTRATION=2: transactional consistency, cross-failure coordination, central orchestration или cycle при подтверждённой технической жизнеспособности архитектуры.
- UNMANAGEABLE_IN_CURRENT_SCOPE=1: положительно доказана неуправляемость координации в текущем scope.

Проверка идёт от доказанного UNMANAGEABLE к complex driver, bounded driver и затем независимым interactions; UNKNOWN существенного driver/viability не позволяет выбрать благоприятный уровень. Это rubric координации, не подсчёт систем и не экстраполяция от их названий.

```text
для каждого включённого взаимодействия:
  вычислить interaction_score по выбранной доказанной ветви
F2 = strict_min(все CRITICAL/MATERIAL interaction_scores, topology_score)
```

Неизвестный обязательный interaction или topology даёт F2=null даже при известном другом interaction=1. Критический blocker при достаточных собственных основаниях сохраняется отдельно. Degraded cap применяется только к доказанной собственной F2 причине и не обходит strict_min/null policy.

## 12. F3 — Technical Solution Maturity

**Root rule:** `F3_TECHNICAL_SOLUTION_MATURITY_v2.0`. Основание: H §10, C §15.3.

### 12.1. Gate и компоненты

`technical_solution_requirement_status = REQUIRED | CONFIRMED_NOT_REQUIRED | UNKNOWN`. Доказанная absence технического компонента **и** технической неопределённости→5. Unknown→null. Для REQUIRED обязательны `solution_approach_defined=true` и `technical_success_criteria_defined=true` с evidence. False/null любого из них → F3=null, не техническая невозможность.

`technical_components[]`: `component_id`, `purpose`, `criticality = CRITICAL | MATERIAL | OPTIONAL`, `solution_pattern_maturity`, `target_condition_validation_level`, `validation_requirement_level`. Полнота состава и критичность должны быть обоснованы. OPTIONAL исключаются; REQUIRED с пустым/неопределённым набором не даёт 5.

### 12.2. Шкалы

| Компонент | Input enum | Score |
|---|---|---:|
| solution_pattern_maturity | `STANDARD_PROVEN` | 5 |
| solution_pattern_maturity | `PROVEN_IN_COMPARABLE_CONTEXT` | 4 |
| solution_pattern_maturity | `ESTABLISHED_REQUIRING_MATERIAL_ADAPTATION` | 3 |
| solution_pattern_maturity | `EXPERIMENTAL_BUT_TECHNICALLY_GROUNDED` | 2 |
| solution_pattern_maturity | `RESEARCH_GRADE_OR_NO_ESTABLISHED_METHOD` | 1 |
| solution_pattern_maturity | `UNKNOWN` | null |
| target_condition_validation_level | `VALIDATED_IN_TARGET_CONTEXT` | 5 |
| target_condition_validation_level | `VALIDATED_IN_COMPARABLE_CONTEXT` | 4 |
| target_condition_validation_level | `PARTIALLY_VALIDATED` | 3 |
| target_condition_validation_level | `NOT_VALIDATED_BUT_TESTABLE` | 2 |
| target_condition_validation_level | `CONFIRMED_NOT_VIABLE` | 1 |
| target_condition_validation_level | `UNKNOWN` | null |
| validation_requirement_level | `NONE` | 5 |
| validation_requirement_level | `CONFIRMATORY_TEST` | 4 |
| validation_requirement_level | `BOUNDED_POC` | 3 |
| validation_requirement_level | `CRITICAL_POC` | 2 |
| validation_requirement_level | `R_AND_D` | 1 |
| validation_requirement_level | `UNKNOWN` | null |

Maturity технологии не заменяет доказанность в target conditions. `NOT_VALIDATED_BUT_TESTABLE` — подтверждённое состояние проверяемого, пока не валидированного подхода, не отсутствие сведений о валидации. `NONE` validation requirement требует доказательства отсутствия оставшейся существенной технической неопределённости; это не отсутствие строки плана тестирования.

### 12.3. Итог и пределы вывода

```text
component_score = strict_min(maturity, target_validation, validation_requirement)
F3 = strict_min(все CRITICAL/MATERIAL component_scores)
```

Никаких average, weighting или current-team adjustments нет. Unknown обязательного компонента→F3=null. Известный R_AND_D→1 сам по себе не доказывает невозможность; аналогично необходимость PoC не является blocker.

Blocker `NO_TECHNICALLY_VIABLE_APPROACH` требует критически необходимой capability, подтверждённой нежизнеспособности выбранного approach и доказанного отсутствия пригодной альтернативы в текущем scope. Отсутствие записи об альтернативе недостаточно. Если альтернатива существует, она не повышает score выбранного approach автоматически; нужно оценить выбранный контекст, при изменении подхода — новую версию по C.

Numeric mappings §12.2 сохранены. Следующие evidence/classification rules NQ-05 определяют допустимость structured levels, без оценки команды или вероятностного score от LLM.

### 12.4. Capabilities, components, completeness и success criteria

required_technical_capabilities[] содержит capability_id, purpose, success_condition, criticality, hypothesis_version, assessment_scope_id. Capability означает, что должно быть технически возможно; component — как это обеспечивается. Completeness = COMPLETE / INCOMPLETE / UNKNOWN. Каждая CRITICAL/MATERIAL capability покрыта selected component/combination с bindings PRIMARY / JOINT_REQUIRED / SUPPORTING / ALTERNATIVE_NOT_SELECTED. Unselected alternative не повышает score выбранного решения. Supporting component включается, если доказанно обязателен для included capability; optional подтверждённо необязательный item исключается.

Uncovered required capability, incomplete перечень или Unknown additional required capabilities → F3=null. solution_approach_defined=true требует capabilities, selected components, bindings и main technical interaction logic. technical_success_criteria_defined=true требует для каждой included capability criterion id, capability id, tested proposition, target condition, acceptance condition и test method. Нельзя подтвердить общий флаг true без предметного перечня.

### 12.5. Positive evidence и comparability

Каждый maturity level требует своего положительного evidence: STANDARD_PROVEN — стандартный доказанный подход; PROVEN_IN_COMPARABLE_CONTEXT — реализация с доказанной сопоставимостью; ESTABLISHED_REQUIRING_MATERIAL_ADAPTATION — существующий подход с предметно определённой существенной адаптацией; EXPERIMENTAL_BUT_TECHNICALLY_GROUNDED — экспериментальный, но технически обоснованный; RESEARCH_GRADE_OR_NO_ESTABLISHED_METHOD — подтверждённая исследовательская природа/отсутствие established method. Неподтверждение уровня 5 не создаёт уровень 4/3/2/1.

Comparability dimensions: FUNCTIONAL_TASK, INPUT_CHARACTERISTICS, SCALE_AND_LOAD, QUALITY_OR_ACCURACY_REQUIREMENTS, RUNTIME_ENVIRONMENT, INTEGRATION_DEPENDENCIES, RELIABILITY_AND_AVAILABILITY_REQUIREMENTS, TECHNICAL_SECURITY_CONSTRAINTS. Per dimension: MATCH / MATERIAL_DIFFERENCE_ADDRESSED / MATERIAL_DIFFERENCE_UNRESOLVED / UNKNOWN / CONFIRMED_NOT_APPLICABLE. Comparable iff все applicable dimensions MATCH либо MATERIAL_DIFFERENCE_ADDRESSED, с evidence устранения различия. CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT с допустимыми confirmation/evidence исключает только данную comparability dimension по explicit branch §§5–6.2; этому evidence не нужен APPLIES для exclusion. UNKNOWN либо невалидная/требующая revalidation qualification не исключает dimension и не обосновывает comparability. Exclusion само по себе не создаёт maturity/validation score и не даёт default 5.

### 12.6. Target validation и negative viability

По каждому mandatory success criterion состояние: TARGET_PASSED / COMPARABLE_PASSED / NOT_YET_VALIDATED_BUT_TESTABLE / CONFIRMED_FAILED / UNKNOWN. Target validation компонента выводится:

| Полный evidence state | Validation level / score |
|---|---|
| Все mandatory criteria TARGET_PASSED | VALIDATED_IN_TARGET_CONTEXT / 5 |
| Все TARGET_PASSED или COMPARABLE_PASSED, хотя бы один только comparable, comparability доказана | VALIDATED_IN_COMPARABLE_CONTEXT / 4 |
| Смесь passed и testable, нет failure/Unknown | PARTIALLY_VALIDATED / 3 |
| Все mandatory criteria testable с определёнными ограниченными методами, ни одного passed | NOT_VALIDATED_BUT_TESTABLE / 2 |
| Mandatory failure и strengthened negative evidence ниже | CONFIRMED_NOT_VIABLE / 1 |
| Mandatory Unknown, недостаточное доказательство failure или незавершённая remediation qualification | null |

CONFIRMED_NOT_VIABLE требует defined criterion/conditions, valid test/analysis, confirmed failure, F3-owned cause, bounded remediation assessment и положительного подтверждения, что bounded remediation не удовлетворит выбранный approach. Remediation status = BOUNDED_REMEDIATION_AVAILABLE / NO_BOUNDED_REMEDIATION_IDENTIFIED_CONFIRMED / UNKNOWN. Known bounded remediation не означает confirmed nonviable до retest; Unknown remediation → validation=null. Failure не по F3 cause остаётся linked consequence.

Если conclusive failure независимо определяет adverse validation state, другие неизвестные success tests не отменяют доказанную неработоспособность выбранного approach. Это derivation одного validation component, не bypass mandatory maturity/validation_requirement или completeness F3: неизвестность этих обязательных компонентов оставляет F3=null. Один failed test без strengthened negative evidence не создаёт score=1.

### 12.7. Remaining uncertainty и consistency

remaining_technical_uncertainties[] относится к включённым capabilities/компонентам. Из weakest unresolved material uncertainty выводится validation_requirement_level: NONE=5 при доказанном отсутствии оставшейся существенной технической неопределённости; CONFIRMATORY_TEST=4 при подтверждающей проверке известного подхода; BOUNDED_POC=3 при ограниченном PoC с определённой проверкой; CRITICAL_POC=2 при существенной неопределённости критической возможности, требующей PoC; R_AND_D=1 при зависимости от исследовательского результата; UNKNOWN=null. Scope, проверяемая неопределённость, критерии успеха и evidence этой классификации обязательны, сроки/стоимость/команда не классифицируют уровень. Пустой неподтверждённый список не означает NONE.

Conclusive adverse result может сосуществовать с NONE: решение доказанно не работает и исследования для установления этого больше не нужны. Необычные combinations не запрещаются общей таблицей несовместимых enums. Проверяются конкретные proposition-level contradictions; несовместимость в одном контексте → component=null/INCONSISTENT_TECHNICAL_EVIDENCE_STATE. Подтверждённая viability альтернативы снимает blocker по §17, но не исправляет validation выбранного approach.

## 13. F4 — Regulatory & Organizational Constraints

**Root rule:** `F4_REGULATORY_ORGANIZATIONAL_CONSTRAINTS_v2.0`. Основание: H §11, C §15.4. Scope: конкретная версия гипотезы и Assessment Scope.

### 13.1. Domain applicability, completeness и outcome

Каждая F4 assessment создаёт записи всех семи core domains:

| Domain | Область |
|---|---|
| LEGAL_REGULATORY | Законодательные и нормативные требования |
| INFORMATION_SECURITY | Информационная безопасность |
| PERSONAL_DATA | Персональные данные |
| MANDATORY_HUMAN_ROLE | Обязательное участие/решение человека |
| MANDATORY_PROCESS_RULES | Обязательные действия и процедуры |
| EXTERNAL_PARTIES | Обязательные внешние участники/согласования |
| AUTHORITY_AND_MANDATE | Полномочия и мандат на изменение |

Каждая constraint_domain_review entry разделяет domain_applicability (APPLIES / CONFIRMED_NOT_APPLICABLE / UNKNOWN), domain_review_completeness (COMPLETE / INCOMPLETE / UNKNOWN), domain_review_outcome (NO_MATERIAL_CONSTRAINT / CONSTRAINTS_IDENTIFIED / UNKNOWN). Отсутствующая core entry не считается NOT_APPLICABLE. CONFIRMED_NOT_APPLICABLE требует positive scope evidence, допустимого подтверждения и VALID_FOR_CONTEXT qualification, включая competent role при предметной интерпретации. Это explicit exclusion данного domain по §§5–6.2, не numeric score, не default 5 и не N/A критерия F4. UNKNOWN applicability, REVALIDATION_REQUIRED либо INVALID_FOR_CONTEXT не дают exclusion. Итог 5 возможен только из собственного complete-review rule §13.3, а не из одного excluded domain. APPLIES + COMPLETE + NO_MATERIAL_CONSTRAINT обосновывает положительную ветвь. Старый REVIEWED_NO_MATERIAL_CONSTRAINT выражается этими отдельными dimensions, не свободным shortcut.

Для COMPLETE фиксируются reviewed scope, применимые sources/currentness, relevant обязательства и dispositions review items. Review item status: CANDIDATE / ADMITTED / RESOLVED / REJECTED_AS_IRRELEVANT; candidate evidence: UNSUPPORTED / EVIDENCE_ATTACHED. Unsupported candidate сам по себе не блокирует полноту. Evidence-backed потенциально relevant candidate требует disposition до COMPLETE; нельзя игнорировать его ради score=5. RESOLVED означает объяснённый исход review item, а не автоматическое отсутствие constraint.

Additional relevant domain требует explicit name, definition, reason not covered, owner и source classes; LLM может только предложить candidate. Подтверждённый additional domain включается в completeness наравне с relevant core domains. Unknown applicability, incomplete applicable domain или unknown outcome → F4=null. Material F4 constraint — применимое обязательное ограничение с effect 1–4; accommodated constraint=5 не material, но evidence сохраняется.

### 13.2. Effect of applicable mandatory constraints

Для каждого ограничения нужны: конкретная норма/обязательство, компетентный источник, предмет/границы действия, связь с гипотезой, effect level и evidence допустимого пути либо подтверждённого запрета. Owner F4; budget/team/vendor/start-date не входят.

| Effect enum | Score | Условие смысла |
|---|---:|---|
| `ACCOMMODATED_BY_CURRENT_DESIGN` | 5 | Требование соблюдается текущим выбранным решением |
| `MINOR_ADAPTATION_REQUIRED` | 4 | Нужна небольшая адаптация для соблюдения |
| `MATERIAL_ADAPTATION_OR_SCOPE_LIMITATION` | 3 | Существенная внутренняя адаптация/ограничение scope или изменение внутренних правил в имеющихся полномочиях |
| `EXTERNAL_OR_NORMATIVE_CHANGE_REQUIRED` | 2 | Нужно решение внешнего/вышестоящего органа, изменение обязательной нормы/мандата; легитимный путь подтверждён |
| `TARGET_CHANGE_PROHIBITED` | 1 | Применимый запрет и подтверждённое отсутствие compliant path для данной гипотезы/scope |
| `UNKNOWN` | null | Effect/путь не доказаны |

Resolution modes NQ-06 сохраняют ту же шкалу через явное соответствие:

| Resolution mode | Effect enum §13.2 | Score |
|---|---|---:|
| ACCOMMODATED_AS_IS | ACCOMMODATED_BY_CURRENT_DESIGN | 5 |
| MINOR_INTERNAL_ADAPTATION | MINOR_ADAPTATION_REQUIRED | 4 |
| MATERIAL_INTERNAL_ADAPTATION | MATERIAL_ADAPTATION_OR_SCOPE_LIMITATION | 3 |
| EXTERNAL_OR_NORMATIVE_CHANGE | EXTERNAL_OR_NORMATIVE_CHANGE_REQUIRED | 2 |
| NO_COMPLIANT_PATH | TARGET_CHANGE_PROHIBITED | 1 |
| UNKNOWN | UNKNOWN | null |

Minor/material классифицируется по изменению design, не по стоимости/срокам. Каждый compliant path хранит hypothesis_preservation_status = PRESERVES_ESSENTIAL_MEANING / CHANGES_HYPOTHESIS / UNKNOWN. Path, меняющий essential meaning, не доказывает реализуемость исходной гипотезы; его можно оценить в новой версии. Unknown preservation не позволяет выбрать numeric effect.

Approval kind = ROUTINE_EXISTING_PROCEDURE / SPECIAL_EXTERNAL_DECISION / NORMATIVE_CHANGE / MANDATE_CHANGE / UNKNOWN. Routine existing approval сам по себе не снижает F4; его незавершённость — Project Readiness. Специальное внешнее решение/изменение нормы даёт 2 при положительно доказанном легитимном пути, а не только надежде его получить.

NO_COMPLIANT_PATH=1 требует positive negative evidence: полный review внутренних и внешних/нормативных путей, сохраняющих существенный смысл гипотезы, подтвердил их отсутствие. Запрет при Unknown compliant path → null. Если несколько путей имеют одинаковые effect и preservation outcome, effect можно назначить без selection. Если effect/context различаются, требуется selected path либо null; engine не выбирает лучший score. При фактическом изменении scope используется новая версия.

### 13.3. Aggregation

Если core/additional domain review неполон, relevant outcome/effect/preservation Unknown либо есть affecting conflict → F4=null. При полном review без material applicable constraints F4=5, включая только accommodated constraints. Иначе F4=strict_min(all applicable constraint scores). Ветви Confirmed Absence F4 нет.

Blocker MANDATORY_CONSTRAINT_PROHIBITS_CHANGE проверяется независимо (§17); доказанный instance может сосуществовать с F4=null из-за другого domain. Старый NO_VIABLE_MVP_SCOPE не используется; исторический LEGAL_INFOSEC_PDN_BLOCK не переносится автоматически без повторной проверки evidence/applicability.

## 14. F5 — Measurability of Effect

**Root rule:** `F5_EFFECT_MEASURABILITY_v2.0`. Основание: H §12, C §15.5. Ветвей Confirmed Absence/N/A нет.

### 14.1. Gate и объект измерения

Нужны версия гипотезы, Assessment Scope и expected_effects[] с ролями PRIMARY / ADDITIONAL_DECISION_MATERIAL / SECONDARY_CONTEXT; ровно один PRIMARY. expected_effect_set_completeness = COMPLETE / INCOMPLETE / UNKNOWN; numeric F5 требует COMPLETE. expected_effect_defined=true означает предметно описанное изменение результата, не подтверждённое достижение или размер. False/Unknown, отсутствие PRIMARY либо несколько PRIMARY → null с причиной. Process VALUE не является expected effect.

Formal F5 включает PRIMARY и все ADDITIONAL_DECISION_MATERIAL; SECONDARY_CONTEXT сохраняются для объяснения. До formal scoring фиксируются effect set/roles, selected measurement design каждого включённого effect, indicator-set mode, formal indicators и Assessment Scope. Это pre-scoring freeze определения оценки, не Concept/Methodology Freeze. Изменение требует нового assessment definition/snapshot; плохой F5 сам по себе не основание понизить роль effect.

Для каждого formal effect нужен ровно один selected Measurement Design; движок не выбирает самый простой/высокобалльный. При неопределённом selection F5=null. Indicator-set mode = SINGLE_SUFFICIENT либо JOINT_REQUIRED. SINGLE_SUFFICIENT задаёт один достаточный formal indicator; JOINT_REQUIRED требует indicator-specific specs для каждого обязательного показателя. Альтернативные indicators/designs не смешиваются с joint required в один минимум.

F5 использует indicator, baseline, method, before/after comparability и attribution именно данного изменения. Для общепроцессного KPI должно быть доказано, что он измеряет эффект выбранного scope с учётом незатронутой части. Универсальный threshold размера эффекта не задаётся.

### 14.2. Indicator

| `indicator_evidence_type` | Score |
|---|---:|
| `DIRECT_QUANTITATIVE` | 5 |
| `VALIDATED_QUANTITATIVE_PROXY` | 4 |
| `LIMITED_QUANTITATIVE_PROXY` | 3 |
| `STRUCTURED_QUALITATIVE` | 2 |
| `NO_SUITABLE_MEASUREMENT_INDICATOR` | 1 |
| `UNKNOWN` | null |

| `measurement_scope_fit` | Score |
|---|---:|
| `DIRECT_FIT` | 5 |
| `FIT_WITH_MINOR_ADJUSTMENT` | 4 |
| `FIT_WITH_MATERIAL_ADJUSTMENT` | 3 |
| `PARTIAL_FIT` | 2 |
| `NOT_FIT` | 1 |
| `UNKNOWN` | null |

`indicator_score = strict_min(indicator_evidence_type_score, measurement_scope_fit_score)`.

Подтверждённый подходящий measurement proxy разрешён этой таблицей F5, но не разрешает V3 proxy. `NO_SUITABLE_MEASUREMENT_INDICATOR` требует положительного доказательства; отсутствие определённого KPI в анкете — Unknown. При `NO_SUITABLE_MEASUREMENT_INDICATOR` и неизвестном обязательном `measurement_scope_fit` indicator_score=null и F5=null по общей mandatory-input/null policy. Это решённый случай, не special bypass и не открытая часть NQ-07. Неизвестные компоненты не заполняются единицами. DIRECT_QUANTITATIVE подтверждает прямую количественную связь с effect; VALIDATED_QUANTITATIVE_PROXY требует validated relation и transferability. LIMITED_QUANTITATIVE_PROXY требует положительного evidence связи и material limitations; отсутствие validation не автоматически score=3. STRUCTURED_QUALITATIVE требует воспроизводимой структурированной качественной оценки. NO_SUITABLE_MEASUREMENT_INDICATOR требует положительного review admissible indicator space.

Transferability proxy проверяется по construct, population, process mechanism, measurement definition, operating conditions, direction и material confounders. Для каждого существенного различия нужен обоснованный перенос/ограничение; Unknown существенной применимости не позволяет присвоить 4. Evidence scope fit связывает indicator, effect, включённые/исключённые случаи и необходимые adjustments, а не только совпадение названия KPI.

### 14.3. Baseline

| `baseline_status` | Score |
|---|---:|
| `AVAILABLE_AND_COMPATIBLE` | 5 |
| `COLLECTABLE_BEFORE_CHANGE_CONFIRMED` | 5 |
| `AVAILABLE_OR_COLLECTABLE_WITH_MINOR_ALIGNMENT` | 4 |
| `PARTIAL_WITH_VALID_RECONSTRUCTION` | 3 |
| `LIMITED_PROXY_BASELINE` | 2 |
| `CONFIRMED_NOT_OBTAINABLE` | 1 |
| `UNKNOWN` | null |

`COLLECTABLE_BEFORE_CHANGE_CONFIRMED` требует всех элементов evidence:

- source;
- method;
- scope;
- population;
- period;
- units;
- responsible source owner;
- confirmed ability to collect before process change.

Отсутствие любого обязательного элемента не даёт 5. Baseline может быть собран после начала разработки, но **до изменения процесса**. Если pilot/development уже влияет на рассматриваемую работу, исходное состояние для этой части фиксируется до воздействия. Effect exposure boundary фиксируется как NOT_STARTED / STARTED / UNKNOWN со start time, если воздействие началось. Baseline должен предшествовать material effect exposure для измеряемого scope, а не разработке. Unknown boundary, влияющая на пригодность baseline, даёт null; после начала воздействия нельзя обещание будущего измерения назвать pre-change baseline.

PARTIAL_WITH_VALID_RECONSTRUCTION=3 требует source window, method, assumptions, validation/reconciliation, scope/population fit и exposure boundary. LIMITED_PROXY_BASELINE требует подтверждённой пригодности ограниченного proxy, а CONFIRMED_NOT_OBTAINABLE — positive evidence невозможности получить baseline, не отсутствия записи. Эти состояния не назначаются автоматическим понижением при отсутствии evidence уровня 5. Универсальная длительность сбора/выборка не вводятся.

### 14.4. Measurement method и source

| `measurement_method_status` | Base method score |
|---|---:|
| `REPRODUCIBLE_AND_VALIDATED` | 5 |
| `REPRODUCIBLE_WITH_MINOR_LIMITATIONS` | 4 |
| `DEFINED_WITH_MATERIAL_LIMITATIONS` | 3 |
| `WEAKLY_REPRODUCIBLE_OR_INDIRECT` | 2 |
| `NO_RELIABLE_METHOD` | 1 |
| `UNKNOWN` | null |

| `measurement_source_status` | Source rule |
|---|---|
| `AVAILABLE` | Нет cap; требуется допустимое evidence |
| `COLLECTABLE` | Нет автоматического снижения при подтверждённой собираемости |
| `PARTIAL` | `method_score = min(base_method_score, 3)` при известном base |
| `UNAVAILABLE` | При известном допустимом base method `method_score=1`; при неизвестном обязательном base method F5=null |
| `UNKNOWN` | F5=null |

UNAVAILABLE должен быть подтверждённым состоянием measurement source, не отсутствием описания. Если обязательный base method неизвестен, measurement_method_score=null и F5=null, в том числе при подтверждённом `measurement_source_status=UNAVAILABLE`. Специальной override ветви, обходящей Unknown mandatory input, нет; этот случай исключён из NQ-07. При известном допустимом base method и подтверждённом UNAVAILABLE итог method=1. PARTIAL при base=null также не становится 3.

Measurement sources имеют роли REQUIRED / SUPPORTING / ALTERNATIVE_NOT_SELECTED. Design-level status определяется обязательными sources выбранного design после owner filtering: все AVAILABLE → AVAILABLE; AVAILABLE+COLLECTABLE либо все COLLECTABLE → COLLECTABLE; наличие PARTIAL при остальных AVAILABLE/COLLECTABLE/PARTIAL → PARTIAL; подтверждённый UNAVAILABLE обязательного источника → UNAVAILABLE при известных mandatory source states; score-relevant Unknown оставляет status/зависимый component null. SUPPORTING не понижает оценку, если не обязателен; unselected alternatives не включаются. AVAILABLE+COLLECTABLE не снижает method, COLLECTABLE+PARTIAL сохраняет cap 3.

COLLECTABLE требует подтверждённых source, способа и возможности получения, владельца, применимых scope/population/period/units и пригодности для design. Обещание без доказательства или отсутствие ответа не считается collectability. Foreign-owner constraints остаются ссылками на primary owner, без duplicate F5 penalty и без default 5.

### 14.5. Comparability и attribution

| `before_after_comparability_level` — имя в draft | Score |
|---|---:|
| `DIRECTLY_COMPARABLE` | 5 |
| `COMPARABLE_WITH_MINOR_ADJUSTMENT` | 4 |
| `COMPARABLE_WITH_MATERIAL_ADJUSTMENT` | 3 |
| `LIMITED_COMPARABILITY` | 2 |
| `NOT_COMPARABLE` | 1 |
| `UNKNOWN` | null |

| `effect_attribution_level` | Score |
|---|---:|
| `DIRECTLY_ATTRIBUTABLE` | 5 |
| `ATTRIBUTABLE_WITH_CONTROLS` | 4 |
| `PLAUSIBLE_WITH_MATERIAL_CONFOUNDERS` | 3 |
| `LIMITED_ATTRIBUTION` | 2 |
| `NOT_ATTRIBUTABLE` | 1 |
| `UNKNOWN` | null |

Имя поля comparability введено только для однозначной ссылки на шкалу H §12.4, где имя поля не указано. Это не новый критерий. Comparability оценивает сопоставимость измерений, attribution — возможность связать изменение показателя именно с вмешательством. Наличие before/after разницы не подтверждает причинность само по себе. Evidence comparability фиксирует определения показателя, единицы, population/case unit, окно baseline/после воздействия, изменившийся состав случаев и adjustments; level соответствует доказанной остаточной сопоставимости по шкале, без новых numeric cutoffs.

Attribution требует явной связи intervention→effect и рассмотренных material confounders: DIRECTLY_ATTRIBUTABLE — прямая обоснованная связь; ATTRIBUTABLE_WITH_CONTROLS — связь доказуема с указанными controls; PLAUSIBLE_WITH_MATERIAL_CONFOUNDERS — положительное основание связи при существенных confounders; LIMITED_ATTRIBUTION — доказана лишь ограниченная атрибуция; NOT_ATTRIBUTABLE — положительно доказана невозможность связать изменение с вмешательством. Unknown material confounder → attribution=null, а не автоматический 3/2/1. Shared attribution для joint indicators допустима только при доказанной применимости ко всему design.

### 14.6. Joint indicators, multiple effects и итог

Для SINGLE_SUFFICIENT components определяются по выбранному indicator. Для JOINT_REQUIRED отдельно вычисляются indicator_score, baseline_score, method_score и comparability_score каждого required indicator; каждый effect component — strict_min соответствующих indicator components. Attribution бывает общей доказанной для design либо indicator-specific со strict_min. Затем:

```text
effect_F5 = strict_min(indicator_score, baseline_score,
                      method_score, comparability_score, attribution_score)
hypothesis_F5 = strict_min(effect_F5 всех PRIMARY и ADDITIONAL_DECISION_MATERIAL)
```

Все пять components каждого decision-material effect обязательны. Unknown одного не обходит известная 1 другого, source UNAVAILABLE или отсутствие indicator. Нет нормирования/изменения знаменателя. kpi_count не formal scoring input; добавление SECONDARY_CONTEXT или невыбранного design не повышает F5. EFFECT_NOT_MEASURABLE — отдельный instance predicate для конкретного formal effect (§17); F5=1 сам по себе недостаточен.

## 15. Независимая агрегация VALUE /25 и FEASIBILITY /25

Для каждой оси отдельно при совместимом контексте: Xi = V1–V5 для VALUE либо F1–F5 для FEASIBILITY. Ниже Fi в формуле обозначает критерии FEASIBILITY; для VALUE применяется идентичная формула к Vi с отдельными value_* полями.

```text
known_count = число Fi, имеющих допустимый score 1..5
unknown_count = 5 - known_count
known_sum = сумма известных Fi; пустая сумма = 0
coverage = known_count / 5
range_min = known_sum + unknown_count * 1
range_max = known_sum + unknown_count * 5
full_score = known_sum, если known_count = 5; иначе null
```

При нуле известных criteria: known_sum=0, coverage=0, range=[5,25], full_score=null; это не 0/25. При пяти известных range=[full_score,full_score]. Диапазон математический, не confidence interval и не прогноз вероятности успеха.

Confirmed Absence F1–F3 даёт полноценные scores при достаточном evidence и участвует в сумме. F4/F5 не исключаются. Blocker не обнуляет ось, не уменьшает maxScore и не добавляет penalty. Weak-link min применяется внутри F-критериев; сумма применяется между пятью критериями оси. Разрешённая derivation V5 problem_proxy=max(rates) сохраняет собственную семантику §9.1; эти операции не взаимозаменяемы.

Не вводятся новые зоны матрицы, порог 19 из v1.1, interpretation levels, интегральный /50 или произведение scores. «Value × Feasibility» обозначает двумерное представление. V1–V5 явно перенесены в §9.1. В Deep Assessment value_score=sum(V1..V5) только при пяти допустимых scores; иначе value_score=null с value_known_sum/value_coverage/value_range. Screening не показывает V1+V2 как VALUE /25. Внутриосевая несовместимость (§19) отдельно блокирует full_score и обычный missing-data range: нельзя выдавать комбинацию разных baselines за математический диапазон одной оси.

## 16. Risks и assessment/evidence blockers

`RISK_REQUIRES_VERIFICATION` создаётся при конкретном неподтверждённом потенциальном ограничении, возможном blocker или неизвестном constraint, способном изменить оценку. Risk сохраняет основание, scope, затронутые propositions/criteria, нужную проверку и профильную роль. Сам по себе risk не снижает балл и не выбирает null: null следует из недостаточности обязательного input/gate либо conflict.

Неподтверждённое внешнее предположение не делает каждую полную оценку null. Если же неизвестно обязательное требование/применимость, критерий неполон. Подтверждённый неблагоприятный fact оценивается таблицей; запись risk не создаёт дополнительный штраф.

Assessment/evidence workflow issues: нет компетентного респондента; не определён scope; невозможно получить нужное подтверждение; не разрешён конфликт. Они препятствуют обследованию, но не доказывают невозможность изменения. `NO_PROCESS_OWNER_OR_EXPERT` в v2 не Feasibility blocker. Его будущее отображение как assessment blocker отделяется от F4 и не даёт F score=1.

Assessment issue может привести к null зависимых критериев через отсутствующее evidence; не требуется обнуление всех пяти, если для остальных существуют достаточные допустимые основания. Naming/workflow/schema этих issues остаются contract work. Project Readiness не получает новый formal score в этом draft.

## 17. Feasibility blockers: instance predicates и negative evidence

**Score 1 ≠ BLOCKER automatically.** Blocker — вычисленный результат по собственным confirmed propositions, не человеческое подтверждение ярлыка и не consequence score==1. Identity: blocker type + subject id/type + hypothesis_version + assessment_scope_id/scope_version. Subject types: DATA_REQUIREMENT, INTERACTION, TECHNICAL_CAPABILITY, STRUCTURAL_CONSTRAINT, EXPECTED_EFFECT. Owner определяется atomic root cause (§8).

### 17.1. Трёхзначная логика и допустимость

Каждый обязательный predicate получает TRUE, FALSE либо UNKNOWN по достаточному eligible evidence. Для conjunction всех predicates: все TRUE → CONFIRMED; хотя бы один disqualifying FALSE → CONFIRMED_ABSENT; нет FALSE, но есть UNKNOWN → UNKNOWN. FALSE означает доказанное опровержение необходимого предметного условия, не отсутствие его доказательства. Недопустимость evidence или непрохождение confirmation не являются disqualifying FALSE: соответствующее предметное условие остаётся UNKNOWN. Affecting conflict/неполнота также делает соответствующий predicate UNKNOWN. CONFIRMED_ABSENT относится к конкретному instance, не утверждает отсутствие всех возможных blockers.

Общие mandatory predicates каждого instance: определённый subject/context; применимость к выбранной гипотезе/scope; own-cause F owner; достаточные eligible/qualified/current evidence; отсутствие affecting conflicts в этих propositions; подтверждённая полнота ограниченного review admissible alternatives/remediation, сохраняющих текущую гипотезу и bounded scope; отсутствие viable owner-local alternative. Полный review фиксирует границы поиска, рассмотренные классы/варианты, основания включения/исключения, evidence disposition каждого и профильное подтверждение completeness. Пустой список/«не нашли» не доказывает отрицательный итог. Если полнота не подтверждена, predicate UNKNOWN.

Подтверждённая viable alternative достаточна для FALSE предиката «нет альтернативы», следовательно CONFIRMED_ABSENT, даже если review других alternatives неполон. Viability owner-local: чужой юридический запрет не становится technical nonviability F2/F3, а data limitation не становится доказанной невозможностью method F5. Ссылки на чужие concerns сохраняются.

### 17.2. Necessary/sufficient predicates

К общим predicates §17.1 добавляется вся conjunction соответствующей строки:

| Blocker / subject / owner | Все дополнительные обязательные условия для CONFIRMED |
|---|---|
| CRITICAL_DATA_UNAVAILABLE / DATA_REQUIREMENT / F1 | Данные required и critical; positively proven F1-owned failure доступности необходимого ресурса; complete substitute/remediation review; нет viable substitute для данной потребности |
| CRITICAL_INTEGRATION_UNAVAILABLE / INTERACTION / F2 | Interaction critical; нет viable FULL path; complete FULL alternative/substitute review; отсутствие пути обусловлено F2 technical cause. Materially degraded path не выполняет critical requirement |
| NO_TECHNICALLY_VIABLE_APPROACH / TECHNICAL_CAPABILITY / F3 | Capability critical; выбранный approach conclusively nonviable по §12.6; complete alternative approach review; ни один viable подход не сохраняет гипотезу в данном scope |
| MANDATORY_CONSTRAINT_PROHIBITS_CHANGE / STRUCTURAL_CONSTRAINT / F4 | Constraint applicable и mandatory, затрагивает essential hypothesis; полный review внутренних и внешних/нормативных путей; нет compliant path, сохраняющего essential meaning |
| EFFECT_NOT_MEASURABLE / EXPECTED_EFFECT / F5 | Конкретный effect PRIMARY либо ADDITIONAL_DECISION_MATERIAL; complete review measurement-design alternatives; для каждого admissible design подтверждена хотя бы одна F5-owned terminal impossibility; ни одного viable design |

R&D/PoC, низкая maturity, routine approval, отсутствие выданного токена/бюджета, неизвестный источник и низкий score не являются достаточными условиями. Для F5 terminal impossibility — одно из NO_ADMISSIBLE_INDICATOR, NO_OBTAINABLE_BASELINE, NO_RELIABLE_MEASUREMENT_METHOD_OR_SOURCE, NO_COMPARABLE_MEASUREMENT_DESIGN, NO_MEANINGFUL_ATTRIBUTION_DESIGN. Нужно положительное доказательство terminal состояния design; неудобный метод, ещё не выбранный KPI и отсутствие записи не терминальны. Terminal причины могут различаться между alternatives, но review должен охватывать каждый admissible design, а не только выбранный.

### 17.3. Independence, consistency и currentness

Blocker может быть CONFIRMED при criterion=1 или null, если его собственные predicates достаточны. Unknown другого обязательного scoring component не отменяет independently proven blocker (в частности F1 mandatory coverage/access/readiness по §10.5). Подтверждённый blocker не может сосуществовать со score 2–5 для того же subject/context: это несогласованное evidence/result state, требующее проверки зависимостей; нельзя молча переписать score или убрать blocker. Owner filtering и mandatory null policy действуют независимо.

Blocker не обнуляет сумму/диапазон и не меняет /25. Его currentness зависит от snapshot, versions и evidence qualification; изменение среды требует reassessment. Исторический CONFIRMED остаётся историческим, не бессрочно текущим. REVOKED/INVALIDATED authority и новые conflicts обрабатываются по §§6,19.

Каталог и predicates этого раздела формализованы NQ-08, больше не candidate taxonomy; они ещё не реализованы в runtime/config. NO_VIABLE_MVP_SCOPE — RETIRED for v2.0, сохраняется в v1.1 history. NO_PROCESS_OWNER_OR_EXPERT — assessment/evidence issue, не blocker реализуемости. Исторические codes не переименовываются автоматически.

## 18. Реестр rule IDs draft и trace

Все IDs этого раздела имеют суффикс `_v2.0`. Это определённые нормативные rules данной спецификации; они не заменяют IDs v1.1, не означают active methodology и не являются выполненными runtime rules. Для отдельных строк mapping к ID компонента добавляется enum/token в trace; новые versioned IDs для каждой строки не обязательны.

| ID до суффикса `_v2.0` | Назначение / раздел |
|---|---|
| `COMMON_CONTEXT_EVIDENCE` | Context и evidence checks, §§3–6 |
| `COMMON_CONFLICT_NULL` | Влияющий conflict/null, §7 |
| `COMMON_OWNER_FILTER` | Atomic owner/applicability filtering и residual handling, §8 |
| `COMMON_STRICT_MIN` | Полнота и min, §9 |
| `F1_DATA_AVAILABILITY_READINESS` | Root F1 |
| `F1_REQUIREMENT_GATE` | REQUIRED/absence/Unknown |
| `F1_CONFIRMED_NOT_REQUIRED` | Absence→5 |
| `F1_COVERAGE` | Процент→score |
| `F1_RESOURCE_ACCESS` | Access enum→score |
| `F1_READINESS` | Readiness enum→score |
| `F1_CRITICAL_DATA_OVERRIDE` | Доказанный critical deficit→1 при известных обязательных компонентах; mandatory Unknown→null, §10.5 |
| `F1_COMPONENT_MIN` | Три компонента |
| `F2_INTEGRATION_COMPLEXITY` | Root F2 |
| `F2_REQUIREMENT_GATE` | Gate |
| `F2_CONFIRMED_NOT_REQUIRED` | Absence→5 |
| `F2_INTERFACE` | Interface scale |
| `F2_FORMAT` | Format scale |
| `F2_ADAPTER` | Adapter scale |
| `F2_RELIABILITY` | Reliability scale |
| `F2_PATH_MIN` | Четыре компонента выбранного пути |
| `F2_CRITICAL_NO_MECHANISM` | Доказанное отсутствие критического технического пути→1 |
| `F2_MATERIAL_DEGRADED_PATH` | Owner-local cap min(path_component_score,2), §11.3 |
| `F2_TOPOLOGY` | Topology scale |
| `F2_INTERACTIONS_MIN` | Включённые interactions + topology |
| `F3_TECHNICAL_SOLUTION_MATURITY` | Root F3 |
| `F3_REQUIREMENT_GATE` | Gate + approach/success criteria |
| `F3_CONFIRMED_NOT_REQUIRED` | Absence→5 |
| `F3_PATTERN_MATURITY` | Maturity scale |
| `F3_TARGET_VALIDATION` | Target validation scale |
| `F3_VALIDATION_REQUIREMENT` | Remaining uncertainty scale |
| `F3_COMPONENT_MIN` | Три компонента |
| `F3_SOLUTION_MIN` | Включённые technical components |
| `F4_REGULATORY_ORGANIZATIONAL_CONSTRAINTS` | Root F4 |
| `F4_DOMAIN_COMPLETENESS` | Полнота review |
| `F4_COMPLETE_REVIEW_NO_MATERIAL_CONSTRAINT` | Полная проверка без material constraints→5; не absence branch |
| `F4_CONSTRAINT_EFFECT` | Effect enum→score |
| `F4_CONSTRAINTS_MIN` | Applicable constraints |
| `F5_EFFECT_MEASURABILITY` | Root F5 |
| `F5_EFFECT_SCOPE_GATE` | Определённый expected effect/scope |
| `F5_INDICATOR_TYPE` | Indicator scale |
| `F5_SCOPE_FIT` | Scope fit scale |
| `F5_INDICATOR_MIN` | Два indicator components |
| `F5_BASELINE` | Baseline scale и collectability evidence |
| `F5_METHOD` | Base method scale |
| `F5_SOURCE_LIMIT` | Source cap/ограничение по §14.4 после проверки обязательного base method; Unknown не обходится |
| `F5_COMPARABILITY` | Before/after scale |
| `F5_ATTRIBUTION` | Attribution scale |
| `F5_COMPONENT_MIN` | Пять measurement components |
| `FEASIBILITY_AGGREGATION` | Сумма, coverage, range, §15 |
| `RISK_REQUIRES_VERIFICATION` | Основания risk, §16 |

Blocker rule IDs: `BLOCK_CRITICAL_DATA_UNAVAILABLE_v2.0`, `BLOCK_CRITICAL_INTEGRATION_UNAVAILABLE_v2.0`, `BLOCK_NO_TECHNICALLY_VIABLE_APPROACH_v2.0`, `BLOCK_MANDATORY_CONSTRAINT_PROHIBITS_CHANGE_v2.0`, `BLOCK_EFFECT_NOT_MEASURABLE_v2.0`. Они ссылаются на predicates §17, а не на сравнение score с 1; статусы вычисляются трёхзначной логикой §17; NQ-08 formalized.

Дополнительные правила полного пакета; каждое наследует eligibility/conflict/null checks и указывает конкретное определение, не заглушку:

| ID до суффикса _v2.0 | Определённое действие / раздел |
|---|---|
| V1_FREQUENCY | Canonical frequency thresholds, zero/invalid, §9.1 |
| V2_LABOR | Canonical labor thresholds и semantic verification, §9.1 |
| DERIVE_ANNUAL_LABOR_HOURS | Multiply двух совместимых допустимых inputs, §9.1 |
| V3_MANUAL_WORK | Confirmed-only percentage; запрет всех proxy, §9.1 |
| V4_REPEATABILITY | Quantitative/Confirmed enum priority, conflict и thresholds, §9.1 |
| V5_PROBLEMATICITY | Quantitative/proxy/enum selection и thresholds, §9.1 |
| DERIVE_PROBLEM_PROXY | Max доступных допустимых rates, minimum one, §9.1 |
| SCREENING_TRIAGE | V1/V2, A/B/Insufficient Data, без synthetic VALUE, §9.2 |
| VALUE_AGGREGATION | Независимые sum/coverage/range, §15 |
| F1_REQUIREMENT_GROUP_COVERAGE | Unit counts, веса 1, denominator и min groups, §10.2 |
| F1_SOURCING_PLAN | Selected/joint/substitute bindings, §10.2 |
| DERIVE_F1_READINESS | Applicable dimension min → group min → level, §10.4 |
| F1_GROUP_ACCESS_MIN | Resulting groups selected plan strict min, §10.3 |
| F2_PATH_SELECTION | Ровно один effective path; no-path special branch, §11 |
| DERIVE_F2_TOPOLOGY | Coordination drivers, §11.4 |
| F3_CAPABILITY_COMPLETENESS | Required capabilities и selected bindings, §12.4 |
| F3_COMPARABILITY | Все applicable dimensions допустимы, §12.5 |
| DERIVE_F3_TARGET_VALIDATION | Mandatory success tests и negative viability, §12.6 |
| DERIVE_F3_VALIDATION_REQUIREMENT | Weakest material uncertainty, §12.7 |
| F3_CONSISTENCY | Proposition-level inconsistency → null, §12.7 |
| F4_DOMAIN_REVIEW | Seven domains + relevant additional, candidate dispositions, §13.1 |
| F4_COMPLIANT_PATH | Preservation, approval mode и selection, §13.2 |
| F5_EFFECT_SET | Exactly one PRIMARY, COMPLETE и frozen selection, §14.1 |
| F5_PROXY_QUALIFICATION | Relation/transferability evidence, §14.2 |
| F5_BASELINE_EXPOSURE | Collectability/reconstruction до exposure, §14.3 |
| F5_REQUIRED_SOURCES | Selected required source aggregation/collectability, §14.4 |
| F5_JOINT_INDICATORS | Strict min indicator-specific specs, §14.6 |
| F5_DECISION_MATERIAL_EFFECTS | Strict min formal effects, §14.6 |
| BLOCK_PREDICATE_LOGIC | TRUE/FALSE/UNKNOWN instance predicates, §17 |
| CONFIRMATION_ELIGIBILITY | Две confirmation basis: HUMAN_CONFIRMATION с RBAC/binding либо AUTHORITATIVE_SOURCE_ATTESTATION с source gates; policy + branch-specific qualification, §§5–6 |
| EVIDENCE_CONTEXT_ELIGIBILITY | APPLIES + VALID_FOR_CONTEXT для ordinary input; CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT только для explicit item exclusion; без synthetic score, §§5–7 |
| CONFIRMATION_INVALIDATION | Dependency eligibility cascade, §6.3 |
| EVIDENCE_STAGE | Axis PRE/INTERVIEW/VERIFIED derivation, §19.1 |
| AXIS_COMPATIBILITY | Baseline/Hypothesis/Scope compatibility, §19.2 |
| SNAPSHOT_REUSE | Dependency closure compatibility, §19.3 |

Source rule IDs v1.1 сохраняются только как provenance переноса, не как identity новых results. Ни один ID не является разрешением самостоятельного выбора input enum без evidence rubric.

Для каждого результата trace должен показывать: контекст, root rule, выбранную ветвь, использованные версии facts/evidence, исключённые propositions и причины исключения, component mappings, все значения minimum (включая ties), null reasons/conflicts и независимые concerns. Отсутствующий input не получает synthetic evidence. Точный JSON/DTO не задан.

## 19. Evidence stages, immutable snapshots, compatibility и migration

### 19.1. Workflow и evidence stage

workflow_stage следует цепочке §9.2 и не равен evidence_stage. Hypothesis lifecycle и calculation lifecycle также независимы. До Hypothesis + Scope FEASIBILITY assessment не существует; Screening результат не переименовывается в полную VALUE ось.

evidence_stage выводится для каждой существующей axis snapshot. Сначала проверяются VERIFIED условия, затем INTERVIEW, затем PRE:

| Stage | Условия |
|---|---|
| VERIFIED_SCORE | Все пять axis criteria numeric 1–5, coverage=100%; все mandatory evidence eligible и qualified; completeness checks пройдены; нет affecting unresolved conflict; зафиксированы context/version refs; deterministic execution; специфические проверки, включая active labor semantics, выполнены |
| INTERVIEW_SCORE | VERIFIED условия не выполнены и используется хотя бы один допустимый Confirmed non-registry assessment fact (в том числе в dependency closure Derived); допускается partial score |
| PRE_SCORE | Используются только Confirmed Registry и явно разрешённые Derived от них; никакой unconfirmed факт не получает допуск от имени stage |

Если допустимой evidence basis ещё нет, evidence stage не назначается фиктивно: фиксируется отсутствие evidence для существующего assessment, без новой scoring stage/числа. Source types для non-registry — interview, document, system_data с компетентным подтверждением/attestation. Inferred остаётся недопустимым на любой стадии. V3 всегда Confirmed-only; Derived requirement исключение не расширяет его.

VERIFIED означает зрелость доказательств отдельной оси, не привлекательность результата: допустимы низкие scores и independently confirmed blockers. Любой null, affecting conflict, incompatibility или непрошедший обязательный evidence/completeness gate исключает VERIFIED. Человек не назначает VERIFIED напрямую. Полная FEASIBILITY не присваивает VERIFIED VALUE; оси сохраняют свои stages. Перенесённые ограничения PRE v1.1 не разрешают использовать Interview как Registry.

### 19.2. Cross-axis и intra-axis compatibility

Human Decision pair = ValueSnapshot + FeasibilitySnapshot. cross_axis_compatibility_status = COMPATIBLE / REVALIDATION_REQUIRED / INCOMPATIBLE / UNKNOWN. COMPATIBLE требует подтверждённой связи с тем же Process/primary AnalysisUnit, совместимым process baseline context и доказанной применимости assumptions/evidence гипотезы к этому исходному состоянию. Различие baseline scope и Assessment Scope допустимо и ожидаемо; оно не переносит эффект всего процесса на часть.

REVALIDATION_REQUIRED означает прежнюю compatibility, утратившую актуальность после relevant change и требующую повторной qualification; INCOMPATIBLE — доказанное несоответствие; UNKNOWN — недостаток основания. Только COMPATIBLE допускает обычное совместное представление пары для решения без оговорки несовместимости. Остальные состояния сохраняют snapshots доступными отдельно с причиной; engine не принимает Human Decision и не выбирает заменяющую пару автоматически. Новый VALUE baseline не обязательно требует новый расчёт FEASIBILITY, но compatibility должна быть revalidated.

Intra-axis VALUE: все V1–V5 имеют один совместимый ProcessValueBaseline (period, population, case unit, scope, fact snapshot). Intra-axis FEASIBILITY: все F1–F5 совместимы с одной hypothesis_version + scope_version и process context. Сборка из разнородных contexts запрещена. Неустановленная compatibility не допускает full aggregation; при установленной несовместимости full axis score=null, обычный missing-data range также не предъявляется как диапазон одной оси. Изолированные component results и причины сохраняются. Никакого механического суммирования из разных snapshots ради coverage=100%.

### 19.3. Snapshot identity, recalculation и reuse

Фиксируются axis snapshot id/version, Process/primary AnalysisUnit, ProcessValueBaseline reference для VALUE либо hypothesis/scope versions и process context для FEASIBILITY; RegistryVersion/SourceRow/SourceCell при использовании реестра; input snapshot и версии facts/Derived/evidence; qualification/confirmation basis и branch-specific source/role/policy references; conflicts/dispositions; collections/completeness, criticality/applicability, owner решения; selected sourcing plans, paths, components, effect set/designs; rule/methodology/config/evidence-policy identities; calculated_at, criterion results, trace, concerns, compatibility и evidence_stage.

Document 0.4, concept 0.3, target methodology 2.0 и future config/schema/contract — разные версии. Actual config/engine v2 пока отсутствуют, их identities не выдумываются. При одинаковых допустимых versioned inputs и правилах результат одинаков; clock/LLM не выбирают score. Currentness оценивается относительно зафиксированного контекста/момента assessment, не произвольного времени повторного чтения.

Любое обновление оценки создаёт новую immutable axis snapshot. При partial recalculation критерий получает result_origin = RECALCULATED либо REUSED; для REUSED обязателен reused_from_snapshot_id и provenance конкретного результата. Reuse допускается только при совместимости всех dependencies, evidence, context, methodology/config/evidence-policy versions и отсутствии нового affecting conflict, owner/applicability/dependency change. Если совместимость не доказана — recalculation, а не optimistic reuse.

Dependency closure включает source facts → Derived → classifications/selected definitions → criterion, связанные confirmation/qualification и completeness/owner decisions. Зависимые blockers, aggregates, compatibility и evidence_stage проверяются заново для новой snapshot; reuse известного числа не обходит изменившуюся eligibility. Snapshot остаётся атомарной даже при смеси RECALCULATED/REUSED результатов. При INVALIDATED authority каскад §§6–7 отражается в новых состояниях; прошлые records и scores не переписываются.

### 19.4. Migration и границы реализации

Historical v1.1 score нельзя relabel в v2, пересчитать или переписать задним числом. Facts могут использоваться повторно при сохранённой eligibility/applicability; v2 score переоценивается по v2 rules/config с новой identity и полной dependency chain. Legacy slice02.pre-score.v1 не является v2 identity; старому snapshot не добавляется фиктивная гипотеза. New baseline/change создаёт новые versioned результаты, не уничтожая историю.

Read-only Excel, Parser/Mapping, SourceRow/SourceCell, Process/primary AnalysisUnit, Process Card, DQ, provenance, LLM isolation и frozen Slice 01/02 сохраняются. Данные реестра и штатного расписания не доказывают FTE, загрузку конкретного сотрудника, избыточность, сокращение или денежный эффект. Project Readiness остаётся future scope. API/DTO, DB schema, contracts, UI screens и activation workflow этим документом не создаются; предметные записи выше — нормативные понятия, не реализация.

## 20. Acceptance-oriented decision cases

Это нормативные примеры для последующих acceptance tests, **не выполненные runtime tests** и не замена независимого review. Утверждение designs в N не означает прохождения runtime acceptance suite; ниже даны проверяемые ожидания интегрированной спецификации.

Во всех числовых примерах, если не сказано иное: context валиден, evidence допустимо и достаточно, ownership/applicability известны, affecting conflicts отсутствуют, остальные обязательные inputs известны. Примеры не вводят автоматических правил классификации свободного текста.

| ID | Inputs / условие | Ожидаемое правило |
|---|---|---|
| V2D-C01 | F1/F2/F3 requirement UNKNOWN | Соответствующий F=null, не 5 |
| V2D-C02 | Каждый из F1–F3 имеет доказанный CONFIRMED_NOT_REQUIRED | Каждый получает 5; F4/F5 всё равно обязательны |
| V2D-C03 | Пустой requirements list без absence evidence | Не 5; null/уточнение required gate |
| V2D-C04 | Absence противоречит допустимому Confirmed requirement | Affected F=null, conflict сохранён |
| V2D-C05 | LLM предлагает техническую/правовую невозможность | Нет formal adverse score или confirmed blocker без подтверждения |
| V2D-C06 | Один правовой запрет отражён в F1/F2/F4 | Owner F4; не дублировать penalty в F1/F2, не подставлять им 5 |
| V2D-C07 | Обязательный input Unknown и известный component=1 | Criterion=null; min известных запрещён |
| V2D-C08 | OPTIONAL item имеет score=1; остальные included=5 | Optional исключён при доказанной criticality; min не включает его |
| V2D-C09 | Criticality item неизвестна | Нельзя исключить как OPTIONAL; affected criterion=null |
| V2D-C10 | Scope H-v1 заменён H-v2 | Старый snapshot неизменен, evidence проверяется на новый scope |
| V2D-F1-01 | Coverage 0; 19.9; 20; 39.9; 40; 69.9; 70; 89.9; 90; 100 | Scores 1;1;2;2;3;3;4;4;5;5 |
| V2D-F1-02 | Coverage -1 или 101 | Invalid; не clamp к 0/100 |
| V2D-F1-03 | Coverage_score=4, access_score=3, readiness_score=5 | F1=3 |
| V2D-F1-04 | Access UNKNOWN, другие компоненты известны | F1=null |
| V2D-F1-05 | Coverage=99%, access=4, readiness=4, critical deficit доказан без замены | F1=1 по override; blocker predicate отдельно |
| V2D-F1-06 | Gate REQUIRED, critical deficit доказан, readiness Unknown | Утверждённое правило: F1=null; critical override не обходит completeness. CRITICAL_DATA_UNAVAILABLE может существовать отдельно при достаточном независимом evidence |
| V2D-F1-07 | Новые данные не нужны, но качество существующего критического набора неизвестно | Absence не доказана; не 5 |
| V2D-F1-08 | Freshness NOT_FIT, состояние подготовки dimension FRESHNESS неизвестно | Readiness=null, F1=null; NOT_FIT не auto-cap. При доказанном MAJOR_PREPARATION dimension=2 и участвует в strict min |
| V2D-F2-01 | Один включённый path components 5,4,3,5; topology=5 | F2=3 |
| V2D-F2-02 | Два included interactions 4 и 5; topology=2 | F2=2 |
| V2D-F2-03 | API нет, file exchange доступен и оценён | Оценка выбранного пути по таблицам, не автоматический 1 |
| V2D-F2-04 | Есть механизм, проектный токен не оформлен | Само по себе не снижает F2 |
| V2D-F2-05 | CRITICAL механизм и fallback подтверждённо отсутствуют; topology известна | Interaction=1; F2=1 при остальных известных inputs; blocker predicate отдельно |
| V2D-F2-06 | Механизм unavailable, fallback Unknown | Не confirmed no-path; F2=null |
| V2D-F2-07 | MATERIAL selected DEGRADED viable, owner F2, допустимый component min=1 | interaction=min(1,2)=1; при min=4 interaction=2. Inconsistent viability/component propositions вместо числа дают null |
| V2D-F2-08 | Interaction=1, topology Unknown | F2=null; независимо доказанный blocker не теряется |
| V2D-F3-01 | REQUIRED, solution_approach_defined=false | F3=null, не 1 |
| V2D-F3-02 | Component maturity=5, target validation=2, validation requirement=3 | Component/F3=2 при единственном included component |
| V2D-F3-03 | Included components 4 и 3; optional=1 | F3=3 |
| V2D-F3-04 | R_AND_D подтверждён, прочие компоненты известны | F3=1 возможно; blocker автоматически не возникает |
| V2D-F3-05 | В команде нет компетенций, все технические inputs неизменны | F3 неизменен |
| V2D-F3-06 | Critical selected approach not viable, viable alternative имеется | Нет blocker об отсутствии viable approach; selected approach не получает балл альтернативы |
| V2D-F3-07 | Target validation UNKNOWN | F3=null, не NOT_VALIDATED_BUT_TESTABLE |
| V2D-F4-01 | Все обязательные relevant domains проверены, material constraints нет | F4=5 через complete review, не absence |
| V2D-F4-02 | Один relevant domain UNKNOWN, остальные reviewed | F4=null |
| V2D-F4-03 | Один domain CONFIRMED_NOT_APPLICABLE с evidence, остальные review complete | Domain исключён, F4 остаётся в /25 |
| V2D-F4-04 | Applicable effects 5,4,3 | F4=3 |
| V2D-F4-05 | Требуется внешний/нормативный change, legitimate path подтверждён | Effect=2 |
| V2D-F4-06 | Запрет подтверждён, compliant path Unknown | F4=null, не 1 и не confirmed blocker |
| V2D-F4-07 | Applicable prohibition и отсутствие compliant path доказаны, domains complete | F4=1; blocker проверяется отдельно |
| V2D-F4-08 | Проект не имеет бюджета или подрядчика | Не влияет на F4 |
| V2D-F5-01 | Expected effect undefined | F5=null |
| V2D-F5-02 | Indicator type=5, scope fit=3 | indicator_score=3 |
| V2D-F5-03 | Baseline collectable before change, все восемь элементов evidence есть | baseline_score=5, даже если разработка уже началась без изменения процесса |
| V2D-F5-04 | В том же случае нет подтверждения source owner | Нет допустимого 5; baseline evidence insufficient |
| V2D-F5-05 | Base method=5, source PARTIAL | method_score=3 |
| V2D-F5-06 | Base method=2, source PARTIAL | method_score=2, cap не повышает score |
| V2D-F5-07 | Base method=4, source UNAVAILABLE подтверждён | method_score=1; full F5 требует остальных компонентов |
| V2D-F5-08 | Source UNKNOWN | F5=null |
| V2D-F5-09 | Indicator=5, baseline=5, method=5, comparability=4, attribution=2 | F5=2 |
| V2D-F5-10 | KPI count увеличен при неизменном measurement design | F5 неизменен |
| V2D-F5-11 | F5=1 | Недостаточно для EFFECT_NOT_MEASURABLE |
| V2D-F5-12 | Source UNAVAILABLE подтверждён; обязательный base method UNKNOWN | measurement_method_score=null и F5=null; специального bypass нет |
| V2D-F5-13 | NO_SUITABLE_MEASUREMENT_INDICATOR подтверждён; обязательный measurement_scope_fit UNKNOWN | indicator_score=null и F5=null; остальные компоненты не заполняются единицами |
| V2D-A01 | F=[5,4,3,2,1] | full=15; known_sum=15; coverage=1; range=[15,15] |
| V2D-A02 | F=[5,4,3,2,null] | full=null; known_sum=14; coverage=0.8; range=[15,19] |
| V2D-A03 | Все F=null | full=null; known_sum=0; coverage=0; range=[5,25] |
| V2D-A04 | Nontechnical hypothesis: F1–F3 absence=5; F4=4; F5=3 | Полная FEASIBILITY=22/25; технический компонент не обязателен |
| V2D-A05 | Подтверждён blocker при известной полной оси | Сумма/range не обнуляются |
| V2D-A06 | Нет эксперта для одного обязательного подтверждения | Assessment issue и зависимый null; не Feasibility blocker |

Дополнительные cases полной интеграции:

| ID | Inputs / условие | Ожидаемое правило |
|---|---|---|
| V2I-V01 | V1 inputs 0; 1; 11; 12; 51; 52; 249; 250; 999; 1000; 1.5 | null/ZERO_OR_INACTIVE_PROCESS; 1;1;2;2;3;3;4;4;5; null/invalid integer |
| V2I-V02 | V2 annual labor 0; 99.9; 100; 499.9; 500; 1999.9; 2000; 9999.9; 10000 | 1;1;2;2;3;3;4;4;5 |
| V2I-V03 | V2 один input Unknown либо incompatible units; затем valid 2.5 instances × 4 hours | Сначала null; затем labor=10 и V2=1, при V1= null для fractional frequency |
| V2I-V04 | V2 numeric labor с semantic verification flag | PRE допустим с warning; VERIFIED до подтверждения active person-hours запрещён |
| V2I-V05 | Confirmed V3 0;10;10.1;30;30.1;60;60.1;85;85.1;100 | 1;1;2;2;3;3;4;4;5;5 |
| V2I-V06 | V3 Derived 80% / LLM estimate / P-Q-R signals | Во всех случаях V3=null; no proxy |
| V2I-V07 | Два incompatible Confirmed V3 одного baseline; registry и interview | V3=null до evidence-based conflict resolution; не выбор interview автоматически |
| V2I-V08 | V4 19.9;20;39.9;40;69.9;70;89.9;90;100 | 1;2;2;3;3;4;4;5;5 |
| V2I-V09 | V4 quantitative отсутствует, Confirmed mixed; затем противоречащий Confirmed 95% | Сначала 3; при unresolved contradiction null |
| V2I-V10 | V5 0;1;1.1;5;5.1;15;15.1;30;30.1;100 | 1;1;2;2;3;3;4;4;5;5 |
| V2I-V11 | Нет общего V5; eligible rates 2%,18%; остальных нет | problem_proxy=18% Derived, V5=4; не 20%, не нули missing rates |
| V2I-V12 | Нет статистики V5, Confirmed frequent; нет никакого eligible input | Сначала 4, во втором случае null |
| V2I-V13 | Screening V1=5,V2=3; V3–V5 не обследованы | Priority B; нет synthetic VALUE/25 |
| V2I-V14 | Screening V2=5,V1=null | Insufficient Data; manual shortlist разрешён |
| V2I-O01 | Compound cause частично decomposed; residual candidate owners F1/F4 | Atomic pieces сохраняются; F1/F4 null только если residual влияет на mandatory inputs; F2/F3/F5 не обнуляются автоматически |
| V2I-O02 | Filtering исключил все foreign-owner penalties | Не default 5; собственные обязательные propositions по-прежнему нужны |
| V2I-O03 | Две independently evidenced причины с разными causal mechanisms | Разные primary owners допустимы; один root cause нельзя fan-out в несколько penalties |
| V2I-D01 | Groups coverage 9/10 и 2/5; веса единиц 1 | Overall=40%, coverage score=3; не weighted pooled процент |
| V2I-D02 | REQUIRED total=0 либо score-relevant unit UNKNOWN | F1=null; denominator не меняется по известным units |
| V2I-D03 | Substitute выбран; unselected source хуже | Scoring по selected sourcing plan; unselected не снижает score |
| V2I-D04 | Readiness dimensions 5,4,3,5,4; другая группа=4 | Overall readiness=3/MODERATE_PREPARATION |
| V2I-D05 | Dimension applicability UNKNOWN либо все dimensions исключены без достаточной модели | Null/уточнение, не default 5 |
| V2I-D06 | Critical deficit и complete negative substitutes, один mandatory F1 component Unknown | F1=null; blocker CONFIRMED допустим независимо |
| V2I-P01 | 0 или 2 effective selected paths при required viable alternatives | Null/TECHNICAL_PATH_NOT_SELECTED либо MULTIPLE_TECHNICAL_PATHS_SELECTED |
| V2I-P02 | MATERIAL DEGRADED min=4, degradation owner F4 | Нет F2 cap; F2 требует собственные доказанные components; F4 constraint отдельно |
| V2I-P03 | CRITICAL имеет только degraded путь; FULL review UNKNOWN | Null, не удовлетворённый requirement и не confirmed blocker |
| V2I-P04 | MATERIAL без FULL/DEGRADED viable paths подтверждён | Null/INCONSISTENT_INTERACTION_CRITICALITY |
| V2I-P05 | Selected architecture с complex cycle, viability proven | Topology=2; count systems не используется |
| V2I-T01 | Required capability uncovered либо completeness UNKNOWN | F3=null, несмотря на scores известных components |
| V2I-T02 | Все success tests target/comparable passed, есть comparable, dimension difference unresolved | Не validation=4; нет доказанной comparability, component null |
| V2I-T03 | Все mandatory tests testable, bounded methods; нет passed | validation=2; UNKNOWN не считается testable |
| V2I-T04 | Failed test, remediation UNKNOWN | validation=null; не confirmed nonviable |
| V2I-T05 | Conclusive F3-owned failure без bounded remediation; remaining uncertainty NONE | validation=1 и validation_requirement=5 совместимы; F3 strict min, blocker требует alternatives review |
| V2I-T06 | Maturity 5 не доказана, evidence иных levels нет | null, не автоматическое понижение до 4/3/2/1 |
| V2I-R01 | Из семи domains отсутствует PERSONAL_DATA entry | F4=null; не implicit NOT_APPLICABLE |
| V2I-R02 | Unsupported candidate против evidence-backed potentially relevant candidate без disposition | Первый сам не блокирует COMPLETE; второй блокирует completeness |
| V2I-R03 | Routine approval ещё не выполнено, environment otherwise fully accommodated | Не F4 penalty; Project Readiness отдельно |
| V2I-R04 | Два preserving compliant paths, effects одинаковы | Effect допустим без selection; при разных effects без selection null |
| V2I-R05 | Единственный путь меняет essential hypothesis | Не положительное evidence пути для исходной гипотезы; проверить остальные preserving routes |
| V2I-M01 | PRIMARY effect_F5=4, ADDITIONAL_DECISION_MATERIAL=2, SECONDARY_CONTEXT=1 | Hypothesis F5=2; poor F5 не разрешает demotion material effect |
| V2I-M02 | Effect set INCOMPLETE или два PRIMARY | F5=null |
| V2I-M03 | JOINT_REQUIRED indicator specs: baseline 5 и3, остальные components5 | Effect baseline=3, effect F5=3; unselected alternative не включается |
| V2I-M04 | Proxy relation validated, transferability material dimension UNKNOWN | Не 4; dependent component null до достаточной qualification |
| V2I-M05 | Development началась, exposure NOT_STARTED, восемь collectability оснований подтверждены | Baseline=5 допустим; development date не граница exposure |
| V2I-M06 | Exposure STARTED; baseline обещают собрать потом, reconstruction не доказана | Не pre-change=5; null до evidence допустимого состояния |
| V2I-M07 | Required sources AVAILABLE+COLLECTABLE; затем COLLECTABLE+PARTIAL | Статус COLLECTABLE без cap; затем PARTIAL и cap min(base,3) |
| V2I-M08 | Material confounder UNKNOWN | attribution=null, F5=null |
| V2I-B01 | Все instance predicates TRUE | CONFIRMED; score не является trigger |
| V2I-B02 | Viable owner-local alternative подтверждена, остальной review incomplete | CONFIRMED_ABSENT для instance благодаря disqualifying FALSE |
| V2I-B03 | Нет FALSE, один mandatory predicate UNKNOWN | UNKNOWN, не отсутствие blocker |
| V2I-B04 | F5=1 только выбранного design, alternatives не изучены | EFFECT_NOT_MEASURABLE не CONFIRMED |
| V2I-B05 | Formal effect: complete alternative review, каждый design имеет F5-owned terminal impossibility | EFFECT_NOT_MEASURABLE=CONFIRMED; другой scoring input Unknown может оставить F5=null |
| V2I-B06 | R&D=1 либо routine approval pending | Не blocker автоматически |
| V2I-B07 | CONFIRMED blocker и score4 одного subject/context | Inconsistent evidence/result state, проверить зависимости; не молчаливый overwrite |
| V2I-H01 | HUMAN_CONFIRMATION: Admin с CONFIRM, self-declared domain role UNVERIFIED | Human confirmation ineligible; numeric mapping не меняется; source-based branch проверяется отдельно по собственным gates |
| V2I-H02 | Один actor с двумя verified bindings, policy не требует distinct actor | Может удовлетворить обе группы; при distinct_actor_required=true не может |
| V2I-H03 | Authoritative source CURRENT, applicability UNKNOWN | Истинность содержимого не даёт scoring eligibility в context |
| V2I-H04 | Proposition edited после CONFIRMED, затем bulk confirm | Новая версия требует проверки/record; batch проверяет каждую proposition, partial success допустим |
| V2I-H05 | Binding REVOKED после валидного confirmation | History audit-valid; новые confirmations запрещены |
| V2I-H06 | Binding INVALIDATED как невалидный на момент confirmation | Current dependency cascade; новые score/stage snapshots, history сохранена |
| V2I-H07 | Resolver senior, но нет scope authority | Conflict не разрешён; affecting score null |
| V2I-S01 | Все пять criteria одной оси numeric/eligible, gates complete, есть blocker | VERIFIED допускается; не автоматическое VERIFIED другой оси |
| V2I-S02 | Хотя бы один null или affecting conflict | Не VERIFIED, даже при human request |
| V2I-S03 | Partial axis с Confirmed non-registry fact | INTERVIEW; workflow stage не определяет evidence stage |
| V2I-S04 | Hypothesis/Scope ещё нет | FEASIBILITY assessment отсутствует, не пять фиктивных null |
| V2I-S05 | Hypothesis version изменилась, process baseline прежний | VALUE может использоваться тот же; FEASIBILITY/compatibility перепроверяются |
| V2I-S06 | V1–V5 из несовместимых baselines либо F из разных scopes | Full axis score=null; обычный missing-data range не выдаётся |
| V2I-S07 | Новый VALUE baseline, FEASIBILITY зависимости остаются применимы после revalidation | Совместимая pair возможна без обязательного перерасчёта всех F |
| V2I-S08 | Criterion dependencies/policy/context неизменны и совместимы | REUSED с reused_from_snapshot_id в новой atomic snapshot |
| V2I-S09 | Изменился owner/qualification/conflict dependency | Reuse запрещён; recalculation, blockers/aggregate/stage переоценить |
| V2I-S10 | Historical v1.1 result с теми же исходными числами | Не relabel v2; новые rules/config evaluation и snapshot identity |

Targeted regression references B-01/B-02 (нормативные ожидания, не выполненные runtime tests):

| ID | Inputs / условие | Ожидаемое правило |
|---|---|---|
| V2C-B01-01 | SOURCE_ATTESTATION policy; admissible authoritative source, authority/domain/current/effective version/scope и exact attestation доказаны; human binding отсутствует | Содержание proposition может быть CONFIRMED на basis AUTHORITATIVE_SOURCE_ATTESTATION; отсутствие human binding не отклоняет эту basis |
| V2C-B01-02 | AUTHORITATIVE_SOURCE_OR_ROLE, выбрана source basis, все её gates выполнены | Source branch исполнима без обязательных human actor/binding; confirmation basis и source/version/attestation refs записаны |
| V2C-B01-03 | HUMAN_CONFIRMATION, human RBAC/binding/scope/policy gates выполнены | Human confirmation допустима; source authority record не является обязательной заменой human basis |
| V2C-B01-04 | HUMAN_CONFIRMATION: нет CONFIRM либо binding не active в confirmation time / scope mismatch | Human confirmation ineligible; право admin/самообъявленная роль не устраняют gate |
| V2C-B01-05 | Source content attested, но context applicability требует экспертной интерпретации и ещё UNKNOWN | Содержание подтверждено; ordinary scoring/exclusion недопустимы до competent EvidenceQualificationRecord |
| V2C-B01-06 | Source attestation + отдельная competent qualification APPLIES / VALID_FOR_CONTEXT | Ordinary input допустим при остальных evidence/rule checks; экспертный binding относится к qualification, не обязательному переподтверждению source content |
| V2C-B01-07 | Source authority/domain/currentness/scope либо exact extraction не доказаны | AUTHORITATIVE_SOURCE_ATTESTATION не CONFIRMED; загрузка документа/LLM extraction недостаточны |
| V2C-B01-08 | Policy требует human role group, имеется только authoritative source | Source не обходит ConfirmationPolicy; допустимая basis должна быть прямо разрешена |
| V2C-B02-01 | F1 dimension CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT, positive evidence; остальные applicable scores 4 и3 | Dimension законно исключена, group readiness=3; excluded evidence не получает score и не требует APPLIES |
| V2C-B02-02 | F3 comparability dimension CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT, остальные dimensions удовлетворяют MATCH/ADDRESSED | Dimension исключена из comparison по explicit rule; maturity/validation score по-прежнему выводится по собственным inputs |
| V2C-B02-03 | F4 domain CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT с positive scope evidence; остальные relevant domains complete | Domain exclusion допустим; итог F4 определяется complete review/constraints, не автоматическим 5 от excluded domain |
| V2C-B02-04 | CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT, но criterion rule не имеет explicit applicability exclusion | Item не исключается; обычная mandatory-input/null policy, не default 5 |
| V2C-B02-05 | Score-relevant applicability UNKNOWN | Exclusion запрещён; зависимый criterion/component null по своему rule |
| V2C-B02-06 | CONFIRMED_NOT_APPLICABLE, validity REVALIDATION_REQUIRED / INVALID_FOR_CONTEXT / UNKNOWN | Ни один вариант не даёт formal exclusion; достаточная qualification должна быть восстановлена |
| V2C-B02-07 | APPLIES + VALID_FOR_CONTEXT с admissible confirmation/evidence | Normal scoring-input branch, не exclusion; numeric score только по соответствующему mapping |
| V2C-B02-08 | В applicability/exclusion evidence unresolved affecting conflict | Exclusion не применяется; зависимый criterion null до resolution |
| V2C-B02-09 | F1 все readiness dimensions исключены; либо один domain F4 исключён | F1 не получает default 5 из пустого набора; F4 требует полный собственный review. FEASIBILITY denominator остаётся /25, N/A criterion не создаётся |

Генеративные наборы будущей QA дополнительно должны проверять каждый enum mapping, invalid enum/type, все coverage boundaries, eligibility/role/context/conflict permutations, reorder независимых collections и сохранение одного результата при идентичных versioned inputs. Это требование к будущим tests, не запуск кода в этой задаче.

## 21. Связь с frozen-concept Open Questions

Closure NQ-02–NQ-10 по N не закрывает все продуктовые OQ concept. Сам frozen document не редактируется. Ниже — только граница формализации в данном scoring draft.

| Concept OQ | Что формализовано здесь | Что не закрывается этой работой |
|---|---|---|
| OQ-01 | Сохраняются A/B/Insufficient Data и manual shortlist | Порядок/лимит shortlist, ручное исключение, поведение при обновлении |
| OQ-02 | Process Opportunity Value; explicit V1–V5 transfer | Будущая эволюция смысла/критериев VALUE |
| OQ-03 | Базовый Assessment Scope, baseline и compatibility | Multi-process, необходимость decomposition, сложные partial scopes и их продуктовая сопоставимость |
| OQ-04 | NQ-10 формализует evidence stages отдельно от workflow и snapshot semantics | Реализация соответствующих contracts и calculation workflow |
| OQ-05 | Evidence stage не равен hypothesis lifecycle | Gates ASSESSED/ACCEPTED, возврат и условное принятие |
| OQ-06 | NQ-02 operational owner filtering; границы F1/F2/F4/Project Readiness | Не сохраняется как unresolved scoring gap; implementation отдельно |
| OQ-07 | Absence F1–F3, scores/rules/evidence и confirmation policies | Runtime controls и acceptance execution |
| OQ-08 | F scales, overlap, exact blockers и negative evidence | Matrix zones/интерпретационные thresholds не вводятся |
| OQ-09 | NQ-07 measurement design, baseline/exposure, comparability и attribution | Реализация сбора evidence и execution tests |
| OQ-10 | Canonical V1/V2 types/zero/null/units и semantic warning сохранены | Полная продуктовая политика warning-sensitive Screening/shortlist acceptance вне canonical rules |
| OQ-11 | Signals/Patterns сохраняют роль контекста | Канонический каталог 15–20 patterns и signal/matching rules |
| OQ-12 | Reference Case Library — future context, не scoring source по умолчанию | Запуск библиотеки и qualification кейсов |
| OQ-13 | Migration сохраняет Slice 01/02 | Roadmap, точный implementation scope и authorization slices |
| OQ-14 | NQ-09 facts/roles/authority/confirmation/conflict model | Product authority принятия гипотезы и реализация workflow |

Продуктовые OQ не заменяются executable scoring TBD. Они ограничивают соответствующие будущие функции; не дают разработчику права менять закрытые NQ или автоматически выбирать методические решения.

## 22. Closure NQ и условия будущей configuration

| ID | Статус | Формализация |
|---|---|---|
| NQ-01 | CLOSED — ранее подтверждён frozen principle | REQUIRED F1 + mandatory component Unknown → null, §10.5; blocker независим |
| NQ-02 | CLOSED / APPROVED FOR FORMALIZATION — integrated | Atomic causes/owner filtering, §8 |
| NQ-03 | CLOSED / APPROVED FOR FORMALIZATION — integrated | F1 groups/plans/access/readiness/override, §10 |
| NQ-04 | CLOSED / APPROVED FOR FORMALIZATION — integrated | F2 selected paths/degraded cap/topology, §11 |
| NQ-05 | CLOSED / APPROVED FOR FORMALIZATION — integrated | F3 capability/evidence/validation, §12 |
| NQ-06 | CLOSED / APPROVED FOR FORMALIZATION — integrated | F4 domain/compliant path completeness, §13 |
| NQ-07 | CLOSED / APPROVED FOR FORMALIZATION — integrated | F5 effects/designs/measurement evidence, §14 |
| NQ-08 | CLOSED / APPROVED FOR FORMALIZATION — integrated | Instance-level three-valued blockers, §17 |
| NQ-09 | CLOSED / APPROVED FOR FORMALIZATION — integrated | Confirmation/authorization layer, §6; не numeric criterion |
| NQ-10 | CLOSED / APPROVED FOR FORMALIZATION — integrated | Full VALUE transfer, axes/stages/versioning/config completeness, §§3,9,15,19,22 |

Статусы утверждены владельцем методики в N. Correction B-01/B-02 не переоткрывает и не пересматривает NQ-09: §6 теперь непротиворечиво выражает две confirmation basis и ordinary/exclusion context branches; это confirmation layer, не scoring criterion. Внутри NQ-02–NQ-10 не остаётся вопроса «выбрать rule позже», reserved derivation или developer-decides. Недостаток evidence отдельного process/assessment по-прежнему даёт null/UNKNOWN; closure нормативного решения не подтверждает все реальные facts.

Future scoring_config_v2.0.yaml считается полной только при выполнении всех условий:

1. Фиксированы methodology/config/schema/evidence-policy versions; definition IDs привязаны к этому reviewed пакету.
2. Явно представлены все десять criteria, полный V1–V5 transfer с точными bounds/units/fallback, V3 Confirmed-only/proxy prohibition.
3. Представлены NQ-02–NQ-08 rules, input types/ranges/units/status/context/evidence qualifications и completeness gates.
4. Каждая executable branch имеет deterministic score/null/invalid outcome; отсутствуют executable TBD, RESERVED, _DRAFT или developer-decides.
5. Workflow/evidence stages, независимые axis aggregations, compatibility, instance blocker predicates, snapshot dependency/recalculation/reuse semantics явны.
6. Schema validation и acceptance suite проходят, включая boundaries, conflicts, mandatory Unknown, owner filtering, reuse/invalidation и migration.

NQ-09 normative confirmation decisions формализованы, но соответствующие RBAC/authority/confirmation controls должны быть реализованы и проверены отдельно до production activation. Это implementation/confirmation gate, не несуществующая numeric scale. Contracts, config, acceptance execution, version activation и implementation authorization не создаются настоящей работой. Matrix zones не нужны для raw axes и остаются отдельным решением.

FINAL READ-ONLY REVIEW и последующий TARGETED FINAL RE-REVIEW B-01/B-02 завершены; итог targeted re-review — PASS. Версия 0.4 формально заморожена отдельным решением владельца проекта. Следующий допустимый этап — config design: READY FOR CONFIG DESIGN. YAML v2.0 ещё не создан; runtime implementation не разрешена, API/contracts v2.0 не определены, production activation отсутствует.

Freeze scoring specification не закрывает concept/product OQ §21 и не утверждает product workflow, UI, contracts, API, implementation roadmap, Pattern Library, Reference Case Library или activation/migration workflow. Существующие границы и открытые вопросы этих областей сохраняются без изменений; closure NQ и freeze не означают deployment или автоматическую активацию v2.

## 23. История targeted correction, self-check и formal freeze

Версия 0.3 интегрировала утверждённые NQ designs v0.2. Её FINAL READ-ONLY REVIEW завершён со статусом BLOCKED только по B-01/B-02. Версия 0.4 устранила эти два дефекта confirmation/evidence eligibility; новое conceptual review, пересмотр NQ или выбор альтернативных methodological decisions не выполнялись. Последующий TARGETED FINAL RE-REVIEW: PASS; B-01 — CLOSED; B-02 — CLOSED; related F1/F3/F4 regression — PASS; новых blocker-level дефектов не найдено. Review признал документ READY FOR FREEZE; по решению владельца проекта formal freeze выполнен 2026-10-22 с сохранением версии 0.4. Предметных предположений о процессах, праве, данных, технологии, эффекте или команде не сделано. Numeric VALUE перенесён из B/Y; F mappings сохранены из 0.2 с явным согласованием dimension/resolution terminology по N.

Сохранённый self-check targeted correction:

- B-01: HUMAN_CONFIRMATION проверяет RBAC, eligible active-at-confirmation binding, authority scope и policy; AUTHORITATIVE_SOURCE_ATTESTATION проверяет admissible authoritative source/authority/domain/version/scope/exact attestation и policy, без обязательного human binding для содержания.
- Source-based confirmation не подтверждает контекст автоматически; subject interpretation по-прежнему требует отдельной competent EvidenceQualificationRecord.
- B-02: normal scoring input требует APPLIES + VALID_FOR_CONTEXT; explicit item exclusion — CONFIRMED_NOT_APPLICABLE + VALID_FOR_CONTEXT только при разрешении конкретным rule. Unknown/revalidation/invalid не дают exclusion; synthetic 5/N/A/изменение /25 запрещены.
- Синхронизированы §§5–7, F1/F3/F4 applicability references, rule catalog, ConfirmationRecord/EvidenceQualificationRecord и targeted cases §20. Snapshot references различают basis/source/role без изменения snapshot/versioning model.

Сохраняемые инварианты редакции 0.3:

- Все V1–V5 и F1–F5 определены; VALUE numeric thresholds/boundaries/units/fallback не изменены относительно canonical v1.1.
- V3 Confirmed-only; P/Q/R, Derived, LLM и guesses не дают V3. Screening не выдаёт V1+V2 за VALUE /25.
- VALUE принадлежит ProcessValueBaseline; FEASIBILITY — Hypothesis version + Assessment Scope; ожидаемый эффект не переносится из VALUE.
- Owner filtering, partial decomposition и no-double-counting определены; пустой filtered set не даёт default 5.
- F1 groups/weak-link/critical override сохраняют mandatory Unknown precedence; absence F1–F3 требует evidence, N/A критериев нет.
- F2 paths/cap/topology, F3 capabilities/positive evidence/validation, F4 seven domains/compliant paths и F5 multi-effect/measurement design согласованы с N.
- Blockers instance-level, owner-local, three-valued и independent; score==1 не trigger; полнота review alternatives обязательна для negative conclusion.
- NQ-09 остаётся confirmation layer; LLM не подтверждает facts, не назначает score, blockers, VERIFIED и не разрешает conflicts.
- Workflow/evidence stage разделены; VERIFIED требует пять известных criteria данной оси и все evidence gates, blocker не запрещает VERIFIED.
- Cross-axis/intra-axis compatibility, partial recalculation, dependency closure и immutable reuse определены.
- Закрытые NQ больше не содержат executable заглушек; оставшиеся conceptual/product OQ перечислены с границами, без самовольного closure.
- Historical v1.1 не relabeled; новый v2 result требует новой оценки и version identity.
- Из проектных файлов изменён только SCORING_ENGINE_SPEC_V2_DRAFT.md. Frozen concept, v1.1, YAML v1.1, Slice 01/02, production code, API/contracts и Git не затронуты; YAML v2 не создан.

Регрессионный self-check выше относится к targeted correction; основание freeze — сообщённый владельцем проекта результат независимого TARGETED FINAL RE-REVIEW PASS, а не новое review в этой операции. Перед freeze проверено, что изменены только status/history/freeze-related формулировки: scoring rules, numeric mappings, NQ-02–NQ-10 decisions, blocker predicates, confirmation/evidence rules, VALUE/FEASIBILITY architecture, Assessment Scope, ProcessValueBaseline, workflow/evidence stages, snapshot/versioning semantics и существующие OQ сохранены. NQ-02–NQ-10 остаются CLOSED, B-01/B-02 — CLOSED. Документ сохраняет полную воспроизводимую formal specification v2; её freeze не означает выполнение runtime acceptance tests.

Frozen concept, v1.1, Slice 01/02 и другие проектные файлы не изменены; YAML не создан, implementation не начата, API/contracts не изменены, Git не затронут. Следующий допустимый этап — config design. В этой операции переход к YAML, implementation и production activation не выполняется. На этом работа останавливается.

**DOCUMENT STATUS: FROZEN**

**READY FOR CONFIG DESIGN**

**CONFIGURATION v2.0: NOT YET CREATED — scoring specification version 0.4 is FROZEN after TARGETED FINAL RE-REVIEW PASS; next permitted stage: config design.**

Methodology v2.0 остаётся future/not active в production. Runtime implementation не разрешена; API/contracts v2.0 ещё не определены; production activation отсутствует. READY FOR IMPLEMENTATION, ACTIVE и PRODUCTION READY не присвоены.
