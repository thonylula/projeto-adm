import React, { useState, useRef, useEffect } from 'react';
import { useGeminiParser } from '../hooks/useGeminiParser';
import { SupabaseService } from '../services/supabaseService';

export const OperationsAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [isApplying, setIsApplying] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { processText, processFile, isProcessing } = useGeminiParser({
        onError: (err) => {
            setHistory(prev => [...prev, { role: 'assistant', content: `Erro: ${err.message}` }]);
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    setSelectedImage(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                }
                break;
            }
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!command.trim() && !selectedImage) || isProcessing) return;

        const userCommand = command;
        const img = selectedImage;

        setCommand('');
        setSelectedImage(null);
        setImagePreview(null);

        setHistory(prev => [...prev, { role: 'user', content: userCommand || (img ? "[Imagem Enviada]" : "") }]);

        // Prepare context from Supabase
        const context: any = {
            appState: {
                activeTab: document.querySelector('[data-active-tab]')?.getAttribute('data-active-tab') || 'payroll',
                activeCompanyId: localStorage.getItem('activeCompanyId'),
                activeYear: localStorage.getItem('activeYear'),
                activeMonth: localStorage.getItem('activeMonth')
            },
            currentDate: new Date().toLocaleDateString('pt-BR'),
            currentTime: new Date().toLocaleTimeString('pt-BR')
        };

        try {
            const isMortalityTab = context.appState.activeTab === 'mortalidade';

            // Core promises that are always needed
            const promises: any[] = [
                SupabaseService.getCompanies(),
                // Only fetch heavy registries if NOT in mortality tab or if explicitly needed
                !isMortalityTab ? SupabaseService.getEmployees() : Promise.resolve([]),
                !isMortalityTab ? SupabaseService.getSuppliers() : Promise.resolve([]),
                !isMortalityTab ? SupabaseService.getClients() : Promise.resolve([]),
                SupabaseService.getBasketConfigs(),
                SupabaseService.getDeliveryOrders()
            ];

            // If we have detailed context, fetch specific data
            if (context.appState.activeCompanyId && context.appState.activeYear && context.appState.activeMonth) {
                promises.push(SupabaseService.getMortalityData(
                    context.appState.activeCompanyId,
                    parseInt(context.appState.activeMonth),
                    parseInt(context.appState.activeYear)
                ));
            } else {
                promises.push(Promise.resolve(null));
            }

            const [companies, employees, suppliers, clients, configs, doData, mortalityData] = await Promise.all(promises);

            context['folha_companies'] = companies;
            context['folha_registry_employees'] = employees; // Empty array if optimized
            context['folha_registry_suppliers'] = suppliers; // Empty array if optimized
            context['folha_registry_clients'] = clients;     // Empty array if optimized
            context['folha_basket_item_configs'] = configs;
            context['delivery_order_db'] = doData.data;
            context['mortality_data'] = mortalityData || null;
        } catch (e) {
            console.error("Error fetching context for AI", e);
        }

        const systemPrompt = `
        Você é o "Cérebro Operacional" do sistema PRO-ADM. Você tem controle total sobre os dados e a navegação (UI).

        DADOS ATUAIS DO SISTEMA:
        ${JSON.stringify(context, null, 2)}

        CAPACIDADES:
        1. UPDATE_DATABASE: Modificar qualquer dado no sistema (Nuvem/Supabase). 
           - Chaves comuns: folha_companies, folha_registry_employees, folha_registry_suppliers, folha_registry_clients, folha_basket_item_configs, delivery_order_db.
           - MORTALIDADE: 'mortality_data' (Requer activeCompanyId, activeMonth, activeYear no appState). Estrutura: { id, companyId, month, year, records: [...] }
        2. NAVIGATE: Mudar a aba principal, abas internas ou Mudar Ano/Mês.
           - Abas Principais (tab): 'payroll', 'biometrics', 'fiscal', 'registrations', 'delivery-order', 'pantry', 'mortalidade'.
           - Abas Internas de Cestas (cestaTab): 'summary', 'signature', 'pantry'.
           - Contexto de Tempo: year (2024, 2025...), month (1-12). Envie junto com 'tab' para navegar.
        3. SELECT_COMPANY: Selecionar uma empresa específica (companyId).

        REGRAS DE RESPOSTA:
        - Retorne SEMPRE um JSON em um bloco \`\`\`json.
        - "message": Texto amigável e curto explicando o que você está fazendo.
        - "actions": Lista de ações.

        REGRAS PARA LEITURA DE IMAGENS (OCR) - CRÍTICO:
        1. MAPEAMENTO EXATO: Ao ler tabelas (como Mortalidade), preserve a posição exata das colunas.
        2. CÉLULAS VAZIAS: Se visualmente uma casa/dia não tem anotação, O VALOR É NULL ou "". NÃO PULE para o próximo número. Se o dia 1 está vazio e o dia 2 tem "50", o array deve ser [null, 50, ...].
        3. DIAS DO MÊS: Garanta que os valores correspondam ao dia correto (1 a 31). Conte as colunas vazias como dias sem registro.

        REGRAS CRÍTICAS DE CONTEXTO:
        1. VERIFIQUE SEMPRE "appState.activeTab" ANTES DE AGIR.
        2. SE activeTab == "mortalidade":
           - QUALQUER pedido para "preencher tabela", "lançar dados", "atualizar VE", "biometria", "ração" ou "mortalidade" DEVE SER FEITO NA PRÓPRIA ABA MORTALIDADE.
           - AÇÃO: Use UPDATE_DATABASE com key="mortality_data".
           - PROIBIDO: Não navegue para "delivery-order" ou "Ordem de Entrega" se o usuário já estiver em "mortalidade", a menos que ele peça EXPLICITAMENTE para "ir para entrega".
           - O contexto "mortality_data" contém os dados atuais. Edite-os e devolva a estrutura completa.
        3. SE activeTab == "delivery-order":
           - Aí sim, menções a "VE" e "Peso" referem-se a "delivery_order_db".

        EXEMPLO PARA MUDAR DE TELA E ATUALIZAR UM NOME:
        \`\`\`json
        {
          "message": "Navegando para Cadastros e corrigindo o nome do funcionário.",
          "actions": [
            { "type": "NAVIGATE", "tab": "registrations" },
            { "type": "UPDATE_DATABASE", "key": "folha_registry_employees", "value": [...] }
          ]
        }
        \`\`\`

        IMPORTANTE: Ao editar listas, envie a lista COMPLETA com as alterações. O sistema salvará automaticamente na nuvem.
        `;

        let result;
        if (img) {
            result = await processFile(img, `${systemPrompt}\n\nCOMANDO DO USUÁRIO: ${userCommand}`);
        } else {
            result = await processText(systemPrompt, userCommand);
        }

        if (result && typeof result === 'object') {
            const assistantMessage = result.message || "Pedido processado.";
            setHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

            if (result.actions && Array.isArray(result.actions)) {
                setIsApplying(true);
                result.actions.forEach(async (action: any) => {
                    if (action.type === 'UPDATE_DATABASE' || action.type === 'UPDATE_LOCAL_STORAGE') {
                        // Sync to Supabase based on key
                        const key = action.key;
                        const value = action.value;

                        try {
                            if (key === 'folha_registry_employees') {
                                for (const emp of value) await SupabaseService.saveEmployee(emp);
                            } else if (key === 'folha_registry_suppliers') {
                                for (const sup of value) await SupabaseService.saveSupplier(sup);
                            } else if (key === 'folha_registry_clients') {
                                for (const cli of value) await SupabaseService.saveClient(cli);
                            } else if (key === 'folha_basket_item_configs') {
                                await SupabaseService.saveBasketConfigs(value);
                            } else if (key === 'delivery_order_db') {
                                // For delivery orders, we also need the logo, but AI might not provide it. 
                                // We fetch the current logo first.
                                const current = await SupabaseService.getDeliveryOrders();
                                await SupabaseService.saveDeliveryOrders(value, current.logo);
                            } else if (key === 'mortality_data') {
                                console.log('[AI Debug] Saving Mortality Data:', value);
                                const companyId = value.companyId || localStorage.getItem('activeCompanyId');
                                const month = value.month || parseInt(localStorage.getItem('activeMonth') || '0');
                                const year = value.year || parseInt(localStorage.getItem('activeYear') || '0');

                                if (companyId && month && year) {
                                    const success = await SupabaseService.saveMortalityData(companyId, month, year, value);
                                    console.log('[AI Debug] Save Success:', success);
                                } else {
                                    console.error('[AI Debug] Missing context for mortality save:', { companyId, month, year });
                                }
                            } else if (key === 'folha_companies') {
                                // This is complex because companies have IDs. 
                                // AI might try to replace the whole list. 
                                // For now, we'll log it or try to update existing ones.
                            }

                            window.dispatchEvent(new Event('app-data-updated'));
                        } catch (err) {
                            console.error("AI Sync Error", err);
                        }
                    }
                    if (action.type === 'NAVIGATE' || action.type === 'SELECT_COMPANY') {
                        window.dispatchEvent(new CustomEvent('app-navigation', {
                            detail: {
                                tab: action.tab,
                                companyId: action.companyId,
                                cestaTab: action.cestaTab,
                                year: action.year,
                                month: action.month
                            }
                        }));
                    }
                });
                setTimeout(() => setIsApplying(false), 1000);
            }
        } else if (typeof result === 'string') {
            setHistory(prev => [...prev, { role: 'assistant', content: result }]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                    }`}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-white animate-pulse">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 border-2 border-white"></span>
                        </span>
                    </div>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-bold">IA</div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-tight">Assistente de Operações</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Online & Pronto</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {history.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                <div className="text-4xl">✨</div>
                                <div>
                                    <p className="text-sm font-bold uppercase text-slate-600">Olá! Eu sou sua IA de Operações.</p>
                                    <p className="text-xs text-slate-500">Peça para eu corrigir nomes, salários, <br /> cadastrar novos itens ou automatizar tarefas.</p>
                                </div>
                            </div>
                        )}
                        {history.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400 font-bold uppercase animate-pulse">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                    Processando Comando...
                                </div>
                            </div>
                        )}
                        {isApplying && (
                            <div className="flex justify-center">
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-sm animate-bounce">
                                    <span>✅ Aplicando Edições Providenciais...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
                        {imagePreview && (
                            <div className="mb-2 relative inline-block">
                                <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm" />
                                <button
                                    type="button"
                                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div className="relative flex items-end gap-2">
                            <label className="p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors h-[48px] flex items-center justify-center">
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </label>
                            <div className="flex-1 relative">
                                <textarea
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    placeholder="O que deseja ajustar hoje?"
                                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none min-h-[48px]"
                                    rows={1}
                                    onPaste={handlePaste}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e as any);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={(!command.trim() && !selectedImage) || isProcessing}
                                    className="absolute right-2 bottom-1.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 text-center tracking-widest">
                            Inteligência Artificial Operacional • PRO-ADM
                        </p>
                    </form>
                </div>
            )}
        </div>
    );
};
