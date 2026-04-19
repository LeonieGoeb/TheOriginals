import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Locale } from '@/constants/strings';

const STORAGE_KEY_LANGUE_CIBLE = 'app_langue_cible';

function deviceLocale(): Locale {
  const tag = getLocales()[0]?.languageCode ?? 'en';
  return tag === 'fr' ? 'fr' : 'en';
}

const LocaleContext = createContext<Locale>('en');

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(deviceLocale);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_LANGUE_CIBLE).then(val => {
      if (val === 'fr') setLocale('fr');
      else if (val) setLocale('en');
    }).catch(() => {});
  }, []);

  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
