import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export type TicketDetailMode = 'drawer' | 'modal' | 'page';

const STORAGE_KEY = 'ticketDetailMode';

interface SettingsContextType {
  ticketDetailMode: TicketDetailMode;
  setTicketDetailMode: (mode: TicketDetailMode) => void;
}

const defaultMode: TicketDetailMode = 'drawer';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ticketDetailMode, setTicketDetailModeState] = useState<TicketDetailMode>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) as TicketDetailMode | null;
      if (saved && ['drawer', 'modal', 'page'].includes(saved)) return saved;
    } catch (_) {}
    return defaultMode;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, ticketDetailMode);
    } catch (_) {}
  }, [ticketDetailMode]);

  const setTicketDetailMode = (mode: TicketDetailMode) => {
    setTicketDetailModeState(mode);
  };

  return (
    <SettingsContext.Provider value={{ ticketDetailMode, setTicketDetailMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings debe ser usado dentro de un SettingsProvider');
  }
  return context;
};
