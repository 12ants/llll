import React, { useRef, useState, useCallback, useMemo } from 'react';
import { MediaItem } from '../types';
import { 
  Upload, Trash2, Copy, Image as ImageIcon, Film, Music, 
  MoveDown, Search, X, Maximize2, Play, Info, Download, 
  Clock, HardDrive, FileText, ExternalLink, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import ImageEditor from './ImageEditor';

interface MediaLibraryProps {
  media: MediaItem[];
  onUpload: (item: MediaItem) => void;
  onDelete: (id: string) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ media, onUpload, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor & Preview State
  const [fileToEdit, setFileToEdit] = useState<File | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const filteredMedia = useMemo(() => {
    return media.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [media, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Max 5MB for local demo.");
        return;
    }

    if (file.type.startsWith('image/')) {
        setFileToEdit(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
        processUpload(file);
    }
  };

  const processUpload = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const newItem: MediaItem = {
        id: crypto.randomUUID(),
        url: reader.result as string,
        name: file.name,
        type: file.type,
        mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        createdAt: Date.now(),
        size: file.size
      };
      onUpload(newItem);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleEditorSave = (editedFile: File) => {
      setFileToEdit(null);
      processUpload(editedFile);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const PreviewModal = () => {
    if (!previewItem) return null;
    const isVideo = previewItem.mediaType === 'video';
    const isAudio = previewItem.mediaType === 'audio';

    return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 md:p-12 animate-in fade-in duration-300" onClick={() => setPreviewItem(null)}>
        <button className="absolute top-4 right-4 z-[110] text-white/50 hover:text-white transition-colors bg-black/20 p-2 rounded-full md:bg-transparent" onClick={() => setPreviewItem(null)}>
            <X size={24} className="md:w-8 md:h-8" />
        </button>
        
        <div className="w-full max-w-6xl h-full flex flex-col md:flex-row bg-gray-900 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex-1 bg-black flex items-center justify-center p-4 relative group min-h-[50vh] md:min-h-0">
                {isVideo ? (
                    <video src={previewItem.url} controls className="max-w-full max-h-full" />
                ) : isAudio ? (
                    <div className="flex flex-col items-center gap-8 w-full px-6 md:px-12">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                            <Music size={48} className="md:size-[64px]" />
                        </div>
                        <audio src={previewItem.url} controls className="w-full" />
                    </div>
                ) : (
                    <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-full object-contain" />
                )}
            </div>

            <div className="w-full md:w-80 bg-gray-900 border-t md:border-t-0 md:border-l border-white/10 p-4 md:p-6 flex flex-col text-sm overflow-y-auto">
                <div className="mb-6 md:mb-8">
                    <h3 className="text-white font-bold text-lg leading-tight break-words mb-2">{previewItem.name}</h3>
                    <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                            {previewItem.type}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                            {previewItem.mediaType}
                        </span>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-400">
                        <Clock size={16} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-600">Imported</p>
                            <p className="text-xs text-gray-300">{format(previewItem.createdAt, 'MMM d, yyyy HH:mm')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                        <HardDrive size={16} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-600">Payload</p>
                            <p className="text-xs text-gray-300">{formatBytes(previewItem.size)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 overflow-hidden">
                        <Info size={16} className="shrink-0" />
                        <div className="overflow-hidden">
                            <p className="text-[10px] uppercase font-bold text-gray-600">System ID</p>
                            <p className="text-[10px] font-mono text-gray-500 truncate">{previewItem.id}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/10 mt-auto">
                    <button 
                        onClick={() => copyToClipboard(previewItem.url, previewItem.id)}
                        className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${copiedId === previewItem.id ? 'bg-green-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                        <Copy size={14} /> {copiedId === previewItem.id ? 'Copied Link' : 'Copy Resource URL'}
                    </button>
                    <a 
                        href={previewItem.url} 
                        download={previewItem.name}
                        className="w-full bg-gray-800 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={14} /> Download File
                    </a>
                    <button 
                        onClick={() => { if(confirm('Purge from library?')) { onDelete(previewItem.id); setPreviewItem(null); } }}
                        className="w-full py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> Delete Asset
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div 
        className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col font-mono relative"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
      {/* Highest priority overlay: Image Editor */}
      {fileToEdit && (
          <ImageEditor 
            file={fileToEdit} 
            onSave={handleEditorSave} 
            onCancel={() => setFileToEdit(null)} 
          />
      )}

      {previewItem && <PreviewModal />}
      
      {isDragging && (
          <div className="absolute inset-0 bg-black/5 z-50 border-4 border-black border-dashed m-4 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm animate-in fade-in rounded-xl">
              <MoveDown size={48} className="mb-4 animate-bounce" />
              <h3 className="text-xl font-bold uppercase tracking-widest">Drop to Import</h3>
          </div>
      )}

      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black uppercase tracking-tight">Resource Index</h2>
          <p className="text-gray-500 mt-1 text-xs">Binary storage and asset management.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={14} />
            <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-9 pr-3 py-2 border border-gray-200 bg-white focus:outline-none focus:border-black text-xs w-full sm:w-64 transition-colors placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-black text-white px-5 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 transition-transform active:scale-95 shadow-lg"
          >
            <Upload size={14} />
            {isUploading ? 'Encoding...' : 'Upload Asset'}
          </button>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*,audio/*"
          onChange={handleFileChange} 
        />
      </header>

      {media.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 group hover:border-black hover:text-black transition-all cursor-pointer rounded-xl p-8" onClick={() => fileInputRef.current?.click()}>
          <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
             <ImageIcon size={24} className="opacity-20 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-center">Archive Empty</p>
          <p className="text-xs mt-2 font-medium text-center">Drag assets here or tap to explore local files.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredMedia.map((item) => {
            const isVideo = item.mediaType === 'video';
            const isAudio = item.mediaType === 'audio';
            
            return (
                <div key={item.id} className="group flex flex-col animate-in fade-in slide-in-from-bottom-2">
                    <div 
                        className="aspect-square bg-white border border-gray-200 overflow-hidden relative flex items-center justify-center cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        onClick={() => setPreviewItem(item)}
                    >
                        {isVideo ? (
                            <div className="w-full h-full bg-black relative">
                                <video src={item.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                                        <Play size={16} fill="white" />
                                    </div>
                                </div>
                            </div>
                        ) : isAudio ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-gray-400">
                                <Music size={32} />
                                <div className="absolute top-2 left-2 bg-black text-[8px] font-bold text-white px-1 py-0.5 rounded uppercase">Audio</div>
                            </div>
                        ) : (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <Maximize2 size={24} className="text-white scale-75 group-hover:scale-100 transition-transform" />
                            {!isVideo && !isAudio && (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // Simple hack to trigger the editor with a mock file or just re-fetch the blob
                                        fetch(item.url).then(res => res.blob()).then(blob => {
                                            setFileToEdit(new File([blob], item.name, { type: item.type }));
                                        });
                                    }}
                                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                                    title="Edit Image"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-2 flex items-start justify-between gap-2 overflow-hidden">
                        <div className="overflow-hidden">
                            <h4 className="text-[10px] font-bold text-gray-900 truncate uppercase tracking-tighter" title={item.name}>{item.name}</h4>
                            <div className="flex items-center gap-1.5 text-[8px] text-gray-400 mt-0.5 uppercase font-bold tracking-widest">
                                <span>{formatBytes(item.size)}</span>
                                <span className="opacity-30">•</span>
                                <span className="truncate max-w-[40px]">{item.mediaType}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(item.url, item.id); }}
                                className={`p-1.5 transition-colors rounded ${copiedId === item.id ? 'text-green-600' : 'text-gray-300 hover:text-black'}`}
                                title="Copy URI"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            );
          })}
          {filteredMedia.length === 0 && (
             <div className="col-span-full py-24 text-center border border-dashed border-gray-200 text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                 Zero assets match your query
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;