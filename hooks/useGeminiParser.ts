import { useState } from 'react';

interface UseGeminiParserProps {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

export const useGeminiParser = ({ onSuccess, onError }: UseGeminiParserProps = {}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const fileToGenerativePart = async (file: File) => {
        return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve({
                    inlineData: {
                        data: base64String,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const processFile = async (file: File, prompt: string) => {
        setIsProcessing(true);
        try {
            const filePart = await fileToGenerativePart(file);

            const MODELS = [
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ];

            let lastError = null;
            let success = false;
            let parsedResult = null;

            // Prepare the payload for the REST API
            // The filePart from fileToGenerativePart is strictly { inlineData: { data, mimeType } }
            // The REST API expects parts: [{ text: ... }, { inlineData: ... }]
            const contents = [{
                role: 'user',
                parts: [
                    { text: prompt },
                    filePart
                ]
            }];

            for (const modelName of MODELS) {
                try {
                    console.log(`[Gemini Hook] Trying model: ${modelName}`);

                    const response = await fetch('/api/generative', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: modelName,
                            contents: contents
                        })
                    });

                    const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));

                    if (!response.ok || !payload.ok) {
                        const errorMsg = payload.error?.message || payload.error || 'Unknown error';
                        throw new Error(`Model ${modelName} error: ${response.status} - ${errorMsg}`);
                    }

                    // Extract text from REST API response structure (nested in payload.data)
                    const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('Empty response from AI');

                    // Clean JSON markdown
                    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

                    try {
                        parsedResult = JSON.parse(jsonStr);
                        success = true;
                        break;
                    } catch (e) {
                        console.warn(`[Gemini Hook] JSON Parse failed for ${modelName}:`, e);
                    }

                } catch (e: any) {
                    console.warn(`[Gemini Hook] Model ${modelName} failed:`, e.message);
                    lastError = e;
                    // Short delay to avoid rate limits if looping fast
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (success && parsedResult) {
                if (onSuccess) onSuccess(parsedResult);
                return parsedResult;
            } else {
                throw lastError || new Error("Todos os modelos falharam ao processar o arquivo.");
            }

        } catch (error: any) {
            console.error("[Gemini Hook] Error:", error);
            if (onError) onError(error);
        } finally {
            setIsProcessing(false);
        }
    };

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

            for (const modelName of MODELS) {
                try {
                    console.log(`[Gemini Hook] Trying model: ${modelName}`);

                    const response = await fetch('/api/generative', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: modelName, contents: contents })
                    });

                    const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON' }));

                    if (!response.ok || !payload.ok) {
                        const errorMsg = payload.error?.message || payload.error || 'Unknown error';
                        throw new Error(`Model ${modelName} error: ${response.status} - ${errorMsg}`);
                    }

                    const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error('Empty response from AI');

                    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

                    try {
                        parsedResult = JSON.parse(jsonStr);
                        success = true;
                        break;
                    } catch (e) {
                        console.warn(`[Gemini Hook] JSON Parse failed for ${modelName}:`, e);
                    }

                } catch (e: any) {
                    console.warn(`[Gemini Hook] Model ${modelName} failed:`, e.message);
                    lastError = e;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (success && parsedResult) {
                if (onSuccess) onSuccess(parsedResult);
                return parsedResult;
            } else {
                throw lastError || new Error("Todos os modelos falharam ao processar o texto.");
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
        processText,
        isProcessing
    };
};
