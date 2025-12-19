
export function safeIncludes(value: any, needle: string): boolean {
    if (typeof value === 'string') return value.includes(needle);
    if (Array.isArray(value)) return value.includes(needle);
    // se for objeto, procurar em suas propriedades stringificadas
    if (value && typeof value === 'object') {
        try {
            const s = JSON.stringify(value);
            return s.includes(needle);
        } catch (e) { return false; }
    }
    return false;
}

export function numberToWordsBRL(value: number): string {
    if (value === 0) return 'zero reais';

    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitocentos', 'noventa'];
    const hundreds = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const parts = value.toFixed(2).split('.');
    let integers = parseInt(parts[0]);
    let cents = parseInt(parts[1]);

    function convert(n: number): string {
        if (n === 0) return '';
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) {
            const t = Math.floor(n / 10);
            const u = n % 10;
            return tens[t] + (u > 0 ? ' e ' + units[u] : '');
        }
        if (n === 100) return 'cem';
        if (n < 1000) {
            const h = Math.floor(n / 100);
            const rest = n % 100;
            const hStr = h === 1 && rest > 0 ? 'cento' : hundreds[h];
            return hStr + (rest > 0 ? ' e ' + convert(rest) : '');
        }
        return '';
    }

    function fullConvert(n: number): string {
        if (n === 0) return '';
        if (n < 1000) return convert(n);
        if (n < 1000000) {
            const thousands = Math.floor(n / 1000);
            const rest = n % 1000;
            let thStr = thousands === 1 ? 'mil' : convert(thousands) + ' mil';
            return thStr + (rest > 0 ? (rest < 100 || rest % 100 === 0 ? ' e ' : ' ') + convert(rest) : '');
        }
        return 'valor muito alto';
    }

    let result = '';
    if (integers > 0) {
        result += fullConvert(integers);
        result += integers === 1 ? ' real' : ' reais';
    }

    if (cents > 0) {
        if (integers > 0) result += ' e ';
        result += convert(cents);
        result += cents === 1 ? ' centavo' : ' centavos';
    }

    return result;
}
