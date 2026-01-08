// [AI-LOCK: CLOSED]
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { extractInvoiceData, generateMotivationalMessages } from '../services/geminiService';
import type { InvoiceData, ItemAllocationConfig, ItemConfiguration } from '../types';
import { ImageUploader } from './ImageUploader';
import { InvoiceSummary } from './InvoiceSummary';
import { SignatureSheet } from './SignatureSheet';
import { PantryList } from './PantryList';
import { ReceiptIcon, SignatureIcon, BasketIcon } from './icons';
import { exportToPng, exportToHtml, exportToPdf } from '../utils/exportUtils';
import { SupabaseService } from '../services/supabaseService';
import { getExcludedEmployees, toggleExclusion, getCurrentMonthYear } from '../utils/basketExclusions';

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
    const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
    const [excludedEmployees, setExcludedEmployees] = useState<string[]>([]);
    const [showExclusionModal, setShowExclusionModal] = useState<boolean>(false);
    const [exclusionMonth, setExclusionMonth] = useState<number>(new Date().getMonth() + 1);
    const [exclusionYear, setExclusionYear] = useState<number>(new Date().getFullYear());
    const [exportMenuOpen, setExportMenuOpen] = useState<Tab | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    // Load persistent quota timer on mount
    useEffect(() => {
        const loadQuota = async () => {
            const storedUntil = await SupabaseService.getConfig('folha_ai_quota_until');
            if (storedUntil) {
                const until = parseInt(storedUntil);
                const now = Date.now();
                if (until > now) {
                    setRetryCountdown(Math.ceil((until - now) / 1000));
                }
            }
        };
        loadQuota();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (retryCountdown !== null && retryCountdown > 0) {
            timer = setTimeout(() => {
                const nextValue = retryCountdown - 1;
                setRetryCountdown(nextValue === 0 ? null : nextValue);

                if (nextValue === 0) {
                    SupabaseService.saveConfig('folha_ai_quota_until', '0').catch(() => { });
                    setError(null);
                }
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [retryCountdown]);

    useEffect(() => {
        const handleNavigation = (e: any) => {
            if (e.detail.cestaTab) {
                setActiveTab(e.detail.cestaTab);
            }
        };
        window.addEventListener('app-navigation', handleNavigation);
        return () => window.removeEventListener('app-navigation', handleNavigation);
    }, []);

    // Load and listen for basket exclusions
    useEffect(() => {
        const loadExclusions = () => {
            const excluded = getExcludedEmployees(exclusionMonth, exclusionYear);
            setExcludedEmployees(excluded);
        };
        loadExclusions();

        const handleExclusionsChanged = () => loadExclusions();
        window.addEventListener('basketExclusionsChanged', handleExclusionsChanged);
        return () => window.removeEventListener('basketExclusionsChanged', handleExclusionsChanged);
    }, [exclusionMonth, exclusionYear]);

    useEffect(() => {
        const reloadAllData = async () => {
            let names = actualEmployees;
            let nonDrinkerIndices = selectedNonDrinkers;

            // 1. Load employees from registry
            try {
                const registered = await SupabaseService.getEmployees() || [];
                if (registered.length > 0) {
                    names = registered.map(r => r.name) || [];
                    setActualEmployees(names);

                    // Auto-select non-drinkers based on registry
                    nonDrinkerIndices = registered
                        .map((r, idx) => r.isNonDrinker ? idx : -1)
                        .filter(idx => idx !== -1);
                    setSelectedNonDrinkers(nonDrinkerIndices);
                }
            } catch (e) {
                console.error("Failed to load employees from registry", e);
            }

            // 2. Load Item Allocations based on global configs
            if (invoiceData?.items) {
                let globalConfigs: ItemConfiguration[] = [];
                try {
                    globalConfigs = await SupabaseService.getBasketConfigs();
                } catch (e) {
                    console.error("Failed to load global item configs", e);
                }

                const updatedAllocation: Record<string, ItemAllocationConfig> = {};
                (invoiceData?.items || []).forEach(item => {
                    const desc = (item.description || '').toUpperCase();
                    const configMatch = (globalConfigs || []).find(c => {
                        const keyword = (c.description || '').toUpperCase();
                        return desc === keyword || desc.includes(keyword) || keyword.includes(desc);
                    });

                    if (configMatch) {
                        updatedAllocation[item.id] = configMatch.config;
                    } else {
                        updatedAllocation[item.id] = { mode: 'ALL' };
                    }
                });

                // 3. Auto-Calculate Quantities (Smart Distribution)
                // Filter excluded employees to get accurate count
                const currentExcluded = getExcludedEmployees(exclusionMonth, exclusionYear);
                const activeNames = (names || []).filter(n => !currentExcluded.includes(n));

                const smartAllocation = computeSmartDistribution(
                    invoiceData.items,
                    activeNames.length,
                    nonDrinkerIndices.length,
                    updatedAllocation
                );

                setItemAllocation(smartAllocation);
            }
        };

        reloadAllData();

        if (invoiceData?.recipientName) {
            setCompanyName(invoiceData.recipientName);
        }

        const reloadFromEvents = () => {
            // Avoid reloading while processing to prevent state loss/conflicts
            if (!isLoading) reloadAllData();
        };

        window.addEventListener('storage', reloadFromEvents);
        window.addEventListener('app-data-updated', reloadFromEvents);
        return () => {
            window.removeEventListener('storage', reloadFromEvents);
            window.removeEventListener('app-data-updated', reloadFromEvents);
        };
    }, [invoiceData]);

    const toggleAllocation = (itemId: string, target: 'ALL' | 'NON_DRINKER' | 'DRINKER') => {
        setItemAllocation(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], mode: target }
        }));
    };

    const setCustomQuantity = (itemId: string, qtyNonDrinker: number, qtyDrinker: number) => {
        setItemAllocation(prev => ({
            ...prev,
            [itemId]: {
                mode: 'CUSTOM',
                customQtyNonDrinker: qtyNonDrinker,
                customQtyDrinker: qtyDrinker
            }
        }));
    };

    const toggleEmployeeDrinking = (index: number) => {
        setSelectedNonDrinkers(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const toggleMonthlyExclusion = (employeeName: string) => {
        toggleExclusion(employeeName, exclusionMonth, exclusionYear);
    };

    // Filter out excluded employees for the current month
    const activeEmployees = (actualEmployees || []).filter(name => !(excludedEmployees || []).includes(name));

    // Helper to calculate smart distribution
    const computeSmartDistribution = (
        items: any[],
        totalEmployees: number,
        nonDrinkerCount: number,
        currentAllocations: Record<string, ItemAllocationConfig>
    ) => {
        const drinkerCount = totalEmployees - nonDrinkerCount;
        const result: Record<string, ItemAllocationConfig> = { ...currentAllocations };

        items.forEach(item => {
            const currentConfig = currentAllocations[item.id] || { mode: 'ALL' };
            const unit = item.unit.toUpperCase();

            // Check if unit is discrete (whole numbers only)
            const isDiscrete = ['CX', 'UN', 'PCT', 'UNIDADE', 'CAIXA', 'PACOTE'].includes(unit);

            let qtyNonDrinker = 0;
            let qtyDrinker = 0;

            // Determine strategy based on current mode
            // If already CUSTOM with values, we might want to preserve? 
            // BUT for "Automatic" context, we usually want to recalculate to hit Exact.
            // However, if we just toggled to CUSTOM manually, we shouldn't overwrite.
            // For the 'reloadAllData' call, we want to popluate. 
            // For 'calculateExactQuantities' button, we assume user wants to Force Recalculate.

            if (currentConfig.mode === 'ALL') {
                if (isDiscrete) {
                    const perEmployee = Math.floor(item.quantity / totalEmployees);
                    qtyNonDrinker = perEmployee;
                    qtyDrinker = perEmployee;
                } else {
                    const perEmployee = Math.floor((item.quantity / totalEmployees) * 1000) / 1000;
                    qtyNonDrinker = perEmployee;
                    qtyDrinker = perEmployee;
                }
            } else if (currentConfig.mode === 'NON_DRINKER') {
                if (nonDrinkerCount > 0) {
                    if (isDiscrete) {
                        qtyNonDrinker = Math.floor(item.quantity / nonDrinkerCount);
                    } else {
                        qtyNonDrinker = Math.floor((item.quantity / nonDrinkerCount) * 1000) / 1000;
                    }
                }
                qtyDrinker = 0;
            } else if (currentConfig.mode === 'DRINKER') {
                if (drinkerCount > 0) {
                    if (isDiscrete) {
                        qtyDrinker = Math.floor(item.quantity / drinkerCount);
                    } else {
                        qtyDrinker = Math.floor((item.quantity / drinkerCount) * 1000) / 1000;
                    }
                }
                qtyNonDrinker = 0;
            } else if (currentConfig.mode === 'CUSTOM') {
                // If it's already CUSTOM, we usually preserve it, 
                // UNLESS this function is called explicitly to recalculate (like the button).
                // But for initial load, if it came from GlobalConfig as CUSTOM, it might have fixed values 
                // that don't match current employees. 
                // Let's assume for now we keep existing Custom values if they exist, 
                // but the user complaint is about "ALL" needing values.

                qtyNonDrinker = currentConfig.customQtyNonDrinker || 0;
                qtyDrinker = currentConfig.customQtyDrinker || 0;
            }

            result[item.id] = {
                mode: 'CUSTOM', // Lock into CUSTOM mode so the values persist and show in input fields
                customQtyNonDrinker: qtyNonDrinker,
                customQtyDrinker: qtyDrinker
            };
        });

        return result;
    };

    // Calculate exact quantities for all items automatically
    const calculateExactQuantities = () => {
        if (!invoiceData?.items) return;

        const totalEmployees = activeEmployees.length;
        const nonDrinkerCount = selectedNonDrinkers.length;

        const smartAllocation = computeSmartDistribution(
            invoiceData.items,
            totalEmployees,
            nonDrinkerCount,
            itemAllocation
        );

        setItemAllocation(smartAllocation);
    };

    // Calculate distribution summary statistics
    const getDistributionSummary = () => {
        if (!invoiceData?.items) return null;

        const totalEmployees = activeEmployees.length;
        const nonDrinkerCount = selectedNonDrinkers.length;
        const drinkerCount = totalEmployees - nonDrinkerCount;

        let closedCount = 0;
        let withRemainder = 0;
        let needsMore = 0;

        invoiceData.items.forEach(item => {
            const config = itemAllocation[item.id];
            if (!config) return;

            const distributed = (config.customQtyNonDrinker || 0) * nonDrinkerCount + (config.customQtyDrinker || 0) * drinkerCount;
            const diff = Math.abs(item.quantity - distributed);

            if (diff < 0.001) {
                closedCount++;
            } else if (distributed < item.quantity) {
                withRemainder++;
            } else {
                needsMore++;
            }
        });

        return {
            totalProducts: invoiceData.items.length,
            totalEmployees,
            nonDrinkerCount,
            drinkerCount,
            closedCount,
            withRemainder,
            needsMore
        };
    };

    const summary = getDistributionSummary();

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
        if ((files || []).length === 0) {
            setError('Por favor, carregue pelo menos um arquivo de nota fiscal.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const results: InvoiceData[] = [];

            // Process sequential to avoid RPM limits
            for (let i = 0; i < (files || []).length; i++) {
                const file = files[i];
                const fc = await fileToBase64(file);
                const data = await extractInvoiceData(fc.base64, fc.mimeType);
                results.push(data);

                // Small delay between requests to be gentle with Rate Limits
                if (i < (files || []).length - 1) {
                    await new Promise(r => setTimeout(r, 600));
                }
            }

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
            const errorMsg = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';

            // Extract "retry in X.Xs" from error message
            const retryMatch = errorMsg.match(/retry in ([\d.]+)s/i);
            if (retryMatch) {
                const seconds = Math.ceil(parseFloat(retryMatch[1]));
                const until = Date.now() + (seconds * 1000);
                SupabaseService.saveConfig('folha_ai_quota_until', until.toString());
                setRetryCountdown(seconds);
                setError(`Limite de frequência atingido. O sistema entrará em modo de espera e liberará em breve.`);
            } else {
                setError(errorMsg);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCountdown = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

    const saveBasketToSupabase = async () => {
        if (!invoiceData) return;
        setIsSaving(true);
        setSaveSuccess(false);

        const payload = {
            invoiceData,
            itemAllocation,
            activeEmployees,
            selectedNonDrinkers,
            companyName,
            appMode,
            excludedEmployees,
            timestamp: new Date().toISOString()
        };

        const configId = `basket_dist_${new Date().getFullYear()}_${(new Date().getMonth() + 1).toString().padStart(2, '0')}_${new Date().getDate()}_${new Date().getTime()}`;

        try {
            const success = await SupabaseService.saveConfig(configId, payload);
            if (success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 5000);
            } else {
                alert("Falha ao salvar no banco de dados.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao conectar com o Supabase.");
        } finally {
            setIsSaving(false);
        }
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

    const TabButton: React.FC<{ tabName: Tab, icon: React.ReactNode, label: string }> = ({ tabName, icon, label }) => {
        const isActive = activeTab === tabName;

        return (
            <button
                onClick={() => setActiveTab(tabName)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-black uppercase rounded-none transition-all duration-200 border-b-4 ${isActive
                    ? (appMode === 'CHRISTMAS' ? 'border-red-600 bg-red-50 text-red-700' : 'border-orange-500 bg-orange-50 text-orange-700')
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-slate-50'
                    }`}
            >
                {icon}
                {label}
            </button>
        );
    };

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
            {/* Aggressive Print Styles */}
            <style>{`
                @media print {
                    .print\\:hidden, .hidden-in-export {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        width: 0 !important;
                        position: absolute !important;
                    }
                    /* Ensure body/html allow printing */
                    body, html {
                        visibility: visible !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                }
            `}</style>

            <header className={`bg-white p-6 border-b-4 ${appMode === 'CHRISTMAS' ? 'border-red-600' : 'border-orange-500'} shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden hidden-in-export`}>
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

                    {/* Exclusion Manager removed from here, moving to Step 2 */}
                </div>

                <div className="flex flex-wrap gap-2 print:hidden justify-center md:justify-end">
                    {currentStep === 4 && (
                        <>
                            <button onClick={saveBackup} className="p-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-[10px] font-black uppercase transition-all shadow-md flex items-center gap-1">
                                SALVAR BACKUP LOCAL
                            </button>
                            <label className="p-2 px-3 bg-slate-600 hover:bg-slate-700 text-white rounded-sm text-[10px] font-black uppercase transition-all shadow-md cursor-pointer flex items-center gap-1">
                                <input type="file" className="hidden" onChange={loadBackup} accept=".json" />
                                CARREGAR BACKUP
                            </label>
                        </>
                    )}
                </div>
            </header>

            {/* Exclusion Management Modal */}
            {showExclusionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-orange-500 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black uppercase">Gerenciar Exclusões da Cesta</h2>
                                <p className="text-xs font-bold opacity-90">
                                    {new Date(exclusionYear, exclusionMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExclusionModal(false)}
                                className="p-2 hover:bg-orange-600 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800">
                                <p className="text-xs font-bold mb-1">ℹ️ Funcionários excluídos NÃO receberão cesta no mês selecionado</p>
                                <p className="text-[10px]">Esta exclusão é temporária e específica para o mês atual. Use para casos de faltas que resultam em perda da cesta.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(actualEmployees || []).map((name, idx) => {
                                    const isExcluded = (excludedEmployees || []).includes(name);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => toggleMonthlyExclusion(name)}
                                            className={`p-3 text-left border-2 rounded-lg transition-all flex items-center justify-between ${isExcluded
                                                ? 'bg-red-50 border-red-500 text-red-700'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{isExcluded ? '🚫' : '✅'}</span>
                                                <span className="text-xs font-bold">{name}</span>
                                            </div>
                                            {isExcluded && <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">EXCLUÍDO</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                            <div className="text-xs font-bold text-slate-600">
                                {(excludedEmployees || []).length > 0
                                    ? `${(excludedEmployees || []).length} funcionário(s) excluído(s)`
                                    : 'Nenhum funcionário excluído'}
                            </div>
                            <button
                                onClick={() => setShowExclusionModal(false)}
                                className="px-4 py-2 bg-orange-500 text-white text-xs font-black uppercase rounded-sm hover:bg-orange-600 transition-colors"
                            >
                                Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="space-y-6">
                {currentStep === 1 && (
                    <div className={`bg-white p-8 border-2 ${appMode === 'CHRISTMAS' ? 'border-red-200' : 'border-slate-100'} rounded-sm shadow-sm print:hidden hidden-in-export animate-in fade-in`}>
                        <div className="grid lg:grid-cols-2 gap-8 items-start">
                            {!invoiceData ? (
                                <ImageUploader onFilesReady={handleFilesReady} disabled={isLoading} />
                            ) : (
                                <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl">✅</div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase">Notas Processadas</h3>
                                        <p className="text-sm text-slate-500 font-medium">{(files || []).length} arquivo(s) analisado(s) com sucesso.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setFiles([]);
                                            setInvoiceData(null);
                                        }}
                                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest underline underline-offset-4"
                                    >
                                        Substituir Notas
                                    </button>
                                </div>
                            )}

                            <div className="space-y-6">
                                {!invoiceData ? (
                                    <>
                                        <button
                                            onClick={processInvoices}
                                            disabled={(files || []).length === 0 || isLoading || retryCountdown !== null}
                                            className={`w-full font-black uppercase text-sm py-5 px-8 rounded-none transition-all duration-300 transform hover:scale-[1.01] shadow-xl disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed ${appMode === 'CHRISTMAS' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                                                }`}
                                        >
                                            {isLoading ? 'Analisando via I.A...' : retryCountdown !== null ? `Aguarde ${formatCountdown(retryCountdown)}...` : `Processar ${(files || []).length > 0 ? files.length : ''} Notas`}
                                        </button>

                                        {retryCountdown !== null && (
                                            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 animate-pulse">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">⏳</div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-amber-800 uppercase tracking-tighter">Modo de Espera Ativo</div>
                                                        <div className="text-[14px] font-black text-amber-600 uppercase">Aguarde {formatCountdown(retryCountdown)} para tentar novamente</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {error && !retryCountdown && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase">{error}</div>}
                                    </>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                                        <div className="pb-4 border-b border-slate-100">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Identidade Visual da Cesta</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personalize o cabeçalho dos relatórios</p>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Destinatária</label>
                                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none focus:border-indigo-500 focus:outline-none font-bold text-slate-700 uppercase text-xs" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="cursor-pointer bg-slate-50 border border-slate-200 p-2 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 transition-all overflow-hidden h-20 justify-center">
                                                <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
                                                {companyLogoBase64 ? <img src={companyLogoBase64} alt="Logo" className="h-full w-auto object-contain" /> : 'Logo Empresa'}
                                            </label>
                                            <label className="cursor-pointer bg-slate-50 border border-slate-200 p-2 text-[9px] font-bold text-slate-500 uppercase flex flex-col items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 transition-all overflow-hidden h-20 justify-center">
                                                <input type="file" className="hidden" onChange={handleSloganImageChange} accept="image/*" />
                                                {sloganImageBase64 ? <img src={sloganImageBase64} alt="Slogan" className="h-full w-auto object-contain" /> : 'Slogan Tema'}
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {invoiceData && (
                            <div className="mt-8 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black uppercase rounded-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    Seguinte
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- Targeted Distribution UI --- */}
                {invoiceData && (
                    <>
                        {currentStep === 2 && (
                            <div className="mt-8 pt-8 border-t border-slate-200 animate-in slide-in-from-right-8 duration-500 print:hidden hidden-in-export">
                                {/* Monthly Exclusions integrated here */}
                                <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-lg">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h3 className="text-sm font-black text-red-800 uppercase tracking-tighter flex items-center gap-2">
                                                🚫 Excluir do Mês
                                            </h3>
                                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Selecione quem NÃO receberá a cesta este mês (faltas, etc)</p>
                                        </div>
                                        <button
                                            onClick={() => setShowExclusionModal(true)}
                                            className="px-6 py-2 bg-red-600 text-white text-xs font-black uppercase rounded-sm hover:bg-red-700 transition-colors shadow-md flex items-center gap-2"
                                        >
                                            Gerenciar Excluídos
                                            {(excludedEmployees || []).length > 0 && (
                                                <span className="ml-1 bg-white text-red-600 px-2 py-0.5 rounded-full text-[10px]">
                                                    {excludedEmployees.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                    {(excludedEmployees || []).length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {excludedEmployees.map(name => (
                                                <span key={name} className="bg-red-200 text-red-800 px-2 py-1 rounded text-[9px] font-black uppercase">{name}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-8">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                            🥤 Abstêmios
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Selecione quem receberá a cesta SEM Álcool</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                        {(actualEmployees || []).map((name, idx) => {
                                            const isExcluded = (excludedEmployees || []).includes(name);
                                            const isNonDrinker = (selectedNonDrinkers || []).includes(idx);
                                            if (isExcluded) return null;

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
                                                    <div className="leading-tight shrink-0">{(name || '').split(' ')[0]}</div>
                                                    {isNonDrinker && <div className="mt-1 text-[7px] bg-indigo-600 text-white px-1 rounded-full uppercase">Alcool Free</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2 Buttons */}
                                <div className="mt-8 flex justify-between items-center animate-in fade-in pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="px-6 py-2 text-slate-400 hover:text-slate-600 text-xs font-black uppercase flex items-center gap-2 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 rotate-180">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                        Voltar
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase rounded-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                    >
                                        Seguinte
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="mt-8 pt-8 border-t border-slate-200 animate-in slide-in-from-right-8 duration-500 print:hidden hidden-in-export">
                                <div className="mb-8">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">2. Alocação de Alimentos</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Defina quais itens vão para cada grupo</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(invoiceData?.items || []).map(item => {
                                            const config = (itemAllocation || {})[item.id] || { mode: 'ALL' };
                                            const isCustom = config.mode === 'CUSTOM';
                                            const totalEmployees = activeEmployees.length;
                                            const nonDrinkerCount = (selectedNonDrinkers || []).length;
                                            const drinkerCount = totalEmployees - nonDrinkerCount;

                                            // Calculate divergence
                                            const distributed = (config.customQtyNonDrinker || 0) * nonDrinkerCount + (config.customQtyDrinker || 0) * drinkerCount;
                                            const diff = item.quantity - distributed;
                                            const diffAbs = Math.abs(diff);
                                            const isClosed = diffAbs < 0.001;
                                            const hasRemainder = diff > 0.001;
                                            const needsMore = diff < -0.001;

                                            return (
                                                <div key={item.id} className={`p-3 border-2 rounded-lg transition-all flex flex-col gap-2 ${isClosed ? 'border-green-500 bg-green-50/50 ring-1 ring-green-500/30' :
                                                    needsMore ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500/30' :
                                                        hasRemainder ? 'border-orange-400 bg-orange-50/50 ring-1 ring-orange-400/30' :
                                                            isCustom ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/30' : 'border-slate-200 bg-slate-50/50'
                                                    }`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-[10px] font-bold text-slate-800 truncate uppercase">{item.description}</div>
                                                        <div className="flex gap-1 items-center">
                                                            {isClosed && <span className="text-[7px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full">✅ EXATO</span>}
                                                            {hasRemainder && <span className="text-[7px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full">⚠️ SOBRA</span>}
                                                            {needsMore && <span className="text-[7px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">❌ FALTA</span>}
                                                            {isCustom && (
                                                                <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">PERSONALIZADO</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Total available */}
                                                    <div className="text-[9px] text-slate-500 font-bold">
                                                        Total Disponível: {item.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} {item.unit}
                                                    </div>

                                                    {/* Mode Selection Buttons */}
                                                    <div className="flex gap-1">
                                                        {['ALL', 'NON_DRINKER', 'DRINKER'].map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => toggleAllocation(item.id, type as any)}
                                                                className={`flex-1 text-[8px] font-black p-1.5 rounded-sm border transition-all ${config.mode === type && !isCustom
                                                                    ? (appMode === 'CHRISTMAS' ? 'bg-red-600 border-red-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white')
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                                                                    }`}
                                                            >
                                                                {type === 'ALL' ? 'TODOS' : type === 'NON_DRINKER' ? 'NÃO BEBEM' : 'BEBEM'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Custom Quantity Inputs */}
                                                    <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                                                        <p className="text-[8px] font-black text-amber-700 uppercase mb-2">⚙️ Qtd. Manual por Funcionário</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[8px] font-bold text-slate-600 block mb-1">
                                                                    🥤 Abstêmios ({nonDrinkerCount})
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.001"
                                                                    value={config.customQtyNonDrinker || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        setCustomQuantity(
                                                                            item.id,
                                                                            val,
                                                                            config.customQtyDrinker || 0
                                                                        );
                                                                    }}
                                                                    className="w-full px-2 py-1 border border-indigo-300 rounded text-[10px] font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                    placeholder="0"
                                                                />
                                                                <p className="text-[7px] text-slate-500 mt-0.5">
                                                                    Total: {((config.customQtyNonDrinker || 0) * nonDrinkerCount).toFixed(3)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[8px] font-bold text-slate-600 block mb-1">
                                                                    🍺 Padrão ({drinkerCount})
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.001"
                                                                    value={config.customQtyDrinker || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        setCustomQuantity(
                                                                            item.id,
                                                                            config.customQtyNonDrinker || 0,
                                                                            val
                                                                        );
                                                                    }}
                                                                    className="w-full px-2 py-1 border border-orange-300 rounded text-[10px] font-bold text-orange-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                                    placeholder="0"
                                                                />
                                                                <p className="text-[7px] text-slate-500 mt-0.5">
                                                                    Total: {((config.customQtyDrinker || 0) * drinkerCount).toFixed(3)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-amber-200">
                                                            <p className="text-[8px] font-bold text-amber-800">
                                                                ✅ Soma: {(((config.customQtyNonDrinker || 0) * nonDrinkerCount) + ((config.customQtyDrinker || 0) * drinkerCount)).toFixed(3)} / {item.quantity.toFixed(3)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-8 flex justify-between items-center animate-in fade-in pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="px-6 py-2 text-slate-400 hover:text-slate-600 text-xs font-black uppercase flex items-center gap-2 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 rotate-180">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                            </svg>
                                            Voltar
                                        </button>
                                        <button
                                            onClick={() => setCurrentStep(4)}
                                            className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-black uppercase rounded-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                        >
                                            Finalizar e Ver Listas
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* STEP 4: RESULTS */}
                {
                    currentStep === 4 && invoiceData && (
                        <div id="active-view" className="animate-in slide-in-from-bottom-4 duration-700">
                            {/* GLOBAL ACTIONS BAR (EXPORT & PERSISTENCE) */}
                            <div className="mb-6 p-4 bg-white border-2 border-slate-100 rounded-sm shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase flex items-center gap-2 transition-colors group"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 rotate-180">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                        Editar Distribuição
                                    </button>
                                    <div className="h-6 w-px bg-slate-100"></div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => exportToPdf('active-view', `distribuicao_cesta_${new Date().getTime()}`)}
                                            className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-sm text-[9px] font-black uppercase hover:bg-red-100 transition-colors flex items-center gap-1"
                                        >
                                            📄 PDF
                                        </button>
                                        <button
                                            onClick={() => exportToPng('active-view', `distribuicao_cesta_${activeTab}`)}
                                            className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-sm text-[9px] font-black uppercase hover:bg-orange-100 transition-colors flex items-center gap-1"
                                        >
                                            🖼️ PNG
                                        </button>
                                        <button
                                            onClick={() => exportToHtml('active-view', `distribuicao_cesta_${activeTab}`)}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-sm text-[9px] font-black uppercase hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                        >
                                            🌐 HTML
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={saveBasketToSupabase}
                                    disabled={isSaving}
                                    className={`px-8 py-3 rounded-sm text-xs font-black uppercase transition-all flex items-center gap-2 shadow-lg hover:scale-[1.02] transform active:scale-95 ${saveSuccess
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 text-white hover:bg-slate-900'
                                        }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Salvando...
                                        </>
                                    ) : saveSuccess ? (
                                        <>✅ Salvo com sucesso!</>
                                    ) : (
                                        <>☁️ Salvar no Banco (Supabase)</>
                                    )}
                                </button>
                            </div>

                            {/* NAVIGATION & TABS */}
                            <div className="mb-6 flex flex-col md:flex-row justify-center items-center gap-4 print:hidden">
                                <div className="flex bg-white rounded-sm shadow-sm border border-slate-100 overflow-hidden">
                                    <TabButton tabName="summary" icon={<ReceiptIcon className="w-4 h-4" />} label="Resumo" />
                                    <TabButton tabName="signature" icon={<SignatureIcon className="w-4 h-4" />} label="Assinaturas" />
                                    <TabButton tabName="pantry" icon={<BasketIcon className="w-4 h-4" />} label="Dispensa" />
                                </div>
                            </div>

                            {activeTab === 'summary' && (
                                <InvoiceSummary
                                    data={invoiceData}
                                    slogans={motivationalMessages}
                                    companyName={companyName}
                                    companyLogo={companyLogoBase64}
                                    sloganImage={sloganImageBase64}
                                    isChristmas={appMode === 'CHRISTMAS'}
                                    selectedNonDrinkers={selectedNonDrinkers}
                                    activeEmployees={activeEmployees}
                                    itemAllocation={itemAllocation}
                                />
                            )}
                            {activeTab === 'signature' && (
                                <SignatureSheet
                                    employeeNames={activeEmployees || []}
                                    companyName={companyName}
                                    companyLogo={companyLogoBase64}
                                    isChristmas={appMode === 'CHRISTMAS'}
                                />
                            )}
                            {activeTab === 'pantry' && (
                                <PantryList
                                    items={invoiceData?.items || []}
                                    employeeNames={activeEmployees || []}
                                    selectedNonDrinkers={selectedNonDrinkers}
                                    itemAllocation={itemAllocation}
                                    companyName={companyName}
                                    companyLogo={companyLogoBase64}
                                    isChristmas={appMode === 'CHRISTMAS'}
                                />
                            )}
                        </div>
                    )
                }
            </main >


        </div >
    );
};

