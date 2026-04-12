import { Stack } from 'expo-router';

export default function LivreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '' }} />
      <Stack.Screen name="[chapitreId]" options={{ title: '' }} />
    </Stack>
  );
}
