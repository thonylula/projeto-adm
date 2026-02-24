
import { useMemo, useCallback } from 'react';

// --- TABELA DE REFERÊNCIA DE CRESCIMENTO (ATUALIZADA) ---
const GROWTH_TABLE = [
    { day: 30, espetacular: 1.8, otimo: 1.5, bom: 1.2, regular: 0.8, ruim: 0.4, pessimo: 0.2 },
    { day: 60, espetacular: 7.5, otimo: 6.5, bom: 6.0, regular: 4.5, ruim: 2.5, pessimo: 1.2 },
    { day: 90, espetacular: 17.5, otimo: 15.5, bom: 12.0, regular: 8.5, ruim: 5.0, pessimo: 2.5 },
    { day: 120, espetacular: 22.0, otimo: 20.0, bom: 16.0, regular: 12.0, ruim: 8.0, pessimo: 4.0 },
];

export interface GrowthTargets {
    espetacular: number;
    otimo: number;
    bom: number;
    regular: number;
    ruim: number;
    pessimo: number;
}

export const useBiometricsCalculator = () => {
    /**
     * Função de Interpolação Linear para calcular metas exatas entre dias tabelados.
     */
    const calculateTargets = useCallback((doc: number): GrowthTargets => {
        const initial: GrowthTargets = { espetacular: 0, otimo: 0, bom: 0, regular: 0, ruim: 0, pessimo: 0 };
        if (doc <= 0) return initial;

        // Se o dia for menor que o primeiro da tabela (30), interpola do zero
        if (doc < GROWTH_TABLE[0].day) {
            const ratio = doc / GROWTH_TABLE[0].day;
            return {
                espetacular: GROWTH_TABLE[0].espetacular * ratio,
                otimo: GROWTH_TABLE[0].otimo * ratio,
                bom: GROWTH_TABLE[0].bom * ratio,
                regular: GROWTH_TABLE[0].regular * ratio,
                ruim: GROWTH_TABLE[0].ruim * ratio,
                pessimo: GROWTH_TABLE[0].pessimo * ratio,
            };
        }

        // Se o dia for maior que o último, projeta com base na última inclinação
        if (doc >= GROWTH_TABLE[GROWTH_TABLE.length - 1].day) {
            const last = GROWTH_TABLE[GROWTH_TABLE.length - 1];
            const prev = GROWTH_TABLE[GROWTH_TABLE.length - 2];
            const ratio = (doc - last.day) / (last.day - prev.day);
            return {
                espetacular: last.espetacular + (last.espetacular - prev.espetacular) * ratio,
                otimo: last.otimo + (last.otimo - prev.otimo) * ratio,
                bom: last.bom + (last.bom - prev.bom) * ratio,
                regular: last.regular + (last.regular - prev.regular) * ratio,
                ruim: last.ruim + (last.ruim - prev.ruim) * ratio,
                pessimo: last.pessimo + (last.pessimo - prev.pessimo) * ratio,
            };
        }

        // Encontra o intervalo correto
        for (let i = 0; i < GROWTH_TABLE.length - 1; i++) {
            const curr = GROWTH_TABLE[i];
            const next = GROWTH_TABLE[i + 1];

            if (doc >= curr.day && doc < next.day) {
                const range = next.day - curr.day;
                const progress = doc - curr.day;
                const percentage = progress / range;

                return {
                    espetacular: curr.espetacular + (next.espetacular - curr.espetacular) * percentage,
                    otimo: curr.otimo + (next.otimo - curr.otimo) * percentage,
                    bom: curr.bom + (next.bom - curr.bom) * percentage,
                    regular: curr.regular + (next.regular - curr.regular) * percentage,
                    ruim: curr.ruim + (next.ruim - curr.ruim) * percentage,
                    pessimo: curr.pessimo + (next.pessimo - curr.pessimo) * percentage,
                };
            }
        }

        return { ...GROWTH_TABLE[0] }; // Fallback seguro
    }, []);

    /**
     * Determina o status e cores com base no peso médio e metas.
     */
    const getPerformanceStatus = useCallback((pMed: number, doc: number) => {
        const targets = calculateTargets(doc);

        if (pMed >= targets.espetacular) {
            return {
                label: `💥 ESPETACULAR: Topo de Linha!(> ${targets.espetacular.toFixed(2)}g)`,
                bgColor: "bg-[#FFEDD5] hover:bg-[#FED7AA]",
                textColor: "text-[#7C2D12] font-extrabold",
                reason: "Crescimento significativamente acima do topo da curva. Indica excelente conversão alimentar e condições ambientais ideais."
            };
        } else if (pMed >= targets.otimo) {
            return {
                label: `🔥 ÓTIMO: Acima da meta(${targets.otimo.toFixed(2)}g)`,
                bgColor: "bg-[#FFF7ED] hover:bg-[#FFEDD5]",
                textColor: "text-[#9A3412] font-bold",
                reason: "Desempenho acima da média esperada para o período. Manejo eficiente e boa resposta biológica."
            };
        } else if (pMed >= targets.bom) {
            return {
                label: `💪 BOM: Dentro do esperado.`,
                bgColor: "bg-white hover:bg-[#FFF7ED]",
                textColor: "text-[#C2410C] font-bold",
                reason: "Desenvolvimento dentro dos parâmetros zootécnicos ideais. Estabilidade no cultivo."
            };
        } else if (pMed >= targets.regular) {
            return {
                label: `⚡ REGULAR: Atenção(${targets.regular.toFixed(2)}g)`,
                bgColor: "bg-white hover:bg-orange-50/50",
                textColor: "text-[#EA580C] font-bold",
                reason: "Crescimento no limite inferior da meta. Sugerido monitoramento rigoroso da qualidade da água."
            };
        } else if (pMed >= targets.ruim) {
            return {
                label: `⚠️ RUIM: Abaixo da média(< ${targets.regular.toFixed(2)} g)`,
                bgColor: "bg-white hover:bg-orange-50/30",
                textColor: "text-[#F97316] font-bold",
                reason: "Desempenho abaixo do potencial genético. Necessária revisão imediata da estratégia nutricional."
            };
        } else {
            return {
                label: `🚨 PÉSSIMO: Crítico(< ${targets.ruim.toFixed(2)} g)`,
                bgColor: "bg-[#FEF2F2] hover:bg-[#FEE2E2]",
                textColor: "text-[#B91C1C] font-bold",
                reason: "Nível crítico de crescimento. Risco de inviabilidade econômica. Intervenção técnica urgente recomendada."
            };
        }
    }, [calculateTargets]);

    return useMemo(() => ({
        calculateTargets,
        getPerformanceStatus,
        GROWTH_TABLE
    }), [calculateTargets, getPerformanceStatus]);
};
