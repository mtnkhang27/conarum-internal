# Conarum Prediction — Internal Platform

> A football match prediction platform for Conarum employees, built with **SAP Cloud Application Programming Model (CAP)** and **TypeScript**.

Employees can submit match outcome predictions, place exact score bets, pick tournament champions, and compete on a live leaderboard. Admins manage tournaments, enter results, and trigger automatic scoring.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [Services Overview](#services-overview)
- [Contributing](#contributing)
- [Code Style](#code-style)

---

## ✨ Features

- **Match Outcome Predictions** — Pick home win, draw, or away win before kickoff
- **Exact Score Bets** — Bet on the precise final score for bonus points
- **Champion Picks** — Predict the tournament winner before it kicks off
- **Live Leaderboard** — Real-time player rankings by points across tournaments
- **Knockout Bracket** — Visual bracket tree for cup competitions
- **Admin Dashboard** — Enter match results, sync from football-data.org, and manage betting locks

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | [SAP CAP](https://cap.cloud.sap/docs/) (`@sap/cds` v9) |
| Language | TypeScript 5 |
| Database (production) | SAP HANA (`@cap-js/hana`) |
| Database (development) | SQLite (`@cap-js/sqlite`) |
| Authentication | SAP XSUAA (`@sap/xssec`) / Mock auth (dev) |
| Runtime | Node.js + Express |
| Testing | Jest + ts-jest |
| Linting | ESLint + Prettier |
| Git hooks | Husky + lint-staged |

---

## 📁 Project Structure

```
conarum-internal/
├── app/
│   ├── internal-sport/     # Main UI frontend (Fiori/custom)
│   ├── ref-project1/       # Reference UI project
│   ├── ref-project2/       # Reference UI project
│   └── request-management/ # Request management UI
├── db/
│   ├── schema.cds          # Domain models (entities, types, enums)
│   ├── schema.sql          # Generated SQL DDL
│   ├── data/               # CSV seed data
│   └── mock/               # Mock JSON data for development
├── srv/
│   ├── service.cds         # Service definitions (PlayerService, AdminService)
│   ├── service.ts          # Service implementation entry point
│   ├── handlers/           # CDS event handlers (actions, functions)
│   └── lib/                # Shared utilities and helpers
├── docs/                   # Full documentation (see docs/README.md)
├── package.json            # Project metadata and scripts
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest test configuration
└── eslint.config.mjs       # ESLint configuration
```

---

## ✅ Prerequisites

- **Node.js** ≥ 18
- **SAP CDS DK** (installed globally or via npx): `npm install -g @sap/cds-dk`
- **SQLite** (built-in on macOS/Linux; on Windows install via package manager)

For production deployment you will also need access to an **SAP BTP** account with HANA and XSUAA service instances.

---

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/mtnkhang27/conarum-internal.git
   cd conarum-internal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Generate CDS type definitions** (optional but recommended for IDE support)

   ```bash
   npx cds-typer '*' --outputDirectory ./@cds-models
   ```

---

## 💻 Usage

### Development

Start the CDS development server with live-reload and SQLite:

```bash
npx cds watch
```

Or in VS Code: **Terminal → Run Task → cds watch**

The server starts at `http://localhost:4004`. Use the built-in CAP index page to explore OData endpoints and run ad-hoc requests.

**Default mock users (development only):**

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | `admin`, `authenticated-user` |
| `nguyen.a@conarum.com` | `player` | `authenticated-user` |
| `tran.b@conarum.com` | `player` | `authenticated-user` |

### Production

Deploy to SAP BTP using the MTA build tool:

```bash
mbt build
cf deploy mta_archives/<artifact>.mtar
```

Ensure HANA and XSUAA service instances are bound before deployment (see `mta.yaml` and `xs-security.json`).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the production server (`cds-serve`) |
| `npx cds watch` | Start development server with live-reload |
| `npx jest` | Run all tests |
| `npx eslint .` | Lint all source files |
| `npx prettier --check .` | Check code formatting |
| `npx prettier --write .` | Auto-format all files |

---

## 🔌 Services Overview

### `PlayerService` — `/api/player`

Accessible to all **authenticated employees**. Key capabilities:

- Browse teams, tournaments, and matches
- Submit and cancel match outcome predictions (`submitPredictions`, `cancelMatchPrediction`)
- Place exact score bets (`submitScoreBet`)
- Pick tournament champion (`pickChampion`)
- Query leaderboard, bracket, standings, and recent predictions

### `AdminService` — `/api/admin`

Restricted to **admin** users. Key capabilities:

- Full CRUD on matches, teams, tournaments, and players
- Enter and correct match results with automatic scoring (`enterMatchResult`, `correctMatchResult`)
- Import tournaments and sync match results from [football-data.org](https://www.football-data.org/) (`importTournament`, `syncMatchResults`)
- Manage betting locks per match or tournament (`lockMatchBetting`, `lockTournamentBetting`)
- Resolve champion picks and recalculate leaderboard rankings

Full API reference: [`docs/technical/reference/api-reference.md`](./docs/technical/reference/api-reference.md)

---

## 🤝 Contributing

We welcome contributions from the team! Please follow these steps:

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the [code style guidelines](#code-style) below.

3. **Write or update tests** in `srv/tests/` (matching pattern `**/tests/**/*.test.ts`).

4. **Run tests and linting** before committing:

   ```bash
   npx jest
   npx eslint .
   ```

5. **Commit** using a clear, descriptive message. Husky will run lint-staged automatically on commit.

6. **Open a Pull Request** against `main` with a description of what changed and why.

7. **Update documentation** in `docs/` if your change affects behaviour, APIs, or configuration.

> ⚠️ This is a **private** repository. Do not share credentials, API keys, or personal data in commits or PR descriptions.

---

## 🎨 Code Style

- **TypeScript** — strict mode enabled (`tsconfig.json`)
- **ESLint** — rules defined in `eslint.config.mjs`; run `npx eslint .` to check
- **Prettier** — formatting enforced; run `npx prettier --write .` to auto-format
- **Husky + lint-staged** — ESLint and Prettier run automatically on staged files at commit time

Keep CDS definitions in `.cds` files and business logic in `.ts` handlers under `srv/handlers/`.

---

## 📚 Documentation

Extended documentation lives in the [`docs/`](./docs/README.md) folder, organized by audience:

| Section | Audience |
|---|---|
| [`docs/product/`](./docs/product/README.md) | End users, admins |
| [`docs/business/`](./docs/business/README.md) | BA team |
| [`docs/technical/`](./docs/technical/README.md) | Developers |
| [`docs/project/`](./docs/project/README.md) | Internal team |

---

## 🔗 Learn More

- [SAP CAP Documentation](https://cap.cloud.sap/docs/get-started/)
- [CDS Query Language (CQL)](https://cap.cloud.sap/docs/cds/cql)
- [SAP BTP XSUAA](https://help.sap.com/docs/btp/sap-business-technology-platform/what-is-sap-authorization-and-trust-management-service)
