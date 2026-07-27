import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface GameQuestionProps {
  question?: string;
}

export function GameQuestion({ question }: GameQuestionProps) {
  if (!question) return null;

  return (
    <Text style={styles.questionText}>
      {question}
    </Text>
  );
}

const styles = StyleSheet.create({
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0087CC',
    marginBottom: 12,
  },
});
