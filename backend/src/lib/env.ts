import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type AppEnv = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  FRONTEND_URL: string;
  APP_BASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REDIRECT_URI: string;
  SESSION_SECRET: string;
  GOOGLE_OAUTH_SCOPES: string;
};

function loadDotEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['\"]|['\"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

loadDotEnvFile();

const appBaseUrl = normalizeUrl(process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8787}`);
const frontendUrl = normalizeUrl(process.env.FRONTEND_URL ?? process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173');

export const env: AppEnv = {
  NODE_ENV: (process.env.NODE_ENV as AppEnv['NODE_ENV']) ?? 'development',
  PORT: Number(process.env.PORT ?? 8787),
  FRONTEND_URL: frontendUrl,
  APP_BASE_URL: appBaseUrl,
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),
  GOOGLE_OAUTH_REDIRECT_URI:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${appBaseUrl}/api/auth/google/callback`,
  SESSION_SECRET: required('SESSION_SECRET'),
  GOOGLE_OAUTH_SCOPES:
    process.env.GOOGLE_OAUTH_SCOPES ??
    'openid profile email https://www.googleapis.com/auth/calendar',
};
