import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Paragraphe } from '@/data/types';
import { COLORS } from '@/constants/colors';
import TokenTexte from './TokenTexte';

interface ParagraphePaireProps {
  paragraphe: Paragraphe;
  langueSource: string;
  langueCible: string;
  analyseActive: boolean;
  traductionVisible: boolean;
  onToggleAnalyse: (id: string) => void;
  onToggleTraduction: (id: string) => void;
}

function ParagraphePaire({
  paragraphe,
  langueSource,
  langueCible,
  analyseActive,
  traductionVisible,
  onToggleAnalyse,
  onToggleTraduction,
}: ParagraphePaireProps) {
  const handleToggleAnalyse = useCallback(() => onToggleAnalyse(paragraphe.id), [onToggleAnalyse, paragraphe.id]);
  const handleToggleTraduction = useCallback(() => onToggleTraduction(paragraphe.id), [onToggleTraduction, paragraphe.id]);
  const tokensSource = paragraphe.textes[langueSource] ?? [];
  const tokensCible = paragraphe.textes[langueCible] ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TokenTexte
          tokens={tokensSource}
          analyseActive={analyseActive}
          style={styles.textSource}
        />
        {traductionVisible && (
          <TokenTexte
            tokens={tokensCible}
            analyseActive={analyseActive}
            style={styles.textCible}
          />
        )}
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, analyseActive && styles.btnActive]}
          onPress={handleToggleAnalyse}
        >
          <Text style={styles.btnText}>👁</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, traductionVisible && styles.btnActive]}
          onPress={handleToggleTraduction}
        >
          <Text style={styles.btnText}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(ParagraphePaire);

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
  textSource: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textDark,
  },
  textCible: {
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
