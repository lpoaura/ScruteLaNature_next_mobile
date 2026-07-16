import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface GameQuestionProps {
  question?: string;
}

export function GameQuestion({ question }: GameQuestionProps) {
  if (!question) return null;

  return (
    <Markdown style={markdownStyles}>
      {question}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0087CC',
    marginBottom: 12,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0,
  }
} as any);
