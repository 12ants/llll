import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Post, PostStatus, SiteSettings, MediaItem } from '../types';
import { format } from 'date-fns';
import { ArrowLeft, Edit, LayoutDashboard, Twitter, Github, X, Maximize2 } from 'lucide-react';

interface SitePreviewProps {
  posts: Post[];
  settings: SiteSettings;
  onBackToDashboard: () => void;
  onEditPost: (id: string) => void;
  media: MediaItem[];
}

// Helper to create URL-friendly slugs from titles (matching Publish.tsx)
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
};

const resolveContent = (htmlContent: string, media: MediaItem[], settings: SiteSettings) => {
    if (!htmlContent) return '';
    
    let html = htmlContent.replace(/asset:\/\/([a-zA-Z0-9-]+)/g, (match, id) => {
        const item = media.find(m => m.id === id);
        return item ? item.url : match;
    });

    const borderRadiusClass = settings.borderRadius === 'pill' ? 'rounded-2xl' : settings.borderRadius === 'subtle' ? 'rounded-md' : 'rounded-none';

    // Robust Image Class Injection
    html = html.replace(/<img([^>]*)>/g, (match, attrs) => {
        // If it's a gallery image, use specific gallery classes (fill container, no margin)
        if (attrs.includes('data-gallery="true"')) {
             let newAttrs = attrs;
             if (newAttrs.includes('class=')) {
                  newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} cursor-zoom-in hover:opacity-90 transition-opacity${q}`);
             }
             return `<img${newAttrs}>`;
        }

        let newAttrs = attrs;
        const additionalClasses = `cursor-zoom-in transition-transform hover:scale-[1.01] ${borderRadiusClass}`;
        
        if (newAttrs.includes('class=')) {
            newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${additionalClasses}${q}`);
        } else {
            newAttrs += ` class="max-w-full h-auto my-10 border border-gray-200 block ${additionalClasses}"`;
        }
        return `<img${newAttrs}>`;
    });

    // Robust Video Class Injection
    const VIDEO_FALLBACK_HTML = `
        <div class="bg-gray-900 aspect-video flex flex-col items-center justify-center p-8 text-center border border-gray-800">
            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>
            </div>
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Media Link Unreachable</p>
            <p class="text-[10px] text-gray-600 mt-2 max-w-xs">The resource could not be loaded. Please verify the source URL or your network connection.</p>
        </div>
    `.replace(/\n/g, '').replace(/"/g, "'");

    const VIDEO_ERROR_ATTR = `onerror="this.outerHTML='${VIDEO_FALLBACK_HTML}'"`;

    html = html.replace(/<video([^>]*)>/g, (match, attrs) => {
        let newAttrs = attrs;
        const additionalClasses = `w-full my-10 border border-gray-200 block ${borderRadiusClass}`;
        
        // Ensure controls
        if (!newAttrs.includes('controls')) {
            newAttrs += ' controls';
        }

        // Add error handling
        if (!newAttrs.includes('onerror')) {
            newAttrs += ` ${VIDEO_ERROR_ATTR}`;
        }

        if (newAttrs.includes('class=')) {
             newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${additionalClasses}${q}`);
        } else {
             newAttrs += ` class="${additionalClasses}"`;
        }
        return `<video${newAttrs}>`;
    });

    // Robust Audio Class Injection
    html = html.replace(/<audio([^>]*)>/g, (match, attrs) => {
        let newAttrs = attrs;
        const additionalClasses = `w-full my-10 border border-gray-200 block ${borderRadiusClass}`;
        
        if (newAttrs.includes('class=')) {
             newAttrs = newAttrs.replace(/class=(["'])(.*?)\1/, (m, q, c) => `class=${q}${c} ${additionalClasses}${q}`);
        } else {
             newAttrs += ` class="${additionalClasses}"`;
        }
        return `<audio${newAttrs}>`;
    });

    html = html.replace(/contenteditable="[^"]*"/g, '');

    return html;
};

const SitePreview: React.FC<SitePreviewProps> = ({ posts, settings, onBackToDashboard, onEditPost, media }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Filter posts: only PUBLISHED and type 'post' show on feed. 'page' types are accessed via menu.
  const feedPosts = useMemo(() => posts.filter(p => p.status === PostStatus.PUBLISHED && p.type === 'post'), [posts]);
  
  // Find active post based on URL
  const activePost = useMemo(() => {
      const path = location.pathname;
      if (path === '/' || path === '') return null;
      
      const parts = path.split('/').filter(Boolean);
      if (parts.length === 0) return null;
      
      const type = parts[0]; // 'posts' or 'pages'
      const slug = parts[1];
      
      if (!slug) {
          // Fallback: maybe it's just /slug (for pages)
          const singleSlug = parts[0];
          return posts.find(p => p.status === PostStatus.PUBLISHED && slugify(p.title) === singleSlug);
      }

      return posts.find(p => {
          const isPublished = p.status === PostStatus.PUBLISHED;
          const matchesType = (type === 'posts' && p.type === 'post') || (type === 'pages' && p.type === 'page');
          const matchesSlug = slugify(p.title) === slug;
          return isPublished && matchesType && matchesSlug;
      });
  }, [location.pathname, posts]);

  const fontFamilyStyle = { fontFamily: settings.fontFamily || 'inherit' };

  // Visual Class Computations
  const accentTextClass = {
    black: 'text-black',
    zinc: 'text-zinc-500',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-emerald-700',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    yellow: 'text-yellow-500',
    teal: 'text-teal-600'
  }[settings.accentColor];

  const accentBgClass = {
    black: 'bg-black',
    zinc: 'bg-zinc-500',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
    green: 'bg-emerald-700',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
    pink: 'bg-pink-600',
    yellow: 'bg-yellow-500',
    teal: 'bg-teal-600'
  }[settings.accentColor];

  const accentBorderClass = {
    black: 'border-black',
    zinc: 'border-zinc-500',
    blue: 'border-blue-600',
    red: 'border-red-600',
    green: 'border-emerald-700',
    orange: 'border-orange-600',
    purple: 'border-purple-600',
    pink: 'border-pink-600',
    yellow: 'border-yellow-500',
    teal: 'border-teal-600'
  }[settings.accentColor];

  const borderRadiusClass = settings.borderRadius === 'pill' ? 'rounded-2xl' : settings.borderRadius === 'subtle' ? 'rounded-md' : 'rounded-none';
  const widthClass = settings.contentWidth === 'compact' ? 'max-w-xl' : settings.contentWidth === 'relaxed' ? 'max-w-5xl' : 'max-w-3xl';

  // Header Style Class Logic
  const getHeaderContainerClasses = () => {
      switch (settings.headerStyle) {
          case 'center': return 'flex-col items-center gap-8';
          case 'right': return 'flex-row-reverse justify-between items-center';
          case 'split': return 'justify-between items-center';
          case 'left': default: return 'justify-between items-center';
      }
  };

  const getHeaderNavClasses = () => {
      switch (settings.headerStyle) {
          case 'left': return 'hidden sm:flex gap-6'; // Nav on right
          case 'center': return 'flex gap-6'; // Nav center below
          case 'right': return 'flex gap-6 mr-auto'; // Nav on Left (mr-auto pushes it)
          case 'split': default: return 'flex gap-6'; // Nav on Right
      }
  };

  // Modal handlers
  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
        setModalImage((target as HTMLImageElement).src);
    }
  };

  const handleNavClick = (url: string) => {
      if (url === '/') {
          navigate('/');
          return;
      }
      
      if (url.startsWith('http')) {
          window.open(url, '_blank');
          return;
      }

      // Try to find a page or post that matches the URL
      const cleanUrl = url.replace(/^\//, '').toLowerCase();
      const target = posts.find(p => p.status === PostStatus.PUBLISHED && (p.id === cleanUrl || slugify(p.title) === cleanUrl));
      
      if (target) {
          const prefix = target.type === 'post' ? 'posts' : 'pages';
          navigate(`/${prefix}/${slugify(target.title)}`);
      } else {
          navigate(url);
      }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalImage(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Image Modal Component
  const ImageModal = () => (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setModalImage(null)}
    >
        <button 
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            onClick={() => setModalImage(null)}
        >
            <X size={32} />
        </button>
        <div className="max-w-[90vw] max-h-[90vh] relative p-4" onClick={(e) => e.stopPropagation()}>
            <img 
                src={modalImage || ''} 
                alt="Enlarged view" 
                className={`max-w-full max-h-[85vh] object-contain shadow-2xl ${borderRadiusClass} border border-white/10`}
            />
            <div className="mt-4 flex items-center justify-between text-white/40 font-mono text-[10px] uppercase tracking-widest">
                <span>Asset Viewport</span>
                <button 
                    onClick={() => window.open(modalImage || '', '_blank')}
                    className="hover:text-white flex items-center gap-2"
                >
                    <Maximize2 size={12} /> Full Resolution
                </button>
            </div>
        </div>
    </div>
  );

  // Common Header Content
  const HeaderContent = () => (
    <header className={`border-b-4 ${accentBorderClass} bg-white ${settings.stickyHeader ? 'sticky top-0' : ''} z-40 transition-all`}>
        <div className={`max-w-6xl mx-auto px-6 py-8 flex ${getHeaderContainerClasses()}`}>
            <div className="flex items-center gap-4">
                {settings.logoUrl && (
                    <img 
                        src={settings.logoUrl} 
                        alt="Logo" 
                        className={`h-12 w-12 object-contain cursor-zoom-in ${borderRadiusClass}`} 
                        onClick={() => setModalImage(settings.logoUrl || null)}
                    />
                )}
                <div className={settings.headerStyle === 'center' ? 'text-center' : ''}>
                    <Link 
                        to="/"
                        className="text-3xl font-bold text-black tracking-tighter leading-none hover:opacity-70 transition-opacity uppercase" 
                    >
                        {settings.title}
                    </Link>
                    {settings.headerStyle === 'center' && (
                        <p className="text-xs text-gray-400 mt-2 font-mono uppercase tracking-widest">{settings.description}</p>
                    )}
                </div>
            </div>
            
            {/* Dynamic Navigation */}
            <nav className={`items-center ${getHeaderNavClasses()}`}>
                 {settings.headerStyle === 'left' && (
                     <div className="h-full flex items-center gap-6 mr-8">
                         <span className="text-xs text-gray-400 font-mono uppercase tracking-widest border-l border-gray-200 pl-6 h-8 flex items-center">{settings.description}</span>
                     </div>
                 )}

                 {(settings.navigation || []).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => handleNavClick(item.url)}
                            className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                        >
                            {item.label}
                        </button>
                 ))}
                 <div className="h-4 w-px bg-gray-200 mx-2"></div>
                {settings.socialTwitter && (
                    <a href={`https://twitter.com/${settings.socialTwitter}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Twitter size={18} /></a>
                )}
                {settings.socialGithub && (
                    <a href={`https://github.com/${settings.socialGithub}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Github size={18} /></a>
                )}
            </nav>
        </div>
    </header>
  );

  // Render Single Post
  if (activePost) {
    return (
      <div className={`min-h-screen bg-white selection:bg-black selection:text-white h-screen overflow-y-auto`} style={fontFamilyStyle}>
        {settings.customCss && <style>{settings.customCss}</style>}
        {modalImage && <ImageModal />}
        
        {/* Admin Bar Overlay */}
        {settings.showAdminButtons !== false && (
            <div className="fixed bottom-6 right-6 z-50 flex gap-2">
                 <button 
                    onClick={() => onEditPost(activePost.id)}
                    className={`${accentBgClass} text-white px-5 py-3 shadow-2xl hover:opacity-90 transition-all hover:-translate-y-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest ${borderRadiusClass}`}
                >
                    <Edit size={12} />
                    Edit
                </button>
                <button 
                    onClick={onBackToDashboard}
                    className={`bg-white text-black border border-gray-200 px-5 py-3 shadow-2xl hover:bg-gray-50 transition-all hover:-translate-y-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest ${borderRadiusClass}`}
                >
                    <LayoutDashboard size={12} />
                    Admin
                </button>
            </div>
        )}

        <HeaderContent />

        <article className={`${widthClass} mx-auto px-6 py-24`}>
          <header className="mb-16">
            <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 mb-6 font-bold uppercase tracking-widest">
                {activePost.type === 'post' && settings.showDate && <span>{format(activePost.createdAt, 'MMMM d, yyyy')}</span>}
                {activePost.type === 'post' && settings.showDate && <span>/</span>}
                {activePost.type === 'post' && <span className={accentTextClass}>{activePost.tags[0] || 'Uncategorized'}</span>}
                {activePost.type === 'page' && <span className={accentTextClass}>Page</span>}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-[0.9] mb-10 tracking-tighter">
                {activePost.title}
            </h1>

            {settings.showAuthor && activePost.type === 'post' && (
                <div className="flex items-center gap-4 border-t border-b border-gray-100 py-8">
                    <div className={`w-12 h-12 ${accentBgClass} text-white flex items-center justify-center font-mono font-bold text-lg ${borderRadiusClass}`}>
                        {activePost.author.charAt(0)}
                    </div>
                    <div className="font-mono">
                        <div className={`font-bold text-gray-900 text-xs uppercase tracking-widest`}>{activePost.author}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Writer</div>
                    </div>
                </div>
            )}
          </header>

          {activePost.coverImage && (
              <div className="mb-16 cursor-zoom-in" onClick={() => setModalImage(activePost.coverImage || null)}>
                <img src={activePost.coverImage} alt={activePost.title} className={`w-full h-auto grayscale hover:grayscale-0 transition-all duration-700 ${borderRadiusClass}`} />
              </div>
          )}

          <div 
            onClick={handleImageClick}
            className={`prose prose-xl prose-stone max-w-none prose-p:text-gray-700 prose-headings:text-black prose-a:text-black prose-img:m-0 prose-video:m-0`}
            style={{ 
                fontFamily: 'inherit',
                color: 'inherit'
            }}
            dangerouslySetInnerHTML={{ __html: resolveContent(activePost.content, media, settings) }} 
          />
          
          {activePost.type === 'post' && (
            <div className={`mt-24 pt-10 border-t-2 ${accentBorderClass}`}>
                <h3 className="font-mono font-bold text-gray-900 mb-6 text-[10px] uppercase tracking-widest">Filed Under</h3>
                <div className="flex flex-wrap gap-2">
                    {activePost.tags.map(tag => (
                        <span key={tag} className={`px-3 py-1 bg-white border border-gray-200 text-black text-[10px] font-mono font-bold uppercase tracking-wider hover:${accentBgClass} hover:text-white transition-all cursor-default ${borderRadiusClass}`}>
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
          )}
        </article>

         {/* Footer */}
        <footer className={`border-t-4 ${accentBorderClass} mt-32 bg-gray-50`}>
          <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                  <h4 className="font-bold font-mono text-xs uppercase tracking-widest mb-2">{settings.title}</h4>
                  <p className="text-gray-500 font-mono text-[10px] max-w-xs leading-relaxed">
                      {settings.footerText}
                  </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                  {settings.socialTwitter && (
                    <a href={`https://twitter.com/${settings.socialTwitter}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Twitter size={16} /></a>
                  )}
                  {settings.socialGithub && (
                    <a href={`https://github.com/${settings.socialGithub}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Github size={16} /></a>
                  )}
                  <span>ZenPress CMS</span>
              </div>
          </div>
        </footer>
      </div>
    );
  }

  // Render Home
  return (
    <div className={`min-h-screen bg-white selection:bg-black selection:text-white h-screen overflow-y-auto`} style={fontFamilyStyle}>
        {settings.customCss && <style>{settings.customCss}</style>}
        {modalImage && <ImageModal />}
        
        {/* Admin Bar Overlay */}
        {settings.showAdminButtons !== false && (
            <div className="fixed bottom-6 right-6 z-50">
                <button 
                    onClick={onBackToDashboard}
                    className={`${accentBgClass} text-white px-6 py-4 shadow-2xl hover:opacity-90 transition-all hover:-translate-y-1 flex items-center gap-3 font-mono font-bold text-[10px] uppercase tracking-widest ${borderRadiusClass}`}
                >
                    <LayoutDashboard size={14} />
                    System
                </button>
            </div>
        )}

        <HeaderContent />

      <main className="max-w-6xl mx-auto px-6 py-24">
        {(settings.headerStyle === 'left' || settings.headerStyle === 'split') && (
            <div className="mb-24 max-w-4xl">
                <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-[0.9] tracking-tighter">{settings.description}</h2>
                <div className={`h-2 w-32 ${accentBgClass} ${borderRadiusClass}`}></div>
            </div>
        )}

        {/* List View Mode (Magazine Layout) */}
        {settings.homePageMode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
                {feedPosts.length === 0 ? (
                    <div className={`col-span-full text-center py-24 bg-gray-50 border border-dashed border-gray-200 ${borderRadiusClass}`}>
                        <p className="text-xl text-gray-400 italic">The archive is currently empty.</p>
                    </div>
                ) : (
                    feedPosts.map(post => (
                        <article key={post.id} className="group flex flex-col">
                            {post.coverImage && (
                                <div className={`w-full aspect-[4/3] overflow-hidden border border-gray-100 mb-8 relative ${borderRadiusClass} cursor-pointer`}>
                                    <img 
                                        src={post.coverImage} 
                                        alt={post.title} 
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                                        onClick={() => navigate(`/posts/${slugify(post.title)}`)}
                                    />
                                    <div className={`absolute top-4 left-4 ${accentBgClass} text-white px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest ${borderRadiusClass}`}>
                                        {post.tags[0] || 'Entry'}
                                    </div>
                                    <button 
                                        className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 backdrop-blur-md transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setModalImage(post.coverImage || null);
                                        }}
                                    >
                                        <Maximize2 size={14} />
                                    </button>
                                </div>
                            )}
                            <div className="flex-1 flex flex-col">
                                {settings.showDate && (
                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-4">
                                        <span>{format(post.createdAt, 'MMM d, yyyy')}</span>
                                    </div>
                                )}
                                <h2 className={`text-4xl font-bold text-gray-900 mb-4 leading-[0.95] tracking-tight`}>
                                    <Link to={`/posts/${slugify(post.title)}`}>{post.title}</Link>
                                </h2>
                                <p className="text-gray-600 leading-relaxed mb-8 line-clamp-3 text-lg opacity-80">
                                    {post.excerpt}
                                </p>
                                <div className="mt-auto pt-6 border-t border-gray-100 flex justify-between items-center">
                                    <Link 
                                        to={`/posts/${slugify(post.title)}`}
                                        className={`text-[10px] font-bold ${accentTextClass} font-mono uppercase tracking-widest hover:translate-x-2 transition-transform`}
                                    >
                                        Open Entry &rarr;
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        )}

        {/* Feed View Mode */}
        {settings.homePageMode === 'feed' && (
            <div className="flex flex-col gap-40">
                 {feedPosts.length === 0 ? (
                    <div className={`col-span-full text-center py-24 bg-gray-50 border border-dashed border-gray-200 ${borderRadiusClass}`}>
                        <p className="text-xl text-gray-400 italic">The archive is currently empty.</p>
                    </div>
                ) : (
                    feedPosts.map(post => (
                        <article key={post.id} className={`${widthClass} mx-auto border-b-2 border-gray-100 pb-24 last:border-0`}>
                            <header className="mb-12 text-center">
                                 <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-gray-400 mb-6 font-bold uppercase tracking-widest">
                                    {settings.showDate && <span>{format(post.createdAt, 'MMMM d, yyyy')}</span>}
                                    {settings.showDate && <span>/</span>}
                                    <span className={accentTextClass}>{post.tags[0] || 'Uncategorized'}</span>
                                </div>
                                <h2 
                                    className="text-5xl md:text-6xl font-bold text-gray-900 leading-[0.9] mb-8 tracking-tighter cursor-pointer hover:underline decoration-4 underline-offset-4 decoration-current"
                                >
                                    <Link to={`/posts/${slugify(post.title)}`}>{post.title}</Link>
                                </h2>
                                {settings.showAuthor && (
                                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                                        Writer: {post.author}
                                    </div>
                                )}
                            </header>

                             {post.coverImage && (
                                <div className="mb-12 cursor-zoom-in" onClick={() => setModalImage(post.coverImage || null)}>
                                    <img src={post.coverImage} alt={post.title} className={`w-full h-auto grayscale ${borderRadiusClass}`} />
                                </div>
                            )}

                            <div 
                                onClick={handleImageClick}
                                className="prose prose-xl prose-stone max-w-none prose-p:text-gray-700 prose-headings:text-black prose-a:text-black"
                                style={{ fontFamily: 'inherit' }}
                                dangerouslySetInnerHTML={{ __html: resolveContent(post.content, media, settings) }} 
                            />
                        </article>
                    ))
                )}
            </div>
        )}
      </main>

      <footer className={`border-t-4 ${accentBorderClass} mt-32 bg-gray-50`}>
          <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                  <h4 className="font-bold font-mono text-xs uppercase tracking-widest mb-2">{settings.title}</h4>
                  <p className="text-gray-500 font-mono text-[10px] max-w-xs leading-relaxed">
                      {settings.footerText}
                  </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                  {settings.socialTwitter && (
                    <a href={`https://twitter.com/${settings.socialTwitter}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Twitter size={16} /></a>
                  )}
                  {settings.socialGithub && (
                    <a href={`https://github.com/${settings.socialGithub}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Github size={16} /></a>
                  )}
                  <span>ZenPress CMS</span>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default SitePreview;
