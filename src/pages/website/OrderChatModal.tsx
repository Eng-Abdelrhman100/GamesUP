import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { orderChatsAPI } from '../../utils/api';

interface Order {
  id: string;
  orderNumber: string;
  [key: string]: any;
}

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface OrderChatModalProps {
  order: Order;
  onClose: () => void;
}

export function OrderChatModal({ order, onClose }: OrderChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userSession = JSON.parse(localStorage.getItem('customerSession') || '{}');
  const user = userSession.user;

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [order.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const data = await orderChatsAPI.getByOrderId(order.id);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await orderChatsAPI.sendMessage(order.id, messageContent);
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Order #{order.orderNumber}</h3>
              <p className="text-[11px] text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Support Chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-3 px-4">
              <MessageCircle className="w-12 h-12 text-gray-300" />
              <p className="text-sm">Need help with order #{order.orderNumber}? Send us a message!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = !msg.is_admin;
              return (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div 
                    className={`p-3 rounded-2xl text-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {msg.is_admin ? 'Admin' : 'You'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2.5 text-sm transition-all outline-none"
            />
            
            <button 
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
