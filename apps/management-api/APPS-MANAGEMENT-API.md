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

### Authentication

- `POST /api/v2/auth/login` - Admin login
- `POST /api/v2/auth/logout` - Admin logout
- `GET /api/v2/auth/me` - Get current admin user

### Admin Account

- `GET /api/v2/admin-account/:id` - Get admin account by ID

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
