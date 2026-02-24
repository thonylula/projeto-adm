import { AgentOrchestrator } from '../agents/base/AgentOrchestrator';
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
import {
    BiometryDataAgent,
    BiometryAnalysisAgent,
    BiometryReportAgent,
    BiometryStorageAgent
} from '../agents/biometry';
import {
    InvoiceExtractionAgent,
    BasketAllocationAgent,
    BasketValidationAgent,
    BasketReportAgent,
    BasketStorageAgent
} from '../agents/baskets';
import {
    MortalityDataAgent,
    GrowthPredictionAgent,
    MortalityReportAgent,
    MortalityStorageAgent
} from '../agents/mortality';
import {
    PondMapAgent,
    PondDataAgent,
    PondAnalyticsAgent
} from '../agents/ponds';
import {
    DeliveryOrderAgent,
    DeliveryDocumentAgent,
    DeliveryStorageAgent
} from '../agents/delivery';
import {
    RegistrationDataAgent,
    RegistrationStorageAgent
} from '../agents/registration';
import {
    TaxIdentificationAgent,
    TaxReportAgent
} from '../agents/tax';
import {
    BudgetManagementAgent,
    ComparisonAgent,
    ShowcaseAgent,
    PricingAgent
} from '../agents/misc';

/**
 * Initialize all agents and register them with the orchestrator
 */
