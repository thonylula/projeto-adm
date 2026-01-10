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
    }

    /**
     * Main processing method - must be implemented by each agent
     */
    abstract process(data: any): Promise<any>;

    /**
     * Call LLM with agent's system prompt and user prompt
     */
    protected async callLLM(userPrompt: string, context?: any): Promise<LLMResponse> {
        try {
            const fullPrompt = this.buildPrompt(userPrompt, context);

            const response = await generateText(fullPrompt, {
                model: this.model,
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens,
                systemInstruction: this.systemPrompt
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
     * Build complete prompt with context
     */
    protected buildPrompt(userPrompt: string, context?: any): string {
        if (!context) return userPrompt;

        const contextStr = typeof context === 'string'
            ? context
            : JSON.stringify(context, null, 2);

        return `${userPrompt}\n\nContexto:\n${contextStr}`;
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
}
