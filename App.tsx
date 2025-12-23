
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
import { BudgetPage } from './components/BudgetPage';
import { Comparator } from './components/Comparator';
import { Company, PayrollHistoryItem } from './types';
import { SupabaseService } from './services/supabaseService';
import { isSupabaseConfigured } from './supabaseClient';

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
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  // Load initial state from Supabase on mount
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        const data = await SupabaseService.getCompanies();
        if (data && data.length > 0) {
          setCompanies(data);
        }
      } catch (e) {
        console.error("Failed to load companies from Supabase", e);
      }
    };

    loadFromSupabase();

    // Listen for data updates (from AI Assistant or other components)
    window.addEventListener('app-data-updated', loadFromSupabase);

    // Listen for direct navigation requests from the AI Assistant
    const handleNavigation = (e: any) => {
      const { tab, companyId, year, month } = e.detail;
      if (tab) setActiveTab(tab);
      if (companyId) setActiveCompanyId(companyId);
      if (year) setActiveYear(year);
      if (month) setActiveMonth(month);
    };
    window.addEventListener('app-navigation', handleNavigation);

    return () => {
      window.removeEventListener('app-data-updated', loadFromSupabase);
      window.removeEventListener('app-navigation', handleNavigation);
    };
  }, []);

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
    if (!activeCompanyId) return;
    setCompanies(prev => prev.map(company => {
      if (company.id === activeCompanyId) {
        return { ...company, employees: newEmployees };
      }
      return company;
    }));
  };

  const handleSaveBulkEmployees = async (newEmployees: PayrollHistoryItem[]) => {
    if (!activeCompanyId) return;
    const success = await SupabaseService.saveBulkPayrollItems(activeCompanyId, newEmployees);
    if (success) {
      alert("Folha salva com sucesso no banco de dados!");
      handleBulkUpdateEmployees(newEmployees);
    } else {
      alert("Erro ao salvar a folha no banco de dados.");
    }
  };

  // Render Login Screen (Wrapped in MainLayout for aesthetics)
  if (!isAuthenticated) {
    return (
      <MainLayout>
        {!isSupabaseConfigured && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg shadow-2xl animate-bounce">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700 font-bold">
                    Conexão Supabase Necessária
                  </p>
                  <p className="text-xs text-amber-600">
                    O app está rodando sem banco de dados. Configure as chaves VITE_SUPABASE em seu .env.local ou Vercel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                activeYear={activeYear}
                activeMonth={activeMonth}
                onBack={handleBackToSelection}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onBulkUpdateEmployees={handleBulkUpdateEmployees}
                onSaveBulk={handleSaveBulkEmployees}
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

        {activeTab === 'budget' && (
          <BudgetPage activeCompany={activeCompany} />
        )}

        {activeTab === 'comparator' && (
          <Comparator />
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
