/**
 * Utility functions for managing monthly basket exclusions
 */

const getExclusionKey = (month: number, year: number): string => {
    return `basket_exclusions_${year}_${String(month).padStart(2, '0')}`;
};

export const getCurrentMonthYear = (): { month: number; year: number } => {
    const now = new Date();
    return {
        month: now.getMonth() + 1, // 1-12
        year: now.getFullYear()
    };
};

export const getExcludedEmployees = (month: number, year: number): string[] => {
    const key = getExclusionKey(month, year);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
};

export const isEmployeeExcluded = (
    employeeName: string,
    month: number,
    year: number
): boolean => {
    const excluded = getExcludedEmployees(month, year);
    return excluded.includes(employeeName);
};

export const toggleExclusion = (
    employeeName: string,
    month: number,
    year: number
): void => {
    const key = getExclusionKey(month, year);
    const excluded = getExcludedEmployees(month, year);

    const index = excluded.indexOf(employeeName);
    if (index > -1) {
        // Remove exclusion
        excluded.splice(index, 1);
    } else {
        // Add exclusion
        excluded.push(employeeName);
    }

    localStorage.setItem(key, JSON.stringify(excluded));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('basketExclusionsChanged', {
        detail: { month, year, excluded }
    }));
};

export const setExcludedEmployees = (
    employeeNames: string[],
    month: number,
    year: number
): void => {
    const key = getExclusionKey(month, year);
    localStorage.setItem(key, JSON.stringify(employeeNames));

    window.dispatchEvent(new CustomEvent('basketExclusionsChanged', {
        detail: { month, year, excluded: employeeNames }
    }));
};
