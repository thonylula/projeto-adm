

import React, { useState, useEffect, useMemo } from 'react';
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
import { MortalidadeConsumo } from './components/MortalidadeConsumo';
import { CampoViveiros } from './components/CampoViveiros';
import { Comparator } from './components/Comparator';
import { ShowcaseManager } from './components/ShowcaseManager';
import { PlansPrices } from './components/PlansPrices';
import { ReceiptManager } from './components/ReceiptManager';
import { TransferenciaProcessing } from './components/TransferenciaProcessing';
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
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('currentUser'));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentUser') || 'admin');

  // Showcase Mode (Public access)
  const isPublicShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';

  // Navigation State
  // Navigation State
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedTabs = params.get('tabs')?.split(',') || [];
    return params.get('tab') || (sharedTabs.length > 0 ? sharedTabs[0] : (localStorage.getItem('activeTab') || 'payroll'));
  });

  // Year/Month with persistence (Bypass cache for Showcases to ensure fresh view)
  const [activeYear, setActiveYear] = useState<number | null>(() => {
    const isShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';
    if (isShowcase) return new Date().getFullYear();

    const saved = localStorage.getItem('activeYear');
    return saved ? parseInt(saved) : new Date().getFullYear();
  });

  const [activeMonth, setActiveMonth] = useState<number | null>(() => {
    const isShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';
    if (isShowcase) return new Date().getMonth() + 1;

    const saved = localStorage.getItem('activeMonth');
    return saved ? parseInt(saved) : new Date().getMonth() + 1;
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(localStorage.getItem('activeCompanyId'));
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('isDarkMode') === 'true');

  // Persistence Effects
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('currentUser', currentUser);
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeYear) localStorage.setItem('activeYear', activeYear.toString());
  }, [activeYear]);

  useEffect(() => {
    if (activeMonth) localStorage.setItem('activeMonth', activeMonth.toString());
  }, [activeMonth]);

  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem('activeCompanyId', activeCompanyId);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
  }, [activeCompanyId]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

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

    // Initialize Multi-Agent System
    const initAgents = async () => {
      try {
        const { initializeAgents } = await import('./services/agentService');
        initializeAgents();
        console.log('🤖 Multi-Agent System initialized');
      } catch (error) {
        console.warn('Failed to initialize agents:', error);
      }
    };
    initAgents();

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

  // Auto-select first company for Public Showcase if none selected
  useEffect(() => {
    if (isPublicShowcase && companies.length > 0 && !activeCompanyId) {
      console.log("Public Showcase: Auto-selecting first company", companies[0].name);
      setActiveCompanyId(companies[0].id);
    }
  }, [isPublicShowcase, companies, activeCompanyId]);

  // Mesclar empresas CARAPITANGA para mostrar efetivados e diaristas juntos
  const activeCompany = useMemo(() => {
    const selected = companies.find(c => c.id === activeCompanyId);
    if (!selected) return undefined;

    // Se for uma empresa CARAPITANGA, mesclar com a outra CARAPITANGA
    if (selected.name.toUpperCase().includes('CARAPITANGA')) {
      const carapitangaCompanies = companies.filter(c =>
        c.name.toUpperCase().includes('CARAPITANGA')
      );

      if (carapitangaCompanies.length > 1) {
        // Ordenar por número de funcionários (menor primeiro = efetivados, maior = diaristas)
        const sorted = [...carapitangaCompanies].sort((a, b) => {
          const lenDiff = (a.employees?.length || 0) - (b.employees?.length || 0);
          if (lenDiff !== 0) return lenDiff;
          // Stable tie-breaker: ID to ensure consistent selection on refresh
          return (a.id || '').localeCompare(b.id || '');
        });

        const efetivadosCompany = sorted[0]; // Empresa com menos funcionários (4)
        const diaristasCompany = sorted[1]; // Empresa com mais funcionários (11)

        // Mesclar funcionários com identificação de tipo
        const mergedEmployees = [
          ...(efetivadosCompany.employees || []).map(emp => ({
            ...emp,
            input: { ...emp.input, employeeName: `${emp.input.employeeName} [Efetivado]` }
          })),
          ...(diaristasCompany.employees || []).map(emp => ({
            ...emp,
            input: { ...emp.input, employeeName: `${emp.input.employeeName} [Diarista]` }
          }))
        ];

        // Retornar empresa mesclada
        return {
          ...diaristasCompany, // Usar dados da empresa de diaristas como base
          employees: mergedEmployees
        };
      }
    }

    return selected;
  }, [companies, activeCompanyId]);

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

  // --- Public Showcase View (No login required) ---
  if (isPublicShowcase) {
    const params = new URLSearchParams(window.location.search);
    const sharedTabs = params.get('tabs')?.split(',') || [];

    // Ensure activeTab is one of the shared tabs, or default to first
    const effectiveTab = (sharedTabs.includes(activeTab)) ? activeTab : (sharedTabs[0] || 'showcase');

    return (
      <DashboardLayout
        activeTab={effectiveTab}
        onTabChange={(tab) => {
          // Allow switching only between shared tabs
          if (sharedTabs.includes(tab)) {
            setActiveTab(tab);
          }
        }}
        onLogout={() => { window.location.href = window.location.origin + window.location.pathname; }}
        currentUser="Visitante"
        isPublic={true}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      >
        {effectiveTab === 'showcase' && <DeliveryOrder initialView="SHOWCASE" isPublic={true} isDarkMode={isDarkMode} />}
        {effectiveTab === 'biometrics' && <BiometricsManager isPublic={true} isDarkMode={isDarkMode} />}
        {effectiveTab === 'payroll' && activeCompany && (
          <PayrollCard
            activeCompany={activeCompany}
            activeYear={activeYear}
            activeMonth={activeMonth}
            isPublic={true}
            onBack={() => { }}
            onAddEmployee={() => { }}
            onUpdateEmployee={() => { }}
            onDeleteEmployee={() => { }}
            onBulkUpdateEmployees={() => { }}
            onSaveBulk={() => { }}
          />
        )}
        {effectiveTab === 'mortalidade' && activeCompany && <MortalidadeConsumo activeCompany={activeCompany} activeYear={activeYear || new Date().getFullYear()} activeMonth={activeMonth || new Date().getMonth() + 1} isPublic={true} isDarkMode={isDarkMode} />}
        {effectiveTab === 'campo' && activeCompany && <CampoViveiros activeCompany={activeCompany} isPublic={true} isDarkMode={isDarkMode} />}
        {effectiveTab === 'transferencias' && <TransferenciaProcessing />}

        {/* Fallback if no company is selected but needed (Public view usually expects a default or selected company from context) */}
        {((effectiveTab === 'mortalidade' || effectiveTab === 'campo') && !activeCompany) && (
          <div className="text-center p-20">
            <h3 className="text-xl font-bold text-slate-400">Dados não disponíveis no momento.</h3>
          </div>
        )}
      </DashboardLayout>
    );
  }

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
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
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
          <BiometricsManager isDarkMode={isDarkMode} />
        )}

        {activeTab === 'fiscal' && (
          <OpeNatIdentifier />
        )}

        {activeTab === 'registrations' && (
          <RegistrationManager />
        )}

        {activeTab === 'delivery-order' && (
          <DeliveryOrder isDarkMode={isDarkMode} />
        )}

        {activeTab === 'pantry' && (
          <CestasBasicas />
        )}

        {activeTab === 'showcase' && (
          <ShowcaseManager />
        )}

        {/* Legacy/Direct support for Faturamento view inside Manager if needed */}
        {activeTab === 'showcase-faturamento' && (
          <DeliveryOrder initialView="SHOWCASE" isDarkMode={isDarkMode} />
        )}

        {activeTab === 'budget' && (
          <>
            {activeCompany ? (
              <BudgetPage activeCompany={activeCompany} />
            ) : (
              <CompanySelection
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
                title="Orçamentos e Cestas Básicas"
                description="Selecione uma empresa para gerenciar orçamentos e cestas."
                buttonText="Gerenciar Orçamentos"
              />
            )}
          </>
        )}

        {activeTab === 'mortalidade' && (
          <>
            {activeCompany ? (
              <MortalidadeConsumo
                activeCompany={activeCompany}
                activeYear={activeYear || new Date().getFullYear()}
                activeMonth={activeMonth || new Date().getMonth() + 1}
                isDarkMode={isDarkMode}
              />
            ) : (
              <CompanySelection
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
                title="Mortalidade e Consumo"
                description="Selecione uma empresa para gerenciar o controle de mortalidade."
                buttonText="Gerenciar Mortalidade"
              />
            )}
          </>
        )}

        {activeTab === 'comparator' && (
          <Comparator />
        )}

        {activeTab === 'receipts' && (
          <>
            {activeCompany ? (
              <ReceiptManager
                activeCompany={activeCompany}
                onBack={() => setActiveTab('payroll')}
              />
            ) : (
              <CompanySelection
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
                title="Recibos Avulsos"
                description="Selecione uma empresa para gerar recibos avulsos."
                buttonText="Gerenciar Recibos"
              />
            )}
          </>
        )}

        {activeTab === 'campo' && (
          <>
            {activeCompany ? (
              <CampoViveiros activeCompany={activeCompany} isDarkMode={isDarkMode} />
            ) : (
              <CompanySelection
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onSelectCompany={handleSelectCompany}
                title="Campo/Viveiros"
                description="Selecione uma empresa para gerenciar os viveiros."
                buttonText="Gerenciar Viveiros"
              />
            )}
          </>
        )}

        {activeTab === 'plans' && (
          <PlansPrices />
        )}

        {activeTab === 'transferencias' && (
          <TransferenciaProcessing />
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
