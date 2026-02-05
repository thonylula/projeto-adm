
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Company, PayrollHistoryItem } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { AuthService } from '../services/authService';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { showToast } from '../components/shared';

interface AppContextType {
    isAuthenticated: boolean;
    currentUser: string;
    session: Session | null;
    activeTab: string;
    activeYear: number | null;
    activeMonth: number | null;
    companies: Company[];
    activeCompanyId: string | null;
    activeCompany: Company | undefined;
    isDarkMode: boolean;
    isPublicShowcase: boolean;

    setIsAuthenticated: (val: boolean) => void;
    setCurrentUser: (user: string) => void;
    setSession: (session: Session | null) => void;
    setActiveTab: (tab: string) => void;
    setActiveYear: (year: number | null) => void;
    setActiveMonth: (month: number | null) => void;
    setCompanies: (companies: Company[]) => void;
    setActiveCompanyId: (id: string | null) => void;
    setIsDarkMode: (val: boolean) => void;

    handleLogin: (username: string) => void;
    handleLogout: () => void;
    handleAddCompany: (name: string, cnpj: string | undefined, logoUrl: string | null) => Promise<void>;
    handleUpdateCompany: (updatedCompany: Company) => Promise<void>;
    handleDeleteCompany: (id: string) => Promise<void>;
    handleAddEmployee: (newItem: PayrollHistoryItem) => Promise<void>;
    handleUpdateEmployee: (updatedItem: PayrollHistoryItem) => Promise<void>;
    handleDeleteEmployee: (itemId: string) => Promise<void>;
    handleBulkUpdateEmployees: (newEmployees: PayrollHistoryItem[]) => void;
    handleSaveBulkEmployees: (newEmployees: PayrollHistoryItem[]) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    // Authentication State
    const [session, setSession] = useState<Session | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState('admin');

    // Subscribe to Auth Changes
    useEffect(() => {
        if (!supabase) return;

        // Initial session check
        AuthService.getSession().then(session => {
            setSession(session);
            setIsAuthenticated(!!session);
            if (session?.user?.email) setCurrentUser(session.user.email);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsAuthenticated(!!session);
            if (session?.user?.email) setCurrentUser(session.user.email);
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // Showcase Mode
    const isPublicShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';

    // Navigation State
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedTabs = params.get('tabs')?.split(',') || [];
        return params.get('tab') || (sharedTabs.length > 0 ? sharedTabs[0] : (localStorage.getItem('activeTab') || 'payroll'));
    });

    const [activeYear, setActiveYear] = useState<number | null>(() => {
        if (isPublicShowcase) return new Date().getFullYear();
        const saved = localStorage.getItem('activeYear');
        return saved ? parseInt(saved) : new Date().getFullYear();
    });

    const [activeMonth, setActiveMonth] = useState<number | null>(() => {
        if (isPublicShowcase) return new Date().getMonth() + 1;
        const saved = localStorage.getItem('activeMonth');
        return saved ? parseInt(saved) : new Date().getMonth() + 1;
    });

    const [companies, setCompanies] = useState<Company[]>([]);
    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() => {
        const saved = localStorage.getItem('activeCompanyId');
        if (!saved && isPublicShowcase) return '02ac338d-28e0-4e81-9aff-c18a7f9cbabb'; // CARAPITANGA default for showcase
        return saved;
    });
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('isDarkMode') === 'true');

