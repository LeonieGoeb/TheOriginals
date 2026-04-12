import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Livre } from '@/data/types';
import { COLORS } from '@/constants/colors';
import { getLangue } from '@/constants/langues';

interface CarteLivreProps {
  livre: Livre;
  onPress: () => void;
}

export default function CarteLivre({ livre, onPress }: CarteLivreProps) {
  const drapeauSource = getLangue(livre.langueSource).drapeau;
  const drapeauCible = getLangue(livre.langueCible).drapeau;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: livre.couvertureCouleur }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.body}>
        <Text style={styles.titreOriginal}>{livre.titreOriginal}</Text>
        <Text style={styles.titre}>{livre.titre}</Text>
        <Text style={styles.auteur}>{livre.auteur}</Text>
        <View style={styles.footer}>
          <Text style={styles.drapeaux}>
            {drapeauSource} → {drapeauCible}
          </Text>
          <View style={[styles.badge, livre.gratuit ? styles.badgeFree : styles.badgeLocked]}>
            <Text style={[styles.badgeText, livre.gratuit ? styles.badgeFreeText : styles.badgeLockedText]}>
              {livre.gratuit ? 'Gratuit' : 'Verrouillé 🔒'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  body: {
    gap: 4,
  },
  titreOriginal: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  titre: {
    fontSize: 15,
    color: COLORS.textMid,
  },
  auteur: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  drapeaux: {
    fontSize: 18,
    letterSpacing: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeFree: {
    backgroundColor: '#e6f4e8',
    borderColor: COLORS.complBorder,
  },
  badgeLocked: {
    backgroundColor: '#fdecea',
    borderColor: COLORS.subjectBorder,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeFreeText: {
    color: COLORS.complText,
  },
  badgeLockedText: {
    color: COLORS.subjectText,
  },
});
