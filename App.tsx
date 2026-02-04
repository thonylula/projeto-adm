
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
import { showToast, ErrorBoundary } from './components/shared';
import { useAppContext } from './store/AppContext';

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
  const {
    isAuthenticated, currentUser, activeTab, activeYear, activeMonth, companies, activeCompanyId, activeCompany, isDarkMode, isPublicShowcase,
    setIsAuthenticated, setCurrentUser, setActiveTab, setActiveYear, setActiveMonth, setCompanies, setActiveCompanyId, setIsDarkMode,
    handleLogin, handleLogout, handleAddCompany, handleUpdateCompany, handleDeleteCompany, handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee, handleBulkUpdateEmployees, handleSaveBulkEmployees, loadFromSupabase
  } = useAppContext();

  // Load initial agents
  useEffect(() => {
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
      window.removeEventListener('app-navigation', handleNavigation);
    };
  }, []);

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
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
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-lg">
            <div className="bg-white border-2 border-amber-400 p-6 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-800 font-black uppercase tracking-tight">
                      Configuração do Banco de Dados Necessária
                    </p>
                    <p className="text-xs text-slate-500">
                      As chaves VITE_SUPABASE não foram encontradas. Insira-as abaixo para conectar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Supabase URL</label>
                    <input
                      id="setup-url"
                      type="text"
                      placeholder="https://xxx.supabase.co"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Anon Key / Service Role</label>
                    <input
                      id="setup-key"
                      type="password"
                      placeholder="eyJhbG..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const url = (document.getElementById('setup-url') as HTMLInputElement).value;
                    const key = (document.getElementById('setup-key') as HTMLInputElement).value;
                    if (url && key) {
                      import('./supabaseClient').then(m => m.updateSupabaseConfig(url, key));
                    } else {
                      alert('Por favor, preencha ambos os campos.');
                    }
                  }}
                  className="w-full py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                >
                  Conectar ao Banco de Dados
                </button>
                <p className="text-[9px] text-slate-400 italic text-center">Essas chaves ficarão salvas apenas no seu navegador atual.</p>
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
          <ErrorBoundary section="Folha Salarial" inline>
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
          </ErrorBoundary>
        )}

        {activeTab === 'biometrics' && (
          <ErrorBoundary section="Biometrias" inline>
            <BiometricsManager isDarkMode={isDarkMode} />
          </ErrorBoundary>
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
          <ErrorBoundary section="Mortalidade e Consumo" inline>
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
          </ErrorBoundary>
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
          <ErrorBoundary section="Campo/Viveiros" inline>
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
          </ErrorBoundary>
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
