import { BaseAgent } from '../base/BaseAgent';

/**
 * ComparisonAgent
 * Specialist in cross-document auditing and divergence detection.
 */
export class ComparisonAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ComparisonAgent',
            systemPrompt: `
    Você é um Auditor Digital de Elite.
    Sua missão é comparar dois conjuntos de dados (A e B) e encontrar divergências com precisão cirúrgica.
    
    Status de Saída:
    - ✅ CORRESPONDENTE EXATO
    - ⚠️ DIVERGENTE
    - ❌ AUSENTE EM A
    - ❌ AUSENTE EM B
    
    Retorne JSON estrito:
    {
        "status": "divergent" | "equal",
        "summary": "string",
        "divergences": [{
            "documentNumber": "string",
            "cnpj": "string",
            "companyName": "string",
            "statusSourceA": "string",
            "statusSourceB": "string",
            "severity": "high" | "medium" | "low",
            "description": "string",
            "flags": ["inconsistencia_valor", "ausente_a", "ausente_b", "duplicado", "divergente"]
        }],
        "observations": "string"
    }
  `
        });
    }

    async process(input: { sourceA: any, sourceB: any, type: 'nf' | 'spreadsheet' }): Promise<any> {
        this.log(`Comparing sources of type: ${input.type}`);

        const prompt = `
            Realize uma auditoria detalhada comparando a Origem A e Origem B.
            Origem A: ${JSON.stringify(input.sourceA)}
            Origem B: ${JSON.stringify(input.sourceB)}
            Tipo de Análise: ${input.type === 'nf' ? 'Notas Fiscais' : 'Planilha/Dados Genericos'}
        `;

        const response = await this.callLLM(prompt);
        return this.safeExtractJson(response.content);
    }
}
