export default async function handler(req, res) {
    let { path } = req.query;
    
    if (!path) {
        return res.status(400).json({ error: "Missing API path parameter" });
    }

    // Force decode to ensure '%2F' turns back into '/' before hitting Pterodactyl
    const decodedPath = decodeURIComponent(path);
    const targetUrl = `http://pterodactyl.namelesstech.space:25566${decodedPath}`;

    try {
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            // Capture the exact backend error text for debugging
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: `Backend responded with ${response.status}`,
                target_url_attempted: targetUrl,
                pterodactyl_message: errorText 
            });
        }

        const data = await response.json();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(data);
        
    } catch (error) {
        res.status(500).json({ error: 'Proxy fetch failed', details: error.message });
    }
}
