import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CodeNiveau, getNiveau } from '@/constants/niveaux';

interface NiveauBadgeProps {
  code: CodeNiveau;
  style?: ViewStyle;
}

export default function NiveauBadge({ code, style }: NiveauBadgeProps) {
  const niveau = getNiveau(code);
  return (
    <View style={[styles.badge, { backgroundColor: niveau.couleur }, style]}>
      <Text style={[styles.text, { color: niveau.couleurTexte }]}>
        {niveau.nom}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
