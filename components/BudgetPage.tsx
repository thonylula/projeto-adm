import React, { useState, useCallback, FC } from 'react';
import { extractInvoiceData } from '../services/geminiService';
import { InvoiceData, InvoiceItem, Company } from '../types';
import { ImageUploader } from './ImageUploader';
import { exportToPdf } from '../utils/exportUtils';

interface BudgetPageProps {
    activeCompany?: Company | null;
}

export const BudgetPage: FC<BudgetPageProps> = ({ activeCompany }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [budgetItems, setBudgetItems] = useState<InvoiceItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            for (const file of files) {
                const fc = await fileToBase64(file);
                const data = await extractInvoiceData(fc.base64, fc.mimeType);

                // Map issuer info to each item for the table
                const itemsWithIssuer = data.items.map(item => ({
                    ...item,
                    issuerName: data.issuerName,
                    issuerAddress: data.issuerAddress
                }));
                allItems.push(...itemsWithIssuer);
            }
            setBudgetItems(allItems);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao processar orçamento.');
        } finally {
            setIsLoading(false);
        }
    };

    const totalSum = budgetItems.reduce((sum, item) => sum + item.total, 0);
    const total13Baskets = totalSum * 13;
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
                    {budgetItems.length > 0 && (
                        <button
                            onClick={() => exportToPdf('budget-view', `orcamento_${new Date().getTime()}`)}
                            className="bg-red-600 text-white px-4 py-2 rounded-sm text-xs font-black uppercase shadow-md hover:bg-red-700 transition-all"
                        >
                            Baixar PDF
                        </button>
                    )}
                </div>
            </header>

            {!budgetItems.length ? (
                <div className="bg-white p-8 border-2 border-slate-100 rounded-sm shadow-sm max-w-4xl mx-auto space-y-6">
                    <ImageUploader onFilesReady={handleFilesReady} disabled={isLoading} />
                    <button
                        onClick={processBudget}
                        disabled={files.length === 0 || isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-4 rounded-none transition-all disabled:bg-slate-200"
                    >
                        {isLoading ? 'Analisando Preços...' : `Gerar Orçamento (${files.length} Notas)`}
                    </button>
                    {error && <p className="text-red-500 text-xs font-bold uppercase text-center">{error}</p>}
                </div>
            ) : (
                <div id="budget-view" className="bg-white p-2" style={{ border: '6px solid #f97316' }}>
                    <div className="p-4 border-b-2 mb-4 text-center relative" style={{ borderColor: '#f97316' }}>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20">
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
                                    {['QUANT.', 'UNI. DE MEDIDA', 'MATERIAL', 'PREÇO UNIT.', 'VALOR TOTAL', 'ESTABELECIMENTO', 'ENDEREÇO'].map(h => (
                                        <th key={h} className="p-2 border-r-2 last:border-r-0 text-[10px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y-2" style={{ borderColor: '#f97316' }}>
                                {budgetItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-2 border-r-2 text-[11px] font-bold" style={{ borderColor: '#f97316' }}>{item.quantity}</td>
                                        <td className="p-2 border-r-2 text-[11px] font-bold" style={{ borderColor: '#f97316' }}>{item.unit}</td>
                                        <td className="p-2 border-r-2 text-[11px] font-black uppercase" style={{ borderColor: '#f97316' }}>{item.description}</td>
                                        <td className="p-2 border-r-2 text-[11px] font-bold" style={{ borderColor: '#f97316' }}>{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 border-r-2 text-[11px] font-black text-indigo-700" style={{ borderColor: '#f97316' }}>{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 border-r-2 text-[11px] font-black uppercase" style={{ borderColor: '#f97316' }}>{item.issuerName}</td>
                                        <td className="p-2 text-[9px] font-bold text-slate-600 uppercase leading-tight">{item.issuerAddress}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50 border-t-4" style={{ borderColor: '#f97316' }}>
                                    <td colSpan={4} className="p-3 text-right text-[11px] font-black uppercase text-slate-700 border-r-2" style={{ borderColor: '#f97316' }}>VALOR 1 CESTA:</td>
                                    <td colSpan={3} className="p-3 text-sm font-black text-indigo-800">
                                        {totalSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                                <tr className="bg-orange-50 border-t-2" style={{ borderColor: '#f97316' }}>
                                    <td colSpan={4} className="p-3 text-right text-[11px] font-black uppercase text-orange-800 border-r-2" style={{ borderColor: '#f97316' }}>VALOR 13 CESTAS:</td>
                                    <td colSpan={3} className="p-3 text-base font-black text-orange-600">
                                        {total13Baskets.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

