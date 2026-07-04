import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'abc123',
  database: process.env.DB_NAME || 'ayaka_fansite',
  waitForConnections: true,
  connectionLimit: 5,
});

let initialized = false;

async function initDB() {
  if (initialized) return;
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        memory_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        is_compressed TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        INDEX idx_conv_time (conversation_id, created_at)
      )
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS core_memories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user (user_id)
      )
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 1,
        prompt TEXT NOT NULL,
        model VARCHAR(100) NOT NULL,
        image_size VARCHAR(20) NOT NULL,
        local_path VARCHAR(500) NOT NULL,
        original_url VARCHAR(500),
        reference_image TEXT,
        template VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user_time (user_id, created_at DESC)
      )
    `);
    initialized = true;
    console.log('✅ Database tables ready');
  } finally {
    conn.release();
  }
}

initDB().catch(console.error);

export default pool;

// ── Helpers using pool.query (not execute) to avoid prepared-statement edge cases ──

export async function ensureUser(id: number = 1) {
  await initDB();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]) as any;
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, nickname) VALUES (?, ?, ?, ?)',
      [id, 'default', 'local-dev-only', '旅行者']
    );
  }
  return { id };
}

export async function ensureConversation(userId: number) {
  await initDB();
  const [rows] = await pool.query('SELECT * FROM conversations WHERE user_id = ?', [userId]) as any;
  if (rows.length === 0) {
    const [result] = await pool.query('INSERT INTO conversations (user_id) VALUES (?)', [userId]) as any;
    return { id: result.insertId };
  }
  return rows[0];
}

export async function getRecentMessages(conversationId: number, limit: number = 20) {
  await initDB();
  const [rows] = await pool.query(
    `SELECT role, content FROM messages WHERE conversation_id = ? AND is_compressed = 0 ORDER BY created_at ASC LIMIT ${limit}`,
    [conversationId]
  ) as any;
  return rows as { role: string; content: string }[];
}

export async function saveMessage(conversationId: number, role: string, content: string) {
  await initDB();
  await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversationId, role, content]
  );
}

export async function getCoreMemories(userId: number) {
  await initDB();
  const [rows] = await pool.query(
    'SELECT content, category FROM core_memories WHERE user_id = ?',
    [userId]
  ) as any;
  return rows as { content: string; category: string }[];
}

export async function getMemorySummary(conversationId: number): Promise<string | null> {
  const [rows] = await pool.query(
    'SELECT memory_summary FROM conversations WHERE id = ?',
    [conversationId]
  ) as any;
  return rows[0]?.memory_summary || null;
}

export async function updateMemorySummary(conversationId: number, summary: string) {
  await pool.query(
    'UPDATE conversations SET memory_summary = ? WHERE id = ?',
    [summary.slice(0, 2000), conversationId]
  );
}

export async function compressOldMessages(conversationId: number, limit: number = 10) {
  const [rows] = await pool.query(
    `SELECT id FROM messages WHERE conversation_id = ? AND is_compressed = 0 ORDER BY created_at ASC LIMIT ${limit}`,
    [conversationId]
  ) as any;
  if (rows.length === 0) return [];
  const ids = (rows as any[]).map((r: any) => r.id);
  // Use query with string-built IN clause
  const placeholders = ids.map(() => '?').join(',');
  await pool.query(
    `UPDATE messages SET is_compressed = 1 WHERE id IN (${placeholders})`,
    ids
  );
  const [content] = await pool.query(
    `SELECT role, content FROM messages WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
    ids
  ) as any;
  return content as { role: string; content: string }[];
}

export async function getMessageCount(conversationId: number): Promise<number> {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND is_compressed = 0',
    [conversationId]
  ) as any;
  return rows[0].cnt;
}

// ── Generated Images helpers ──

export async function saveGeneratedImage(params: {
  userId?: number;
  prompt: string;
  model: string;
  imageSize: string;
  localPath: string;
  originalUrl?: string;
  referenceImage?: string;
  template?: string;
}) {
  await initDB();
  const { userId = 1, prompt, model, imageSize, localPath, originalUrl, referenceImage, template } = params;
  const [result] = await pool.query(
    `INSERT INTO generated_images (user_id, prompt, model, image_size, local_path, original_url, reference_image, template)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, prompt, model, imageSize, localPath, originalUrl || null, referenceImage || null, template || null]
  ) as any;
  return { id: result.insertId };
}

export async function getGeneratedImages(userId: number = 1, limit: number = 50) {
  await initDB();
  const [rows] = await pool.query(
    'SELECT id, prompt, model, image_size, local_path, template, created_at FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  ) as any;
  return rows as { id: number; prompt: string; model: string; image_size: string; local_path: string; template: string | null; created_at: string }[];
}

export async function deleteGeneratedImage(id: number, userId: number = 1) {
  await initDB();
  const [rows] = await pool.query(
    'SELECT local_path FROM generated_images WHERE id = ? AND user_id = ?',
    [id, userId]
  ) as any;
  if (rows.length === 0) return null;
  await pool.query('DELETE FROM generated_images WHERE id = ?', [id]);
  return rows[0].local_path as string;
}
