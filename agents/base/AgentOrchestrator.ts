import { BaseAgent } from './BaseAgent';
import { AgentInteraction, AgentIntent, AgentRegistry } from './types';

/**
 * Agent Orchestrator
 * Central coordinator for all agents in the system
 */
export class AgentOrchestrator {
    private agents: Map<string, BaseAgent>;
    private registry: Map<string, AgentRegistry>;
    private history: AgentInteraction[];
    private intentMapping: Map<AgentIntent, string>;

    constructor() {
        this.agents = new Map();
        this.registry = new Map();
        this.history = [];
        this.intentMapping = new Map();
    }

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(
        id: string,
        agent: BaseAgent,
        config: Omit<AgentRegistry, 'id' | 'agent'>
    ): void {
        agent.setOrchestrator(this);
        this.agents.set(id, agent);

        this.registry.set(id, {
            id,
            agent,
            ...config
        });

        // Map intents to agent ID
        config.intents.forEach(intent => {
            this.intentMapping.set(intent, id);
        });

        console.log(`✅ Registered agent: ${id} (${config.category})`);
    }

    /**
     * Route request to specific agent by ID
     */
    async routeToAgent(agentId: string, data: any): Promise<any> {
        const agent = this.agents.get(agentId);

        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        const startTime = Date.now();

        try {
            this.log(`Routing to agent: ${agentId}`);
            const result = await agent.process(data);

            const interaction: AgentInteraction = {
                agentId,
                timestamp: new Date(),
                data,
                result
            };

            this.history.push(interaction);

            const duration = Date.now() - startTime;
            this.log(`Agent ${agentId} completed in ${duration}ms`);

            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            const interaction: AgentInteraction = {
                agentId,
                timestamp: new Date(),
                data,
                error: errorMsg
            };

            this.history.push(interaction);

            console.error(`❌ Agent ${agentId} failed:`, error);
            throw error;
        }
    }

    /**
     * Handle request by intent
     */
    async handleIntent(intent: AgentIntent, data: any): Promise<any> {
        const agentId = this.intentMapping.get(intent);

        if (!agentId) {
            throw new Error(`No agent registered for intent: ${intent}`);
        }

        return this.routeToAgent(agentId, data);
    }

    /**
     * Get agent by ID
     */
    getAgent(agentId: string): BaseAgent | undefined {
        return this.agents.get(agentId);
    }

    /**
     * Get all agents in a category
     */
    getAgentsByCategory(category: AgentRegistry['category']): AgentRegistry[] {
        return Array.from(this.registry.values()).filter(
            reg => reg.category === category
        );
    }

    /**
     * Get interaction history
     */
    getHistory(limit?: number): AgentInteraction[] {
        if (limit) {
            return this.history.slice(-limit);
        }
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Get registered agents summary
     */
    getSummary(): {
        totalAgents: number;
        byCategory: Record<string, number>;
        agents: Array<{ id: string; category: string; intents: number }>;
    } {
        const byCategory: Record<string, number> = {};
        const agents: Array<{ id: string; category: string; intents: number }> = [];

        this.registry.forEach((reg) => {
            byCategory[reg.category] = (byCategory[reg.category] || 0) + 1;
            agents.push({
                id: reg.id,
                category: reg.category,
                intents: reg.intents.length
            });
        });

        return {
            totalAgents: this.agents.size,
            byCategory,
            agents
        };
    }

    /**
     * Log orchestrator messages
     */
    private log(message: string): void {
        console.log(`[Orchestrator] ${message}`);
    }
}

// Global orchestrator instance (singleton)
let globalOrchestrator: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
    if (!globalOrchestrator) {
        globalOrchestrator = new AgentOrchestrator();
    }
    return globalOrchestrator;
}

export function resetOrchestrator(): void {
    globalOrchestrator = null;
}
