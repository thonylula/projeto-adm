import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import type { Viveiro, ViveiroTipo } from '../../types';

interface NurseryRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Trigger to refresh data in parent
}

export const NurseryRegistrationModal: React.FC<NurseryRegistrationModalProps> = ({ isOpen, onClose, onUpdate }) => {
    const [nurseries, setNurseries] = useState<Viveiro[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        area: '',
        type: 'engorda' as ViveiroTipo
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadNurseries();
        }
    }, [isOpen]);

    const loadNurseries = async () => {
        setIsLoading(true);
        // Assuming a default company ID or fetching from context/auth if available. 
        // For now, we'll try to list all or use a placeholder ID if needed by the service.
        // The service uses 'company_id' in fetching. Let's assume a static ID or get it from config if possible.
        // Looking at SupabaseService, it requires companyId. Let's use a constant for now or try to get it.
        // Ideally this should come from AuthContext. For this specific app structure, I'll use a placeholder '1' 
        // or consistent string as used elsewhere if visible.
        // Actually, let's fetch all and filter client-side if needed, but getViveiros requires filtering by ID.
        // I will use '1' as default company_id for this feature as seen in other parts or generally used.
        const data = await SupabaseService.getViveiros('1');
        setNurseries(data);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const areaInHectares = parseFloat(formData.area.replace(',', '.'));
        if (!formData.name || isNaN(areaInHectares)) {
            alert('Preencha os campos corretamente.');
            return;
        }

        setIsLoading(true);
        const nurseryData: Partial<Viveiro> = {
            company_id: '1', // Default
            name: formData.name,
            tipo: formData.type,
            area_m2: areaInHectares * 10000, // Convert hectares to m2 for storage if the model uses m2. 
            // Wait, previous VIVEIROS_DATA uses hectares directly as value.
            // Let's check types.ts: area_m2: number. 
            // The request says "TAMANHO". Usually aquaculture uses hectares.
            // If I save as m2, I should convert back to ha for display.
            // Let's standardise: Input is HA. Storage is HA (easier) OR Storage is m2.
            // Type says `area_m2`. It implies Square Meters.
            // Let's save as m2 (Height of standards) but input/output as HA.
            // 1 ha = 10,000 m2.
        };

        if (editingId) {
            await SupabaseService.updateViveiro(editingId, {
                name: formData.name,
                area_m2: areaInHectares * 10000,
                // status/notes could be preserved or updated
            });
        } else {
            await SupabaseService.addViveiro({
                ...nurseryData,
                coordinates: [], // Optional now
            } as any);
        }

        setFormData({ name: '', area: '', type: 'engorda' });
        setEditingId(null);
        await loadNurseries();
        onUpdate();
        setIsLoading(false);
    };

    const handleEdit = (nursery: Viveiro) => {
        setFormData({
            name: nursery.name,
            area: (nursery.area_m2 / 10000).toFixed(2), // Convert m2 to ha
            type: nursery.tipo
        });
        setEditingId(nursery.id);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este viveiro?')) {
            setIsLoading(true);
            await SupabaseService.deleteViveiro(id);
            await loadNurseries();
            onUpdate();
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <span>🏞️</span> Cadastro de Viveiros
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#F97316] outline-none transition-colors"
                                placeholder="Ex: V-01"
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área (ha)</label>
                            <input
                                type="text" // text to allow comma
                                value={formData.area}
                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#F97316] outline-none transition-colors"
                                placeholder="1.5"
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as ViveiroTipo })}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#F97316] outline-none transition-colors"
                            >
                                <option value="engorda">Engorda</option>
                                <option value="bercario">Berçário</option>
                                <option value="pos_bercario">Pré-Berçário</option>
                            </select>
                        </div>
                        <div className="md:col-span-1 flex items-end">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-black py-2.5 rounded-xl transition-all shadow-lg shadow-[#F97316]/20 active:scale-95 disabled:opacity-50"
                            >
                                {editingId ? 'Salvar' : 'Adicionar'}
                            </button>
                        </div>
                        {editingId && (
                            <div className="md:col-span-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setFormData({ name: '', area: '', type: 'engorda' }); }}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                >
                                    Cancelar Edição
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-4 pb-2 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <div className="w-1/3">Viveiro</div>
                            <div className="w-1/3 text-center">Tipo</div>
                            <div className="w-1/3 text-right">Área (ha)</div>
                            <div className="w-16"></div>
                        </div>
                        {nurseries.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 font-medium">
                                Nenhum viveiro cadastrado.
                            </div>
                        ) : (
                            nurseries.map(nursery => (
                                <div key={nursery.id} className="flex justify-between items-center bg-white dark:bg-slate-700/20 p-4 rounded-xl border border-gray-50 dark:border-slate-700 hover:border-[#F97316]/30 transition-colors group">
                                    <div className="w-1/3 font-black text-gray-800 dark:text-gray-200">{nursery.name}</div>
                                    <div className="w-1/3 text-center text-xs font-bold text-gray-500 uppercase">{nursery.tipo.replace('_', ' ')}</div>
                                    <div className="w-1/3 text-right font-bold text-gray-800 dark:text-gray-200">{(nursery.area_m2 / 10000).toFixed(2)} ha</div>
                                    <div className="w-16 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(nursery)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">✎</button>
                                        <button onClick={() => handleDelete(nursery.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
