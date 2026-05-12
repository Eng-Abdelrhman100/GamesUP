import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, Search, User, Package, Clock, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { orderChatsAPI, ordersAPI } from '../../utils/api';

interface OrderChat {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface ChatGroup {
  order_id: string;
  order_number?: string;
  customer_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: OrderChat[];
}

export function SupportChats() {
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const adminUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatGroups, selectedGroupId]);

  const loadChats = async () => {
    try {
      const [messagesData, ordersRes] = await Promise.all([
        orderChatsAPI.getAll(),
        ordersAPI.getAll()
      ]);

      const ordersData = ordersRes?.orders || [];
      const ordersMap = new Map();
      ordersData.forEach((o: any) => ordersMap.set(o.id.toString(), o));

      const groups = new Map<string, ChatGroup>();

      (messagesData || []).forEach((msg: any) => {
        const oId = msg.order_id;
        if (!groups.has(oId)) {
          const orderInfo = ordersMap.get(oId) || {};
          groups.set(oId, {
            order_id: oId,
            order_number: orderInfo.order_number || `Unknown (${oId})`,
            customer_name: msg.sender_name || orderInfo.customer_name || 'Customer',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            messages: []
          });
        }
        
        const group = groups.get(oId)!;
        group.messages.push(msg);
        group.last_message = msg.content;
        group.last_message_time = msg.created_at;
        
        // Assuming if not admin, it might be unread by admin
        if (!msg.is_admin) {
          group.unread_count += 1; // Simplified logic
        } else {
          group.unread_count = 0; // Reset if admin replied
        }
      });

      const sortedGroups = Array.from(groups.values()).sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setChatGroups(sortedGroups);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroupId) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      await orderChatsAPI.sendMessage(selectedGroupId, content);
      loadChats();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // restore on error
    } finally {
      setSending(false);
    }
  };

  const selectedGroup = chatGroups.find(g => g.order_id === selectedGroupId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Chats</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage customer queries related to specific orders</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex">
        
        {/* Sidebar List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search order or customer..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : chatGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No active support chats</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {chatGroups.map(group => (
                  <button
                    key={group.order_id}
                    onClick={() => setSelectedGroupId(group.order_id)}
                    className={`w-full text-left p-4 hover:bg-white dark:hover:bg-gray-700 transition-colors flex flex-col gap-2 ${
                      selectedGroupId === group.order_id ? 'bg-white dark:bg-gray-700 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        Order #{group.order_number}
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        {new Date(group.last_message_time).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-4">
                        {group.customer_name}: {group.last_message}
                      </p>
                      {group.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {group.unread_count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{selectedGroup.customer_name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Order #{selectedGroup.order_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/50">
                {selectedGroup.messages.map((msg, idx) => {
                  const isAdmin = msg.is_admin;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col max-w-[70%] ${isAdmin ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {isAdmin ? msg.sender_name : selectedGroup.customer_name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div 
                        className={`p-3.5 rounded-2xl text-sm shadow-sm ${
                          isAdmin 
                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-gray-100 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-xl px-4 py-3 text-sm transition-all outline-none dark:text-white"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a chat to start responding</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
