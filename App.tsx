
import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { DashboardLayout } from './components/DashboardLayout';
import { CompanySelection } from './components/CompanySelection';
import { PayrollCard } from './components/PayrollCard';
import { LoginScreen } from './components/LoginScreen';
import { BiometricsManager } from './components/BiometricsManager';
import { OpeNatIdentifier } from './components/OpeNatIdentifier';
import { RegistrationManager } from './components/RegistrationManager';
import { DeliveryOrder } from './components/DeliveryOrder';
import { CestasBasicas } from './components/CestasBasicas';
import { Company, PayrollHistoryItem } from './types';
import { SupabaseService } from './services/supabaseService';

// Helper for ID generation
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) { }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('admin');

  // Navigation State
  const [activeTab, setActiveTab] = useState('payroll');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  // Load initial state from Supabase on mount
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const data = await SupabaseService.getCompanies();
        if (data && data.length > 0) {
          setCompanies(data);
        } else {
          // Fallback to localStorage for migration if no companies in Supabase
          const saved = localStorage.getItem('folha_companies');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCompanies(parsed.map((c: any) => ({
                ...c,
                employees: Array.isArray(c.employees) ? c.employees : []
              })));
              // Trigger migration alert? Or just let it stay in state.
            }
          }
        }
      } catch (e) {
        console.error("Failed to load companies from Supabase", e);
      }
    };

    loadFromSupabase();

    // Listen for storage changes (for local sync)
    window.addEventListener('storage', loadFromSupabase);
    window.addEventListener('app-data-updated', loadFromSupabase);

    // Listen for direct navigation requests from the AI Assistant
    const handleNavigation = (e: any) => {
      const { tab, companyId } = e.detail;
      if (tab) setActiveTab(tab);
      if (companyId) setActiveCompanyId(companyId);
    };
    window.addEventListener('app-navigation', handleNavigation);

    return () => {
      window.removeEventListener('storage', loadFromSupabase);
      window.removeEventListener('app-data-updated', loadFromSupabase);
      window.removeEventListener('app-navigation', handleNavigation);
    };
  }, []);

  // Sync to localStorage as backup? (Optional, maybe skip if fully migrated)
  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem('folha_companies', JSON.stringify(companies));
    }
  }, [companies]);

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  // --- Handlers ---

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveCompanyId(null);
    setActiveTab('payroll');
  };

  const handleAddCompany = async (name: string, cnpj: string | undefined, logoUrl: string | null) => {
    const newComp = await SupabaseService.addCompany(name, cnpj, logoUrl);
    if (newComp) {
      setCompanies([...companies, newComp]);
    } else {
      // Fallback local if Supabase fails
      const localComp: Company = {
        id: generateId(),
        name,
        cnpj,
        logoUrl,
        employees: []
      };
      setCompanies([...companies, localComp]);
    }
  };

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
  };

  const handleUpdateCompany = async (updatedCompany: Company) => {
    const success = await SupabaseService.updateCompany(updatedCompany);
    if (success) {
      setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa? Todos os dados da folha serão perdidos.')) {
      const success = await SupabaseService.deleteCompany(id);
      if (success) {
        setCompanies(prev => prev.filter(c => c.id !== id));
        if (activeCompanyId === id) setActiveCompanyId(null);
      }
    }
  };

  const handleBackToSelection = () => {
    setActiveCompanyId(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'payroll') {
      setActiveCompanyId(null);
    }
  };

  // --- Employee CRUD Handlers ---

  const handleAddEmployee = async (newItem: PayrollHistoryItem) => {
    if (!activeCompanyId) return;

    const success = await SupabaseService.addPayrollItem(activeCompanyId, newItem);
    if (success) {
      setCompanies(prev => prev.map(company => {
        if (company.id === activeCompanyId) {
          return {
            ...company,
            employees: [newItem, ...(company.employees || [])]
          };
        }
        return company;
      }));
    }
  };

  const handleUpdateEmployee = async (updatedItem: PayrollHistoryItem) => {
    if (!activeCompanyId) return;

    const success = await SupabaseService.updatePayrollItem(updatedItem);
    if (success) {
      setCompanies(prev => prev.map(company => {
        if (company.id === activeCompanyId) {
          return {
            ...company,
            employees: (company.employees || []).map(emp =>
              emp.id === updatedItem.id ? updatedItem : emp
            )
          };
        }
        return company;
      }));
    }
  };

  const handleDeleteEmployee = async (itemId: string) => {
    if (!activeCompanyId) return;

    const success = await SupabaseService.deletePayrollItem(itemId);
    if (success) {
      setCompanies(prev => prev.map(company => {
        if (company.id === activeCompanyId) {
          return {
            ...company,
            employees: (company.employees || []).filter(emp => emp.id !== itemId)
          };
        }
        return company;
      }));
    }
  };

  const handleBulkUpdateEmployees = (newEmployees: PayrollHistoryItem[]) => {
    // This is mostly used for local state updates if needed, 
    // but a real bulk update to Supabase would be different.
    // For now, let's keep it as is or log a warning.
    if (!activeCompanyId) return;
    setCompanies(prev => prev.map(company => {
      if (company.id === activeCompanyId) {
        return { ...company, employees: newEmployees };
      }
      return company;
    }));
  };

  // Render Login Screen (Wrapped in MainLayout for aesthetics)
  if (!isAuthenticated) {
    return (
      <MainLayout>
        <LoginScreen onLogin={(user) => handleLogin(user)} />
      </MainLayout>
    );
  }

  // Error Boundary for rendering content
  try {
    return (
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        currentUser={currentUser}
      >
        {activeTab === 'payroll' && (
          <>
            {activeCompany ? (
              <PayrollCard
                activeCompany={activeCompany}
                onBack={handleBackToSelection}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onBulkUpdateEmployees={handleBulkUpdateEmployees}
              />
            ) : (
              <CompanySelection
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
              />
            )}
          </>
        )}

        {activeTab === 'biometrics' && (
          <BiometricsManager />
        )}

        {activeTab === 'fiscal' && (
          <OpeNatIdentifier />
        )}

        {activeTab === 'registrations' && (
          <RegistrationManager />
        )}

        {activeTab === 'delivery-order' && (
          <DeliveryOrder />
        )}

        {activeTab === 'pantry' && (
          <CestasBasicas />
        )}
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Critical Render Error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Ocorreu um erro inesperado</h1>
        <p className="text-gray-700 mb-4">Tente recarregar a página ou limpar os dados do navegador.</p>
        <button
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Limpar Dados e Recarregar
        </button>
      </div>
    )
  }
}
