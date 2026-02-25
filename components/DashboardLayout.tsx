
import React, { useState, useEffect } from 'react';
import { OperationsAssistant } from './OperationsAssistant';

type Tab = 'payroll' | 'settings' | 'biometrics' | 'fiscal' | 'registrations' | 'pantry' | 'delivery-order' | 'comparator' | 'budget' | 'mortalidade' | 'campo' | 'plans' | 'receipts' | 'transferencias';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  currentUser: string;
  isPublic?: boolean;
  isDarkMode?: boolean;
  setIsDarkMode?: (isDark: boolean) => void;
}

const NavItem: React.FC<{
  item: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  isLocked: boolean;
  onToggleLock: (id: string) => void;
  isPublic?: boolean;
  color?: string;
}> = ({ item, activeTab, onTabChange, setIsMobileMenuOpen, isLocked, onToggleLock, isPublic, color = 'white' }) => {
  const getColorClasses = (c: string) => {
    switch (c) {
      case 'cyan-400': return {
        bgActive: 'bg-cyan-500/20',
        textActive: 'text-cyan-400',
        ringActive: 'ring-cyan-400/30',
        shadowActive: 'shadow-cyan-500/20',
        borderActive: 'border-cyan-400/50'
      };
      case 'amber-400': return {
        bgActive: 'bg-amber-500/20',
        textActive: 'text-amber-400',
        ringActive: 'ring-amber-400/30',
        shadowActive: 'shadow-amber-500/20',
        borderActive: 'border-amber-400/50'
      };
      case 'emerald-400': return {
        bgActive: 'bg-emerald-500/20',
        textActive: 'text-emerald-400',
        ringActive: 'ring-emerald-400/30',
        shadowActive: 'shadow-emerald-500/20',
        borderActive: 'border-emerald-400/50'
      };
      case 'indigo-400': return {
        bgActive: 'bg-indigo-500/20',
        textActive: 'text-indigo-400',
        ringActive: 'ring-indigo-400/30',
        shadowActive: 'shadow-indigo-500/20',
        borderActive: 'border-indigo-400/50'
      };
      default: return {
        bgActive: 'bg-white/20',
        textActive: 'text-white',
        ringActive: 'ring-white/30',
        shadowActive: 'shadow-white/10',
        borderActive: 'border-white/50'
      };
    }
  };

  const { bgActive, textActive, ringActive, shadowActive, borderActive } = getColorClasses(color);

  const isPayroll = item.id === 'payroll';
  const isPantry = item.id === 'pantry';
  const isShowcase = item.id === 'showcase';
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => 2024 + i);
  const months = [
    { id: 1, label: 'JAN' }, { id: 2, label: 'FEV' }, { id: 3, label: 'MAR' },
    { id: 4, label: 'ABR' }, { id: 5, label: 'MAI' }, { id: 6, label: 'JUN' },
    { id: 7, label: 'JUL' }, { id: 8, label: 'AGO' }, { id: 9, label: 'SET' },
    { id: 10, label: 'OUT' }, { id: 11, label: 'NOV' }, { id: 12, label: 'DEZ' }
  ];

  const isActive = activeTab === item.id || (isPantry && activeTab === 'budget') || (isShowcase && activeTab === 'showcase-faturamento');

  return (
    <div className="space-y-1">
      <button
        onClick={() => {
          if (isShowcase && isPublic) {
            window.dispatchEvent(new CustomEvent('app-navigation', { detail: { tab: 'showcase' } }));
            onTabChange('showcase-faturamento');
            setIsMobileMenuOpen(false);
            return;
          }

          if (isPantry || isShowcase || isPayroll) {
            setIsExpanded(!isExpanded);
          }

          if (isPayroll) {
            const now = new Date();
            window.dispatchEvent(new CustomEvent('app-navigation', {
              detail: { tab: 'payroll', year: now.getFullYear(), month: now.getMonth() + 1 }
            }));
            setIsMobileMenuOpen(false);
          }

          if (!isPayroll && !isPantry && !isShowcase) {
            onTabChange(item.id);
            setIsMobileMenuOpen(false);
          }
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group border ${isActive
          ? `${bgActive} ${textActive} ${shadowActive} ring-1 ${ringActive} ${borderActive}`
          : 'hover:bg-white/5 text-slate-400 hover:text-white border-transparent'
          }`}
      >
        <div className={`text-lg filter transition-all duration-300 ${isActive ? 'grayscale-0 scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
          {item.icon}
        </div>
        <span className={`flex-1 font-bold text-[11px] uppercase text-left leading-tight tracking-wide transition-colors ${isActive ? textActive : 'text-slate-400 group-hover:text-white'}`}>
          {item.id === 'showcase' && isPublic ? 'Faturamento' : item.label}
        </span>

        {(isPayroll || isPantry || (isShowcase && !isPublic)) && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-3 h-3 ml-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Submenu Folha Salarial - Anos */}
      {isPayroll && isExpanded && (
        <div className="ml-9 space-y-1 border-l border-slate-800 pl-2 py-1">
          {years.map(year => {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1; // 1-12
            const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

            // Auto-expand current year
            const shouldAutoExpand = year === currentYear;
            const isYearExpanded = expandedYear === year || shouldAutoExpand;

            return (
              <div key={year} className="space-y-1">
                <button
                  onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-colors ${isYearExpanded ? 'text-[#F97316]' : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="tracking-widest">{year}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className={`w-3 h-3 transition-transform ${isYearExpanded ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isYearExpanded && (
                  <div className="grid grid-cols-2 gap-1 px-1">
                    {months
                      .filter(m => {
                        if (year < currentYear) return true;
                        return m.id <= currentMonth + 1;
                      })
                      .map(month => {
                        // Determine if this is the current or previous month in the current year
                        const isCurrentMonth = year === currentYear && month.id === currentMonth;
                        const isPreviousMonth = year === currentYear && month.id === previousMonth;

                        let buttonClasses = "px-1 py-2 rounded text-[10px] font-medium transition-colors text-center";

                        if (isCurrentMonth) {
                          // Current month: orange with background
                          buttonClasses += " bg-[#F97316] text-white font-black shadow-lg shadow-[#F97316]/20";
                        } else if (isPreviousMonth) {
                          // Previous month: lighter tone
                          buttonClasses += " bg-[#F97316]/10 text-[#F97316] font-black border border-[#F97316]/20";
                        } else {
                          // Other months: default style
                          buttonClasses += " text-slate-400 hover:bg-[#F97316]/10 hover:text-[#F97316]";
                        }

                        return (
                          <button
                            key={month.id}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('app-navigation', {
                                detail: { tab: 'payroll', year, month: month.id }
                              }));
                              setIsMobileMenuOpen(false);
                            }}
                            className={buttonClasses}
                          >
                            {month.label}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isPantry && isExpanded && (
        <div className="ml-9 space-y-1 border-l border-slate-800 pl-2 py-1">
          <button
            onClick={() => {
              onTabChange('pantry');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'pantry' ? 'text-[#C5A059]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            📦 Processamento
          </button>
          <button
            onClick={() => {
              onTabChange('budget');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'budget' ? 'text-[#C5A059]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            💰 Orçamento
          </button>
        </div>
      )}

      {/* Submenu Mostruário */}
      {isShowcase && isExpanded && (
        <div className="ml-9 space-y-1 border-l border-slate-800 pl-2 py-1">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('app-navigation', { detail: { tab: 'showcase' } }));
              onTabChange('showcase-faturamento');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'showcase-faturamento' ? 'text-[#F97316]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            📊 Faturamento
          </button>
          <button
            onClick={() => {
              onTabChange('transferencias');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'transferencias' ? 'text-[#F97316]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            🔄 Transferências
          </button>
        </div>
      )}
    </div>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onLogout,
  currentUser,
  isPublic = false,
  isDarkMode = false,
  setIsDarkMode
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tabLocks, setTabLocks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('app-tab-locks');
    if (saved) {
      try {
        setTabLocks(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar travas:", e);
      }
    }
  }, []);

  const toggleLock = (tabId: string) => {
    setTabLocks(prev => {
      const next = { ...prev, [tabId]: !prev[tabId] };
      localStorage.setItem('app-tab-locks', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    document.title = `Adm: ${currentUser}`;
  }, [currentUser]);

  const categories = [
    {
      label: 'OPERACIONAL',
      icon: '🌊',
      color: 'cyan-400',
      items: [
        { id: 'biometrics', label: 'Biometria', icon: '📊' },
        { id: 'campo', label: 'Campo/Viveiros', icon: '📍' },
        { id: 'mortalidade', label: 'Mortalidade/Consumo', icon: '📉' },
        { id: 'transferencias', label: 'Transferências', icon: '🔄' },
      ]
    },
    {
      label: 'ADMINISTRATIVO',
      icon: '🏢',
      color: 'amber-400',
      items: [
        { id: 'payroll', label: 'Folha Salarial', icon: '💰' },
        { id: 'receipts', label: 'Recibos', icon: '📄' },
        { id: 'registrations', label: 'Cadastros Gerais', icon: '👥' },
        { id: 'budget', label: 'Orçamentos', icon: '📈' },
      ]
    },
    {
      label: 'LOGÍSTICA',
      icon: '🚚',
      color: 'emerald-400',
      items: [
        { id: 'delivery-order', label: 'Ordem de Entrega', icon: '📦' },
        { id: 'pantry', label: 'Cestas Básicas', icon: '🧺' },
        { id: 'comparator', label: 'Comparador', icon: '⚖️' },
        { id: 'showcase', label: 'Mostruário', icon: '👁️' },
      ]
    },
    {
      label: 'SISTEMA',
      icon: '⚙️',
      color: 'indigo-400',
      items: [
        { id: 'plans', label: 'Planos e Preços', icon: '💎' },
        { id: 'fiscal', label: 'Fiscal / Natureza', icon: '🏛️' },
      ]
    }
  ];

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['OPERACIONAL']);

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-500 print:bg-white print:block ${isDarkMode ? 'bg-[#0B0F1A] text-slate-100' : 'bg-gray-50 text-slate-900'}`} data-active-tab={activeTab}>
      {/* Mobile Header */}
      <div className={`lg:hidden p-4 flex justify-between items-center print:hidden border-b transition-colors duration-500 ${isDarkMode ? 'bg-[#0B0F1A] border-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
        <span className="font-bold text-lg truncate max-w-[200px]">
          {isPublic ? 'Modo Visualização' : `Adm: ${currentUser}`}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode?.(!isDarkMode)}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-800 text-slate-300'}`}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.757 7.757l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out print:hidden flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 bg-[#022c22] border-r border-white/5 shadow-2xl text-slate-300
      `}>
        <div className="p-6 flex flex-col gap-8">
          <div className="flex justify-center items-center w-full">
            <div className="bg-white py-3 px-6 rounded-2xl shadow-xl shadow-black/20 w-full flex justify-center items-center">
              <img
                src="./logo-carapitanga.jpg"
                alt="Carapitanga Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>

          {/* Theme Toggle - Desktop Sidebar */}
          <button
            onClick={() => setIsDarkMode?.(!isDarkMode)}
            className={`hidden lg:flex p-2 rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.757 7.757l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.label);
            const hasActiveItem = category.items.some(item => activeTab === item.id);

            const getCategoryBg = (label: string, active: boolean) => {
              if (!active) return 'text-slate-400 hover:text-white';
              switch (label) {
                case 'OPERACIONAL': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
                case 'ADMINISTRATIVO': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                case 'LOGÍSTICA': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                case 'SISTEMA': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                default: return 'bg-white/5 text-white';
              }
            };

            const categoryStyle = getCategoryBg(category.label, hasActiveItem);

            return (
              <div key={category.label} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-300 border ${categoryStyle}`}
                >
                  <div className={`flex items-center gap-2 transition-colors duration-300`}>
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">{category.label}</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="space-y-1 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    {category.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        activeTab={activeTab}
                        onTabChange={onTabChange}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        isLocked={!!tabLocks[item.id]}
                        onToggleLock={toggleLock}
                        isPublic={isPublic}
                        color={category.color}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer - Carapitanga Style */}
        {!isPublic && (
          <div className="p-4 mt-auto border-t border-slate-800/50 bg-slate-900/30">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase flex-shrink-0">
                {currentUser.substring(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-white font-bold truncate" title={currentUser}>{currentUser}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Administrador</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sair do Sistema
            </button>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <button
                onClick={async () => {
                  if (window.confirm("Deseja migrar todos os dados locais para o Supabase agora? Isso enviará empresas, funcionários e configurações.")) {
                    const { MigrationService } = await import('../services/migrationService');
                    const res = await MigrationService.migrateAll();
                    alert(res.message);
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F97316]/10 hover:bg-[#F97316]/20 text-[#F97316] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-[#F97316]/20 shadow-lg shadow-[#F97316]/5"
              >
                Sincronizar Cloud (Migrar)
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-[calc(100vh-60px)] lg:h-screen relative print:h-auto print:overflow-visible min-w-0">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden opacity-50 lg:opacity-100 transition-opacity duration-500">
          <div className={`absolute top-[5%] right-[5%] w-[40%] h-[40%] rounded-full blur-3xl transition-colors duration-1000 ${isDarkMode ? 'bg-blue-900/20' : 'bg-[#C5A059]/10'}`} />
          <div className={`absolute bottom-[5%] left-[10%] w-[30%] h-[30%] rounded-full blur-3xl transition-colors duration-1000 ${isDarkMode ? 'bg-indigo-900/10' : 'bg-blue-50/50'}`} />
        </div>

        <div id="active-view" className="relative z-10 p-4 sm:p-8 lg:p-10 w-full max-w-7xl mx-auto overflow-hidden min-w-0 print:p-0 print:max-w-none">
          {children}
        </div>
      </main>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {!isPublic && <OperationsAssistant />}
    </div>
  );
};
