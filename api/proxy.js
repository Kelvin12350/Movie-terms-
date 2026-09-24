const MOVIEBOX_SECRET = process.env.MOVIEBOX_SECRET || 'MvB7!qP2#xR9@kL4$zT8';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract endpoint query param
  const endpoint = req.query.endpoint || '/';
  const targetUrl = `https://api.namelesstech.space${endpoint}`;

  try {
    // Format authorization header (fallback to secret token)
    const authHeader = req.headers.authorization 
      ? req.headers.authorization 
      : (MOVIEBOX_SECRET.startsWith('Bearer ') ? MOVIEBOX_SECRET : `Bearer ${MOVIEBOX_SECRET}`);

    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-api-key': MOVIEBOX_SECRET
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Proxy Request Failed', message: error.message });
  }
}
