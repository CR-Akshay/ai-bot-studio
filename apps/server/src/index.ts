import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { z } from 'zod';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const dbPath = process.env.DB_PATH ?? './data/ai-bot-studio.db';
const jwtSecret = process.env.JWT_SECRET ?? 'local-dev-secret';

const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(express.json());

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const botSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  model: z.string().default('gpt-4o-mini'),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini']).default('openai')
});

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  botIds: z.array(z.number()).default([])
});

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve((row ?? undefined) as T | undefined);
      }
    });
  });
}

function signToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn: '7d' });
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }

  try {
    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, jwtSecret) as { userId: number; email: string };
    (req as express.Request & { user?: { userId: number; email: string } }).user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      model TEXT,
      prompt TEXT NOT NULL,
      systemPrompt TEXT,
      provider TEXT DEFAULT 'openai',
      settings TEXT DEFAULT '{}',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS project_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      botId INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(projectId, botId),
      FOREIGN KEY (projectId) REFERENCES projects(id),
      FOREIGN KEY (botId) REFERENCES bots(id)
    );
  `);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'AI Bot Studio', time: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
      return;
    }

    const { email, password } = parsed.data;
    const existing = await get<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await new Promise<{ id: number }>((resolve, reject) => {
      db.run('INSERT INTO users (email, passwordHash) VALUES (?, ?)', [email, passwordHash], function (error) {
        if (error) reject(error);
        else resolve({ id: Number(this.lastID) });
      });
    });

    const token = signToken(result.id, email);
    res.status(201).json({ token, user: { id: result.id, email } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
      return;
    }

    const { email, password } = parsed.data;
    const user = await get<{ id: number; email: string; passwordHash: string }>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/bots', authMiddleware, async (_req, res) => {
  const user = (_req as express.Request & { user?: { userId: number } }).user;
  const rows = await all<{ id: number; name: string; description: string | null; model: string | null; prompt: string; systemPrompt: string | null; provider: string | null }>(
    'SELECT * FROM bots WHERE userId = ? ORDER BY createdAt DESC',
    [user?.userId]
  );
  res.json({ bots: rows });
});

app.post('/api/bots', authMiddleware, async (req, res) => {
  const user = (req as express.Request & { user?: { userId: number } }).user;
  const parsed = botSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid bot payload' });
    return;
  }

  const { name, description, model, prompt, systemPrompt, provider } = parsed.data;
  await run(
    'INSERT INTO bots (userId, name, description, model, prompt, systemPrompt, provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user?.userId, name, description ?? '', model ?? 'gpt-4o-mini', prompt, systemPrompt ?? '', provider]
  );

  const bots = await all<any>('SELECT * FROM bots WHERE userId = ? ORDER BY createdAt DESC', [user?.userId]);
  res.status(201).json({ bot: bots[0] });
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  const user = (req as express.Request & { user?: { userId: number } }).user;
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid project payload' });
    return;
  }

  const { name, description, botIds } = parsed.data;

  const projectInsert = await new Promise<{ id: number }>((resolve, reject) => {
    db.run('INSERT INTO projects (userId, name, description) VALUES (?, ?, ?)', [user?.userId, name, description ?? ''], function (error) {
      if (error) reject(error);
      else resolve({ id: Number(this.lastID) });
    });
  });

  for (const botId of botIds) {
    await run('INSERT INTO project_bots (projectId, botId) VALUES (?, ?)', [projectInsert.id, botId]);
  }

  const project = await get<any>('SELECT * FROM projects WHERE id = ?', [projectInsert.id]);
  const linkedBots = await all<any>(
    `SELECT b.* FROM project_bots pb JOIN bots b ON b.id = pb.botId WHERE pb.projectId = ?`,
    [projectInsert.id]
  );

  res.status(201).json({ project: { ...project, bots: linkedBots } });
});

app.get('/api/projects', authMiddleware, async (req, res) => {
  const user = (req as express.Request & { user?: { userId: number } }).user;
  const projects = await all<any>('SELECT * FROM projects WHERE userId = ? ORDER BY createdAt DESC', [user?.userId]);

  const mappedProjects = await Promise.all(
    projects.map(async (project) => {
      const bots = await all<any>(
        `SELECT b.* FROM project_bots pb JOIN bots b ON b.id = pb.botId WHERE pb.projectId = ?`,
        [project.id]
      );
      return { ...project, bots };
    })
  );

  res.json({ projects: mappedProjects });
});

app.get('/api/providers', (_req, res) => {
  res.json({
    providers: [
      { id: 'openai', name: 'OpenAI', enabled: true },
      { id: 'anthropic', name: 'Anthropic', enabled: true },
      { id: 'gemini', name: 'Gemini', enabled: true }
    ]
  });
});

app.listen(port, async () => {
  await initDb();
  console.log(`Server running on http://localhost:${port}`);
});
