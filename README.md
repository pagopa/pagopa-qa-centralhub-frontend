# QA Hub — Frontend

Next.js 14+ App Router frontend for QA Hub — internal portal for Testing & Data Quality.

## Prerequisites

- Node.js 20+
- pnpm 9 (`npm i -g pnpm@9`, coerente con il Dockerfile)
- Backend running at `http://localhost:8000` (see `../qa-hub-backend/`)

## Setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # fill in GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
pnpm dev
```

Open http://localhost:3000. Unauthenticated users are redirected to `/login` (Google sign-in).

## Gestione dipendenze, npm e lockfile

Il package manager del progetto e' **pnpm**. Usare npm solo per installare pnpm
come indicato nei prerequisiti: non usare `npm install`, `npm update` o `npm ci`
per gestire le dipendenze del repository e non introdurre `package-lock.json`
o `yarn.lock` accanto a `pnpm-lock.yaml`.

`package.json` dichiara le dipendenze e gli intervalli di versione ammessi;
`pnpm-lock.yaml` registra le versioni esatte risolte, incluse le dipendenze
transitive e gli hash di integrita'. Il lockfile va sempre versionato in Git.

### Workflow locale

- Dopo un clone o un pull, eseguire `pnpm install --frozen-lockfile`: installa
  le dipendenze senza modificare il lockfile e fallisce se e' invalido o non
  allineato al manifest.
- Per aggiungere, rimuovere o aggiornare una dipendenza, usare rispettivamente
  `pnpm add <pacchetto>`, `pnpm remove <pacchetto>` o `pnpm update <pacchetto>`;
  per aggiungere una dipendenza di sviluppo usare `pnpm add -D <pacchetto>`.
- Committare insieme le modifiche a `package.json` e `pnpm-lock.yaml`, controllando
  che la diff non contenga aggiornamenti estranei alla modifica richiesta.
- Non modificare manualmente il lockfile e non cancellarlo come soluzione
  abituale: rigenerarlo da zero puo' aggiornare molte dipendenze transitive.
- In caso di conflitto di merge, risolvere prima `package.json`. Ripartire da
  un lockfile valido di uno dei due rami, eseguire `pnpm install` per riconciliarlo
  e controllare che siano conservati gli aggiornamenti voluti di entrambi i rami.
  Non concatenare le due versioni del file: si possono introdurre chiavi YAML
  duplicate. Verificare infine con `pnpm install --frozen-lockfile`.

### Repository e CI/CD

Il Dockerfile usa gia' pnpm 9 e `pnpm install --frozen-lockfile`. Mantenere questo
controllo: la CI deve consumare il lockfile versionato, non rigenerarlo o aggirare
gli errori rimuovendo `--frozen-lockfile`.

Per prevenire regressioni, eseguire lo stesso controllo anche nella pipeline
delle pull request e renderne obbligatorio il superamento tramite le policy del
branch prima del merge.

La versione esatta di pnpm non e' ancora fissata: `pnpm@9` seleziona solo la major
e `package.json` non contiene il campo `packageManager`. Come ulteriore misura,
scegliere una versione esatta condivisa, dichiararla in `packageManager` e
allineare installazioni locali, Dockerfile e pipeline alla stessa versione.

## Build

```bash
pnpm build && pnpm start
```

## Project structure

```
src/
├── app/
│   ├── login/page.tsx      ← Google sign-in page (+ AccessDenied banner)
│   ├── (portal)/           ← Authenticated portal shell + all pages (server-side auth guard)
│   │   ├── layout.tsx      ← Sidebar + Topbar grid, redirects to /login if unauthenticated
│   │   ├── page.tsx        ← Overview (RouteGuard: view:overview)
│   │   ├── bdd/            ← Gherkin Generator (projects, scenarios, history) — RouteGuard: view:bdd
│   │   │   ├── page.tsx             Project list
│   │   │   ├── history/             All-project history
│   │   │   └── [id]/
│   │   │       ├── page.tsx         Scenario list for a project
│   │   │       └── new/page.tsx     Generate wizard (3-step SSE)
│   │   ├── e2e/            ← Suite list, run table (bulk delete), Allure modal — RouteGuard: view:e2e
│   │   ├── sanp-health/    ← Drift OpenAPI SANP/Collaudo/Produzione — RouteGuard: view:sanp_health
│   │   ├── jira/           ← 3 sezioni (Testing / SANP / Data), Monitoraggio + Insights — RouteGuard: view:jira
│   │   ├── data-hub/       ← RouteGuard: view:data_hub
│   │   │   ├── psp-fees/            Catalogo PSP/servizi pagoPA AFM (sync button: Gate sync:trigger)
│   │   │   └── gpd-positions/       Posizioni Debitorie GPD: KPI, trend, confronto periodi (sync button: Gate sync:trigger)
│   │   ├── docs/           ← Knowledge base (tile CRUD, HTML proxy iframe) — RouteGuard: view:docs
│   │   ├── coverage/
│   │   ├── releases/
│   │   └── settings/
│   │       ├── integrations/        E2E suite config — RouteGuard: manage:integrations
│   │       ├── bdd/                 Gherkin Generator config (AI provider, Confluence, Ollama) — RouteGuard: manage:bdd
│   │       ├── users/               Utenti & Ruoli/Permessi (superadmin-only, client-side role check)
│   │       ├── ea-assistant/        Settings Pagoda: motore, modelli e fallback (superadmin-only, client-side)
│   │       ├── general/
│   │       ├── team/
│   │       └── notifications/
│   └── api/auth/           ← NextAuth.js route handler (Google provider)
├── components/
│   ├── auth/RouteGuard.tsx ← redirects to "/" if usePermissions().can(action) is false
│   ├── shell/              ← Sidebar (filtered by permission), Topbar (role badge, avatar, logout)
│   ├── primitives/         ← Kpi, Sparkline, Chip, SegBar, BrandMark
│   └── ui/                 ← shadcn/ui components
├── hooks/
│   ├── usePermissions.ts   ← usePermissions (role, roleLabel, can, isLoading), useRoleMatrix, useUpdateRolePermissions
│   ├── useUsers.ts         ← useUsers, useUpdateUser (role/is_active)
│   ├── useBdd.ts           ← BDD settings, projects, scenarios, generate, Ollama
│   ├── useE2eSuites.ts     ← suite list, run table, delete (single + bulk)
│   ├── useJira.ts          ← useJiraOverview/Trend, useJiraSanpOverview/Trend, useJiraDataOverview/Trend
│   ├── useGpdPositions.ts  ← useGpdPositionSnapshots, useSyncGpdPositions
│   └── ...
├── lib/
│   ├── api.ts              ← Typed fetch client
│   ├── auth.ts             ← NextAuth config — Google provider, sync-login + role refresh in jwt/session callbacks
│   ├── permissions.tsx     ← Role type, <Gate action="...">
│   └── format.ts           ← fmtDuration, fmtRelativeTime, ...
└── types/
    ├── index.ts            ← Domain types (incl. UserRecord, RoleOut, RoleMatrixResponse, ...)
    └── next-auth.d.ts      ← Session augmentation (user.role, user.isActive)
