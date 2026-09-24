export default async function handler(req, res) {
    // Extract everything after "?path="
    const pathIndex = req.url.indexOf('?path=');
    
    if (pathIndex === -1) {
        return res.status(400).json({ error: "Missing API path parameter" });
    }

    // This grabs the exact endpoint (e.g., "/home/trending" or "/api/stream/1?detail_path=movie")
    const apiPath = req.url.substring(pathIndex + 6);
    const targetUrl = `http://pterodactyl.namelesstech.space:25566${apiPath}`;

    try {
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `Backend responded with ${response.status}` });
        }

        const data = await response.json();
        
        // Return the data to the frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(data);
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from backend', details: error.message });
    }
}
