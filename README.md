# Registry Agent — Slice 01

Локальный пилот: Excel → выбор листа → validation → выбор процесса → карточка → V1/V2 и partial PRE-SCORE.

## Запуск

Требуется Node.js ≥22.13.0. В Windows PowerShell используйте `npm.cmd`, если execution policy блокирует `npm.ps1`.

```text
npm ci
npm run dev
```

Откройте `http://127.0.0.1:3000/registry`, загрузите `.xlsx`/`.xlsm`, выберите лист и процесс. Scoring запускается backend при первом открытии карточки. Исходный файл не пересохраняется; macros и Excel recalculation отсутствуют.

## Проверки

```text
npm test
npm run typecheck
npm run lint
```

`npm test` включает backend, HTTP-handler tests и frontend contract/integration tests в jsdom. Frontend использует реальные компоненты и fixtures; интеграционный flow подключает настоящий parser/mapping/service/store/scoring через адаптер транспорта. HTTP handlers проверяются отдельно. jsdom не заменяет browser review визуального оформления, layout и native dialog focus trapping.

## Технические ограничения пилота

- Один локальный Node-процесс. Аналитические данные хранятся в `.registry-data/` (или `REGISTRY_DATA_DIR`), исходные байты — под сгенерированными ID. Хранилище использует копию состояния в памяти и атомарную замену JSON; межпроцессных блокировок и production queue нет.
- Технические бюджеты централизованы в `src/server/registry/limits.ts`: распакованный ZIP ≤256 MiB, ≤10 000 ZIP entries, ≤20 000 фактических worksheet rows, ≤200 000 фактических worksheet cells, span таблицы ≤10 000 rows. Span проверяется до materialization пустых строк. Превышение даёт `WORKBOOK_RESOURCE_LIMIT` с именем бюджета. Это не бизнес-лимит количества PROCESS и не обещание максимального upload size.
- HTTP multipart body буферизуется до parser-level проверок; proxy/body streaming limits не реализованы в Slice 01.
- Authentication/RBAC, distributed storage, interview, full scoring, matching, matrix и export относятся к последующим этапам. Локальный сервер слушает `127.0.0.1`.
- Нормативные источники и их приоритет заданы в `PROJECT_CONTEXT.md`. Этот README описывает запуск и технические ограничения реализации, не меняет методику.
