import React, { useState } from 'react';
import { Post, PostStatus, PostType } from '../types';
import { Search, Filter, Edit3, Trash2, FileText, Layout } from 'lucide-react';
import { format } from 'date-fns';

interface PostListProps {
  posts: Post[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, onEdit, onDelete }) => {
  const [viewType, setViewType] = useState<PostType>('post');
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const [search, setSearch] = useState('');

  const filteredPosts = posts.filter(post => {
    const isCorrectType = post.type === viewType;
    const matchesFilter = filter === 'all' || post.status === filter;
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(search.toLowerCase());
    return isCorrectType && matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col font-mono">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">Content Index</h2>
            <p className="text-gray-500 mt-1 text-xs">Manage editorial content and site structure.</p>
        </div>
        <div className="flex items-center gap-2">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={14} />
                <input 
                    type="text" 
                    placeholder="Search query..." 
                    className="pl-9 pr-3 py-2 border border-gray-200 bg-white focus:outline-none focus:border-black text-xs w-64 transition-colors placeholder-gray-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <div className="relative">
                 <select 
                    className="appearance-none pl-3 pr-8 py-2 border border-gray-200 bg-white focus:outline-none focus:border-black text-xs uppercase tracking-wide font-bold text-gray-700 cursor-pointer"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                 >
                     <option value="all">Status: All</option>
                     <option value={PostStatus.PUBLISHED}>Status: Live</option>
                     <option value={PostStatus.DRAFT}>Status: Draft</option>
                 </select>
                 <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
             </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-0 border-b border-gray-200">
          <button 
            onClick={() => setViewType('post')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${viewType === 'post' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
          >
              <FileText size={14} /> Blog Posts
          </button>
          <button 
            onClick={() => setViewType('page')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${viewType === 'page' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
          >
              <Layout size={14} /> Static Pages
          </button>
      </div>

      <div className="bg-white border-x border-b border-gray-200 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-1/2">Descriptor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">State</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ops</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredPosts.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400 uppercase tracking-wide">
                            No {viewType}s found
                        </td>
                    </tr>
                ) : (
                    filteredPosts.map(post => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 text-sm truncate max-w-md">{post.title || "UNTITLED_ENTRY"}</div>
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-xs font-sans">{post.excerpt || "No summary available"}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                           @{post.author.toLowerCase()}
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 border text-[10px] font-bold uppercase tracking-wider
                                ${post.status === PostStatus.PUBLISHED ? 'border-gray-900 text-gray-900 bg-white' : 'border-gray-200 text-gray-400 bg-gray-50 dashed-border'}
                            `}>
                                {post.status === PostStatus.PUBLISHED ? 'PUB' : 'DRF'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 tabular-nums">
                            {format(post.updatedAt, 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onEdit(post.id)}
                                    className="p-1.5 text-gray-400 hover:text-black hover:bg-white border border-transparent hover:border-gray-200 transition-all"
                                    title="Edit"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button 
                                    onClick={() => {
                                        if(window.confirm('Confirm deletion of this record?')) {
                                            onDelete(post.id);
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default PostList;