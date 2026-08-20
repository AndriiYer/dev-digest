# Run cost display — специфікація і план реалізації

Показуємо вартість (USD) агентських прогонів на трьох екранах: список Pull
Requests, таймлайн прогонів на сторінці PR, і сайдбар деталей прогону
(Run Trace). Крос-пакетна фіча (`server` DB/contracts/routes + `client` UI) —
звідси розташування в кореневому `specs/`.

## Контекст: що вже є, чого бракує

Вартість LLM-виклику вже рахується **наскрізно, аж до одного прогону**, просто
ніде не зберігається і не віддається назовні:

1. `server/src/adapters/llm/{openai,anthropic}.ts` і
   `reviewer-core/src/llm/openrouter.ts` — кожен `complete`/`completeStructured`
   вже повертає `costUsd: number | null` (`null` — невідома модель в
   прайс-таблиці; `PriceBook`/`estimateCost` в
   [server/src/platform/price-book.ts](../server/src/platform/price-book.ts) і
   [server/src/adapters/llm/pricing.ts](../server/src/adapters/llm/pricing.ts)).
2. `reviewer-core/src/review/run.ts` (`reviewPullRequest`) вже **сумує**
   `costUsd` по всіх чанках одного прогону і повертає його в `ReviewOutcome.costUsd`
   (поруч із `tokensIn`/`tokensOut`) — точно як позначено в чернетці, яку ти
   надіслав ("usage вже у відповіді провайдера").
3. `server/src/modules/reviews/run-executor.ts` **отримує** `outcome.costUsd`,
   але зараз деструктурує лише `{ tokensIn, tokensOut, grounding }` і губить
   вартість — вона нікуди не пишеться.
4. `agent_runs` (DB) не має колонки `cost_usd` — на відміну від `ci_runs`
   (`server/src/db/schema/ci.ts`) і `eval_runs`
   (`server/src/db/schema/eval.ts`), де вона вже є.
5. Контракти `RunSummary`, `RunStats` (`trace.ts`) і `PrMeta` (`platform.ts`)
   не мають поля `cost_usd`.
6. Є вже встановлений прецедент нейминга — `cost_usd` в `AgentColumn`,
   `total_cost_usd` в `MultiAgentRun`, `total_cost_usd`/`avg_cost_usd` в
   `AgentStats` (`observability.ts`) — але ці контракти **не підключені** до
   жодного роута чи репозиторію (grep по `cost_usd`/`costUsd` в
   `server/src/modules` — 0 збігів). Вони належать фічі Multi-Agent Review, яка
   тут НЕ у скоупі — просто підтверджує нейминг `cost_usd`, яким і слід
   користуватись.

Тобто вся робота — це **прокинути вже існуюче число** через DB → контракти →
роути → 3 UI-екрани. Нової логіки підрахунку вартості писати не треба.

## Узгоджені рішення

- **Cost у списку Pull Requests** = вартість **останнього** review-прогону
  цього PR — за тією ж логікою, що й `score` зараз (`pulls/routes.ts` бере
  найновіший рядок `reviews` per PR). Не сума всіх прогонів за весь час.
