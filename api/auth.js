import crypto from 'crypto';

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  // Пользователи из переменной окружения Vercel
  // Формат: "user1:pass1,user2:pass2"
  const usersEnv = process.env.EDITOR_USERS || '';
  const users = usersEnv
    .split(',')
    .map(pair => {
      const colonIdx = pair.indexOf(':');
      if (colonIdx === -1) return null;
      return {
        username: pair.slice(0, colonIdx).trim(),
        password: pair.slice(colonIdx + 1).trim()
      };
    })
    .filter(u => u && u.username && u.password);

  const validUser = users.find(
    u => u.username === username && u.password === password
  );

  if (!validUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Формируем токен: base64(payload) + "." + HMAC подпись
  const secret = process.env.EDITOR_TOKEN_SECRET || 'quiz-editor-secret';
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 часа
  const payload = `${username}:${expires}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(payload).toString('base64') + '.' + sig;

  return res.status(200).json({ token, expires, username });
}
