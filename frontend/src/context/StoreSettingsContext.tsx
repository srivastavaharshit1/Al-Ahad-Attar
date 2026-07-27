import React, { createContext, useContext, useState, useEffect } from 'react';
import { storeSettingsService, type StoreSettings } from '../services/storeSettingsService';

interface StoreSettingsContextType {
    settings: StoreSettings | null;
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType>({
    settings: null,
    isLoading: true,
    refreshSettings: async () => {}
});

export const useStoreSettings = () => useContext(StoreSettingsContext);

export const StoreSettingsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshSettings = async () => {
        try {
            const res = await storeSettingsService.getSettings();
            if (res.data) {
                const timestamp = new Date().getTime();
                if (res.data.brandLogoUrl) {
                    res.data.brandLogoUrl = `${res.data.brandLogoUrl}?t=${timestamp}`;
                }
                if (res.data.navbarLogoUrl) {
                    res.data.navbarLogoUrl = `${res.data.navbarLogoUrl}?t=${timestamp}`;
                }
            }
            setSettings(res.data || null);
        } catch (error) {
            console.error('Failed to load store settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <StoreSettingsContext.Provider value={{ settings, isLoading, refreshSettings }}>
            {children}
        </StoreSettingsContext.Provider>
    );
};
