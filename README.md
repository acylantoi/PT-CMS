# PT-CMS — Public Trustee Conveyancing Management System

A central, collaborative internal system for officers in the Public Trustee conveyancing section to log, update, and retrieve land transfer records for estates of deceased persons.

## Tech Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React 18
- **Auth**: JWT with RBAC (Admin, Officer, Clerk, Auditor)
- **File Storage**: Local filesystem (configurable)

## Prerequisites

- **Node.js** v18+ and npm
- **PostgreSQL** 14+
- A modern web browser

## Quick Start

### 1. Create PostgreSQL Database

```bash
createdb pt_cms
# Or via psql:
# psql -c "CREATE DATABASE pt_cms;"
```

### 2. Configure Environment

```bash
# Copy and edit the server env file
cp server/.env.example server/.env
# Edit server/.env with your database credentials
```

### 3. Install Dependencies

```bash
# From project root
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 4. Run Database Migration & Seed

```bash
cd server
npm run db:migrate   # Creates all tables, types, indexes
npm run db:seed      # Creates default users
cd ..
```

### 5. Start Development

```bash
npm run dev
# Server runs on http://localhost:5000
# Client runs on http://localhost:3000
```

## Default Users

| Username | Password      | Role    |
|----------|---------------|---------|
| admin    | Admin@2026    | ADMIN   |
| mercy    | Officer@2026  | OFFICER |
| james    | Officer@2026  | OFFICER |
| anne     | Clerk@2026    | CLERK   |
| peter    | Auditor@2026  | AUDITOR |

## Project Structure

```
PT-CMS/
├── server/                    # Express API
│   ├── src/
│   │   ├── index.js          # Entry point
│   │   ├── db/
│   │   │   ├── connection.js # PostgreSQL pool
│   │   │   ├── migrate.js    # Schema migration
│   │   │   ├── seed.js       # Default data
│   │   │   └── reset.js      # Drop all tables
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT auth + RBAC
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── estateFile.routes.js
│   │   │   ├── beneficiary.routes.js
│   │   │   ├── asset.routes.js
│   │   │   ├── transfer.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── workflow.routes.js
│   │   │   ├── report.routes.js
│   │   │   ├── audit.routes.js
│   │   │   ├── import.routes.js
│   │   │   └── dashboard.routes.js
│   │   └── utils/
│   │       ├── audit.js       # Audit + workflow helpers
│   │       └── statusTransitions.js
│   └── .env
├── client/                    # React SPA
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── index.css         # Full CSS
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   └── Common.js
│   │   └── pages/
│   │       ├── Login.js
│   │       ├── Dashboard.js
│   │       ├── EstateFiles.js
│   │       ├── EstateFileDetail.js
│   │       ├── EstateFileForm.js
│   │       ├── AssetDetail.js
│   │       ├── Reports.js
│   │       ├── AdminUsers.js
│   │       ├── AuditLogs.js
│   │       └── ImportData.js
│   └── package.json
└── package.json               # Root scripts
```

## Features (Phase 1)

- ✅ Authentication with JWT, password policy, account lockout
- ✅ Role-based access control (RBAC)
- ✅ Estate file CRUD with full audit trail
- ✅ Beneficiary management per estate
- ✅ Asset (parcel) management with status tracking
- ✅ Transfer management with status pipeline
- ✅ Document upload and download
- ✅ Workflow events / activity timeline
- ✅ Global search and filtering
- ✅ Dashboard with stats and recent activity
- ✅ Reports with CSV and Excel export
- ✅ Audit logs viewer (Admin/Auditor)
- ✅ Historical data CSV import
- ✅ Soft delete (no hard deletes)
- ✅ Status transition validation
- ✅ Session timeout (30 minutes)

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Estate Files
- `GET /api/estate-files?search=&status=&county=&page=`
- `POST /api/estate-files`
- `GET /api/estate-files/:id`
- `PATCH /api/estate-files/:id`
- `DELETE /api/estate-files/:id` (soft delete)

### Beneficiaries
- `POST /api/beneficiaries/estate-files/:id/beneficiaries`
- `GET /api/beneficiaries/estate-files/:id/beneficiaries`
- `PATCH /api/beneficiaries/:id`
- `DELETE /api/beneficiaries/:id`

### Assets
- `POST /api/assets/estate-files/:id/assets`
- `GET /api/assets/estate-files/:id/assets`
- `GET /api/assets/:id`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id` (soft delete)

### Transfers
- `POST /api/transfers/assets/:id/transfers`
- `GET /api/transfers/assets/:id/transfers`
- `PATCH /api/transfers/:id`
- `GET /api/transfers`

### Documents
- `POST /api/documents/upload` (multipart)
- `GET /api/documents/:id/download`
- `GET /api/documents`

### Reports
- `GET /api/reports/transfers?from=&to=&format=csv|excel`
- `GET /api/reports/by-officer`
- `GET /api/reports/by-county`
- `GET /api/reports/summary`
- `GET /api/reports/parcel-transferee`

### Dashboard
- `GET /api/dashboard`

### Audit
- `GET /api/audit?entity_type=&actor_id=&from=&to=`

### Import
- `POST /api/import/csv`
- `GET /api/import/template`

## Database Reset

```bash
cd server
npm run db:reset     # Drops everything
npm run db:migrate   # Recreates
npm run db:seed      # Re-seeds users
```

## Production Deployment

```bash
# Build client
cd client && npm run build && cd ..

# Start server (serves React build)
NODE_ENV=production node server/src/index.js
```

## License

Internal use — Office of the Public Trustee.
