import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Post, PostStatus, MediaItem, SiteSettings, PostType } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import ImageEditor from './ImageEditor';
import { 
  ArrowLeft, Eye, EyeOff, Image as ImageIcon, 
  MoreVertical, X, Bold, Italic, Heading1, Heading2, 
  Quote, List, Link as LinkIcon, Upload,
  Maximize2, Minimize2, Code, FileImage, Minus, Save, Film, Clock, Youtube,
  Music, Loader2, Check, AlertTriangle, FileText, Layout, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, MessageSquare, Repeat, VolumeX, PlayCircle, Layers, Trash2, BoxSelect,
  Palette, MoveDown, Plus, Zap, Sparkles, Search, Filter, Play, Info
} from 'lucide-react';
import { format } from 'date-fns';

interface EditorProps {
  post?: Post;
  media: MediaItem[];
  onSave: (post: Post, shouldNavigate?: boolean) => void;
  onCancel: () => void;
  onUploadMedia: (item: MediaItem) => void;
}

const VIDEO_FALLBACK_HTML = `<div class="w-full my-8 aspect-video bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-500 font-mono relative overflow-hidden group"><div class="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="3" x2="21" y1="3" y2="21" /></svg><p class="text-xs font-bold uppercase tracking-widest text-gray-600 z-10">Video Signal Lost</p><p class="text-[10px] text-gray-400 mt-1 z-10">Unable to load media source</p></div>`;

const VIDEO_ERROR_ATTR = `onerror='this.outerHTML=\`${VIDEO_FALLBACK_HTML}\`'`;

const legacyMarkdownToHtml = (text: string, media: MediaItem[]) => {
    let html = text
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*)\*/gim, '<i>$1</i>')
        .replace(/!\[(.*?)\]\((.*?\.(mp4|webm|ogg|mov))\)/gim, `<video src='$2' controls class='max-w-full h-auto my-6 border border-gray-200 block' contenteditable='false' ${VIDEO_ERROR_ATTR}></video>`)
        .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' contenteditable='false' />")
        .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2'>$1</a>")
        .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/\n/gim, '<br />');

    html = html.replace(/asset:\/\/([a-zA-Z0-9-]+)/g, (match, id) => {
        const item = media.find(m => m.id === id);
        return item ? item.url : match;
    });

    return html;
};

