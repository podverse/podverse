# Docker Fixes Master Plan

## Overview

This plan coordinates fixes for three Docker-related issues preventing containers from running correctly:

1. Management-Web server.js path issue
2. Management-API database connection issue
3. Web app CSS 404 errors

## Plans

These plans can be executed in parallel as they fix independent issues:

1. **[01-fix-management-web-serverjs-path.md](01-fix-management-web-serverjs-path.md)** - Fixes `management-web` container startup error
2. **[02-fix-management-api-database-connection.md](02-fix-management-api-database-connection.md)** - Fixes `management-api` database connection error
3. **[03-fix-web-app-css-404-errors.md](03-fix-web-app-css-404-errors.md)** - Fixes CSS file 404 errors in web app

## Execution Order

All three plans can be executed in parallel as they address separate issues:

- Plan 01: Management-Web Dockerfile fix
- Plan 02: Management-API environment configuration fix
- Plan 03: Web app Dockerfile static files fix

## Testing

After implementing all fixes:

1. Rebuild all Docker images: `make local_rebuild_all_apps`
2. Start all containers: `make local_test_all_apps`
3. Verify:
   - Web app loads with CSS at `http://localhost:3000`
   - Management-Web starts successfully
   - Management-API connects to database and starts successfully