- **`—` замість суми**, коли `cost_usd == null`. Це одна умова, а не дві:
  прогони, що не дійшли до `status: 'done'` (failed/cancelled), пишуть
  `cost_usd: null` явно (бо вартість не порахована/невідома), тож
  `null`-перевірки на клієнті досить, щоб покрити обидва випадки ("невідома
  модель в прайс-таблиці" і "прогін не done").
- **Формат**: одна функція `formatCost()` з адаптивною точністю (~2 значущі
  цифри), а не фіксована кількість знаків після коми per-екран.
- Реалізуємо тільки спек + план у цій сесії; код — окремою сесією/PR.

## Наскрізний шлях `cost_usd`

```
LLM adapter (costUsd per call, вже є)
  → reviewer-core reviewPullRequest (outcome.costUsd, сума по чанках, вже є)
    → run-executor.ts (НЕ підключено — тут перша дірка)
      → agent_runs.cost_usd (НЕ існує — нова колонка)
        → RunSummary.cost_usd / RunStats.cost_usd / PrMeta.cost_usd (нові поля)
          → routes: GET /pulls/:id/runs (timeline), run_traces (sidebar),
            GET /repos/:id/pulls (list, через JOIN на reviews.run_id)
            → client: PRRow / RunHistory / TraceBody
```

## Формула форматування (`formatCost`)

Правило: мінімум 2 значущі цифри, мінімум 2 знаки після коми, без зайвих
кінцевих нулів понад ці 2 знаки. `null` → `"—"`; рівно `0` → `"$0.00"` (вільна
модель, напр. `z-ai/glm-4.7-flash` з прайс-таблиці — це РЕАЛЬНИЙ нуль, не
"невідомо", тому не повинен ставати "—").

```ts
export function formatCost(usd: number | null | undefined): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0.00";
  const decimals = Math.max(2, 1 - Math.floor(Math.log10(Math.abs(usd))));
  let s = usd.toFixed(decimals);
  while (s.endsWith("0") && s.split(".")[1]!.length > 2) s = s.slice(0, -1);
  return `$${s}`;
}
```

Перевірка на прикладах з макету: `0.0013 → "$0.0013"`, `0.06 → "$0.06"`,
`0.014 → "$0.014"`, `1.2 → "$1.20"`.

---

## Server — план реалізації

### 1. DB-схема + міграція
[server/src/db/schema/runs.ts](../server/src/db/schema/runs.ts) — додати
`costUsd: doublePrecision('cost_usd')` (nullable) до `agentRuns`, поруч із
`tokensIn`/`tokensOut`. Потрібен імпорт `doublePrecision` з
`drizzle-orm/pg-core` (уже використовується в `reviews.ts`/`ci.ts`).
Далі `pnpm db:generate` (нова міграція, номер 0010) → `pnpm db:migrate`.

### 2. Контракти (`server/src/vendor/shared/contracts`)
- `trace.ts` → `RunStats`: додати `cost_usd: z.number().nullable()`.
- `trace.ts` → `RunSummary`: додати `cost_usd: z.number().nullable()`.
- `platform.ts` → `PrMeta`: додати `cost_usd: z.number().nullable()` поруч зі
  `score` (з аналогічним коментарем — "вартість останнього review-прогону,
  null поки не review-нуто").

### 3. Репозиторій (`server/src/modules/reviews/repository/run.repo.ts` +
   тонка обгортка `repository.ts`)
- `completeAgentRun(db, runId, values)`: додати `costUsd: number | null` у тип
  `values` і в `.set({...})`.
- `listRunsForPull`: вибрати `run.costUsd`, змапити в `cost_usd` разом з
  рештою полів `RunSummary`.
- `repository.ts` (обгортка навколо `runRepo.completeAgentRun`) — розширити
  тип `values` тим самим полем.

### 4. `run-executor.ts` — три місця
- **Успішний прогін** (`runOneAgent`, зараз `const { tokensIn, tokensOut,
  grounding } = outcome;`) — додати `costUsd` в деструктуризацію, передати в
  `completeAgentRun({..., costUsd})`, і додати `cost_usd: costUsd` в об'єкт
  `trace.stats`, який будується нижче для `RunTrace`.
- **Провал/скасування** (catch-блок навколо `runOneAgent`, і `failAll` для
  pre-work помилок) — обидва місця вже шлють `tokensIn: 0, tokensOut: 0`;
  додати туди `costUsd: null` явно.
- **`traceFromBuffer()`** (рядок ~424, будує `RunTrace` для fail/cancel-шляху)
  — додати `cost_usd: null` в об'єкт `stats`.

### 5. Роут `GET /repos/:id/pulls`
[server/src/modules/pulls/routes.ts](../server/src/modules/pulls/routes.ts) —
запит `reviewRows` (рядки 121-129) зараз бере лише `{ prId, score }` з
`t.reviews`. Розширити: `leftJoin(t.agentRuns, eq(t.agentRuns.id,
t.reviews.runId))` і додати `costUsd: t.agentRuns.costUsd` в `select`. Логіка
"перший рядок на PR (найновіший) виграє" — без змін, той самий `Map`.
У фінальному `rows.map(...)` додати `cost_usd: review ? review.costUsd : null`.

Зауваження: `reviews.run_id` — звичайний uuid без FK (див. коментар у
`run.repo.ts`), тому старі review-рядки, створені до цієї фічі, матимуть
`run_id: null` → `cost_usd` природно піде в `null` → UI покаже `—`. Це
очікувано, окремої міграції для історичних даних не треба.

---

## Client — план реалізації

### Спільний хелпер
Новий файл `client/src/lib/format-cost.ts` з `formatCost()` (формула вище) —
єдина реалізація, використовується всюди (напряму в `TraceBody`, і
опосередковано — через `RunCostBadge` — в списку й таймлайні). `formatSeconds`/
`formatTokens` лишаються на місці в
`_components/RunTraceDrawer/helpers.ts`, використовуються тільки в
`TraceBody`.

### Новий компонент `RunCostBadge`
`client/src/components/RunCostBadge.tsx` (новий файл) — тонка обгортка над
вже існуючим примітивом `Badge` (`client/src/vendor/ui/primitives/Badge.tsx`,
той самий, яким намальовані status-badge і size-badge на цих же екранах), а
не повністю кастомна вьорстка:

```tsx
export function RunCostBadge({
  costUsd,
  variant = "compact",
}: {
  costUsd: number | null | undefined;
  variant?: "compact" | "detailed";
}) {
  const label = formatCost(costUsd);
  return variant === "compact" ? (
    <Badge mono color="var(--text-secondary)" bg="transparent" style={s.costBadgeCompact} />
  ) : (
    <Badge mono color="var(--text-muted)" bg="var(--bg-hover)">{label}</Badge>
  );
}
```

(точні кольори/паддінги підженемо під сусідні бейджі під час імплементації —
тут фіксуємо форму API, не піксели). Використовується у двох місцях, сайдбар
(Screen 3) її НЕ використовує — там `Stat` і так вже боксована плитка, бейдж
усередині бейджа виглядав би зайвим.

### Екран 1 — список Pull Requests
[client/src/app/repos/[repoId]/pulls/](../client/src/app/repos/[repoId]/pulls/)
- `constants.ts`: додати `"cost"` в `COLUMN_KEYS` між `"status"` і
  `"updated"` (порядок з макету: SCORE … STATUS · COST · UPDATED). Розширити
  `GRID` шаблон на одну колонку (`"1fr 132px 92px 60px 118px 70px 78px"`).
- `_components/PRRow/PRRow.tsx`: нова клітинка
  `<RunCostBadge costUsd={pr.cost_usd} variant="compact" />` між
  status-badge і updated-cell (замінює план "просто текст" — див. рішення
  нижче). `RunCostBadge`/`formatCost` самі віддають `"—"` для `null`, окремого
  `reviewed`-гейту не треба (на відміну від `CircularScore`).
- `client/messages/en/prReview.json`: додати `"cost": "Cost"` в
  `list.columns`.
- `PrMeta` (`@devdigest/shared`, реекспортований в `client/src/lib/types.ts`)
  вже підхопить нове поле з контракту — окремих правок в `types.ts` не треба.

### Екран 2 — таймлайн прогонів (Agent runs)
[RunHistory.tsx](../client/src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.tsx)
- У правому блоці рядка прогону (зараз лише `{r.ran_at &&
  <span>{new Date(r.ran_at).toLocaleTimeString()}</span>}`, рядок ~198-200) —
  додати `{settled && <RunCostBadge costUsd={r.cost_usd} variant="detailed" />}`
  під часом, показувати тільки коли `settled` (`r.status === "done"`), як і
  блок findings/blockers поруч.
- Без нових i18n-рядків — лейбла немає, тільки відформатоване число в пігулці.

### Екран 3 — сайдбар Run Trace (Stats)
[TraceBody.tsx](../client/src/app/repos/[repoId]/pulls/[number]/_components/RunTraceDrawer/_components/TraceBody/TraceBody.tsx)
- В `statsRow` (зараз 3 `<Stat>`: Duration, Tokens, Findings) додати
  четвертий: `<Stat label={t("trace.stat.cost")}
  val={formatCost(stats.cost_usd)} />`. `s.statsRow` — `display: flex` з
  `stat: { flex: 1 }`, тож четверта плитка влазить без правок стилів.
- `client/messages/en/runs.json`: додати `"cost": "COST"` в `trace.stat`
  (поруч із `"duration"`, `"tokens"`, `"findings"`).

---

## Поза скоупом (свідомо не чіпаємо)
- `AgentColumn.cost_usd` / `MultiAgentRun.total_cost_usd` /
  `AgentStats.total_cost_usd`/`avg_cost_usd` — контракти Multi-Agent Review,
  вже існують, але не підключені. Як тільки `agent_runs.cost_usd` буде
  заповнюватись (крок 1-4 вище), ці контракти зможуть читати те саме поле —
  але підключення роутів для них лишаємо наступній фічі.
- "Verdict banner" на PR detail (згадана в твоїй попередній чернетці) — не
  входить у три екрани з поточного запиту; якщо треба — окремий заголовок
  до цього спека.
- CI-раннер (`agent_runs.source = 'ci'`) — використовує ті самі
  `createAgentRun`/`completeAgentRun`, окремого шляху запису не знайдено,
  тож зміни в кроці 3-4 автоматично покривають і CI-прогони.

## Порядок реалізації (коли дійдемо до коду)
1. DB-міграція (schema + generate + migrate) — без цього решта не скомпілюється.
2. Контракти (`trace.ts`, `platform.ts`) — типи для решти шарів.
3. `run.repo.ts` + `repository.ts` — читання/запис `cost_usd`.
4. `run-executor.ts` — фактичне заповнення (3 місця вище).
5. `pulls/routes.ts` — JOIN для списку PR.
6. Client: `format-cost.ts` → `RunCostBadge.tsx` → `TraceBody` (тільки
   `formatCost`, без бейджа) → `RunHistory`/`PRRow` (обидва через
   `RunCostBadge`) → `constants.ts`.
7. Ручна перевірка: прогнати ревʼю на тестовому PR, переконатись що `—`
   з'являється для ще не review-нутого PR і для failed-прогону, а `$0.00`
   — тільки для реально безкоштовної моделі.
