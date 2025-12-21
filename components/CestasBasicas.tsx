import React, { useState, useCallback, useEffect } from 'react';
import { extractInvoiceData, generateMotivationalMessages } from '../services/geminiService';
import type { InvoiceData, ItemAllocationConfig, ItemConfiguration } from '../types';
import { ImageUploader } from './ImageUploader';
import { InvoiceSummary } from './InvoiceSummary';
import { SignatureSheet } from './SignatureSheet';
import { PantryList } from './PantryList';
import { ReceiptIcon, SignatureIcon, BasketIcon } from './icons';
import { exportToPng, exportToHtml } from '../utils/exportUtils';

type Tab = 'summary' | 'signature' | 'pantry';
type AppMode = 'BASIC' | 'CHRISTMAS';

const employeeNames = [
    "Albervan Souza Nobre", "Claudinei conceição dos Santos", "Cristiano Almeida dos Santos",
    "Edinaldo Santos de Oliveira", "Evaldo Santos de Jesus", "Flonilto dos Santos Reis",
    "Gabriel Santos costa", "Jonh Pablo Henrique Dos Santos Dias", "Luis Pablo dos Santos Dias",
    "Márcio Marques leite", "Mateus Borges santos", "Wesley Silva dos Santos",
    "Luanthony Lula Oliveira", "Ricardo Santos de Jesus"
];

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error('Failed to read file.'));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context.'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', 0.9);
            };
            img.onerror = (err) => reject(new Error('Failed to load image. It might be corrupted.'));
        };
        reader.onerror = (err) => reject(new Error('Failed to read file.'));
    });
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const fileToBase64 = async (file: File): Promise<{ base64: string, mimeType: string }> => {
    let fileToProcess = file;
    if (file.size > MAX_FILE_SIZE_BYTES && file.type.startsWith('image/')) {
        try {
            fileToProcess = await resizeImage(file, 2048, 2048);
        } catch (error) {
            console.error("Image resize failed:", error);
            throw new Error(`A imagem '${file.name}' é muito grande e falhou ao ser redimensionada.`);
        }
    }
    if (fileToProcess.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`O arquivo '${fileToProcess.name}' é muito grande.`);
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileToProcess);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({ base64: base64String, mimeType: fileToProcess.type });
        };
        reader.onerror = error => reject(error);
    });
};

