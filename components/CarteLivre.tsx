import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Livre } from '@/data/types';
import { COLORS } from '@/constants/colors';

interface CarteLivreProps {
  livre: Livre;
  onPress: () => void;
}

export default function CarteLivre({ livre, onPress }: CarteLivreProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.body}>
        <Text style={styles.titreOriginal}>{livre.titreOriginal}</Text>
        <Text style={styles.titre}>{livre.titre}</Text>
        <Text style={styles.auteur}>{livre.auteur}</Text>
      </View>
      <View style={[styles.badge, livre.gratuit ? styles.badgeFree : styles.badgeLocked]}>
        <Text style={[styles.badgeText, livre.gratuit ? styles.badgeFreeText : styles.badgeLockedText]}>
          {livre.gratuit ? 'Gratuit' : 'Verrouillé 🔒'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    marginRight: 12,
  },
  titreOriginal: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  titre: {
    fontSize: 15,
    color: COLORS.textMid,
    marginBottom: 6,
  },
  auteur: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
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
