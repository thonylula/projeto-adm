import { useState } from 'react';

interface UseGeminiParserProps {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

export const useGeminiParser = ({ onSuccess, onError }: UseGeminiParserProps = {}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFiles = async (files: File[], prompt: string) => {
        setIsProcessing(true);
        try {
            const fileParts = await Promise.all(files.map(file => fileToGenerativePart(file)));

            const contents = [{
                role: 'user',
                parts: [
                    { text: prompt },
                    ...fileParts
                ]
            }];

            console.log(`[Gemini Hook] Processing ${files.length} files via Proxy...`);

            const response = await fetch('/api/generative', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents
                })
            });

            const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));

            if (!response.ok || !payload.ok) {
                const errorMsg = payload.error?.message || payload.error || 'Unknown error';
                throw new Error(`Proxy AI Error: ${response.status} - ${errorMsg}`);
            }

            const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from AI');

            // Try to parse as JSON, but fallback to raw text if it's not JSON
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                const parsed = JSON.parse(jsonStr);
                if (onSuccess) onSuccess(parsed);
                return parsed;
            } catch (e) {
                console.warn("[Gemini Hook] Response is not valid JSON, returning raw text.");
                if (onSuccess) onSuccess(text);
                return text;
            }

        } catch (error: any) {
            console.error("[Gemini Hook] Error:", error);
            if (onError) onError(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const processFile = (file: File, prompt: string) => processFiles([file], prompt);

    const processText = async (prompt: string, userText: string) => {
        setIsProcessing(true);
        try {
            const MODELS = [
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ];

            const fullPrompt = userText ? `${prompt}\n\nTEXTO PARA ANALISAR:\n${userText}` : prompt;
            const contents = [{
                role: 'user',
                parts: [{ text: fullPrompt }]
            }];

            let lastError = null;
            let success = false;
            let parsedResult = null;

            console.log(`[Gemini Hook] Processing text via Proxy...`);

            const response = await fetch('/api/generative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: contents })
            });

            const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));

            if (!response.ok || !payload.ok) {
                const errorMsg = payload.error?.message || payload.error || 'Unknown error';
                throw new Error(`Proxy AI Error: ${response.status} - ${errorMsg}`);
            }

            const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from AI');

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedResult = JSON.parse(jsonStr);

            if (parsedResult) {
                if (onSuccess) onSuccess(parsedResult);
                return parsedResult;
            } else {
                throw new Error("Falha ao interpretar resposta da IA como JSON.");
            }
        } catch (error: any) {
            console.error("[Gemini Hook] Error:", error);
            if (onError) onError(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        processFile,
        processFiles,
        processText,
        isProcessing
    };
};

async function fileToGenerativePart(file: File): Promise<{
    inlineData: { data: string; mimeType: string };
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
