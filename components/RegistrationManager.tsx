// [AI-LOCK: CLOSED]
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { RegistryEmployee, RegistrySupplier, RegistryClient } from '../types';
import { useGeminiParser } from '../hooks/useGeminiParser';
import { SupabaseService } from '../services/supabaseService';

// Helper for ID generation
const generateId = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) { }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

type RegistryType = 'EMPLOYEE' | 'SUPPLIER' | 'CLIENT';

// --- INITIAL STATES ---
const INITIAL_COMMON = {
    zipCode: '', address: '', number: '', district: '', city: '', state: '',
    bankName: '', agency: '', account: '', pixKey: ''
};

const INITIAL_EMPLOYEE: Omit<RegistryEmployee, 'id'> = {
    name: '', photoUrl: null, cpf: '', role: '', admissionDate: '', salary: 0, phone: '', email: '', active: true, isNonDrinker: false,
    ...INITIAL_COMMON
};

const INITIAL_SUPPLIER: Omit<RegistrySupplier, 'id'> = {
    companyName: '', tradeName: '', cnpj: '', contactPerson: '', phone: '', email: '', category: '',
    ...INITIAL_COMMON
};

const INITIAL_CLIENT: Omit<RegistryClient, 'id'> = {
    name: '', document: '', type: 'PF', phone: '', email: '', status: 'ACTIVE',
    ...INITIAL_COMMON
};

// Classe padrão para inputs: Fundo Branco, Texto Preto e Negrito
const inputClass = "w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-bold placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all";

// --- REUSABLE FORM SECTIONS ---

