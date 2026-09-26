import { Readable } from 'node:stream';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url, name, download } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing target "url" query parameter.' });
  }

  try {
    const upstreamHeaders = {
      'Referer': 'https://movieboxonline.net/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };

    // Forward range header for video seeking
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const upstreamResponse = await fetch(url, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
    });

    // Pass through status code (200 or 206 for partial content)
    res.status(upstreamResponse.status);

    // Forward streaming headers
    const passHeaders = [
      'content-range',
      'content-length',
      'content-type',
      'accept-ranges',
      'last-modified',
      'etag',
    ];

    passHeaders.forEach((header) => {
      const val = upstreamResponse.headers.get(header);
      if (val) res.setHeader(header, val);
    });

    res.setHeader('Accept-Ranges', 'bytes');
    if (!upstreamResponse.headers.get('content-type')) {
      res.setHeader('Content-Type', 'video/mp4');
    }

    // Force download prompt if requested
    if (download === '1' || download === 'true') {
      const fileName = name ? `${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.mp4` : 'video.mp4';
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    if (req.method === 'HEAD' || !upstreamResponse.body) {
      return res.end();
    }

    // Pipe response stream directly to client
    const nodeStream = Readable.fromWeb(upstreamResponse.body);
    nodeStream.pipe(res);

    req.on('close', () => {
      nodeStream.destroy();
    });
  } catch (error) {
    console.error('Stream proxy error:', error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy media stream', details: error.message });
    }
  }
}
