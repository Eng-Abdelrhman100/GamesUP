import React, { useState, useEffect } from 'react';
import { 
  Upload, Link as LinkIcon, CheckCircle2, AlertCircle, 
  ArrowLeft, ImageIcon, Loader2, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { clientFoldersAPI } from '../utils/api';

export function ClientUploadPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'link'>('image');
  const [content, setContent] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');
  
  // File preview
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadPublicFolders();
  }, []);

  const loadPublicFolders = async () => {
    try {
      setLoading(true);
      const data = await clientFoldersAPI.getAll();
      // Backend already filters for is_public and Active status for non-admins
      setFolders(data || []);
      if (data && data.length > 0) setSelectedFolderId(data[0].id);
    } catch (err) {
      setError('Could not load submission folders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) {
      setError('Please select a folder');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let finalContent = content;

      // 1. If it's an image file, upload it first
      if (uploadType === 'image' && file) {
        const formData = new FormData();
        formData.append('file', file);
        const upRes = await fetch('/api/uploads/client-assets', {
          method: 'POST',
          body: formData
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Image upload failed');
        finalContent = upData.url;
      }

      if (!finalContent) {
        throw new Error('Please provide an image or a link');
      }

      // 2. Submit to the folder
      await clientFoldersAPI.addItem(selectedFolderId, {
        type: uploadType,
        content: finalContent,
        uploader_info: `${uploaderName} (${uploaderEmail})`.trim()
      });

      setSuccess(true);
      // Reset form
      setContent('');
      setPreview(null);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check your data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
          <p className="text-white font-black uppercase italic tracking-widest">Loading Submission Portal...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <Card className="max-w-md w-full p-10 text-center bg-zinc-900 border-zinc-800 shadow-2xl">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Submission Received!</h2>
          <p className="text-zinc-400 mb-8">
            Your asset has been successfully uploaded to the client folder. The Nexus team will review it shortly.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => setSuccess(false)}
              className="w-full bg-brand-red text-white py-6"
            >
              Upload Another
            </Button>
            <Link to="/" className="block text-zinc-500 hover:text-white transition-colors uppercase font-bold text-xs tracking-widest italic mt-4">
              Return to Home
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="uppercase font-bold text-xs tracking-widest italic">Back to Store</span>
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">
            Nexus <span className="text-brand-red">Submission</span> Portal
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            Upload project assets, game screenshots, or Drive links directly to your assigned client folder.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold uppercase italic tracking-wider">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Folder Selection */}
          <div className="space-y-4">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] italic">01. Select Your Project Folder</label>
            {folders.length === 0 ? (
              <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center">
                <p className="text-zinc-500 italic">No public folders available at the moment. Please contact support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {folders.map(folder => (
                  <label 
                    key={folder.id}
                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedFolderId === folder.id 
                        ? 'bg-brand-red/10 border-brand-red ring-4 ring-brand-red/10' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="folder" 
                      value={folder.id} 
                      className="absolute opacity-0"
                      onChange={() => setSelectedFolderId(folder.id)}
                      checked={selectedFolderId === folder.id}
                    />
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedFolderId === folder.id ? 'bg-brand-red text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-black uppercase italic tracking-wider ${selectedFolderId === folder.id ? 'text-white' : 'text-zinc-400'}`}>
                          {folder.name}
                        </p>
                        {folder.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{folder.description}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Asset Type */}
          <div className="space-y-4">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] italic">02. Choose Asset Type</label>
            <div className="flex p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm">
              <button
                type="button"
                onClick={() => { setUploadType('image'); setContent(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black uppercase italic tracking-widest text-xs ${
                  uploadType === 'image' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Upload className="w-4 h-4" />
                Image
              </button>
              <button
                type="button"
                onClick={() => { setUploadType('link'); setContent(''); setPreview(null); setFile(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black uppercase italic tracking-widest text-xs ${
                  uploadType === 'link' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Link
              </button>
            </div>
          </div>

          {/* Step 3: Content */}
          <div className="space-y-4">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] italic">03. Provide Content</label>
            
            {uploadType === 'image' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div 
                  className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all group relative overflow-hidden ${
                    preview ? 'border-brand-red' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => {setPreview(null); setFile(null);}}
                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-zinc-700 mb-3 group-hover:text-zinc-500 transition-colors" />
                      <p className="text-zinc-500 font-bold uppercase italic tracking-widest text-[10px]">Drop image here or click</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-zinc-500 text-sm italic">
                    Supported formats: JPG, PNG, WEBP. Max size 10MB.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Or paste direct image URL..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-red transition-colors font-medium"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-red transition-colors font-medium"
                  disabled={submitting}
                />
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest italic mt-3 ml-1">
                  Ensure the link is public or shared with the Nexus team.
                </p>
              </div>
            )}
          </div>

          {/* Step 4: Uploader Info */}
          <div className="space-y-4">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] italic">04. Your Information</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-red transition-colors font-medium"
                disabled={submitting}
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={uploaderEmail}
                onChange={(e) => setUploaderEmail(e.target.value)}
                className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-brand-red transition-colors font-medium"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-8">
            <Button
              type="submit"
              disabled={submitting || !selectedFolderId}
              className="w-full md:w-auto min-w-[200px] bg-brand-red text-white py-8 rounded-3xl shadow-2xl shadow-brand-red/20 group relative overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="uppercase font-black italic tracking-widest">Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    <span className="uppercase font-black italic tracking-widest text-lg">Submit Asset</span>
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
