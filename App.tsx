
import React, { useEffect } from 'react';
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
import { isSupabaseConfigured } from './supabaseClient';
import { ErrorBoundary } from './components/shared';
import { useAppContext } from './store/AppContext';

export default function App() {
  const {
    isAuthenticated, currentUser, activeTab, activeYear, activeMonth, companies,
    activeCompany, isDarkMode, isPublicShowcase, setActiveTab, setActiveCompanyId,
    setActiveYear, setActiveMonth, setIsAuthenticated, setIsDarkMode,
    handleLogin, handleLogout, handleAddCompany, handleUpdateCompany, handleDeleteCompany,
    handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee, handleBulkUpdateEmployees,
    handleSaveBulkEmployees, loadFromSupabase
  } = useAppContext();

  // Initialize Multi-Agent System and Navigation Listeners
  useEffect(() => {
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

    const handleNavigation = (e: any) => {
      const { tab, companyId, year, month } = e.detail;
      if (tab) setActiveTab(tab);
      if (companyId) setActiveCompanyId(companyId);
      if (year) setActiveYear(year);
      if (month) setActiveMonth(month);
    };

    window.addEventListener('app-navigation', handleNavigation);
    return () => window.removeEventListener('app-navigation', handleNavigation);
  }, [setActiveTab, setActiveCompanyId, setActiveYear, setActiveMonth]);

  // --- Public Showcase View ---
  if (isPublicShowcase) {
    const params = new URLSearchParams(window.location.search);
    const sharedTabs = params.get('tabs')?.split(',') || [];
    const effectiveTab = (sharedTabs.includes(activeTab)) ? activeTab : (sharedTabs[0] || 'showcase');

    return (
      <DashboardLayout
        activeTab={effectiveTab}
        onTabChange={(tab) => sharedTabs.includes(tab) && setActiveTab(tab)}
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

        {((effectiveTab === 'mortalidade' || effectiveTab === 'campo') && !activeCompany) && (
          <div className="text-center p-20">
            <h3 className="text-xl font-bold text-slate-400">Dados não disponíveis no momento.</h3>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Render Login Screen
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
                  <p className="text-sm text-amber-700 font-bold">Conexão Supabase Necessária</p>
                  <p className="text-xs text-amber-600">O app está rodando sem banco de dados. Configure as chaves VITE_SUPABASE.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <LoginScreen onLogin={handleLogin} />
      </MainLayout>
    );
  }

  // Main Dashboard
  try {
    return (
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'payroll') setActiveCompanyId(null);
        }}
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
                onBack={() => setActiveCompanyId(null)}
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
                onSelectCompany={setActiveCompanyId}
              />
            )}
          </ErrorBoundary>
        )}

        {activeTab === 'biometrics' && (
          <ErrorBoundary section="Biometrias" inline>
            <BiometricsManager isDarkMode={isDarkMode} />
          </ErrorBoundary>
        )}

        {activeTab === 'fiscal' && <OpeNatIdentifier />}
        {activeTab === 'registrations' && <RegistrationManager />}
        {activeTab === 'delivery-order' && <DeliveryOrder isDarkMode={isDarkMode} />}
        {activeTab === 'pantry' && <CestasBasicas />}
        {activeTab === 'showcase' && <ShowcaseManager />}
        {activeTab === 'showcase-faturamento' && <DeliveryOrder initialView="SHOWCASE" isDarkMode={isDarkMode} />}

        {activeTab === 'budget' && (
          activeCompany ? <BudgetPage activeCompany={activeCompany} /> : (
            <CompanySelection
              companies={companies}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onSelectCompany={setActiveCompanyId}
              title="Orçamentos e Cestas Básicas"
              description="Selecione uma empresa para gerenciar orçamentos e cestas."
              buttonText="Gerenciar Orçamentos"
            />
          )
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
                onSelectCompany={setActiveCompanyId}
                title="Mortalidade e Consumo"
                description="Selecione uma empresa para gerenciar o controle de mortalidade."
                buttonText="Gerenciar Mortalidade"
              />
            )}
          </ErrorBoundary>
        )}

        {activeTab === 'comparator' && <Comparator />}

        {activeTab === 'receipts' && (
          activeCompany ? <ReceiptManager activeCompany={activeCompany} onBack={() => setActiveTab('payroll')} /> : (
            <CompanySelection
              companies={companies}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              onSelectCompany={setActiveCompanyId}
              title="Recibos Avulsos"
              description="Selecione uma empresa para gerar recibos avulsos."
              buttonText="Gerenciar Recibos"
            />
          )
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
                onSelectCompany={setActiveCompanyId}
                title="Campo/Viveiros"
                description="Selecione uma empresa para gerenciar os viveiros."
                buttonText="Gerenciar Viveiros"
              />
            )}
          </ErrorBoundary>
        )}

        {activeTab === 'plans' && <PlansPrices />}
        {activeTab === 'transferencias' && <TransferenciaProcessing />}
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Critical Render Error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Ocorreu um erro inesperado</h1>
        <p className="text-gray-700 mb-4">Tente fechar e abrir o navegador novamente.</p>
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
