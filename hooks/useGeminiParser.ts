import { useState } from 'react';

interface UseGeminiParserProps {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

export const useGeminiParser = ({ onSuccess, onError }: UseGeminiParserProps = {}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFiles = async (files: File[], prompt: string, model?: string) => {
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
                    contents: contents,
                    model: model
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
            const rawText = text.trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    const parsed = JSON.parse(jsonStr);
                    if (onSuccess) onSuccess(parsed);
                    return parsed;
                } catch (e) {
                    console.warn("[Gemini Hook] Valid-looking JSON failed to parse:", e);
                }
            }

            if (onSuccess) onSuccess(text);
            return text;

        } catch (error: any) {
            console.error("[Gemini Hook] Error:", error);
            if (onError) onError(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const processFile = (file: File, prompt: string, model?: string) => processFiles([file], prompt, model);

    const processText = async (prompt: string, userText: string, model?: string) => {
        setIsProcessing(true);
        try {

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
                body: JSON.stringify({
                    contents: contents,
                    model: model
                })
            });

            const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));

            if (!response.ok || !payload.ok) {
                const errorMsg = payload.error?.message || payload.error || 'Unknown error';
                throw new Error(`Proxy AI Error: ${response.status} - ${errorMsg}`);
            }

            const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from AI');

            const rawText = text.trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[0];
                    parsedResult = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("[Gemini Hook] JSON extraction failed:", e);
                }
            }

            if (parsedResult) {
                if (onSuccess) onSuccess(parsedResult);
                return parsedResult;
            } else {
                // Return raw text if JSON is not found but handle it gracefully
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
