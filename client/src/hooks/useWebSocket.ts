import { useState, useEffect, useCallback, useRef } from 'react';
import { connectWebSocket, getSocketInstance, sendMessage } from '@/lib/websocket';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const socket = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (user) {
      socket.current = connectWebSocket(document.cookie);
      
      socket.current.onopen = () => {
        setIsConnected(true);
      };
      
      socket.current.onclose = () => {
        setIsConnected(false);
      };
      
      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
    
    return () => {
      if (socket.current) {
        socket.current.onmessage = null;
        socket.current.onopen = null;
        socket.current.onclose = null;
        socket.current.onerror = null;
      }
    };
  }, [user]);

  // Send message via WebSocket
  const send = useCallback((data: any) => {
    return sendMessage(data);
  }, []);

  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    messages,
    send,
    clearMessages
  };
}