export function initializeAgents(orchestrator?: AgentOrchestrator): void {
    const target = orchestrator || getOrchestrator();

    // Check if already initialized to avoid duplicate registrations
    if (target.getSummary().totalAgents > 0) return;

    // ========== RECEIPTS AGENTS ==========
    target.registerAgent('receipt-extraction', new ReceiptExtractionAgent(), {
        category: 'receipts',
        intents: ['extract-receipt'],
        description: 'Extracts data from payment receipt images'
    });

    target.registerAgent('receipt-validation', new ReceiptValidationAgent(), {
        category: 'receipts',
        intents: ['validate-receipt'],
        description: 'Validates receipt data and converts values to words'
    });

    target.registerAgent('receipt-generation', new ReceiptGenerationAgent(), {
        category: 'receipts',
        intents: ['generate-receipt'],
        description: 'Generates formatted receipt data for persistence'
    });

    // ========== PAYROLL AGENTS ==========
    target.registerAgent('payroll-calculation', new PayrollCalculationAgent(), {
        category: 'payroll',
        intents: ['calculate-payroll'],
        description: 'Calculates payroll values and taxes'
    });

    target.registerAgent('payroll-validation', new PayrollValidationAgent(), {
        category: 'payroll',
        intents: ['validate-payroll'],
        description: 'Validates payroll data for consistency'
    });

    target.registerAgent('payroll-upload', new PayrollSmartUploadAgent(), {
        category: 'payroll',
        intents: ['upload-payroll'],
        description: 'Processes bulk payroll uploads'
    });

    target.registerAgent('payroll-report', new PayrollReportAgent(), {
        category: 'payroll',
        intents: ['generate-payroll-report'],
        description: 'Generates payroll summary reports'
    });

    target.registerAgent('payroll-storage', new PayrollStorageAgent(), {
        category: 'payroll',
        intents: ['store-payroll'],
        description: 'Manages payroll data persistence in Supabase'
    });

    // ========== BIOMETRY AGENTS ==========
    target.registerAgent('biometry-data', new BiometryDataAgent(), {
        category: 'biometry',
        intents: ['extract-biometry-data'],
        description: 'Extracts biometry data from images or spreadsheets'
    });

    target.registerAgent('biometry-analysis', new BiometryAnalysisAgent(), {
        category: 'biometry',
        intents: ['analyze-biometry'],
        description: 'Calculates growth performance metrics'
    });

    target.registerAgent('biometry-report', new BiometryReportAgent(), {
        category: 'biometry',
        intents: ['generate-biometry-report'],
        description: 'Generates biological performance reports'
    });

    target.registerAgent('biometry-storage', new BiometryStorageAgent(), {
        category: 'biometry',
        intents: ['store-biometry'],
        description: 'Manages biometry data persistence in Supabase'
    });

    // ========== BASKET AGENTS ==========
    target.registerAgent('basket-extraction', new InvoiceExtractionAgent(), {
        category: 'baskets',
        intents: ['extract-invoice'],
        description: 'Extracts items and prices from food supply invoices'
    });

    target.registerAgent('basket-allocation', new BasketAllocationAgent(), {
        category: 'baskets',
        intents: ['allocate-baskets'],
        description: 'Calculates basket distribution among employees'
    });

    target.registerAgent('basket-validation', new BasketValidationAgent(), {
        category: 'baskets',
        intents: ['validate-basket-allocation'],
        description: 'Audits and validates basket distribution'
    });

    target.registerAgent('basket-report', new BasketReportAgent(), {
        category: 'baskets',
        intents: ['generate-basket-report'],
        description: 'Generates distribution reports and checklists'
    });

    target.registerAgent('basket-storage', new BasketStorageAgent(), {
        category: 'baskets',
        intents: ['store-basket-config'],
        description: 'Manages basket configs and item rules in Supabase'
    });

    // ========== MORTALITY AGENTS ==========
    target.registerAgent('mortality-data', new MortalityDataAgent(), {
        category: 'mortality',
        intents: ['record-mortality'],
        description: 'Extracts mortality and feed data from field sheets'
    });

    target.registerAgent('mortality-prediction', new GrowthPredictionAgent(), {
        category: 'mortality',
        intents: ['predict-harvest'],
        description: 'Predicts harvest dates and growth curves'
    });

    target.registerAgent('mortality-report', new MortalityReportAgent(), {
        category: 'mortality',
        intents: ['generate-mortality-report'],
        description: 'Generates biological alerts and management summaries'
    });

    target.registerAgent('mortality-storage', new MortalityStorageAgent(), {
        category: 'mortality',
        intents: ['store-mortality-data'],
        description: 'Manages mortality and feed data persistence in Supabase'
    });

    // ========== POND AGENTS ==========
    target.registerAgent('pond-map', new PondMapAgent(), {
        category: 'ponds',
        intents: ['analyze-pond-map'],
        description: 'Spatial intelligence for pond map and layout'
    });

    target.registerAgent('pond-data', new PondDataAgent(), {
        category: 'ponds',
        intents: ['extract-pond-data'],
        description: 'Extracts technical parameters from pond reports'
    });

    target.registerAgent('pond-analytics', new PondAnalyticsAgent(), {
        category: 'ponds',
        intents: ['analyze-pond-health'],
        description: 'Correlates performance metrics for pond health scoring'
    });

    // ========== DELIVERY AGENTS ==========
    target.registerAgent('delivery-order', new DeliveryOrderAgent(), {
        category: 'delivery',
        intents: ['extract-delivery-order'],
        description: 'Extracts harvest data from despesca documents'
    });

    target.registerAgent('delivery-document', new DeliveryDocumentAgent(), {
        category: 'delivery',
        intents: ['generate-delivery-document'],
        description: 'Generates professional billing emails and documents'
    });

    target.registerAgent('delivery-storage', new DeliveryStorageAgent(), {
        category: 'delivery',
        intents: ['store-delivery-data'],
        description: 'Manages persistence for delivery orders in Supabase'
    });

    // ========== REGISTRATION AGENTS ==========
    target.registerAgent('registration-data', new RegistrationDataAgent(), {
        category: 'registration',
        intents: ['extract-registration-data'],
        description: 'Extracts data from ID documents (RG, CNH, CNPJ)'
    });

    target.registerAgent('registration-storage', new RegistrationStorageAgent(), {
        category: 'registration',
        intents: ['store-registration-data'],
        description: 'Manages persistence for registrations (Employees, Suppliers, Clients)'
    });

    // ========== TAX AGENTS ==========
    target.registerAgent('tax-identification', new TaxIdentificationAgent(), {
        category: 'tax',
        intents: ['identify-tax'],
        description: 'Identifies nature of operation and tax classification'
    });

    target.registerAgent('tax-report', new TaxReportAgent(), {
        category: 'tax',
        intents: ['generate-tax-report'],
        description: 'Generates consolidated tax reports'
    });

    // ========== MISC AGENTS ==========
    target.registerAgent('budget-management', new BudgetManagementAgent(), {
        category: 'misc',
        intents: ['manage-budget', 'calculate-roi'],
        description: 'Manages budgets and calculates ROI'
    });

    target.registerAgent('comparison', new ComparisonAgent(), {
        category: 'misc',
        intents: ['compare-documents'],
        description: 'Audits and compares documents/data'
    });

    target.registerAgent('showcase', new ShowcaseAgent(), {
        category: 'misc',
        intents: ['generate-showcase', 'summarize-showcase'],
        description: 'Generates executive summaries for showcase'
    });

    target.registerAgent('pricing', new PricingAgent(), {
        category: 'misc',
        intents: ['suggest-pricing', 'manage-pricing'],
        description: 'Suggests best plans and ROI'
    });

    // Log summary
    const summary = target.getSummary();
    console.log('🤖 Agent System Initialized:');
    console.log(`  Total Agents: ${summary.totalAgents}`);
    console.log('  By Category:', summary.byCategory);
}

// Global orchestrator instance (singleton)
let globalOrchestrator: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
    if (!globalOrchestrator) {
        globalOrchestrator = new AgentOrchestrator();
        // Since initializeAgents calls getOrchestrator(), we need to be careful.
        // But with the guard clause at the start of initializeAgents, it's safe.
        initializeAgents(globalOrchestrator);
    }
    return globalOrchestrator;
}
