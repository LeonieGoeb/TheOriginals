import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Token } from '@/data/types';
import { COLORS } from '@/constants/colors';

interface TokenTexteProps {
  tokens: Token[];
  analyseActive: boolean;
  style?: TextStyle;
}

function getTokenStyle(token: Token, analyseActive: boolean): TextStyle {
  if (!analyseActive || token.type === null) {
    return {};
  }
  switch (token.type) {
    case 's':
      return {
        backgroundColor: COLORS.subjectBg,
        color: COLORS.subjectText,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.subjectBorder,
      };
    case 'v':
      return {
        backgroundColor: COLORS.verbBg,
        color: COLORS.verbText,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.verbBorder,
      };
    case 'c':
      return {
        backgroundColor: COLORS.complBg,
        color: COLORS.complText,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.complBorder,
      };
  }
}

function TokenTexte({ tokens, analyseActive, style }: TokenTexteProps) {
  return (
    <Text style={style}>
      {tokens.map((token, i) => (
        <Text key={i} style={getTokenStyle(token, analyseActive)}>
          {token.text}
        </Text>
      ))}
    </Text>
  );
}

export default React.memo(TokenTexte);
