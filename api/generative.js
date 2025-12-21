const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

// Fallback to stable models only to avoid quota issues with non-existent/experimental models
const MODELS_FALLBACK_LIST = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
];
// Setup utilities

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
            const { model: requestedModel, prompt, contents } = req.body;

            // Adapt input to Google API Body
            let bodyPayload;
            if (contents) {
                bodyPayload = { contents };
            } else if (prompt) {
                if (typeof prompt === 'string') {
                    bodyPayload = { contents: [{ parts: [{ text: prompt }] }] };
                } else {
                    bodyPayload = prompt;
                }
            } else {
                return res.status(400).json({ ok: false, error: 'prompt or contents required' });
            }

            // --- Server-Side Smart Fallback ---
            // If the user requested a specific model, we try it first. 
            // Then we try the fallback list.
            const tryModels = requestedModel
                ? [requestedModel, ...MODELS_FALLBACK_LIST.filter(m => m !== requestedModel)]
                : MODELS_FALLBACK_LIST;

            let lastError = null;
            for (const modelName of tryModels) {
                try {
                    console.log(`[Proxy] Attempting model: ${modelName}`);
                    const result = await fetchWithRetry(`/models/${modelName}:generateContent`, bodyPayload);
                    return res.status(200).json({ ok: true, data: result, modelUsed: modelName });
                } catch (err) {
                    console.warn(`[Proxy] Model ${modelName} failed. Status: ${err.status}`);
                    lastError = err;

                    // If it's a 429 (Quota Exceeded), stop immediately. 
                    // Trying other models with the same API key will likely result in the same error.
                    if (err.status === 429) {
                        break;
                    }

                    // If it's a 503 (Server Error) or 404 (Not Found), continue to next fallback
                    if (err.status === 503 || err.status === 404) {
                        continue;
                    }

                    // For other errors (like 400), we also stop
                    break;
                }
            }

            // If we are here, all models failed
            return res.status(lastError?.status || 500).json({
                ok: false,
                error: lastError?.body || lastError?.message || 'All models failed'
            });
        }

        res.setHeader('Allow', 'GET,POST');
        res.status(405).end();
    } catch (err) {
        console.error('API proxy error:', err);
        res.status(err.status || 500).json({ ok: false, error: err.body || err });
    }
}
