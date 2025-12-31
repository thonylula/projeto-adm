import React from 'react';

export const PlansPrices: React.FC = () => {
    const plans = [
        {
            name: "Lançamento / Individual",
            target: "Pequeno Produtor",
            price: "R$ 59,90",
            period: "/mês",
            comparison: "Equivalente a 1 Assinatura Netflix Premium",
            features: [
                "Gestão de até 2 Viveiros",
                "Biometria com IA (Limitada)",
                "Controle de Mortalidade Básico",
                "Suporte via e-mail"
            ],
            color: "blue",
            cta: "Começar Agora"
        },
        {
            name: "Profissional",
            target: "Média Fazenda",
            price: "R$ 119,80",
            period: "/mês",
            comparison: "Menos que 2 sacos de ração",
            features: [
                "Gestão Ilimitada de Viveiros",
                "Biometria com IA Ilimitada",
                "Mortalidade e Consumo Completo",
                "Comparador de Preços (Auditoria)",
                "Relatórios em PDF/PNG",
                "Suporte Prioritário"
            ],
            color: "orange",
            isPopular: true,
            cta: "Assinar Profissional"
        },
        {
            name: "Cooperativa / Enterprise",
            target: "Grandes Grupos",
            price: "Sob Consulta",
            period: "",
            comparison: "Investimento Estratégico Personalizado",
            features: [
                "Múltiplos Usuários e Permissões",
                "API de Integração",
                "Backup Automático em Nuvem",
                "Treinamento Dedicado",
                "Gestor de Conta Exclusivo"
            ],
            color: "slate",
            cta: "Falar com Consultor"
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-12">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-sm font-bold text-orange-600 tracking-widest uppercase mb-2">Investimento Inteligente</h2>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                    Quanto custa ter o controle total da sua produção?
                </h1>
                <p className="text-slate-500 font-medium">
                    Menos do que você imagina. Compare com serviços do dia a dia e veja como o retorno sobre o investimento (ROI) é imediato ao evitar perdas.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
                {plans.map((plan, idx) => (
                    <div
                        key={idx}
                        className={`relative flex flex-col p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${plan.isPopular
                                ? 'bg-white border-orange-500 shadow-orange-100 shadow-lg ring-1 ring-orange-500/20'
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                    >
                        {plan.isPopular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg uppercase tracking-wide">
                                Escolha do Produtor
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className={`font-bold uppercase tracking-wider text-xs mb-1 text-${plan.color}-600`}>{plan.target}</h3>
                            <h2 className="font-black text-xl text-slate-900 mb-4">{plan.name}</h2>
                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                                <span className="text-sm font-bold text-slate-400">{plan.period}</span>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 text-xs font-medium text-slate-600 flex items-center gap-2">
                                <span className="text-lg">💡</span>
                                {plan.comparison}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 mb-8">
                            {plan.features.map((feature, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-3 text-sm text-slate-600">
                                    <svg className={`w-5 h-5 text-${plan.color}-500 flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all focus:ring-4 focus:ring-${plan.color}-500/20 active:scale-95 ${plan.isPopular
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
                                : `bg-slate-900 text-white hover:bg-slate-800`
                            }`}>
                            {plan.cta}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-16 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden max-w-5xl mx-auto shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black mb-6">Por que não uma plataforma de streaming?</h2>
                    <p className="text-indigo-200 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                        Enquanto o streaming oferece entretenimento passivo, nossa ferramenta oferece <strong>controle ativo</strong>.
                        Evitar a perda de apenas 5kg de camarão ou otimizar 1% da conversão alimentar já paga o investimento mensal.
                        É uma troca justa: <span className="text-yellow-400 font-bold">Entretenimento vs. Lucratividade.</span>
                    </p>

                    <div className="inline-flex flex-col sm:flex-row gap-4">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl text-left">
                            <div className="text-2xl font-black text-white mb-1">R$ 59,90</div>
                            <div className="text-indigo-300 text-xs font-bold uppercase">Custo Médio Streaming</div>
                        </div>
                        <div className="flex items-center justify-center text-yellow-400 text-2xl font-bold">VS</div>
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 p-4 rounded-xl text-left shadow-lg transform scale-105 border border-emerald-400">
                            <div className="text-2xl font-black text-white mb-1">Lucro Real</div>
                            <div className="text-emerald-100 text-xs font-bold uppercase">Gestão Eficiente</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
