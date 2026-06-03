import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { Search, Plus, Edit2, Trash2, Package, Image as ImageIcon, Database, Shield, Download, Layout, Mail, Lock, MapPin, User, Calendar, Hash, Key, AlertTriangle, ChevronDown } from 'lucide-react';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { productsAPI, categoriesAPI, api, uploadAPI, normalizeImageSrc } from '@/utils/api';

const PLACEHOLDER_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';


interface Product {
  id: string | number;
  name: string;
  category_slug: string;
  sub_category_slug: string;
  price: number;
  cost?: number;
  stock: number;
  status: string;
  image: string;
  instructions?: string;
  attributes?: Record<string, any>;
  digitalItems?: DigitalItem[];
  purchasedEmail?: string;
  purchasedPassword?: string;
  productCode?: string;
  sendEmailEnabled?: boolean;
  emailTemplate?: string;
  isRulesTemplate?: boolean;
  fullAccountPrice?: number;
  fullAccountCost?: number;
}

interface DigitalItem {
  id?: string;
  email?: string;
  password?: string;
  code?: string;
  outlookEmail?: string;
  outlookPassword?: string;
  birthdate?: string;
  region?: string;
  onlineId?: string;
  backupCodes?: string;
  slots?: Record<string, { sold: boolean; orderId: string | null; code?: string; price?: number; cost?: number; customerName?: string }>;
  totalCodes?: number;
}

function countAvailableSlots(digitalItems: any[], categorySlug?: string, subCategorySlug?: string) {
  if (!Array.isArray(digitalItems)) return 0;
  let count = 0;
  const now = new Date().getTime();
  const limitDays = String(subCategorySlug || '').toLowerCase().includes('1-month') ? 5 : 10;
  for (const item of digitalItems) {
    if (!item || !item.slots) continue;
    let isExpired = false;
    if (categorySlug === 'playstation-plus' && item.createdAt) {
      const createdDate = new Date(item.createdAt).getTime();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= limitDays) {
        isExpired = true;
      }
    }
    for (const slot of Object.values(item.slots)) {
      const code = (slot as any)?.code ? String((slot as any).code).trim() : '';
      if (code && !(slot as any)?.sold && !isExpired) count += 1;
    }
  }
  return count;
}

function countAvailableForSlot(digitalItems: any[], slotName: string, categorySlug?: string, subCategorySlug?: string) {
  if (!Array.isArray(digitalItems) || !slotName) return 0;
  let count = 0;
  const now = new Date().getTime();
  const limitDays = String(subCategorySlug || '').toLowerCase().includes('1-month') ? 5 : 10;
  for (const item of digitalItems) {
    const slot = item?.slots?.[slotName];
    if (!slot) continue;
    let isExpired = false;
    if (categorySlug === 'playstation-plus' && item.createdAt) {
      const createdDate = new Date(item.createdAt).getTime();
      const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= limitDays) {
        isExpired = true;
      }
    }
    const code = slot?.code ? String(slot.code).trim() : '';
    if (code && !slot.sold && !isExpired) count += 1;
  }
  return count;
}

function countAvailableFullAccounts(digitalItems: any[], slotNames?: string[]) {
  if (!Array.isArray(digitalItems)) return 0;
  let count = 0;
  for (const item of digitalItems) {
    if (item.fullAccountSold) continue;
    const slots = item.slots || {};
    const anySlotSold = Object.values(slots).some((s: any) => !!s?.sold);
    if (!anySlotSold) count += 1;
  }
  return count;
}

function checkDuplicateEmailOrCode(itemsToCheck: any[]) {
  const emails = new Set();
  const codes = new Set();

  for (const item of itemsToCheck) {
    const itemEmails = new Set();
    if (item.email) {
      const emailClean = item.email.trim().toLowerCase();
      if (emailClean) {
        if (emails.has(emailClean)) {
          return `Duplicate email "${item.email}" found in the stock list.`;
        }
        itemEmails.add(emailClean);
      }
    }
    if (item.outlookEmail) {
      const outlookClean = item.outlookEmail.trim().toLowerCase();
      if (outlookClean) {
        if (emails.has(outlookClean) && !itemEmails.has(outlookClean)) {
          return `Duplicate email "${item.outlookEmail}" found in the stock list.`;
        }
        itemEmails.add(outlookClean);
      }
    }
    itemEmails.forEach(e => emails.add(e));

    const itemCodes = new Set();
    if (item.code) {
      const codeClean = item.code.trim().toLowerCase();
      if (codeClean) {
        if (codes.has(codeClean)) {
          return `Duplicate code "${item.code}" found in the stock list.`;
        }
        itemCodes.add(codeClean);
      }
    }
    if (item.slots) {
      for (const slotName of Object.keys(item.slots)) {
        const slotCode = item.slots[slotName]?.code ? String(item.slots[slotName].code).trim().toLowerCase() : '';
        if (slotCode) {
          if (codes.has(slotCode) && !itemCodes.has(slotCode)) {
            return `Duplicate code "${item.slots[slotName].code}" found in the stock list.`;
          }
          itemCodes.add(slotCode);
        }
      }
    }
    itemCodes.forEach(c => codes.add(c));
  }
  return null;
}

