import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Company, RegistryEmployee, RegistrySupplier, RegistryClient, ReceiptInput, ReceiptHistoryItem, ReceiptResult } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { numberToWordsBRL } from '../utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useGeminiParser } from '../hooks/useGeminiParser';

interface ReceiptManagerProps {
    activeCompany: Company;
    onBack: () => void;
}

const INITIAL_INPUT: ReceiptInput = {
    payeeName: '',
    payeeDocument: '',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    serviceDate: new Date().toISOString().split('T')[0],
    serviceEndDate: '',
    description: '',
    paymentMethod: 'PIX',
    pixKey: '',
    bankInfo: '',
    category: 'OUTROS'
};

export const ReceiptManager: React.FC<ReceiptManagerProps> = ({ activeCompany, onBack }) => {
    const [form, setForm] = useState<ReceiptInput>(INITIAL_INPUT);
    const [history, setHistory] = useState<ReceiptHistoryItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState<ReceiptHistoryItem | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [receiptLogo, setReceiptLogo] = useState<string | null>(null);

    const { processFile, isProcessing: isAiProcessing } = useGeminiParser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [employees, setEmployees] = useState<RegistryEmployee[]>([]);
    const [suppliers, setSuppliers] = useState<RegistrySupplier[]>([]);
    const [clients, setClients] = useState<RegistryClient[]>([]);

    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [h, emp, sup, cli, logo] = await Promise.all([
                SupabaseService.getReceiptsHistory(activeCompany.id),
                SupabaseService.getEmployees(),
                SupabaseService.getSuppliers(),
                SupabaseService.getClients(),
                SupabaseService.getConfig(`receipt_logo_${activeCompany.id}`)
            ]);
            setHistory(h);
            setEmployees(emp);
            setSuppliers(sup);
            setClients(cli);
            setReceiptLogo(logo as string);
            setLoading(false);
        };
        loadData();
    }, [activeCompany.id]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowReceipt(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleCalculateValueInWords = (val: number) => {
        return numberToWordsBRL(val);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.payeeName || form.value <= 0) {
            alert("Preencha o nome e o valor.");
            return;
        }

        setLoading(true);
        try {
            const result: ReceiptResult = {
                valueInWords: handleCalculateValueInWords(form.value)
            };

            const newItem: ReceiptHistoryItem = {
                id: editingId || crypto.randomUUID(),
                timestamp: new Date().toLocaleString('pt-BR'),
                rawDate: new Date().toISOString(),
                input: {
                    ...form,
                    date: new Date().toISOString().split('T')[0] // Always today for Emission
                },
                result
            };

            let success = false;
            if (editingId) {
                // Update existing receipt
                success = await SupabaseService.updateReceiptItem(newItem);
                if (success) {
                    setHistory(history.map(h => h.id === editingId ? newItem : h));
                    setEditingId(null);
                    alert('✅ Recibo atualizado com sucesso!');
                } else {
                    alert('❌ Erro ao atualizar recibo. Tente novamente.');
                }
            } else {
                // Add new receipt
                success = await SupabaseService.addReceiptItem(activeCompany.id, newItem);
                if (success) {
                    setHistory([newItem, ...history]);
                    alert('✅ Recibo criado com sucesso!');
                } else {
                    alert('❌ Erro ao criar recibo. Tente novamente.');
                }
            }

            if (success) {
                setForm(INITIAL_INPUT);
            }
        } catch (error) {
            console.error('Error saving receipt:', error);
            alert('❌ Erro inesperado ao salvar recibo.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: ReceiptHistoryItem) => {
        setForm(item.input);
        setEditingId(item.id);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Deseja excluir este recibo?")) return;

        setLoading(true);
        try {
            const success = await SupabaseService.deleteReceiptItem(id);
            if (success) {
                setHistory(history.filter(h => h.id !== id));
                alert('✅ Recibo excluído com sucesso!');
            } else {
                alert('❌ Erro ao excluir recibo. Tente novamente.');
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
            alert('❌ Erro inesperado ao excluir recibo.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPayee = (type: string, id: string) => {
        if (!id) return;
        let selected: any = null;
        if (type === 'EMP') selected = employees.find(e => e.id === id);
        if (type === 'SUP') selected = suppliers.find(s => s.id === id);
        if (type === 'CLI') selected = clients.find(c => c.id === id);

        if (selected) {
            setForm(prev => ({
                ...prev,
                payeeName: selected.name || selected.companyName || '',
                payeeDocument: selected.cpf || selected.cnpj || selected.document || '',
                pixKey: selected.pixKey || '',
                bankInfo: selected.bankName ? `${selected.bankName} Ag ${selected.agency} CC ${selected.account}` : ''
            }));
        }
    };

    const formatDateSafe = (dateStr: string) => {
        if (!dateStr) return '---';
        try {
            // Handle YYYY-MM-DD or full ISO strings
            const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const [year, month, day] = datePart.split('-');
            if (!year || !month || !day) return dateStr;
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    const formatDateLongSafe = (dateStr: string) => {
        if (!dateStr) return '---';
        try {
            const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const date = new Date(datePart + 'T12:00:00');
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleExportPDF = async () => {
        if (!receiptRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 3, // Higher scale for better PDF quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');

            // A4 dimensions in mm: 210 x 297
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save(`recibo_${showReceipt?.input.payeeName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        } catch (e) {
            console.error("Erro exportando PDF:", e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPNG = async () => {
        if (!receiptRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `recibo_${showReceipt?.input.payeeName.replace(/\s+/g, '_').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error("Erro exportando PNG:", e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setReceiptLogo(base64);
            await SupabaseService.saveConfig(`receipt_logo_${activeCompany.id}`, base64);
        };
        reader.readAsDataURL(file);
    };

    const handleCopyText = (item: ReceiptHistoryItem) => {
        const period = item.input.serviceEndDate
            ? `${formatDateSafe(item.input.serviceDate)} À ${formatDateSafe(item.input.serviceEndDate)}`
            : formatDateSafe(item.input.serviceDate);

        const text = `📄 RECIBO DE PAGAMENTO
----------------------------
👤 Beneficiário: ${item.input.payeeName}
💰 Valor: ${formatCurrency(item.input.value)}
📝 Referente a: ${item.input.description}
📅 Data/Período: ${period}
🔑 CHAVE PIX: ${item.input.pixKey || 'N/A'}
----------------------------`;

        navigator.clipboard.writeText(text);
        alert("Informações do recibo copiadas para o clipboard!");
    };

    const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // Use Multi-Agent System
            const { getOrchestrator } = await import('../services/agentService');
            const orchestrator = getOrchestrator();

            // Step 1: Extract receipt data from image
            const extracted = await orchestrator.handleIntent('extract-receipt', { image: file });

            if (!extracted || !extracted.receipts || extracted.receipts.length === 0) {
                alert('❌ Nenhum recibo encontrado na imagem');
                return;
            }

            // Step 2 & 3: Validate and generate for each extracted receipt
            const generatedReceipts = [];
            for (const receiptData of extracted.receipts) {
                try {
                    // Validation
                    const validated = await orchestrator.routeToAgent('receipt-validation', receiptData);

                    // Generation and storage
                    const generated = await orchestrator.routeToAgent('receipt-generation', {
                        receipt: validated,
                        companyId: activeCompany.id,
                        companyName: activeCompany.name
                    });

                    generatedReceipts.push(generated);
                } catch (error) {
                    console.error('Error processing receipt:', error);
                }
            }

            if (generatedReceipts.length > 0) {
                // Refresh history from database
                const updatedHistory = await SupabaseService.getReceiptsHistory(activeCompany.id);
                setHistory(updatedHistory);

                const successCount = generatedReceipts.filter(r => r.saved).length;
                alert(`✅ ${successCount} de ${extracted.receipts.length} recibos salvos com sucesso!`);

                // If only one, put it in the form for editing
                if (generatedReceipts.length === 1 && generatedReceipts[0].saved) {
                    const item = updatedHistory.find(h => h.id === generatedReceipts[0].id);
                    if (item) {
                        setForm(item.input);
                        setEditingId(item.id);
                    }
                }
            } else {
                alert('❌ Erro ao salvar recibos. Tente novamente.');
            }
        } catch (error) {
            console.error("AI Scan error:", error);
            alert("❌ Erro ao analisar arquivo com IA.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gerador de Recibos</h2>
                    <p className="text-slate-500 text-sm italic">Ferramenta ágil para criação de recibos avulsos</p>
                </div>
                <div className="flex items-center gap-3 self-start">
                    <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                        title="Configurar Logo Permanente"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        LOGO
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAiScan}
                        accept="image/*,application/pdf"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAiProcessing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-lg ${isAiProcessing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50'
                            }`}
                    >
                        {isAiProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                                ESCANEANDO...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                ESCANEAR COM IA
                            </>
                        )}
                    </button>
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Voltar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </span>
                            Novo Recibo
                        </h3>

                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Quick Selects */}
                            <div className="grid grid-cols-1 gap-3 mb-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buscar Cadastro</label>
                                    <select
                                        onChange={(e) => {
                                            const [type, id] = e.target.value.split(':');
                                            handleSelectPayee(type, id);
                                        }}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                    >
                                        <option value="">Selecione para auto-preencher...</option>
                                        <optgroup label="Funcionários">
                                            {employees.map(e => <option key={e.id} value={`EMP:${e.id}`}>{e.name}</option>)}
                                        </optgroup>
                                        <optgroup label="Fornecedores">
                                            {suppliers.map(s => <option key={s.id} value={`SUP:${s.id}`}>{s.tradeName || s.companyName}</option>)}
                                        </optgroup>
                                        <optgroup label="Clientes">
                                            {clients.map(c => <option key={c.id} value={`CLI:${c.id}`}>{c.name}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Beneficiário</label>
                                    <input
                                        type="text"
                                        value={form.payeeName}
                                        onChange={e => setForm({ ...form, payeeName: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all"
                                        placeholder="Quem recebe o valor?"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF / CNPJ</label>
                                        <input
                                            type="text"
                                            value={form.payeeDocument}
                                            onChange={e => setForm({ ...form, payeeDocument: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all font-mono"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                                        <input
                                            type="number"
                                            value={form.value || ''}
                                            onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-orange-600"
                                            placeholder="0,00"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referente a</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all min-h-[80px]"
                                        placeholder="Descrição do pagamento..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Emissão</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            readOnly
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Serviço (Início)</label>
                                        <input
                                            type="date"
                                            value={form.serviceDate}
                                            onChange={e => setForm({ ...form, serviceDate: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase">Fim Período (Opcional)</label>
                                            {form.serviceEndDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, serviceEndDate: '' })}
                                                    className="text-[9px] text-red-500 font-bold hover:underline"
                                                >
                                                    LIMPAR
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="date"
                                            value={form.serviceEndDate || ''}
                                            onChange={e => setForm({ ...form, serviceEndDate: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pgto</label>
                                        <select
                                            value={form.paymentMethod}
                                            onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="DINHEIRO">Dinheiro</option>
                                            <option value="TRANSFERÊNCIA">Transferência</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>
                                </div>

                                {form.paymentMethod === 'PIX' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave PIX</label>
                                        <input
                                            type="text"
                                            value={form.pixKey}
                                            onChange={e => setForm({ ...form, pixKey: e.target.value })}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all font-mono text-sm"
                                            placeholder="Chave Pix do recebedor"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-900/20 transition-all transform active:scale-[0.98]"
                                >
                                    {editingId ? 'SALVAR ALTERAÇÕES' : 'GERAR RECIBO'}
                                </button>

                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingId(null); setForm(INITIAL_INPUT); }}
                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                                    >
                                        CANCELAR EDIÇÃO
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Histórico de Recibos</h3>
                            <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black">{history.length} REGISTROS</span>
                        </div>

                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                                <p className="font-bold text-sm uppercase">Carregando histórico...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 m-6 rounded-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="font-bold text-sm uppercase">Nenhum recibo gerado ainda</p>
                                <p className="text-xs italic">Use o formulário ao lado para começar</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                                            <th className="px-6 py-3">Beneficiário / Detalhes</th>
                                            <th className="px-4 py-3 text-right">Valor</th>
                                            <th className="px-4 py-3 text-center">Data / Pgto</th>
                                            <th className="px-6 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map((item) => (
                                            <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-900 uppercase truncate max-w-[200px]" title={item.input.payeeName}>
                                                        {item.input.payeeName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium italic mt-1 line-clamp-1">
                                                        {item.input.description || 'Sem descrição'}
                                                    </div>
                                                    {item.input.payeeDocument && (
                                                        <div className="text-[10px] font-mono text-slate-500 mt-1">{item.input.payeeDocument}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="font-black text-slate-900">{formatCurrency(item.input.value)}</div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="text-[11px] font-bold text-slate-600">
                                                        {new Date(item.input.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <div className="text-[9px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded inline-block mt-1">
                                                        {item.input.paymentMethod}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <button
                                                            onClick={() => setShowReceipt(item)}
                                                            className="p-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm font-bold text-[10px] flex items-center gap-1"
                                                            title="Visualizar Recibo"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            VER
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopyText(item)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Copiar Dados para Pagamento"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                            title="Editar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Excluir"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- RECEIPT PREVIEW MODAL --- */}
            {showReceipt && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 animate-in fade-in duration-300 overflow-y-auto print:bg-transparent print:p-0"
                    onClick={(e) => e.target === e.currentTarget && setShowReceipt(null)}
                >
                    <div className="bg-white min-h-screen sm:min-h-0 sm:rounded-3xl shadow-2xl w-full max-w-[900px] flex flex-col border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none relative my-0 sm:my-8 text-slate-900">
                        {/* Modal Header - Sticky */}
                        <div className="sticky top-0 z-[110] flex items-center justify-between px-4 sm:px-8 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-md print:hidden">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-1 px-2 bg-orange-100 rounded-lg text-orange-600 hidden sm:block">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-bold">Visualizar Recibo</h3>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[150px] sm:max-w-none">{showReceipt.input.payeeName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-3">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-[9px] sm:text-[10px] shadow-lg shadow-indigo-200/50 disabled:bg-slate-300 uppercase"
                                >
                                    {isExporting ? '...' : 'PDF'}
                                </button>
                                <button
                                    onClick={handleExportPNG}
                                    disabled={isExporting}
                                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-black text-[9px] sm:text-[10px] shadow-lg shadow-emerald-200/50 disabled:bg-slate-300 uppercase"
                                >
                                    {isExporting ? '...' : 'PNG'}
                                </button>
                                <button
                                    onClick={() => setShowReceipt(null)}
                                    className="flex items-center gap-1 px-2 sm:px-4 py-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-600 rounded-xl transition-all font-black text-[9px] sm:text-[10px]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    SAIR
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-12 bg-slate-100/50 flex justify-center preview-container print:p-0 print:bg-white overflow-x-auto">
                            <div className="relative shadow-2xl print:shadow-none bg-white" style={{ width: '210mm', minWidth: '210mm', minHeight: '297mm' }}>
                                <div
                                    ref={receiptRef}
                                    className="bg-white flex flex-col justify-between print:shadow-none print:border-none origin-top"
                                    style={{
                                        width: '210mm',
                                        height: '297mm',
                                        padding: '12mm',
                                        minWidth: '210mm',
                                        minHeight: '297mm',
                                        position: 'relative'
                                    }}
                                >
                                    {/* 1ª VIA */}
                                    <ReceiptTemplate
                                        item={showReceipt}
                                        company={activeCompany}
                                        logo={receiptLogo}
                                        via="1ª VIA"
                                        formatCurrency={formatCurrency}
                                        formatDateSafe={formatDateSafe}
                                        formatDateLongSafe={formatDateLongSafe}
                                    />

                                    {/* Separator line for cutting */}
                                    <div className="border-t-2 border-dashed border-slate-200 relative my-4 print:my-6">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 print:hidden">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m11-5.939L14.121 14.121m0 0L19 9" /></svg>
                                            CORTE AQUI PARA SEPARAR AS VIAS
                                        </div>
                                    </div>

                                    {/* 2ª VIA */}
                                    <ReceiptTemplate
                                        item={showReceipt}
                                        company={activeCompany}
                                        logo={receiptLogo}
                                        via="2ª VIA"
                                        formatCurrency={formatCurrency}
                                        formatDateSafe={formatDateSafe}
                                        formatDateLongSafe={formatDateLongSafe}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for individual receipt copy
const ReceiptTemplate: React.FC<{
    item: ReceiptHistoryItem;
    company: Company;
    logo: string | null;
    via: string;
    formatCurrency: (val: number) => string;
    formatDateSafe: (d: string) => string;
    formatDateLongSafe: (d: string) => string;
}> = ({ item, company, logo, via, formatCurrency, formatDateSafe, formatDateLongSafe }) => {
    return (
        <div className="space-y-4 relative">
            <div className="absolute top-0 right-0 text-[10px] font-black text-slate-300 tracking-tighter italic">
                {via}
            </div>

            <div className="flex justify-between items-start pt-4">
                <div className="flex-1 flex justify-center pl-24">
                    {logo ? (
                        <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
                    ) : (
                        <div className="h-10 w-24 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase">
                            Sem Logo
                        </div>
                    )}
                </div>
                <div className="bg-white border-2 border-slate-900 px-4 py-1 rounded-lg font-black text-xl text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    {formatCurrency(item.input.value)}
                </div>
            </div>

            <div className="text-center">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
            </div>

            <div className="space-y-4 text-[13px] leading-[1.6] text-slate-800 text-justify px-2">
                <p>
                    Recebi de <strong className="font-black uppercase text-slate-900">{company.name}</strong>, a importância de
                    <strong className="font-bold border-b border-slate-300"> {item.result.valueInWords.toUpperCase()}</strong>,
                    referente a <strong className="font-bold uppercase">{item.input.description}</strong>,
                    serviço realizado {item.input.serviceEndDate ? 'no período de' : 'em'} <strong className="font-bold underline">
                        {item.input.serviceEndDate
                            ? `${formatDateSafe(item.input.serviceDate)} À ${formatDateSafe(item.input.serviceEndDate)}`
                            : formatDateSafe(item.input.serviceDate)}
                    </strong>.
                </p>

                <p>
                    Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado, concedendo <strong className="font-black underline uppercase">quitação plena, geral e irrevogável</strong> pela quantia recebida.
                </p>

                <div className="text-xs font-medium text-slate-700">
                    <p>Pagamento recebido por <strong className="font-bold uppercase">{item.input.payeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey || 'N/A'}</strong>.</p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1 pt-0 font-bold text-slate-500 uppercase text-[9px] italic">
                <p>EMISSÃO: {formatDateLongSafe(item.input.date)}</p>
                <p>CANAVIEIRAS - BA</p>
            </div>

            <div className="pt-4 flex flex-col items-center">
                <div className="w-full max-w-[300px] border-b-2 border-slate-200 mb-2"></div>
                <p className="font-black uppercase text-sm tracking-tight text-slate-900">{item.input.payeeName}</p>
                {item.input.payeeDocument && (
                    <p className="text-[10px] text-slate-500 font-mono font-bold">{item.input.payeeDocument}</p>
                )}
            </div>
        </div>
    );
};