    // Persistence (Simplified since Supabase handles this)
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);
    useEffect(() => { if (activeYear) localStorage.setItem('activeYear', activeYear.toString()); }, [activeYear]);
    useEffect(() => { if (activeMonth) localStorage.setItem('activeMonth', activeMonth.toString()); }, [activeMonth]);
    useEffect(() => {
        if (activeCompanyId) localStorage.setItem('activeCompanyId', activeCompanyId);
        else localStorage.removeItem('activeCompanyId');
    }, [activeCompanyId]);
    useEffect(() => localStorage.setItem('isDarkMode', isDarkMode.toString()), [isDarkMode]);

    const loadFromSupabase = async () => {
        if (!supabase) return;
        try {
            const data = await SupabaseService.getCompanies();
            if (data && data.length > 0) {
                setCompanies(data);
            }
        } catch (e) {
            console.error("Failed to load companies from Supabase", e);
            showToast.error('Erro ao carregar empresas', 'Verifique sua conexão com o banco de dados');
        }
    };

    useEffect(() => {
        loadFromSupabase();
        window.addEventListener('app-data-updated', loadFromSupabase);
        return () => window.removeEventListener('app-data-updated', loadFromSupabase);
    }, []);

    const activeCompany = useMemo(() => {
        const selected = companies.find(c => c.id === activeCompanyId);
        if (!selected) return undefined;

        if (selected.name.toUpperCase().includes('CARAPITANGA')) {
            const carapitanga = companies.filter(c => c.name.toUpperCase().includes('CARAPITANGA'));
            if (carapitanga.length > 1) {
                const sorted = [...carapitanga].sort((a, b) => (a.employees?.length || 0) - (b.employees?.length || 0));
                return { ...sorted[1], employees: [...(sorted[0].employees || []), ...(sorted[1].employees || [])] };
            }
        }
        return selected;
    }, [companies, activeCompanyId]);

    const handleLogin = (username: string) => {
        // Note: Actual login logic is now in LoginScreen using AuthService
        setCurrentUser(username);
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        await AuthService.logout();
        setIsAuthenticated(false);
        setActiveCompanyId(null);
        setActiveTab('payroll');
    };

    const handleAddCompany = async (name: string, cnpj: string | undefined, logoUrl: string | null) => {
        try {
            const newComp = await SupabaseService.addCompany(name, cnpj, logoUrl);
            if (newComp) {
                setCompanies(prev => [...prev, newComp]);
                showToast.success(`Empresa "${name}" criada!`);
            }
        } catch (e) { showToast.error('Erro ao criar empresa', (e as Error).message); }
    };

    const handleUpdateCompany = async (updatedCompany: Company) => {
        try {
            if (await SupabaseService.updateCompany(updatedCompany)) {
                setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
                showToast.success('Empresa atualizada!');
            }
        } catch (e) { showToast.error('Erro ao atualizar empresa', (e as Error).message); }
    };

    const handleDeleteCompany = async (id: string) => {
        if (window.confirm('Excluir empresa?')) {
            try {
                if (await SupabaseService.deleteCompany(id)) {
                    setCompanies(prev => prev.filter(c => c.id !== id));
                    if (activeCompanyId === id) setActiveCompanyId(null);
                    showToast.success('Empresa excluída');
                }
            } catch (e) { showToast.error('Erro ao excluir empresa', (e as Error).message); }
        }
    };

    const handleAddEmployee = async (newItem: PayrollHistoryItem) => {
        if (!activeCompanyId) return;
        try {
            if (await SupabaseService.addPayrollItem(activeCompanyId, newItem)) {
                setCompanies(prev => prev.map(c => c.id === activeCompanyId ? { ...c, employees: [newItem, ...(c.employees || [])] } : c));
                showToast.success('Funcionário adicionado!');
            }
        } catch (e) { showToast.error('Erro ao adicionar', (e as Error).message); }
    };

    const handleUpdateEmployee = async (updatedItem: PayrollHistoryItem) => {
        if (!activeCompanyId) return;
        try {
            if (await SupabaseService.updatePayrollItem(updatedItem)) {
                setCompanies(prev => prev.map(c => c.id === activeCompanyId ? { ...c, employees: (c.employees || []).map(e => e.id === updatedItem.id ? updatedItem : e) } : c));
                showToast.success('Dados atualizados!');
            }
        } catch (e) { showToast.error('Erro ao atualizar', (e as Error).message); }
    };

    const handleDeleteEmployee = async (itemId: string) => {
        if (!activeCompanyId) return;
        try {
            if (await SupabaseService.deletePayrollItem(itemId)) {
                setCompanies(prev => prev.map(c => c.id === activeCompanyId ? { ...c, employees: (c.employees || []).filter(e => e.id !== itemId) } : c));
                showToast.success('Registro excluído');
            }
        } catch (e) { showToast.error('Erro ao excluir', (e as Error).message); }
    };

    const handleBulkUpdateEmployees = (newEmployees: PayrollHistoryItem[]) => {
        if (!activeCompanyId) return;
        setCompanies(prev => prev.map(c => c.id === activeCompanyId ? { ...c, employees: newEmployees } : c));
    };

    const handleSaveBulkEmployees = async (newEmployees: PayrollHistoryItem[]) => {
        if (!activeCompanyId) return;
        const loadingToast = showToast.loading('Salvando folha...');
        try {
            if (await SupabaseService.saveBulkPayrollItems(activeCompanyId, newEmployees)) {
                showToast.success(`Folha salva! (${newEmployees.length} registros)`);
                handleBulkUpdateEmployees(newEmployees);
            }
        } finally { showToast.dismiss(loadingToast); }
    };

    const value = {
        isAuthenticated, currentUser, session, activeTab, activeYear, activeMonth, companies, activeCompanyId, activeCompany, isDarkMode, isPublicShowcase,
        setIsAuthenticated, setCurrentUser, setSession, setActiveTab, setActiveYear, setActiveMonth, setCompanies, setActiveCompanyId, setIsDarkMode,
        handleLogin, handleLogout, handleAddCompany, handleUpdateCompany, handleDeleteCompany, handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee, handleBulkUpdateEmployees, handleSaveBulkEmployees, loadFromSupabase
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
    return context;
}
