import React from 'react';
import { LayoutDashboard, FileText, Settings, LogOut, Plus, Globe, Image, Rocket, LifeBuoy } from 'lucide-react';
import { View } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onChangeView: (view: View) => void;
  siteName: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, siteName, onLogout }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center space-x-3 px-3 py-2 text-xs uppercase tracking-wider transition-all border-l-2 ${
        currentView === view
          ? 'border-white text-white bg-gray-800'
          : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-900'
      }`}
    >
      <Icon size={14} strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-white font-mono text-gray-900">
      {/* Sidebar */}
      <aside className="w-56 bg-black text-white flex flex-col z-20 border-r border-gray-800">
        <div className="p-5 border-b border-gray-800">
            <button 
                onClick={() => onChangeView('site')} 
                className="flex items-center gap-2 group w-full"
                title="View Live Site"
            >
                <div className="w-3 h-3 bg-white group-hover:bg-gray-300 transition-colors"></div>
                <span className="font-bold tracking-tighter text-sm hover:text-gray-300 transition-colors focus:outline-none">
                    {siteName}
                </span>
            </button>
        </div>

        <nav className="flex-1 py-6 space-y-4">
            <div className="px-4">
                <button
                    onClick={() => onChangeView('editor')}
                    className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-gray-200 text-black px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                    <Plus size={14} />
                    <span>New Entry</span>
                </button>
            </div>

            <div className="space-y-0.5">
                <p className="px-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2 mt-4">System</p>
                <NavItem view="dashboard" icon={LayoutDashboard} label="Overview" />
                <NavItem view="posts" icon={FileText} label="Content" />
                <NavItem view="media" icon={Image} label="Media" />
                <NavItem view="settings" icon={Settings} label="Settings" />
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-800 space-y-0.5">
                <p className="px-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">Deploy</p>
                <NavItem view="publish" icon={Rocket} label="Publish" />
                <button
                    onClick={() => onChangeView('site')}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-wider border-l-2 border-transparent hover:border-white hover:bg-gray-900"
                >
                    <Globe size={14} strokeWidth={1.5} />
                    <span>Live Site</span>
                </button>
            </div>
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-1">
          <NavItem view="help" icon={LifeBuoy} label="Documentation" />
          <button 
            onClick={onLogout}
            className="flex items-center space-x-3 text-gray-500 hover:text-white transition-colors w-full px-3 py-2 text-xs uppercase tracking-wider mt-2"
          >
            <LogOut size={14} />
            <span>Terminate</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default Layout;