export default async function handler(req, res) {
    // Vercel automatically extracts and decodes query parameters into req.query
    const { path } = req.query;
    
    if (!path) {
        return res.status(400).json({ error: "Missing API path parameter" });
    }

    // Construct the target URL safely
    const targetUrl = `http://pterodactyl.namelesstech.space:25566${path}`;

    try {
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `Backend responded with ${response.status}` });
        }

        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(data);
        
    } catch (error) {
        // If the fetch fails entirely (e.g., port blocked), it catches here
        res.status(500).json({ error: 'Failed to fetch from backend', details: error.message });
    }
}
