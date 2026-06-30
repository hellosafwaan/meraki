# Meraki Dashboard Clone

A production-grade, multi-tenant network device configuration and monitoring platform built as a Cisco Meraki engineering application project. Demonstrates real-time systems, background jobs, organization-scoped role-based access control, and a React frontend matched to a professional design spec.

---

## Features

**Multi-Tenancy**
- Data is partitioned by organization — users only ever see devices, configs, and events belonging to their current org
- Users can belong to multiple organizations with a different role in each; an in-app org switcher changes the active organization and reloads scoped data
- The active organization is sent on every request via an `X-Organization-Id` header and enforced server-side

**Device Management**
- Full CRUD UI for network devices (create / edit / delete, admin-only) across four types: routers, switches, access points, and firewalls
- Per-device status tracking: `online`, `degraded`, `offline`
- Filter and search by type, status, name, IP, or location

**Real-Time Monitoring**
- Live status updates via ActionCable WebSocket subscriptions — no polling from the browser
- Sidekiq background job pings every device via TCP every 30 seconds and broadcasts status changes
- Status transitions follow a degradation model: `online → degraded → offline` (never jumps directly)
- Animated status badges pulse on state change in the UI

**Config Management**
- Push versioned JSON configs to any device
- Device-type-specific validation: each type has required keys (`ssid/band/channel/security` for APs, `wan_ip/gateway/dns` for routers, etc.)
- Full version history with an inline before/after diff view
- Immutable audit trail: every push is logged as a `DeviceEvent` with the actor and timestamp

**Authentication & RBAC**
- JWT authentication via `devise-jwt` with a denylist revocation strategy (tokens invalidated on logout)
- Roles are **per-organization** (stored on `organization_memberships`, not globally on the user) and enforced at the controller layer against the caller's membership in the current org:
  - `admin` — full access including device create/update/delete
  - `network_engineer` — can push configs, read everything
  - `viewer` — read-only

