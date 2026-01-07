import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Viveiro, Transferencia } from '../types';

interface TransferManagerProps {
    activeCompanyId: string;
    originPondName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export const TransferManager: React.FC<TransferManagerProps> = ({
    activeCompanyId,
    originPondName,
    onClose,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [viveiros, setViveiros] = useState<Viveiro[]>([]);
    const [povoamentos, setPovoamentos] = useState<{ id: string, label: string }[]>([]);
    const [form, setForm] = useState<Partial<Transferencia>>({
        id: '',
        company_id: activeCompanyId,
        data_transferencia: new Date().toISOString().split('T')[0],
        turno: 'TURNO 1',
        quantidade: 0,
        peso_medio: 0,
        observacao: ''
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await SupabaseService.getViveiros(activeCompanyId);
            setViveiros(data);

            const origin = data.find(v => v.name === originPondName);
            if (origin) {
                setForm(prev => ({ ...prev, origem_id: origin.id }));
            }

            // --- FETCH POVOAMENTOS (STOCKING) ---
            // We fetch the current and previous month to be safe
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            const mortalityData = await SupabaseService.getMortalityData(activeCompanyId, month, year);
            if (mortalityData) {
                // Find records for the origin pond (VE)
                // Normalize pond name: OC-001 -> 1
                const tankNum = (originPondName || '').replace(/\D/g, '');
                const pondRecords = (mortalityData.records || []).filter((r: any) =>
                    r.ve === tankNum || r.ve === originPondName
                );

                const options = (pondRecords || []).map((r: any) => ({
                    id: r.id,
                    label: `${r.stockingDate ? `Povoado em ${r.stockingDate}` : 'Povoamento Atual'} (${r.ve})`
                }));
                setPovoamentos(options);
                if (options.length > 0) {
                    setForm(prev => ({ ...prev, povoamento_origem_id: options[0].id }));
                }
            }

            // --- GENERATE SEQUENTIAL ID ---
            const count = await SupabaseService.getTransferCount(year);
            const nextSeq = (count + 1).toString().padStart(4, '0');
            const generatedId = `TR-${year}-${nextSeq}`;
            setForm(prev => ({ ...prev, id: generatedId }));

            setLoading(false);
        };
        load();
    }, [activeCompanyId, originPondName]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.origem_id || !form.destino_id) {
            alert("Erro: Origem ou Destino não identificados.");
            return;
        }

        if (form.quantidade <= 0) {
            alert("A quantidade deve ser maior que zero.");
            return;
        }

        setLoading(true);
        const success = await SupabaseService.saveTransferencia(form);
        setLoading(false);

        if (success) {
            if (onSuccess) onSuccess();
            onClose();
        } else {
            alert("Erro ao salvar transferência.");
        }
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 transition-all";
    const labelClass = "block text-xs font-bold text-gray-500 uppercase mb-1";

    return (
        <div className="flex flex-col h-full font-sans bg-white">
            {/* Header */}
            <div className="bg-cyan-500 p-4 flex justify-between items-center text-white">
                <div>
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                        TRANSFERÊNCIA
                    </h3>
                    <p className="text-[10px] font-bold opacity-80 uppercase">Gerenciamento de Processos</p>
                </div>
                <button onClick={onClose} className="hover:bg-cyan-600 p-1 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto relative">
                {loading && povoamentos.length === 0 && (
                    <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    {/* ID Field */}
                    <div className="col-span-1">
                        <label className={labelClass}>0. Id</label>
                        <input
                            type="text"
                            readOnly
                            value={form.id}
                            className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                        />
                    </div>

                    {/* Origin Pond (Pre-filled) */}
                    <div className="col-span-1">
                        <label className={labelClass}>1. Viveiro de Origem</label>
                        <input
                            type="text"
                            readOnly
                            value={originPondName}
                            className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                        />
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                        <label className={labelClass}>2. Data Transferência</label>
                        <input
                            type="date"
                            value={form.data_transferencia}
                            onChange={e => setForm({ ...form, data_transferencia: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Shift (Turno) */}
                    <div className="col-span-1">
                        <label className={labelClass}>11. Turno</label>
                        <select
                            value={form.turno}
                            onChange={e => setForm({ ...form, turno: e.target.value })}
                            className={inputClass}
                        >
                            <option value="TURNO 1">TURNO 1</option>
                            <option value="TURNO 2">TURNO 2</option>
                            <option value="TURNO 3">TURNO 3</option>
                        </select>
                    </div>

                    {/* Population (Povoamento) */}
                    <div className="col-span-2">
                        <label className={labelClass}>3. Povoamento de Origem</label>
                        <select
                            value={form.povoamento_origem_id || ''}
                            onChange={e => setForm({ ...form, povoamento_origem_id: e.target.value })}
                            className={inputClass}
                        >
                            {povoamentos.length === 0 ? (
                                <option value="">Nenhum povoamento ativo encontrado</option>
                            ) : (
                                povoamentos.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1">
                        <label className={labelClass}>4. Quantidade *</label>
                        <input
                            type="number"
                            required
                            value={form.quantidade}
                            onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })}
                            className={inputClass}
                        />
                    </div>

                    {/* Avg Weight */}
                    <div className="col-span-1">
                        <label className={labelClass}>5. Peso Médio *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={form.peso_medio}
                            onChange={e => setForm({ ...form, peso_medio: Number(e.target.value) })}
                            className={inputClass}
                        />
                    </div>

                    {/* Destination Pond */}
                    <div className="col-span-2">
                        <label className={labelClass}>6. Viveiro de Destino *</label>
                        <select
                            required
                            value={form.destino_id || ''}
                            onChange={e => setForm({ ...form, destino_id: e.target.value })}
                            className={inputClass}
                        >
                            <option value="">Selecione o Destino...</option>
                            {viveiros.filter(v => v.name !== originPondName).map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Observation */}
                    <div className="col-span-2">
                        <label className={labelClass}>10. Observação</label>
                        <textarea
                            value={form.observacao}
                            onChange={e => setForm({ ...form, observacao: e.target.value })}
                            className={inputClass}
                            rows={3}
                            placeholder="Notas adicionais sobre a transferência..."
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'REGISTRAR TRANSFERÊNCIA'}
                    </button>
                </div>
            </form>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider italic">
                    Os dados serão salvos no histórico técnico do viveiro
                </p>
            </div>
        </div>
    );
};
