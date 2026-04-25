#!/usr/bin/env node
/* eslint-disable no-console */

import { randomBytes } from 'crypto';
import { createInterface } from 'readline';

import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;
const DEFAULT_USERNAME = 'superuser';
const DEFAULT_PASSWORD = 'Test!1Aa';

function printHelp() {
  console.log(`Create Podverse management superuser.

Usage:
  node create-superuser.mjs
  node create-superuser.mjs --prompt
  node create-superuser.mjs -u <username> -p <password>
  node create-superuser.mjs -u <username> --random-password
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

async function resolveCredentials(options) {
  if (options.prompt) {
    if (process.stdin.isTTY !== true) {
      throw new Error('Cannot use --prompt in non-interactive mode.');
    }
    const promptedUsername = await readLine(`Username [${DEFAULT_USERNAME}]: `);
    const promptedPassword = await readLine(`Password [${DEFAULT_PASSWORD}]: `);
    return {
      username: promptedUsername || DEFAULT_USERNAME,
      password: promptedPassword || DEFAULT_PASSWORD,
      passwordWasGenerated: false,
    };
  }

  const hasManualInputs = options.usernameProvided || options.passwordProvided;
  if (options.randomPassword) {
    return {
      username: options.usernameProvided ? options.username : DEFAULT_USERNAME,
      password: generateRandomPassword(),
      passwordWasGenerated: true,
    };
  }

  if (hasManualInputs) {
    return {
      username: options.usernameProvided ? options.username : DEFAULT_USERNAME,
      password: options.passwordProvided ? options.password : DEFAULT_PASSWORD,
      passwordWasGenerated: false,
    };
  }

  return {
    username: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
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
    process.env.DB_MANAGEMENT_ADMIN_USER ||
    process.env.DB_APP_ADMIN_USER ||
    '';
  const password =
    process.env.DB_PASSWORD ||
    process.env.DB_MANAGEMENT_READ_WRITE_PASSWORD ||
    process.env.DB_MANAGEMENT_ADMIN_PASSWORD ||
    process.env.DB_APP_ADMIN_PASSWORD ||
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

async function createSuperuser() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const credentials = await resolveCredentials(options);
    const email = usernameToEmail(credentials.username);
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

      if (existing.rows.length > 0) {
        console.error(
          `Superuser already exists (admin_account_id: ${existing.rows[0].id}, email: ${existing.rows[0].email}). Use update-superuser.mjs instead.`
        );
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(credentials.password, 10);
      const idText = generateRandomIdText();

      await client.query('BEGIN');
      try {
        const accountResult = await client.query(
          'INSERT INTO admin_account (id_text, admin_account_role_id) VALUES ($1, $2) RETURNING id',
          [idText, 1]
        );
        const adminAccountId = accountResult.rows[0].id;

        await client.query(
          'INSERT INTO admin_account_credentials (admin_account_id, email, password) VALUES ($1, $2, $3)',
          [adminAccountId, email, hashedPassword]
        );

        await client.query('COMMIT');

        console.log('Superuser created successfully.');
        console.log(`Username: ${credentials.username}`);
        console.log(`Stored email/login: ${email}`);
        console.log(`Admin account id: ${adminAccountId}`);
        if (credentials.passwordWasGenerated) {
          console.log(`Generated password: ${credentials.password}`);
        } else {
          console.log(`Password: ${credentials.password}`);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error(`ERROR creating superuser: ${error.message}`);
    process.exit(1);
  }
}

createSuperuser();
