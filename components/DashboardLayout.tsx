
import React, { useState, useEffect } from 'react';

type Tab = 'payroll' | 'settings' | 'biometrics' | 'fiscal' | 'registrations' | 'pantry';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  currentUser: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onLogout,
  currentUser
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Atualiza o título da página (aparece na aba do navegador e na barra do dispositivo)
  useEffect(() => {
    document.title = `Adm: ${currentUser}`;
  }, [currentUser]);

  // Lista de itens do menu
  const menuItems = [
    {
      id: 'payroll',
      label: 'Folha Salarial',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      )
    },
    {
      id: 'biometrics',
      label: 'Biometria',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-2.242 2.244l1.793 4.493a2.25 2.25 0 002.09 1.413h15.898a2.25 2.25 0 002.09-1.413l1.793-4.493A2.25 2.25 0 0021.59 9M2.41 9c.381 0 .75.028 1.11.082M21.59 9a14.25 14.25 0 00-1.11.082m-1.285.742a22.511 22.511 0 01-2.903-1.066m-10.584 0a22.511 22.511 0 01-2.903 1.066" />
        </svg>
      )
    },
    {
      id: 'fiscal',
      label: 'Fiscal / Natureza',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    },
    {
      id: 'registrations',
      label: 'Cadastros Gerais',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    },
    {
      id: 'delivery-order',
      label: 'Ordem de Entrega',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      )
    },
    {
      id: 'pantry',
      label: 'Cestas Básicas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      )
    }
  ];

  // Ordenação Alfabética
  const navItems = menuItems.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white print:block">

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
        <span className="font-bold text-lg truncate max-w-[200px]">Adm: {currentUser}</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              A
            </div>
            <div className="overflow-hidden">
              <h1 className="text-white font-bold text-sm leading-tight truncate" title={`Adm: ${currentUser}`}>
                Adm: {currentUser}
              </h1>
              <p className="text-xs text-slate-500">Gestão Inteligente</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                : 'hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-medium text-sm uppercase text-left leading-tight">{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white flex-shrink-0"></span>
              )}
            </button>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
              {currentUser.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-white font-medium truncate" title={currentUser}>{currentUser}</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 rounded-lg text-sm transition-colors border border-slate-700 hover:border-red-900/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto h-[calc(100vh-60px)] md:h-screen w-full relative print:h-auto print:overflow-visible">
        {/* Decorative Background inside Content Area */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden opacity-50 md:opacity-100">
          <div className="absolute top-[5%] right-[5%] w-[40%] h-[40%] rounded-full bg-orange-100/50 blur-3xl" />
          <div className="absolute bottom-[5%] left-[10%] w-[30%] h-[30%] rounded-full bg-blue-50/50 blur-3xl" />
        </div>

        <div className="relative z-10 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto print:p-0 print:max-w-none">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