const AddressSection = ({ form, setForm }: { form: any, setForm: any }) => (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Endereço
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                <input type="text" value={form.zipCode || ''} onChange={e => setForm({ ...form, zipCode: e.target.value })} className={inputClass} placeholder="00000-000" />
            </div>
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua / Logradouro</label>
                <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                <input type="text" value={form.number || ''} onChange={e => setForm({ ...form, number: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                <input type="text" value={form.district || ''} onChange={e => setForm({ ...form, district: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                <input type="text" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado (UF)</label>
                <input type="text" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} className={inputClass} maxLength={2} />
            </div>
        </div>
    </div>
);

const BankSection = ({ form, setForm }: { form: any, setForm: any }) => (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Dados Bancários
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banco</label>
                <input type="text" value={form.bankName || ''} onChange={e => setForm({ ...form, bankName: e.target.value })} className={inputClass} placeholder="Ex: Banco do Brasil" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agência</label>
                <input type="text" value={form.agency || ''} onChange={e => setForm({ ...form, agency: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta</label>
                <input type="text" value={form.account || ''} onChange={e => setForm({ ...form, account: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave PIX</label>
                <input type="text" value={form.pixKey || ''} onChange={e => setForm({ ...form, pixKey: e.target.value })} className={inputClass} />
            </div>
        </div>
    </div>
);

export const RegistrationManager: React.FC = () => {
    const [activeType, setActiveType] = useState<RegistryType>('EMPLOYEE');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- EXPORT STATE ---
    const [exportingId, setExportingId] = useState<string | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    const [employees, setEmployees] = useState<RegistryEmployee[]>([]);
    const [suppliers, setSuppliers] = useState<RegistrySupplier[]>([]);
    const [clients, setClients] = useState<RegistryClient[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const [e, s, c] = await Promise.all([
                    SupabaseService.getEmployees(),
                    SupabaseService.getSuppliers(),
                    SupabaseService.getClients()
                ]);

                setEmployees(e);
                setSuppliers(s);
                setClients(c);
            } catch (err) {
                console.error("Failed to load registrations from Supabase", err);
            }
        };

        load();

        window.addEventListener('storage', load);
        window.addEventListener('app-data-updated', load);
        return () => {
            window.removeEventListener('storage', load);
            window.removeEventListener('app-data-updated', load);
        };
    }, []);

    // --- FORM STATES ---
    const [empForm, setEmpForm] = useState(INITIAL_EMPLOYEE);
    const [supForm, setSupForm] = useState(INITIAL_SUPPLIER);
    const [cliForm, setCliForm] = useState(INITIAL_CLIENT);

    // Persistence handled via SupabaseService in save/delete handlers

    // --- AI SMART UPLOAD ---
    const { processFile, isProcessing } = useGeminiParser({
        onError: (err) => alert(`Erro na Inteligência Artificial: ${err.message}`)
    });

    const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            let prompt = "";
            if (activeType === 'EMPLOYEE') {
                prompt = `
                    Analise este documento (RG, CNH, Ficha). Extraia dados para cadastro de FUNCIONÁRIO.
                    Retorne JSON estrito:
                    {
                        "name": "Nome Completo",
                        "cpf": "000.000.000-00",
                        "role": "Cargo/Função",
                        "phone": "Telefone",
                        "email": "Email",
                        "address": "Logradouro",
                        "number": "Número",
                        "district": "Bairro",
                        "city": "Cidade",
                        "state": "UF (Sigla)",
                        "zipCode": "CEP",
                        "admissionDate": "DD/MM/AAAA"
                    }
                    Se não encontrar algo, deixe em branco ou null.`;
            } else if (activeType === 'SUPPLIER') {
                prompt = `
                    Analise este documento (Cartão CNPJ, Fatura, Cartão de Visita). Extraia dados para cadastro de FORNECEDOR.
                    Retorne JSON estrito:
                    {
                        "companyName": "Razão Social",
                        "tradeName": "Nome Fantasia",
                        "cnpj": "CNPJ formatado",
                        "contactPerson": "Nome do contato",
                        "phone": "Telefone",
                        "email": "Email",
                        "address": "Logradouro",
                        "number": "Número",
                        "district": "Bairro",
                        "city": "Cidade",
                        "state": "UF (Sigla)",
                        "zipCode": "CEP"
                    }
                `;
            } else {
                prompt = `
                    Analise este documento. Extraia dados para cadastro de CLIENTE.
                    Retorne JSON estrito:
                    {
                        "name": "Nome/Razão Social",
                        "document": "CPF ou CNPJ",
                        "phone": "Telefone",
                        "email": "Email",
                        "address": "Logradouro",
                        "number": "Número",
                        "district": "Bairro",
                        "city": "Cidade",
                        "state": "UF (Sigla)",
                        "zipCode": "CEP",
                        "type": "PF" ou "PJ"
                    }
                `;
            }

            const data = await processFile(file, prompt);

            if (data) {
                if (activeType === 'EMPLOYEE') {
                    setEmpForm(prev => ({ ...prev, ...data }));
                } else if (activeType === 'SUPPLIER') {
                    setSupForm(prev => ({ ...prev, ...data }));
                } else {
                    setCliForm(prev => ({ ...prev, ...data }));
                }
            }

        } catch (error) {
            console.error("Smart Upload Error", error);
        } finally {
            // Clear input
            e.target.value = '';
        }
    };

    // --- HANDLERS ---

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (activeType === 'EMPLOYEE') {
            const id = editingId || generateId();
            const newEmployee = { id, ...empForm };
            await SupabaseService.saveEmployee(newEmployee as RegistryEmployee);

            if (editingId) {
                setEmployees(prev => prev.map(item => item.id === editingId ? newEmployee as RegistryEmployee : item));
            } else {
                setEmployees(prev => [newEmployee as RegistryEmployee, ...prev]);
            }
            setEmpForm(INITIAL_EMPLOYEE);
        } else if (activeType === 'SUPPLIER') {
            const id = editingId || generateId();
            const newSupplier = { id, ...supForm };
            await SupabaseService.saveSupplier(newSupplier as RegistrySupplier);

            if (editingId) {
                setSuppliers(prev => prev.map(item => item.id === editingId ? newSupplier as RegistrySupplier : item));
            } else {
                setSuppliers(prev => [newSupplier as RegistrySupplier, ...prev]);
            }
            setSupForm(INITIAL_SUPPLIER);
        } else if (activeType === 'CLIENT') {
            const id = editingId || generateId();
            const newClient = { id, ...cliForm };
            await SupabaseService.saveClient(newClient as RegistryClient);

            if (editingId) {
                setClients(prev => prev.map(item => item.id === editingId ? newClient as RegistryClient : item));
            } else {
                setClients(prev => [newClient as RegistryClient, ...prev]);
            }
            setCliForm(INITIAL_CLIENT);
        }

        setIsFormOpen(false);
        setEditingId(null);
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setIsFormOpen(true);

        if (activeType === 'EMPLOYEE') {
            const item = employees.find(e => e.id === id);
            if (item) setEmpForm(item);
        } else if (activeType === 'SUPPLIER') {
            const item = suppliers.find(s => s.id === id);
            if (item) setSupForm(item);
        } else if (activeType === 'CLIENT') {
            const item = clients.find(c => c.id === id);
            if (item) setCliForm(item);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;

        if (activeType === 'EMPLOYEE') {
            await SupabaseService.deleteEmployee(id);
            setEmployees(prev => prev.filter(e => e.id !== id));
        } else if (activeType === 'SUPPLIER') {
            await SupabaseService.deleteSupplier(id);
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } else if (activeType === 'CLIENT') {
            await SupabaseService.deleteClient(id);
            setClients(prev => prev.filter(c => c.id !== id));
        }

        if (editingId === id) {
            setIsFormOpen(false);
            setEditingId(null);
        }
    };

    const toggleForm = () => {
        setIsFormOpen(!isFormOpen);
        if (isFormOpen) {
            setEditingId(null);
            setEmpForm(INITIAL_EMPLOYEE);
            setSupForm(INITIAL_SUPPLIER);
            setCliForm(INITIAL_CLIENT);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setEmpForm({ ...empForm, photoUrl: ev.target.result as string });
                }
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleExportSheet = (employee: RegistryEmployee) => {
        setExportingId(employee.id);
        // Pequeno delay para garantir que o componente oculto renderizou com os dados corretos
        setTimeout(async () => {
            if (sheetRef.current) {
                try {
                    const canvas = await html2canvas(sheetRef.current, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        useCORS: true
                    });
                    const link = document.createElement('a');
                    link.download = `Ficha_${employee.name.replace(/\s+/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (err) {
                    console.error("Erro ao exportar ficha:", err);
                    alert("Erro ao gerar a imagem da ficha.");
                } finally {
                    setExportingId(null);
                }
            }
        }, 300);
    };

    const renderTabs = () => (
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6 border border-gray-200">
            <button
                onClick={() => { setActiveType('EMPLOYEE'); setIsFormOpen(false); setEditingId(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'EMPLOYEE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Funcionários
            </button>
            <button
                onClick={() => { setActiveType('SUPPLIER'); setIsFormOpen(false); setEditingId(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'SUPPLIER' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Fornecedores
            </button>
            <button
                onClick={() => { setActiveType('CLIENT'); setIsFormOpen(false); setEditingId(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeType === 'CLIENT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Clientes
            </button>
        </div>
    );

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Helper to get the employee currently being exported
    const exportItem = employees.find(e => e.id === exportingId);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cadastros Gerais</h1>
                    <p className="text-gray-500">Gerencie sua base de funcionários, fornecedores e clientes.</p>
                </div>
                <button
                    onClick={toggleForm}
                    className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${isFormOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                >
                    {isFormOpen ? 'Cancelar' : '+ Novo Cadastro'}
                </button>
            </div>

            {/* Tabs */}
            {renderTabs()}

            {/* --- FORM SECTION --- */}
            {isFormOpen && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-start mb-4 pb-2 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">
                            {editingId ? 'Editar' : 'Cadastrar'} {activeType === 'EMPLOYEE' ? 'Funcionário' : activeType === 'SUPPLIER' ? 'Fornecedor' : 'Cliente'}
                        </h3>

                        <div className="relative">
                            <input
                                type="file"
                                id="smart-upload-reg"
                                className="hidden"
                                onChange={handleSmartUpload}
                                accept="image/*,application/pdf"
                                disabled={isProcessing}
                            />
                            <label
                                htmlFor="smart-upload-reg"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${isProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-md hover:scale-105'}`}
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Lendo Documento...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                        </svg>
                                        Preencher com IA
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">

                        {/* EMPLOYEE FORM */}
                        {activeType === 'EMPLOYEE' && (
                            <>
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Photo Upload Area */}
                                    <div className="w-full md:w-32 flex-shrink-0 flex flex-col items-center gap-2">
                                        <div className="w-32 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center relative hover:border-indigo-400 transition-colors">
                                            {empForm.photoUrl ? (
                                                <>
                                                    <img src={empForm.photoUrl} alt="Foto 3x4" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmpForm({ ...empForm, photoUrl: null })}
                                                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity font-bold text-xs"
                                                    >
                                                        Remover
                                                    </button>
                                                </>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-indigo-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <span className="text-[10px] font-bold uppercase">Foto 3x4</span>
                                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Personal Info Inputs */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                            <input type="text" required value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                                            <input type="text" required value={empForm.cpf} onChange={e => setEmpForm({ ...empForm, cpf: e.target.value })} className={inputClass} placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
                                            <input type="text" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Salário Base</label>
                                            <input type="number" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: Number(e.target.value) })} className={inputClass} step="0.01" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Admissão</label>
                                            <input type="date" value={empForm.admissionDate} onChange={e => setEmpForm({ ...empForm, admissionDate: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                            <input type="text" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                            <input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="flex items-center gap-2 pt-4">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={empForm.isNonDrinker} onChange={e => setEmpForm({ ...empForm, isNonDrinker: e.target.checked })} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                <span className="ml-3 text-xs font-bold text-gray-700 uppercase">Não Consome Álcool</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <AddressSection form={empForm} setForm={setEmpForm} />
                                <BankSection form={empForm} setForm={setEmpForm} />
                            </>
                        )}

                        {/* SUPPLIER FORM */}
                        {activeType === 'SUPPLIER' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razão Social</label>
                                        <input type="text" required value={supForm.companyName} onChange={e => setSupForm({ ...supForm, companyName: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                                        <input type="text" required value={supForm.cnpj} onChange={e => setSupForm({ ...supForm, cnpj: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Fantasia</label>
                                        <input type="text" value={supForm.tradeName} onChange={e => setSupForm({ ...supForm, tradeName: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                        <input type="text" value={supForm.category} onChange={e => setSupForm({ ...supForm, category: e.target.value })} className={inputClass} placeholder="Ex: Ração, Equipamentos" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contato (Pessoa)</label>
                                        <input type="text" value={supForm.contactPerson} onChange={e => setSupForm({ ...supForm, contactPerson: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                        <input type="text" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} className={inputClass} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                        <input type="email" value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} className={inputClass} />
                                    </div>
                                </div>
                                <AddressSection form={supForm} setForm={setSupForm} />
                                <BankSection form={supForm} setForm={setSupForm} />
                            </>
                        )}

                        {/* CLIENT FORM */}
                        {activeType === 'CLIENT' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome / Razão Social</label>
                                        <input type="text" required value={cliForm.name} onChange={e => setCliForm({ ...cliForm, name: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF / CNPJ</label>
                                        <input type="text" required value={cliForm.document} onChange={e => setCliForm({ ...cliForm, document: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                        <select value={cliForm.type} onChange={e => setCliForm({ ...cliForm, type: e.target.value as any })} className={inputClass}>
                                            <option value="PF">Pessoa Física</option>
                                            <option value="PJ">Pessoa Jurídica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                        <select value={cliForm.status} onChange={e => setCliForm({ ...cliForm, status: e.target.value as any })} className={inputClass}>
                                            <option value="ACTIVE">Ativo</option>
                                            <option value="INACTIVE">Inativo</option>
                                            <option value="LEAD">Prospecto (Lead)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                        <input type="text" value={cliForm.phone} onChange={e => setCliForm({ ...cliForm, phone: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                        <input type="email" value={cliForm.email} onChange={e => setCliForm({ ...cliForm, email: e.target.value })} className={inputClass} />
                                    </div>
                                </div>
                                <AddressSection form={cliForm} setForm={setCliForm} />
                                <BankSection form={cliForm} setForm={setCliForm} />
                            </>
                        )}

                        <div className="pt-4 flex gap-3 justify-end">
                            <button type="button" onClick={toggleForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                            <button type="submit" className={`px-6 py-2 text-white font-bold rounded-lg shadow-md ${activeType === 'EMPLOYEE' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                activeType === 'SUPPLIER' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}>
                                Salvar Registro
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- LIST TABLE --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-3">
                                {activeType === 'EMPLOYEE' ? 'Nome / Cargo' : activeType === 'SUPPLIER' ? 'Fornecedor / Categoria' : 'Cliente / Tipo'}
                            </th>
                            <th className="px-6 py-3">
                                {activeType === 'EMPLOYEE' ? 'Documento / Admissão' : 'Documento / Contato'}
                            </th>
                            <th className="px-6 py-3">Info. Contato</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* EMPLOYEE LIST */}
                        {activeType === 'EMPLOYEE' && employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    {emp.photoUrl ? (
                                        <img src={emp.photoUrl} alt="Foto" className="w-10 h-12 object-cover rounded shadow-sm bg-gray-100 border border-gray-200" />
                                    ) : (
                                        <div className="w-10 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-300">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-900 flex items-center gap-2">
                                            {emp.name}
                                            {emp.isNonDrinker && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase">Abstêmio</span>}
                                        </p>
                                        <p className="text-xs text-gray-500">{emp.role} • {formatCurrency(emp.salary)}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-mono text-xs">{emp.cpf}</p>
                                    <p className="text-xs text-gray-400">Adm: {emp.admissionDate || 'N/D'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xs">{emp.email}</p>
                                    <p className="text-xs">{emp.phone}</p>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleExportSheet(emp)}
                                        className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded text-xs font-bold border border-gray-200 inline-flex items-center gap-1"
                                        title="Baixar Ficha Cadastral (PNG)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Ficha
                                    </button>
                                    <button type="button" onClick={() => handleEdit(emp.id)} className="text-indigo-600 hover:underline text-xs font-bold">Editar</button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(emp.id);
                                        }}
                                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 font-bold text-xs transition-colors cursor-pointer relative z-20"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* SUPPLIER LIST */}
                        {activeType === 'SUPPLIER' && suppliers.map(sup => (
                            <tr key={sup.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900">{sup.companyName}</p>
                                    <span className="inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">{sup.category || 'Geral'}</span>
                                    {sup.tradeName && <span className="text-xs text-gray-400 ml-2">({sup.tradeName})</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-mono text-xs">{sup.cnpj}</p>
                                    <p className="text-xs text-gray-500">{sup.contactPerson}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xs">{sup.email}</p>
                                    <p className="text-xs">{sup.phone} • {sup.city}</p>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button type="button" onClick={() => handleEdit(sup.id)} className="text-orange-600 hover:underline text-xs font-bold">Editar</button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(sup.id);
                                        }}
                                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 font-bold text-xs transition-colors cursor-pointer relative z-20"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* CLIENT LIST */}
                        {activeType === 'CLIENT' && clients.map(cli => (
                            <tr key={cli.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900">{cli.name}</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${cli.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                        cli.status === 'LEAD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {cli.status === 'ACTIVE' ? 'Ativo' : cli.status === 'LEAD' ? 'Prospecto' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-mono text-xs">{cli.document}</p>
                                    <p className="text-xs text-gray-400">{cli.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xs">{cli.phone}</p>
                                    <p className="text-xs truncate max-w-[150px]">{cli.city ? `${cli.city}/${cli.state}` : cli.address}</p>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button type="button" onClick={() => handleEdit(cli.id)} className="text-emerald-600 hover:underline text-xs font-bold">Editar</button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete(cli.id);
                                        }}
                                        className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 font-bold text-xs transition-colors cursor-pointer relative z-20"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Empty State */}
                        {((activeType === 'EMPLOYEE' && employees.length === 0) ||
                            (activeType === 'SUPPLIER' && suppliers.length === 0) ||
                            (activeType === 'CLIENT' && clients.length === 0)) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum registro encontrado. Clique em "+ Novo Cadastro".
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>

            {/* --- HIDDEN PRINTABLE SHEET (TEMPLATE) --- */}
            {exportItem && (
                <div
                    ref={sheetRef}
                    style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px' }}
                    className="bg-white p-10 font-sans text-gray-800"
                >
                    <div className="border-2 border-gray-800 p-8 min-h-[1000px] relative">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-2xl font-bold uppercase tracking-wide">Ficha Cadastral</h1>
                                <p className="text-sm font-semibold text-gray-500 mt-1 uppercase">Registro de Funcionário</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Data de Emissão</p>
                                <p className="font-mono text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="flex gap-8">

                            {/* Left: Photo */}
                            <div className="w-40 flex-shrink-0">
                                <div className="w-36 h-48 border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden mb-2">
                                    {exportItem.photoUrl ? (
                                        <img src={exportItem.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-400 text-xs text-center p-2">Sem Foto</span>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 uppercase">Assinatura do Funcionário</p>
                                    <div className="h-8 border-b border-gray-400 mt-4"></div>
                                </div>
                            </div>

                            {/* Right: Data */}
                            <div className="flex-1 space-y-6">

                                {/* Personal Data */}
                                <section>
                                    <h3 className="text-sm font-bold bg-gray-100 p-2 uppercase border-l-4 border-gray-800 mb-3">Dados Pessoais</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="col-span-2">
                                            <span className="block text-xs text-gray-500 uppercase">Nome Completo</span>
                                            <span className="font-bold text-lg">{exportItem.name}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">CPF</span>
                                            <span className="font-mono font-bold">{exportItem.cpf}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Cargo / Função</span>
                                            <span className="font-bold">{exportItem.role}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Salário Base</span>
                                            <span className="font-bold">{formatCurrency(exportItem.salary)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Data de Admissão</span>
                                            <span className="font-bold">{exportItem.admissionDate || '-'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Contact */}
                                <section>
                                    <h3 className="text-sm font-bold bg-gray-100 p-2 uppercase border-l-4 border-gray-800 mb-3">Contato</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Telefone</span>
                                            <span className="font-bold">{exportItem.phone}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Email</span>
                                            <span className="font-bold">{exportItem.email}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Address */}
                                <section>
                                    <h3 className="text-sm font-bold bg-gray-100 p-2 uppercase border-l-4 border-gray-800 mb-3">Endereço</h3>
                                    <div className="text-sm space-y-2">
                                        <p><span className="font-bold">{exportItem.address}, {exportItem.number}</span></p>
                                        <p>{exportItem.district} - {exportItem.city} / {exportItem.state}</p>
                                        <p className="font-mono text-xs text-gray-600">CEP: {exportItem.zipCode}</p>
                                    </div>
                                </section>

                                {/* Bank Data */}
                                <section>
                                    <h3 className="text-sm font-bold bg-gray-100 p-2 uppercase border-l-4 border-gray-800 mb-3">Dados Bancários</h3>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="col-span-3 md:col-span-1">
                                            <span className="block text-xs text-gray-500 uppercase">Banco</span>
                                            <span className="font-bold">{exportItem.bankName || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Agência</span>
                                            <span className="font-bold">{exportItem.agency || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-500 uppercase">Conta</span>
                                            <span className="font-bold">{exportItem.account || '-'}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="block text-xs text-gray-500 uppercase">Chave PIX</span>
                                            <span className="font-bold">{exportItem.pixKey || '-'}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-8 left-8 right-8 border-t border-gray-300 pt-4 flex justify-between text-xs text-gray-400">
                            <p>Documento gerado eletronicamente.</p>
                            <p>Sistema ADM Integrado</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
