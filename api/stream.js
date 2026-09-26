import http from 'node:http';
import { Readable } from 'node:stream';

// Inside your request handler in server.js:
const reqUrl = new URL(req.url, `http://${req.headers.host}`);

if (reqUrl.pathname === '/dl') {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const targetUrl = reqUrl.searchParams.get('url');
  const fileName = reqUrl.searchParams.get('name');

  if (!targetUrl) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing target url query parameter' }));
  }

  try {
    const upstreamHeaders = {
      'Referer': 'https://movieboxonline.net/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    // Forward range header for HTML5 video timeline seeking
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
    });

    res.statusCode = upstreamRes.status;

    ['content-range', 'content-length', 'content-type', 'accept-ranges', 'last-modified', 'etag'].forEach((h) => {
      const v = upstreamRes.headers.get(h);
      if (v) res.setHeader(h, v);
    });

    res.setHeader('Accept-Ranges', 'bytes');
    if (!upstreamRes.headers.get('content-type')) {
      res.setHeader('Content-Type', 'video/mp4');
    }

    // Set download filename if 'name' parameter is present
    if (fileName) {
      const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${clean}"`);
    }

    if (req.method === 'HEAD' || !upstreamRes.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.pipe(res);

    req.on('close', () => nodeStream.destroy());
  } catch (err) {
    console.error('Proxy Error:', err);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'Failed to proxy media' }));
    }
  }
  return;
}