const GroupEditor = ({ groupName, slotsInGroup, customSlots, setCustomSlots, settings, formData, onAddStockItem, groupItems, onRemoveItem, onUpdateItem, onUpdateItemSlot, isAdmin }: any) => {
  const isOffline = groupName.toLowerCase().includes('offline');
  const [localGroupName, setLocalGroupName] = React.useState(groupName === 'General' ? '' : groupName);
  const [newItem, setNewItem] = React.useState({ 
    email: '', password: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: ''
  });
  const [slotCodes, setSlotCodes] = React.useState<Record<string, string>>({});

  const isPsnEmailDup = React.useMemo(() => {
    if (!newItem.email) return false;
    const clean = newItem.email.trim().toLowerCase();
    return (formData.digitalItems || []).some((item: any) => {
      const email = (item.email || '').trim().toLowerCase();
      const outlook = (item.outlookEmail || '').trim().toLowerCase();
      return email === clean || outlook === clean;
    });
  }, [newItem.email, formData.digitalItems]);

  const isOutlookEmailDup = React.useMemo(() => {
    if (!newItem.outlookEmail) return false;
    const clean = newItem.outlookEmail.trim().toLowerCase();
    return (formData.digitalItems || []).some((item: any) => {
      const email = (item.email || '').trim().toLowerCase();
      const outlook = (item.outlookEmail || '').trim().toLowerCase();
      return email === clean || outlook === clean;
    });
  }, [newItem.outlookEmail, formData.digitalItems]);

  const isPsnSameAsOutlook = React.useMemo(() => {
    const psn = newItem.email.trim().toLowerCase();
    const outlook = newItem.outlookEmail.trim().toLowerCase();
    return !!(psn && outlook && psn === outlook);
  }, [newItem.email, newItem.outlookEmail]);

  const isAnySlotCodeDup = React.useMemo(() => {
    return Object.values(slotCodes).some((val) => {
      const clean = String(val || '').trim().toLowerCase();
      if (!clean) return false;
      return (formData.digitalItems || []).some((item: any) => {
        if (item.code && item.code.trim().toLowerCase() === clean) return true;
        if (item.slots) {
          return Object.values(item.slots).some((s: any) => s?.code && String(s.code).trim().toLowerCase() === clean);
        }
        return false;
      });
    });
  }, [slotCodes, formData.digitalItems]);

  React.useEffect(() => {
    setSlotCodes((prev) => {
      const next: Record<string, string> = { ...prev };
      const names = (slotsInGroup || []).map((s: any) => String(s?.name || '')).filter(Boolean);
      for (const n of names) {
        if (next[n] === undefined) next[n] = '';
      }
      for (const key of Object.keys(next)) {
        if (!names.includes(key)) delete next[key];
      }
      return next;
    });
  }, [slotsInGroup]);

  const handleGroupNameBlur = () => {
    if (localGroupName === (groupName === 'General' ? '' : groupName)) return;

    const newGroup = localGroupName.trim();
    const newSlots = customSlots.map((s: any) => {
      const parts = s.name.split(' - ');
      const g = parts.length > 1 ? parts[0] : 'General';
      if (g === groupName) {
        const subName = parts.length > 1 ? parts.slice(1).join(' - ') : s.name;
        return { ...s, name: newGroup ? `${newGroup} - ${subName}` : subName };
      }
      return s;
    });
    setCustomSlots(newSlots);
  };

  const submitStock = () => {
    if (isPsnEmailDup || isOutlookEmailDup || isAnySlotCodeDup) {
      alert("Please resolve any duplicate emails or slot codes before adding.");
      return;
    }
    onAddStockItem(groupName, { ...newItem, slotCodes });
    setNewItem({ email: '', password: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '' });
    setSlotCodes((prev) => {
      const cleared: Record<string, string> = {};
      for (const k of Object.keys(prev)) cleared[k] = '';
      return cleared;
    });
  };

  return (
    <div className={`rounded-[2rem] border-2 ${isOffline ? 'bg-gray-800 border-gray-700 shadow-2xl' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'} overflow-hidden mb-8 transition-all`}>
      <div className={`${isOffline ? 'bg-gray-900 text-white' : 'bg-gray-50 dark:bg-gray-900'} px-6 py-5 flex justify-between items-center border-b ${isOffline ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center flex-1">
          {isOffline && <span className="mr-3 p-2 bg-gray-800 rounded-xl shadow-inner"><Database className="w-4 h-4 text-white" /></span>}
          <span className={`${isOffline ? 'text-gray-400' : 'text-gray-400'} mr-2 text-[10px] font-bold uppercase tracking-widest`}>Group:</span>
          <input
            type="text"
            value={localGroupName}
            placeholder="e.g. PS4 (Leave empty for General)"
            onChange={(e) => setLocalGroupName(e.target.value)}
            onBlur={handleGroupNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleGroupNameBlur()}
            className={`font-black text-lg bg-transparent border-none focus:ring-0 ${isOffline ? 'text-white placeholder-gray-600' : 'text-gray-800 dark:text-white placeholder-gray-400'} w-1/2 p-0 focus:outline-none ml-2`}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const prefix = groupName !== 'General' ? `${groupName} - ` : '';
            setCustomSlots([...customSlots, { id: crypto.randomUUID(), name: `${prefix}New Slot`, price: '', cost: '' }]);
          }}
          className={`text-xs font-black flex items-center px-6 py-2.5 rounded-full transition-all shadow-lg active:scale-95 ${isOffline ? 'bg-white text-gray-900 hover:bg-gray-100' : 'text-white bg-red-600 hover:bg-red-700'}`}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Sub-Attribute
        </button>
      </div>

      <div className={`p-6 space-y-4 ${isOffline ? 'bg-gray-800' : ''}`}>
        {slotsInGroup.map((slot: any) => {
          const parts = slot.name.split(' - ');
          const subName = parts.length > 1 ? parts.slice(1).join(' - ') : slot.name;
          const index = customSlots.findIndex((s: any) => s.id === slot.id);

          return (
            <div key={slot.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative group pb-4 border-b border-gray-100 dark:border-gray-700/50 last:border-0 last:pb-0">
              <div className="col-span-12 md:col-span-4">
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`}>Sub-Attribute Name</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => {
                    const newSlots = [...customSlots];
                    const newSub = e.target.value;
                    newSlots[index].name = groupName !== 'General' ? `${groupName} - ${newSub}` : newSub;
                    setCustomSlots(newSlots);
                  }}
                  className={`w-full px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all ${isOffline ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 dark:text-gray-300'}`}
                />
              </div>
              <div className={`col-span-6 md:col-span-${isAdmin ? '3' : '6'}`}>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`}>Price ({settings.currency_symbol})</label>
                <input
                  type="number" step="0.01" value={slot.price}
                  onChange={(e) => { const n = [...customSlots]; n[index].price = e.target.value; setCustomSlots(n); }}
                  className={`w-full px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all ${isOffline ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 dark:text-gray-300'}`}
                  placeholder={formData.price || "0.00"}
                />
              </div>
              {isAdmin && (
              <div className="col-span-6 md:col-span-3">
                <label className={`block text-[10px] font-bold uppercase mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`}>Cost ({settings.currency_symbol})</label>
                <input
                  type="number" step="0.01" value={slot.cost}
                  onChange={(e) => { const n = [...customSlots]; n[index].cost = e.target.value; setCustomSlots(n); }}
                  className={`w-full px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all ${isOffline ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-700 dark:text-gray-300'}`}
                  placeholder={formData.cost || "0.00"}
                />
              </div>
              )}
              <div className="col-span-12 md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCustomSlots(customSlots.filter((s: any) => s.id !== slot.id))}
                  className={`p-2.5 rounded-full transition-all active:scale-90 ${isOffline ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${isOffline ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'} p-8 border-t`}>
        <div className="flex items-center justify-between mb-8">
          <h4 className={`text-base font-black flex items-center ${isOffline ? 'text-white' : 'text-gray-900 dark:text-gray-200'}`}>
            <span className={`w-3.5 h-3.5 ${isOffline ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-sm'} rounded-full mr-3.5`}></span>
            Add Account & Codes to <span className="ml-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-xs tracking-tighter uppercase">{groupName || 'General'}</span>
          </h4>
          {isOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <Shield className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Internal Stock Only</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className={`space-y-5 p-6 rounded-3xl border transition-all ${isOffline ? 'bg-gray-800/50 backdrop-blur-md border-gray-700 shadow-inner' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${isOffline ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <User className="w-4 h-4" />
              </div>
              <h5 className={`text-xs font-black uppercase tracking-widest ${isOffline ? 'text-white' : 'text-gray-900'}`}>PSN Identity</h5>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-400'}`}>
                  PSN Email {isPsnEmailDup && <span className="text-red-500 font-extrabold ml-1.5 animate-pulse text-[10px]">⚠️ Already added!</span>}
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input 
                    type="email" value={newItem.email} onChange={e => setNewItem({...newItem, email: e.target.value})} 
                    className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                      isPsnEmailDup
                        ? 'border-red-500 bg-red-500/10 text-red-955 dark:text-red-200 placeholder-red-400'
                        : isOffline 
                            ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="example@psn.com"
                  />
                </div>
              </div>

              <div className="relative">
                <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-400'}`}>PSN Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input 
                    type="text" value={newItem.password} onChange={e => setNewItem({...newItem, password: e.target.value})} 
                    className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
                    placeholder="PSN Secret Key"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-400'}`}>Region</label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input type="text" value={newItem.region} onChange={e => setNewItem({...newItem, region: e.target.value})} className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`} placeholder="US/UK" />
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-400'}`}>Online ID</label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input type="text" value={newItem.onlineId} onChange={e => setNewItem({...newItem, onlineId: e.target.value})} className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`} placeholder="PSN_Nick" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`space-y-5 p-6 rounded-3xl border transition-all ${isOffline ? 'bg-gray-800/50 backdrop-blur-md border-gray-700 shadow-inner' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-xl ${isOffline ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <Key className="w-4 h-4" />
              </div>
              <h5 className={`text-xs font-black uppercase tracking-widest ${isOffline ? 'text-white' : 'text-gray-900'}`}>Recovery Setup</h5>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-400'}`}>
                  Outlook Email {isOutlookEmailDup && <span className="text-red-500 font-extrabold ml-1.5 animate-pulse text-[10px]">⚠️ Already added!</span>}
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input 
                    type="email" value={newItem.outlookEmail} onChange={e => setNewItem({...newItem, outlookEmail: e.target.value})} 
                    className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                      isOutlookEmailDup
                        ? 'border-red-500 bg-red-500/10 text-red-955 dark:text-red-200 placeholder-red-400'
                        : isOffline 
                            ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="recovery@outlook.com"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`}>Outlook Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input type="text" value={newItem.outlookPassword} onChange={e => setNewItem({...newItem, outlookPassword: e.target.value})} className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`} placeholder="Mail Secret" />
                </div>
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 ml-1 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`}>Birthdate</label>
                <div className="relative">
                  <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isOffline ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input type="text" placeholder="YYYY-MM-DD" value={newItem.birthdate} onChange={e => setNewItem({...newItem, birthdate: e.target.value})} className={`w-full pl-10 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`mb-8 p-6 rounded-3xl border transition-all ${isOffline ? 'bg-gray-800/50 backdrop-blur-md border-gray-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${isOffline ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
              <Hash className="w-4 h-4" />
            </div>
            <label className={`text-xs font-black uppercase tracking-widest ${isOffline ? 'text-white' : 'text-gray-900'}`}>Attribute Codes</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(slotsInGroup || []).map((slot: any) => {
              const parts = String(slot.name || '').split(' - ');
              const subName = parts.length > 1 ? parts.slice(1).join(' - ') : String(slot.name || '');
              const currentVal = slotCodes[String(slot.name || '')] || '';
              const isSlotCodeDup = currentVal.trim() && (formData.digitalItems || []).some((item: any) => {
                if (item.code && item.code.trim().toLowerCase() === currentVal.trim().toLowerCase()) return true;
                if (item.slots) {
                  return Object.values(item.slots).some((s: any) => s?.code && String(s.code).trim().toLowerCase() === currentVal.trim().toLowerCase());
                }
                return false;
              });
              return (
                <div key={slot.id || slot.name} className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase tracking-widest ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`}>
                    {subName} {isSlotCodeDup && <span className="text-red-500 font-extrabold ml-1.5 animate-pulse text-[9px]">⚠️ Already added!</span>}
                  </label>
                  <input
                    type="text"
                    value={slotCodes[String(slot.name || '')] || ''}
                    onChange={(e) => setSlotCodes((prev) => ({ ...prev, [String(slot.name || '')]: e.target.value }))}
                    className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono break-all transition-all ${
                      isSlotCodeDup
                        ? 'border-red-500 bg-red-500/10 text-red-955 dark:text-red-200 placeholder-red-400'
                        : isOffline 
                          ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="CODE-XXXX"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${isOffline ? 'text-gray-400' : 'text-gray-500'}`}>Backup Codes (one per line)</label>
            <textarea
              value={newItem.backupCodes}
              onChange={(e) => setNewItem({ ...newItem, backupCodes: e.target.value })}
              rows={3}
              className={`w-full px-5 py-4 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono break-all transition-all ${isOffline ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              placeholder={'REC-001\nREC-002'}
            />
          </div>
        </div>

        <button 
          type="button" onClick={submitStock} 
          disabled={
            isPsnEmailDup ||
            isOutlookEmailDup ||
            isAnySlotCodeDup ||
            (!newItem.email &&
             !newItem.password &&
             !Object.values(slotCodes || {}).some((v) => String(v || '').trim()) &&
             !String(newItem.backupCodes || '').trim())
          } 
          className={`w-full text-base py-4.5 ${isOffline ? 'bg-white text-gray-900 hover:bg-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'bg-red-600 hover:bg-red-700 text-white'} rounded-full font-black shadow-2xl disabled:opacity-50 transition-all flex items-center justify-center active:scale-[0.97] hover:-translate-y-0.5 group`}
        >
           <Plus className={`w-5 h-5 mr-2.5 transition-transform group-hover:rotate-90 ${isOffline ? 'text-red-600' : 'text-white'}`} /> 
           Add Final Stock to {groupName || 'General'}
        </button>

        {groupItems && groupItems.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-200/60 dark:border-gray-700/60">
            <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Added Stock for this Group ({groupItems.length})</h5>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs text-left bg-white dark:bg-gray-900">
                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Credentials</th>
                    <th className="px-3.5 py-2.5 font-bold text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recovery & Region</th>
                    {slotsInGroup.map((slot: any) => {
                      const parts = slot.name.split(' - ');
                      const subLabel = parts.length > 1 ? parts.slice(1).join(' - ') : slot.name;
                      return (
                        <th key={slot.id || slot.name} className="px-3.5 py-2.5 font-bold text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {subLabel}
                        </th>
                      );
                    })}
                    <th className="px-3.5 py-2.5 font-bold text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Backup Codes</th>
                    <th className="px-3.5 py-2.5 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {groupItems.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-3.5 py-3 align-top min-w-[150px]">
                        <input
                          type="text"
                          value={item.email || ''}
                          onChange={(e) => onUpdateItem(item.id, { email: e.target.value })}
                          className={`w-full bg-transparent border-b text-xs py-0.5 focus:border-red-500 focus:outline-none ${isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'}`}
                          placeholder="PSN Email"
                        />
                        <input
                          type="text"
                          value={item.password || ''}
                          onChange={(e) => onUpdateItem(item.id, { password: e.target.value })}
                          className={`w-full bg-transparent border-b text-[10px] py-0.5 focus:border-red-500 focus:outline-none mt-1.5 font-mono ${isOffline ? 'border-gray-700 text-gray-400' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
                          placeholder="Password"
                        />
                        <input
                          type="text"
                          value={item.onlineId || ''}
                          onChange={(e) => onUpdateItem(item.id, { onlineId: e.target.value })}
                          className={`w-full bg-transparent border-b text-[9px] py-0.5 focus:border-red-500 focus:outline-none mt-1.5 ${isOffline ? 'border-gray-700 text-gray-400' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
                          placeholder="Online ID"
                        />
                        {item.createdAt && (
                          <p className="text-[9px] text-gray-400 mt-1.5 italic">
                            Added: {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      
                      <td className="px-3.5 py-3 align-top text-[10px] space-y-1.5 min-w-[150px]">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Reg:</span>
                          <input
                            type="text"
                            value={item.region || ''}
                            onChange={(e) => onUpdateItem(item.id, { region: e.target.value })}
                            className={`flex-1 bg-transparent border-b text-[10px] py-0 focus:border-red-500 focus:outline-none ${isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                            placeholder="US"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Mail:</span>
                          <input
                            type="text"
                            value={item.outlookEmail || ''}
                            onChange={(e) => onUpdateItem(item.id, { outlookEmail: e.target.value })}
                            className={`flex-1 bg-transparent border-b text-[10px] py-0 focus:border-red-500 focus:outline-none font-mono ${isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                            placeholder="recovery@outlook.com"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Pass:</span>
                          <input
                            type="text"
                            value={item.outlookPassword || ''}
                            onChange={(e) => onUpdateItem(item.id, { outlookPassword: e.target.value })}
                            className={`flex-1 bg-transparent border-b text-[10px] py-0 focus:border-red-500 focus:outline-none font-mono ${isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                            placeholder="Outlook Pass"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase w-10">Birth:</span>
                          <input
                            type="text"
                            value={item.birthdate || ''}
                            onChange={(e) => onUpdateItem(item.id, { birthdate: e.target.value })}
                            className={`flex-1 bg-transparent border-b text-[10px] py-0 focus:border-red-500 focus:outline-none ${isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                      </td>
                      
                      {(() => {
                        const now = new Date().getTime();
                        const categorySlug = formData?.category || '';
                        const subCategorySlug = String(formData?.subCategory || '').toLowerCase();
                        const limitDays = subCategorySlug.includes('1-month') ? 5 : 10;
                        let isItemExpired = false;
                        if (categorySlug === 'playstation-plus' && item.createdAt) {
                          const createdDate = new Date(item.createdAt).getTime();
                          const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
                          if (diffDays >= limitDays) isItemExpired = true;
                        }
                        return slotsInGroup.map((slot: any) => {
                          const slotData = item.slots?.[slot.name] || { code: '', sold: false };
                          const code = slotData.code || '';
                          const isSold = !!slotData.sold;
                          const isExpiredUnsold = isItemExpired && !isSold;
                          return (
                            <td key={slot.id || slot.name} className={`px-3.5 py-3 align-top min-w-[120px] ${isExpiredUnsold ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                              <input
                                type="text"
                                value={code}
                                onChange={(e) => onUpdateItemSlot(item.id, slot.name, { code: e.target.value })}
                                className={`w-full bg-transparent border-b text-xs py-0.5 focus:border-red-500 focus:outline-none font-mono ${
                                  isExpiredUnsold
                                    ? 'border-red-300 text-red-400 opacity-60 line-through'
                                    : isOffline ? 'border-gray-700 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white'
                                }`}
                                placeholder="CODE-XXXX"
                              />
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {isExpiredUnsold && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">
                                    ⏰ Expired
                                  </span>
                                )}
                                {isSold && !isExpiredUnsold && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                    ✓ Sold
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={isSold}
                                    onChange={(e) => onUpdateItemSlot(item.id, slot.name, { sold: e.target.checked })}
                                    className="w-3.5 h-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded dark:bg-gray-800"
                                  />
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sold</span>
                                </div>
                              </div>
                            </td>
                          );
                        });
                      })()}
                      
                      <td className="px-3.5 py-3 align-top min-w-[140px]">
                        <textarea
                          value={item.backupCodes || ''}
                          onChange={(e) => onUpdateItem(item.id, { backupCodes: e.target.value })}
                          rows={3}
                          className={`w-full bg-transparent border text-[10px] p-1.5 focus:border-red-500 focus:outline-none font-mono rounded-lg ${isOffline ? 'border-gray-700 text-white bg-gray-900/40' : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white bg-white dark:bg-gray-800/40'}`}
                          placeholder="Codes (one per line)"
                        />
                      </td>
                      
                      <td className="px-3.5 py-3 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const VariantGenerator = ({ customSlots, setCustomSlots }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [attributes, setAttributes] = useState([{ name: '', options: '' }]);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', options: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    // Filter out empty attributes
    const validAttributes = attributes.filter(a => a.name.trim() && a.options.trim());
    if (validAttributes.length === 0) return;

    // Generate combinations
    const optionsList = validAttributes.map(a => 
      a.options.split(',').map(opt => opt.trim()).filter(Boolean)
    );

    const generateCombinations = (lists: string[][], n: number, result: string[], current: string) => {
      if (n === lists.length) {
        result.push(current);
        return;
      }
      for (let i = 0; i < lists[n].length; i++) {
        generateCombinations(lists, n + 1, result, current ? `${current} - ${lists[n][i]}` : lists[n][i]);
      }
    };

    const combinations: string[] = [];
    generateCombinations(optionsList, 0, combinations, '');

    const newSlots = combinations.map(combo => ({
      id: crypto.randomUUID(),
      name: combo,
      price: '',
      cost: ''
    }));

    // Optionally append to existing slots or replace? Usually replace or append. Let's append but warn if duplicate
    setCustomSlots([...customSlots, ...newSlots]);
    setIsOpen(false);
    setAttributes([{ name: '', options: '' }]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors mb-3"
      >
        <Plus className="w-4 h-4 mr-1" /> Generate Variants (Like Shopify)
      </button>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
      <h5 className="text-sm font-semibold mb-3">Generate Variants</h5>
      {attributes.map((attr, index) => (
        <div key={index} className="flex gap-3 mb-3 items-start">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Attribute Name (e.g. Console)"
              value={attr.name}
              onChange={(e) => {
                const newAttrs = [...attributes];
                newAttrs[index].name = e.target.value;
                setAttributes(newAttrs);
              }}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex-[2]">
            <input
              type="text"
              placeholder="Options separated by comma (e.g. PS4, PS5)"
              value={attr.options}
              onChange={(e) => {
                const newAttrs = [...attributes];
                newAttrs[index].options = e.target.value;
                setAttributes(newAttrs);
              }}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemoveAttribute(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleAddAttribute}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Add another attribute
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Generate Combinations
          </button>
        </div>
      </div>
    </div>
  );
};

export function Products({ filterCategory }: { filterCategory?: string } = {}) {
  const { settings, formatPrice } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'giftcards'>(filterCategory ? 'products' : 'all');
  const [categoryFilter, setCategoryFilter] = useState(filterCategory || 'All');
  const [giftCategoryFilter, setGiftCategoryFilter] = useState('All');
  const [isAlertsBannerCollapsed, setIsAlertsBannerCollapsed] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    category: '',
    subCategory: '',
    subSubCategory: '',
    price: '',
    cost: '',
    stock: 0,
    image: '',
    attributes: {} as Record<string, any>,
    digitalItems: [] as Product['digitalItems'],
    sendEmailEnabled: false,
    emailTemplate: '',
    isRulesTemplate: false,
    productCreatedAt: null as string | null,
    digital_game_type: 'normal',
  });

  const [newItem, setNewItem] = useState({ 
    email: '', 
    password: '', 
    code: '',
    outlookEmail: '',
    outlookPassword: '',
    birthdate: '',
    region: '',
    onlineId: '',
    backupCodes: '',
    assignedGroup: 'All Groups'
  });

  const [customSlots, setCustomSlots] = useState<{ id: string; originalName: string; name: string; price: string; cost: string }[]>([]);

  const isDigitalGames = (formData.category || '').toLowerCase().includes('digital') || 
                         (formData.category || '').toLowerCase().includes('games') || 
                         (formData.category || '').toLowerCase().includes('playstation-plus') ||
                         (formData.category || '').toLowerCase().includes('gift-cards') ||
                         (formData.name || '').toLowerCase().includes('[digital account]');
  const isGiftCards = (formData.category || '').toLowerCase().includes('gift-cards');
  const isPhysical = !isDigitalGames && !isGiftCards;

  const getInitialCustomSlots = (cat = formData.category || filterCategory) => {
    if (cat === 'playstation-plus') {
      return [
        { id: crypto.randomUUID(), originalName: '', name: 'Primary PS4', price: '', cost: '' },
        { id: crypto.randomUUID(), originalName: '', name: 'Primary PS5', price: '', cost: '' },
        { id: crypto.randomUUID(), originalName: '', name: 'Secondary', price: '', cost: '' }
      ];
    }
    const activeAttrs = (attributes || []).filter(a => a.is_active);
    if (activeAttrs.length > 0) {
      return activeAttrs.map(a => ({
        id: crypto.randomUUID(),
        originalName: '',
        name: a.name,
        price: '',
        cost: ''
      }));
    }
    return [
      { id: crypto.randomUUID(), originalName: '', name: 'Primary PS4', price: '', cost: '' },
      { id: crypto.randomUUID(), originalName: '', name: 'Primary PS5', price: '', cost: '' },
      { id: crypto.randomUUID(), originalName: '', name: 'Secondary', price: '', cost: '' },
      { id: crypto.randomUUID(), originalName: '', name: 'Offline PS4', price: '', cost: '' },
      { id: crypto.randomUUID(), originalName: '', name: 'Offline PS5', price: '', cost: '' }
    ];
  };

  useEffect(() => {
    if (filterCategory) {
      setCategoryFilter(filterCategory);
      setActiveTab('products');
    }
  }, [filterCategory]);

  useEffect(() => {
    if (editingProduct) return;
    setCustomSlots(getInitialCustomSlots(formData.category));
  }, [formData.category, editingProduct]);

  useEffect(() => {
    loadData();
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        const role = String(parsed?.user_metadata?.role || '').toLowerCase();
        const perms = parsed?.user_metadata?.permissions || {};
        
        // Check if user has at least read permission for products
        const canRead = perms.products === 'read' || perms.products === 'write' || perms.products === true;
        
        // If it's a legacy admin/manager without JSON perms, they should still have access
        const isLegacyAdmin = role === 'admin' || role === 'manager';
        
        setIsAdmin(isLegacyAdmin || canRead);
        setIsSuperAdmin(role === 'admin');
      }
    } catch(e) {}
  }, []);

  const loadData = async () => {
    try {
        console.log('Loading data...');
        setLoading(true);
        
        const [catsRes, subCatsRes, subSubCatsRes, attrsRes, productsRes] = await Promise.all([
            categoriesAPI.getAll(),
            api.get('sub_categories'),
            api.get('sub_sub_categories'),
            api.get('product_attributes'),
            productsAPI.getAll()
        ]);

        console.log('API responses:', { catsRes, subCatsRes, subSubCatsRes, attrsRes, productsRes });

        // Handle categories
        if (catsRes) {
            const data = catsRes;
            console.log('Categories data:', data);
            setCategories(data);
            if (data.length > 0 && !formData.category) {
                 setFormData(prev => ({ ...prev, category: data[0].slug }));
            }
        } else {
            setCategories([]);
        }
        
        // Handle subcategories
        if (subCatsRes) {
            const subData = subCatsRes.map((item: any) => ({
                ...item,
                categoryId: item.category_id,
                displayOrder: item.display_order,
                isActive: item.is_active,
            }));
            console.log('Subcategories data:', subData);
            setSubCategories(subData);
        } else {
            setSubCategories([]);
        }

        // Handle sub-sub-categories
        if (subSubCatsRes) {
            setSubSubCategories(subSubCatsRes);
        } else {
            setSubSubCategories([]);
        }
        
        // Handle attributes
        if (attrsRes) {
            const attrsData = attrsRes;
            console.log('Attributes data:', attrsData);
            setAttributes(attrsData);
        } else {
            setAttributes([]);
        }
        
        console.log('Products response:', productsRes);
        setProducts(productsRes.products || []);
        setError(null);
    } catch (err: any) {
        console.error("Failed to load data", err);
        setError(err?.message || 'Failed to load data');
    } finally {
        setLoading(false);
    }
  };

  async function loadProducts() {
     try {
       const data = await productsAPI.getAll();
       setProducts(data.products);
     } catch (err) {
       console.error(err);
     }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await uploadAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, image: normalizeImageSrc(url) }));
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please verify that your Express server is running and the "server/uploads/products" folder has write permissions.');
    }
  };

  const handleAddDigitalItem = () => {
    // For gift cards, handle multiple codes
    if (formData.category === 'gift-cards') {
      const codes = newItem.code
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length === 12 && /^\d+$/.test(code));

      if (codes.length === 0) return;
      
      // For gift cards, only store id and code
      const newItems = codes.map(code => ({
        id: crypto.randomUUID(),
        code: code,
      }));

      const currentItems = formData.digitalItems || [];
      const nextItems = [...currentItems, ...newItems];
      const duplicateError = checkDuplicateEmailOrCode(nextItems);
      if (duplicateError) {
        alert(duplicateError);
        return;
      }

      setFormData(prev => ({
        ...prev,
        digitalItems: nextItems,
        stock: prev.stock + codes.length
      }));
      setNewItem({ email: '', password: '', code: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '', assignedGroup: 'All Groups' });
      return;
    }
    
    // For regular products, require account details or codes
    if (!newItem.email && !newItem.password && !newItem.code) return;
    
    const codes = newItem.code
      .split('\n')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    if (codes.length === 0) return;

    const targetSlots = newItem.assignedGroup === 'All Groups' 
      ? customSlots 
      : customSlots.filter(slot => {
          const parts = slot.name.split(' - ');
          const group = parts.length > 1 ? parts[0].trim() : 'General';
          return group === newItem.assignedGroup;
        });

    if (targetSlots.length === 0) {
      alert('No slots found for the selected group.');
      return;
    }

    const mainCodes = codes.slice(0, targetSlots.length);
    const backupCodes = codes.slice(targetSlots.length);
    
    const slots: Record<string, any> = {};
    targetSlots.forEach((slot, index) => {
      slots[slot.name] = {
        sold: false,
        orderId: null,
        code: mainCodes[index] || '',
        price: parseFloat(slot.price) || parseFloat(formData.price) || 0,
        cost: parseFloat(slot.cost) || parseFloat(formData.cost) || 0
      };
    });

    const newItemData = {
      ...newItem,
      id: crypto.randomUUID(),
      code: mainCodes[0] || '',
      slots,
      backupCodes: backupCodes.join('\n'),
      totalCodes: codes.length
    };

    const currentItems = formData.digitalItems || [];
    const nextItems = [...currentItems, newItemData];
    const duplicateError = checkDuplicateEmailOrCode(nextItems);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    setFormData(prev => ({
      ...prev,
      digitalItems: nextItems,
      stock: countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
    }));
    setNewItem({ email: '', password: '', code: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '', assignedGroup: 'All Groups' });
    setCustomSlots(customSlots.map(s => ({ ...s, price: '', cost: '' })));
  };

  const handleRemoveDigitalItemById = (id: string) => {
    setFormData(prev => {
      const nextItems = prev.digitalItems?.filter((i: any) => i.id !== id) || [];
      return {
        ...prev,
        digitalItems: nextItems,
        stock: prev.category === 'gift-cards' ? prev.stock : countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
      };
    });
  };

  const handleUpdateDigitalItem = (id: string, updates: any) => {
    const currentItems = formData.digitalItems || [];
    const nextItems = currentItems.map((item: any) => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });

    const duplicateError = checkDuplicateEmailOrCode(nextItems);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    setFormData(prev => {
      return {
        ...prev,
        digitalItems: nextItems,
        stock: prev.category === 'gift-cards' ? prev.stock : countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
      };
    });
  };

  const handleUpdateDigitalItemSlot = (id: string, slotName: string, slotUpdates: any) => {
    const currentItems = formData.digitalItems || [];
    const nextItems = currentItems.map((item: any) => {
      if (item.id === id) {
        const slots = { ...(item.slots || {}) };
        slots[slotName] = { ...(slots[slotName] || {}), ...slotUpdates };
        return { ...item, slots };
      }
      return item;
    });

    const duplicateError = checkDuplicateEmailOrCode(nextItems);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    setFormData(prev => {
      return {
        ...prev,
        digitalItems: nextItems,
        stock: prev.category === 'gift-cards' ? prev.stock : countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
      };
    });
  };

  const handleAddGroupStock = (targetGroupName: string, localNewItem: any) => {
    const targetSlots = customSlots.filter(slot => {
        const parts = slot.name.split(' - ');
        const group = parts.length > 1 ? parts[0].trim() : 'General';
        return group === targetGroupName;
    });

    if (targetSlots.length === 0) {
      alert('No sub-attributes found for this group. Add sub-attributes first.');
      return;
    }
    
    const slots: Record<string, any> = {};
    targetSlots.forEach((slot) => {
      const code = localNewItem?.slotCodes?.[slot.name] ? String(localNewItem.slotCodes[slot.name]).trim() : '';
      slots[slot.name] = {
        sold: false, orderId: null, code,
        price: parseFloat(slot.price) || parseFloat(formData.price as unknown as string) || 0,
        cost: parseFloat(slot.cost) || parseFloat(formData.cost as unknown as string) || 0
      };
    });
    const firstCode = Object.values(slots).find((s: any) => s?.code)?.code || '';

    const newItemData = {
      ...localNewItem,
      id: crypto.randomUUID(),
      code: firstCode,
      slots,
      backupCodes: String(localNewItem.backupCodes || ''),
      totalCodes: Object.values(slots).filter((s: any) => s?.code).length + (String(localNewItem.backupCodes || '').trim() ? String(localNewItem.backupCodes).split('\n').filter((x: string) => x.trim()).length : 0),
      assignedGroup: targetGroupName,
      createdAt: new Date().toISOString()
    };

    const currentItems = formData.digitalItems || [];
    const nextItems = [...currentItems, newItemData];
    const duplicateError = checkDuplicateEmailOrCode(nextItems);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    setFormData(prev => {
      return {
        ...prev,
        digitalItems: nextItems,
        stock: countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
      };
    });
  };

  const handleRemoveDigitalItem = (index: number) => {
    setFormData(prev => {
      const nextItems = (Array.isArray(prev.digitalItems) ? prev.digitalItems : []).filter((_, i) => i !== index);
      return {
        ...prev,
        digitalItems: nextItems,
        stock: countAvailableSlots(nextItems as any[], prev.category, prev.subCategory)
      };
    });
  };

  const handleExportCSVTemplate = () => {
    const headers = ['Email,Password,PrimaryPS4,PrimaryPS5,Secondary,OfflinePS4,OfflinePS5,OutlookEmail,OutlookPassword,Birthdate,Region,OnlineID,BackupCodes'];
    const csvContent = headers.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digital_stock_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newItems: Product['digitalItems'] = [];
      const header = (lines[0] || '').split(',').map((x) => x.trim());
      const normalizeKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
      const indexOf = (name: string) => header.findIndex((h) => normalizeKey(h) === normalizeKey(name));
      const idxEmail = indexOf('Email');
      const idxPassword = indexOf('Password');
      const idxCodeLegacy = indexOf('Code');
      const idxOutlookEmail = indexOf('OutlookEmail');
      const idxOutlookPassword = indexOf('OutlookPassword');
      const idxBirthdate = indexOf('Birthdate');
      const idxRegion = indexOf('Region');
      const idxOnlineId = indexOf('OnlineID');
      const idxBackupCodes = indexOf('BackupCodes');
      const idxPrimaryPS4 = indexOf('PrimaryPS4');
      const idxPrimaryPS5 = indexOf('PrimaryPS5');
      const idxSecondary = indexOf('Secondary');
      const idxOfflinePS4 = indexOf('OfflinePS4');
      const idxOfflinePS5 = indexOf('OfflinePS5');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',').map(item => item.trim());
        const email = idxEmail >= 0 ? parts[idxEmail] : parts[0];
        const password = idxPassword >= 0 ? parts[idxPassword] : parts[1];
        const outlookEmail = idxOutlookEmail >= 0 ? parts[idxOutlookEmail] : '';
        const outlookPassword = idxOutlookPassword >= 0 ? parts[idxOutlookPassword] : '';
        const birthdate = idxBirthdate >= 0 ? parts[idxBirthdate] : '';
        const region = idxRegion >= 0 ? parts[idxRegion] : '';
        const onlineId = idxOnlineId >= 0 ? parts[idxOnlineId] : '';
        const backupCodes = idxBackupCodes >= 0 ? parts[idxBackupCodes] : '';

        const slots: Record<string, any> = {};
        const slotNameList = customSlots.map((s) => s.name);
        for (const slotName of slotNameList) {
          slots[slotName] = { sold: false, orderId: null, code: '' };
        }

        const hasNewColumns =
          idxPrimaryPS4 >= 0 || idxPrimaryPS5 >= 0 || idxSecondary >= 0 || idxOfflinePS4 >= 0 || idxOfflinePS5 >= 0;

        if (hasNewColumns) {
          const setIf = (idx: number, slotName: string) => {
            if (idx >= 0 && parts[idx]) slots[slotName] = { ...slots[slotName], code: String(parts[idx] || '').trim() };
          };
          setIf(idxPrimaryPS4, 'Primary PS4');
          setIf(idxPrimaryPS5, 'Primary PS5');
          setIf(idxSecondary, 'Secondary');
          setIf(idxOfflinePS4, 'Offline PS4');
          setIf(idxOfflinePS5, 'Offline PS5');
        } else if (idxCodeLegacy >= 0 && parts[idxCodeLegacy]) {
          const legacyCode = String(parts[idxCodeLegacy] || '').trim();
          if (customSlots[0]?.name) slots[customSlots[0].name] = { ...slots[customSlots[0].name], code: legacyCode };
        }

        const anyCode = Object.values(slots).some((s: any) => String(s?.code || '').trim());
        if (email || password || anyCode || String(backupCodes || '').trim()) {
          newItems.push({
            email, 
            password, 
            outlookEmail,
            outlookPassword,
            birthdate,
            region,
            onlineId,
            backupCodes,
            slots,
            code: Object.values(slots).find((s: any) => s?.code)?.code || '',
          });
        }
      }

      const currentItems = formData.digitalItems || [];
      const nextItems = [...currentItems, ...newItems];
      const duplicateError = checkDuplicateEmailOrCode(nextItems);
      if (duplicateError) {
        alert(duplicateError);
        return;
      }

      setFormData(prev => {
        return {
          ...prev,
          digitalItems: nextItems,
          stock: countAvailableSlots(nextItems as any[])
        };
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveProduct = async () => {
    try {
      // Map slot prices to all digital items before saving
      let finalDigitalItems = formData.digitalItems;
      
      if (formData.category !== 'gift-cards' && Array.isArray(finalDigitalItems)) {
        finalDigitalItems = finalDigitalItems.map((item: any) => {
          if (!item.slots) return item;
          
          const updatedSlots = { ...item.slots };
          
          customSlots.forEach(slot => {
            const priceVal = parseFloat(slot.price);
            const costVal = parseFloat(slot.cost);
            
            if (slot.originalName && slot.originalName !== slot.name && updatedSlots[slot.originalName]) {
               updatedSlots[slot.name] = updatedSlots[slot.originalName];
               delete updatedSlots[slot.originalName];
            }
            
            if (updatedSlots[slot.name]) {
              if (!isNaN(priceVal)) updatedSlots[slot.name].price = priceVal;
              if (!isNaN(costVal)) updatedSlots[slot.name].cost = costVal;
            } else {
              updatedSlots[slot.name] = { sold: false, orderId: null, code: '', price: isNaN(priceVal) ? 0 : priceVal, cost: isNaN(costVal) ? 0 : costVal };
            }
          });
          
          return { ...item, slots: updatedSlots };
        });
      }

      let computedStock = 0;
      if (isDigitalGames) {
        // If it's a gift card but has NO slots defined in any item, it might be using the legacy flat code list
        const usingSlots = Array.isArray(finalDigitalItems) && finalDigitalItems.some(item => item.slots && Object.keys(item.slots).length > 0);
        
        if (formData.category === 'gift-cards' && !usingSlots) {
          computedStock = (finalDigitalItems && finalDigitalItems.length > 0) ? finalDigitalItems.filter((x: any) => String(x?.code || '').trim()).length : (parseInt(formData.stock as any) || 0);
        } else {
          computedStock = (finalDigitalItems && finalDigitalItems.length > 0) ? countAvailableSlots(Array.isArray(finalDigitalItems) ? (finalDigitalItems as any[]) : [], formData.category, formData.subCategory) : (parseInt(formData.stock as any) || 0);
        }
      } else {
        computedStock = parseInt(formData.stock as any) || 0;
      }

      const fullAccountStock =
        !isDigitalGames || !formData.fullAccountPrice
          ? 0
          : countAvailableFullAccounts(Array.isArray(finalDigitalItems) ? (finalDigitalItems as any[]) : [], customSlots.map((s) => s.name));

      const availabilityStock = isDigitalGames ? Math.max(computedStock, fullAccountStock) : computedStock;

      const status =
        availabilityStock > 10
          ? 'In Stock'
          : availabilityStock > 0
            ? 'Low Stock'
            : 'Out of Stock';

      // Map frontend fields to database fields
      // Ensure category_slug and sub_category_slug are set
      const productData: any = {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions || '',
        category_slug: formData.category, // This is the slug from the select
        sub_category_slug: formData.subCategory, // This is the slug/name from subcats
        sub_sub_category_slug: formData.subSubCategory || null,
        price: parseFloat(formData.price as any) || 0,
        cost: parseFloat(formData.cost as any) || 0,
        stock: computedStock,
        image: formData.image || 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&h=100&fit=crop',
        status,
        attributes: formData.attributes || {},
        // For gift-cards, save the codes. For other products, save digital items with slots
        digitalItems: isPhysical ? [] : finalDigitalItems,
        product_variants: isPhysical ? [] : customSlots.map(slot => ({
          name: slot.name,
          price: slot.price ? parseFloat(slot.price) : null,
          cost: slot.cost ? parseFloat(slot.cost) : null,
          stock: isGiftCards ? 0 : countAvailableForSlot(Array.isArray(finalDigitalItems) ? (finalDigitalItems as any[]) : [], slot.name, formData.category, formData.subCategory)
        })),
        sendEmailEnabled: formData.sendEmailEnabled || false,
        emailTemplate: formData.isRulesTemplate ? 'rules_for_games' : (formData.emailTemplate || ''),
        isRulesTemplate: formData.isRulesTemplate || false,
        fullAccountPrice: formData.fullAccountPrice ? parseFloat(formData.fullAccountPrice as any) : null,
        fullAccountCost: formData.fullAccountCost ? parseFloat(formData.fullAccountCost as any) : null,
        digital_game_type: formData.digital_game_type || 'normal',
      };

      // Add Full Account variant if price is set
      if (formData.fullAccountPrice) {
        productData.product_variants.push({
          name: 'Full Account',
          price: parseFloat(formData.fullAccountPrice as any),
          cost: formData.fullAccountCost ? parseFloat(formData.fullAccountCost as any) : null,
          stock: fullAccountStock
        });
      }

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
      } else {
        await productsAPI.create(productData);
      }

      await loadData();
      setIsAddModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', instructions: '', category: categories[0]?.slug || '', subCategory: '', price: '', cost: '', stock: 0, image: '', attributes: {}, digitalItems: [], sendEmailEnabled: false, emailTemplate: '', isRulesTemplate: false, productCreatedAt: null });
      setNewItem({ email: '', password: '', code: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '', assignedGroup: 'All Groups' });
      setCustomSlots(getInitialCustomSlots());
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Check console for details.');
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productsAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleEditProduct = (product: Product & { product_variants?: any[] }) => {
    setEditingProduct(product);
    
    // Parse digital items to extract existing slot prices if available
    const parsedDigitalItems = typeof product.digitalItems === 'string' 
      ? JSON.parse(product.digitalItems) 
      : (product.digitalItems || []);

    const newCustomSlots: { id: string; originalName: string; name: string; price: string; cost: string }[] = [];

    let fullAccountPrice = '';
    let fullAccountCost = '';

    // First check if we have the new product_variants table data
    if (product.product_variants && product.product_variants.length > 0) {
      product.product_variants.forEach((variant: any) => {
        if (variant.name.toLowerCase() === 'full account') {
          fullAccountPrice = variant.price ? String(variant.price) : '';
          fullAccountCost = variant.cost ? String(variant.cost) : '';
        } else {
          newCustomSlots.push({
            id: crypto.randomUUID(),
            originalName: variant.name,
            name: variant.name,
            price: variant.price ? String(variant.price) : '',
            cost: variant.cost ? String(variant.cost) : ''
          });
        }
      });
    } 
    // Fallback to legacy JSONB approach
    else if (parsedDigitalItems.length > 0) {
      const itemWithSlots = parsedDigitalItems.find((item: any) => item.slots);
      if (itemWithSlots && itemWithSlots.slots) {
        Object.entries(itemWithSlots.slots).forEach(([attr, slot]: [string, any]) => {
          if (attr.toLowerCase() === 'full account') {
            fullAccountPrice = slot.price ? String(slot.price) : '';
            fullAccountCost = slot.cost ? String(slot.cost) : '';
          } else {
            newCustomSlots.push({
              id: crypto.randomUUID(),
              originalName: attr,
              name: attr,
              price: slot.price ? String(slot.price) : '',
              cost: slot.cost ? String(slot.cost) : ''
            });
          }
        });
      }
    }
    
    if (newCustomSlots.length === 0) {
      setCustomSlots(getInitialCustomSlots(product.category_slug));
    } else {
      setCustomSlots(newCustomSlots);
    }

    setFormData({
      name: product.name,
      description: (product as any).description || '',
      instructions: product.instructions || '',
      category: product.category_slug || '',
      subCategory: product.sub_category_slug || '',
      subSubCategory: (product as any).sub_sub_category_slug || '',
      price: product.price.toString().replace('$', ''),
      cost: product.cost ? product.cost.toString().replace('$', '') : '',
      stock: product.category_slug === 'gift-cards' ? product.stock : ((parsedDigitalItems && parsedDigitalItems.length > 0) ? countAvailableSlots(parsedDigitalItems as any[], product.category_slug, product.sub_category_slug) : product.stock),
      image: product.image,
      attributes: (product.attributes || {}) as Record<string, any>,
      digitalItems: parsedDigitalItems,
      sendEmailEnabled: product.sendEmailEnabled || false,
      emailTemplate: product.emailTemplate === 'rules_for_games' ? '' : (product.emailTemplate || ''),
      isRulesTemplate: product.emailTemplate === 'rules_for_games' || product.isRulesTemplate || false,
      fullAccountPrice,
      fullAccountCost,
      productCreatedAt: product.created_at || null,
      digital_game_type: (product as any).digital_game_type || 'normal',
    });
    setIsAddModalOpen(true);
  };

  const getDisplayStock = (product: Product) => {
    if (product.category_slug === 'gift-cards') return product.stock;
    const parsedItems = typeof product.digitalItems === 'string'
      ? JSON.parse(product.digitalItems)
      : (product.digitalItems || []);
    if (parsedItems.length > 0) {
      return countAvailableSlots(parsedItems, product.category_slug, product.sub_category_slug);
    }
    return product.stock;
  };

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isGiftCard = product.category_slug === 'gift-cards';
    const matchesTab =
      activeTab === 'all' ? true : activeTab === 'giftcards' ? isGiftCard : !isGiftCard;
    const matchesCategory =
      activeTab === 'giftcards'
        ? giftCategoryFilter === 'All' || product.sub_category_slug === giftCategoryFilter
        : categoryFilter === 'All' || product.category_slug === categoryFilter;

    return matchesSearch && matchesTab && matchesCategory;
  });

  const renderContent = () => {
    const lowStockProducts = (products || []).filter(p => p.stock <= 5);
    try {
      if (loading) {
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">Loading products...</div>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="text-red-600 dark:text-red-400">{error}</div>
            <Button onClick={loadData}>Try Again</Button>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Low / Out of Stock alerts banner */}
          {lowStockProducts.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsAlertsBannerCollapsed(!isAlertsBannerCollapsed)}>
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Stock Alerts ({lowStockProducts.length} product(s) need attention)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold uppercase px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                  <ChevronDown className={`w-4 h-4 text-red-500 transition-transform ${isAlertsBannerCollapsed ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {!isAlertsBannerCollapsed && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-gray-900 dark:text-white truncate" title={p.name}>{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.stock === 0 ? 'bg-red-600' : 'bg-orange-500'}`}></span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                            {p.stock === 0 ? 'Out of stock' : `${p.stock} slot(s) left`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditProduct(p)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-red-200 dark:shadow-none whitespace-nowrap"
                      >
                        Edit & Refill
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="admin-page-header">
            <div>
              <p className="admin-page-subtitle">Inventory</p>
              <h1 className="admin-page-title">
                {filterCategory === 'playstation-plus' ? 'Playstation Plus' : 'Products'}
                <span className="text-brand-red">.</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <p className="hidden md:block text-xs font-bold text-text-secondary uppercase tracking-widest italic mr-2">
                Manage your product inventory
              </p>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  const defaultCategory = filterCategory || (activeTab === 'giftcards' ? 'gift-cards' : categories[0]?.slug || '');
                  setFormData({ name: '', description: '', instructions: '', category: defaultCategory, subCategory: '', price: '', cost: '', stock: 0, image: '', attributes: {}, digitalItems: [], sendEmailEnabled: false, emailTemplate: '', isRulesTemplate: false, productCreatedAt: null });
                  setNewItem({ email: '', password: '', code: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '', assignedGroup: 'All Groups' });
                  setCustomSlots(getInitialCustomSlots(defaultCategory));
                  setIsAddModalOpen(true);
                }}
                className="btn-primary"
                icon={Plus}
              >
                Add Product
              </Button>
            </div>
          </div>

          {!filterCategory && (
            <div className="inline-flex p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'products'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('giftcards')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'giftcards'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Gift Cards
            </button>
          </div>
          )}

          <Card className="p-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'giftcards' ? 'Search gift cards...' : 'Search products...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {!filterCategory && (activeTab === 'giftcards' ? (
                <select
                  value={giftCategoryFilter}
                  onChange={(e) => setGiftCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Gift Categories</option>
                  {(() => {
                    const giftCategory = categories.find((c: any) => c.slug === 'gift-cards');
                    const giftSubs = giftCategory
                      ? subCategories.filter((s: any) => s.categoryId === giftCategory.id)
                      : [];
                    return giftSubs.map((s: any) => (
                      <option key={s.id || s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ));
                  })()}
                </select>
              ) : (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All</option>
                  {categories
                    .filter((c: any) => c.slug !== 'gift-cards')
                    .map((c: any) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                </select>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`${product.category_slug === 'gift-cards' ? 'aspect-[3/4]' : 'aspect-square'} bg-gray-100 dark:bg-gray-800 relative`}>
                        <img
                          src={normalizeImageSrc(product.image) || PLACEHOLDER_IMG_SRC}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            if (el.src !== PLACEHOLDER_IMG_SRC) el.src = PLACEHOLDER_IMG_SRC;
                          }}
                        />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'In Stock' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{product.category_slug}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      {(() => {
                        const basePrice = parseFloat(product.price as any) || 0;
                        if (basePrice > 0) return formatPrice(basePrice);
                        
                        const variantPrices = (product.product_variants || [])
                          .map((v: any) => parseFloat(v.price))
                          .filter(p => !isNaN(p) && p > 0);
                        
                        if (variantPrices.length > 0) {
                          return formatPrice(Math.min(...variantPrices));
                        }
                        
                        return formatPrice(0);
                      })()}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Stock: {getDisplayStock(product)}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-white hover:text-white hover:bg-red-600 dark:hover:bg-red-600 bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Modal
            isOpen={isAddModalOpen || !!editingProduct}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingProduct(null);
              setFormData({ name: '', description: '', instructions: '', category: categories[0]?.slug || '', subCategory: '', price: '', cost: '', stock: 0, image: '', attributes: {}, digitalItems: [], sendEmailEnabled: false, emailTemplate: '', isRulesTemplate: false, productCreatedAt: null });
            }}
            title={editingProduct ? 'Edit Product' : 'Add New Product'}
            maxWidth="4xl"
          >
            <div className="space-y-6 pb-6">
              {/* Product Identity Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Product Identity</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Product Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                          placeholder="Enter product name (e.g. God of War Ragnarök)"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                          placeholder="Enter product description"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Instructions</label>
                        <textarea
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                          placeholder="Enter product delivery / activation instructions (e.g. step-by-step guidelines for redeeming codes or accessing accounts)"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Category</label>
                          <select
                            value={formData.category || ''}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '', subSubCategory: '' })}
                            disabled={!!filterCategory}
                            className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none ${
                              filterCategory
                                ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed border-gray-300 dark:border-gray-500'
                                : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <option value="">Select Category</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Sub Category</label>
                          <select
                            value={formData.subCategory || ''}
                            onChange={(e) => setFormData({ ...formData, subCategory: e.target.value, subSubCategory: '' })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none"
                          >
                            <option value="">Select Sub Category</option>
                            {(() => {
                                const cat = categories.find(c => c.slug === formData.category);
                                return cat ? subCategories.filter(s => s.categoryId === cat.id && s.isActive).map(s => (
                                    <option key={s.id} value={s.slug || s.name}>{s.name}</option>
                                )) : [];
                            })()}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Sub-Sub Category</label>
                          <select
                            value={formData.subSubCategory || ''}
                            onChange={(e) => setFormData({ ...formData, subSubCategory: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none"
                          >
                            <option value="">Select Sub-Sub Category</option>
                            {(() => {
                                const sub = subCategories.find(s => s.slug === formData.subCategory);
                                return sub ? subSubCategories.filter(ss => ss.sub_category_id === sub.id && ss.is_active).map(ss => (
                                    <option key={ss.id} value={ss.slug}>{ss.name}</option>
                                )) : [];
                            })()}
                          </select>
                        </div>
                      </div>

                      {isDigitalGames && (
                        <div className="pt-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3 ml-1">Digital Game Type (Always Available Stock)</label>
                          <div className="flex flex-wrap gap-2">
                            {['normal', 'essential', 'extra', 'deluxe'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, digital_game_type: type })}
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                                  formData.digital_game_type === type
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                          {formData.digital_game_type !== 'normal' && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-2 font-bold italic animate-pulse">
                              * Stock will be marked as "Always Available" for customers.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Product Visual</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="aspect-video w-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center relative group">
                        {formData.image ? (
                          <>
                            <img
                              src={normalizeImageSrc(formData.image) || PLACEHOLDER_IMG_SRC}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                if (el.src !== PLACEHOLDER_IMG_SRC) el.src = PLACEHOLDER_IMG_SRC;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setFormData({ ...formData, image: '' })} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-[10px] text-gray-400 font-medium uppercase">No Image Preview</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Image URL</label>
                        <input
                          type="text"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                          placeholder="https://..."
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-gray-100 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-white dark:bg-gray-800 px-2 text-gray-400 font-bold tracking-widest">OR</span>
                        </div>
                      </div>

                      <label className="flex flex-col items-center justify-center w-full px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-full cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-95 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tighter">Upload Image File</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Pricing Summary</h3>
                  </div>

                  {!isDigitalGames || customSlots.length === 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Base Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{settings.currency_symbol}</span>
                          <input
                            type="number" step="0.01" value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Base Cost</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{settings.currency_symbol}</span>
                            <input
                              type="number" step="0.01" value={formData.cost}
                              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                              className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        <span className="font-bold block mb-1">Dynamic Pricing Active:</span>
                        Base price and cost are currently managed by the Sub-Attributes in the Inventory section below.
                      </p>
                    </div>
                  )}
                </div>
              
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
                      <Layout className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Inventory Status</h3>
                  </div>
 
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Current Stock Level</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number" value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                          disabled={isDigitalGames && (formData.digitalItems?.length || 0) > 0}
                          className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-lg focus:outline-none transition-all ${
                            isDigitalGames && (formData.digitalItems?.length || 0) > 0 
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed' 
                              : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-red-500'
                          }`}
                          placeholder="0"
                        />
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${formData.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {formData.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                      </div>
                    </div>
                    {isDigitalGames && (formData.digitalItems?.length || 0) > 0 && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium italic">
                        * Stock is auto-calculated from {formData.digitalItems?.length} digital delivery items.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {isDigitalGames && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-md border-t-4 border-t-red-600">
                  <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 dark:shadow-none">
                      <Layout className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Inventory & Attributes</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest">Manage your digital items and selling slots</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExportCSVTemplate} className="text-[10px] px-4 h-9 dark:text-white font-black border-2 rounded-full transition-all active:scale-95">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Template
                    </Button>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center justify-center px-5 h-9 text-[10px] font-black text-white bg-gray-900 rounded-full hover:bg-black transition-all shadow-md uppercase tracking-wider active:scale-95">
                        <Plus className="w-4 h-4 mr-1.5" /> Import CSV
                      </span>
                      <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>
                  </div>
                </div>
                
                                  {/* Attribute Prices and Costs */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Slot Prices & Costs
                    </h4>
                    
                    <VariantGenerator customSlots={customSlots} setCustomSlots={setCustomSlots} />

                    <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Full Account Option</span>
                          <span className="text-[10px] text-gray-500">Allow customers to buy the entire account exclusively</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Account Price ({settings.currency_symbol})</label>
                          <input
                            type="number" step="0.01"
                            value={formData.fullAccountPrice || ''}
                            onChange={(e) => setFormData({ ...formData, fullAccountPrice: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g. 50.00"
                          />
                        </div>
                        {isSuperAdmin && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Account Cost ({settings.currency_symbol})</label>
                            <input
                              type="number" step="0.01"
                              value={formData.fullAccountCost || ''}
                              onChange={(e) => setFormData({ ...formData, fullAccountCost: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g. 20.00"
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-purple-600/70 italic">
                        * Note: If a user buys a "Full Account", all other slots for that specific email will be locked. If any slot is sold, the "Full Account" option for that email becomes unavailable.
                      </p>
                    </div>

                    {/* Stock Summary Table */}
                    <div className="mb-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                          <Layout className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Inventory Breakdown</h4>
                      </div>
                      
                      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-tighter">Variant / Sub-Attribute</th>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-tighter text-center">Available Stock</th>
                              <th className="px-4 py-2.5 font-bold uppercase tracking-tighter text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-transparent">
                            {customSlots.map((slot) => {
                              const stockCount = countAvailableForSlot(formData.digitalItems as any[], slot.name, formData.category, formData.subCategory);
                              return (
                                <tr key={slot.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 italic">{slot.name}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${stockCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {stockCount} in stock
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-black text-red-600 dark:text-red-400">
                                    {formatPrice(parseFloat(slot.price) || parseFloat(formData.price as any) || 0)}
                                  </td>
                                </tr>
                              );
                            })}
                            {customSlots.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic uppercase tracking-widest">No variants defined</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        // Group slots by prefix before " - "
                        const groupedSlots = customSlots.reduce((acc, slot) => {
                          const parts = slot.name.split(' - ');
                          const group = parts.length > 1 ? parts[0] : 'General';
                          if (!acc[group]) acc[group] = [];
                          acc[group].push(slot);
                          return acc;
                        }, {} as Record<string, typeof customSlots>);

                        // Sort the groups to maintain a stable order
                        const sortedGroups = Object.entries(groupedSlots).sort(([a], [b]) => a.localeCompare(b));

                        
                        return sortedGroups.map(([groupName, slotsInGroup]) => {
                          const groupItems = formData.digitalItems?.filter((item: any) => {
                              if (item.assignedGroup) return item.assignedGroup === groupName;
                              if (item.slots) {
                                 const firstSlotKey = Object.keys(item.slots)[0];
                                 if (firstSlotKey) {
                                    const parts = firstSlotKey.split(' - ');
                                    const g = parts.length > 1 ? parts[0] : 'General';
                                    return g === groupName;
                                 }
                              }
                              return groupName === 'General';
                          });
                          return (
                            <GroupEditor 
                              key={groupName} 
                              groupName={groupName} 
                              slotsInGroup={slotsInGroup} 
                              customSlots={customSlots} 
                              setCustomSlots={setCustomSlots} 
                              settings={settings} 
                              formData={formData} 
                              onAddStockItem={handleAddGroupStock}
                              groupItems={groupItems}
                              onRemoveItem={handleRemoveDigitalItemById}
                              onUpdateItem={handleUpdateDigitalItem}
                              onUpdateItemSlot={handleUpdateDigitalItemSlot}
                              isAdmin={isSuperAdmin}
                            />
                          );
                        });
  
                      })()}
                      
                      <div className="flex items-center justify-between mt-6 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSlots([...customSlots, { id: crypto.randomUUID(), originalName: '', name: `New Group - Slot 1`, price: '', cost: '' }]);
                          }}
                          className="text-xs text-white hover:bg-red-700 font-black flex items-center bg-red-600 px-6 py-2.5 rounded-full transition-all shadow-md active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 mr-2" /> Add New Group
                        </button>

                        {(formData.category === 'playstation-plus' || formData.category === 'gift-cards') && (
                          <div className="flex flex-wrap gap-2">
                            {formData.category === 'playstation-plus' && ['1 Month', '3 Months', '12 Months'].map(duration => (
                              <button
                                key={duration}
                                type="button"
                                onClick={() => {
                                  const existing = new Set(customSlots.map((s) => String(s.name || '').toLowerCase()));
                                  const psPlusSlots = [
                                    { id: crypto.randomUUID(), originalName: '', name: `${duration} - Primary PS5`, price: '', cost: '' },
                                    { id: crypto.randomUUID(), originalName: '', name: `${duration} - Primary PS4`, price: '', cost: '' },
                                    { id: crypto.randomUUID(), originalName: '', name: `${duration} - Secondary`, price: '', cost: '' }
                                  ].filter((s) => !existing.has(String(s.name).toLowerCase()));
                                  if (psPlusSlots.length) setCustomSlots([...customSlots, ...psPlusSlots]);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-white border border-indigo-600 hover:bg-indigo-600 font-black flex items-center px-4 py-2 rounded-full transition-all active:scale-95"
                              >
                                <Plus className="w-3 h-3 mr-1.5" /> {duration}
                              </button>
                            ))}

                            {formData.category === 'gift-cards' && ['$10', '$20', '$50', '$100', 'Global', 'US Region'].map(tier => (
                              <button
                                key={tier}
                                type="button"
                                onClick={() => {
                                  const existing = new Set(customSlots.map((s) => String(s.name || '').toLowerCase()));
                                  if (!existing.has(tier.toLowerCase())) {
                                    setCustomSlots([...customSlots, { id: crypto.randomUUID(), originalName: '', name: tier, price: '', cost: '' }]);
                                  }
                                }}
                                className="text-[10px] text-emerald-600 hover:text-white border border-emerald-600 hover:bg-emerald-600 font-black flex items-center px-4 py-2 rounded-full transition-all active:scale-95"
                              >
                                <Plus className="w-3 h-3 mr-1.5" /> {tier}
                              </button>
                            ))}
                          </div>
                        )}

                        {(formData.category !== 'playstation-plus' && formData.category !== 'gift-cards') && (
                          <button
                            type="button"
                            onClick={() => {
                              const existing = new Set(customSlots.map((s) => String(s.name || '').toLowerCase()));
                              const offlineSlots = [
                                { id: crypto.randomUUID(), originalName: '', name: `Offline PS4`, price: '', cost: '' },
                                { id: crypto.randomUUID(), originalName: '', name: `Offline PS5`, price: '', cost: '' }
                              ].filter((s) => !existing.has(String(s.name).toLowerCase()));
                              if (offlineSlots.length) setCustomSlots([...customSlots, ...offlineSlots]);
                            }}
                            className="text-xs text-white hover:bg-indigo-700 font-black flex items-center bg-indigo-600 px-6 py-2.5 rounded-full transition-all shadow-md active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Add Offline Group (PS4/PS5)
                          </button>
                        )}
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic font-medium">
                          * Groups visually organize your slots (e.g., PS4, PS5).
                        </p>
                      </div>
                    </div>
                  </div>





                
                <p className="text-xs text-gray-500 mt-2">
                  Total Digital Stock: {formData.stock} total stock slots created
                </p>
              </div>
              )}

              {/* Technical Details Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Technical Details</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Region</label>
                    <input
                      type="text"
                      value={(formData.attributes as any)?.region || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...(formData.attributes || {}), region: e.target.value } })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Global / US / UK"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Genre</label>
                    <input
                      type="text"
                      value={(formData.attributes as any)?.genre || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...(formData.attributes || {}), genre: e.target.value } })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Action / Adventure"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Platform</label>
                    <input
                      type="text"
                      value={(formData.attributes as any)?.platform || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...(formData.attributes || {}), platform: e.target.value } })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="PS5 / PS4"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Game Size</label>
                    <input
                      type="text"
                      value={(formData.attributes as any)?.gameSize || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...(formData.attributes || {}), gameSize: e.target.value } })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="50 GB"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Language</label>
                    <input
                      type="text"
                      value={(formData.attributes as any)?.language || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...(formData.attributes || {}), language: e.target.value } })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="English / Arabic"
                    />
                  </div>
                </div>
              </div>

              {/* Email Template Section for Digital Products */}
              {isDigitalGames && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">Email</span>
                      Email Delivery Settings
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sendEmailEnabled}
                        onChange={(e) => setFormData({ ...formData, sendEmailEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {formData.sendEmailEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {formData.sendEmailEnabled && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 space-y-4">
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Rules for Games Template</span>
                          <span className="text-[10px] text-gray-500">Send the predefined game rules instead of a custom message</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isRulesTemplate}
                            onChange={(e) => setFormData({ ...formData, isRulesTemplate: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {!formData.isRulesTemplate ? (
                        <>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            When this product is purchased, send an email to the customer with the details below. Available placeholders: <code className="bg-white dark:bg-gray-800 px-1 rounded">{'{{email}}'}</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">{'{{password}}'}</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">{'{{code}}'}</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">{'{{name}}'}</code>, <code className="bg-white dark:bg-gray-800 px-1 rounded">{'{{orderNumber}}'}</code>
                          </p>
                          <textarea
                            value={formData.emailTemplate}
                            onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                            placeholder={"Email: {{email}}\nPassword: {{password}}\nCode: {{code}}\n\nThank you for your purchase!"}
                            rows={6}
                          />
                        </>
                      ) : (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                           <p className="text-xs text-gray-600 dark:text-gray-400">
                             <span className="font-bold text-blue-600 dark:text-blue-400">Rules Active:</span> The global "Rules for Games" template will be sent automatically. You can manage its content in the Email Templates section.
                           </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-8 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                    setFormData({ name: '', description: '', instructions: '', category: categories[0]?.slug || '', subCategory: '', price: '', cost: '', stock: 0, image: '', attributes: {}, digitalItems: [], sendEmailEnabled: false, emailTemplate: '', isRulesTemplate: false, productCreatedAt: null });
                    setCustomSlots(getInitialCustomSlots(categories[0]?.slug));
                  }}
                  className="px-8 py-3 rounded-full font-black text-gray-500 hover:text-gray-700 transition-all border-2 active:scale-95"
                >
                  Discard Changes
                </Button>
                <Button 
                  onClick={handleSaveProduct} 
                  className="px-10 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-black shadow-lg shadow-red-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  {editingProduct ? 'Save Product Changes' : 'Publish Product'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    } catch (error) {
      console.error('Error rendering Products component:', error);
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Products</h3>
          <p className="text-red-600">There was an error loading the products. Please try refreshing the page.</p>
        </div>
      );
    }
  };

  return renderContent();
}
