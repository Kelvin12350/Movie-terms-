const WORKER_BASE = 'https://allinoneba.ozokelvin293.workers.dev';
const WORKER_SECRET = 'lordtech';

export default async function handler(req, res) {
  const { id, se = 0, ep = 0 } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing subject id' });
  }

  try {
    const upstream = await fetch(`${WORKER_BASE}/stream/${id}?se=${se}&ep=${ep}`, {
      headers: {
        'X-Worker-Secret': WORKER_SECRET,
      },
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(upstream.status).send(detail);
    }

    const data = await upstream.json();

    // Reroute HTTP streams through /api/video to prevent HTTPS mixed-content blocks
    if (data.streams && Array.isArray(data.streams)) {
      data.streams = data.streams.map((stream) => {
        if (stream.url && stream.url.startsWith('http://')) {
          return {
            ...stream,
            url: `/api/video?url=${encodeURIComponent(stream.url)}`,
          };
        }
        return stream;
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
