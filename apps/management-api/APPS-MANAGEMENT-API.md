# @podverse/management-api

Administrative API for Podverse management system.

## Overview

The Podverse Management API provides backend services for the internal management system, handling admin account authentication and management-specific operations.

## Quick Start

### Prerequisites

- Node.js v24+
- PostgreSQL (management database)

### Setup

1. Install dependencies from the monorepo root:

```bash
npm install
```

2. Copy the environment example file:

```bash
cp .env.example .env
```

3. Configure your `.env` file. See [ENV.md](ENV.md) for detailed documentation.

**Important**: The `AUTH_JWT_SECRET` must be a valid UUID:

```bash
# Generate a UUID
uuidgen
```

4. Build the packages (from monorepo root):

```bash
npm run build:packages
```

### Running

Development mode:

```bash
npm run dev:management-api
```

Development mode with hot reload:

```bash
npm run dev:watch -w apps/management-api
```

Build for production:

```bash
npm run build:prod -w apps/management-api
```

## API Endpoints

All routers are mounted with the `${config.api.prefix}${config.api.version}/<resource>` pattern (matches `apps/api`). Handlers use relative paths.

### Authentication

- `POST /api/v2/auth/login` - Admin login
- `POST /api/v2/auth/logout` - Admin logout
- `GET /api/v2/auth/me` - Get current admin user

### Admins

- `GET /api/v2/admins` - List admin accounts
- `POST /api/v2/admins` - Create admin account
- `GET /api/v2/admins/:id` - Get admin account by ID
- `PATCH /api/v2/admins/:id` - Update admin account
- `DELETE /api/v2/admins/:id` - Delete admin account
- `POST /api/v2/admins/:id/invite-link` - Issue invite link for admin
- `POST /api/v2/admins/invite-link/redeem` - Public token-redeem endpoint (sets password)

### Users

- `GET /api/v2/users` - List users
- `POST /api/v2/users` - Create user
- `GET /api/v2/users/:id` - Get user by ID
- `PATCH /api/v2/users/:id` - Update user
- `DELETE /api/v2/users/:id` - Delete user
- `POST /api/v2/users/:id/password` - Set/change a user's password

### Feeds

- `GET /api/v2/feeds` - List feeds
- `GET /api/v2/feeds/options` - Filter and policy state options
- `GET /api/v2/feeds/lookup` - Lookup feed by URL
- `PATCH /api/v2/feeds/:id/policy-state` - Update a feed's policy state

### Products

- `GET /api/v2/products/membership` - Resolved product membership settings
- `PATCH /api/v2/products/membership` - Update product membership settings (superuser)
- `GET /api/v2/products/pricing/active` - List active pricing rows
- `POST /api/v2/products/pricing/schedule` - Schedule a pricing change
- `POST /api/v2/products/pricing/:id/activate` - Activate a pricing row
- `POST /api/v2/products/pricing/:id/deprecate` - Deprecate a pricing row

### Stats

- `GET /api/v2/stats/:entityType/top` - Top entities by range
- `GET /api/v2/stats/:entityType/search` - Search entities by title
- `GET /api/v2/stats/:entityType/:id` - Get a single stats record

### Workers

- `GET /api/v2/workers/commands` - List worker command catalog (superuser)

### Storage

- `GET /api/v2/storage` - Bucket storage status
- `GET /api/v2/storage/objects` - List objects
- `GET /api/v2/storage/objects/count` - Count objects under a prefix
- `GET /api/v2/storage/objects/metadata` - Object metadata
- `GET /api/v2/storage/objects/download` - Download object
- `DELETE /api/v2/storage/objects` - Delete a single object
- `POST /api/v2/storage/objects/bulk-delete` - Delete a list of objects
- `POST /api/v2/storage/objects/delete-all-by-prefix` - Delete all objects under a prefix

### Database (allowlisted tables)

- `GET /api/v2/database/tables` - List allowlisted tables
- `GET /api/v2/database/:table/meta` - Table metadata
- `POST /api/v2/database/:table/query` - Query rows
- `GET /api/v2/database/:table/:id` - Get a row
- `POST /api/v2/database/:table` - Create a row
- `PATCH /api/v2/database/:table/:id` - Update a row
- `DELETE /api/v2/database/:table/:id` - Delete a row

## Database

The management system uses its own PostgreSQL database (separate from the main Podverse database) with tables for admin accounts and credentials.

Default port: `5999`

## Environment Configuration

See [ENV.md](ENV.md) for complete documentation of all environment variables.

Key configuration:

- `API_PORT` - Default: 3100
- `AUTH_JWT_SECRET` - Must be a valid UUID
- Database connection settings

## License

AGPLv3
