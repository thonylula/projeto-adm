import { SupabaseService } from './supabaseService';
import { Company, RegistryEmployee, RegistrySupplier, RegistryClient, ItemConfiguration } from '../types';

/**
 * Service to migrate from localStorage to Supabase.
 */
export const MigrationService = {
    async migrateAll(): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Migrate Companies and their Payroll History
            const storedCompanies = localStorage.getItem('folha_companies');
            if (storedCompanies) {
                const companies: Company[] = JSON.parse(storedCompanies);
                for (const company of companies) {
                    const newComp = await SupabaseService.addCompany(company.name, company.cnpj, company.logoUrl);
                    if (newComp && company.employees && company.employees.length > 0) {
                        for (const item of company.employees) {
                            await SupabaseService.addPayrollItem(newComp.id, item);
                        }
                    }
                }
            }

            // 2. Migrate Registry Employees
            const storedEmployees = localStorage.getItem('folha_registry_employees');
            if (storedEmployees) {
                const employees: RegistryEmployee[] = JSON.parse(storedEmployees);
                for (const emp of employees) {
                    await SupabaseService.saveEmployee(emp);
                }
            }

            // 3. Migrate Registry Suppliers
            const storedSuppliers = localStorage.getItem('folha_registry_suppliers');
            if (storedSuppliers) {
                const suppliers: RegistrySupplier[] = JSON.parse(storedSuppliers);
                for (const sup of suppliers) {
                    await SupabaseService.saveSupplier(sup);
                }
            }

            // 4. Migrate Registry Clients
            const storedClients = localStorage.getItem('folha_registry_clients');
            if (storedClients) {
                const clients: RegistryClient[] = JSON.parse(storedClients);
                for (const cli of clients) {
                    await SupabaseService.saveClient(cli);
                }
            }

            // 5. Migrate Basket Item Configs
            const storedConfigs = localStorage.getItem('folha_basket_item_configs');
            if (storedConfigs) {
                const configs: ItemConfiguration[] = JSON.parse(storedConfigs);
                await SupabaseService.saveBasketConfigs(configs);
            }

            // 6. Migrate Biometrics
            const storedBio = localStorage.getItem('biometrics_db');
            if (storedBio) {
                const bio = JSON.parse(storedBio);
                await SupabaseService.saveBiometrics(bio);
            }

            // 7. Migrate Delivery Orders
            const storedDO = localStorage.getItem('delivery_order_db');
            const storedDOLogo = localStorage.getItem('delivery_order_logo');
            if (storedDO) {
                const doData = JSON.parse(storedDO);
                await SupabaseService.saveDeliveryOrders(doData, storedDOLogo);
            }

            // 8. Migrate Users
            const storedUsers = localStorage.getItem('folha_users');
            if (storedUsers) {
                const users = JSON.parse(storedUsers);
                for (const u of users) {
                    await SupabaseService.saveUser(u.username, u.password);
                }
            }

            return { success: true, message: "Migração concluída com sucesso!" };
        } catch (error) {
            console.error("Migration error:", error);
            return { success: false, message: "Erro durante a migração. Verifique o console." };
        }
    }
};
