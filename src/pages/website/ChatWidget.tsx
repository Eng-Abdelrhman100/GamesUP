import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { chatAPI, uploadAPI } from '../../utils/api';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  is_read: boolean;
}

interface ChatWidgetProps {
  user: any;
}

export function ChatWidget({ user }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We assume admin/support has a specific ID or we just send to a generic 'support' queue
  const SUPPORT_ID = 'support-team'; 

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await chatAPI.getMessages();
      setMessages(data || []);
      
      // Mark unread messages as read
      const unreadIds = (data || []).filter((m: any) => m.receiver_id === String(user.id) && !m.is_read).map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await chatAPI.markRead(unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !isUploading) return;
    if (!user) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      await chatAPI.sendMessage(messageContent);
      
      // Optimistically add to UI (or rely on a realtime subscription for own messages too)
      fetchMessages(); 
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // revert
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const { url } = await uploadAPI.uploadChatImage(file);

      // Send message with image
      await chatAPI.sendMessage('Sent an image', url);
      
      fetchMessages();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`${isOpen ? 'hidden' : 'flex'} w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 border-[3px] border-white`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 md:right-8 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[999999] border border-gray-200 pointer-events-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">GamesUp Support</h3>
                  <p className="text-[11px] text-blue-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Typically replies in minutes
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
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
                  <p className="text-sm">Send us a message and we'll get back to you as soon as possible.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div 
                        className={`p-3 rounded-2xl text-sm ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.image_url && (
                          <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.image_url} alt="attachment" className="max-w-full h-auto rounded-xl mb-2 object-cover" style={{ maxHeight: '150px' }} />
                          </a>
                        )}
                        <p>{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2.5 text-sm transition-all outline-none"
                />
                
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !isUploading) || isLoading}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
