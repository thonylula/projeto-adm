
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

  // Load initial state from localStorage on mount (Client-side only)
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const saved = localStorage.getItem('folha_companies');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCompanies(parsed.map((c: any) => ({
              ...c,
              employees: Array.isArray(c.employees) ? c.employees : []
            })));
          }
        }
      } catch (e) {
        console.error("Failed to load companies from storage", e);
      }
    };

    loadFromStorage();

    // Listen for storage changes (for local sync)
    window.addEventListener('storage', loadFromStorage);
    window.addEventListener('app-data-updated', loadFromStorage);

    // Listen for direct navigation requests from the AI Assistant
    const handleNavigation = (e: any) => {
      const { tab, companyId } = e.detail;
      if (tab) setActiveTab(tab);
      if (companyId) setActiveCompanyId(companyId);
    };
    window.addEventListener('app-navigation', handleNavigation);

    return () => {
      window.removeEventListener('storage', loadFromStorage);
      window.removeEventListener('app-data-updated', loadFromStorage);
      window.removeEventListener('app-navigation', handleNavigation);
    };
  }, []);

  // Persist companies on change
  useEffect(() => {
    localStorage.setItem('folha_companies', JSON.stringify(companies));
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

  const handleAddCompany = (name: string, cnpj: string | undefined, logoUrl: string | null) => {
    const newCompany: Company = {
      id: generateId(),
      name,
      cnpj,
      logoUrl,
      employees: []
    };
    setCompanies([...companies, newCompany]);
  };

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
  };

  const handleUpdateCompany = (updatedCompany: Company) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
  };

  const handleDeleteCompany = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa? Todos os dados da folha serão perdidos.')) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      if (activeCompanyId === id) setActiveCompanyId(null);
    }
  };

  const handleBackToSelection = () => {
    setActiveCompanyId(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Logic to reset states when switching tabs if needed
    if (tab === 'payroll') {
      // We keep the activeCompany if already selected, 
      // OR the user can press "Back" in the PayrollCard to go to selection.
      // If you want "Folha Salarial" to ALWAYS go to list:
      setActiveCompanyId(null);
    }
  };

  // --- Employee CRUD Handlers ---

  const handleAddEmployee = (newItem: PayrollHistoryItem) => {
    if (!activeCompanyId) return;

    setCompanies(prev => prev.map(company => {
      if (company.id === activeCompanyId) {
        return {
          ...company,
          // Add new item to the start of the list
          employees: [newItem, ...(company.employees || [])] // Safety check
        };
      }
      return company;
    }));
  };

  const handleUpdateEmployee = (updatedItem: PayrollHistoryItem) => {
    if (!activeCompanyId) return;

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
  };

  const handleDeleteEmployee = (itemId: string) => {
    if (!activeCompanyId) return;

    setCompanies(prev => prev.map(company => {
      if (company.id === activeCompanyId) {
        return {
          ...company,
          employees: (company.employees || []).filter(emp => emp.id !== itemId)
        };
      }
      return company;
    }));
  };

  const handleBulkUpdateEmployees = (newEmployees: PayrollHistoryItem[]) => {
    if (!activeCompanyId) return;

    setCompanies(prev => prev.map(company => {
      if (company.id === activeCompanyId) {
        return {
          ...company,
          employees: newEmployees
        };
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