```

## Design system

Tokens live in `src/app/globals.css`. See `../design_handoff_qa_webportal/README.md` for full reference.

## SANP Health

La route `/sanp-health` apre l'ultimo report completo disponibile e permette di selezionare i run conservati negli ultimi sette giorni. La pagina mostra versione SANP, timestamp e link alla run GitHub, KPI aggregati e la matrice dei drift per SANP, Collaudo e Produzione; ricerca, filtri ed espansione delle righe consentono il drill-down fino alla singola differenza OpenAPI.

I run parziali restano consultabili nello storico senza sostituire il report completo predefinito. Gli avvisi segnalano dati non aggiornati o report incompleti. Il pulsante **Sincronizza ora** è disponibile agli utenti con permesso `sync:trigger`; l'accesso alla route richiede `view:sanp_health`.

## NRT Metrics

La voce **NRT Metrics** in **Test Results** (feature `nrt_metrics`, permesso
`view:nrt_metrics`) apre direttamente la dashboard Grafana in una nuova scheda,
senza pagina intermedia o iframe. L'icona di link esterno e il tooltip indicano
l'apertura in una nuova scheda anche con il menu ridotto.
L'autenticazione Microsoft avviene direttamente su Grafana.

Se `NEXT_PUBLIC_NRT_METRICS_URL` non e' impostata, e' vuota o contiene solo spazi,
viene utilizzata la dashboard Grafana di DEV riportata sotto.
Per sovrascriverla, impostare la variabile con l'URL completo della dashboard nella
configurazione locale (`.env.local`), ad esempio:

```dotenv
NEXT_PUBLIC_NRT_METRICS_URL="https://pagopa-d-weu-grafana-emfwascrf8c4fyce.weu.grafana.azure.com/d/an5bhhc/qa-nrt-metrics?orgId=1&from=now-30d&to=now&timezone=browser&var-test_object=checkout&var-test_object=wisp&kiosk"
```

Riavviare `pnpm dev` dopo la modifica. Se il valore esplicitamente impostato non e' un URL HTTP/HTTPS
valido, la voce resta disabilitata e il tooltip segnala l'errore di configurazione.
La variabile e' pubblica: non deve contenere token o credenziali.

In Azure DevOps e' possibile configurare `DEV_NEXT_PUBLIC_NRT_METRICS_URL`,
`UAT_NEXT_PUBLIC_NRT_METRICS_URL` e `PROD_NEXT_PUBLIC_NRT_METRICS_URL` nelle variabili
della pipeline (o nella definizione Terraform che le gestisce).
Questi override sono opzionali: le espressioni runtime della pipeline risolvono
le variabili assenti in stringhe vuote, consentendo l'uso del default del frontend
senza passare macro Azure DevOps non risolte alla build.
La pipeline passa il valore selezionato al build argument Docker
`NEXT_PUBLIC_NRT_METRICS_URL`. Next.js lo incorpora durante la build:
cambiare solo l'ambiente del container in esecuzione non basta; occorre ricostruire
e distribuire l'immagine.

## EA Map

**Settings Pagoda** (`/settings/ea-assistant`, voce in Amministrazione riservata ai superadmin):
scelta globale per ambiente tra Gemini e Groq, modelli modificabili e fallback automatico opzionale
(disattivato inizialmente). Le modifiche sono salvate sul backend e valgono dalla prossima domanda,
senza rebuild o riavvio. Si mostra solo la presenza dei secret; le chiavi API non arrivano al browser.
Pagoda indica provider, modello effettivo ed eventuale fallback sotto ogni risposta.
Se il modello omette i riferimenti `[[id]]`, gli elementi evidenziati e presenti nella mappa
restano apribili tramite pulsanti sotto la risposta, senza chiamate AI aggiuntive o ID dedotti.
Il salvataggio richiede la chiave del motore principale e, se il fallback è attivo, anche quella
dell'altro motore. Il backend deve avere la migration 0024 e i secret configurati.
L'autorizzazione backend di queste API è rinviata: il controllo frontend non protegge accessi diretti.

La route `/ea-map` (`view:ea_map`) mostra la mappa di Enterprise Architecture della piattaforma pagoPA. Le viste sono tab con deep link nell'hash: Blueprint, Architettura (`#a-…`, `#p-…`, `#c-…`), **Data Lake** (`#datalake`, `#d-<id>`), Matrice QA, Guida e Revisione (`review:ea_map`). Codice in `src/components/ea-map/` e `src/lib/ea-map/` (funzioni pure, testate).

