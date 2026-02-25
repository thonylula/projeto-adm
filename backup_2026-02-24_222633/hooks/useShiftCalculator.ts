import { useCallback } from 'react';

const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

export const useShiftCalculator = () => {
    const calculateShiftStats = useCallback((
        start: string, end: string, breakStart: string, breakEnd: string, extendNight: boolean
    ) => {
        const startMins = timeToMinutes(start);
        const endMins = timeToMinutes(end);
        if (startMins === -1 || endMins === -1) return null;

        let effectiveEndMins = endMins;
        if (endMins < startMins) effectiveEndMins += 1440;

        const breakStartMins = timeToMinutes(breakStart);
        const breakEndMins = timeToMinutes(breakEnd);
        let breakStartAdjusted = -1;
        let breakEndAdjusted = -1;

        if (breakStartMins !== -1 && breakEndMins !== -1) {
            let bStart = breakStartMins;
            let bEnd = breakEndMins;
            if (bStart < startMins && effectiveEndMins > 1440) bStart += 1440;
            if (bEnd < bStart) bEnd += 1440;
            if (bStart >= startMins && bEnd <= effectiveEndMins) {
                breakStartAdjusted = bStart;
                breakEndAdjusted = bEnd;
            }
        }

        let nightMinutes = 0;
        let dayMinutes = 0;

        for (let m = startMins; m < effectiveEndMins; m++) {
            if (breakStartAdjusted !== -1 && m >= breakStartAdjusted && m < breakEndAdjusted) continue;
            const timeOfDay = m % 1440;
            const isStandardNight = timeOfDay >= 1320 || timeOfDay < 300;
            let isExtendedNight = false;
            if (extendNight && !isStandardNight) {
                if (timeOfDay >= 300 && startMins < (effectiveEndMins > 1440 ? 1740 : 300)) {
                    isExtendedNight = true;
                }
            }
            if (isStandardNight || isExtendedNight) nightMinutes++;
            else dayMinutes++;
        }

        const totalWorkedMinutes = dayMinutes + nightMinutes;
        return {
            dayHours: dayMinutes / 60,
            nightHours: nightMinutes / 60,
            totalHours: totalWorkedMinutes / 60
        };
    }, []);

    return { calculateShiftStats };
};
