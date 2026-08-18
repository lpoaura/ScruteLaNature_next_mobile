import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface GameQuestionProps {
  question?: string;
}

export function GameQuestion({ question }: GameQuestionProps) {
  if (!question) return null;

  // On échappe les tirets en début de ligne pour éviter la transformation en liste à puces
  const processedQuestion = question.replace(/^(\s*)-\s/gm, '$1\\- ');

  return (
    <Markdown style={markdownStyles}>
      {processedQuestion}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 20,
    color: '#000000',
    marginBottom: 12,
  },
});
