import React, { useState, useCallback, FC } from 'react';
import { getOrchestrator } from '../services/agentService';
import { InvoiceData, InvoiceItem, Company } from '../types';
import { ImageUploader } from './ImageUploader';
import { exportToPdf, exportToPng } from '../utils/exportUtils';

interface BudgetPageProps {
    activeCompany?: Company | null;
}

export const BudgetPage: FC<BudgetPageProps> = ({ activeCompany }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [budgetItems, setBudgetItems] = useState<InvoiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [basketCount, setBasketCount] = useState(13);

    const handleFilesReady = useCallback((selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setError(null);
    }, []);

    const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve({ base64: base64String, mimeType: file.type });
            };
            reader.onerror = error => reject(error);
        });
    };

    const processBudget = async () => {
        if (files.length === 0) {
            setError('Carregue as notas para gerar o orçamento.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const allItems: InvoiceItem[] = [];
            const orchestrator = getOrchestrator();
            for (const file of files) {
                const fc = await fileToBase64(file);

                const data = await orchestrator.routeToAgent('budget-management', {
                    image: fc.base64,
                    mimeType: fc.mimeType
                });

                // Map issuer info to each item for the table
                const itemsWithIssuer = data.items.map((item: any) => ({
                    ...item,
                    issuerName: data.issuerName,
                    issuerAddress: data.issuerAddress
                }));
                allItems.push(...itemsWithIssuer);
            }
            setBudgetItems(prev => [...prev, ...allItems]);
            setFiles([]); // Clear files after processing
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao processar orçamento.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        setBudgetItems(prev => {
            const next = [...prev];
            const item = { ...next[index], [field]: value };

            // Recalculate total if quantity or price changes
            if (field === 'quantity' || field === 'price') {
                item.total = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            }

            next[index] = item;
            return next;
        });
    };

    const addItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            code: '',
            description: 'NOVO PRODUTO',
            quantity: 1,
            unit: 'UN',
            price: 0,
            total: 0,
            issuerName: '',
            issuerAddress: ''
        };
        setBudgetItems(prev => [...prev, newItem]);
    };

    const removeRow = (index: number) => {
        setBudgetItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalSum = budgetItems.reduce((sum, item) => sum + item.total, 0);
    const totalBaskets = totalSum * basketCount;
    const currentDate = new Date().toLocaleDateString('pt-BR');

    const PHLogo = () => (
        <div className="flex items-center gap-1">
            <div className="bg-orange-600 p-1 rounded-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
            </div>
            <div className="text-[10px] font-black leading-tight">
                <div className="text-orange-600">PREÇO</div>
                <div className="text-slate-800">DA HORA</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 border-b-4 border-orange-500 shadow-sm">
                <div className="flex items-center gap-4">
                    {activeCompany?.logoUrl && (
                        <img src={activeCompany.logoUrl} alt="Logo Empresa" className="h-10 w-auto object-contain" />
                    )}
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Orçamento</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Controle de Cestas Básicas</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <PHLogo />
                    <div className="flex gap-2 print:hidden">
                        {budgetItems.length > 0 && (
                            <>
                                <button
                                    onClick={addItem}
                                    className="bg-slate-800 text-white px-3 py-2 rounded-sm text-xs font-black uppercase hover:bg-slate-900 transition-all flex items-center gap-1"
                                >
                                    <span>+</span> Item
                                </button>
                                <button
                                    onClick={() => exportToPdf('budget-view', `orcamento_${new Date().getTime()}`, { pagebreak: { mode: 'css' } })}
                                    className="bg-red-600 text-white px-4 py-2 rounded-sm text-xs font-black uppercase shadow-md hover:bg-red-700 transition-all"
                                >
                                    Baixar PDF
                                </button>
                                <button
                                    onClick={() => exportToPng('budget-view', `orcamento_${new Date().getTime()}`)}
                                    className="bg-orange-500 text-white px-4 py-2 rounded-sm text-xs font-black uppercase shadow-md hover:bg-orange-600 transition-all"
                                >
                                    Baixar PNG
                                </button>
                                <button
                                    onClick={() => setBudgetItems([])}
                                    className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                                    title="Limpar tudo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {!budgetItems.length ? (
                <div className="bg-white p-8 border-2 border-slate-100 rounded-sm shadow-sm max-w-4xl mx-auto space-y-6">
                    <ImageUploader onFilesReady={handleFilesReady} disabled={isLoading} />
                    <div className="flex gap-2">
                        <button
                            onClick={processBudget}
                            disabled={files.length === 0 || isLoading}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-4 rounded-none transition-all disabled:bg-slate-200"
                        >
                            {isLoading ? 'Analisando Preços...' : `Gerar Orçamento (${files.length} Notas)`}
                        </button>
                        <button
                            onClick={addItem}
                            className="px-6 bg-slate-800 text-white font-black uppercase hover:bg-slate-900 transition-all"
                        >
                            Manual
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold uppercase text-center">{error}</p>}
                </div>
            ) : (
                <div id="budget-view" className="bg-white p-2" style={{ border: '6px solid #f97316' }}>
                    <div className="p-4 border-b-2 mb-4 text-center relative" style={{ borderColor: '#f97316' }}>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                            {activeCompany?.logoUrl && <img src={activeCompany.logoUrl} alt="logo" className="h-12" />}
                        </div>
                        <h1 className="text-xl font-black uppercase text-slate-800 leading-tight">
                            LISTA DE PRODUTOS PARA CESTAS BÁSICAS - {activeCompany?.name || 'OCEAN'}
                        </h1>
                        <p className="text-sm font-black text-slate-600 mt-1 uppercase">
                            (PESQUISADO NO APP PREÇO DA HORA) - {currentDate}
                        </p>
                    </div>

                    <div className="px-2">
                        <table className="w-full text-left border-collapse border-2" style={{ borderColor: '#f97316' }}>
                            <thead>
                                <tr className="bg-orange-50" style={{ borderBottom: '2px solid #f97316' }}>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>QUANT.</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>UNI. DE MEDIDA</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>MATERIAL</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>PREÇO UNIT.</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>VALOR TOTAL</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>ESTABELECIMENTO</th>
                                    <th className="p-2 border-r-2 text-[10px] font-black uppercase text-slate-800" style={{ borderColor: '#f97316' }}>ENDEREÇO</th>
                                    <th className="p-2 text-[10px] font-black uppercase text-slate-800 print:hidden" data-html2canvas-ignore="true">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2" style={{ borderColor: '#f97316' }}>
                                {budgetItems.map((item, i) => (
                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                        <td className="p-0 border-r-2 align-middle" style={{ borderColor: '#f97316' }}>
                                            <input
                                                type="text"
                                                value={item.quantity || ''}
                                                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                                placeholder="0"
                                                className="w-full p-2 min-h-[40px] bg-transparent text-[11px] font-bold text-slate-900 outline-none border-none text-center"
                                            />
                                        </td>
                                        <td className="p-0 border-r-2 align-middle" style={{ borderColor: '#f97316' }}>
                                            <input
                                                type="text"
                                                value={item.unit || ''}
                                                onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                                placeholder="UN"
                                                className="w-full p-2 min-h-[40px] bg-transparent text-[11px] font-bold text-slate-900 outline-none border-none text-center uppercase"
                                            />
                                        </td>
                                        <td className="p-0 border-r-2 align-middle" style={{ borderColor: '#f97316', width: '25%' }}>
                                            <textarea
                                                rows={1}
                                                value={item.description || ''}
                                                onChange={(e) => updateItem(i, 'description', e.target.value)}
                                                className="w-full p-2 min-h-[40px] bg-transparent text-[11px] font-black text-slate-900 uppercase outline-none border-none resize-none overflow-hidden"
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 'px';
                                                }}
                                            />
                                        </td>
                                        <td className="p-0 border-r-2 align-middle" style={{ borderColor: '#f97316' }}>
                                            <div className="flex items-center px-1">
                                                <span className="text-[9px] text-slate-400 font-bold">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.price || 0}
                                                    onChange={(e) => updateItem(i, 'price', e.target.value)}
                                                    className="w-full p-2 min-h-[40px] bg-transparent text-[11px] font-bold text-slate-900 outline-none border-none"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-2 border-r-2 text-[11px] font-black text-indigo-700 align-middle" style={{ borderColor: '#f97316' }}>
                                            {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="p-0 border-r-2 align-middle" style={{ borderColor: '#f97316', width: '20%' }}>
                                            <textarea
                                                rows={1}
                                                value={item.issuerName || ''}
                                                onChange={(e) => updateItem(i, 'issuerName', e.target.value)}
                                                className="w-full p-2 min-h-[40px] bg-transparent text-[11px] font-black text-slate-900 uppercase outline-none border-none resize-none overflow-hidden"
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 'px';
                                                }}
                                            />
                                        </td>
                                        <td className="p-0 align-middle">
                                            <textarea
                                                rows={1}
                                                value={item.issuerAddress || ''}
                                                onChange={(e) => updateItem(i, 'issuerAddress', e.target.value)}
                                                className="w-full p-2 min-h-[40px] bg-transparent text-[9px] font-bold text-slate-700 uppercase outline-none border-none resize-none overflow-hidden leading-tight"
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 'px';
                                                }}
                                            />
                                        </td>
                                        <td className="p-2 text-center print:hidden align-middle" data-html2canvas-ignore="true">
                                            <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a1 1 0 0 0 0 2h.708l.694 10.392A3 3 0 0 0 7.398 19h5.204a3 3 0 0 0 2.996-2.608L16.292 6H17a1 1 0 0 0 0-2h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM8 4v-.25c0-.414.336-.75.75-.75h2.5c.414 0 .75.336.75.75V4H8Z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50 border-t-4" style={{ borderColor: '#f97316' }}>
                                    <td colSpan={4} className="p-3 text-right text-[11px] font-black uppercase text-slate-700 border-r-2" style={{ borderColor: '#f97316' }}>VALOR 1 CESTA:</td>
                                    <td colSpan={3} className="p-3 text-sm font-black text-indigo-800 border-r-2" style={{ borderColor: '#f97316' }}>
                                        {totalSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="print:hidden" data-html2canvas-ignore="true"></td>
                                </tr>
                                <tr className="bg-orange-50 border-t-2" style={{ borderColor: '#f97316' }}>
                                    <td colSpan={4} className="p-3 text-right text-[11px] font-black uppercase text-orange-800 border-r-2" style={{ borderColor: '#f97316' }}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>VALOR</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={basketCount}
                                                onChange={(e) => setBasketCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-12 px-1 py-0.5 border border-orange-300 rounded text-center text-[11px] font-black text-orange-700 bg-white"
                                                data-html2canvas-ignore="true"
                                            />
                                            <span>CESTAS:</span>
                                        </div>
                                    </td>
                                    <td colSpan={3} className="p-3 text-base font-black text-orange-600 border-r-2" style={{ borderColor: '#f97316' }}>
                                        {totalBaskets.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="print:hidden" data-html2canvas-ignore="true"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

