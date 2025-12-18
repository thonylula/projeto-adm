// api/generative.js (Vercel serverless)
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const API_KEY = process.env.GOOGLE_API_KEY;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(path, body, maxRetries = 3) {
    let attempt = 0;
    let lastErr = null;
    while (attempt <= maxRetries) {
        try {
            // Setup headers
            const headers = {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY
            };

            // Perform request
            const res = await fetch(`${BASE}${path}`, {
                method: 'POST', // standard for generateContent
                headers,
                body: JSON.stringify(body),
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                // 429/503 -> retry, 4xx (ex: 404 model not found) -> abort
                if (res.status === 429 || res.status === 503) {
                    throw { retryable: true, status: res.status, body: json || await res.text() };
                }
                throw { retryable: false, status: res.status, body: json || await res.text() };
            }
            return json;
        } catch (err) {
            lastErr = err;
            attempt++;
            if (!err.retryable || attempt > maxRetries) break;
            const backoff = Math.pow(2, attempt) * 250 + Math.random() * 100;
            await sleep(backoff);
        }
    }
    throw lastErr || new Error('fetchWithRetry failed');
}

export default async function handler(req, res) {
    try {
        // CORS
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (!API_KEY) {
            // Fallback for debugging if not set, but user requested strict env var
            return res.status(500).json({ ok: false, error: 'GOOGLE_API_KEY not configured on server' });
        }

        if (req.method === 'GET') {
            // listar modelos
            // Note: models/list is a GET request, but fetchWithRetry handles POST.
            // We can just do a direct fetch with retry logic locally or adapt fetchWithRetry.
            // Or just do a simple fetch since list models is rarely rate limited compared to generate.
            const listRes = await fetch(`${BASE}/models?key=${API_KEY}`);
            const listData = await listRes.json();
            return res.status(listRes.status).json({ ok: listRes.ok, data: listData });
        }

        if (req.method === 'POST') {
            const { model, prompt, contents } = req.body;
            if (!model) return res.status(400).json({ ok: false, error: 'model required' });

            // Adapt input to Google API Body
            let body;
            if (contents) {
                body = { contents };
            } else if (prompt) {
                if (typeof prompt === 'string') {
                    body = { contents: [{ parts: [{ text: prompt }] }] };
                } else {
                    body = prompt;
                }
            } else {
                return res.status(400).json({ ok: false, error: 'prompt or contents required' });
            }

            const result = await fetchWithRetry(`/models/${model}:generateContent`, body);
            return res.status(200).json({ ok: true, data: result });
        }

        res.setHeader('Allow', 'GET,POST');
        res.status(405).end();
    } catch (err) {
        console.error('API proxy error:', err);
        res.status(err.status || 500).json({ ok: false, error: err.body || err });
    }
}
