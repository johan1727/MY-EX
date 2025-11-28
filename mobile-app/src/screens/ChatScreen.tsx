import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabaseClient'; // Archivo de configuración
import { Send, ArrowLeft } from 'lucide-react-native';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  type: 'text' | 'alert';
  created_at: string;
}

export default function ChatScreen({ navigation, route }) {
  const { userId } = route.params; // ID del usuario logueado
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages = data.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender,
        type: msg.flagged_for_safety ? 'alert' : 'text',
        created_at: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = inputText.trim();
    const tempId = Date.now().toString();

    const newUserMsg: Message = {
      id: tempId,
      text: userMessage,
      sender: 'user',
      type: 'text',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-coach', {
        body: {
          message: userMessage,
          userId: userId,
        },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'ai',
        type: 'text',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Verifica tu conexión.');
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={{
        flexDirection: item.sender === 'user' ? 'row-reverse' : 'row',
        marginVertical: 8,
        marginHorizontal: 16,
      }}
    >
      <View
        style={{
          maxWidth: '85%',
          padding: 14,
          borderRadius: 16,
          backgroundColor: item.sender === 'user' ? '#4f46e5' : '#1f2937',
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 15 }}>{item.text}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#030712' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#111827' }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 16, marginLeft: 12 }}>My Ex Coach</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      <View style={{ flexDirection: 'row', padding: 12, backgroundColor: '#111827' }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            marginRight: 8,
          }}
          placeholder="Escribe mensaje..."
          placeholderTextColor="#6b7280"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          multiline
        />
        <TouchableOpacity onPress={handleSendMessage} disabled={!inputText.trim() || isTyping}>
          <Send size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}