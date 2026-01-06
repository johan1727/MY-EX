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
  Modal,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Send, ArrowLeft, X, HelpCircle, Sparkles, LogOut } from 'lucide-react-native';

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

  // Custom Alert State
  interface AlertConfig {
    visible: boolean;
    title: string;
    message: string;
    buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' | 'confirm' }[];
    type?: 'success' | 'error' | 'info' | 'warning';
  }
  const [customAlert, setCustomAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, buttons?: AlertConfig['buttons'], type: AlertConfig['type'] = 'info') => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons,
      type
    });
  };

  const closeAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

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
      showAlert('Error', 'No se pudo cargar el historial', [{ text: 'OK' }], 'error');
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
      showAlert('Error', 'No se pudo enviar el mensaje. Verifica tu conexión.', [{ text: 'OK' }], 'error');
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

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={customAlert.visible}
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconContainer,
              customAlert.type === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                customAlert.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                  customAlert.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                    { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
            ]}>
              {customAlert.type === 'error' && <X size={32} color="#ef4444" />}
              {customAlert.type === 'warning' && <LogOut size={32} color="#f59e0b" />}
              {customAlert.type === 'success' && <Sparkles size={32} color="#22c55e" />}
              {customAlert.type === 'info' && <HelpCircle size={32} color="#3b82f6" />}
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>
              {customAlert.message}
            </Text>
            <View style={styles.alertButtons}>
              {!customAlert.buttons || customAlert.buttons.length === 0 ? (
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertButtonPrimary]}
                  onPress={closeAlert}
                >
                  <Text style={styles.alertButtonText}>OK</Text>
                </TouchableOpacity>
              ) : (
                customAlert.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.alertButton,
                      btn.style === 'cancel' ? styles.alertButtonCancel :
                        btn.style === 'destructive' ? styles.alertButtonDestructive :
                          styles.alertButtonPrimary
                    ]}
                    onPress={btn.onPress || closeAlert}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      btn.style === 'destructive' && { color: '#ef4444' }
                    ]}>{btn.text}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  alertButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  alertButtonCancel: {
    backgroundColor: '#333',
  },
  alertButtonDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});