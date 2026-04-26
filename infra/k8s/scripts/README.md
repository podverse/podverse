# `infra/k8s/scripts`

Utility shell scripts for Kubernetes and local workflows (SOPS secret generation, port-forwards, and helpers).

**Layout:**

| Subdirectory or file     | Role                                                     |
| ------------------------ | -------------------------------------------------------- |
| **`secret-generators/`** | SOPS-encrypted `create_*` and bulk runners               |
| **`db/`**                | `db-connect.sh` — port-forward to Postgres + `psql`      |
| **`mq/`**                | `mq-connect.sh` — port-forward to the message queue      |
| **`keyvaldb/`**          | `keyvaldb-gui-connect.sh` — port-forward to RedisInsight |
| **`list_images.sh`**     | List image references (see script)                       |

## Secret generators

SOPS secret generation scripts are in **`secret-generators/`**. See [INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md](secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md).

## Database connection (`db-connect.sh`)

### Overview

The `db-connect.sh` script provides an easy way to connect to the PostgreSQL database running in your k3s cluster. It automatically:

1. Extracts credentials from the encrypted Kubernetes secret
2. Sets up a port-forward to the database service
3. Connects you to the database using `psql`
4. Cleans up the port-forward when you exit

### Prerequisites

- Access to the k3s cluster (KUBECONFIG must be set)
- SOPS encryption keys configured (to decrypt secrets)
- Run `nix develop` to ensure all tools are available (kubectl, sops, psql)

### Usage

#### Connect to alpha environment (default)

```bash
bash ./infra/k8s/scripts/db/db-connect.sh
```

### Connect to a specific environment

```bash
bash ./infra/k8s/scripts/db/db-connect.sh sandbox
```

### Use a different local port

```bash
bash ./infra/k8s/scripts/db/db-connect.sh alpha 5433
```

### What it does

1. **Checks dependencies**: Verifies kubectl, sops, and psql are installed
2. **Extracts credentials**: Decrypts the secret file and extracts:
   - `DB_APP_NAME`
   - `DB_APP_ADMIN_USER`
   - `DB_APP_ADMIN_PASSWORD`
3. **Port-forward**: Creates a tunnel from localhost to the database service
4. **Connects**: Launches psql with the credentials
5. **Cleanup**: Automatically stops the port-forward when you exit

### Exiting

To exit the database connection:

- Press `Ctrl+D`
- Type `\q` and press Enter

The port-forward will be automatically cleaned up.

### Troubleshooting

#### "Port already in use"

The script will attempt to kill any existing port-forward on the specified port. If issues persist, manually find and kill the process:

```bash
lsof -i :5432
kill <PID>
```

#### "Failed to extract credentials"

Ensure your SOPS keys are properly configured and you have access to decrypt the secrets:

```bash
sops -d ./secrets/podverse-alpha-db-opaque.enc.yaml
```

#### "psql is not installed"

Enter the Nix development environment which includes PostgreSQL client:

```bash
nix develop
```

## RedisInsight GUI (`keyvaldb-gui-connect.sh`)

Use `keyvaldb-gui-connect.sh` to reach the RedisInsight dashboard that ships alongside Valkey. The script:

1. Decrypts the Valkey secret to expose `VALKEY_PASSWORD`.
2. Creates a port-forward from `localhost` to the `podverse-keyvaldb-gui` service.
3. Prints the local URL and password so you can log into RedisInsight.

### Default usage

```bash
bash ./infra/k8s/scripts/keyvaldb/keyvaldb-gui-connect.sh
```

### Connect to another environment or port

```bash
bash ./infra/k8s/scripts/keyvaldb/keyvaldb-gui-connect.sh sandbox 9001
```

Once the script is running open `http://localhost:<PORT>` in your browser. You can use the displayed password when the dashboard asks for the Valkey credentials. Ctrl+C stops the port-forward and exits the script.

## ENV to YAML conversion

Use `env-to-yaml.sh` at the monorepo root to convert `.env`-style files into YAML-style key/value pairs and print a ConfigMap header.
The script appends a Vim modeline so editors detect YAML when reading stdin.

### Convert an env file

```bash
./scripts/env-to-yaml.sh apps/api/.env.example
```

### Pipe into an editor

```bash
./scripts/env-to-yaml.sh apps/api/.env.example | nvim -
```

## `list_images.sh`

Lists image references (see script header for usage). Run from the monorepo root, for example:

```bash
bash ./infra/k8s/scripts/list_images.sh
```
