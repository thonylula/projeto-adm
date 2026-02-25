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
    const [companyId, setCompanyId] = useState<string>('');
    const [formData, setFormData] = useState({
        name: '',
        area: '',
        unit: 'ha' as 'ha' | 'm2' | 'm3',
        type: 'engorda' as ViveiroTipo
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            initialize();
        }
    }, [isOpen]);

    const initialize = async () => {
        setIsLoading(true);
        try {
            // Get valid company ID
            const companies = await SupabaseService.getCompanies();
            const validCompanyId = companies.length > 0 ? companies[0].id : '1';
            setCompanyId(validCompanyId);

            const data = await SupabaseService.getViveiros(validCompanyId);
            setNurseries(data);
        } catch (error) {
            console.error("Error initializing nursery modal:", error);
        }
        setIsLoading(false);
    };

    const loadNurseries = async () => {
        if (!companyId) return;
        setIsLoading(true);
        const data = await SupabaseService.getViveiros(companyId);
        setNurseries(data);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const areaValue = parseFloat(formData.area.replace(',', '.'));
        if (!formData.name || isNaN(areaValue)) {
            alert('Preencha os campos corretamente.');
            return;
        }

        let areaInM2 = areaValue;
        if (formData.unit === 'ha') {
            areaInM2 = areaValue * 10000;
        }
        // m2 and m3 are stored as is in area_m2 for now, allowing simple density calc (items/area_m2).
        // For m3, area_m2 acts as volume.

        setIsLoading(true);

        try {
            if (editingId) {
                // Update: Do NOT send company_id to avoid RLS issues if unchanged
                const updateData = {
                    name: formData.name,
                    tipo: formData.type,
                    area_m2: areaInM2,
                    unit_area: formData.unit
                };
                const success = await SupabaseService.updateViveiro(editingId, updateData);
                if (!success) {
                    throw new Error('Falha na atualização. Verifique se você tem permissão ou se o registro ainda existe.');
                }
            } else {
                // Create: Must include company_id
                const createData = {
                    company_id: companyId,
                    name: formData.name,
                    tipo: formData.type,
                    area_m2: areaInM2,
                    unit_area: formData.unit,
                    coordinates: []
                };
                const result = await SupabaseService.addViveiro(createData as any);
                if (!result) {
                    throw new Error('Falha na criação');
                }
            }

            setFormData({ name: '', area: '', unit: 'ha', type: 'engorda' });
            setEditingId(null);
            await loadNurseries();
            onUpdate();
        } catch (err) {
            console.error("Erro ao salvar viveiro:", err);
            alert("Erro ao salvar viveiro. Verifique o console.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (nursery: Viveiro) => {
        let displayArea = nursery.area_m2;
        const unit = nursery.unit_area || 'ha';

        if (unit === 'ha') {
            displayArea = nursery.area_m2 / 10000;
        }

        setFormData({
            name: nursery.name,
            area: displayArea.toFixed(2),
            unit: unit,
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
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-gray-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área / Vol</label>
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade</label>
                            <select
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#F97316] outline-none transition-colors"
                            >
                                <option value="ha">he (Hectare)</option>
                                <option value="m2">m² (Metro Quad)</option>
                                <option value="m3">m³ (Metro Cúb)</option>
                            </select>
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
                                <option value="viveiro_mae">Viveiro Mãe</option>
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
                            <div className="md:col-span-5 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setFormData({ name: '', area: '', unit: 'ha', type: 'engorda' }); }}
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
                            <div className="w-1/3 text-right">Área / Vol</div>
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
                                    <div className="w-1/3 text-right font-bold text-gray-800 dark:text-gray-200">
                                        {nursery.unit_area === 'ha' || !nursery.unit_area
                                            ? `${(nursery.area_m2 / 10000).toFixed(2)} ha`
                                            : nursery.unit_area === 'm2'
                                                ? `${nursery.area_m2.toFixed(2)} m²`
                                                : `${nursery.area_m2.toFixed(2)} m³`
                                        }
                                    </div>
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
