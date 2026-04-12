import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import CarteLivre from '@/components/CarteLivre';

export default function BibliothequeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ma bibliothèque</Text>
        {BIBLIOTHEQUE.map(livre => (
          <CarteLivre
            key={livre.id}
            livre={livre}
            onPress={() => router.push(`/livre/${livre.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
});
