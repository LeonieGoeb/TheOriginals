import React, { createContext, useContext } from 'react';
import { Locale } from '@/constants/strings';

const LocaleContext = createContext<Locale>('en');

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value="en">
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
