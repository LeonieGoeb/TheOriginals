import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import LegendePills from './LegendePills';

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

interface BarreOutilsProps {
  analyseActive: boolean;
  traductionActive: boolean;
  onToggleAnalyse: () => void;
  onToggleTraduction: () => void;
  chapitres: { id: string; titre: string }[];
  chapitreActuelId: string;
  onChangerChapitre: (chapitreId: string) => void;
  isPending?: boolean;
}

export default function BarreOutils({
  analyseActive,
  traductionActive,
  onToggleAnalyse,
  onToggleTraduction,
  chapitres,
  chapitreActuelId,
  onChangerChapitre,
  isPending = false,
}: BarreOutilsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const chapitreActuelIndex = chapitres.findIndex(c => c.id === chapitreActuelId);

  return (
    <View style={styles.container}>
      {/* Ligne 1 : légende grammaticale */}
      <View style={styles.ligne}>
        <LegendePills />
      </View>

      {/* Ligne 2 : boutons d'action + sélecteur de chapitre */}
      <View style={styles.ligne}>
        <TouchableOpacity
          style={[styles.btn, analyseActive && styles.btnActive]}
          onPress={onToggleAnalyse}
        >
          <Text style={styles.btnText}>🔍 Analysis</Text>
        </TouchableOpacity>
        <View style={styles.sep} />
        <TouchableOpacity
          style={[styles.btn, traductionActive && styles.btnActive]}
          onPress={onToggleTraduction}
        >
          <Text style={styles.btnText}>💬 Translation</Text>
        </TouchableOpacity>
        {isPending && <ActivityIndicator size="small" color={COLORS.accent} style={styles.spinner} />}
        <View style={styles.sep} />
        <TouchableOpacity style={[styles.btn, styles.btnChapitre]} onPress={() => setShowPicker(true)}>
          <Text style={styles.btnText} numberOfLines={1}>
            <Text style={styles.btnChapitreLabel}>Chapter: </Text>{chapitreActuelIndex >= 0 ? toRoman(chapitreActuelIndex + 1) : '—'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <View style={styles.picker}>
            {chapitres.map((ch, index) => (
              <TouchableOpacity
                key={ch.id}
                style={[styles.pickerItem, ch.id === chapitreActuelId && styles.pickerItemActive]}
                onPress={() => {
                  onChangerChapitre(ch.id);
                  setShowPicker(false);
                }}
              >
                <Text style={[styles.pickerText, ch.id === chapitreActuelId && styles.pickerTextActive]}>
                  {toRoman(index + 1)}
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
    flexDirection: 'column',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.bgBar,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sep: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  btnChapitre: {
    flex: 1,
    minWidth: 0,
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
  btnChapitreLabel: {
    color: COLORS.textLight,
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
  spinner: {
    marginLeft: 4,
  },
});
