import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CodeNiveau, getNiveau } from '@/constants/niveaux';
import { useLocale } from '@/contexts/LocaleContext';

interface NiveauBadgeProps {
  code: CodeNiveau;
  style?: ViewStyle;
}

export default function NiveauBadge({ code, style }: NiveauBadgeProps) {
  const locale = useLocale();
  const niveau = getNiveau(code);
  return (
    <View style={[styles.badge, { backgroundColor: niveau.couleur }, style]}>
      <Text style={[styles.text, { color: niveau.couleurTexte }]}>
        {niveau.nom[locale]}
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
