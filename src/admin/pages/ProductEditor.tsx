
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Plus, Edit2, Trash2, Package, Image as ImageIcon, Database, Shield, Download, Layout, Mail, Lock, MapPin, User, Calendar, Hash, Key, AlertTriangle, ChevronLeft, Save } from 'lucide-react';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { productsAPI, categoriesAPI, api, uploadAPI, normalizeImageSrc } from '@/utils/api';

const PLACEHOLDER_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

function countAvailableSlots(digitalItems: any[], categorySlug?: string, subCategorySlug?: string) {
  if (!Array.isArray(digitalItems)) return 0;
  let count = 0;
  const now = new Date().getTime();
  const limitDays = String(subCategorySlug || '').toLowerCase().includes('1-month') ? 5 : 10;
  for (const item of digitalItems) {
    if (!item || !item.slots || item.fullAccountSold) continue;
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
    if (item.fullAccountSold) continue;
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

const GroupEditor = ({ groupName, slotsInGroup, customSlots, setCustomSlots, formData, onAddStockItem, groupItems, onRemoveItem, onUpdateItem, onUpdateItemSlot, isAdmin, setFormData }: any) => {
  const isOffline = groupName.toLowerCase().includes('offline');
  const { settings } = useStoreSettings();
  const [localGroupName, setLocalGroupName] = useState(groupName === 'General' ? '' : groupName);
  const [newItem, setNewItem] = useState({ 
    email: '', password: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: ''
  });
  const [slotCodes, setSlotCodes] = useState<Record<string, string>>({});

  const isPsnEmailDup = useMemo(() => {
    if (!newItem.email) return false;
    const clean = newItem.email.trim().toLowerCase();
    return (formData.digitalItems || []).some((item: any) => {
      const email = (item.email || '').trim().toLowerCase();
      const outlook = (item.outlookEmail || '').trim().toLowerCase();
      return email === clean || outlook === clean;
    });
  }, [newItem.email, formData.digitalItems]);

  const isOutlookEmailDup = useMemo(() => {
    if (!newItem.outlookEmail) return false;
    const clean = newItem.outlookEmail.trim().toLowerCase();
    return (formData.digitalItems || []).some((item: any) => {
      const email = (item.email || '').trim().toLowerCase();
      const outlook = (item.outlookEmail || '').trim().toLowerCase();
      return email === clean || outlook === clean;
    });
  }, [newItem.outlookEmail, formData.digitalItems]);

  const isPsnSameAsOutlook = useMemo(() => {
    const psn = newItem.email.trim().toLowerCase();
    const outlook = newItem.outlookEmail.trim().toLowerCase();
    return !!(psn && outlook && psn === outlook);
  }, [newItem.email, newItem.outlookEmail]);

  const isAnySlotCodeDup = useMemo(() => {
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

  useEffect(() => {
    const next: Record<string, string> = {};
    (slotsInGroup || []).forEach((s: any) => {
      next[s.name] = slotCodes[s.name] || '';
    });
    setSlotCodes(next);
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

    if (formData.digitalItems) {
      const nextGroup = newGroup || 'General';
      const prevGroup = groupName || 'General';
      const updatedItems = formData.digitalItems.map((item: any) => {
        if ((item.assignedGroup || 'General') === prevGroup) {
          const slots = { ...(item.slots || {}) };
          const newSlotsObj: Record<string, any> = {};
          Object.keys(slots).forEach(key => {
            const parts = key.split(' - ');
            const subName = parts.length > 1 ? parts.slice(1).join(' - ') : key;
            const newKey = nextGroup !== 'General' ? `${nextGroup} - ${subName}` : subName;
            newSlotsObj[newKey] = slots[key];
          });
          return { ...item, assignedGroup: nextGroup, slots: newSlotsObj };
        }
        return item;
      });
      setFormData((prev: any) => ({ ...prev, digitalItems: updatedItems }));
    }
  };

  const submitStock = () => {
    if (isPsnEmailDup || isOutlookEmailDup || isAnySlotCodeDup) {
      alert("Please resolve any duplicate emails or slot codes before adding.");
      return;
    }
    onAddStockItem(groupName, { ...newItem, slotCodes });
    setNewItem({ email: '', password: '', outlookEmail: '', outlookPassword: '', birthdate: '', region: '', onlineId: '', backupCodes: '' });
    const cleared: Record<string, string> = {};
    Object.keys(slotCodes).forEach(k => cleared[k] = '');
    setSlotCodes(cleared);
  };

  return (
    <div className={`rounded-3xl border-2 ${isOffline ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} overflow-hidden mb-8 shadow-sm transition-all`}>
      <div className={`${isOffline ? 'bg-gray-900/50' : 'bg-gray-50/50 dark:bg-gray-900/50'} px-6 py-4 flex justify-between items-center border-b ${isOffline ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
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
            className={`font-black text-sm bg-transparent border-none focus:ring-0 ${isOffline ? 'text-white placeholder-gray-600' : 'text-gray-800 dark:text-white placeholder-gray-400'} w-1/2 p-0 focus:outline-none ml-2`}
          />
        </div>
        <Button
          variant="secondary" size="sm"
          onClick={() => {
            const prefix = groupName !== 'General' ? `${groupName} - ` : '';
            setCustomSlots([...customSlots, { id: crypto.randomUUID(), name: `${prefix}New Slot`, price: '', cost: '' }]);
          }}
          className="rounded-full h-8 text-[10px] font-black uppercase"
        >
          <Plus className="w-3 h-3 mr-1" /> Add variant
        </Button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {slotsInGroup.map((slot: any) => (
            <div key={slot.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 relative group">
              <button onClick={() => setCustomSlots(customSlots.filter((s: any) => s.id !== slot.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
              <div className="space-y-3">
                 <input
                   type="text" value={slot.name.includes(' - ') ? slot.name.split(' - ')[1] : slot.name}
                   onChange={e => {
                     const next = [...customSlots];
                     const idx = next.findIndex(s => s.id === slot.id);
                     next[idx].name = groupName !== 'General' ? `${groupName} - ${e.target.value}` : e.target.value;
                     setCustomSlots(next);
                   }}
                   className="w-full bg-transparent border-none p-0 text-xs font-black text-gray-800 dark:text-white focus:ring-0"
                 />
                 <div className="flex gap-3">
                   <div className="flex-1">
                     <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Price</label>
                     <input type="number" value={slot.price} onChange={e => { const n = [...customSlots]; n.find(s => s.id === slot.id)!.price = e.target.value; setCustomSlots(n); }} className="w-full bg-transparent border-none p-0 text-xs font-bold text-red-600 focus:ring-0" placeholder="0.00" />
                   </div>
                   {isAdmin && (
                     <div className="flex-1">
                       <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Cost</label>
                       <input type="number" value={slot.cost} onChange={e => { const n = [...customSlots]; n.find(s => s.id === slot.id)!.cost = e.target.value; setCustomSlots(n); }} className="w-full bg-transparent border-none p-0 text-xs font-bold text-gray-500 focus:ring-0" placeholder="0.00" />
                     </div>
                   )}
                 </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Add Final Stock to {groupName || 'General'}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50">
              <span className="text-[10px] font-black uppercase text-gray-400">PSN Account Info</span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">PSN Email {isPsnEmailDup && <span className="text-red-500 font-extrabold ml-1 animate-pulse">⚠️ Duplicate!</span>}</label>
                  <input type="email" value={newItem.email} onChange={e => setNewItem({...newItem, email: e.target.value})} placeholder="example@psn.com" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">PSN Password</label>
                  <input type="text" value={newItem.password} onChange={e => setNewItem({...newItem, password: e.target.value})} placeholder="PSN Password" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 mb-1">Region</label>
                    <input type="text" value={newItem.region} onChange={e => setNewItem({...newItem, region: e.target.value})} placeholder="US/UK/etc" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 mb-1">Online ID</label>
                    <input type="text" value={newItem.onlineId} onChange={e => setNewItem({...newItem, onlineId: e.target.value})} placeholder="PSN Nickname" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50">
              <span className="text-[10px] font-black uppercase text-gray-400">Recovery Info</span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">Outlook Email {isOutlookEmailDup && <span className="text-red-500 font-extrabold ml-1 animate-pulse">⚠️ Duplicate!</span>}</label>
                  <input type="email" value={newItem.outlookEmail} onChange={e => setNewItem({...newItem, outlookEmail: e.target.value})} placeholder="recovery@outlook.com" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">Outlook Password</label>
                  <input type="text" value={newItem.outlookPassword} onChange={e => setNewItem({...newItem, outlookPassword: e.target.value})} placeholder="Outlook Password" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 mb-1">Birthdate</label>
                  <input type="text" value={newItem.birthdate} onChange={e => setNewItem({...newItem, birthdate: e.target.value})} placeholder="YYYY-MM-DD" className="w-full px-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 space-y-4">
            <span className="text-[10px] font-black uppercase text-gray-400">Attribute Codes & Backup Codes</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {slotsInGroup.map((slot: any) => (
                <div key={slot.id}>
                  <label className="block text-[8px] font-black uppercase text-gray-400 mb-1.5 ml-1">{slot.name.split(' - ').pop()} Code</label>
                  <input type="text" value={slotCodes[slot.name] || ''} onChange={e => setSlotCodes({...slotCodes, [slot.name]: e.target.value})} className="w-full px-4 py-2 text-[10px] font-mono rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none" placeholder="XXXX-XXXX-XXXX" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-400 mb-1 ml-1">Backup Codes (one per line)</label>
              <textarea value={newItem.backupCodes} onChange={e => setNewItem({...newItem, backupCodes: e.target.value})} rows={3} className="w-full px-4 py-2 text-[10px] font-mono rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none" placeholder="REC-001&#10;REC-002" />
            </div>
          </div>

          <Button 
            onClick={submitStock}
            disabled={isPsnEmailDup || isOutlookEmailDup || isAnySlotCodeDup || (!newItem.email && !newItem.password && !Object.values(slotCodes || {}).some(v => String(v || '').trim()) && !String(newItem.backupCodes || '').trim())}
            className="w-full rounded-2xl h-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200 dark:shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" /> Add final stock to {groupName || 'General'}
          </Button>
        </div>

        {groupItems && groupItems.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-[10px] bg-white dark:bg-gray-950">
              <thead className="bg-gray-50 dark:bg-gray-900 font-black uppercase text-gray-400 border-b border-gray-150 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3">Account Credentials</th>
                  <th className="px-4 py-3 text-center">Full Account</th>
                  <th className="px-4 py-3">Recovery & Region</th>
                  {slotsInGroup.map((slot: any) => <th key={slot.id} className="px-4 py-3">{slot.name.split(' - ').pop()}</th>)}
                  <th className="px-4 py-3">Backup Codes</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {groupItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 align-top">
                    <td className="px-4 py-3 min-w-[150px]">
                      <input type="text" value={item.email || ''} onChange={e => onUpdateItem(item.id, { email: e.target.value })} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-xs py-0.5 focus:border-red-500 focus:outline-none" placeholder="PSN Email" />
                      <input type="text" value={item.password || ''} onChange={e => onUpdateItem(item.id, { password: e.target.value })} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-0.5 focus:border-red-500 focus:outline-none mt-1.5 font-mono" placeholder="Password" />
                      <input type="text" value={item.onlineId || ''} onChange={e => onUpdateItem(item.id, { onlineId: e.target.value })} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-[9px] py-0.5 focus:border-red-500 focus:outline-none mt-1.5" placeholder="Online ID" />
                      {item.createdAt && <p className="text-[9px] text-gray-400 mt-1 italic">Added: {new Date(item.createdAt).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-4 py-3 text-center min-w-[80px]">
                       <div className="flex flex-col items-center gap-1.5 mt-1">
                         {item.fullAccountSold && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">✓ Sold</span>}
                         <label className="flex items-center gap-1 cursor-pointer">
                           <input type="checkbox" checked={!!item.fullAccountSold} onChange={e => onUpdateItem(item.id, { fullAccountSold: e.target.checked })} className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-gray-300" />
                           <span className="text-[9px] font-bold text-gray-500">Sold</span>
                         </label>
                       </div>
                    </td>
                    <td className="px-4 py-3 min-w-[150px] space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 uppercase w-10">Reg:</span>
                        <input type="text" value={item.region || ''} onChange={e => onUpdateItem(item.id, { region: e.target.value })} className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-0 focus:outline-none focus:border-red-500" placeholder="US" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 uppercase w-10">Mail:</span>
                        <input type="text" value={item.outlookEmail || ''} onChange={e => onUpdateItem(item.id, { outlookEmail: e.target.value })} className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-0 focus:outline-none focus:border-red-500 font-mono" placeholder="recovery@outlook.com" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 uppercase w-10">Pass:</span>
                        <input type="text" value={item.outlookPassword || ''} onChange={e => onUpdateItem(item.id, { outlookPassword: e.target.value })} className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-0 focus:outline-none focus:border-red-500 font-mono" placeholder="Password" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 uppercase w-10">Birth:</span>
                        <input type="text" value={item.birthdate || ''} onChange={e => onUpdateItem(item.id, { birthdate: e.target.value })} className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-0 focus:outline-none focus:border-red-500" placeholder="YYYY-MM-DD" />
                      </div>
                    </td>
                    {slotsInGroup.map((slot: any) => {
                      const data = item.slots?.[slot.name] || { code: '', sold: false };
                      return (
                        <td key={slot.id} className="px-4 py-3 min-w-[120px]">
                           <div className="flex flex-col gap-1.5">
                             <input type="text" value={data.code} onChange={e => onUpdateItemSlot(item.id, slot.name, { code: e.target.value })} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-xs py-0.5 focus:border-red-500 focus:outline-none font-mono" placeholder="CODE" />
                             <label className="flex items-center gap-1 cursor-pointer">
                               <input type="checkbox" checked={!!data.sold} onChange={e => onUpdateItemSlot(item.id, slot.name, { sold: e.target.checked })} className="w-3 h-3 rounded text-red-600" />
                               <span className={`text-[9px] font-black uppercase ${data.sold ? 'text-red-500' : 'text-gray-400'}`}>Sold</span>
                             </label>
                           </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 min-w-[120px]">
                      <textarea value={item.backupCodes || ''} onChange={e => onUpdateItem(item.id, { backupCodes: e.target.value })} rows={2} className="w-full bg-transparent border border-gray-200 dark:border-gray-850 rounded-lg p-1 text-[9px] font-mono focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-gray-950" placeholder="Backup codes" />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => onRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 mt-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    const validAttributes = attributes.filter(a => a.name.trim() && a.options.trim());
    if (validAttributes.length === 0) return;

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

    setCustomSlots([...customSlots, ...newSlots]);
    setIsOpen(false);
    setAttributes([{ name: '', options: '' }]);
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[10px] font-black uppercase flex items-center w-full justify-center py-4 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all mb-4"
      >
        <Plus className="w-4 h-4 mr-1" /> Generate Variants (Like Shopify)
      </Button>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 mb-6">
      <h5 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200 mb-4">Generate Variants</h5>
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
              className="w-full px-4 py-2 text-xs bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
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
              className="w-full px-4 py-2 text-xs bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemoveAttribute(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl mt-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-250 dark:border-gray-800">
        <button
          type="button"
          onClick={handleAddAttribute}
          className="text-xs font-bold text-red-600 hover:underline"
        >
          + Add another attribute
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-[10px] font-black uppercase text-gray-500 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-4 py-2 text-[10px] font-black uppercase text-white bg-red-600 hover:bg-red-700 rounded-xl"
          >
            Generate Combinations
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProductEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { settings, formatPrice } = useStoreSettings();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    instructions: '',
    category: '',
    subCategory: '',
    price: '',
    cost: '',
    stock: 0,
    image: '',
    digitalItems: [],
    sendEmailEnabled: false,
    emailTemplate: '',
    isRulesTemplate: false,
  });

  const [customSlots, setCustomSlots] = useState<any[]>([]);

  const isDigital = (formData.category || '').toLowerCase().includes('digital') || 
                   (formData.category || '').toLowerCase().includes('games') || 
                   (formData.category || '').toLowerCase().includes('playstation-plus') ||
                   (formData.category || '').toLowerCase().includes('gift-cards');
  
  const isGiftCard = (formData.category || '').toLowerCase().includes('gift-cards');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        const role = String(parsed?.user_metadata?.role || '').toLowerCase();
        const perms = parsed?.user_metadata?.permissions || {};
        const canWrite = perms.products === 'write' || perms.products === true;
        const isLegacyAdmin = role === 'admin' || role === 'manager';
        setIsAdmin(isLegacyAdmin || canWrite);
      }
    } catch(e) {}
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [catsRes, subCatsRes] = await Promise.all([categoriesAPI.getAll(), api.get('sub_categories')]);
      setCategories(catsRes || []);
      setSubCategories(subCatsRes || []);
      if (id) {
        const product = await productsAPI.getById(id);
        if (product) {
          const di = typeof product.digitalItems === 'string' ? JSON.parse(product.digitalItems) : (product.digitalItems || []);
          const slots = (product.product_variants || []).filter((v: any) => v.name.toLowerCase() !== 'full account').map((v: any) => ({
            id: crypto.randomUUID(), name: v.name, price: v.price?.toString() || '', cost: v.cost?.toString() || ''
          }));
          setFormData({ ...product, price: product.price?.toString() || '', cost: product.cost?.toString() || '', digitalItems: di });
          setCustomSlots(slots);
        }
      } else if (catsRes.length > 0) {
        setFormData(prev => ({ ...prev, category: catsRes[0].slug }));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      let di = formData.digitalItems;
      if (isDigital && !isGiftCard) {
        di = di.map((item: any) => {
          const slots = { ...(item.slots || {}) };
          customSlots.forEach(s => {
            if (!slots[s.name]) slots[s.name] = { sold: false, orderId: null, code: '', price: parseFloat(s.price) || 0, cost: parseFloat(s.cost) || 0 };
            else { slots[s.name].price = parseFloat(s.price) || 0; slots[s.name].cost = parseFloat(s.cost) || 0; }
          });
          return { ...item, slots };
        });
      }
      const stock = isDigital ? (isGiftCard ? di.length : countAvailableSlots(di, formData.category, formData.subCategory)) : (parseInt(formData.stock) || 0);
      const payload = {
        ...formData, price: parseFloat(formData.price) || 0, cost: parseFloat(formData.cost) || 0, stock, digitalItems: di,
        product_variants: customSlots.map(s => ({ name: s.name, price: parseFloat(s.price) || null, cost: parseFloat(s.cost) || null, stock: isDigital ? countAvailableForSlot(di, s.name, formData.category, formData.subCategory) : 0 })),
        emailTemplate: formData.isRulesTemplate ? 'rules_for_games' : formData.emailTemplate,
      };
      if (id) await productsAPI.update(id, payload);
      else await productsAPI.create(payload);
      navigate('/products');
    } catch (err) { alert('Failed to save'); } finally { setLoading(false); }
  };

  const onUpdateItem = (itemId: string, updates: any) => {
    setFormData(prev => ({
      ...prev, digitalItems: prev.digitalItems.map((i: any) => {
        if (i.id === itemId) {
          if (updates.fullAccountSold) {
             const slots = { ...(i.slots || {}) };
             Object.keys(slots).forEach(k => slots[k].sold = true);
             return { ...i, ...updates, slots };
          }
          return { ...i, ...updates };
        }
        return i;
      })
    }));
  };

  const onUpdateItemSlot = (itemId: string, slotName: string, slotUpdates: any) => {
    setFormData(prev => ({
      ...prev, digitalItems: prev.digitalItems.map((i: any) => {
        if (i.id === itemId) {
          const slots = { ...(i.slots || {}) };
          slots[slotName] = { ...(slots[slotName] || {}), ...slotUpdates };
          return { ...i, slots };
        }
        return i;
      })
    }));
  };

  const onAddStockItem = (groupName: string, newItem: any) => {
    const target = customSlots.filter(s => (s.name.includes(' - ') ? s.name.split(' - ')[0] : 'General') === groupName);
    const slots: Record<string, any> = {};
    target.forEach(s => slots[s.name] = { sold: false, orderId: null, code: newItem.slotCodes[s.name] || '', price: parseFloat(s.price) || 0, cost: parseFloat(s.cost) || 0 });
    const item = { ...newItem, id: crypto.randomUUID(), slots, assignedGroup: groupName, createdAt: new Date().toISOString() };
    setFormData(prev => ({ ...prev, digitalItems: [...prev.digitalItems, item] }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/products')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{id ? 'Edit Product' : 'Add New Product'}</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/products')} className="rounded-full px-6 h-10 font-black uppercase text-[10px]">Discard</Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 h-10 font-black uppercase text-[10px] shadow-lg shadow-red-200 dark:shadow-none"><Save className="w-4 h-4 mr-1.5" /> Save Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600"><Package className="w-5 h-5" /></div><h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Product Identity</h3></div>
            <div className="space-y-5">
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Title</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-red-500 transition-all focus:outline-none" placeholder="Product Title" /></div>
              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none appearance-none cursor-pointer">{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Sub Category</label><select value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} className="w-full px-5 py-3 text-sm font-bold bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none appearance-none cursor-pointer"><option value="">None</option>{subCategories.filter(s => s.categoryId === categories.find(c => c.slug === formData.category)?.id).map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}</select></div>
              </div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-5 py-4 text-sm font-medium bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl focus:ring-2 focus:ring-red-500 transition-all focus:outline-none" placeholder="Describe the product..." /></div>
            </div>
          </Card>

          {isDigital && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2"><div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200 dark:shadow-none"><Database className="w-5 h-5" /></div><h3 className="text-lg font-black uppercase tracking-tighter">Inventory Management</h3></div>
              {(() => {
                const grouped = customSlots.reduce((acc, s) => { const g = s.name.includes(' - ') ? s.name.split(' - ')[0] : 'General'; if (!acc[g]) acc[g] = []; acc[g].push(s); return acc; }, {} as any);
                return Object.entries(grouped).map(([g, slots]) => <GroupEditor key={g} groupName={g} slotsInGroup={slots} customSlots={customSlots} setCustomSlots={setCustomSlots} formData={formData} onAddStockItem={onAddStockItem} groupItems={formData.digitalItems.filter((i: any) => (i.assignedGroup || 'General') === g)} onRemoveItem={id => setFormData({...formData, digitalItems: formData.digitalItems.filter((i: any) => i.id !== id)})} onUpdateItem={onUpdateItem} onUpdateItemSlot={onUpdateItemSlot} isAdmin={isAdmin} setFormData={setFormData} />);
              })()}
              <VariantGenerator customSlots={customSlots} setCustomSlots={setCustomSlots} />
              <Button variant="secondary" onClick={() => setCustomSlots([...customSlots, { id: crypto.randomUUID(), name: 'New Group - Slot 1', price: '', cost: '' }])} className="w-full py-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-transparent text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all font-black uppercase tracking-widest text-[10px]"><Plus className="w-5 h-5 mr-2" /> Create New Group</Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><ImageIcon className="w-4 h-4" /></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Product Visual</h3></div>
            <div className="aspect-[4/5] w-full rounded-3xl bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center relative group">
              {formData.image ? (<><img src={normalizeImageSrc(formData.image)} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => setFormData({...formData, image: ''})} className="p-2.5 bg-red-600 text-white rounded-full"><Trash2 className="w-4 h-4" /></button></div></>) : (<div className="text-center p-6"><ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Click to Upload</p></div>)}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => { const file = e.target.files?.[0]; if (file) { try { const { url } = await uploadAPI.uploadImage(file); setFormData({...formData, image: normalizeImageSrc(url)}); } catch (err) {} } }} />
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600"><Shield className="w-4 h-4" /></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Pricing & Stock</h3></div>
            <div className="space-y-4">
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Base Price ({settings.currency_symbol})</label><input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-5 py-3 text-sm font-black bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500" /></div>
              {!isDigital && (<div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Physical Stock</label><input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-5 py-3 text-sm font-black bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500" /></div>)}
              {isAdmin && (<div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Cost Price</label><input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full px-5 py-3 text-sm font-black bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none" /></div>)}
            </div>
          </Card>

          {isDigital && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600"><Mail className="w-4 h-4" /></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Delivery</h3></div><label className="relative inline-flex items-center cursor-pointer scale-75"><input type="checkbox" checked={formData.sendEmailEnabled} onChange={e => setFormData({...formData, sendEmailEnabled: e.target.checked})} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div></label></div>
              {formData.sendEmailEnabled && (<div className="space-y-4 pt-2"><div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl"><span className="text-[10px] font-bold text-gray-600">Use Rules Template</span><input type="checkbox" checked={formData.isRulesTemplate} onChange={e => setFormData({...formData, isRulesTemplate: e.target.checked})} className="w-4 h-4 rounded text-red-600" /></div>{!formData.isRulesTemplate && (<textarea value={formData.emailTemplate} onChange={e => setFormData({...formData, emailTemplate: e.target.value})} rows={4} className="w-full p-4 text-[10px] font-mono bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none" placeholder="Email: {{email}}\nPassword: {{password}}..." />)}</div>)}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
