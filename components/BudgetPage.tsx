import React, { useState, useCallback } from 'react';
import { extractInvoiceData } from '../services/geminiService';
import { InvoiceData, InvoiceItem } from '../types';
import { ImageUploader } from './ImageUploader';
import { exportToPdf } from '../utils/exportUtils';

export const BudgetPage: React.FC = () => {
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
    const currentDate = new Date().toLocaleDateString('pt-BR');

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 border-b-4 border-orange-500 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Orçamento</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Pesquisa de Preços - Preço da Hora</p>
                </div>
                <div className="flex gap-2">
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
                    <div className="p-4 border-b-2 mb-4 text-center" style={{ borderColor: '#f97316' }}>
                        <h1 className="text-xl font-black uppercase text-slate-800 leading-tight">
                            LISTA DE PRODUTOS PARA CESTAS BÁSICAS - OCEAN
                        </h1>
                        <p className="text-sm font-black text-slate-600 mt-1 uppercase">
                            (PESQUISADO NO APP PREÇO DA HORA) - {currentDate}
                        </p>
                    </div>

                    <div className="px-2">
                        <table className="w-full text-left border-collapse border-2" style={{ borderColor: '#f97316' }}>
                            <thead>
                                <tr className="bg-orange-50" style={{ borderBottom: '2px solid #f97316' }}>
                                    {['Quant.', 'Uni.', 'Produto', 'Preço Unit.', 'Total', 'Estabelecimento', 'Endereço'].map(h => (
                                        <th key={h} className="p-2 border-r-2 last:border-r-0 text-[9px] font-black uppercase text-slate-700" style={{ borderColor: '#f97316' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y-2" style={{ borderColor: '#f97316' }}>
                                {budgetItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-2 border-r-2 text-[10px] font-bold" style={{ borderColor: '#f97316' }}>{item.quantity}</td>
                                        <td className="p-2 border-r-2 text-[10px] font-bold" style={{ borderColor: '#f97316' }}>{item.unit}</td>
                                        <td className="p-2 border-r-2 text-[10px] font-black uppercase" style={{ borderColor: '#f97316' }}>{item.description}</td>
                                        <td className="p-2 border-r-2 text-[10px] font-bold" style={{ borderColor: '#f97316' }}>{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 border-r-2 text-[10px] font-black text-indigo-700" style={{ borderColor: '#f97316' }}>{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 border-r-2 text-[10px] font-bold uppercase" style={{ borderColor: '#f97316' }}>{item.issuerName}</td>
                                        <td className="p-2 text-[8px] font-medium text-slate-500 uppercase leading-tight">{item.issuerAddress}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-100 border-t-4" style={{ borderColor: '#f97316' }}>
                                    <td colSpan={4} className="p-3 text-right text-xs font-black uppercase text-slate-700 border-r-2" style={{ borderColor: '#f97316' }}>SOMA TOTAL:</td>
                                    <td colSpan={3} className="p-3 text-sm font-black text-indigo-800">
                                        {totalSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
