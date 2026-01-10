import { BaseAgent } from '../base/BaseAgent';
import { PayrollHistoryItem } from '../../types';
import { SupabaseService } from '../../services/supabaseService';

export interface PayrollStorageResult {
    success: boolean;
    itemId?: string;
    message?: string;
}

/**
 * Payroll Storage Agent
 * Specializes in persisting payroll data to Supabase
 */
export class PayrollStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PayrollStorageAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em gerenciamento de dados de folha de pagamento.

Suas responsabilidades:
- Validar dados antes de persistir
- Gerenciar histórico de folhas de pagamento
- Garantir integridade referencial (empresa, funcionário)
- Aplicar regras de auditoria (quem criou, quando, modificações)
- Backup e recuperação de dados

Regras de persistência:
- Sempre associar à empresa correta
- Manter histórico completo (não sobrescrever)
- Validar unicidade (um registro por mês/funcionário)
- Registrar metadados (timestamp, usuário)`,
            temperature: 0.1
        });
    }

    async process(data: {
        action: 'add' | 'update' | 'delete' | 'bulk-save';
        companyId: string;
        item?: PayrollHistoryItem;
        items?: PayrollHistoryItem[];
    }): Promise<PayrollStorageResult> {
        this.log(`Storage action: ${data.action}`);
        this.validateInput(data, ['action', 'companyId']);

        try {
            switch (data.action) {
                case 'add':
                    return await this.addItem(data.companyId, data.item!);

                case 'update':
                    return await this.updateItem(data.item!);

                case 'delete':
                    return await this.deleteItem(data.item!.id);

                case 'bulk-save':
                    return await this.bulkSave(data.companyId, data.items!);

                default:
                    throw new Error(`Unknown action: ${data.action}`);
            }
        } catch (error) {
            this.log(`Storage failed: ${error}`, 'error');
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async addItem(companyId: string, item: PayrollHistoryItem): Promise<PayrollStorageResult> {
        const success = await SupabaseService.addPayrollItem(companyId, item);

        if (success) {
            this.log('Payroll item added successfully');
            return {
                success: true,
                itemId: item.id,
                message: 'Item adicionado com sucesso'
            };
        } else {
            throw new Error('Failed to add payroll item');
        }
    }

    private async updateItem(item: PayrollHistoryItem): Promise<PayrollStorageResult> {
        const success = await SupabaseService.updatePayrollItem(item);

        if (success) {
            this.log('Payroll item updated successfully');
            return {
                success: true,
                itemId: item.id,
                message: 'Item atualizado com sucesso'
            };
        } else {
            throw new Error('Failed to update payroll item');
        }
    }

    private async deleteItem(itemId: string): Promise<PayrollStorageResult> {
        const success = await SupabaseService.deletePayrollItem(itemId);

        if (success) {
            this.log('Payroll item deleted successfully');
            return {
                success: true,
                itemId,
                message: 'Item deletado com sucesso'
            };
        } else {
            throw new Error('Failed to delete payroll item');
        }
    }

    private async bulkSave(companyId: string, items: PayrollHistoryItem[]): Promise<PayrollStorageResult> {
        this.log(`Bulk saving ${items.length} items`);

        const success = await SupabaseService.saveBulkPayrollItems(companyId, items);

        if (success) {
            this.log(`Bulk save completed: ${items.length} items`);
            return {
                success: true,
                message: `${items.length} itens salvos com sucesso`
            };
        } else {
            throw new Error('Failed to bulk save items');
        }
    }
}
