import { LocaleProvider } from '@/contexts/LocaleContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const ONBOARDING_KEY = 'onboarding_done_v1';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="livre/[livreId]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
