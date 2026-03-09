import cds from '@sap/cds';

const CREST_HOST = 'crests.football-data.org';
const CREST_PREFIX = `https://${CREST_HOST}/`;

cds.on('bootstrap', (app: any) => {
    app.get('/api/crest-proxy', async (req: any, res: any) => {
        const raw = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
        const imageUrl = typeof raw === 'string' ? raw.trim() : '';

        if (!imageUrl) {
            return res.status(400).send('Missing url query parameter');
        }

        if (!imageUrl.startsWith(CREST_PREFIX)) {
            return res.status(400).send('Only crests.football-data.org is allowed');
        }

        let parsed: URL;
        try {
            parsed = new URL(imageUrl);
        } catch {
            return res.status(400).send('Invalid url');
        }

        if (parsed.protocol !== 'https:' || parsed.hostname !== CREST_HOST) {
            return res.status(400).send('Invalid crest host');
        }

        try {
            const upstream = await fetch(parsed.toString());
            if (!upstream.ok) {
                return res.status(upstream.status).send(`Upstream request failed (${upstream.status})`);
            }

            const buffer = Buffer.from(await upstream.arrayBuffer());
            const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
            const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', cacheControl);
            return res.status(200).send(buffer);
        } catch (error: any) {
            return res.status(502).send(`Failed to fetch crest: ${error?.message || 'Unknown error'}`);
        }
    });
});

module.exports = cds.server;
