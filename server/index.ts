import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { env } from './env.js';
import { randomToken, sign, verifySigned } from './crypto.js';
import { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleUserInfo } from './google-oauth.js';
import { store } from './store.js';

const SESSION_COOKIE = 'app_session';
const OAUTH_STATE_COOKIE = 'oauth_state';
const distDir = path.resolve(process.cwd(), 'dist');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function parseCookies(rawCookie: string | undefined): Record<string, string> {
  if (!rawCookie) return {};
  return rawCookie.split(';').reduce<Record<string, string>>((acc, entry) => {
    const idx = entry.indexOf('=');
    if (idx === -1) return acc;
    acc[entry.slice(0, idx).trim()] = decodeURIComponent(entry.slice(idx + 1));
    return acc;
  }, {});
}

function setCookie(name: string, value: string, options: { maxAgeSeconds?: number; clear?: boolean } = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (env.NODE_ENV === 'production') parts.push('Secure');
  if (options.clear) parts.push('Max-Age=0');
  if (options.maxAgeSeconds) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  return parts.join('; ');
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function safeResolveStaticPath(requestPath: string): string | null {
  const normalized = requestPath === '/' ? '/index.html' : requestPath;
  const absolutePath = path.resolve(distDir, `.${normalized}`);
  if (!absolutePath.startsWith(distDir)) return null;
  if (!existsSync(absolutePath)) return null;
  if (!statSync(absolutePath).isFile()) return null;
  return absolutePath;
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) return;

    const requestUrl = new URL(req.url, env.APP_BASE_URL);
    const cookies = parseCookies(req.headers.cookie);

    if (requestUrl.pathname === '/api/auth/google/login' && req.method === 'GET') {
      const state = randomToken(24);
      res.writeHead(302, {
        Location: buildGoogleAuthUrl(state),
        'Set-Cookie': setCookie(OAUTH_STATE_COOKIE, sign(state), { maxAgeSeconds: 600 }),
      });
      res.end();
      return;
    }

    if (requestUrl.pathname === '/api/auth/google/callback' && req.method === 'GET') {
      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');
      const callbackError = requestUrl.searchParams.get('error');

      if (callbackError) {
        res.writeHead(302, { Location: '/?authError=google_denied' });
        res.end();
        return;
      }

      const storedState = cookies[OAUTH_STATE_COOKIE] ? verifySigned(cookies[OAUTH_STATE_COOKIE]) : null;
      if (!code || !state || !storedState || state !== storedState) {
        res.writeHead(302, { Location: '/?authError=invalid_state' });
        res.end();
        return;
      }

      const tokenResponse = await exchangeCodeForTokens(code);
      const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token);

      store.upsertGoogleUser(userInfo, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type,
      });

      const session = store.createSession(userInfo.sub);
      res.writeHead(302, {
        Location: '/?auth=success',
        'Set-Cookie': [
          setCookie(SESSION_COOKIE, sign(session.sessionId), { maxAgeSeconds: 60 * 60 * 24 * 7 }),
          setCookie(OAUTH_STATE_COOKIE, '', { clear: true }),
        ],
      });
      res.end();
      return;
    }

    if (requestUrl.pathname === '/api/auth/me' && req.method === 'GET') {
      const sessionId = cookies[SESSION_COOKIE] ? verifySigned(cookies[SESSION_COOKIE]) : null;
      if (!sessionId) return json(res, 200, { authenticated: false });

      const session = store.getSession(sessionId);
      if (!session) return json(res, 200, { authenticated: false });

      const user = store.getUserBySub(session.userSub);
      if (!user) return json(res, 200, { authenticated: false });

      return json(res, 200, {
        authenticated: true,
        user: {
          provider: user.provider,
          sub: user.sub,
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      });
    }

    if (requestUrl.pathname === '/api/auth/logout' && req.method === 'POST') {
      const sessionId = cookies[SESSION_COOKIE] ? verifySigned(cookies[SESSION_COOKIE]) : null;
      if (sessionId) store.deleteSession(sessionId);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookie(SESSION_COOKIE, '', { clear: true }),
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET') {
      const staticFile = safeResolveStaticPath(requestUrl.pathname);
      if (staticFile) {
        const ext = path.extname(staticFile).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
        res.end(readFileSync(staticFile));
        return;
      }

      const indexPath = path.join(distDir, 'index.html');
      if (existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(indexPath, 'utf8'));
        return;
      }
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

server.listen(env.PORT, () => {
  console.log(`Auth server listening on http://localhost:${env.PORT}`);
});
