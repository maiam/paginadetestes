import type { ServerResponse } from 'node:http';
import { env } from './env.js';

const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set(
  env.NODE_ENV === 'production' ? [env.FRONTEND_URL] : [env.FRONTEND_URL, ...localOrigins],
);

export function applyCors(res: ServerResponse, origin: string | undefined): void {
  if (!origin || !allowedOrigins.has(origin)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}
