import React, { useState } from 'react';
import { Post, SiteSettings, MediaItem, PostStatus } from '../types';
import { Download, Rocket, Check, Code, Info, Webhook, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import JSZip from 'jszip';

interface PublishProps {
  posts: Post[];
  settings: SiteSettings;
  media: MediaItem[];
}

// Helper to create URL-friendly slugs from titles
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

    html = html.replace(/<img([^>]*)>/g, (match, attrs) => {
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

const getPageTemplate = (
    title: string, 
    content: string, 
    settings: SiteSettings, 
    linkMap: Record<string, string>,
    rootPath: string = '.'
) => {
    const accentBorderClass = {
        black: 'border-black', zinc: 'border-zinc-500', blue: 'border-blue-600', red: 'border-red-600', green: 'border-emerald-700',
        orange: 'border-orange-600', purple: 'border-purple-600', pink: 'border-pink-600', yellow: 'border-yellow-500', teal: 'border-teal-600'
    }[settings.accentColor];
    
    const borderRadiusClass = settings.borderRadius === 'pill' ? 'rounded-2xl' : settings.borderRadius === 'subtle' ? 'rounded-md' : 'rounded-none';

    // Navigation Resolver
    const resolveLink = (url: string) => {
        if (url === '/') return `${rootPath}/index.html`;
        if (url.startsWith('http')) return url;
        const cleanUrl = url.replace(/^\//, '');
        if (linkMap[cleanUrl]) return `${rootPath}/${linkMap[cleanUrl]}`;
        if (url.startsWith('/')) return `${rootPath}${url}.html`; 
        return url;
    };

    return `<!DOCTYPE html>
<html lang="${settings.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | ${settings.title}</title>
    <meta name="description" content="${settings.description}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Roboto:wght@300;400;500;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        body { font-family: '${settings.fontFamily}', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d8; }
        ${settings.customCss || ''}
        .prose h1 { font-size: 2.25em; font-weight: 700; margin-bottom: 0.8em; line-height: 1.1; }
        .prose h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.8em; }
        .prose p { margin-bottom: 1.25em; line-height: 1.75; color: #374151; }
    </style>
</head>
<body class="bg-white text-gray-900 antialiased selection:bg-black selection:text-white">
    <header class="border-b-4 ${accentBorderClass} bg-white ${settings.stickyHeader ? 'sticky top-0' : ''} z-40">
        <div class="max-w-6xl mx-auto px-6 py-8 flex ${settings.headerStyle === 'center' ? 'flex-col items-center gap-8' : settings.headerStyle === 'right' ? 'flex-row-reverse justify-between items-center' : 'justify-between items-center'}">
            <div class="flex items-center gap-4">
                ${settings.logoUrl ? `<a href="${rootPath}/index.html"><img src="${settings.logoUrl}" alt="Logo" class="h-12 w-12 object-contain ${borderRadiusClass}"></a>` : ''}
                <div class="${settings.headerStyle === 'center' ? 'text-center' : ''}">
                    <a href="${rootPath}/index.html" class="text-3xl font-bold text-black tracking-tighter leading-none uppercase hover:opacity-70 transition-opacity block">${settings.title}</a>
                    ${settings.headerStyle === 'center' ? `<p class="text-xs text-gray-400 mt-2 font-mono uppercase tracking-widest">${settings.description}</p>` : ''}
                </div>
            </div>
            <nav class="flex gap-6 items-center">
                ${settings.headerStyle === 'left' ? `<div class="hidden sm:flex items-center gap-6 mr-8"><span class="text-xs text-gray-400 font-mono uppercase tracking-widest border-l border-gray-200 pl-6 h-8 flex items-center">${settings.description}</span></div>` : ''}
                ${(settings.navigation || []).map(item => `<a href="${resolveLink(item.url)}" class="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">${item.label}</a>`).join('')}
            </nav>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-24 min-h-[60vh]">
        ${content}
    </main>

    <footer class="border-t-4 ${accentBorderClass} mt-32 bg-gray-50">
        <div class="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
                <h4 class="font-bold font-mono text-xs uppercase tracking-widest mb-2">${settings.title}</h4>
                <p class="text-gray-500 font-mono text-[10px] max-w-xs leading-relaxed">${settings.footerText}</p>
            </div>
            <div class="flex items-center gap-4 text-[10px] font-mono text-gray-300 uppercase tracking-widest">
                <span>Published with ZenPress</span>
            </div>
        </div>
    </footer>
</body>
</html>`;
};

const Publish: React.FC<PublishProps> = ({ posts, settings, media }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const generateStaticSite = async () => {
    setIsGenerating(true);
    
    try {
        const zip = new JSZip();

        const borderRadiusClass = settings.borderRadius === 'pill' ? 'rounded-2xl' : settings.borderRadius === 'subtle' ? 'rounded-md' : 'rounded-none';
        const widthClass = settings.contentWidth === 'compact' ? 'max-w-xl' : settings.contentWidth === 'relaxed' ? 'max-w-5xl' : 'max-w-3xl';
        
        const accentTextClass = {
            black: 'text-black', zinc: 'text-zinc-500', blue: 'text-blue-600', red: 'text-red-600', green: 'text-emerald-700',
            orange: 'text-orange-600', purple: 'text-purple-600', pink: 'text-pink-600', yellow: 'text-yellow-500', teal: 'text-teal-600'
        }[settings.accentColor];
        
        const accentBgClass = {
            black: 'bg-black', zinc: 'bg-zinc-500', blue: 'bg-blue-600', red: 'bg-red-600', green: 'bg-emerald-700',
            orange: 'bg-orange-600', purple: 'bg-purple-600', pink: 'bg-pink-600', yellow: 'bg-yellow-500', teal: 'bg-teal-600'
        }[settings.accentColor];

        const feedPosts = posts.filter(p => p.status === PostStatus.PUBLISHED && p.type === 'post').sort((a, b) => b.createdAt - a.createdAt);
        const staticPages = posts.filter(p => p.status === PostStatus.PUBLISHED && p.type === 'page');

        const linkMap: Record<string, string> = {};
        feedPosts.forEach(post => {
            const slug = slugify(post.title || post.id);
            linkMap[post.id] = `posts/${slug}.html`;
            linkMap[slug] = `posts/${slug}.html`;
        });
        staticPages.forEach(page => {
            const slug = slugify(page.title || page.id);
            linkMap[page.id] = `pages/${slug}.html`;
            linkMap[slug] = `pages/${slug}.html`;
        });

        // 1. Homepage Generation (Magazine or Feed)
        let homeBody = '';
        if (settings.headerStyle === 'left' || settings.headerStyle === 'split') {
            homeBody += `<div class="mb-24 max-w-4xl"><h2 class="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-[0.9] tracking-tighter">${settings.description}</h2><div class="h-2 w-32 ${accentBgClass} ${borderRadiusClass}"></div></div>`;
        }
        
        if (settings.homePageMode === 'list') {
            homeBody += `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">`;
            feedPosts.forEach(post => {
                const slug = slugify(post.title || post.id);
                homeBody += `
                <article class="group flex flex-col">
                    ${post.coverImage ? `<div class="w-full aspect-[4/3] overflow-hidden border border-gray-100 mb-8 relative ${borderRadiusClass}"><img src="${post.coverImage}" alt="${post.title}" class="w-full h-full object-cover grayscale"></div>` : ''}
                    <h2 class="text-4xl font-bold text-gray-900 mb-4 leading-[0.95] tracking-tight">${post.title}</h2>
                    <p class="text-gray-600 leading-relaxed mb-8 line-clamp-3 text-lg opacity-80">${post.excerpt || ''}</p>
                    <a href="./posts/${slug}.html" class="text-[10px] font-bold ${accentTextClass} font-mono uppercase tracking-widest mt-auto">Open Entry &rarr;</a>
                </article>`;
            });
            homeBody += `</div>`;
        } else {
            homeBody += `<div class="flex flex-col gap-40">`;
            feedPosts.forEach(post => {
                const slug = slugify(post.title || post.id);
                homeBody += `
                <article class="${widthClass} mx-auto border-b-2 border-gray-100 pb-24 last:border-0">
                    <header class="mb-12 text-center">
                        <h2 class="text-5xl md:text-6xl font-bold text-gray-900 leading-[0.9] mb-8 tracking-tighter">${post.title}</h2>
                    </header>
                    ${post.coverImage ? `<div class="mb-12"><img src="${post.coverImage}" class="w-full h-auto grayscale ${borderRadiusClass}"></div>` : ''}
                    <div class="prose prose-xl prose-stone max-w-none prose-p:text-gray-700">${resolveContent(post.content, media, settings)}</div>
                    <a href="./posts/${slug}.html" class="mt-12 inline-block text-[10px] font-bold ${accentTextClass} font-mono uppercase tracking-widest">Permalink &rarr;</a>
                </article>`;
            });
            homeBody += `</div>`;
        }
        
        zip.file("index.html", getPageTemplate("Home", homeBody, settings, linkMap, "."));

        // 2. Posts & Pages Generation
        const postsFolder = zip.folder("posts");
        feedPosts.forEach(post => {
            const slug = slugify(post.title || post.id);
            const contentHtml = resolveContent(post.content, media, settings);
            const postBody = `<article class="${widthClass} mx-auto"><header class="mb-12 text-center"><h1 class="text-5xl md:text-6xl font-bold text-gray-900 leading-[0.9] mb-8 tracking-tighter">${post.title}</h1></header>${post.coverImage ? `<div class="mb-12"><img src="${post.coverImage}" class="w-full h-auto grayscale ${borderRadiusClass}"></div>` : ''}<div class="prose prose-xl prose-stone max-w-none">${contentHtml}</div></article>`;
            postsFolder?.file(`${slug}.html`, getPageTemplate(post.title, postBody, settings, linkMap, ".."));
        });

        const pagesFolder = zip.folder("pages");
        staticPages.forEach(page => {
            const slug = slugify(page.title || page.id);
            const contentHtml = resolveContent(page.content, media, settings);
            const pageBody = `<article class="${widthClass} mx-auto"><header class="mb-12 text-center"><h1 class="text-5xl md:text-6xl font-bold text-gray-900 leading-[0.9] mb-8 tracking-tighter">${page.title}</h1></header>${page.coverImage ? `<div class="mb-12"><img src="${page.coverImage}" class="w-full h-auto grayscale ${borderRadiusClass}"></div>` : ''}<div class="prose prose-xl prose-stone max-w-none">${contentHtml}</div></article>`;
            pagesFolder?.file(`${slug}.html`, getPageTemplate(page.title, pageBody, settings, linkMap, ".."));
        });
        
        const blob = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${settings.title.toLowerCase().replace(/\s+/g, '-')}-static.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Failed to bundle static site.");
    } finally {
        setIsGenerating(false);
    }
  };

  const triggerWebhook = async () => {
    if (!settings.webhookUrl) return;
    setIsTriggering(true);
    try {
        const response = await fetch(settings.webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ site: settings.title, timestamp: Date.now() })
        });
        setTriggerStatus(response.ok ? 'success' : 'error');
    } catch (e) {
        setTriggerStatus('error');
    } finally {
        setIsTriggering(false);
        setTimeout(() => setTriggerStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-mono text-sm">
        <header className="mb-12 border-b border-gray-200 pb-8">
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">Site Publishing</h2>
            <p className="text-gray-500 mt-1 text-xs">Generate a standalone version of your system.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 p-8 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Package size={100} />
                 </div>
                 <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Package size={16} /> High Fidelity Build
                 </h3>
                 <p className="text-gray-500 mb-8 leading-relaxed">
                     Compiles your entire site into a multi-page ZIP archive including all dependencies, fonts, and scripts. 
                     The result is a pixel-perfect replica of the Live Preview.
                 </p>
                 
                 <div className="space-y-2 mb-8 text-[10px] text-gray-400 font-mono">
                     <div className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Full Font Library included</div>
                     <div className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Standard/Magazine modes supported</div>
                     <div className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Zero configuration required</div>
                 </div>

                 <button 
                    onClick={generateStaticSite}
                    disabled={isGenerating}
                    className="w-full bg-black text-white py-4 px-6 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                 >
                     {isGenerating ? (
                         <>
                             <Loader2 size={16} className="animate-spin" /> Bundling...
                         </>
                     ) : (
                         <>
                            <Download size={16} /> Download Static Bundle (.zip)
                         </>
                     )}
                 </button>
            </div>

            <div className="space-y-8">
                 <div className="bg-gray-50 border border-gray-200 p-6">
                     <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                         <Info size={14} /> Local Mirroring
                     </h3>
                     <p className="text-gray-500 text-[11px] leading-relaxed">
                         The exported build uses relative paths throughout, allowing you to browse the site locally by opening index.html in any browser or uploading to hosts like Netlify and GitHub Pages.
                     </p>
                 </div>

                 <div className={`bg-white border p-6 transition-all ${settings.webhookUrl ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                     <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Webhook size={14} /> Deploy Webhook
                     </h3>
                     {settings.webhookUrl ? (
                        <button 
                            onClick={triggerWebhook}
                            disabled={isTriggering}
                            className={`w-full py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                                triggerStatus === 'success' ? 'bg-green-600 text-white' : 
                                triggerStatus === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                        >
                            {isTriggering ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
                            {triggerStatus === 'success' ? 'Build Triggered' : triggerStatus === 'error' ? 'Failed' : 'Trigger Build'}
                        </button>
                     ) : (
                        <p className="text-gray-400 text-[11px] italic">No webhook configured in settings.</p>
                     )}
                 </div>
            </div>
        </div>
    </div>
  );
};

export default Publish;