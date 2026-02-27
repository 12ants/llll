import React, { useState, useRef } from 'react';
import { SiteSettings, MenuItem, MediaItem } from '../types';
import { StorageService, BackupData } from '../services/storageService';
import { 
  Save, Upload, X, LayoutTemplate, User, Calendar, 
  Type, Palette, Maximize, Square, Circle, AlignLeft, Code,
  Download, Database, AlertTriangle, Menu, Plus, Trash2, Link as LinkIcon,
  PanelTop, PanelBottom, AlignCenter, AlignJustify, AlignRight, SplitSquareHorizontal,
  Image as ImageIcon, Check, Film, Music, Shield, Webhook
} from 'lucide-react';
import { format } from 'date-fns';

interface SettingsProps {
  settings: SiteSettings;
  onSave: (settings: SiteSettings) => void;
}

const FONTS = [
    { name: 'Merriweather', type: 'Serif' },
    { name: 'Playfair Display', type: 'Serif' },
    { name: 'Lora', type: 'Serif' },
    { name: 'Inter', type: 'Sans' },
    { name: 'Roboto', type: 'Sans' },
    { name: 'JetBrains Mono', type: 'Mono' },
    { name: 'IBM Plex Mono', type: 'Mono' },
    { name: 'Space Mono', type: 'Mono' },
];

