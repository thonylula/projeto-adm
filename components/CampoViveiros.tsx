import React, { useState, useEffect } from 'react';
import { Company, Viveiro, ViveiroStatus } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { BiometricsManager } from './BiometricsManager'; // Import Biometrics Component

interface CampoViveirosProps {
    activeCompany?: any;
    isPublic?: boolean;
}

export const CampoViveiros: React.FC<CampoViveirosProps> = ({ activeCompany, isPublic = false }) => {
    const [viveiros, setViveiros] = useState<Viveiro[]>([]);
    const [selectedViveiro, setSelectedViveiro] = useState<Viveiro | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingNotes, setEditingNotes] = useState('');
    const [editingArea, setEditingArea] = useState('');
    const [editingStatus, setEditingStatus] = useState<ViveiroStatus>('VAZIO');

    // --- Drag & Drop State ---
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [alignmentLines, setAlignmentLines] = useState<{ type: 'vertical' | 'horizontal', pos: number }[]>([]);

    // --- BE (Nursery) Modal State ---
    const [showNurseryModal, setShowNurseryModal] = useState(false);
    // We'll use this to store the "Parent" BE marker if needed, or just generally know we are editing nurseries
    const [bePonds, setBePonds] = useState<Viveiro[]>([]);

    // --- Context Menu State ---
    const [activeContextMenu, setActiveContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

    // --- Biometrics Modal State ---
    const [showBiometricsModal, setShowBiometricsModal] = useState(false);
    const [biometricsTarget, setBiometricsTarget] = useState<string | null>(null);

    // --- Layout Lock State ---
    const [isLayoutLocked, setIsLayoutLocked] = useState(true);

    const statusColors: Record<ViveiroStatus, string> = {
        'VAZIO': 'bg-[#c0c0c0]', // Cinza
        'PREPARADO': 'bg-[#008000]', // Verde Escuro
        'POVOADO': 'bg-[#00ffff]', // Ciano Vibrante
        'DESPESCA': 'bg-[#0000ff]' // Azul Royal
    };

    const statusTextColors: Record<ViveiroStatus, string> = {
        'VAZIO': 'text-slate-700',
        'PREPARADO': 'text-white',
        'POVOADO': 'text-slate-900',
        'DESPESCA': 'text-white'
    };

    // Load viveiros when company changes
    useEffect(() => {
        if (activeCompany) {
            loadViveiros();
        }
    }, [activeCompany]);

    const loadViveiros = async () => {
        if (!activeCompany) return;
        const data = await SupabaseService.getViveiros(activeCompany.id);
        setViveiros(data);
    };

    // --- Drag & Drop Logic ---

    const handleMouseDown = (e: React.MouseEvent, v: Viveiro) => {
        if (isPublic || isLayoutLocked) return; // Visitors or Locked mode can't move things
        e.stopPropagation();
        e.preventDefault();

        // Calculate offset (cursor pos relative to element pos)
        const element = e.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        const parentRect = element.parentElement?.getBoundingClientRect();

        if (!parentRect) return;

        // Start Dragging
        setDraggingId(v.id);
        setDragOffset({
            x: e.clientX - rect.left - (rect.width / 2),
            y: e.clientY - rect.top - (rect.height / 2)
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingId || !activeCompany) return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();

        // Calculate raw % position
        let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        let yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // --- Alignment Snapping (Canva-like) ---
        const SNAP_THRESHOLD_PERCENT = 0.8; // Sensitivity
        const newAlignmentLines: { type: 'vertical' | 'horizontal', pos: number }[] = [];

        // Find matches
        let snappedX = xPercent;
        let snappedY = yPercent;

        viveiros.forEach(other => {
            if (other.id === draggingId) return;
            const otherPos = other.coordinates[0];
            if (!otherPos) return;

            // Check Horizontal Alignment (Vertical Line)
            if (Math.abs(otherPos.lng - xPercent) < SNAP_THRESHOLD_PERCENT) {
                snappedX = otherPos.lng;
                newAlignmentLines.push({ type: 'vertical', pos: otherPos.lng });
            }

            // Check Vertical Alignment (Horizontal Line)
            if (Math.abs(otherPos.lat - yPercent) < SNAP_THRESHOLD_PERCENT) {
                snappedY = otherPos.lat;
                newAlignmentLines.push({ type: 'horizontal', pos: otherPos.lat });
            }
        });

        setAlignmentLines(newAlignmentLines);

        // Update local state (optimistic UI)
        setViveiros(prev => prev.map(v => {
            if (v.id === draggingId) {
                return {
                    ...v,
                    coordinates: [{ lat: snappedY, lng: snappedX }]
                };
            }
            return v;
        }));
    };

    const handleMouseUp = async () => {
        if (draggingId) {
            const v = viveiros.find(v => v.id === draggingId);
            if (v) {
                // Save final position to Supabase
                // NOTE: We only update lat/lng here
                await SupabaseService.updateViveiro(v.id, {
                    coordinates: v.coordinates // coordinates were updated in state during drag
                });
            }
            setDraggingId(null);
            setAlignmentLines([]);
        }
    };


    const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
        if (!activeCompany || isPublic || draggingId || isLayoutLocked) return; // Don't create if dragging or locked

        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const name = prompt('Nome do viveiro:');
        if (!name) return;

        const areaInput = prompt('Área do viveiro (em hectares):', '1');
        if (!areaInput) return;

        const area = parseFloat(areaInput);

        const newViveiro = {
            company_id: activeCompany.id,
            name,
            coordinates: [{ lat: y, lng: x }],
            area_m2: area,
            status: 'VAZIO' as ViveiroStatus
        };

        const added = await SupabaseService.addViveiro(newViveiro);
        if (added) {
            await loadViveiros();
        }
    };

    const handleViveiroClick = async (e: React.MouseEvent, v: Viveiro) => {
        if (draggingId) return; // Ignore click if finishing a drag
        e.stopPropagation();

        // Check for 'BE' special interaction
        const normalizedName = v.name.toUpperCase().trim();
        const isBE = ['BE', 'BERCÁRIOS', 'BERCARIO', 'BERCÁRIO'].some(n => normalizedName === n);

        if (isBE) {
            // Open Nursery Manager Modal
            const nurseryPonds = viveiros.filter(p => p.name.toUpperCase().startsWith('BE-'));
            setBePonds(nurseryPonds);
            setShowNurseryModal(true);
            return;
        }

        // Open Context Menu instead of immediate selection
        // Normalize coordinates relative to window for fixed positioning
        setActiveContextMenu({
            id: v.id,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMenuAction = (action: string) => {
        if (!activeContextMenu) return;

        const v = viveiros.find(p => p.id === activeContextMenu.id);
        if (!v) return;

        switch (action) {
            case 'ficha_viveiro':
                // Open Sidebar/Edit Mode
                setSelectedViveiro(v);
                setEditingName(v.name);
                setEditingNotes(v.notes || '');
                setEditingArea(v.area_m2.toString());
                setEditingStatus(v.status || 'VAZIO');
                break;
            case 'biometria':
                setBiometricsTarget(v.name);
                setShowBiometricsModal(true);
                break;
            default:
                console.log(`Action ${action} triggered for ${v.name}`);
                // Optional: alert(`Funcionalidade: ${action} \n(Em desenvolvimento)`);
                break;
        }

        // Close Menu
        setActiveContextMenu(null);
    };

    const handleSaveViveiro = async () => {
        if (!selectedViveiro) return;

        const success = await SupabaseService.updateViveiro(selectedViveiro.id, {
            name: editingName,
            notes: editingNotes,
            area_m2: parseFloat(editingArea),
            status: editingStatus
        });

        if (success) {
            await loadViveiros();
            setSelectedViveiro(null);
        }
    };

    const handleDeleteViveiro = async () => {
        if (!selectedViveiro) return;

        if (confirm(`Deletar viveiro "${selectedViveiro.name}"?`)) {
            const success = await SupabaseService.deleteViveiro(selectedViveiro.id);
            if (success) {
                await loadViveiros();
                setSelectedViveiro(null);
            }
        }
    };

    // --- Helper to Create Missing Nurseries ---
    const handleCreateMissingNurseries = async () => {
        if (!activeCompany) return;

        const existingIndices = bePonds
            .map(p => parseInt(p.name.replace('BE-', '')))
            .filter(n => !isNaN(n));

        const promises = [];
        for (let i = 1; i <= 8; i++) {
            if (!existingIndices.includes(i)) {
                promises.push(SupabaseService.addViveiro({
                    company_id: activeCompany.id,
                    name: `BE-${String(i).padStart(2, '0')}`,
                    coordinates: [{ lat: 0, lng: 0 }], // Hidden or default, we filter them out of map
                    area_m2: 0.5,
                    status: 'VAZIO'
                }));
            }
        }

        await Promise.all(promises);
        await loadViveiros();

        // Refresh local list
        const updated = await SupabaseService.getViveiros(activeCompany.id);
        const newBePonds = updated.filter(p => p.name.toUpperCase().startsWith('BE-'));
        setBePonds(newBePonds);
    };

    // Filter main map ponds (Hide BE-xx sub-items to avoid clutter)
    const visibleViveiros = viveiros.filter(v => !v.name.toUpperCase().startsWith('BE-'));

    if (!activeCompany) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-slate-500">Selecione uma empresa primeiro.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Map Container */}
            <div className={`flex-1 relative ${isPublic || isLayoutLocked ? '' : 'cursor-crosshair'}`}>
                <div
                    className="w-full h-full flex items-center justify-center bg-slate-200 overflow-hidden relative"
                    onMouseMove={isPublic ? undefined : handleMouseMove}
                    onMouseUp={isPublic ? undefined : handleMouseUp}
                    onMouseLeave={handleMouseUp} // Cancel drag if leaving
                >
                    <div className="relative inline-block w-full h-full"> {/* Changed to fill for better coordinate mapping */}
                        <img
                            src="/viveiros_map.png"
                            alt="Mapa dos Viveiros"
                            className="w-full h-full object-contain pointer-events-none select-none" // prevent img drag
                        // Click handler moved to container or handled via bubbles, 
                        // but for new creation we use the wrapper click if not dragging.
                        />

                        {/* Wrapper for click-to-create that sits on top */}
                        {!isPublic && !isLayoutLocked && (
                            <div
                                className="absolute inset-0 z-0"
                                onClick={handleImageClick}
                            />
                        )}

                        {/* Lock Toggle Button */}
                        {!isPublic && (
                            <button
                                onClick={() => setIsLayoutLocked(!isLayoutLocked)}
                                className={`absolute top-4 right-4 z-[60] p-3 rounded-full shadow-lg transition-all border-2 ${isLayoutLocked
                                    ? 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                    : 'bg-yellow-100 text-yellow-600 border-yellow-400 hover:bg-yellow-200 animate-pulse'
                                    }`}
                                title={isLayoutLocked ? "Layout Bloqueado (Clique para editar)" : "Edição de Layout Habilitada"}
                            >
                                {isLayoutLocked ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                )}
                            </button>
                        )}

                        {/* Alignment Lines */}
                        {alignmentLines.map((line, idx) => (
                            <div
                                key={idx}
                                className={`absolute bg-cyan-400 z-50 pointer-events-none ${line.type === 'vertical'
                                    ? 'w-[1px] h-full top-0'
                                    : 'h-[1px] w-full left-0'
                                    }`}
                                style={
                                    line.type === 'vertical'
                                        ? { left: `${line.pos}%` }
                                        : { top: `${line.pos}%` }
                                }
                            />
                        ))}

                        {/* Markers */}
                        {visibleViveiros.map(v => {
                            const pos = v.coordinates[0];
                            if (!pos) return null;

                            const isSmallFont = /^OC-P0[1-9]$/i.test(v.name) || /^OC-P02-03$/i.test(v.name);

                            return (
                                <div
                                    key={v.id}
                                    onMouseDown={(e) => handleMouseDown(e, v)}
                                    onClick={(e) => handleViveiroClick(e, v)}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-shadow ${draggingId === v.id ? 'z-50 scale-110 opacity-80' : 'z-10'
                                        } ${selectedViveiro?.id === v.id ? 'z-40' : ''}`}
                                    style={{
                                        left: `${pos.lng}%`,
                                        top: `${pos.lat}%`
                                    }}
                                >
                                    <div className={`rounded-sm flex items-center justify-center relative font-bold shadow-md whitespace-nowrap border border-black/30 select-none ${selectedViveiro?.id === v.id ? 'ring-2 ring-yellow-400' : ''
                                        } ${statusColors[v.status || 'VAZIO']} ${statusTextColors[v.status || 'VAZIO']} ${isSmallFont
                                            ? 'text-[8px] px-0.5 py-[1px] min-w-[25px] h-4 leading-none'
                                            : 'text-[11px] px-2 py-1.5 min-w-[50px]'
                                        }`}>
                                        <span>{v.name.toUpperCase().replace('BERCÁRIOS', 'BE').replace('BERCÁRIO', 'BE').replace('BERCARIO', 'BE')}</span>
                                        <span className={`absolute right-0.5 opacity-60 ${isSmallFont ? 'text-[4px] top-[1px]' : 'text-[6px]'}`}>▼</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- CONTEXT MENU POPUP --- */}
            {activeContextMenu && (
                <>
                    {/* Transparent Backdrop to close menu */}
                    <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setActiveContextMenu(null)}
                    // Transparent but captures clicks
                    />

                    {/* Menu Popup */}
                    <div
                        className="fixed z-[101] bg-white rounded shadow-[2px_2px_5px_rgba(0,0,0,0.3)] border border-gray-300 min-w-[140px] py-1 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            left: Math.min(activeContextMenu.x, window.innerWidth - 150), // Prevent overflowing right
                            top: Math.min(activeContextMenu.y, window.innerHeight - 250) // Prevent overflowing bottom
                        }}
                    >
                        {/* Header/Title removed or made very subtle if needed, user example doesn't show a big header. 
                            Keeping a small one or removing based on 'molde'. Example has 'OC-001' at top.
                        */}
                        <div className="px-2 py-1 bg-cyan-400 text-black font-bold text-[11px] mb-1">
                            {viveiros.find(v => v.id === activeContextMenu.id)?.name || 'Opções'} ▼
                        </div>

                        {[
                            { label: 'Preparação', action: 'preparacao' },
                            { label: 'Povoamento', action: 'povoamento' },
                            { label: 'Transferência', action: 'transferencia', separator: true },
                            { label: 'Insumos', action: 'insumos' },
                            { label: 'Parâmetros', action: 'parametros' },
                            { label: 'Custos', action: 'custos' },
                            { label: 'Biometria', action: 'biometria' },
                            { label: 'Despesca', action: 'despesca', separator: true },
                            { label: 'Ficha de Viveiro', action: 'ficha_viveiro' },
                            { label: 'Ficha Técnica', action: 'ficha_tecnica' },
                            { label: 'Situação Atual', action: 'situacao_atual' },
                            { label: 'Histórico de Cultivos', action: 'historico' },
                        ].map((item, idx) => (
                            <React.Fragment key={idx}>
                                {item.separator && idx > 0 && <hr className="my-1 border-gray-300" />}
                                <button
                                    onClick={() => handleMenuAction(item.action)}
                                    className="w-full text-left px-2 py-[2px] hover:bg-slate-100 text-[#0066cc] text-[11px] font-medium transition-colors underline decoration-transparent hover:decoration-[#0066cc]"
                                >
                                    {item.label}
                                </button>
                            </React.Fragment>
                        ))}
                        <hr className="my-1 border-gray-300" />
                        <div className="px-2 py-[2px] text-black text-[11px] font-medium cursor-pointer hover:bg-slate-100 flex justify-between items-center">
                            Outras Funções <span>▼</span>
                        </div>
                    </div>
                </>
            )}

            {/* Sidebar - HIDDEN LIST per user request, only showing EDIT PANEL when selected */}
            {!isPublic && selectedViveiro && (
                <div className="w-96 bg-white shadow-lg p-6 overflow-y-auto z-10 transition-all border-l border-slate-200 fixed right-0 top-0 h-full">
                    {/* Made fixed to act as a drawer, only appearing when selected */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-black text-slate-900">✏️ Editar</h2>
                        <button onClick={() => setSelectedViveiro(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>

                    {/* Editor Content */}
                    <div className="border-t pt-4">
                        <label className="block mb-2">
                            <span className="text-sm text-slate-600">Nome:</span>
                            <input
                                type="text"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            />
                        </label>

                        <label className="block mb-2">
                            <span className="text-sm text-slate-600">Área (hectares):</span>
                            <input
                                type="number"
                                value={editingArea}
                                onChange={e => setEditingArea(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            />
                        </label>

                        <label className="block mb-4">
                            <span className="text-sm text-slate-600">Notas:</span>
                            <textarea
                                value={editingNotes}
                                onChange={e => setEditingNotes(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                                rows={3}
                            />
                        </label>

                        <label className="block mb-4">
                            <span className="text-sm text-slate-600">Status:</span>
                            <select
                                value={editingStatus}
                                onChange={e => setEditingStatus(e.target.value as ViveiroStatus)}
                                className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
                            >
                                <option value="VAZIO">⚪ Vazio</option>
                                <option value="PREPARADO">🟢 Preparado</option>
                                <option value="POVOADO">💎 Povoado</option>
                                <option value="DESPESCA">🔵 Em Despesca</option>
                            </select>
                        </label>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveViveiro}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700"
                            >
                                ✅ Salvar
                            </button>
                            <button
                                onClick={handleDeleteViveiro}
                                className="px-4 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NURSERY MANAGEMENT MODAL --- */}
            {showNurseryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    🍼 Berçários (BE)
                                </h3>
                                <p className="text-indigo-100 text-sm">Gerenciamento Rápido</p>
                            </div>
                            <button
                                onClick={() => setShowNurseryModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-400 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {['VAZIO', 'PREPARADO', 'POVOADO', 'DESPESCA'].map(status => {
                                    const count = bePonds.filter(p => p.status === status).length;
                                    return (
                                        <div key={status} className={`p-3 rounded-xl border ${count > 0 ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-100 border-transparent opacity-60'}`}>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{status}</div>
                                            <div className="text-2xl font-black text-slate-800">{count}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.from({ length: 8 }).map((_, i) => {
                                    const pondName = `BE-${String(i + 1).padStart(2, '0')}`;
                                    const existing = bePonds.find(p => p.name === pondName);

                                    return (
                                        <div key={pondName} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${existing ? statusColors[existing.status || 'VAZIO'] : 'bg-slate-100 text-slate-400'}`}>
                                                    {existing ? (existing.status === 'PREPARADO' || existing.status === 'DESPESCA' ? '⚪' : (existing.status === 'POVOADO' ? '🦐' : '⭕')) : '+'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{pondName}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {existing ? `${existing.area_m2} ha • ${existing.status}` : 'Não Criado'}
                                                    </div>
                                                </div>
                                            </div>

                                            {existing ? (
                                                <button
                                                    onClick={() => {
                                                        // Quick edit mode could go here, for now switch main selection
                                                        setSelectedViveiro(existing);
                                                        setEditingName(existing.name);
                                                        setEditingNotes(existing.notes || '');
                                                        setEditingArea(existing.area_m2.toString());
                                                        setEditingStatus(existing.status || 'VAZIO');
                                                        setShowNurseryModal(false); // Close modal to edit in sidebar
                                                    }}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Editar
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Disponível</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Footer */}
                            {bePonds.length < 8 && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={handleCreateMissingNurseries}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold"
                                    >
                                        <span>✨</span>
                                        Criar Berçários Faltantes (BE-01 a BE-08)
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* --- BIOMETRICS MODAL (INTEGRATED) --- */}
            {showBiometricsModal && biometricsTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col relative">
                        {/* Header Overlay */}
                        <div className="absolute top-4 right-4 z-50">
                            <button
                                onClick={() => setShowBiometricsModal(false)}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg font-bold transition-transform hover:scale-110"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                            <BiometricsManager
                                isPublic={isPublic}
                                initialFilter={biometricsTarget}
                                isModal={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