export const CestasBasicas: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [actualEmployees, setActualEmployees] = useState<string[]>(employeeNames);
    const [motivationalMessages, setMotivationalMessages] = useState<string[]>([]);
    const [companyName, setCompanyName] = useState<string>('');
    const [companyLogoBase64, setCompanyLogoBase64] = useState<string | null>(null);
    const [sloganImageBase64, setSloganImageBase64] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const [selectedNonDrinkers, setSelectedNonDrinkers] = useState<number[]>([]);
    const [itemAllocation, setItemAllocation] = useState<Record<string, ItemAllocationConfig>>({});

    useEffect(() => {
        const handleNavigation = (e: any) => {
            if (e.detail.cestaTab) {
                setActiveTab(e.detail.cestaTab);
            }
        };
        window.addEventListener('app-navigation', handleNavigation);
        return () => window.removeEventListener('app-navigation', handleNavigation);
    }, []);

    useEffect(() => {
        const reloadAllData = () => {
            // 1. Load employees from registry
            try {
                const storedEmployees = localStorage.getItem('folha_registry_employees');
                if (storedEmployees) {
                    const registered: any[] = JSON.parse(storedEmployees);
                    if (registered.length > 0) {
                        const names = registered.map(r => r.name);
                        setActualEmployees(names);

                        // Auto-select non-drinkers based on registry
                        const nonDrinkerIndices = registered
                            .map((r, idx) => r.isNonDrinker ? idx : -1)
                            .filter(idx => idx !== -1);
                        setSelectedNonDrinkers(nonDrinkerIndices);
                    }
                }
            } catch (e) {
                console.error("Failed to load employees from registry", e);
            }

            // 2. Load Item Allocations based on global configs
            if (invoiceData?.items) {
                let globalConfigs: ItemConfiguration[] = [];
                try {
                    const storedConfigs = localStorage.getItem('folha_basket_item_configs');
                    if (storedConfigs) globalConfigs = JSON.parse(storedConfigs);
                } catch (e) {
                    console.error("Failed to load global item configs", e);
                }

                const updatedAllocation: Record<string, ItemAllocationConfig> = {};
                invoiceData.items.forEach(item => {
                    const desc = item.description.toUpperCase();
                    const configMatch = globalConfigs.find(c => {
                        const keyword = c.description.toUpperCase();
                        // Precise matching or keyword inclusion
                        return desc === keyword || desc.includes(keyword) || keyword.includes(desc);
                    });

                    if (configMatch) {
                        updatedAllocation[item.id] = configMatch.config;
                    } else {
                        updatedAllocation[item.id] = { mode: 'ALL' };
                    }
                });
                setItemAllocation(updatedAllocation);
            }
        };

        reloadAllData();

        if (invoiceData?.recipientName) {
            setCompanyName(invoiceData.recipientName);
        }

        window.addEventListener('storage', reloadAllData);
        window.addEventListener('app-data-updated', reloadAllData);
        return () => {
            window.removeEventListener('storage', reloadAllData);
            window.removeEventListener('app-data-updated', reloadAllData);
        };
    }, [invoiceData]);

    const toggleAllocation = (itemId: string, target: 'ALL' | 'NON_DRINKER' | 'DRINKER') => {
        setItemAllocation(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], mode: target }
        }));
    };

    const toggleEmployeeDrinking = (index: number) => {
        setSelectedNonDrinkers(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = () => setCompanyLogoBase64(reader.result as string);
        }
    };

    const handleSloganImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = () => setSloganImageBase64(reader.result as string);
        }
    };

    const handleFilesReady = useCallback((selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setInvoiceData(null);
        setError(null);
    }, []);

    const processInvoices = async () => {
        if (files.length === 0) {
            setError('Por favor, carregue pelo menos um arquivo de nota fiscal.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fileContents = await Promise.all(files.map(fileToBase64));
            const results = await Promise.all(
                fileContents.map(fc => extractInvoiceData(fc.base64, fc.mimeType))
            );

            const aiMessages = await generateMotivationalMessages(actualEmployees);
            setMotivationalMessages(aiMessages);

            if (results.length > 0) {
                const aggregatedData: InvoiceData = {
                    ...results[0],
                    totalValue: results.reduce((sum, data) => sum + data.totalValue, 0),
                    items: results.flatMap(data => data.items)
                };
                setInvoiceData(aggregatedData);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const saveBackup = () => {
        if (!invoiceData) return;
        const backup = {
            invoiceData,
            motivationalMessages,
            companyName,
            companyLogoBase64,
            sloganImageBase64,
            appMode,
            selectedNonDrinkers,
            itemAllocation,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_cesta_${new Date().getTime()}.json`;
        link.click();
    };

    const loadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target?.result as string);
                setInvoiceData(backup.invoiceData);
                setMotivationalMessages(backup.motivationalMessages);
                setCompanyName(backup.companyName);
                setCompanyLogoBase64(backup.companyLogoBase64);
                setSloganImageBase64(backup.sloganImageBase64);
                setAppMode(backup.appMode);
                setSelectedNonDrinkers(backup.selectedNonDrinkers || []);
                setItemAllocation(backup.itemAllocation || {});
                setActiveTab('summary');
            } catch (err) {
                alert('Falha ao carregar backup.');
            }
        };
        reader.readAsText(file);
    };

    const TabButton: React.FC<{ tabName: Tab, icon: React.ReactNode, label: string }> = ({ tabName, icon, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-black uppercase rounded-none transition-all duration-200 border-b-4 ${activeTab === tabName
                ? (appMode === 'CHRISTMAS' ? 'border-red-600 bg-red-50 text-red-700' : 'border-orange-500 bg-orange-50 text-orange-700')
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    // --- Initial Mode Selection ---
    if (!appMode) {
        return (
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[500px] space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Módulo de Cestas</h1>
                    <p className="text-slate-500 font-medium">Selecione o tipo de distribuição para hoje</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <button
                        onClick={() => setAppMode('BASIC')}
                        className="group relative bg-white border-4 border-orange-500 p-12 hover:bg-orange-500 transition-all duration-500 rounded-sm overflow-hidden shadow-xl"
                    >
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <BasketIcon className="w-16 h-16 text-orange-500 group-hover:text-white transition-colors" />
                            <span className="text-2xl font-black text-orange-500 group-hover:text-white uppercase tracking-tighter">Cesta Básica</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setAppMode('CHRISTMAS')}
                        className="group relative bg-white border-4 border-red-600 p-12 hover:bg-red-600 transition-all duration-500 rounded-sm overflow-hidden shadow-xl"
                    >
                        <div className="absolute top-2 right-2 text-2xl opacity-40 group-hover:opacity-100 transition-opacity">🎄❄️</div>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="text-4xl">🎁</div>
                            <span className="text-2xl font-black text-red-600 group-hover:text-white uppercase tracking-tighter">Cesta de Natal</span>
                        </div>
                    </button>
                </div>

                <div className="text-center">
                    <label className="cursor-pointer text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-2">
                        <input type="file" className="hidden" onChange={loadBackup} accept=".json" />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        OU Carregar Backup Anterior
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 ${appMode === 'CHRISTMAS' ? 'christmas-theme' : ''}`}>
            <header className={`bg-white p-6 border-b-4 ${appMode === 'CHRISTMAS' ? 'border-red-600' : 'border-orange-500'} shadow-sm flex flex-col md:flex-row justify-between items-center gap-4`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => setAppMode(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div className={`w-12 h-12 flex items-center justify-center text-3xl`}>
                        {appMode === 'CHRISTMAS' ? '🎅' : '📦'}
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black uppercase tracking-tighter ${appMode === 'CHRISTMAS' ? 'text-red-700' : 'text-slate-800'}`}>
                            {appMode === 'CHRISTMAS' ? 'Cesta de Natal' : 'Cesta Básica'}
                        </h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Processamento Digital de Notas Fiscais</p>
                    </div>
                </div>

                <div className="flex gap-2 print:hidden">
                    <div className="relative group/export">
                        <button className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-[10px] font-bold uppercase transition-all shadow-md flex items-center gap-1">
                            Exportar
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 shadow-xl rounded-sm py-1 hidden group-hover/export:block z-50">
                            <button onClick={() => window.print()} className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-tighter border-b border-slate-100">Como PDF (Imp.)</button>
                            <button onClick={() => exportToPng(`active-view`, `cesta_${activeTab}`)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-tighter border-b border-slate-100">Como Imagem (PNG)</button>
                            <button onClick={() => exportToHtml(`active-view`, `cesta_${activeTab}`)} className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-tighter">Como Página (HTML)</button>
                        </div>
                    </div>
                    <button onClick={saveBackup} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm text-[10px] font-bold uppercase transition-all shadow-sm">
                        Salvar Backup
                    </button>
                </div>
            </header>

            <main className="space-y-6">
                <div className={`bg-white p-8 border-2 ${appMode === 'CHRISTMAS' ? 'border-red-200' : 'border-slate-100'} rounded-sm shadow-sm`}>
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        <ImageUploader onFilesReady={handleFilesReady} disabled={isLoading} />
                        <div className="space-y-6">
                            <button
                                onClick={processInvoices}
                                disabled={files.length === 0 || isLoading}
                                className={`w-full font-black uppercase text-sm py-5 px-8 rounded-none transition-all duration-300 transform hover:scale-[1.01] shadow-xl disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed ${appMode === 'CHRISTMAS' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    }`}
                            >
                                {isLoading ? 'Analisando via I.A...' : `Processar ${files.length > 0 ? files.length : ''} Notas`}
                            </button>
                            {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase">{error}</div>}

                            {invoiceData && (
                                <div className="space-y-4 pt-6 border-t border-slate-50">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Destinatária</label>
                                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none focus:border-indigo-500 focus:outline-none font-bold text-slate-700 uppercase text-xs" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="cursor-pointer bg-slate-50 border border-slate-200 p-2 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                                            <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
                                            {companyLogoBase64 ? <img src={companyLogoBase64} alt="Logo" className="h-8 w-auto object-contain" /> : 'Logo Empresa'}
                                        </label>
                                        <label className="cursor-pointer bg-slate-50 border border-slate-200 p-2 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                                            <input type="file" className="hidden" onChange={handleSloganImageChange} accept="image/*" />
                                            {sloganImageBase64 ? <img src={sloganImageBase64} alt="Slogan" className="h-8 w-auto object-contain" /> : 'Slogan Tema'}
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Targeted Distribution UI --- */}
                    {invoiceData && (
                        <div className="mt-8 pt-8 border-t border-slate-200 animate-in slide-in-from-top-4 duration-500">
                            <div className="mb-8">
                                <div className="mb-4">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">1. Identificar Funcionários que NÃO BEBEM</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Selecione quem receberá a cesta sem álcool</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                    {actualEmployees.map((name, idx) => {
                                        const isNonDrinker = selectedNonDrinkers.includes(idx);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => toggleEmployeeDrinking(idx)}
                                                className={`p-3 text-[9px] font-black uppercase text-center border-2 transition-all rounded-sm flex flex-col items-center justify-between min-h-[70px] ${isNonDrinker
                                                    ? (appMode === 'CHRISTMAS' ? 'bg-red-50 border-red-600 text-red-700' : 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-inner')
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="text-xl mb-1">{isNonDrinker ? '🥤' : '🍺'}</div>
                                                <div className="leading-tight shrink-0">{name.split(' ')[0]}</div>
                                                {isNonDrinker && <div className="mt-1 text-[7px] bg-indigo-600 text-white px-1 rounded-full">SEM ÁLCOOL</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mb-8">
                                <div className="mb-4">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">2. Alocação de Alimentos</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Defina quais itens vão para cada grupo</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {invoiceData.items.map(item => {
                                        const config = itemAllocation[item.id] || { mode: 'ALL' };
                                        const isCustom = config.mode === 'CUSTOM';

                                        return (
                                            <div key={item.id} className={`p-3 border rounded-sm transition-all flex flex-col gap-2 ${isCustom ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400/20' : 'border-slate-200 bg-slate-50/50'
                                                }`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="text-[10px] font-bold text-slate-800 truncate uppercase">{item.description}</div>
                                                    {isCustom && (
                                                        <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">PERSONALIZADO IA</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    {['ALL', 'NON_DRINKER', 'DRINKER'].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => toggleAllocation(item.id, type as any)}
                                                            className={`flex-1 text-[8px] font-black p-1.5 rounded-none border transition-all ${config.mode === type
                                                                ? (appMode === 'CHRISTMAS' ? 'bg-red-600 border-red-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white')
                                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                                                                }`}
                                                        >
                                                            {type === 'ALL' ? 'TODOS' : type === 'NON_DRINKER' ? 'NÃO BEBEM' : 'BEBEM'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* --- Active Rules Panel (Debug/Visibility) --- */}
                            {Object.values(itemAllocation).some((config) => (config as ItemAllocationConfig).mode === 'CUSTOM') && (
                                <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-200 rounded-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">⚙️</span>
                                            <div>
                                                <h3 className="text-sm font-black text-amber-800 uppercase tracking-tighter">Regras Ativas de Distribuição</h3>
                                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest text-left">Ajustes manuais ou via I.A.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('folha_basket_item_configs');
                                                window.dispatchEvent(new Event('app-data-updated'));
                                            }}
                                            className="px-3 py-1 bg-amber-600 text-white text-[9px] font-black uppercase rounded-sm hover:bg-amber-700 transition-all"
                                        >
                                            Limpar Todas as Regras
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {invoiceData.items.filter(item => itemAllocation[item.id]?.mode === 'CUSTOM').map(item => {
                                            const config = itemAllocation[item.id];
                                            return (
                                                <div key={item.id} className="flex justify-between items-center bg-white p-2 border border-amber-200 text-[10px]">
                                                    <span className="font-bold text-slate-700 uppercase">{item.description}</span>
                                                    <div className="flex gap-4 font-black">
                                                        <span className="text-indigo-600">🥤 {config.customQtyNonDrinker} p/ Abstêmio</span>
                                                        <span className="text-orange-600">🍺 {config.customQtyDrinker} p/ Padrão</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {invoiceData && (
                    <div className="space-y-6">
                        <div className="flex justify-center bg-white border-b-2 border-slate-100 sticky top-0 z-40 shadow-sm print:hidden">
                            <TabButton tabName="summary" icon={<ReceiptIcon className="w-5 h-5" />} label="Resumo" />
                            <TabButton tabName="signature" icon={<SignatureIcon className="w-5 h-5" />} label="Assinaturas" />
                            <TabButton tabName="pantry" icon={<BasketIcon className="w-5 h-5" />} label="Lista p/ Funcionário" />
                        </div>

                        <div id="active-view" className="animate-in fade-in duration-700">
                            {activeTab === 'summary' && <InvoiceSummary data={invoiceData} companyName={companyName} sloganImage={sloganImageBase64} companyLogo={companyLogoBase64} />}
                            {activeTab === 'signature' && <SignatureSheet employeeNames={actualEmployees} companyName={companyName} recipientCnpj={invoiceData.recipientCnpj} sloganImage={sloganImageBase64} companyLogo={companyLogoBase64} />}
                            {activeTab === 'pantry' && (
                                <PantryList
                                    data={invoiceData}
                                    employeeNames={actualEmployees}
                                    motivationalMessages={motivationalMessages}
                                    sloganImage={sloganImageBase64}
                                    companyName={companyName}
                                    recipientCnpj={invoiceData.recipientCnpj}
                                    companyLogo={companyLogoBase64}
                                    selectedNonDrinkers={selectedNonDrinkers}
                                    itemAllocation={itemAllocation}
                                    appMode={appMode}
                                />
                            )}
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
        .christmas-theme {
            --brand-color: #dc2626;
            --secondary-color: #166534;
        }
        @media print {
            .christmas-theme header, .christmas-theme .print\\:hidden { display: none !important; }
            .christmas-theme .border-orange-500 { border-color: #dc2626 !important; }
            .christmas-theme .bg-orange-500 { background-color: #dc2626 !important; }
            .christmas-theme .text-indigo-600 { color: #dc2626 !important; }
        }
      `}} />
        </div>
    );
};

export default CestasBasicas;
