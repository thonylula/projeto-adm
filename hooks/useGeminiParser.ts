
import { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface UseGeminiParserProps {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    apiKey: string;
}

export const useGeminiParser = ({ onSuccess, onError, apiKey }: UseGeminiParserProps) => {
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
            if (!apiKey) throw new Error("API Key inválida ou ausente.");

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

            for (const modelName of MODELS) {
                try {
                    console.log(`[Gemini Hook] Trying model: ${modelName}`);
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const result = await model.generateContent([prompt, filePart]);
                    const response = await result.response;
                    const text = response.text();

                    // Clean JSON markdown
                    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

                    try {
                        parsedResult = JSON.parse(jsonStr);
                        success = true;
                        break;
                    } catch (e) {
                        console.warn(`[Gemini Hook] JSON Parse failed for ${modelName}:`, e);
                        // If plain text (not JSON) was requested, we might want to return text.
                        // But for this hook we primarily target structured data.
                        // If parse fails, we continue to next model hoping for better formatting.
                    }

                } catch (e: any) {
                    console.warn(`[Gemini Hook] Model ${modelName} failed:`, e.message);
                    lastError = e;
                    // Short delay to avoid rate limits if looping fast
                    await new Promise(resolve => setTimeout(resolve, 5000));
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

    return {
        processFile,
        isProcessing
    };
};
