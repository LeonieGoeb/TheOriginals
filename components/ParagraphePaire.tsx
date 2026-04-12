import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Paragraphe } from '@/data/types';
import { COLORS } from '@/constants/colors';
import TokenTexte from './TokenTexte';

interface ParagraphePaireProps {
  paragraphe: Paragraphe;
  analyseActive: boolean;
  traductionVisible: boolean;
  onToggleAnalyse: () => void;
  onToggleTraduction: () => void;
}

export default function ParagraphePaire({
  paragraphe,
  analyseActive,
  traductionVisible,
  onToggleAnalyse,
  onToggleTraduction,
}: ParagraphePaireProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TokenTexte
          tokens={paragraphe.ru}
          analyseActive={analyseActive}
          style={styles.textRu}
        />
        {traductionVisible && (
          <TokenTexte
            tokens={paragraphe.fr}
            analyseActive={analyseActive}
            style={styles.textFr}
          />
        )}
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, analyseActive && styles.btnActive]}
          onPress={onToggleAnalyse}
        >
          <Text style={styles.btnText}>👁</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, traductionVisible && styles.btnActive]}
          onPress={onToggleTraduction}
        >
          <Text style={styles.btnText}>🇫🇷</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  textRu: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textDark,
  },
  textFr: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMid,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    paddingTop: 2,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  btnActive: {
    backgroundColor: COLORS.border,
  },
  btnText: {
    fontSize: 14,
  },
});
