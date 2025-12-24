import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const useChat = (userId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [userId]);

  const sendMessage = async (message) => {
    try {
      const { error } = await supabase.from('chat_logs').insert([
        {
          user_id: userId,
          message,
          sender: 'user',
        },
      ]);

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { user_id: userId, message, sender: 'user' },
      ]);
    } catch (err) {
      setError(err.message);
    }
  };

  return { messages, loading, error, sendMessage };
};

export default useChat;