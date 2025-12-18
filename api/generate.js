
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with environment variable
const apiKey = process.env.GOOGLE_API_KEY;

// Rate limiting / Concurrency mapping (Simple in-memory for serverless is limited, 
// but we can try to be smart or just rely on Google's 429)

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this for production security
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'GOOGLE_API_KEY not configured in server environment.' });
    }

    try {
        if (req.method === 'GET') {
            // List Models implementation
            // We use the SDK or fetch directly. SDK is easier if installed, but user example used fetch. 
            // I'll use fetch to avoid needing to install the SDK in the 'api' separate package context 
            // (unless api shares package.json, which it usually does in Vercel root).
            // Let's stick to the fetch implementation for zero-dependency (other than node built-ins) if possible,
            // OR use the user's example style.

            // Using fetch implementation as requested in example
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();

            if (!response.ok) {
                throw { status: response.status, body: data };
            }

            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { model, prompt, contents } = req.body;
            // Support both 'prompt' (simple) and 'contents' (complex) formats

            const targetModel = model || 'gemini-1.5-flash';
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

            // Construct body for Google API
            let googleBody = {};
            if (contents) {
                googleBody = { contents };
            } else if (prompt && typeof prompt === 'string') {
                googleBody = { contents: [{ parts: [{ text: prompt }] }] };
            } else if (prompt && typeof prompt === 'object') {
                googleBody = prompt; // Assume it's already formatted
            }

            // Retry Logic with Exponential Backoff
            const maxRetries = 3;
            let attempt = 0;
            let lastError;

            while (attempt < maxRetries) {
                try {
                    const apiRes = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(googleBody)
                    });

                    const data = await apiRes.json();

                    if (!apiRes.ok) {
                        // Handle 429 and 503 specifically
                        if (apiRes.status === 429 || apiRes.status === 503) {
                            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                            console.warn(`Attempt ${attempt + 1} failed with ${apiRes.status}. Retrying in ${delay}ms...`);
                            await new Promise(r => setTimeout(r, delay));
                            attempt++;
                            lastError = { status: apiRes.status, body: data };
                            continue;
                        }
                        throw { status: apiRes.status, body: data };
                    }

                    return res.status(200).json(data);

                } catch (err) {
                    // Network errors or other fetch issues
                    const delay = Math.pow(2, attempt) * 1000;
                    console.warn(`Attempt ${attempt + 1} network error: ${err.message}. Retrying...`);
                    await new Promise(r => setTimeout(r, delay));
                    attempt++;
                    lastError = err;
                }
            }

            // If we're here, all retries failed
            // Check if it was a 404 (Model not found) -> Client should switch model
            if (lastError.status === 404) {
                return res.status(404).json({
                    error: 'Model not found',
                    details: lastError.body,
                    code: 'MODEL_NOT_FOUND'
                });
            }

            throw lastError;
        }

        res.setHeader('Allow', 'GET,POST');
        return res.status(405).end('Method Not Allowed');

    } catch (err) {
        console.error('API Proxy Error:', err);
        const status = err.status || 500;
        return res.status(status).json({
            error: err.body || err.message || 'Internal Server Error',
            suggestion: status === 429 ? 'Quota exceeded. Please try again later.' : undefined
        });
    }
}
