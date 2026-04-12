import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export default function LegendePills() {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <View style={[styles.pill, styles.pillS]}>
          <Text style={[styles.pillText, { color: COLORS.subjectText }]}>S</Text>
        </View>
        <Text style={styles.label}>Sujet</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.pill, styles.pillV]}>
          <Text style={[styles.pillText, { color: COLORS.verbText }]}>V</Text>
        </View>
        <Text style={styles.label}>Verbe</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.pill, styles.pillC]}>
          <Text style={[styles.pillText, { color: COLORS.complText }]}>C</Text>
        </View>
        <Text style={styles.label}>Compl.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  pillS: {
    backgroundColor: COLORS.subjectBg,
    borderColor: COLORS.subjectBorder,
  },
  pillV: {
    backgroundColor: COLORS.verbBg,
    borderColor: COLORS.verbBorder,
  },
  pillC: {
    backgroundColor: COLORS.complBg,
    borderColor: COLORS.complBorder,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
