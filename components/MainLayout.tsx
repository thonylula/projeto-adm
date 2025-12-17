import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <main className="min-h-screen w-full bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white print:block">
      {/* Decorative background elements - Hidden on print */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/50 blur-3xl" />
      </div>
      
      {/* Content Wrapper - Full width on print */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-6 print:max-w-none print:w-full print:block">
        {children}
      </div>
    </main>
  );
};