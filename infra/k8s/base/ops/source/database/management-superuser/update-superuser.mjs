#!/usr/bin/env node
/* eslint-disable no-console */

import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import pg from 'pg';
import { createInterface } from 'readline';

const { Client } = pg;
const DEFAULT_USERNAME = 'superuser';
const DEFAULT_PASSWORD = 'Test!1Aa';

function printHelp() {
  console.log(`Update Podverse management superuser.

Usage:
  node update-superuser.mjs
  node update-superuser.mjs --prompt
  node update-superuser.mjs -u <username>
  node update-superuser.mjs -p <password>
  node update-superuser.mjs -u <username> -p <password>
  node update-superuser.mjs --random-password
  node update-superuser.mjs -u <username> --random-password
`);
}

function parseArgs(argv) {
  const options = {
    prompt: false,
    randomPassword: false,
    username: '',
    password: '',
    usernameProvided: false,
    passwordProvided: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--prompt') {
      options.prompt = true;
      continue;
    }
    if (arg === '--random-password') {
      options.randomPassword = true;
      continue;
    }
    if (arg === '-u' || arg === '--username') {
      options.username = argv[index + 1] || '';
      options.usernameProvided = true;
      index += 1;
      continue;
    }
    if (arg === '-p' || arg === '--password') {
      options.password = argv[index + 1] || '';
      options.passwordProvided = true;
      index += 1;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.prompt && options.randomPassword) {
    throw new Error('Cannot combine --prompt with --random-password.');
  }

  return options;
}

function readLine(question) {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

function generateRandomPassword() {
  return randomBytes(24)
    .toString('base64')
    .replace(/[/+=]/g, (char) => {
      if (char === '/') return '_';
      if (char === '+') return '-';
      return '';
    });
}

function usernameToEmail(username) {
  const trimmed = username.trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@example.com`;
}

async function resolveDesiredValues(options) {
  if (options.prompt) {
    if (process.stdin.isTTY !== true) {
      throw new Error('Cannot use --prompt in non-interactive mode.');
    }
    const promptedUsername = await readLine(`Username [${DEFAULT_USERNAME}]: `);
    const promptedPassword = await readLine(`Password [${DEFAULT_PASSWORD}]: `);
    return {
      username: promptedUsername || DEFAULT_USERNAME,
      password: promptedPassword || DEFAULT_PASSWORD,
      setUsername: true,
      setPassword: true,
      passwordWasGenerated: false,
    };
  }

  const hasManualInputs = options.usernameProvided || options.passwordProvided;
  if (options.randomPassword) {
    return {
      username: options.usernameProvided ? options.username : DEFAULT_USERNAME,
      password: generateRandomPassword(),
      setUsername: true,
      setPassword: true,
      passwordWasGenerated: true,
    };
  }

  if (hasManualInputs) {
    return {
      username: options.username,
      password: options.password,
      setUsername: options.usernameProvided,
      setPassword: options.passwordProvided,
      passwordWasGenerated: false,
    };
  }

  return {
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    setUsername: true,
    setPassword: true,
    passwordWasGenerated: false,
  };
}

function getDbConfig() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database =
    process.env.DB_MANAGEMENT_NAME || process.env.DB_APP_NAME || 'podverse_management';
  const user =
    process.env.DB_USER ||
    process.env.DB_MANAGEMENT_READ_WRITE_USER ||
    process.env.DB_MANAGEMENT_OWNER_USER ||
    process.env.DB_MANAGEMENT_MIGRATOR_USER ||
    process.env.DB_APP_OWNER_USER ||
    '';
  const password =
    process.env.DB_PASSWORD ||
    process.env.DB_MANAGEMENT_READ_WRITE_PASSWORD ||
    process.env.DB_MANAGEMENT_OWNER_PASSWORD ||
    process.env.DB_MANAGEMENT_MIGRATOR_PASSWORD ||
    process.env.DB_APP_OWNER_PASSWORD ||
    '';

  if (!user || !password) {
    throw new Error(
      'Missing DB credentials. Set DB_USER/DB_PASSWORD or management read-write DB credentials.'
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
  };
}

function generateRandomIdText() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let index = 0; index < 15; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function updateSuperuser() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const desired = await resolveDesiredValues(options);
    const dbConfig = getDbConfig();

    const client = new Client(dbConfig);
    await client.connect();

    try {
      const existing = await client.query(
        `SELECT aa.id, aac.email
         FROM admin_account aa
         JOIN admin_account_credentials aac ON aac.admin_account_id = aa.id
         WHERE aa.admin_account_role_id = 1
         ORDER BY aa.id ASC
         LIMIT 1`
      );

      const newEmail = desired.setUsername ? usernameToEmail(desired.username) : '';
      const newPasswordHash = desired.setPassword ? await bcrypt.hash(desired.password, 10) : '';

      if (existing.rows.length === 0) {
        const idText = generateRandomIdText();
        const createEmail = desired.setUsername ? newEmail : usernameToEmail(DEFAULT_USERNAME);
        const createPassword = desired.setPassword
          ? newPasswordHash
          : await bcrypt.hash(DEFAULT_PASSWORD, 10);

        await client.query('BEGIN');
        try {
          const accountResult = await client.query(
            'INSERT INTO admin_account (id_text, admin_account_role_id) VALUES ($1, $2) RETURNING id',
            [idText, 1]
          );
          const adminAccountId = accountResult.rows[0].id;

          await client.query(
            'INSERT INTO admin_account_credentials (admin_account_id, email, password) VALUES ($1, $2, $3)',
            [adminAccountId, createEmail, createPassword]
          );

          await client.query('COMMIT');
          console.log('No existing superuser found. Created new superuser.');
          console.log(
            `Username: ${createEmail.includes('@') ? createEmail.split('@')[0] : createEmail}`
          );
          console.log(`Stored email/login: ${createEmail}`);
          if (desired.passwordWasGenerated) {
            console.log(`Generated password: ${desired.password}`);
          } else if (desired.setPassword || (!desired.setUsername && !desired.setPassword)) {
            console.log(`Password: ${desired.setPassword ? desired.password : DEFAULT_PASSWORD}`);
          }
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
        return;
      }

      const adminAccountId = existing.rows[0].id;
      const currentEmail = existing.rows[0].email;

      if (!desired.setUsername && !desired.setPassword) {
        console.log('No update options provided; nothing to change.');
        return;
      }

      await client.query('BEGIN');
      try {
        if (desired.setUsername) {
          await client.query(
            'UPDATE admin_account_credentials SET email = $1 WHERE admin_account_id = $2',
            [newEmail, adminAccountId]
          );
        }

        if (desired.setPassword) {
          await client.query(
            'UPDATE admin_account_credentials SET password = $1 WHERE admin_account_id = $2',
            [newPasswordHash, adminAccountId]
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      console.log('Superuser updated successfully.');
      console.log(`Admin account id: ${adminAccountId}`);
      console.log(`Old email/login: ${currentEmail}`);
      console.log(`New email/login: ${desired.setUsername ? newEmail : currentEmail}`);
      if (desired.setPassword) {
        if (desired.passwordWasGenerated) {
          console.log(`Generated password: ${desired.password}`);
        } else {
          console.log(`Password: ${desired.password}`);
        }
      }
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error(`ERROR updating superuser: ${error.message}`);
    process.exit(1);
  }
}

updateSuperuser();