**Vista Data Lake** (`EaDataLake.tsx`, `lib/ea-map/datalake.ts`): cinque colonne numerate (Sorgenti → Ingestion → Silver → Gold ed export → Consumer) con i dataset raggruppati per dominio e i fili SVG dei legami `produces` / `derives` / `feeds`. Cliccando un elemento si evidenzia la catena a monte e a valle; "Apri la scheda" apre il drawer senza lasciare la vista. Filtri per dominio, "Solo senza contratto", "Ingestion senza produttore" e "Senza controlli DQ"; badge ⚠ (senza contratto), PII, ✓ (check nel contratto) e "DQ attivi/totale".

**Scheda del dataset** (`EaDatasetBody.tsx`): livello, tabella o topic, owner, SLA, server, link al contratto, documentazione e canale Slack; "Da dove arriva" (produttori e lineage), "Dove va" (consumer), copertura Data Quality e contratti che la citano. Con `edit:ea_map` si collegano o rimuovono produttori e consumer e si correggono livello, link alla documentazione e canale Slack (`EaEditDialogs.tsx`). I produttori proposti dalla sync si approvano in Revisione, gruppo "Produttori del Data Lake".

Le schede di componenti e prodotti mostrano il pannello "Dati nel Data Lake" con i dataset prodotti.

## Auth & RBAC

Login tramite **Google SSO** (NextAuth v5). Ad ogni login/refresh il frontend chiama `POST /api/v1/users/sync-login` sul backend, che crea/aggiorna l'utente e restituisce `role` + `is_active`.

- **5 ruoli**: `superadmin`, `qa_manager`, `qa_analyst`, `qa_engineer`, `guest` (default per i nuovi utenti).
- **`usePermissions()`**: hook che espone `{ role, roleLabel, can, isLoading }`, basato sulla matrice ruolo→permessi (`GET /api/v1/roles`, cache 5 minuti).
- **`<Gate action="...">`**: nasconde i figli se `can(action)` è `false` (es. pulsanti "Sync" dietro `sync:trigger`).
- **`<RouteGuard action="...">`**: redirige a `/` se l'utente non ha il permesso `view:*` / `manage:*` per la pagina (usato in layout/pagine del portale).
- **`/settings/users`**: pagina riservata a `superadmin` (controllo client-side dedicato, non basato su `ACTION_CATALOG`), con tre tab:
  - **Utenti**: lista utenti, modifica ruolo e stato attivo/disattivo (`PATCH /api/v1/users/{id}`).
  - **Ruoli & Permessi**: matrice permessi per categoria, modificabile per i ruoli non di sistema (`PATCH /api/v1/roles/{role}`).
  - **Funzionalità**: toggle globali per pagina (`GET/PATCH /api/v1/features`), inclusi Settings E2E e Settings Gherkin; una pagina è visibile solo se abilitata e permessa dal ruolo. I valori mancanti sono abilitati di default. Il controllo è client-side come l'RBAC corrente; l'URL Swagger diretto resta accessibile.
