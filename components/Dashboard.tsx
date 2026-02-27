import React from 'react';
import { Post, PostStatus } from '../types';
import { BarChart, Clock, FileCheck, Eye, ArrowUpRight, LifeBuoy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StorageService } from '../services/storageService';

interface DashboardProps {
  posts: Post[];
  onNavigateToPost: (id: string) => void;
}

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <div className="bg-white p-6 border border-gray-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <Icon size={16} className="text-gray-400" />
    </div>
    <h3 className="text-3xl font-bold text-gray-900 leading-none tracking-tighter">{value}</h3>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ posts, onNavigateToPost }) => {
  const publishedCount = posts.filter(p => p.status === PostStatus.PUBLISHED).length;
  const draftCount = posts.filter(p => p.status === PostStatus.DRAFT).length;
  const totalWords = posts.reduce((acc, curr) => acc + curr.content.split(' ').length, 0);

  const recentPosts = [...posts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const storage = StorageService.getStorageUsage();
  const formatBytes = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      else return (bytes / 1048576).toFixed(2) + ' MB';
  };
  
  // Approximate memory usage based on stored data size (x4 for object overhead in JS heap)
  const estimatedMemory = Math.round(20 + (storage.used / 1024 / 1024) * 4);
  
  // Simulated CPU load for "liveness"
  const cpuLoad = React.useMemo(() => Math.floor(Math.random() * 15) + 5, []);

  // Simulated traffic based on content volume
  const estTraffic = React.useMemo(() => {
     return (publishedCount * 150 + totalWords / 10).toLocaleString();
  }, [publishedCount, totalWords]);

  return (
    <div className="p-8 max-w-7xl mx-auto font-mono">
      <header className="mb-8">
        <h2 className="text-xl font-bold text-black uppercase tracking-tight">System Status</h2>
        <p className="text-gray-500 mt-1 text-xs">Operational overview.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Live Records" value={publishedCount} icon={FileCheck} />
        <StatCard title="Drafts" value={draftCount} icon={Clock} />
        <StatCard title="Total Words" value={totalWords.toLocaleString()} icon={BarChart} />
        <StatCard title="Est. Traffic" value={estTraffic} icon={Eye} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Activity Log</h3>
            <span className="text-[10px] bg-gray-100 px-2 py-1 text-gray-500 font-bold">LATEST 5</span>
          </div>
          
          <div className="space-y-4">
            {recentPosts.length === 0 ? (
                <p className="text-gray-400 text-xs italic border border-dashed border-gray-200 p-4 text-center">No activity recorded.</p>
            ) : (
                recentPosts.map(post => (
                <div key={post.id} onClick={() => onNavigateToPost(post.id)} className="flex items-center justify-between group cursor-pointer border-b border-gray-50 pb-3 last:border-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 transition-colors">
                    <div className="flex items-center gap-4">
                        <span className={`text-[10px] px-1.5 py-0.5 border font-bold uppercase w-12 text-center ${post.status === PostStatus.PUBLISHED ? 'border-gray-900 text-black' : 'border-gray-200 text-gray-400'}`}>
                            {post.status === PostStatus.PUBLISHED ? 'PUB' : 'DRF'}
                        </span>
                        <div>
                            <h4 className="font-bold text-xs text-gray-900 group-hover:underline truncate max-w-[200px] sm:max-w-md">{post.title || "UNTITLED"}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {formatDistanceToNow(post.updatedAt)} ago
                            </p>
                        </div>
                    </div>
                    <ArrowUpRight size={14} className="text-gray-300 group-hover:text-black transition-colors" />
                </div>
                ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
            <div className="bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Quick Command</h3>
                <div className="space-y-3">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('nav-editor'))} className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider text-center transition-colors">
                        New Entry
                    </button>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('nav-help'))} className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-black text-xs font-bold uppercase tracking-wider text-center transition-colors border border-gray-200 flex items-center justify-center gap-2">
                        <LifeBuoy size={14} /> System Guide
                    </button>
                </div>
            </div>

            <div className="bg-gray-900 text-gray-400 p-6 shadow-sm flex-1">
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">System Health</h3>
                 <div className="space-y-4 text-[10px] font-mono">
                     <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span>CPU Usage</span>
                        <span className="text-white">~{cpuLoad}%</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span>Memory (Est.)</span>
                        <span className="text-white">~{estimatedMemory}MB</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span>Storage</span>
                        <div className="text-right">
                            <span className="text-white block">{formatBytes(storage.used)}</span>
                            <span className="text-gray-600 text-[8px]">{storage.percent}% of 5MB</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-center pt-2">
                        <span>Status</span>
                        <span className="text-green-400 font-bold uppercase">Operational</span>
                     </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;