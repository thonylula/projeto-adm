import { useCallback } from 'react';

const FIXED_HOLIDAYS = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
];

const STATE_HOLIDAYS: Record<string, string[]> = {
    'AC': ['01-23', '03-08', '06-15', '08-06', '09-05', '11-17'],
    'AL': ['06-24', '09-16'],
    'AP': ['03-19', '09-13', '10-05'],
    'AM': ['09-05'],
    'BA': ['07-02'],
    'CE': ['03-19', '03-25'],
    'DF': ['11-30'],
    'ES': [],
    'GO': [],
    'MA': ['07-28'],
    'MT': ['11-20'],
    'MS': ['10-11'],
    'MG': [],
    'PA': ['08-15'],
    'PB': ['08-05'],
    'PR': ['12-19'],
    'PE': ['03-06', '06-24'],
    'PI': ['10-19'],
    'RJ': ['04-23'],
    'RN': ['10-03'],
    'RS': ['09-20'],
    'RO': ['01-04', '06-18'],
    'RR': ['10-05'],
    'SC': ['08-11'],
    'SP': ['07-09'],
    'SE': ['07-08'],
    'TO': ['03-18', '09-08', '10-05'],
};

export const usePayrollCalendar = () => {
    const getEasterDate = useCallback((year: number): Date => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    }, []);

    const getMobileHolidays = useCallback((year: number): string[] => {
        const easter = getEasterDate(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        const carnival = new Date(easter);
        carnival.setDate(easter.getDate() - 47);

        const format = (date: Date) => {
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            return `${m}-${d}`;
        };

        return [format(goodFriday), format(carnival)];
    }, [getEasterDate]);

    const calculateCalendarDays = useCallback((month: number, year: number, state: string) => {
        const endDate = new Date(year, month, 0);
        const mobileHolidays = getMobileHolidays(year);
        const stateHolidays = STATE_HOLIDAYS[state] || [];
        const allHolidays = new Set([...FIXED_HOLIDAYS, ...mobileHolidays, ...stateHolidays]);

        let business = 0;
        let nonBusiness = 0;

        for (let d = 1; d <= endDate.getDate(); d++) {
            const current = new Date(year, month - 1, d);
            const isSunday = current.getDay() === 0;
            const dateStr = `${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;

            if (isSunday || allHolidays.has(dateStr)) nonBusiness++;
            else business++;
        }

        return { business, nonBusiness };
    }, [getMobileHolidays]);

    const countSundays = useCallback((start: string, end: string, scale: string, scheduleType: string | null): number => {
        if (!start || !end) return 0;
        const startDate = new Date(start + 'T00:00:00');
        const endDate = new Date(end + 'T00:00:00');
        if (startDate > endDate) return 0;

        let count = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            if (current.getDay() === 0) {
                if (scale === '12x36' && scheduleType) {
                    const d = current.getDate();
                    if ((scheduleType === 'ODD' && d % 2 !== 0) || (scheduleType === 'EVEN' && d % 2 === 0)) count++;
                } else count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }, []);

    return { calculateCalendarDays, countSundays };
};
