
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { getOrchestrator } from '../services/agentService';
import { SupabaseService } from '../services/supabaseService';
import { showToast } from './shared';

// Modular Imports
import { BiometricsService, DEFAULT_LOGO } from '../services/biometricsService';
import { useBiometrics } from '../hooks/useBiometrics';
import { BiometricsHeader } from './Biometrics/BiometricsHeader';
import { BiometricsTable } from './Biometrics/BiometricsTable';
import { BiometricsSummary } from './Biometrics/BiometricsSummary';

export const BiometricsManager: React.FC<{ isPublic?: boolean; initialFilter?: string; isModal?: boolean; isDarkMode?: boolean }> = ({
    isPublic = false, initialFilter = '', isModal = false, isDarkMode = false
}) => {
    const {
        step, setStep, currentData, setCurrentData, biometricsHistory, setBiometricsHistory,
        biometryDate, setBiometryDate, loadedRecordId, setLoadedRecordId, isAnalyzing, setIsAnalyzing,
        setNeedsSave, filterText, setFilterText, handleProcessAI, syncWithHistory, processedData
    } = useBiometrics(isPublic, initialFilter);

    const [logo, setLogo] = useState<string | null>(DEFAULT_LOGO);
    const [showNewBiometryOptions, setShowNewBiometryOptions] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAddTankModal, setShowAddTankModal] = useState(false);
    const [newTankData, setNewTankData] = useState({ viveiro: '', dataPovoamento: '', quat: '' });

    const dashboardRef = useRef<HTMLDivElement>(null);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    // Load Logo
    useEffect(() => {
        SupabaseService.getConfig('biometry_company_logo').then(savedLogo => {
            if (savedLogo) setLogo(savedLogo);
        });
    }, []);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result) {
                    const newLogo = ev.target.result as string;
                    setLogo(newLogo);
                    await SupabaseService.saveConfig('biometry_company_logo', newLogo);
                    showToast.success("Logo salva!");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateRow = (viveiroKey: string, field: string, value: any) => {
        setCurrentData(prev => {
            const updated = prev.map(item => item.viveiro === viveiroKey ? { ...item, [field]: value } : item);
            return BiometricsService.sortData(updated);
        });
    };

    const handleDeleteRow = (viveiro: string) => {
        if (window.confirm(`Remover viveiro ${viveiro}?`)) {
            setCurrentData(prev => prev.filter(item => item.viveiro !== viveiro));
            setNeedsSave(true);
        }
    };

    const handleAddNewTank = () => {
        if (!newTankData.viveiro) return showToast.error('Digite o nome do viveiro');
        const newRecord = {
            viveiro: newTankData.viveiro.toUpperCase().trim(),
            dataPovoamento: newTankData.dataPovoamento || null,
            quat: newTankData.quat ? parseFloat(newTankData.quat) : null,
            pMedStr: '', pAntStr: '', pesoTotalStr: '', diasCultivo: 0
        };
        setCurrentData(prev => BiometricsService.sortData([...prev, newRecord]));
        setNewTankData({ viveiro: '', dataPovoamento: '', quat: '' });
        setShowAddTankModal(false);
        setNeedsSave(true);
    };

    const exportPDF = () => {
        if (!dashboardRef.current) return;
        const el = dashboardRef.current;
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Biometria_${biometryDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#0B0F1A' : '#ffffff', width: 800 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(el).save();
    };

    if (isModal) {
        return (
            <div className="p-6 h-full overflow-y-auto">
                {processedData.length === 0 ? (
                    <div className="text-center text-gray-400">Nenhuma biometria para este viveiro.</div>
                ) : (
                    <div className="space-y-4">
                        {processedData.map((item, idx) => (
                            <div key={idx} className={`rounded-2xl shadow-lg border p-6 ${item.rowBgColor}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-black text-gray-800">{item.viveiro}</h3>
                                    <div className="bg-white/80 px-3 py-1 rounded-full text-xs font-bold">{item.diasCultivoDisplay} dias</div>
                                </div>
                                <div className="text-5xl font-extrabold text-blue-600">{item.pMedDisplay}g</div>
                                <div className={`mt-2 inline-block px-3 py-1 rounded-lg text-sm ${item.statusTextColor} bg-white/60 border border-white/50`}>
                                    {item.analysisStatus}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (step === 'UPLOAD') {
        return (
            <div className="max-w-4xl mx-auto p-10 bg-white rounded-2xl shadow-xl border border-gray-200 text-center">
                <h1 className="text-3xl font-bold mb-6">Importar Biometria</h1>
                <div
                    className="p-20 border-2 border-dashed border-gray-200 rounded-xl hover:bg-orange-50/30 cursor-pointer"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleProcessAI(e.dataTransfer.files[0]); }}
                    onClick={() => aiFileInputRef.current?.click()}
                >
                    <p className="text-gray-500">Arraste a foto ou clique para selecionar</p>
                </div>
                <input type="file" ref={aiFileInputRef} className="hidden" onChange={e => e.target.files?.[0] && handleProcessAI(e.target.files[0])} />
            </div>
        );
    }

    if (step === 'PROCESSING') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-bold">Processando análise...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8 flex justify-between items-center no-print">
                <div className="flex gap-4">
                    <input type="date" value={biometryDate} onChange={e => setBiometryDate(e.target.value)} className="rounded-xl px-4 py-2 border shadow-sm" />
                    <button onClick={() => setShowHistory(true)} className="px-5 py-2 rounded-xl bg-white border text-sm font-bold">Histórico</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setStep('UPLOAD')} className="px-5 py-2 rounded-xl border text-sm font-bold">Nova</button>
                    <button onClick={exportPDF} className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">PDF</button>
                    {!isPublic && <button onClick={() => setNeedsSave(true)} className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Salvar</button>}
                </div>
            </div>

            <div ref={dashboardRef} className={`w-full max-w-5xl mx-auto rounded-[32px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0B0F1A] border-slate-800' : 'bg-white border-gray-100'}`}>
                <BiometricsHeader
                    logo={logo}
                    biometryDate={biometryDate}
                    isDarkMode={isDarkMode}
                    onLogoClick={() => document.getElementById('logo-upload-input')?.click()}
                />
                <input type="file" id="logo-upload-input" className="hidden" onChange={handleLogoUpload} />

                <div className="p-10">
                    <BiometricsSummary processedData={processedData} isDarkMode={isDarkMode} />
                    <BiometricsTable
                        data={processedData}
                        isPublic={isPublic}
                        isDarkMode={isDarkMode}
                        onUpdateRow={handleUpdateRow}
                        onDeleteRow={handleDeleteRow}
                        onCopy={() => { }}
                    />
                </div>
            </div>

            {showHistory && (
                <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-6">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">Histórico de Biometrias</h2>
                        <div className="space-y-4">
                            {biometricsHistory.map((h, i) => (
                                <div key={i} onClick={() => { setCurrentData(h.data); setStep('DASHBOARD'); setShowHistory(false); }} className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer flex justify-between">
                                    <span className="font-bold">{h.label || `Biometria ${new Date(h.timestamp).toLocaleDateString()}`}</span>
                                    <span className="text-gray-400 text-sm">{h.data?.length} viveiros</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowHistory(false)} className="w-full mt-8 py-3 bg-gray-100 rounded-xl font-bold">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
