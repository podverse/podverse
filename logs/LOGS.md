# Log Directory

This directory is the recommended location for log files in local development. Log files are automatically gitignored and will be created here when `LOG_DIR` is configured.

## Overview

The `LOG_DIR` environment variable controls whether applications write logs to files in addition to console output. This provides flexibility for different environments:

- **Localhost Development**: `LOG_DIR` can be empty (console logging only)
- **Production/Alpha**: `LOG_DIR` should be set to a path (e.g., `/app/logs`) with Docker volume mounts

## How LOG_DIR Works

### When LOG_DIR is Empty or Unset

- **Console logging only** - All logs appear in the terminal/console
- **No file logging** - No log files are created
- **Recommended for localhost** - Keeps development simple and avoids cluttering the filesystem

### When LOG_DIR is Set

- **Console + File logging** - Logs appear in both terminal and files
- **File logging enabled** - Logs are written to files with daily rotation
- **Required for production** - Ensures logs persist outside container lifecycle

## Local Development

### Recommended Setup

For local development, you have two options:

1. **Console only (recommended)**
   ```bash
   # In your .env file, leave LOG_DIR empty or unset
   LOG_DIR=
   ```

2. **Console + file logging**
   ```bash
   # In your .env file, set LOG_DIR to this directory
   LOG_DIR=./logs
   # or
   LOG_DIR=logs
   ```

When `LOG_DIR` is set to `./logs` or `logs`, log files will appear in this directory.

### Log File Organization

When file logging is enabled, logs are organized as follows:

#### API App (`apps/api/`)
- **File**: `app-YYYY-MM-DD.log`
- **Format**: JSON (structured logs)
- **Location**: `logs/app-YYYY-MM-DD.log`

#### Workers App (`apps/workers/`)
- **Files**: Various loggers create separate files
  - `parser-YYYY-MM-DD.log` - Feed parsing operations
  - Other loggers may create additional files based on their `filename` parameter
- **Format**: JSON (structured logs)
- **Location**: `logs/{filename}-YYYY-MM-DD.log`

#### Management API (`apps/management-api/`)
- Currently uses console logging only (no file logging support)

## Production/Alpha Environments

### Configuration

For production and alpha environments:

1. **Set LOG_DIR environment variable**
   ```bash
   LOG_DIR=/app/logs
   ```

2. **Mount external volume** (Docker)
   ```yaml
   volumes:
     - /var/log/podverse:/app/logs
   ```

3. **Ensure directory exists** on the host before container starts

### Benefits

- **Log persistence** - Logs survive container restarts
- **External access** - Logs accessible from host system
- **Centralized logging** - Can be collected by log aggregation tools
- **Debugging** - Historical logs available for troubleshooting

## Log Rotation

All file logging uses **daily rotation** with the following settings:

- **Rotation**: Daily (new file each day)
- **Max file size**: 20MB per file
- **Retention**: 14 days
- **Compression**: Old files are automatically compressed (`.gz`)
- **Date pattern**: `YYYY-MM-DD` (e.g., `app-2026-01-27.log`)

### Example Log Files

```
logs/
  app-2026-01-25.log.gz          # Compressed, older than 14 days (will be deleted)
  app-2026-01-26.log             # Current day
  app-2026-01-27.log             # Today
  parser-2026-01-26.log
  parser-2026-01-27.log
```

## Configuration Examples

### .env File (Local Development)

```bash
# Console only (recommended for localhost)
LOG_DIR=

# Or enable file logging
LOG_DIR=./logs
LOG_LEVEL=info
```

### Docker Compose (Production)

```yaml
services:
  api:
    environment:
      - LOG_DIR=/app/logs
    volumes:
      - ./logs:/app/logs
```

### Environment Variable (Deployment)

```bash
export LOG_DIR=/app/logs
```

## Log Formats

### Console Logs

Console logs use a **formatted, human-readable** format:
```
2026-01-27T10:30:45.123Z [info]: Application started
2026-01-27T10:30:45.456Z [error]: Database connection failed
```

### File Logs

File logs use **JSON format** for structured logging:
```json
{"level":"info","message":"Application started","timestamp":"2026-01-27T10:30:45.123Z"}
{"level":"error","message":"Database connection failed","timestamp":"2026-01-27T10:30:45.456Z"}
```

JSON format enables:
- Easy parsing by log aggregation tools
- Structured search and filtering
- Integration with log analysis platforms

## Troubleshooting

### Logs Not Appearing

1. **Check LOG_DIR is set correctly**
   ```bash
   echo $LOG_DIR
   ```

2. **Verify directory exists and is writable**
   ```bash
   mkdir -p logs
   touch logs/test.log && rm logs/test.log
   ```

3. **Check application logs** for file creation errors

### Logs Appearing in Wrong Location

- Verify `LOG_DIR` path is absolute or relative to the application's working directory
- For Docker, ensure the path matches the volume mount point

### Log Rotation Not Working

- Check disk space (rotation may fail if disk is full)
- Verify file permissions (application needs write access)
- Check application logs for rotation errors

### Finding Logs

- **Local development**: Check `./logs/` directory in monorepo root
- **Docker**: Check mounted volume location on host
- **Production**: Check path specified in `LOG_DIR` environment variable

## Best Practices

1. **Local Development**: Leave `LOG_DIR` empty for simplicity
2. **Production**: Always set `LOG_DIR` and mount external volumes
3. **Log Monitoring**: Use log aggregation tools (e.g., ELK, Loki) for production
4. **Log Retention**: Adjust retention period based on storage capacity
5. **Security**: Ensure log directories have appropriate permissions

## Related Documentation

- [Workers App Environment Variables](../apps/workers/ENV.md) - Workers-specific LOG_DIR details
- [API App .env.example](../apps/api/.env.example) - API configuration examples
- [Helpers LoggerService](../packages/helpers/src/lib/backend/logger.ts) - LoggerService implementation

## Notes

- Log files are **gitignored** - they will not be committed to the repository
- The `logs/` directory structure is tracked (via `.gitkeep`) but log files are not
- Console logs **always appear** regardless of `LOG_DIR` setting
- File logging is **optional** and only enabled when `LOG_DIR` is set and non-empty
