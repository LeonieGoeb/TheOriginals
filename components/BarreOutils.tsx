import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { COLORS } from '@/constants/colors';
import LegendePills from './LegendePills';

interface BarreOutilsProps {
  analyseActive: boolean;
  traductionActive: boolean;
  onToggleAnalyse: () => void;
  onToggleTraduction: () => void;
  chapitres: { id: string; titre: string }[];
  chapitreActuelId: string;
  onChangerChapitre: (chapitreId: string) => void;
}

export default function BarreOutils({
  analyseActive,
  traductionActive,
  onToggleAnalyse,
  onToggleTraduction,
  chapitres,
  chapitreActuelId,
  onChangerChapitre,
}: BarreOutilsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const chapitreActuel = chapitres.find(c => c.id === chapitreActuelId);

  return (
    <View style={styles.container}>
      <LegendePills />
      <View style={styles.sep} />
      <TouchableOpacity
        style={[styles.btn, analyseActive && styles.btnActive]}
        onPress={onToggleAnalyse}
      >
        <Text style={styles.btnText}>🔍 Analyse</Text>
      </TouchableOpacity>
      <View style={styles.sep} />
      <TouchableOpacity
        style={[styles.btn, traductionActive && styles.btnActive]}
        onPress={onToggleTraduction}
      >
        <Text style={styles.btnText}>💬 Traduction</Text>
      </TouchableOpacity>
      <View style={styles.sep} />
      <TouchableOpacity style={styles.btn} onPress={() => setShowPicker(true)}>
        <Text style={styles.btnText} numberOfLines={1}>
          {chapitreActuel?.titre ?? '—'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <View style={styles.picker}>
            {chapitres.map(ch => (
              <TouchableOpacity
                key={ch.id}
                style={[styles.pickerItem, ch.id === chapitreActuelId && styles.pickerItemActive]}
                onPress={() => {
                  onChangerChapitre(ch.id);
                  setShowPicker(false);
                }}
              >
                <Text style={[styles.pickerText, ch.id === chapitreActuelId && styles.pickerTextActive]}>
                  {ch.titre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.bgBar,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  sep: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  btnActive: {
    backgroundColor: COLORS.border,
  },
  btnText: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 240,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: {
    backgroundColor: COLORS.bgBar,
  },
  pickerText: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  pickerTextActive: {
    fontWeight: '600',
    color: COLORS.accent,
  },
});
