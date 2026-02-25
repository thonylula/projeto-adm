
import { useMemo, useCallback } from 'react';
import { safeIncludes } from '../utils';
import { useBiometricsCalculator } from './useBiometricsCalculator';

export const useBiometricsData = (currentData: any[], filterText: string, biometryDate: string) => {
    const { getPerformanceStatus } = useBiometricsCalculator();

    /**
     * Helper de Ordenação (OC-01, OC-02... VP-01...)
     */
    const sortData = useCallback((data: any[]) => {
        return [...data].sort((a, b) => {
            const getParts = (str: string) => {
                const clean = (str || '').toUpperCase().replace(/\s+/g, '');
                const match = clean.match(/^([A-Z]+)-?(\d+)/);
                if (match) {
                    return { prefix: match[1], num: parseInt(match[2]) };
                }
                return { prefix: clean, num: 9999 };
            };

            const partA = getParts(a.viveiro);
            const partB = getParts(b.viveiro);

            if (partA.prefix !== partB.prefix) {
                return partA.prefix.localeCompare(partB.prefix);
            }
            return partA.num - partB.num;
        });
    }, []);

    /**
     * Processamento e Classificação dos Dados
     */
    const processedData = useMemo(() => {
        // 1. Filtragem
        const filtered = currentData.filter(item =>
            safeIncludes((item.viveiro || '').toLowerCase(), filterText.toLowerCase())
        );

        // 2. Mapeamento e Cálculos
        const processed = filtered.map(item => {
            // Normalização de Nome
            const viveiro = (item.viveiro || '').toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005');

            // Pesos e Quantidade
            let pMed = null;
            if (typeof item.pMedStr === 'string') {
                pMed = parseFloat(item.pMedStr.replace(',', '.'));
            } else if (typeof item.pMedStr === 'number') {
                pMed = item.pMedStr;
            }
            if (isNaN(pMed)) pMed = null;

            let pAnt = null;
            if (typeof item.pAntStr === 'string') {
                pAnt = parseFloat(item.pAntStr.replace(',', '.'));
            } else if (typeof item.pAntStr === 'number') {
                pAnt = item.pAntStr;
            }
            if (isNaN(pAnt)) pAnt = null;

            let quat = null;
            if (typeof item.quat === 'string') {
                quat = parseFloat(item.quat.replace(',', '.'));
            } else if (typeof item.quat === 'number') {
                quat = item.quat;
            }
            if (isNaN(quat)) quat = null;

            // Incremento e GPD
            let incSemanal = 0;
            let gpd = 0;
            let gpdDisplay = "-";

            if (pMed !== null && pAnt !== null) {
                incSemanal = pMed - pAnt;
                gpd = incSemanal / 7;
                gpdDisplay = gpd.toFixed(3);
            }

            // Lógica de Datas e Dias de Cultivo
            let doc = item.diasCultivo;
            let dataPov = item.dataPovoamento;

            if (dataPov && dataPov.includes('/')) {
                let [d, m, y] = dataPov.split('/');
                if (y && y.length === 2) y = '20' + y;
                if (y && m && d) dataPov = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }

            if (dataPov && biometryDate) {
                try {
                    const pDate = new Date(dataPov + 'T12:00:00');
                    const bDate = new Date(biometryDate + 'T12:00:00');
                    if (!isNaN(pDate.getTime()) && !isNaN(bDate.getTime())) {
                        const diffTime = (bDate.getTime() - pDate.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        doc = diffDays > 0 ? diffDays : 0;
                    }
                } catch (e) { }
            }

            // Status de Performance
            let statusData: any = {
                label: "Aguardando",
                bgColor: "",
                textColor: "text-gray-400",
                reason: "Sem leitura"
            };

            if (pMed !== null && doc) {
                statusData = getPerformanceStatus(pMed, doc);
            } else if (pMed === null) {
                statusData.label = "Sem leitura";
                statusData.reason = "Sem justificativa técnica disponível.";
            }

            // Peso Total
            let pesoTotal = "0.000";
            if (item.pesoTotalStr) {
                const pStr = typeof item.pesoTotalStr === 'string' ? item.pesoTotalStr.replace(',', '.') : String(item.pesoTotalStr);
                const val = parseFloat(pStr);
                pesoTotal = isNaN(val) ? "0.000" : val.toFixed(3);
            } else if (pMed !== null && quat !== null) {
                pesoTotal = ((pMed * quat) / 1000).toFixed(3);
            }

            const incSemanalStr = incSemanal !== 0 ? (incSemanal > 0 ? `+ ${incSemanal.toFixed(2)}` : incSemanal.toFixed(2)) : "-";

            return {
                ...item,
                viveiro,
                pMedInputValue: item.pMedStr || '',
                quatInputValue: item.quat || '',
                pesoTotalInputValue: pesoTotal,
                pMedDisplay: item.pMedStr || '-',
                pAntDisplay: item.pAntStr || '-',
                dataPovoamento: dataPov,
                diasCultivo: doc,
                diasCultivoDisplay: doc ?? '-',
                pesoTotal: pesoTotal,
                incSemanalStr,
                gpdDisplay,
                analysisStatus: statusData.label,
                rowBgColor: statusData.bgColor,
                statusTextColor: statusData.textColor,
                technicalReason: statusData.reason,
                hasBiometrics: pMed !== null && pMed > 0
            };
        });

        return sortData(processed);
    }, [currentData, filterText, biometryDate, getPerformanceStatus, sortData]);

    return useMemo(() => ({
        processedData,
        sortData
    }), [processedData, sortData]);
};