**Event Log**
- Timestamped log of all `status_change` and `config_push` events per device
- System-generated events (status changes) vs user-attributed events (config pushes) are distinguished

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   React + TypeScript + Vite                                 │
│   React Query (server state) · React Router (navigation)   │
│   @rails/actioncable (WebSocket client)                     │
│                    │  HTTP /api/v1/*                        │
│                    │  WS   /cable                           │
└────────────────────┼────────────────────────────────────────┘
                     │  (Vite proxy in dev)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Rails 7.2 API                              │
│                                                             │
│   Devise + devise-jwt  →  JWT auth + denylist revocation    │
│   ApplicationController →  RBAC Policy concern             │
│   ActionCable           →  DeviceStatusChannel              │
│                    │                                        │
│         ┌──────────┴──────────┐                             │
│         ▼                     ▼                             │
│    PostgreSQL            Redis                              │
│    (primary store)   (ActionCable adapter                   │
│                       + Sidekiq queue)                      │
│                             │                               │
│                             ▼                               │
│                    Sidekiq Worker                           │
│                    DeviceStatusPollerJob                    │
│                    (every 30s via sidekiq-cron)             │
│                    net-ping TCP check per device            │
│                    → update DB → broadcast to cable         │
└─────────────────────────────────────────────────────────────┘
```

**Data flow for a status update:**
1. Sidekiq cron fires `DeviceStatusPollerJob` every 30 seconds
2. Job opens a TCP connection to each device's IP on port 80 (2s timeout)
3. If status changed: updates `devices.status`, creates a `device_events` record, broadcasts `{ id, status }` over ActionCable
4. Each browser tab has a subscription per device; on broadcast, React Query cache is updated in place — no refetch, no flicker

**Request scoping (multi-tenancy):**
- The frontend sends `X-Organization-Id` on every API request (Axios interceptor) and `DeviceStatusChannel` subscriptions
- `ApplicationController#set_current_organization` resolves `@current_org` from that header, rejecting the request if the user isn't a member (`403`) or the header is missing (`400`)
- Every device / config / event query is scoped through `@current_org`, so cross-tenant access is impossible even with a valid token

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| API framework | Ruby on Rails | 7.2 |
| Database | PostgreSQL | 14+ |
| Auth | Devise + devise-jwt | — |
| Background jobs | Sidekiq + sidekiq-cron | — |
| Real-time | ActionCable (Redis adapter) | — |
| Device ping | net-ping (TCP) | — |
| Frontend | React + TypeScript | 19 / ~6.0 |
| Build tool | Vite | 8 |
| Server state | TanStack React Query | 5 |
| HTTP client | Axios | 1.x |
| WebSocket client | @rails/actioncable | 8 |
| Routing | React Router | 7 |
| Testing | RSpec + FactoryBot + shoulda-matchers | — |
| Cache / queue | Redis | 7+ |

---

## Project Structure

```
meraki/
├── backend/                    # Rails API
│   ├── app/
│   │   ├── channels/
│   │   │   ├── application_cable/
│   │   │   │   └── connection.rb       # JWT auth for WebSocket connections
│   │   │   └── device_status_channel.rb
│   │   ├── controllers/
│   │   │   ├── application_controller.rb   # Auth + RBAC entry point
│   │   │   ├── concerns/
│   │   │   │   └── policy.rb               # require_admin!, require_engineer_or_admin!
│   │   │   └── api/v1/
│   │   │       ├── auth_controller.rb
│   │   │       ├── organizations_controller.rb
│   │   │       ├── devices_controller.rb       # scoped to @current_org
│   │   │       ├── configs_controller.rb
│   │   │       └── device_events_controller.rb
│   │   ├── jobs/
│   │   │   └── device_status_poller_job.rb
│   │   ├── models/
│   │   │   ├── user.rb              # has_many organizations through memberships
│   │   │   ├── organization.rb
│   │   │   ├── organization_membership.rb  # per-org role enum
│   │   │   ├── device.rb            # belongs_to :organization
│   │   │   ├── config.rb           # auto-versioning, event logging via callbacks
│   │   │   ├── device_event.rb
│   │   │   └── jwt_denylist.rb
│   │   └── validators/
│   │       └── config_schema_validator.rb  # required-key validation per device type
│   ├── config/
│   │   ├── routes.rb
│   │   └── initializers/
│   │       ├── sidekiq.rb          # Redis URL + cron schedule
│   │       └── cors.rb
│   ├── db/
│   │   ├── schema.rb
│   │   └── seeds.rb                # 2 orgs + 3 users + 4 memberships + 16 devices
│   └── spec/                       # RSpec (42 examples)
│
└── frontend/                   # React app
    └── src/
        ├── api/
        │   ├── client.ts           # Axios instance, Bearer + X-Organization-Id interceptors, 401 redirect
        │   └── devices.ts          # fetch/create/update/delete devices, configs, events
        ├── components/
        │   ├── Sidebar.tsx          # Nav + org switcher dropdown, per-org role badge
        │   ├── StatusBadge.tsx      # Color-coded pill with pulse animation on change
        │   └── DeviceTypeIcon.tsx   # SVG icons per device type
        ├── context/
        │   └── AuthContext.tsx      # JWT + user + currentOrg in localStorage, login/logout, setCurrentOrg
        ├── pages/
        │   ├── Login.tsx
        │   ├── DeviceList.tsx       # Stats, filter/search, live table, ActionCable subscriptions
        │   ├── DeviceDetail.tsx     # 3-tab page: Current Config, Version History, Event Log + edit/delete
        │   ├── DeviceForm.tsx       # Create/edit device form (admin-only)
        │   ├── ConfigEditor.tsx     # Dynamic form per device type, POST to API
        │   └── ComingSoon.tsx       # Placeholder for Alerts + Settings
        └── types/
            └── index.ts
```

---

## Database Schema

```
users
  id, email, encrypted_password

organizations
  id, name, slug (unique)

organization_memberships
  id, organization_id → organizations, user_id → users,
  role (admin|network_engineer|viewer)
  — unique on (organization_id, user_id)

devices
  id, organization_id → organizations,
  name, ip_address, device_type (router|switch|access_point|firewall),
  location, status (online|degraded|offline)

configs
  id, device_id, pushed_by_id → users,
  config_data (jsonb), version (auto-incremented), note

device_events
  id, device_id, user_id (nullable — null = system),
  event_type (status_change|config_push), payload (jsonb)

jwt_denylists
  id, jti, exp  — tokens added on logout, checked on every request
```

**Key constraints:**
- Role lives on `organization_memberships`, not `users` — a user can be an admin in one org and a viewer in another
- `devices.organization_id` is `NOT NULL`; all device-related queries are scoped through the membership-resolved current org
- `config_data` is validated at the model layer via `ConfigSchemaValidator` — each device type has required keys
- `configs.version` is set by a `before_create` callback (max existing version + 1), never exposed as a user-writable field
- `device_events` are written by `Config#after_create` and `DeviceStatusPollerJob` — never directly by a controller

---

## API Reference

All routes are under `/api/v1`. All endpoints except `POST /auth/login` require `Authorization: Bearer <token>`. All endpoints except `POST /auth/login` and `GET /organizations` additionally require an `X-Organization-Id: <id>` header identifying the active organization; the caller must be a member of it. Roles in the table below refer to the caller's role **within that organization**.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Returns JWT token + user (with their organizations and per-org role) |
| DELETE | `/auth/logout` | any | Invalidates token (adds JTI to denylist) |
| GET | `/organizations` | any | List organizations the current user belongs to (no org header needed) |
| GET | `/devices` | any | List devices in the current org |
| POST | `/devices` | admin | Create device in the current org |
| GET | `/devices/:id` | any | Get device (must belong to current org) |
| PATCH | `/devices/:id` | admin | Update device |
| DELETE | `/devices/:id` | admin | Delete device |
| GET | `/devices/:id/configs` | any | List configs (newest first) |
| POST | `/devices/:id/configs` | engineer/admin | Push new config |
| GET | `/devices/:id/device_events` | any | List events (newest first) |
| WS | `/cable` | JWT via param | ActionCable endpoint (subscriptions checked against org membership) |

**Login request:**
```json
POST /api/v1/auth/login
{ "email": "admin@meraki.dev", "password": "password" }
```

**Login response:**
```json
{
  "token": "<jwt>",
  "user": {
    "email": "admin@meraki.dev",
    "organizations": [
      { "id": 1, "name": "Acme Corp", "slug": "acme-corp", "role": "admin" }
    ]
  }
}
```

**Push config request:**
```json
POST /api/v1/devices/:id/configs
{
  "config": {
    "config_data": { "ssid": "CorpNet", "band": "5GHz", "channel": 36, "security": "WPA3" },
    "note": "Switched to WPA3"
  }
}
```

**Config data shapes by device type:**

| Type | Required keys |
|---|---|
| `access_point` | `ssid`, `band`, `channel`, `security` |
| `router` | `wan_ip`, `gateway`, `dns` |
| `switch` | `vlans` (array), `stp` (boolean) |
| `firewall` | `rules` (array) |

---

## Design Decisions

### JWT over session cookies
Rails defaults to cookie-based sessions. For a decoupled React frontend (separate origin in production, potential mobile clients later), JWT in the `Authorization` header is cleaner and stateless. The `devise-jwt` gem handles signing; the `JwtDenylist` table handles revocation — when a user logs out, the token's JTI is stored and rejected on future requests, giving us explicit invalidation without full statefulness.

### Header-based org scoping over subdomains or URL nesting
Multi-tenancy is keyed off an `X-Organization-Id` request header rather than tenant subdomains (`acme.app.com`) or nested routes (`/orgs/:id/devices`). The header keeps routes flat and unchanged, lets the same JWT work across every org the user belongs to, and centralizes enforcement in a single `before_action` (`set_current_organization`) that resolves and authorizes the org once per request. The frontend persists the active org in `localStorage` and attaches the header via an Axios interceptor, so switching orgs is a client concern that requires no re-auth. Role lives on the membership join table, so the same user can hold different roles in different orgs.

### Sidekiq + Redis over ActionCable ping from browser
An early design had the browser open a persistent ping to check if devices are reachable. This doesn't scale — 1000 browsers × 15 devices = 15,000 concurrent connections doing redundant work. Instead, one Sidekiq worker polls all devices centrally every 30 seconds and broadcasts the result. The browser just subscribes and reacts.

### TCP ping over ICMP
`net-ping` supports both. ICMP requires root privileges on most systems; TCP on port 80 works as a regular user and is a more meaningful check (tests whether the device's management interface is accepting connections).

### Status degradation model
Rather than `online → offline` directly, a missed ping transitions `online → degraded` first, and only a second consecutive miss transitions to `offline`. This prevents a single dropped packet from marking a device as offline and flooding the event log with noise.

### `protect_from_forgery with: :null_session`
Rails' full-stack mode enables CSRF protection by default. Since our API uses JWT in the Authorization header (not cookies), CSRF tokens are irrelevant — but the default `exception` strategy was rejecting JSON POST requests with 422. `null_session` disables CSRF checking without removing the middleware entirely, which is the Rails-idiomatic approach for APIs co-located with a full-stack app.

### Vite proxy in development
Vite's dev server proxies `/api/*` to Rails on port 3000 and `/cable` as a WebSocket. This avoids all CORS issues in development without having to configure different origins — the browser sees a single origin at `localhost:5176`.

### Config versioning via callbacks
`configs.version` is set by a `before_create` callback that reads `MAX(version) + 1` for that device. This keeps versioning logic in the model layer, prevents the client from manipulating version numbers, and produces a clean sequential history.

---

## Local Setup

### Prerequisites

- Ruby 3.3.6 (via rbenv: `rbenv install 3.3.6`)
- Node.js 20+ and npm
- PostgreSQL 14+
- Redis 7+

### 1. Clone and install

```bash
git clone <repo-url>
cd meraki
```

### 2. Backend

```bash
cd backend
bundle install

# Create and migrate the database
rails db:create db:migrate db:seed

# Seed creates:
#   2 organizations:  Acme Corp (acme-corp), Globex Industries (globex)
#   admin@meraki.dev      / password  — admin in BOTH orgs
#   engineer@meraki.dev   / password  — network_engineer in Acme Corp
#   viewer@meraki.dev     / password  — viewer in Acme Corp
#   + 16 seeded devices (13 in Acme Corp, 3 in Globex Industries)
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Environment variables

The backend reads from environment or falls back to sensible defaults for development:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://localhost/meraki_development` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis for ActionCable + Sidekiq |
| `DEVISE_JWT_SECRET_KEY` | set in `config/initializers/devise.rb` | JWT signing secret |

No `.env` file is required for local development.

### 5. Start all services

You need four processes running. Open four terminal tabs:

**Tab 1 — Rails API**
```bash
cd backend
bundle exec rails server -p 3000
```

**Tab 2 — Sidekiq worker**
```bash
cd backend
bundle exec sidekiq
```

**Tab 3 — Redis** (skip if already running as a service)
```bash
redis-server
```

**Tab 4 — React dev server**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5176](http://localhost:5176).

### 6. Verify background jobs

With Sidekiq running, `DeviceStatusPollerJob` runs every 30 seconds. Since the seeded devices use `127.0.0.1`–`127.0.0.15`, localhost addresses will respond and be marked `online`. To see real `degraded`/`offline` transitions, update a device's IP to an unreachable address:

```bash
cd backend
bundle exec rails console
Device.find_by(name: "Core Router 02").update!(ip_address: "192.0.2.1")
# Wait 30–60 seconds and watch the Device List update in real time
```

---

## Running Tests

```bash
cd backend
bundle exec rspec
```

42 examples covering:
- Model validations and associations (Device, User, Config, DeviceEvent)
- Controller auth and per-org RBAC (devices, configs, events, auth)
- Cross-tenant isolation (devices/channels scoped to the current org)
- ActionCable connection authentication + org-membership subscription checks
- Config schema validator
- DeviceStatusPollerJob logic

---

## Demo Accounts

Roles are per-organization, so the same login can have different access depending on the active org.

| Email | Password | Organizations (role) | Can do |
|---|---|---|---|
| admin@meraki.dev | password | Acme Corp (admin), Globex Industries (admin) | Everything — create/edit/delete devices, push configs; can switch between both orgs |
| engineer@meraki.dev | password | Acme Corp (network_engineer) | Push configs, view everything in Acme Corp |
| viewer@meraki.dev | password | Acme Corp (viewer) | Read-only access in Acme Corp |

> Tip: log in as `admin@meraki.dev` to see the org switcher in action — it's the only account that belongs to more than one organization.
