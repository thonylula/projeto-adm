import { getOrchestrator } from '../agents/base/AgentOrchestrator';
import {
    ReceiptExtractionAgent,
    ReceiptValidationAgent,
    ReceiptGenerationAgent
} from '../agents/receipts';

/**
 * Initialize all agents and register them with the orchestrator
 * This should be called once on application startup
 */
export function initializeAgents(): void {
    const orchestrator = getOrchestrator();

    // Register Receipt Agents
    orchestrator.registerAgent('receipt-extraction', new ReceiptExtractionAgent(), {
        category: 'receipts',
        intents: ['extract-receipt'],
        description: 'Extracts receipt data from images using AI'
    });

    orchestrator.registerAgent('receipt-validation', new ReceiptValidationAgent(), {
        category: 'receipts',
        intents: ['validate-receipt'],
        description: 'Validates and enriches receipt data'
    });

    orchestrator.registerAgent('receipt-generation', new ReceiptGenerationAgent(), {
        category: 'receipts',
        intents: ['generate-receipt'],
        description: 'Generates formatted receipts and saves to database'
    });

    // Log summary
    const summary = orchestrator.getSummary();
    console.log('🤖 Agent System Initialized:');
    console.log(`  Total Agents: ${summary.totalAgents}`);
    console.log('  By Category:', summary.byCategory);
}

/**
 * Get the global orchestrator instance
 */
export { getOrchestrator };
