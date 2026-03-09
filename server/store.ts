import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { decrypt, encrypt, randomToken } from './crypto.js';

type TokenBundle = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
};

type UserRecord = {
  provider: 'google';
  sub: string;
  name: string;
  email: string;
  picture?: string;
  tokenEncrypted: string;
  createdAt: string;
  updatedAt: string;
};

type SessionRecord = {
  sessionId: string;
  userSub: string;
  createdAt: number;
  expiresAt: number;
};

type DbFile = {
  users: Record<string, UserRecord>;
  sessions: Record<string, SessionRecord>;
};

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'auth-store.json');
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;

function loadDb(): DbFile {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    const seed: DbFile = { users: {}, sessions: {} };
    writeFileSync(dbPath, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }

  const raw = readFileSync(dbPath, 'utf8');
  return JSON.parse(raw) as DbFile;
}

function saveDb(db: DbFile): void {
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export const store = {
  upsertGoogleUser(profile: { sub: string; name: string; email: string; picture?: string }, tokens: TokenBundle): UserRecord {
    const db = loadDb();
    const now = new Date().toISOString();
    const existing = db.users[profile.sub];

    db.users[profile.sub] = {
      provider: 'google',
      sub: profile.sub,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
      tokenEncrypted: encrypt(JSON.stringify(tokens)),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    saveDb(db);
    return db.users[profile.sub];
  },

  createSession(userSub: string): SessionRecord {
    const db = loadDb();
    const sessionId = randomToken(32);
    const now = Date.now();
    const session: SessionRecord = {
      sessionId,
      userSub,
      createdAt: now,
      expiresAt: now + sessionTtlMs,
    };

    db.sessions[sessionId] = session;
    saveDb(db);
    return session;
  },

  getSession(sessionId: string): SessionRecord | null {
    const db = loadDb();
    const session = db.sessions[sessionId];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete db.sessions[sessionId];
      saveDb(db);
      return null;
    }
    return session;
  },

  deleteSession(sessionId: string): void {
    const db = loadDb();
    delete db.sessions[sessionId];
    saveDb(db);
  },

  getUserBySub(sub: string): (UserRecord & { tokens: TokenBundle }) | null {
    const db = loadDb();
    const user = db.users[sub];
    if (!user) return null;

    const tokens = JSON.parse(decrypt(user.tokenEncrypted)) as TokenBundle;
    return { ...user, tokens };
  },
};
