import { Platform } from 'react-native';

// Topics FCM : src_{langueSource}_tgt_{langueCible}
export function buildTopics(languesSources: string[], languesCibles: string[]): string[] {
  const topics: string[] = [];
  for (const src of languesSources) {
    for (const tgt of languesCibles) {
      topics.push(`src_${src}_tgt_${tgt}`);
    }
  }
  return topics;
}

// Synchronise les abonnements FCM avec les préférences de l'utilisateur.
// Appeler à chaque changement de languesSources ou languesCibles.
export async function syncTopics(
  languesSources: string[],
  languesCibles: string[],
  prevTopics: string[] = [],
): Promise<string[]> {
  if (Platform.OS === 'web') return [];

  let messaging: typeof import('@react-native-firebase/messaging').default;
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch {
    return [];
  }

  const nextTopics = buildTopics(languesSources, languesCibles);

  // Désabonnement des anciens topics
  for (const topic of prevTopics) {
    if (!nextTopics.includes(topic)) {
      await messaging().unsubscribeFromTopic(topic);
    }
  }

  // Abonnement aux nouveaux topics (nécessite la permission)
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    for (const topic of nextTopics) {
      if (!prevTopics.includes(topic)) {
        await messaging().subscribeToTopic(topic);
      }
    }
  }

  return nextTopics;
}
