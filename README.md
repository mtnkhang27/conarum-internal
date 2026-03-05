# Conarum Prediction — Internal Platform

> An internal sports prediction web application built on **SAP CAP (Node.js)** and **React**, deployed on **SAP BTP Cloud Foundry**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Technology Stack](#technology-stack)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Overview

Conarum Prediction is an internal platform that lets employees participate in sports prediction games across three use cases:

| Use Case | Description |
|----------|-------------|
| **UC1 — Exact Score** | Predict the exact final score of a match |
| **UC2 — Match Outcome** | Predict Win / Draw / Lose for each match; earn points on a weighted leaderboard |
| **UC3 — Tournament Champion** | Pick the overall tournament champion before the competition begins |

Users submit predictions before each match's kickoff. Once locked, predictions are scored automatically when admins enter final results.

---

## Key Features

- 🔐 **Authentication** via SAP XSUAA (OAuth2 / JWT)
- 📊 **Live leaderboard** with tie-break rules
- 🗓️ **Match management** admin panel (create, update, enter results)
- 🎯 **Prediction slip** — review and submit picks in a single action
- 📱 **Responsive design** — full 3-panel layout on desktop, mobile-first on smaller screens

---

## Project Structure

```
conarum-internal/
├── app/
│   ├── internal-sport/        # User-facing React app (predictions, leaderboard)
│   ├── ref-project2/          # Admin panel (match & tournament management)
│   ├── ref-project1/          # Reference / prototype project
│   └── request-management/    # Internal request management UI
│
├── db/
│   ├── schema.cds             # Domain models (matches, predictions, users…)
│   ├── schema.sql             # Generated SQL schema
│   └── data/                  # Seed / mock data (CSV)
│
├── srv/
│   ├── service.cds            # CAP service definitions & annotations
│   ├── service.ts             # Custom service handlers (TypeScript)
│   ├── handlers/              # Business logic handlers
│   └── lib/                   # Shared utilities
│
├── docs/                      # Full project documentation (see below)
├── Jenkinsfile                # CI/CD pipeline definition
├── mta.yaml                   # SAP MTA deployment descriptor
├── xs-security.json           # XSUAA role & scope configuration
├── package.json               # Root project metadata & scripts
└── tsconfig.json              # TypeScript configuration
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| [Node.js](https://nodejs.org/) | ≥ 18 LTS |
| [SAP CDS DK](https://cap.cloud.sap/docs/get-started/) | `npm i -g @sap/cds-dk` |
| [SAP BTP CF CLI](https://docs.cloudfoundry.org/cf-cli/) | Latest |
| [MTA Build Tool (mbt)](https://github.com/SAP/cloud-mta-build-tool) | Latest |

---

## Getting Started

### 1. Clone & install dependencies

```bash
git clone https://github.com/mtnkhang27/conarum-internal.git
cd conarum-internal
npm install
```

### 2. Run the backend locally (with mock auth)

```bash
cds watch
```

The CAP server starts at **http://localhost:4004** with mock users pre-configured in `package.json`.

**Mock credentials:**

| User | Password | Role |
|------|----------|------|
| `admin` | `admin` | Admin |
| `nguyen.a@conarum.com` | `player` | Authenticated User |
| `tran.b@conarum.com` | `player` | Authenticated User |

### 3. Run the user-facing frontend

```bash
cd app/internal-sport
npm install
npm run dev
```

The app is served at **http://localhost:5173** by default.

### 4. Run the admin panel

```bash
cd app/ref-project2
npm install
npm run dev
```

---

## Development Workflow

### Running tests

```bash
# From the project root
npm test
```

### Linting

```bash
# From the project root
npx eslint .
```

### Building for production

```bash
# Build the MTA archive for SAP BTP deployment
mbt build
```

### Deploying to SAP BTP

```bash
cf login -a <BTP_API_ENDPOINT>
cf deploy mta_archives/<archive>.mtar
```

---

## Technology Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| shadcn/ui | Component library |
| React Router v6 | Client-side routing |
| Sonner | Toast notifications |

### Backend

| Technology | Purpose |
|-----------|---------|
| SAP CAP (Node.js) | Application framework & OData/REST services |
| TypeScript | Backend language |
| SAP HANA Cloud | Production database |
| SQLite (`@cap-js/sqlite`) | Local development database |
| XSUAA | Authentication & authorisation |
| Cloud Foundry | Deployment runtime |

---

## Documentation

Full documentation lives in the [`docs/`](./docs/README.md) folder:

| Category | Audience | Link |
|----------|----------|------|
| Product | End Users, Admins | [`docs/product/`](./docs/product/) |
| Business | BA Team | [`docs/business/`](./docs/business/) |
| Technical | Developers | [`docs/technical/`](./docs/technical/) |
| Project | Internal Team | [`docs/project/`](./docs/project/) |
| Releases | All | [`docs/releases/`](./docs/releases/) |

For a deep-dive into the system design, see the [Architecture Overview](./docs/technical/architecture.md).

---

## Contributing

1. **Branch naming:** `feature/<short-description>` or `fix/<short-description>`
2. **Commits:** Use clear, descriptive commit messages.
3. **Pull Requests:** Every PR must include updated tests and relevant documentation changes.
4. **Code review:** At least one approval is required before merging.
5. **Linting:** Ensure `eslint` passes before opening a PR (enforced via `lint-staged` on commit).

For questions, contact the project team or open an issue in this repository.
