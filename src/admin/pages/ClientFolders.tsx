import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderPlus, Image as ImageIcon, Link as LinkIcon, 
  Trash2, Plus, Search, MoreVertical, ExternalLink, 
  Clock, CheckCircle2, AlertCircle, ChevronRight, X, Upload
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { clientFoldersAPI, uploadAPI, normalizeImageSrc } from '@/utils/api';

interface ClientFolder {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientFolderItem {
  id: string;
  folder_id: string;
  type: 'image' | 'link';
  content: string;
  uploader_info: string | null;
  created_at: string;
}

export function ClientFolders() {
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ClientFolder | null>(null);
  const [folderItems, setFolderItems] = useState<ClientFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  // Form states
  const [newFolder, setNewFolder] = useState({ name: '', description: '', is_public: false });
  const [newItem, setNewItem] = useState<{ type: 'image' | 'link', content: string, uploader_info: string }>({
    type: 'image',
    content: '',
    uploader_info: 'Admin'
  });

  const loadFolders = async () => {
    try {
      setLoading(true);
      const data = await clientFoldersAPI.getAll();
      setFolders(data || []);
    } catch (error) {
      console.error('Failed to load client folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderItems = async (folderId: string) => {
    try {
      setItemsLoading(true);
      const data = await clientFoldersAPI.getItems(folderId);
      setFolderItems(data || []);
    } catch (error) {
      console.error('Failed to load folder items:', error);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadFolderItems(selectedFolder.id);
    } else {
      setFolderItems([]);
    }
  }, [selectedFolder]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await clientFoldersAPI.create(newFolder);
      setFolders(prev => [data, ...prev]);
      setIsCreateModalOpen(false);
      setNewFolder({ name: '', description: '', is_public: false });
      setSelectedFolder(data);
    } catch (error) {
      alert('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;
    try {
      await clientFoldersAPI.delete(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolder?.id === id) setSelectedFolder(null);
    } catch (error) {
      alert('Failed to delete folder');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) return;
    try {
      const data = await clientFoldersAPI.addItem(selectedFolder.id, newItem);
      setFolderItems(prev => [data, ...prev]);
      setIsAddItemModalOpen(false);
      setNewItem({ type: 'image', content: '', uploader_info: 'Admin' });
    } catch (error) {
      alert('Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await clientFoldersAPI.deleteItem(id);
      setFolderItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      // Use existing request-images or a custom one if available. 
      // I'll use products upload as it's generic enough for admin testing or use the new client-assets route
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/uploads/client-assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('session') || '{}').access_token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setNewItem(prev => ({ ...prev, content: data.url }));
      }
    } catch (error) {
      alert('Upload failed');
    }
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-subtitle">Client Assets</p>
          <h1 className="admin-page-title">Folder System<span className="text-brand-red">.</span></h1>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-brand-red text-white flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </Button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Folders List Sidebar */}
        <Card className="w-80 flex flex-col bg-bg-secondary border-border-subtle overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-text-secondary">Loading...</div>
            ) : filteredFolders.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-secondary italic">No folders found</div>
            ) : (
              filteredFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className={`w-full text-left p-3 rounded-xl transition-all group flex items-center gap-3 ${
                    selectedFolder?.id === folder.id 
                      ? 'bg-brand-red/10 border border-brand-red/20' 
                      : 'hover:bg-bg-primary border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    selectedFolder?.id === folder.id ? 'bg-brand-red text-white' : 'bg-bg-primary text-text-secondary group-hover:text-brand-red'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-primary truncate">{folder.name}</div>
                    <div className="text-[10px] text-text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(folder.created_at).toLocaleDateString()}
                      {folder.is_public && (
                        <span className="ml-2 px-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded">Public</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-text-secondary transition-transform ${selectedFolder?.id === folder.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Folder Content Area */}
        <div className="flex-1 overflow-hidden">
          {!selectedFolder ? (
            <Card className="h-full flex flex-col items-center justify-center text-center space-y-4 bg-bg-secondary border-border-subtle p-8">
              <div className="w-20 h-20 rounded-full bg-bg-primary flex items-center justify-center">
                <Folder className="w-10 h-10 text-text-secondary opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Select a Folder</h3>
                <p className="text-text-secondary max-w-xs mx-auto mt-2">
                  Choose a folder from the sidebar to view client images and Drive links.
                </p>
              </div>
              <Button 
                variant="secondary"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4"
              >
                Create your first folder
              </Button>
            </Card>
          ) : (
            <div className="h-full flex flex-col space-y-6">
              {/* Folder Header */}
              <Card className="p-6 bg-bg-secondary border-border-subtle">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-text-primary uppercase tracking-wider italic">
                        {selectedFolder.name}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        selectedFolder.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedFolder.status}
                      </span>
                    </div>
                    {selectedFolder.description && (
                      <p className="text-sm text-text-secondary mt-1">{selectedFolder.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsAddItemModalOpen(true)}
                      className="bg-brand-red text-white text-xs h-9 px-4"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Asset
                    </Button>
                    <button 
                      onClick={() => handleDeleteFolder(selectedFolder.id)}
                      className="p-2 text-text-secondary hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>

              {/* Items Grid */}
              <div className="flex-1 overflow-y-auto">
                {itemsLoading ? (
                  <div className="h-full flex items-center justify-center text-text-secondary">Loading items...</div>
                ) : folderItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-border-subtle">
                    <ImageIcon className="w-12 h-12 text-text-secondary opacity-20 mb-4" />
                    <h4 className="font-bold text-text-primary">Folder is empty</h4>
                    <p className="text-sm text-text-secondary mt-1">Start by adding images or links for this client.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                    {folderItems.map(item => (
                      <Card key={item.id} className="group overflow-hidden bg-bg-secondary border-border-subtle hover:border-brand-red/30 transition-all">
                        {item.type === 'image' ? (
                          <div className="aspect-square relative overflow-hidden bg-black/5 flex items-center justify-center">
                            <img 
                              src={normalizeImageSrc(item.content)} 
                              alt="Asset" 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a 
                                href={normalizeImageSrc(item.content)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center p-6 bg-blue-50/50 dark:bg-blue-900/10">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4">
                              <LinkIcon className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 italic">Drive Link</p>
                              <a 
                                href={item.content} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-sm font-semibold text-text-primary hover:text-brand-red break-all line-clamp-2 px-2"
                              >
                                {item.content}
                              </a>
                            </div>
                          </div>
                        )}
                        <div className="p-3 border-t border-border-subtle bg-bg-secondary/50 flex justify-between items-center">
                          <div className="min-w-0">
                            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter truncate">
                              By {item.uploader_info || 'User'}
                            </p>
                            <p className="text-[9px] text-text-secondary/60">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-text-secondary hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Client Folder"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest italic text-text-secondary">Folder Name</label>
            <input
              type="text"
              required
              value={newFolder.name}
              onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Nexus Gaming Assets"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest italic text-text-secondary">Description</label>
            <textarea
              value={newFolder.description}
              onChange={(e) => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Internal notes about this folder..."
              rows={3}
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl">
            <input
              type="checkbox"
              id="is_public"
              checked={newFolder.is_public}
              onChange={(e) => setNewFolder(prev => ({ ...prev, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-border-subtle text-brand-red focus:ring-brand-red"
            />
            <label htmlFor="is_public" className="text-sm font-medium text-text-primary cursor-pointer select-none">
              Make folder visible to public website
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-brand-red text-white"
            >
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Add Asset to Folder"
      >
        <form onSubmit={handleAddItem} className="space-y-5">
          <div className="flex p-1 bg-bg-primary rounded-xl border border-border-subtle">
            <button
              type="button"
              onClick={() => setNewItem(prev => ({ ...prev, type: 'image', content: '' }))}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest italic rounded-lg transition-all ${
                newItem.type === 'image' ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm' : 'text-text-secondary'
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setNewItem(prev => ({ ...prev, type: 'link', content: '' }))}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest italic rounded-lg transition-all ${
                newItem.type === 'link' ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm' : 'text-text-secondary'
              }`}
            >
              Drive Link
            </button>
          </div>

          <div className="space-y-4">
            {newItem.type === 'image' ? (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest italic text-text-secondary">Image Selection</label>
                <div className="flex items-center gap-4">
                  {newItem.content ? (
                    <div className="w-24 h-24 rounded-xl relative overflow-hidden border border-border-subtle">
                      <img src={normalizeImageSrc(newItem.content)} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setNewItem(prev => ({ ...prev, content: '' }))}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-subtle rounded-2xl hover:border-brand-red/40 hover:bg-brand-red/5 transition-all cursor-pointer">
                      <Upload className="w-8 h-8 text-text-secondary mb-2" />
                      <span className="text-xs font-bold text-text-secondary">Click to upload image</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="text-center py-2 text-xs text-text-secondary">OR</div>
                <input
                  type="text"
                  value={newItem.content}
                  onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Paste direct image URL"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest italic text-text-secondary">Google Drive or External Link</label>
                <input
                  type="url"
                  required
                  value={newItem.content}
                  onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest italic text-text-secondary">Uploader Tag</label>
              <input
                type="text"
                value={newItem.uploader_info}
                onChange={(e) => setNewItem(prev => ({ ...prev, uploader_info: e.target.value }))}
                placeholder="Name or Email"
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={() => setIsAddItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!newItem.content}
              className="flex-1 bg-brand-red text-white"
            >
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