const COLORS = [
    { id: 'black', class: 'bg-black' },
    { id: 'zinc', class: 'bg-zinc-500' },
    { id: 'blue', class: 'bg-blue-600' },
    { id: 'red', class: 'bg-red-600' },
    { id: 'green', class: 'bg-emerald-700' },
    { id: 'orange', class: 'bg-orange-600' },
    { id: 'purple', class: 'bg-purple-600' },
    { id: 'pink', class: 'bg-pink-600' },
    { id: 'yellow', class: 'bg-yellow-500' },
    { id: 'teal', class: 'bg-teal-600' },
];

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<SiteSettings>(settings);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Media Picker State
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(StorageService.getMedia());

  // Menu State
  const [newMenuLabel, setNewMenuLabel] = useState('');
  const [newMenuUrl, setNewMenuUrl] = useState('');

  const handleChange = (field: keyof SiteSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(formData);
    setIsDirty(false);
  };

  const handleExport = () => {
      const data = StorageService.getBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zenpress-backup-${format(Date.now(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Use a custom confirm or just proceed with a warning in the UI before this step? 
      // For now, we'll stick to window.confirm but ensure it's robust.
      // We can also check if the file is valid JSON before confirming.
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = event.target?.result;
              if (typeof result !== 'string') {
                  throw new Error("Failed to read file content");
              }
              
              let json: BackupData;
              try {
                  json = JSON.parse(result);
              } catch (parseError) {
                  alert("Error: The file is not valid JSON.");
                  return;
              }

              // Basic validation
              if (!json || typeof json !== 'object') {
                  alert("Error: Invalid backup data format.");
                  return;
              }

              if (!window.confirm(`Ready to restore backup from ${format(json.timestamp || Date.now(), 'yyyy-MM-dd')}? \n\nWARNING: This will overwrite ${StorageService.getPosts().length} posts and current settings.`)) {
                  return;
              }

              const success = StorageService.restoreBackup(json);
              if (success) {
                  alert("System restored successfully. The application will now reload.");
                  window.location.reload();
              } else {
                  alert("Error: Restore failed. The backup file might be corrupted or missing required fields (posts, settings).");
              }
          } catch (err) {
              console.error(err);
              alert("An unexpected error occurred during import.");
          } finally {
              if (importInputRef.current) importInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  const handleClearData = () => {
      if (window.confirm("DANGER: This will wipe ALL posts, settings, and media. This cannot be undone. Are you sure?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const addMenuItem = () => {
      if (!newMenuLabel || !newMenuUrl) return;
      const newItem: MenuItem = {
          id: crypto.randomUUID(),
          label: newMenuLabel,
          url: newMenuUrl
      };
      handleChange('navigation', [...(formData.navigation || []), newItem]);
      setNewMenuLabel('');
      setNewMenuUrl('');
  };

  const removeMenuItem = (id: string) => {
      handleChange('navigation', (formData.navigation || []).filter(item => item.id !== id));
  };

  const handleSelectLogo = (url: string) => {
      handleChange('logoUrl', url);
      setShowMediaPicker(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-mono text-sm relative">
       {/* Media Picker Modal for Logo */}
       {showMediaPicker && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <header className="p-6 border-b border-gray-100 flex items-center justify-between">
                      <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight">Select Logo</h3>
                          <p className="text-xs text-gray-500 mt-1">Choose an image from your library</p>
                      </div>
                      <button onClick={() => setShowMediaPicker(false)} className="p-2 hover:bg-gray-100"><X size={20} /></button>
                  </header>
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                          {mediaItems.filter(m => m.mediaType === 'image' || m.type.startsWith('image/')).map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => handleSelectLogo(item.url)}
                                    className="group relative aspect-square bg-white border border-gray-200 hover:border-black transition-all focus:outline-none overflow-hidden"
                                >
                                    <img src={item.url} alt={item.name} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </button>
                          ))}
                      </div>
                      {mediaItems.length === 0 && (
                          <div className="text-center py-10 text-gray-400">
                              No images found. Upload images in the Media Library first.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <header className="mb-8 flex items-center justify-between">
        <div>
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">System Configuration</h2>
            <p className="text-gray-500 mt-1 text-xs">Manage global parameters and visual DNA.</p>
        </div>
        {isDirty && (
            <button 
                onClick={handleSave}
                className="bg-black text-white px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 animate-in fade-in slide-in-from-right-2"
            >
                <Save size={14} /> Save Changes
            </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
            {/* Header & Identity */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <PanelTop size={12} /> Header Configuration
                </h3>
                
                <div className="grid gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Site Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Tagline</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors h-16 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Brand Mark / Logo</label>
                        <div className="flex items-start gap-4">
                            <div className="h-20 w-20 bg-gray-50 border border-gray-200 flex items-center justify-center relative overflow-hidden">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <ImageIcon className="text-gray-300" size={24} />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => {
                                        setMediaItems(StorageService.getMedia());
                                        setShowMediaPicker(true);
                                    }}
                                    className="bg-black text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800"
                                >
                                    Select from Library
                                </button>
                                {formData.logoUrl && (
                                    <button 
                                        onClick={() => handleChange('logoUrl', '')}
                                        className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider text-left"
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                             <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Layout Geometry</label>
                             <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 border border-gray-200">
                                <button 
                                    onClick={() => handleChange('headerStyle', 'left')}
                                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${formData.headerStyle === 'left' ? 'bg-white shadow-sm border border-gray-200 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Left Stacked"
                                >
                                    <AlignJustify size={14} />
                                    <span className="text-[8px] uppercase font-bold">Left</span>
                                </button>
                                <button 
                                    onClick={() => handleChange('headerStyle', 'center')}
                                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${formData.headerStyle === 'center' ? 'bg-white shadow-sm border border-gray-200 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Center Stacked"
                                >
                                    <AlignCenter size={14} />
                                    <span className="text-[8px] uppercase font-bold">Center</span>
                                </button>
                                <button 
                                    onClick={() => handleChange('headerStyle', 'split')}
                                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${formData.headerStyle === 'split' ? 'bg-white shadow-sm border border-gray-200 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Split (Standard)"
                                >
                                    <SplitSquareHorizontal size={14} />
                                    <span className="text-[8px] uppercase font-bold">Split</span>
                                </button>
                                <button 
                                    onClick={() => handleChange('headerStyle', 'right')}
                                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${formData.headerStyle === 'right' ? 'bg-white shadow-sm border border-gray-200 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Right Reverse"
                                >
                                    <AlignRight size={14} />
                                    <span className="text-[8px] uppercase font-bold">Right</span>
                                </button>
                             </div>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Behavior</label>
                             <div className="space-y-2">
                                 <button 
                                    onClick={() => handleChange('stickyHeader', !formData.stickyHeader)}
                                    className={`w-full p-2.5 border text-xs font-bold uppercase tracking-wider transition-colors ${formData.stickyHeader ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                                 >
                                     {formData.stickyHeader ? 'Sticky Header: ON' : 'Sticky Header: OFF'}
                                 </button>
                                 <button 
                                    onClick={() => handleChange('showAdminButtons', !formData.showAdminButtons)}
                                    className={`w-full p-2.5 border text-xs font-bold uppercase tracking-wider transition-colors ${formData.showAdminButtons !== false ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                                 >
                                     {formData.showAdminButtons !== false ? 'Admin Overlay: ON' : 'Admin Overlay: OFF'}
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

             {/* Navigation Builder */}
             <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Menu size={12} /> Menu System
                </h3>

                <div className="space-y-4">
                    <ul className="space-y-2">
                        {(formData.navigation || []).map((item) => (
                            <li key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 border border-gray-200">
                                <span className="font-bold text-xs flex-1">{item.label}</span>
                                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">{item.url}</span>
                                <button onClick={() => removeMenuItem(item.id)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                    
                    <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
                        <div className="flex-1">
                             <input 
                                type="text" 
                                placeholder="Label (e.g. About)" 
                                className="w-full text-xs p-2 border border-gray-200 mb-1"
                                value={newMenuLabel}
                                onChange={(e) => setNewMenuLabel(e.target.value)}
                             />
                             <input 
                                type="text" 
                                placeholder="URL (e.g. /about)" 
                                className="w-full text-xs p-2 border border-gray-200"
                                value={newMenuUrl}
                                onChange={(e) => setNewMenuUrl(e.target.value)}
                             />
                        </div>
                        <button 
                            onClick={addMenuItem}
                            disabled={!newMenuLabel || !newMenuUrl}
                            className="bg-black text-white p-2 h-full flex items-center justify-center disabled:opacity-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </section>

             {/* Footer Configuration */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <PanelBottom size={12} /> Footer Configuration
                </h3>
                <div className="grid gap-4">
                     <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Copyright Text</label>
                        <textarea 
                            value={formData.footerText} 
                            onChange={(e) => handleChange('footerText', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors h-20 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Twitter Handle</label>
                            <input 
                                type="text" 
                                placeholder="@username"
                                value={formData.socialTwitter || ''} 
                                onChange={(e) => handleChange('socialTwitter', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors"
                            />
                        </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Github Handle</label>
                            <input 
                                type="text" 
                                placeholder="username"
                                value={formData.socialGithub || ''} 
                                onChange={(e) => handleChange('socialGithub', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div className="space-y-8">
            {/* Design System: Typography & Color */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Palette size={12} /> Visual Language
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Accent Theme</label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map(color => (
                                <button
                                    key={color.id}
                                    onClick={() => handleChange('accentColor', color.id)}
                                    className={`w-8 h-8 md:w-10 md:h-10 border-2 transition-all ${color.class} ${formData.accentColor === color.id ? 'border-gray-900 ring-2 ring-gray-200 scale-110 ring-offset-2' : 'border-transparent hover:scale-105'}`}
                                    title={color.id}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Primary Typeface</label>
                        <select 
                            value={formData.fontFamily}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            className="w-full p-2 border border-gray-200 bg-white text-sm focus:border-black focus:ring-0"
                            style={{ fontFamily: formData.fontFamily }}
                        >
                            {FONTS.map(font => (
                                <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                    {font.name} ({font.type})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* Geometry & Layout */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Maximize size={12} /> Geometry
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Corner Radius</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'none', label: 'Sharp', icon: Square },
                                { id: 'subtle', label: 'Soft', icon: Square },
                                { id: 'pill', label: 'Round', icon: Circle }
                            ].map(radius => (
                                <button
                                    key={radius.id}
                                    onClick={() => handleChange('borderRadius', radius.id)}
                                    className={`p-3 border flex flex-col items-center gap-2 transition-all ${formData.borderRadius === radius.id ? 'border-black bg-gray-50' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <radius.icon size={16} className={radius.id === 'subtle' ? 'rounded-md' : ''} />
                                    <span className="text-[9px] font-bold uppercase">{radius.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Article Width</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'compact', label: 'Compact' },
                                { id: 'standard', label: 'Default' },
                                { id: 'relaxed', label: 'Wide' }
                            ].map(width => (
                                <button
                                    key={width.id}
                                    onClick={() => handleChange('contentWidth', width.id)}
                                    className={`p-3 border flex flex-col items-center transition-all ${formData.contentWidth === width.id ? 'border-black bg-gray-50' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <div className={`h-1 bg-current mb-2 ${width.id === 'compact' ? 'w-4' : width.id === 'standard' ? 'w-8' : 'w-full'}`} />
                                    <span className="text-[9px] font-bold uppercase">{width.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

             {/* Custom CSS */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Code size={12} /> Advanced Styling
                </h3>
                <div>
                    <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Global CSS Injection</label>
                    <textarea
                        value={formData.customCss || ''}
                        onChange={(e) => handleChange('customCss', e.target.value)}
                        className="w-full bg-gray-900 text-gray-300 font-mono text-xs p-4 focus:outline-none min-h-[100px] rounded-sm"
                        placeholder="/* Override global styles here */"
                        spellCheck={false}
                    />
                </div>
            </section>

            {/* Security */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Shield size={12} /> Security
                </h3>
                <div className="grid gap-4">
                     <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Admin Email</label>
                        <input 
                            type="email" 
                            value={formData.adminEmail || ''} 
                            onChange={(e) => handleChange('adminEmail', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Password</label>
                        <input 
                            type="password" 
                            value={formData.adminPassword || ''} 
                            onChange={(e) => handleChange('adminPassword', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </section>

            {/* Integrations */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Webhook size={12} /> Integrations
                </h3>
                <div>
                    <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2">Build Webhook URL</label>
                    <input 
                        type="url" 
                        placeholder="https://api.netlify.com/build_hooks/..."
                        value={formData.webhookUrl || ''} 
                        onChange={(e) => handleChange('webhookUrl', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 focus:border-black focus:outline-none transition-colors mb-2"
                    />
                    <p className="text-[9px] text-gray-500">Triggered when publishing from the deployment view.</p>
                </div>
            </section>

            {/* Data Management */}
            <section className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-2">
                    <Database size={12} /> Data Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-gray-200 bg-gray-50">
                        <h4 className="text-xs font-bold text-black uppercase mb-2">Export Data</h4>
                        <p className="text-[10px] text-gray-500 mb-4">Download a JSON backup of all posts, settings, and media URLs.</p>
                        <button 
                            onClick={handleExport}
                            className="w-full bg-white border border-gray-300 hover:border-black text-black px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                            <Download size={14} /> Download Backup
                        </button>
                    </div>

                    <div className="p-4 border border-gray-200 bg-gray-50">
                        <h4 className="text-xs font-bold text-black uppercase mb-2">Import Data</h4>
                        <p className="text-[10px] text-gray-500 mb-4 flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" /> Overwrites all current system data.
                        </p>
                        <input 
                            type="file" 
                            ref={importInputRef} 
                            className="hidden" 
                            accept=".json"
                            onChange={handleImport}
                        />
                        <button 
                            onClick={() => importInputRef.current?.click()}
                            className="w-full bg-black text-white border border-black hover:bg-gray-800 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                            <Upload size={14} /> Upload Backup
                        </button>
                    </div>

                    <div className="p-4 border border-red-200 bg-red-50 col-span-full">
                        <h4 className="text-xs font-bold text-red-600 uppercase mb-2">Danger Zone</h4>
                        <p className="text-[10px] text-red-500 mb-4">Irreversibly wipe all local data.</p>
                        <button 
                            onClick={handleClearData}
                            className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> Factory Reset
                        </button>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;