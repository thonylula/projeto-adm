import { useState, useEffect } from 'react';

interface UseGoogleMapsResult {
    isLoaded: boolean;
    loadError: Error | null;
}

/**
 * Hook to load Google Maps JavaScript API
 * @param apiKey - Google Maps API Key
 */
export const useGoogleMaps = (apiKey: string): UseGoogleMapsResult => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<Error | null>(null);

    useEffect(() => {
        // Check if already loaded
        if (window.google && window.google.maps) {
            setIsLoaded(true);
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => setIsLoaded(true));
            existingScript.addEventListener('error', () => setLoadError(new Error('Failed to load Google Maps')));
            return;
        }

        // Load the script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry`;
        script.async = true;
        script.defer = true;

        script.addEventListener('load', () => setIsLoaded(true));
        script.addEventListener('error', () => setLoadError(new Error('Failed to load Google Maps')));

        document.head.appendChild(script);

        return () => {
            // Cleanup if component unmounts during load
            script.removeEventListener('load', () => setIsLoaded(true));
            script.removeEventListener('error', () => setLoadError(new Error('Failed to load Google Maps')));
        };
    }, [apiKey]);

    return { isLoaded, loadError };
};
