import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Manual .env parser since we can't rely on dotenv being installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const data = fs.readFileSync(envPath, 'utf8');
            const lines = data.split('\n');
            for (const line of lines) {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim().replace(/^["'](.*)["']$/, '$1'); // minimal cleanup
                    process.env[key] = val;
                }
            }
        }
    } catch (e) {
        console.error("Error reading .env", e);
    }
}

loadEnv();

async function run() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.error("NO API KEY FOUND IN .env");
        process.exit(1);
    }

    console.log(`Using Key: ${apiKey.slice(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // We can't list models directly with the high-level SDK easily in some versions, 
    // but let's try a direct fetch if the SDK method isn't evident, 
    // actually SDK has genAI.getGenerativeModel but for listing we might need the model manager
    // or just try a standard request.
    // The google-generative-ai node SDK doesn't always expose listModels clearly on the main entry.
    // Let's try to just Instantiate a few and see if they throw immediately on a dummy countTokens?
    // Or better, use the REST API manually to be 100% sure what the server sees.

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            console.error(`Error ${resp.status}: ${await resp.text()}`);
        } else {
            const data = await resp.json();
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

run();
