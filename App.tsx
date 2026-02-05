
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

  // --- SHOWCASE: Ensure company is loaded before modules ---
  useEffect(() => {
    if (isPublicShowcase && !activeCompanyId && companies.length > 0) {
      setActiveCompanyId('02ac338d-28e0-4e81-9aff-c18a7f9cbabb');
    }
  }, [isPublicShowcase, activeCompanyId, companies]);

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
        {effectiveTab === 'transferencias' && <TransferenciaProcessing isPublic={true} />}

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
