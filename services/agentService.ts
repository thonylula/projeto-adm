import { getOrchestrator } from '../agents/base/AgentOrchestrator';
import {
    ReceiptExtractionAgent,
    ReceiptValidationAgent,
    ReceiptGenerationAgent
} from '../agents/receipts';
import {
    PayrollCalculationAgent,
    PayrollValidationAgent,
    PayrollSmartUploadAgent,
    PayrollReportAgent,
    PayrollStorageAgent
} from '../agents/payroll';

/**
 * Initialize all agents and register them with the orchestrator
 * This should be called once on application startup
 */
export function initializeAgents(): void {
    const orchestrator = getOrchestrator();

    // ========== RECEIPT AGENTS ==========
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

    // ========== PAYROLL AGENTS ==========
    orchestrator.registerAgent('payroll-calculation', new PayrollCalculationAgent(), {
        category: 'payroll',
        intents: ['calculate-payroll'],
        description: 'Calculates payroll with CLT rules'
    });

    orchestrator.registerAgent('payroll-validation', new PayrollValidationAgent(), {
        category: 'payroll',
        intents: ['validate-payroll'],
        description: 'Validates payroll data against legal requirements'
    });

    orchestrator.registerAgent('payroll-smart-upload', new PayrollSmartUploadAgent(), {
        category: 'payroll',
        intents: ['upload-payroll'],
        description: 'Extracts payroll data from uploaded documents'
    });

    orchestrator.registerAgent('payroll-report', new PayrollReportAgent(), {
        category: 'payroll',
        intents: ['generate-payroll-report'],
        description: 'Generates formatted payroll reports and payslips'
    });

    orchestrator.registerAgent('payroll-storage', new PayrollStorageAgent(), {
        category: 'payroll',
        intents: ['store-payroll'],
        description: 'Manages payroll data persistence in Supabase'
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
