const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(rootDir, 'uploads');
const exportsDir = path.join(rootDir, 'exports');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(exportsDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, 'ai-bot-studio.db');
const db = new sqlite3.Database(dbPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function normalizeBot(bot) {
  return {
    ...bot,
    settings: bot.settings ? JSON.parse(bot.settings) : {}
  };
}

function buildProjectResponse(project, bots = []) {
  return {
    ...project,
    bots: bots.map((bot) => normalizeBot(bot))
  };
}

async function initializeDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      model TEXT DEFAULT 'gpt-4o-mini',
      prompt TEXT NOT NULL,
      systemPrompt TEXT,
      settings TEXT DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS project_bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      botId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(projectId, botId),
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(botId) REFERENCES bots(id) ON DELETE CASCADE
    );
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS project_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use('/exports', express.static(exportsDir));
app.use(express.static(path.join(rootDir, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'AI Bot Studio', timestamp: new Date().toISOString() });
});

app.get('/api/bots', async (req, res) => {
  try {
    const bots = await dbAll('SELECT * FROM bots ORDER BY createdAt DESC');
    res.json({ bots: bots.map(normalizeBot) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bots', async (req, res) => {
  try {
    const { name, description = '', model = 'gpt-4o-mini', prompt, systemPrompt = '', settings = {} } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({ error: 'Bot name and prompt are required.' });
    }

    const result = await dbRun(
      `INSERT INTO bots (name, description, model, prompt, systemPrompt, settings) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, model, prompt, systemPrompt, JSON.stringify(settings)]
    );

    const bot = await dbGet('SELECT * FROM bots WHERE id = ?', [result.id]);
    res.status(201).json({ bot: normalizeBot(bot) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = '', model = 'gpt-4o-mini', prompt, systemPrompt = '', settings = {} } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({ error: 'Bot name and prompt are required.' });
    }

    await dbRun(
      `UPDATE bots SET name = ?, description = ?, model = ?, prompt = ?, systemPrompt = ?, settings = ? WHERE id = ?`,
      [name, description, model, prompt, systemPrompt, JSON.stringify(settings), id]
    );

    const bot = await dbGet('SELECT * FROM bots WHERE id = ?', [id]);
    res.json({ bot: normalizeBot(bot) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/bots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM bots WHERE id = ?', [id]);
    await dbRun('DELETE FROM project_bots WHERE botId = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await dbAll('SELECT * FROM projects ORDER BY createdAt DESC');
    const populatedProjects = [];

    for (const project of projects) {
      const rows = await dbAll(
        `SELECT b.* FROM project_bots pb
         JOIN bots b ON b.id = pb.botId
         WHERE pb.projectId = ? ORDER BY pb.createdAt DESC`,
        [project.id]
      );
      populatedProjects.push(buildProjectResponse(project, rows));
    }

    res.json({ projects: populatedProjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, description = '', bots = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const projectResult = await dbRun(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description]
    );

    const projectId = projectResult.id;

    if (Array.isArray(bots) && bots.length > 0) {
      const inserts = bots.map((botId) =>
        dbRun('INSERT INTO project_bots (projectId, botId) VALUES (?, ?)', [projectId, botId])
      );
      await Promise.all(inserts);
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    const linkedBots = await dbAll(
      `SELECT b.* FROM project_bots pb
       JOIN bots b ON b.id = pb.botId
       WHERE pb.projectId = ? ORDER BY pb.createdAt DESC`,
      [projectId]
    );

    res.status(201).json({ project: buildProjectResponse(project, linkedBots) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const linkedBots = await dbAll(
      `SELECT b.* FROM project_bots pb
       JOIN bots b ON b.id = pb.botId
       WHERE pb.projectId = ? ORDER BY pb.createdAt DESC`,
      [req.params.id]
    );

    const outputs = await dbAll('SELECT * FROM project_outputs WHERE projectId = ? ORDER BY uploadedAt DESC', [req.params.id]);

    res.json({
      project: buildProjectResponse(project, linkedBots),
      outputs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = '', bots = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    await dbRun('UPDATE projects SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    await dbRun('DELETE FROM project_bots WHERE projectId = ?', [id]);

    if (Array.isArray(bots) && bots.length > 0) {
      const inserts = bots.map((botId) =>
        dbRun('INSERT INTO project_bots (projectId, botId) VALUES (?, ?)', [id, botId])
      );
      await Promise.all(inserts);
    }

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    const linkedBots = await dbAll(
      `SELECT b.* FROM project_bots pb
       JOIN bots b ON b.id = pb.botId
       WHERE pb.projectId = ? ORDER BY pb.createdAt DESC`,
      [id]
    );

    res.json({ project: buildProjectResponse(project, linkedBots) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM projects WHERE id = ?', [req.params.id]);
    await dbRun('DELETE FROM project_bots WHERE projectId = ?', [req.params.id]);
    await dbRun('DELETE FROM project_outputs WHERE projectId = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/share', async (req, res) => {
  try {
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const linkedBots = await dbAll(
      `SELECT b.* FROM project_bots pb
       JOIN bots b ON b.id = pb.botId
       WHERE pb.projectId = ? ORDER BY pb.createdAt DESC`,
      [req.params.id]
    );

    const outputFile = path.join(exportsDir, `project-${project.id}-${Date.now()}.json`);
    const payload = {
      project: buildProjectResponse(project, linkedBots),
      exportedAt: new Date().toISOString(),
      bots: linkedBots.map(normalizeBot)
    };

    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf8');
    const publicUrl = `/exports/${path.basename(outputFile)}`;

    res.json({
      success: true,
      fileName: path.basename(outputFile),
      publicUrl,
      downloadUrl: `http://localhost:${PORT}${publicUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A file is required.' });
    }

    const storedName = req.file.filename;
    const publicPath = `/uploads/${storedName}`;
    const fileSize = req.file.size;

    const result = await dbRun(
      'INSERT INTO project_outputs (projectId, originalName, storedName, filePath, fileSize) VALUES (?, ?, ?, ?, ?)',
      [projectId, req.file.originalname, storedName, publicPath, fileSize]
    );

    const outputRow = await dbGet('SELECT * FROM project_outputs WHERE id = ?', [result.id]);
    res.status(201).json({ output: outputRow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id/outputs', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM project_outputs WHERE projectId = ? ORDER BY uploadedAt DESC', [req.params.id]);
    res.json({ outputs: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`AI Bot Studio running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
