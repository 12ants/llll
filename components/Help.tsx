import React from 'react';
import { BookOpen, Command, PenTool, Image, Globe, Settings, Shield, Zap, Keyboard, Layout } from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ElementType;
  children?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children }) => (
  <section className="bg-white border border-gray-200 p-8 shadow-sm mb-8">
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
      <Icon size={18} className="text-gray-400" />
      {title}
    </h3>
    <div className="prose prose-sm max-w-none text-gray-600 font-sans leading-relaxed">
      {children}
    </div>
  </section>
);

const Shortcut = ({ keys, desc }: { keys: string[]; desc: string }) => (
  <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{desc}</span>
    <div className="flex gap-1">
      {keys.map(k => (
        <kbd key={k} className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono font-bold text-gray-700 min-w-[24px] text-center">
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

const Help: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto font-mono text-sm pb-24">
      <header className="mb-12">
        <h2 className="text-xl font-bold text-black uppercase tracking-tight">System Documentation</h2>
        <p className="text-gray-500 mt-1 text-xs">Operational manual and reference guide.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Section title="Editor Core" icon={PenTool}>
            <p className="mb-4">
              The ZenPress editor is designed for distraction-free writing. It supports rich text formatting via the floating toolbar or keyboard shortcuts.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li><strong>Formatting:</strong> Highlight text to reveal the floating formatting toolbar (Bold, Italic, Links, Headers).</li>
              <li><strong>Media:</strong> Use the toolbar icon or type <code>/</code> (future) to insert images, videos, or audio. Drag and drop is supported directly onto the canvas.</li>
              <li><strong>Embeds:</strong> Paste a YouTube or Vimeo URL and press Enter to automatically convert it into an embedded player.</li>
              <li><strong>Zen Mode:</strong> Click the maximize icon to enter a fullscreen, chrome-less writing environment.</li>
            </ul>
            <div className="bg-gray-50 p-4 border-l-4 border-black text-xs">
              <strong>Note:</strong> Content is auto-saved locally to your browser's storage every few seconds. Look for the "Saved" indicator in the header.
            </div>
          </Section>

          <Section title="Media Management" icon={Image}>
            <p className="mb-4">
              The Media Library stores images and assets locally in your browser.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Storage Limit:</strong> Due to local storage limitations, there is a generic cap of ~5MB. For production use, consider hosting heavy assets externally and linking to them.</li>
              <li><strong>Editing:</strong> Click the crop/edit icon on an image in the library to open the Image Editor. You can crop, rotate, and apply basic filters.</li>
              <li><strong>Videos:</strong> Videos are stored as Data URLs. Short clips work best. For longer content, use YouTube embeds.</li>
            </ul>
          </Section>

          <Section title="Static Publishing" icon={Globe}>
            <p className="mb-4">
              ZenPress generates a completely static, portable website bundle.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li><strong>Export:</strong> Clicking "Download Site Archive" in the Publish view generates a <code>.zip</code> file containing your entire site.</li>
              <li><strong>Structure:</strong> The zip contains an <code>index.html</code> (homepage) and folders for <code>posts/</code> and <code>pages/</code>.</li>
              <li><strong>Slug Generation:</strong> Filenames are generated from your post titles (e.g., "My Post" becomes <code>posts/my-post.html</code>). Ensure titles are unique to avoid overwrites.</li>
              <li><strong>Navigation:</strong> Links in the menu are automatically resolved. If you have a page titled "About", you can link to <code>/about</code> in the Settings menu, and the generator will correctly map it to <code>pages/about.html</code>.</li>
            </ul>
          </Section>

          <Section title="Configuration" icon={Settings}>
             <p>
                 Global site settings are managed in the Settings view. You can customize the typography, color accent, layout geometry, and navigation menu. 
                 Changes here reflect immediately in the "Live Site" preview and the exported static build.
             </p>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
           <div className="bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Keyboard size={14} /> Key Bindings
              </h3>
              <div className="bg-gray-50 p-1 border border-gray-100 rounded">
                  <Shortcut keys={['Ctrl', 'B']} desc="Bold" />
                  <Shortcut keys={['Ctrl', 'I']} desc="Italic" />
                  <Shortcut keys={['Ctrl', 'K']} desc="Insert Link" />
                  <Shortcut keys={['Ctrl', 'S']} desc="Force Save" />
                  <Shortcut keys={['Esc']} desc="Close Modal" />
              </div>
           </div>

           <div className="bg-white border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield size={14} /> Security Note
              </h3>
              <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                  ZenPress runs entirely in your browser. No data is sent to a server unless you configure a Build Webhook.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                  If you clear your browser cache, your data will be lost. <strong>Regularly export backups</strong> via the Settings &gt; Data Management panel.
              </p>
           </div>

           <div className="bg-gray-900 text-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={14} /> Quick Start
              </h3>
              <ol className="list-decimal list-inside text-xs space-y-3 text-gray-400">
                  <li>Go to <strong>Settings</strong> to define your site title and layout.</li>
                  <li>Create a <strong>New Entry</strong> in the Editor.</li>
                  <li>Upload a cover image.</li>
                  <li>Set status to <strong>Published</strong>.</li>
                  <li>Go to <strong>Publish</strong> and download your site.</li>
              </ol>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Help;