const processPreviewContent = (html: string, fontFamily: string) => {
    let processed = html;

    processed = processed.replace(/<video(.*?)>/g, (match, attributes) => {
        let newAttrs = attributes;
        if (!newAttrs.includes('onerror=')) {
            newAttrs = `${VIDEO_ERROR_ATTR} ${newAttrs}`;
        }
        if (!newAttrs.includes('controls')) {
            newAttrs += ' controls';
        }
        const responsiveClasses = "max-w-full h-auto w-full my-6 border border-gray-200 block";
        if (!newAttrs.includes('class=')) {
            newAttrs += ` class="${responsiveClasses}"`;
        } else {
             newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${responsiveClasses}${q}`);
        }
        return `<video${newAttrs}>`;
    });
    const videoUrlRegex = /(?<!src=["'])(?<!src=)(https?:\/\/[^\s<"]+\.(mp4|webm|ogg|mov))/g;
    processed = processed.replace(videoUrlRegex, `<video ${VIDEO_ERROR_ATTR} src="$1" controls class="w-full max-w-full h-auto my-6 border border-gray-200 block"></video>`);

    processed = processed.replace(/<audio(.*?)>/g, (match, attributes) => {
        let newAttrs = attributes;
        if (!newAttrs.includes('controls')) {
            newAttrs += ' controls';
        }
        const responsiveClasses = "w-full my-6 border border-gray-200 block";
        if (!newAttrs.includes('class=')) {
            newAttrs += ` class="${responsiveClasses}"`;
        } else {
             newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${responsiveClasses}${q}`);
        }
        return `<audio${newAttrs}>`;
    });
    
    processed = processed.replace(/<img([^>]*)>/g, (match, attrs) => {
        if (attrs.includes('data-gallery="true"')) {
            return `<img${attrs}>`;
        }
        let newAttrs = attrs;
        const additionalClasses = `cursor-zoom-in transition-transform hover:scale-[1.01]`;
        if (newAttrs.includes('class=')) {
            newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${additionalClasses}${q}`);
        } else {
            newAttrs += ` class="max-w-full h-auto my-6 border border-gray-200 block ${additionalClasses}"`;
        }
        return `<img${newAttrs}>`;
    });

    return processed;
};

const Editor: React.FC<EditorProps> = ({ post, media, onSave, onCancel, onUploadMedia }) => {
  const settings = StorageService.getSettings();
  const [postId] = useState(post?.id || crypto.randomUUID());
  
  const [title, setTitle] = useState(post?.title || '');
  const [status, setStatus] = useState<PostStatus>(post?.status || PostStatus.DRAFT);
  const [type, setType] = useState<PostType>(post?.type || 'post');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [previewContent, setPreviewContent] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'content' | 'cover'>('content');
  const [linkMode, setLinkMode] = useState<'none' | 'file' | 'custom'>('none');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilter, setPickerFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [pickerPreviewItem, setPickerPreviewItem] = useState<MediaItem | null>(null);
  const [pickerTab, setPickerTab] = useState<'library' | 'url'>('library');
  const [externalUrl, setExternalUrl] = useState('');

  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [refreshOverlay, setRefreshOverlay] = useState(0);

  const [modalImage, setModalImage] = useState<string | null>(null);
  const [fileToEdit, setFileToEdit] = useState<File | null>(null);
  const editorUploadInputRef = useRef<HTMLInputElement>(null);

  // Pop-up UI States
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [popupUrl, setPopupUrl] = useState('');

  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  // Refs for positioning fixed dropdowns
  const sizeBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const youtubeBtnRef = useRef<HTMLButtonElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredMedia = useMemo(() => {
    return media.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(pickerSearch.toLowerCase());
        const matchesFilter = pickerFilter === 'all' || item.mediaType === pickerFilter;
        return matchesSearch && matchesFilter;
    });
  }, [media, pickerSearch, pickerFilter]);

  useEffect(() => {
    if (editorRef.current) {
        const initialContent = post?.content || '';
        const isHtml = initialContent.trim().startsWith('<');
        let contentToSet = initialContent;
        if (!isHtml) {
            contentToSet = legacyMarkdownToHtml(initialContent, media);
        } else {
            contentToSet = contentToSet.replace(/asset:\/\/([a-zA-Z0-9-]+)/g, (match, id) => {
                const item = media.find(m => m.id === id);
                return item ? item.url : match;
            });
        }
        editorRef.current.innerHTML = contentToSet;
    }
  }, [post?.id]); 

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          if (pickerPreviewItem) {
              setPickerPreviewItem(null);
          } else if (showColorPicker || showSizePicker || showLinkPopup || showVideoPopup) {
              closePopups();
          } else {
              setModalImage(null);
          }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [pickerPreviewItem, showColorPicker, showSizePicker, showLinkPopup, showVideoPopup]);

  const closePopups = () => {
    setShowColorPicker(false);
    setShowSizePicker(false);
    setShowLinkPopup(false);
    setShowVideoPopup(false);
    setPopupUrl('');
  };

  useEffect(() => {
      const handleResize = () => setRefreshOverlay(prev => prev + 1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isImage = target.tagName === 'IMG';
        const isVideo = target.tagName === 'VIDEO';
        
        if (target.closest('.media-toolbar') || target.closest('.resize-handle')) return;

        if (isImage || isVideo) {
             if (selectedElement !== target) {
                 setSelectedElement(target);
                 setRefreshOverlay(prev => prev + 1);
             }
        } else {
             if (selectedElement) {
                 setSelectedElement(null);
             }
        }
    };

    const handleInput = () => {
        if (selectedElement) setSelectedElement(null);
    };

    editor.addEventListener('click', handleClick);
    editor.addEventListener('input', handleInput);
    
    return () => {
        editor.removeEventListener('click', handleClick);
        editor.removeEventListener('input', handleInput);
    };
  }, [selectedElement]);

  const getStats = () => {
     if (!editorRef.current) return { wordCount: 0, readTime: 0 };
     const text = editorRef.current.innerText || '';
     const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
     const readTime = Math.ceil(wordCount / 200);
     return { wordCount, readTime };
  };
  const { wordCount, readTime } = getStats();

  const getPostData = useCallback((targetStatus: PostStatus): Post | null => {
      if (!editorRef.current) return null;
      let htmlContent = editorRef.current.innerHTML;
      media.forEach(item => {
          if (item.url.length > 100) { 
               htmlContent = htmlContent.split(item.url).join(`asset://${item.id}`);
          }
      });
      return {
        id: postId,
        title,
        content: htmlContent, 
        excerpt,
        status: targetStatus,
        type,
        author: post?.author || 'Admin', 
        createdAt: post?.createdAt || Date.now(),
        updatedAt: Date.now(),
        tags,
        coverImage
      };
  }, [postId, title, excerpt, status, type, tags, coverImage, post?.author, post?.createdAt, media]);

  const handleSave = (targetStatus: PostStatus) => {
    const newPost = getPostData(targetStatus);
    if (newPost) onSave(newPost, true);
  };

  const triggerAutoSave = useCallback(() => {
      if (status === PostStatus.ARCHIVED) return;

      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      setIsSaving(true);
      
      autoSaveTimeoutRef.current = setTimeout(() => {
          const newPost = getPostData(status);
          if (newPost) {
              onSave(newPost, false);
              setLastAutoSave(Date.now());
              setIsSaving(false);
          }
      }, 2000);
  }, [status, getPostData, onSave]);

  const handlePublish = () => handleSave(PostStatus.PUBLISHED);
  const handleSaveDraft = () => handleSave(PostStatus.DRAFT);

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          if (!tags.includes(tagInput.trim())) {
              const newTags = [...tags, tagInput.trim()];
              setTags(newTags);
          }
          setTagInput('');
      }
  };

  const removeTag = (tagToRemove: string) => {
      setTags(tags.filter(t => t !== tagToRemove));
  };

  useEffect(() => {
      if (Date.now() - (post?.updatedAt || 0) < 1000 && !title) return;
      triggerAutoSave();
  }, [title, excerpt, tags, coverImage, type, triggerAutoSave]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large (Max 5MB)');
            return;
        }
        if (file.type.startsWith('image/')) {
            setFileToEdit(file);
            if (editorUploadInputRef.current) editorUploadInputRef.current.value = '';
        } else {
            processMediaUpload(file);
        }
    }
  };

  const processMediaUpload = (file: File) => {
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
          onUploadMedia(newItem);
          if (editorUploadInputRef.current) editorUploadInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
  };

  const handleEditorSave = (editedFile: File) => {
      setFileToEdit(null);
      processMediaUpload(editedFile);
  };

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          setSavedRange(sel.getRangeAt(0));
      }
  };

  const restoreSelection = () => {
      if (savedRange) {
          const sel = window.getSelection();
          if (sel) {
              sel.removeAllRanges();
              sel.addRange(savedRange);
          }
      }
  };

  const openMediaPicker = (target: 'content' | 'cover') => {
      if (target === 'content') {
          saveSelection();
      }
      setPickerTarget(target);
      setLinkMode('none');
      setCustomLinkUrl('');
      setSelectedMediaIds(new Set());
      setPickerSearch('');
      setPickerFilter('all');
      setShowMediaPicker(true);
  };

  const insertHtmlAtCursor = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    saveSelection();
    triggerAutoSave();
  };

  const handleMediaItemClick = (item: MediaItem) => {
      if (pickerTarget === 'cover') {
          handleMediaSelect(item);
          return;
      }
      const newSet = new Set(selectedMediaIds);
      if (newSet.has(item.id)) {
          newSet.delete(item.id);
      } else {
          newSet.add(item.id);
      }
      setSelectedMediaIds(newSet);
  };

  const handleMediaItemDoubleClick = (item: MediaItem) => {
      if (pickerTarget === 'cover') {
          handleMediaSelect(item);
          return;
      }
      handleMediaSelect(item);
  };

  const insertSelectedMedia = () => {
      if (selectedMediaIds.size === 0) return;
      if (selectedMediaIds.size === 1) {
          const itemId = Array.from(selectedMediaIds)[0];
          const item = media.find(m => m.id === itemId);
          if (item) handleMediaSelect(item);
      } else {
          const items = media.filter(m => selectedMediaIds.has(m.id));
          handleGalleryInsert(items);
      }
      setShowMediaPicker(false);
  };

  const handleGalleryInsert = (items: MediaItem[]) => {
      const images = items.filter(i => i.mediaType === 'image');
      if (images.length === 0) return;
      const gridClass = images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
      const galleryHtml = `
        <div class="gallery-container grid ${gridClass} gap-4 my-8" contenteditable="false">
            ${images.map(img => `
                <div class="aspect-square bg-gray-50 overflow-hidden relative border border-gray-100">
                    <img src="${img.url}" alt="${img.name}" class="w-full h-full object-cover" data-gallery="true" />
                </div>
            `).join('')}
        </div><p><br/></p>
      `;
      insertHtmlAtCursor(galleryHtml);
  };

  const handleMediaSelect = (item: MediaItem) => {
      const isVideo = item.mediaType === 'video';
      const isAudio = item.mediaType === 'audio';

      if (pickerTarget === 'cover') {
          if (isVideo || isAudio) {
              alert('Cannot use video/audio as cover image.');
              return;
          }
          setCoverImage(item.url);
      } else {
          let elementHtml = '';
          if (isVideo) {
            elementHtml = `<video src="${item.url}" controls class="my-6 max-w-full h-auto border border-gray-200 block" contenteditable="false" preload="metadata" ${VIDEO_ERROR_ATTR}></video>`;
          } else if (isAudio) {
             elementHtml = `<audio src="${item.url}" controls class="w-full my-6 border border-gray-200 block" contenteditable="false" preload="metadata"></audio>`;
          } else {
            elementHtml = `<img src="${item.url}" alt="${item.name}" class="my-6 max-w-full border border-gray-200 block" contenteditable="false" />`;
          }
          if (linkMode !== 'none') {
             const href = linkMode === 'file' ? item.url : customLinkUrl;
             if (href) {
                 elementHtml = `<a href="${href}">${elementHtml}</a>`;
             }
          }
          insertHtmlAtCursor(elementHtml + '<p><br/></p>');
      }
      setShowMediaPicker(false);
  };

  const getVideoEmbedHtml = (url: string) => {
      let embedUrl = '';
      const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
      if (ytMatch && ytMatch[2].length === 11) {
          embedUrl = `https://www.youtube.com/embed/${ytMatch[2]}`;
      }
      if (!embedUrl) {
          const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
          if (vimeoMatch && vimeoMatch[1]) {
              embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
          }
      }
      if (embedUrl) {
           return `<div class="relative w-full aspect-video my-6 border border-gray-200 bg-gray-50" contenteditable="false"><iframe src="${embedUrl}" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br/></p>`;
      }
      return null;
  };

  const insertFormat = (command: string, value: string | undefined = undefined) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      triggerAutoSave();
  };

  const submitLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (popupUrl) {
        restoreSelection();
        insertFormat('createLink', popupUrl);
    }
    closePopups();
  };

  const submitVideo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (popupUrl) {
        restoreSelection();
        const html = getVideoEmbedHtml(popupUrl);
        if (html) {
            insertHtmlAtCursor(html);
        } else {
            alert('Unsupported Video URL format.');
        }
    }
    closePopups();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text/plain');
      if (text) {
          const html = getVideoEmbedHtml(text.trim());
          if (html) {
              e.preventDefault();
              if (!savedRange) {
                   document.execCommand('insertHTML', false, html);
              } else {
                   insertHtmlAtCursor(html);
              }
          }
      }
      triggerAutoSave();
  };

  const toggleMode = () => {
      if (editorMode === 'edit') {
          if (editorRef.current) {
              setPreviewContent(editorRef.current.innerHTML);
          }
          setEditorMode('preview');
          setSelectedElement(null);
      } else {
          setEditorMode('edit');
      }
  };

  const focusEditor = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && editorRef.current) {
        editorRef.current.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
  };

  const handlePreviewImageClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
          setModalImage((target as HTMLImageElement).src);
      }
  };

  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiBtnRef = useRef<HTMLButtonElement>(null);

  const handleAiAction = async (action: 'continue' | 'excerpt' | 'improve' | 'tags') => {
    if (!editorRef.current) return;
    const currentText = editorRef.current.innerText || "";
    setIsAiProcessing(true);
    setShowAiMenu(false);
    
    try {
        let result = "";
        switch (action) {
            case 'continue':
                result = await GeminiService.continueWriting(currentText);
                if (result) insertHtmlAtCursor(`<p>${result}</p>`);
                break;
            case 'excerpt':
                result = await GeminiService.generateExcerpt(currentText);
                setExcerpt(result);
                break;
            case 'improve':
                // Get selection or full text
                const selection = window.getSelection()?.toString();
                if (selection) {
                    result = await GeminiService.improveText(selection);
                    insertFormat('insertHTML', result);
                } else {
                    result = await GeminiService.improveText(currentText);
                    // This is harder to replace, maybe just append or show in a modal
                    alert("Select some text first to improve it.");
                }
                break;
            case 'tags':
                // We could add a generateTags to GeminiService
                const tagPrompt = `Generate 5 relevant SEO tags for this content. Return ONLY a comma separated list:\n\n${currentText.substring(0, 1000)}`;
                result = await GeminiService.generateSuggestion(tagPrompt);
                const newTags = result.split(',').map(t => t.trim()).filter(t => t.length > 0);
                setTags(Array.from(new Set([...tags, ...newTags])));
                break;
        }
    } catch (e) {
        console.error("AI Assistant Error", e);
    } finally {
        setIsAiProcessing(false);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedElement || !editorRef.current) return;
    
    const startX = e.clientX;
    const startW = selectedElement.clientWidth;

    const onMouseMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        let newW = startW;
        
        if (direction.includes('w')) {
             newW = startW - deltaX;
        } else {
             newW = startW + deltaX;
        }
        
        if (newW < 50) newW = 50;
        const maxW = editorRef.current?.clientWidth || 800;
        if (newW > maxW) newW = maxW;
        
        selectedElement.style.width = `${newW}px`;
        selectedElement.style.height = 'auto'; 
        
        setRefreshOverlay(prev => prev + 1);
    };
    
    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        editorRef.current?.focus();
        triggerAutoSave();
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updateMediaStyle = (style: Partial<CSSStyleDeclaration>) => {
      if (!selectedElement) return;
      Object.assign(selectedElement.style, style);
      setRefreshOverlay(prev => prev + 1);
      triggerAutoSave();
  };

  const toggleAttribute = (attr: string) => {
      if (!selectedElement) return;
      if (selectedElement.hasAttribute(attr)) {
          selectedElement.removeAttribute(attr);
      } else {
          selectedElement.setAttribute(attr, '');
      }
      setRefreshOverlay(prev => prev + 1);
      triggerAutoSave();
  };

  const updateAttribute = (attr: string, value: string) => {
      if (!selectedElement) return;
      selectedElement.setAttribute(attr, value);
      triggerAutoSave();
  };

  const onModalDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingMedia(true);
  }, []);

  const onModalDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingMedia(false);
  }, []);

  const onModalDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingMedia(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        if (file.type.startsWith('image/')) {
            setFileToEdit(file);
            if (editorUploadInputRef.current) editorUploadInputRef.current.value = '';
        } else {
            processMediaUpload(file);
        }
      }
  }, []);

  const getDropdownPosition = (ref: React.RefObject<HTMLButtonElement>) => {
      if (!ref.current) return { top: 0, left: 0 };
      const rect = ref.current.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 220, rect.left);
      return { top: rect.bottom + 8, left };
  };

  const renderResizeOverlay = () => {
    if (!selectedElement || !wrapperRef.current || !document.contains(selectedElement)) return null;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const elementRect = selectedElement.getBoundingClientRect();

    const top = elementRect.top - wrapperRect.top;
    const left = elementRect.left - wrapperRect.left;
    const width = elementRect.width;
    const height = elementRect.height;

    const tagName = selectedElement.tagName;
    
    const spaceAbove = elementRect.top;
    const showBelow = spaceAbove < 120;

    const toolbarStyle: React.CSSProperties = showBelow 
        ? { top: top + height + 10, left: Math.max(0, left) } 
        : { top: top - 10, left: Math.max(0, left), transform: 'translateY(-100%)' };

    return (
        <>
            <div className="absolute pointer-events-none z-30" style={{ top, left, width, height }}>
                <div className="absolute inset-0 border-2 border-blue-600 shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"></div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm flex gap-2 rounded z-20 whitespace-nowrap">
                    <span>{tagName} &bull; {Math.round(width)} &times; {Math.round(height)}</span>
                </div>
                <div className="resize-handle absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize pointer-events-auto hover:scale-125 transition-transform shadow-md z-40" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                <div className="resize-handle absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize pointer-events-auto hover:scale-125 transition-transform shadow-md z-40" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                <div className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize pointer-events-auto hover:scale-125 transition-transform shadow-md z-40" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                <div className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-se-resize pointer-events-auto hover:scale-125 transition-transform shadow-md z-40" onMouseDown={(e) => handleResizeStart(e, 'se')} />
            </div>

            <div className="media-toolbar absolute z-40 flex flex-col gap-1 bg-white border border-gray-200 shadow-xl rounded-md p-1 animate-in fade-in zoom-in-95 duration-150 max-w-[90vw] overflow-x-auto" style={toolbarStyle}>
                <div className="flex items-center gap-1 min-w-max">
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ float: 'left', margin: '0 1em 1em 0' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Float Left"><AlignLeft size={14} /></button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ float: 'none', margin: '1em auto', display: 'block' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Center"><AlignCenter size={14} /></button>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ float: 'right', margin: '0 0 1em 1em' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Float Right"><AlignRight size={14} /></button>
                     <div className="w-px h-4 bg-gray-200 mx-1"></div>
                     <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ width: '100%', height: 'auto' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Full Width"><AlignJustify size={14} /></button>
                </div>
                <div className="flex items-center gap-1 border-t border-gray-100 pt-1 min-w-max">
                    {tagName === 'IMG' && (
                        <>
                             <button onMouseDown={(e) => e.preventDefault()} onClick={() => { const alt = prompt("Alt Text:", selectedElement.getAttribute('alt') || ''); if(alt !== null) updateAttribute('alt', alt); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Alt Text"><Type size={14} /></button>
                             <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ borderRadius: selectedElement.style.borderRadius === '8px' ? '0' : '8px' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Rounded Corners"><BoxSelect size={14} /></button>
                             <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateMediaStyle({ filter: selectedElement.style.filter === 'grayscale(100%)' ? 'none' : 'grayscale(100%)' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Grayscale"><Layers size={14} /></button>
                        </>
                    )}
                    {tagName === 'VIDEO' && (
                        <>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleAttribute('autoplay')} className={`p-1.5 hover:bg-gray-100 rounded ${selectedElement.hasAttribute('autoplay') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Autoplay"><PlayCircle size={14} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleAttribute('loop')} className={`p-1.5 hover:bg-gray-100 rounded ${selectedElement.hasAttribute('loop') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Loop"><Repeat size={14} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => toggleAttribute('muted')} className={`p-1.5 hover:bg-gray-100 rounded ${selectedElement.hasAttribute('muted') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Muted"><VolumeX size={14} /></button>
                        </>
                    )}
                    <div className="flex-1 w-2"></div>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { selectedElement.remove(); setSelectedElement(null); triggerAutoSave(); }} 
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded" 
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </>
    );
  };

  const ImageModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalImage(null)}>
        <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors" onClick={() => setModalImage(null)}>
            <X size={32} />
        </button>
        <div className="max-w-[90vw] max-h-[90vh] relative p-4" onClick={(e) => e.stopPropagation()}>
            <img src={modalImage || ''} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm border border-white/10" />
            <div className="mt-4 flex items-center justify-between text-white/40 font-mono text-[10px] uppercase tracking-widest">
                <span>Preview Mode</span>
                <button onClick={() => window.open(modalImage || '', '_blank')} className="hover:text-white flex items-center gap-2">
                    <Maximize2 size={12} /> Full Resolution
                </button>
            </div>
        </div>
    </div>
  );

  const widthClass = settings.contentWidth === 'compact' ? 'max-w-xl' : settings.contentWidth === 'relaxed' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div className="flex h-full bg-white relative font-mono text-gray-900 overflow-hidden">
      {modalImage && <ImageModal />}
      {fileToEdit && <ImageEditor file={fileToEdit} onSave={handleEditorSave} onCancel={() => setFileToEdit(null)} />}

      {showMediaPicker && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-12">
              <div className="bg-white w-full max-w-6xl h-full flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                  <header className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                          <div>
                              <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight">Resource Index</h3>
                              <p className="text-[10px] text-gray-500 mt-0.5">{pickerTarget === 'cover' ? 'Set Featured Asset' : 'Select elements for entry'}</p>
                          </div>
                          <button onClick={() => setShowMediaPicker(false)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                      </div>

                      <div className="flex flex-1 max-w-2xl items-center gap-2 md:gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-black text-xs transition-all"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <select 
                                className="pl-9 pr-8 py-2 border border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-wider appearance-none focus:outline-none focus:border-black"
                                value={pickerFilter}
                                onChange={(e) => setPickerFilter(e.target.value as any)}
                            >
                                <option value="all">All</option>
                                <option value="image">Img</option>
                                <option value="video">Vid</option>
                                <option value="audio">Aud</option>
                            </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                           {selectedMediaIds.size > 0 && (
                                <button onClick={insertSelectedMedia} className="bg-black text-white px-3 md:px-5 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 flex items-center gap-2">
                                    <Check size={14} /> {selectedMediaIds.size}
                                </button>
                           )}
                          <div className="relative">
                                <input type="file" className="hidden" id="modal-upload" accept="image/*,video/*,audio/*" onChange={handleMediaUpload} ref={editorUploadInputRef} />
                                <label htmlFor="modal-upload" className="cursor-pointer bg-white border border-gray-200 text-black px-3 md:px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap">
                                    <Upload size={14} /> Upload
                                </label>
                          </div>
                          <button onClick={() => setShowMediaPicker(false)} className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>
                  </header>

                      <div className="flex flex-col flex-1 overflow-hidden">
                          <div className="flex border-b border-gray-100 bg-white px-4 md:px-8">
                              <button 
                                onClick={() => setPickerTab('library')}
                                className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${pickerTab === 'library' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                              >
                                  Media Library
                              </button>
                              <button 
                                onClick={() => setPickerTab('url')}
                                className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${pickerTab === 'url' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                              >
                                  Insert from URL
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 relative" onDragOver={onModalDragOver} onDragLeave={onModalDragLeave} onDrop={onModalDrop}>
                              {pickerTab === 'library' ? (
                                  <>
                                      {isDraggingMedia && (
                                          <div className="absolute inset-0 bg-black/10 z-50 border-4 border-black border-dashed m-4 flex flex-col items-center justify-center pointer-none backdrop-blur-md animate-in fade-in rounded-xl">
                                              <MoveDown size={48} className="mb-4 animate-bounce" />
                                              <h3 className="text-xl font-bold uppercase tracking-widest">Drop to Upload</h3>
                                          </div>
                                      )}

                                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6">
                                          {filteredMedia.map(item => {
                                              const isVideo = item.mediaType === 'video';
                                              const isAudio = item.mediaType === 'audio';
                                              const isSelected = selectedMediaIds.has(item.id);
                                              
                                              return (
                                                <div key={item.id} className="group flex flex-col gap-1.5">
                                                    <div 
                                                        onClick={() => handleMediaItemClick(item)}
                                                        onDoubleClick={() => handleMediaItemDoubleClick(item)}
                                                        className={`aspect-square bg-white border-2 overflow-hidden relative flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'border-black ring-4 ring-black/10' : 'border-transparent group-hover:border-black/20 shadow-sm'}`}
                                                    >
                                                        {isVideo ? (
                                                            <div className="w-full h-full relative flex items-center justify-center bg-black">
                                                                <video src={item.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted playsInline />
                                                                <Play size={20} fill="white" className="absolute text-white pointer-events-none" />
                                                            </div>
                                                        ) : isAudio ? (
                                                            <div className="w-full h-full relative flex items-center justify-center bg-zinc-50 text-gray-400">
                                                                <Music size={28} />
                                                            </div>
                                                        ) : (
                                                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                                        )}
                                                        
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-xl">
                                                                <Check size={10} strokeWidth={4} />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setPickerPreviewItem(item); }}
                                                                className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                                            >
                                                                <Maximize2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-tighter truncate ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                              );
                                          })}
                                          {filteredMedia.length === 0 && (
                                              <div className="col-span-full py-32 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                                  Zero matches found
                                              </div>
                                          )}
                                      </div>
                                  </>
                              ) : (
                                  <div className="max-w-2xl mx-auto py-12 md:py-24">
                                      <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-lg">
                                          <h4 className="text-sm font-bold uppercase tracking-widest mb-6">External Asset Source</h4>
                                          <div className="space-y-6">
                                              <div>
                                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resource URL</label>
                                                  <input 
                                                      type="text" 
                                                      placeholder="https://images.unsplash.com/..." 
                                                      className="w-full p-4 border border-gray-200 focus:border-black focus:outline-none bg-gray-50 text-xs font-mono"
                                                      value={externalUrl}
                                                      onChange={(e) => setExternalUrl(e.target.value)}
                                                  />
                                              </div>
                                              <div className="p-4 bg-blue-50 border border-blue-100 rounded flex gap-3">
                                                  <Info size={16} className="text-blue-500 shrink-0" />
                                                  <p className="text-[10px] text-blue-700 leading-relaxed uppercase tracking-tight">
                                                      Supports direct links to images (JPG, PNG, WEBP), videos (MP4, WEBM), or audio (MP3, WAV).
                                                  </p>
                                              </div>
                                              <button 
                                                  onClick={() => {
                                                      if (!externalUrl) return;

                                                      // Check for Video Embeds first
                                                      const embedHtml = getVideoEmbedHtml(externalUrl);
                                                      if (embedHtml) {
                                                          insertHtmlAtCursor(embedHtml);
                                                          setExternalUrl('');
                                                          setShowMediaPicker(false);
                                                          return;
                                                      }

                                                      const isVideo = externalUrl.match(/\.(mp4|webm|ogg|mov)/i);
                                                      const isAudio = externalUrl.match(/\.(mp3|wav|ogg)/i);
                                                      handleMediaSelect({
                                                          id: crypto.randomUUID(),
                                                          url: externalUrl,
                                                          name: externalUrl.split('/').pop() || 'External Asset',
                                                          type: isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg',
                                                          mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
                                                          createdAt: Date.now(),
                                                          size: 0
                                                      });
                                                      setExternalUrl('');
                                                  }}
                                                  className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                                              >
                                                  Insert External Asset
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  
                  <footer className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <div>{filteredMedia.length} Objects</div>
                      <div className="hidden sm:block">Double-click to insert</div>
                  </footer>
              </div>
          </div>
      )}

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen && !isZenMode ? 'mr-80' : ''}`}>
        <header className={`h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 bg-white z-20 transition-all duration-300 ${isZenMode ? '-mt-16 opacity-0 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <button onClick={onCancel} className="p-1.5 md:p-2 hover:bg-gray-100 text-gray-500 transition-colors shrink-0"><ArrowLeft size={16} /></button>
                <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-sm font-bold text-gray-900 leading-none truncate">{title || 'UNTITLED_ENTRY'}</span>
                        {isSaving ? <span className="text-[10px] text-gray-400 hidden sm:flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> ...</span> : lastAutoSave ? <span className="text-[10px] text-gray-400 hidden sm:flex items-center gap-1"><Check size={10} /> Saved</span> : null}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-bold whitespace-nowrap">{status} &bull; {wordCount} words</span>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                 <button onClick={toggleMode} className="flex items-center gap-2 px-2 md:px-3 py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 border border-gray-200 hover:border-black hover:text-black transition-colors">
                    {editorMode === 'edit' ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span className="hidden sm:inline">{editorMode === 'edit' ? 'Preview' : 'Edit'}</span>
                </button>
                <button onClick={handlePublish} className="bg-black hover:bg-gray-800 text-white px-3 md:px-5 py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95">
                    <Save size={14} />
                    <span className="hidden sm:inline">{status === PostStatus.PUBLISHED ? 'Update' : 'Publish'}</span>
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 md:p-2 transition-colors border ${isSidebarOpen ? 'bg-gray-100 text-black border-gray-300' : 'text-gray-400 border-transparent hover:bg-gray-50 hover:text-black'}`}>
                    <MoreVertical size={18} />
                </button>
            </div>
        </header>

        {editorMode === 'edit' && (
            <div className={`px-4 md:px-6 py-2 border-b border-gray-100 bg-white flex items-center gap-1 sticky top-0 z-10 overflow-x-auto no-scrollbar transition-all duration-300 ${isZenMode ? 'opacity-0 -translate-y-full absolute w-full' : ''}`}>
                
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 mr-2 shadow-inner shrink-0">
                    <button 
                        onMouseDown={(e) => e.preventDefault()} 
                        onClick={() => openMediaPicker('content')} 
                        className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-600 hover:text-black hover:bg-white rounded transition-all"
                    >
                        <Plus size={14} />
                        <span>Add Media</span>
                    </button>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('bold')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Bold"><Bold size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('italic')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Italic"><Italic size={16} /></button>
                    
                    <div className="relative">
                        <button 
                            ref={linkBtnRef}
                            onMouseDown={(e) => e.preventDefault()} 
                            onClick={() => {
                                if (showLinkPopup) { closePopups(); }
                                else {
                                    closePopups();
                                    saveSelection();
                                    setShowLinkPopup(true);
                                }
                            }} 
                            className={`p-1.5 rounded transition-colors ${showLinkPopup ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`} 
                            title="Link"
                        >
                            <LinkIcon size={16} />
                        </button>
                        {showLinkPopup && (
                            <div 
                                className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-lg p-3 flex flex-col gap-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-150"
                                style={getDropdownPosition(linkBtnRef)}
                            >
                                <form onSubmit={submitLink} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Link Destination</label>
                                        <button type="button" onClick={closePopups} className="text-gray-300 hover:text-black"><X size={10} /></button>
                                    </div>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="https://..." 
                                        className="w-full text-xs p-2.5 border border-gray-200 focus:border-black focus:outline-none bg-gray-50 rounded"
                                        value={popupUrl}
                                        onChange={(e) => setPopupUrl(e.target.value)}
                                    />
                                    <button type="submit" className="bg-black text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 rounded">Insert Link</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="w-px h-4 bg-gray-200 mx-1 md:mx-3 shrink-0"></div>

                <div className="flex items-center gap-0.5 shrink-0">
                    <div className="relative">
                        <button ref={sizeBtnRef} onMouseDown={(e) => e.preventDefault()} onClick={() => { 
                            const newState = !showSizePicker;
                            closePopups(); 
                            setShowSizePicker(newState); 
                        }} className={`p-1.5 rounded transition-colors ${showSizePicker ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`} title="Font Size"><Type size={16} /></button>
                        {showSizePicker && (
                            <div 
                                className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded p-1 flex flex-col gap-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-150"
                                style={getDropdownPosition(sizeBtnRef)}
                            >
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { insertFormat('fontSize', '3'); closePopups(); }} className="text-left px-3 py-2 hover:bg-gray-50 text-xs font-bold">Normal</button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { insertFormat('fontSize', '5'); closePopups(); }} className="text-left px-3 py-2 hover:bg-gray-50 text-lg font-bold">Large</button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { insertFormat('fontSize', '7'); closePopups(); }} className="text-left px-3 py-2 hover:bg-gray-50 text-2xl font-bold">Huge</button>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button ref={colorBtnRef} onMouseDown={(e) => e.preventDefault()} onClick={() => { 
                            const newState = !showColorPicker;
                            closePopups(); 
                            setShowColorPicker(newState); 
                        }} className={`p-1.5 rounded transition-colors ${showColorPicker ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`} title="Text Color"><Palette size={16} /></button>
                        {showColorPicker && (
                            <div 
                                className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded p-3 grid grid-cols-4 gap-2 w-48 animate-in fade-in zoom-in-95 duration-150"
                                style={getDropdownPosition(colorBtnRef)}
                            >
                                {[ { c: '#000000', label: 'Black' }, { c: '#52525b', label: 'Gray' }, { c: '#dc2626', label: 'Red' }, { c: '#2563eb', label: 'Blue' }, { c: '#16a34a', label: 'Green' }, { c: '#d97706', label: 'Orange' }, { c: '#9333ea', label: 'Purple' }, { c: '#db2777', label: 'Pink' }].map(({c, label}) => (
                                    <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { insertFormat('foreColor', c); closePopups(); }} className="w-8 h-8 rounded-full border border-gray-200 hover:scale-110 transition-transform" style={{backgroundColor: c}} title={label} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="w-px h-4 bg-gray-200 mx-1 md:mx-3 shrink-0"></div>
                
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('justifyLeft')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Align Left"><AlignLeft size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('justifyCenter')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Align Center"><AlignCenter size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('justifyRight')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Align Right"><AlignRight size={16} /></button>
                </div>
                
                <div className="w-px h-4 bg-gray-200 mx-1 md:mx-3 shrink-0"></div>
                
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('formatBlock', 'H1')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Heading 1"><Heading1 size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('formatBlock', 'H2')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Heading 2"><Heading2 size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('formatBlock', 'BLOCKQUOTE')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Quote"><Quote size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('insertUnorderedList')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="List"><List size={16} /></button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => insertFormat('insertHorizontalRule')} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded" title="Horizontal Rule"><Minus size={16} /></button>
                    
                    <div className="relative">
                        <button 
                            ref={youtubeBtnRef}
                            onMouseDown={(e) => e.preventDefault()} 
                            onClick={() => {
                                if (showVideoPopup) { closePopups(); }
                                else {
                                    closePopups();
                                    saveSelection();
                                    setShowVideoPopup(true);
                                }
                            }} 
                            className={`p-1.5 rounded transition-colors ${showVideoPopup ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`} 
                            title="Embed Video"
                        >
                            <Youtube size={16} />
                        </button>
                        {showVideoPopup && (
                            <div 
                                className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-lg p-3 flex flex-col gap-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-150"
                                style={getDropdownPosition(youtubeBtnRef)}
                            >
                                <form onSubmit={submitVideo} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Video URL (YT/Vimeo)</label>
                                        <button type="button" onClick={closePopups} className="text-gray-300 hover:text-black"><X size={10} /></button>
                                    </div>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="https://youtube.com/..." 
                                        className="w-full text-xs p-2.5 border border-gray-200 focus:border-black focus:outline-none bg-gray-50 rounded"
                                        value={popupUrl}
                                        onChange={(e) => setPopupUrl(e.target.value)}
                                    />
                                    <button type="submit" className="bg-black text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 rounded">Insert Embed</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-[20px]"></div>

                <div className="relative">
                    <button 
                        ref={aiBtnRef}
                        onMouseDown={(e) => e.preventDefault()} 
                        onClick={() => setShowAiMenu(!showAiMenu)} 
                        disabled={isAiProcessing}
                        className={`p-1.5 rounded transition-colors flex items-center gap-1 border border-transparent shrink-0 ${isAiProcessing ? 'bg-gray-100 text-gray-400' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-100'}`} 
                        title="Gemini AI Assistant"
                    >
                        {isAiProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                        {!isAiProcessing && <span className="text-[10px] font-bold uppercase tracking-tight pr-1 hidden sm:inline">AI Assistant</span>}
                    </button>
                    {showAiMenu && (
                        <div 
                            className="fixed z-[100] bg-white border border-gray-200 shadow-2xl rounded-lg p-1 flex flex-col gap-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
                            style={getDropdownPosition(aiBtnRef)}
                        >
                            <button onClick={() => handleAiAction('continue')} className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider text-left rounded">
                                <Sparkles size={12} /> Continue Writing
                            </button>
                            <button onClick={() => handleAiAction('improve')} className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider text-left rounded">
                                <Type size={12} /> Improve Selection
                            </button>
                            <button onClick={() => handleAiAction('excerpt')} className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider text-left rounded">
                                <FileText size={12} /> Generate Excerpt
                            </button>
                            <button onClick={() => handleAiAction('tags')} className="flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider text-left rounded">
                                <Palette size={12} /> Suggest Tags
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-4 bg-gray-200 mx-1 md:mx-2 shrink-0"></div>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsZenMode(!isZenMode)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded shrink-0" title="Zen Mode">
                    {isZenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>
        )}

        <div className="flex-1 overflow-hidden bg-white relative flex flex-col">
            {isZenMode && editorMode === 'edit' && (
                <button onClick={() => setIsZenMode(false)} className="absolute top-4 right-4 md:right-6 z-30 p-2 bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full opacity-50 hover:opacity-100 transition-opacity"><Minimize2 size={16} /></button>
            )}
            <div className={`flex-1 h-full flex flex-col overflow-auto transition-all duration-500 ${isZenMode && editorMode === 'edit' ? 'py-8 md:py-16' : 'py-6 md:py-10'}`}>
                <div ref={wrapperRef} className={`${widthClass} mx-auto px-4 md:px-6 w-full min-h-full flex flex-col cursor-text pb-32 relative`} onClick={editorMode === 'edit' ? focusEditor : undefined}>
                    {editorMode === 'edit' ? (
                        <>
                            <input type="text" placeholder="Untitled Entry" className="text-4xl md:text-6xl font-bold text-gray-900 placeholder-gray-300 border-none focus:ring-0 w-full bg-transparent p-0 mb-6 md:mb-8 tracking-tighter leading-[1.1]" style={{ fontFamily: settings.fontFamily }} value={title} onChange={(e) => setTitle(e.target.value)} />
                            {renderResizeOverlay()}
                            <div ref={editorRef} contentEditable onKeyUp={saveSelection} onMouseUp={saveSelection} onPaste={handlePaste} onInput={triggerAutoSave} className="flex-1 w-full outline-none prose prose-lg md:prose-xl prose-stone max-w-none prose-headings:font-bold prose-p:text-gray-600 prose-a:text-black hover:prose-a:decoration-black text-gray-800 leading-relaxed relative" style={{ minHeight: '50vh', fontFamily: settings.fontFamily }} />
                            {!isZenMode && <div className="mt-8 pt-4 border-t border-gray-100 text-[9px] text-gray-400 flex items-center justify-between font-mono uppercase tracking-widest"><div className="flex items-center gap-4"><span>Operational Unit v1.0</span></div><span className="flex items-center gap-1"><Clock size={12} /> {readTime} min read</span></div>}
                        </>
                    ) : (
                         <div className={`prose prose-lg md:prose-xl prose-stone max-w-none text-gray-800 leading-relaxed py-6 md:py-10`} style={{ fontFamily: settings.fontFamily }} onClick={handlePreviewImageClick}>
                            <h1 className="text-4xl md:text-7xl font-bold text-gray-900 leading-[1.1] mb-8 tracking-tighter">{title || "Untitled Post"}</h1>
                            {coverImage && <img src={coverImage} alt="Cover" className="w-full grayscale border border-gray-200 mb-12 p-1 cursor-zoom-in hover:scale-[1.01] transition-transform" onClick={(e) => { e.stopPropagation(); setModalImage(coverImage); }} />}
                            <div dangerouslySetInnerHTML={{ __html: processPreviewContent(previewContent, settings.fontFamily) }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 z-[60] flex flex-col ${isSidebarOpen && !isZenMode ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-[10px] text-gray-900 uppercase tracking-widest">Entry Meta</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-black p-1"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
            <div>
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Entry Type</label>
                 <div className="flex bg-gray-100 p-1 rounded">
                     <button onClick={() => setType('post')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${type === 'post' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}><FileText size={12} /> Post</button>
                     <button onClick={() => setType('page')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${type === 'page' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}><Layout size={12} /> Page</button>
                 </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Summary</label>
                <textarea className="w-full text-xs p-3 border border-gray-200 focus:border-black focus:ring-0 min-h-[100px] bg-gray-50 resize-none" placeholder="Brief summary for indexing..." value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div>
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Featured Asset</label>
                 <div className="space-y-3">
                    <button onClick={() => openMediaPicker('cover')} className="w-full py-8 md:py-10 border border-dashed border-gray-300 hover:border-black text-gray-400 hover:text-black transition-colors flex flex-col items-center justify-center gap-2 bg-gray-50">
                        <FileImage size={20} /><span className="text-[9px] uppercase font-bold tracking-widest">Select Resource</span>
                    </button>
                    {coverImage && (
                        <div className="relative group overflow-hidden border border-gray-200">
                            <img src={coverImage} alt="Preview" className="w-full h-32 md:h-40 object-cover grayscale" />
                            <button onClick={() => setCoverImage('')} className="absolute top-2 right-2 bg-black/80 text-white p-1.5 hover:bg-black transition-colors"><X size={12} /></button>
                        </div>
                    )}
                 </div>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                        <span key={tag} className="bg-black text-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">{tag}<button onClick={() => removeTag(tag)} className="hover:text-gray-300 ml-1"><X size={10} /></button></span>
                    ))}
                    {tags.length === 0 && <span className="text-[9px] text-gray-300 uppercase italic">No tags defined</span>}
                </div>
                <input type="text" placeholder="Type + Enter" className="w-full text-xs p-2 border border-gray-200 focus:border-black focus:ring-0" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;