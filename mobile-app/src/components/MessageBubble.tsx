import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  message: string;
  sender: 'user' | 'ai' | 'system';
  type?: 'text' | 'alert';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, sender, type = 'text' }) => {
  return (
    <View style={[styles.bubble, sender === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#1f2937',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
  },
});

export default MessageBubble;