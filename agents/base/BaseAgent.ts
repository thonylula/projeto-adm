import { AgentConfig, HandoffRequest, LLMResponse } from './types';
import type { AgentOrchestrator } from './AgentOrchestrator';
import { generateText } from '../../services/geminiService';

/**
 * Base Agent Class
 * All specialized agents extend this class
 */
export abstract class BaseAgent {
    protected name: string;
    protected model: string;
    protected systemPrompt: string;
    protected temperature: number;
    protected maxTokens: number;
    protected orchestrator?: AgentOrchestrator;

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.model = config.model || 'gemini-2.0-flash-exp';
        this.systemPrompt = config.systemPrompt;
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens ?? 8192;
        this.responseMimeType = config.responseMimeType;
    }

    protected responseMimeType?: string;

    /**
     * Main processing method - must be implemented by each agent
     */
    abstract process(data: any): Promise<any>;

    /**
     * Call LLM with agent's system prompt and user prompt
     * Supports text and image inputs
     */
    protected async callLLM(userPrompt: string, context?: any): Promise<LLMResponse> {
        try {
            // Check if context contains an image/file (File OR Base64)
            if (context && context.image) {
                return await this.callLLMWithImage(userPrompt, context.image, context.mimeType);
            }

            const fullPrompt = this.buildPrompt(userPrompt, context);

            const response = await generateText(fullPrompt, {
                model: this.model,
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens,
                systemInstruction: this.systemPrompt,
                responseMimeType: this.responseMimeType
            });

            return {
                content: response,
                metadata: {
                    model: this.model
                }
            };
        } catch (error) {
            console.error(`[${this.name}] LLM call failed:`, error);
            throw error;
        }
    }

    /**
     * Call LLM with image using direct API call
     */
    private async callLLMWithImage(prompt: string, image: File | string, mimeType?: string): Promise<LLMResponse> {
        try {
            let base64 = '';
            let finalMimeType = mimeType || 'image/jpeg';

            if (image instanceof File) {
                base64 = await this.fileToBase64(image);
                base64 = base64.replace(/^data:.*?;base64,/, '');
                finalMimeType = image.type;
            } else {
                base64 = image.replace(/^data:.*?;base64,/, '');
            }

            const response = await fetch('/api/generative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    data: base64,
                                    mimeType: finalMimeType
                                }
                            }
                        ]
                    }],
                    systemInstruction: {
                        parts: [{ text: this.systemPrompt }]
                    },
                    generationConfig: {
                        temperature: this.temperature,
                        maxOutputTokens: this.maxTokens,
                        responseMimeType: this.responseMimeType
                    }
                })
            });

            const payload = await response.json();

            if (!response.ok || !payload.ok) {
                throw new Error(payload.error?.message || 'API call failed');
            }

            const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty response from AI');

            return {
                content: text,
                metadata: {
                    model: this.model
                }
            };
        } catch (error) {
            this.log(`Image processing failed: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Convert file to base64
     */
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Build complete prompt with context
     */
    protected buildPrompt(userPrompt: string, context?: any): string {
        if (!context) return userPrompt;

        let contextStr = '';
        if (typeof context === 'string') {
            contextStr = context;
        } else {
            // Remove huge binary data if present before stringifying
            const cleanContext = { ...context };
            if (cleanContext.image) delete cleanContext.image;

            contextStr = Object.keys(cleanContext).length > 0
                ? JSON.stringify(cleanContext, null, 2)
                : '';
        }

        return contextStr
            ? `${userPrompt}\n\nContexto:\n${contextStr}`
            : userPrompt;
    }

    /**
     * Hand off to another agent
     */
    protected async handoff(targetAgent: string, data: any, reason?: string): Promise<any> {
        if (!this.orchestrator) {
            throw new Error(`[${this.name}] Cannot handoff: orchestrator not set`);
        }

        console.log(`[${this.name}] Handing off to ${targetAgent}: ${reason || 'processing'}`);

        const request: HandoffRequest = {
            targetAgent,
            data,
            metadata: {
                sourceAgent: this.name,
                timestamp: new Date(),
                reason
            }
        };

        return this.orchestrator.routeToAgent(targetAgent, data);
    }

    /**
     * Set the orchestrator reference
     */
    setOrchestrator(orchestrator: AgentOrchestrator): void {
        this.orchestrator = orchestrator;
    }

    /**
     * Get agent info
     */
    getInfo(): { name: string; model: string } {
        return {
            name: this.name,
            model: this.model
        };
    }

    /**
     * Validate input data (can be overridden)
     */
    protected validateInput(data: any, requiredFields: string[]): void {
        for (const field of requiredFields) {
            if (!(field in data) || data[field] === undefined || data[field] === null) {
                throw new Error(`[${this.name}] Missing required field: ${field}`);
            }
        }
    }

    /**
     * Log agent activity
     */
    protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name}]`;

        switch (level) {
            case 'error':
                console.error(`${prefix} ❌`, message);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️`, message);
                break;
            default:
                console.log(`${prefix} ℹ️`, message);
        }
    }

    /**
     * Extracts and parses JSON from a string that might contain extra text.
     * Supports both objects {} and arrays [].
     */
    /**
     * Extracts and parses JSON from a string that might contain extra text.
     * Supports both objects {} and arrays [].
     * Industrial-grade extraction: handles string literals, escaped characters, and nesting.
     */
    protected safeExtractJson(content: string): any {
        if (!content) return null;

        // 1. Try direct parse first (cleanest case)
        const cleanContent = content.trim().replace(/^```json/g, '').replace(/```$/g, '').trim();
        try {
            return JSON.parse(cleanContent);
        } catch (e) {
            // Direct parse failed, proceed to deep extraction
        }

        const firstBrace = content.indexOf('{');
        const firstBracket = content.indexOf('[');

        if (firstBrace === -1 && firstBracket === -1) {
            this.log(`Raw AI Response (No JSON found): ${content}`, 'error');
            throw new Error(`[${this.name}] No JSON (brace or bracket) found in response`);
        }

        // Determine real start index
        const startIndex = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket))
            ? firstBrace
            : firstBracket;

        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escape = false;
        let lastIndex = -1;

        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];

            if (escape) {
                escape = false;
                continue;
            }

            if (char === '\\') {
                escape = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                else if (char === '[') bracketCount++;
                else if (char === ']') bracketCount--;

                // If we returned to baseline on the main structure type, we're done
                if (braceCount === 0 && bracketCount === 0) {
                    lastIndex = i;
                    break;
                }
            }
        }

        if (lastIndex === -1) {
            this.log(`Incomplete JSON Response Detected. BraceCount: ${braceCount}, BracketCount: ${bracketCount}. Length: ${content.length}. Tail: ${content.substring(content.length - 20)}`, 'error');

            // Auto-repair attempt for arrays: if it's an array and truncated, try to close it
            if (startIndex === firstBracket && bracketCount > 0) {
                try {
                    this.log(`Attempting to repair truncated JSON array...`, 'warn');
                    let repaired = content.substring(startIndex);
                    // Find the last complete object "}," or "}"
                    const lastGoodObject = Math.max(repaired.lastIndexOf('},'), repaired.lastIndexOf('}'));
                    if (lastGoodObject !== -1) {
                        repaired = repaired.substring(0, lastGoodObject + 1) + ']';
                        return JSON.parse(repaired);
                    }
                } catch (repairError) {
                    this.log(`Auto-repair failed: ${repairError}`, 'error');
                }
            }

            const type = startIndex === firstBracket ? ']' : '}';
            throw new Error(`[${this.name}] No matching closing ${type} found (Response may be truncated)`);
        }

        const jsonStr = content.substring(startIndex, lastIndex + 1);
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            // Tenta limpar vírgulas extras no final antes de desistir
            try {
                const cleaned = jsonStr.replace(/,\s*([}\]])/g, '$1');
                return JSON.parse(cleaned);
            } catch (e2) {
                this.log(`Failed Parse on Extracted String: ${jsonStr}`, 'error');
                throw new Error(`[${this.name}] Failed to parse extracted JSON: ${e2}`);
            }
        }
    }
}
