
export function safeIncludes(value: any, needle: string): boolean {
    if (typeof value === 'string') return value.includes(needle);
    if (Array.isArray(value)) return value.includes(needle);
    // se for objeto, procurar em suas propriedades stringificadas
    if (value && typeof value === 'object') {
        try {
            const s = JSON.stringify(value);
            return s.includes(needle);
        } catch (e) {
            return false;
        }
    }
    return false;
}
