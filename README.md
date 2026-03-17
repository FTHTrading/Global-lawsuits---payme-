# ClassAction OS

**AI-powered class action and refund intelligence platform** that continuously discovers lawsuits, settlements, and refund opportunities, ranks the most important ones, extracts deadlines and eligibility, and matches them to your profile so you can file claims and recover money efficiently.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ClassAction OS                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📊  Next.js Dashboard  (apps/dashboard)        port 3000 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🔌  Hono API Server  (packages/api)            port 4000 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────┬────────────┴───────────┬──────────────────┐   │
│  │ source-      │ case-normalizer        │ ai-triage        │   │
│  │ connectors   │ claimability-engine    │ entity-matcher   │   │
│  │ (6 adapters) │ deadline-monitor       │ claim-builder    │   │
│  └──────────────┴────────────────────────┴──────────────────┘   │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ⚙️  BullMQ Workers  (packages/workers)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────┐  ┌─────────────────┐                      │
│  │  🐘  PostgreSQL   │  │  🔴  Redis      │                      │
│  └──────────────────┘  └─────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

## Data Sources (6 Adapters)

| Lane | Source | Type | Confidence |
|------|--------|------|------------|
| A | **FTC Refund Programs** | Web scraper | 0.95 |
| A | **EEOC Class-Member Search** | Web scraper | 0.90 |
| B | **CourtListener RECAP** | REST API v4 | 0.80 |
| B | **PACER Case Locator** | Authenticated API | 1.00 |
| C | **SEC Litigation Releases** | Web scraper | 0.95 |
| D | **ClassAction.org** | Web scraper | 0.50 |

## Packages

| Package | Purpose |
|---------|---------|
| `@class-action-os/shared` | Zod schemas, unified types, enums |
| `@class-action-os/db` | Drizzle ORM schema (10 tables), migrations, seeds |
| `@class-action-os/source-connectors` | 6 source adapters + PoliteFetcher |
| `@class-action-os/case-normalizer` | Dedup, upsert, merge into unified schema |
| `@class-action-os/ai-triage` | GPT-4o extraction, classification, scoring |
| `@class-action-os/claimability-engine` | Lifecycle assessment, urgency calculation |
| `@class-action-os/entity-matcher` | 6-dimension profile matching engine |
| `@class-action-os/deadline-monitor` | Deadline tracking, email alerts |
| `@class-action-os/claim-builder` | Claim-prep copilot (NOT auto-filing) |
| `@class-action-os/api` | Hono REST API server |
| `@class-action-os/workers` | BullMQ jobs + CLI |
| `@class-action-os/dashboard` | Next.js dark premium dashboard |

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL 16
- Redis 7
- OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/your-org/class-action-os.git
cd class-action-os
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials:
#   DATABASE_URL, REDIS_URL, OPENAI_API_KEY
#   Optional: COURTLISTENER_API_TOKEN, PACER_USERNAME/PASSWORD, SEC_API_KEY
```

### 3. Set up database

```bash
# Run migrations
npm run db:migrate

# Seed demo data (user profile + entities)
npm run db:seed
```

### 4. Start everything

```bash
# Start API, workers, and dashboard concurrently
npm run dev
```

Or start individually:

```bash
npm run dev:api        # API on :4000
npm run dev:workers    # BullMQ workers
npm run dev:dashboard  # Dashboard on :3000
```

### 5. Ingest data

```bash
# Ingest from all sources
npm run ingest

# Ingest from a specific source
npm run ingest:ftc
npm run ingest:eeoc
npm run ingest:courtlistener
npm run ingest:sec

# Full daily pipeline (ingest → triage → match → deadlines → email)
npm run sync:daily
```

## Docker

```bash
# Start everything with Docker Compose
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f workers
```

## CLI Commands

```bash
# Source ingestion
npx tsx packages/workers/src/cli.ts ingest --all
npx tsx packages/workers/src/cli.ts ingest --source ftc

# Full sync pipeline
npx tsx packages/workers/src/cli.ts sync

# AI triage
npx tsx packages/workers/src/cli.ts triage
npx tsx packages/workers/src/cli.ts triage --case-id <uuid>
npx tsx packages/workers/src/cli.ts triage --rescore

# Entity matching
npx tsx packages/workers/src/cli.ts match

# Deadline check
npx tsx packages/workers/src/cli.ts deadlines
npx tsx packages/workers/src/cli.ts deadlines --send-emails
```

## API Endpoints

### Cases
- `GET    /api/cases` — List cases (filters: source, status, case_type, q, sort, page, limit)
- `GET    /api/cases/:id` — Case detail with claimability + deadlines
- `GET    /api/cases/status/claimable` — All claimable cases
- `GET    /api/cases/stats/overview` — Dashboard stats
- `POST   /api/cases/:id/triage` — Trigger AI triage
- `PATCH  /api/cases/:id` — Update case

### Matches
- `GET    /api/matches/user/:userId` — Get matches for user
- `POST   /api/matches/user/:userId/run` — Run matching
- `POST   /api/matches/run-all` — Global matching
- `POST   /api/matches/:id/dismiss` — Dismiss match

### Claims
- `GET    /api/claims/user/:userId` — User's claims
- `POST   /api/claims/build` — Build claim packet
- `GET    /api/claims/:caseId/guidance` — AI filing guidance
- `PATCH  /api/claims/:id/status` — Update claim status

### Users
- `GET    /api/users` — List profiles
- `GET    /api/users/:id` — Get profile
- `POST   /api/users` — Create profile
- `PATCH  /api/users/:id` — Update profile
- `DELETE /api/users/:id` — Delete profile

### Source Health
- `GET    /api/sources` — All source health
- `GET    /api/sources/:source` — Single source detail

### Notifications
- `GET    /api/notifications/user/:userId` — User notifications
- `GET    /api/notifications/user/:userId/count` — Unread count
- `PATCH  /api/notifications/:id/read` — Mark read
- `POST   /api/notifications/user/:userId/read-all` — Mark all read

## Dashboard Pages

1. **Overview** — Stats, top cases, source activity
2. **Open Claims** — Filterable list of claimable cases
3. **Corporate Actions** — Major corporate class actions
4. **Securities** — SEC enforcement & securities fraud
5. **FTC Refunds** — Federal Trade Commission refund programs
6. **EEOC Actions** — Employment settlements
7. **My Matches** — Profile-matched cases with confidence scores
8. **My Evidence** — Document vault for claim filing
9. **Deadlines** — Calendar view with urgency indicators
10. **Source Health** — Live connectivity + sync status
11. **Admin** — Pipeline controls, quick actions, system info

## Scoring Formula

```
AI Score = sourceConfidence × 0.15
         + claimOpenWeight × 0.25
         + estimatedPayoutWeight × 0.20
         + userMatchWeight × 0.25
         + deadlineUrgency × 0.10
         + proofEase × 0.05
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.3
- **API**: Hono v4 + @hono/node-server
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Queue**: BullMQ + Redis
- **AI**: OpenAI GPT-4o / GPT-4o-mini
- **Frontend**: Next.js 14 + Tailwind CSS + Recharts + Lucide
- **Validation**: Zod
- **Scraping**: Cheerio + custom PoliteFetcher

## License

MIT
