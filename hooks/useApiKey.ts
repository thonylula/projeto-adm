export const useApiKey = (storageKey: string) => {
    const [apiKey, setApiKey] = React.useState(localStorage.getItem(storageKey) || '');
    const [isOpen, setIsOpen] = React.useState(false);

    const saveKey = (key: string) => {
        localStorage.setItem(storageKey, key);
        setApiKey(key);
        setIsOpen(false);
    };

    return { apiKey, isOpen, setIsOpen, saveKey };
};
