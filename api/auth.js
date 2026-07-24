/**
 * Quiz Editor Authentication Endpoint
 * Validates username/password against environment variables
 * 
 * Usage: POST /api/auth
 * Body: { username: string, password: string }
 * 
 * Environment variables format:
 * QUIZ_EDITOR_USERS = "user1:pass1,user2:pass2,user3:pass3"
 */

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ error: 'Missing username or password' });
    return;
  }

  // Get credentials from environment variable
  const credentialsEnv = process.env.QUIZ_EDITOR_USERS || '';
  
  if (!credentialsEnv) {
    console.error('[AUTH] QUIZ_EDITOR_USERS not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  // Parse credentials: "user1:pass1,user2:pass2"
  const validCredentials = credentialsEnv.split(',').map(pair => {
    const [user, pass] = pair.trim().split(':');
    return { user: user?.trim(), pass: pass?.trim() };
  }).filter(({ user, pass }) => user && pass);

  // Check credentials
  const isValid = validCredentials.some(
    ({ user, pass }) => user === username && pass === password
  );

  if (!isValid) {
    console.warn(`[AUTH] Failed login attempt for username: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  console.log(`[AUTH] Successful login for username: ${username}`);

  // Generate a simple session token (in production, use JWT or sessions)
  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

  res.status(200).json({
    ok: true,
    token,
    message: `Welcome, ${username}!`
  });
};
