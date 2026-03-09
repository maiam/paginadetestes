import { createServer, type ServerResponse } from 'node:http';
import { env } from './env.js';
import { randomToken, sign, verifySigned } from './crypto.js';
import { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleUserInfo } from './google-oauth.js';
import { store } from './store.js';

const SESSION_COOKIE = 'app_session';
const OAUTH_STATE_COOKIE = 'oauth_state';

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

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function applyCors(res: ServerResponse, origin: string | undefined): void {
  const allowedOrigin = env.FRONTEND_BASE_URL;
  if (origin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) return;

    applyCors(res, req.headers.origin);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
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
        res.writeHead(302, { Location: `${env.FRONTEND_BASE_URL}/?authError=google_denied` });
        res.end();
        return;
      }

      const storedState = cookies[OAUTH_STATE_COOKIE] ? verifySigned(cookies[OAUTH_STATE_COOKIE]) : null;
      if (!code || !state || !storedState || state !== storedState) {
        res.writeHead(302, { Location: `${env.FRONTEND_BASE_URL}/?authError=invalid_state` });
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
        Location: `${env.FRONTEND_BASE_URL}/?auth=success`,
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

    json(res, 404, { error: 'Not Found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    json(res, 500, { error: message });
  }
});

server.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
