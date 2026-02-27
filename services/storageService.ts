import { Post, PostStatus, SiteSettings, MediaItem } from '../types';

const POSTS_KEY = 'zenpress_posts';
const SETTINGS_KEY = 'zenpress_settings';
const MEDIA_KEY = 'zenpress_media';

const DEFAULT_SETTINGS: SiteSettings = {
  title: 'ZenPress',
  description: 'A minimalist, monochrome CMS.',
  footerText: '© 2024 ZenPress Systems. All rights reserved.',
  language: 'en',
  postsPerPage: 10,
  homePageMode: 'feed', // Default to Standard Feed
  showAuthor: false,
  showDate: false,
  navigation: [
    { id: '1', label: 'Home', url: '/' },
    { id: '2', label: 'About', url: '/about' }
  ],
  headerStyle: 'left',
  stickyHeader: false,
  showAdminButtons: true,
  fontFamily: 'Merriweather', // Default to a specific serif
  accentColor: 'black',
  borderRadius: 'none',
  contentWidth: 'standard',
  customCss: '',
  adminEmail: 'user@system.local',
  adminPassword: 'admin',
  webhookUrl: ''
};

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    title: 'System Architecture v1',
    excerpt: 'Initial thoughts on the minimalist design system.',
    content: `<h1>System Architecture</h1>
<p>We are prioritizing <b>function over form</b>. The interface is stripped back to the raw essentials.</p>
<h2>Core Directives</h2>
<ul>
<li>Monospace typography for high data density.</li>
<li>Grayscale palette to reduce cognitive load.</li>
<li>Instant content delivery.</li>
</ul>
<p>The system is operational.</p>`,
    status: PostStatus.PUBLISHED,
    type: 'post',
    author: 'Admin',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['system', 'design'],
    coverImage: 'https://picsum.photos/800/400?grayscale'
  },
  {
      id: '2',
      title: 'About',
      excerpt: '',
      content: `<p>ZenPress is an experimental content management system designed for focus.</p><p>Built with React and Tailwind, it prioritizes the writing experience above all else.</p>`,
      status: PostStatus.PUBLISHED,
      type: 'page',
      author: 'Admin',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
  }
];

export interface BackupData {
    posts: Post[];
    media: MediaItem[];
    settings: SiteSettings;
    timestamp: number;
    version: number;
}

export const StorageService = {
  getPosts: (): Post[] => {
    try {
      const stored = localStorage.getItem(POSTS_KEY);
      if (!stored) return INITIAL_POSTS;
      
      const parsed = JSON.parse(stored);
      // Migration helper: ensure all posts have a type
      return parsed.map((p: any) => ({
          ...p,
          type: p.type || 'post'
      }));
    } catch (e) {
      console.error("Failed to load posts", e);
      return [];
    }
  },

  savePost: (post: Post): void => {
    const posts = StorageService.getPosts();
    const existingIndex = posts.findIndex(p => p.id === post.id);
    
    if (existingIndex >= 0) {
      posts[existingIndex] = post;
    } else {
      posts.unshift(post);
    }
    
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  },

  deletePost: (id: string): void => {
    const posts = StorageService.getPosts().filter(p => p.id !== id);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  },

  getPostById: (id: string): Post | undefined => {
    return StorageService.getPosts().find(p => p.id === id);
  },

  getSettings: (): SiteSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new fields are populated
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: SiteSettings): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  getMedia: (): MediaItem[] => {
    try {
      const stored = localStorage.getItem(MEDIA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveMedia: (mediaItem: MediaItem): void => {
    const media = StorageService.getMedia();
    media.unshift(mediaItem);
    if (media.length > 20) media.pop();
    try {
      localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
    } catch (e) {
      alert("Storage quota exceeded. Delete some images.");
    }
  },

  deleteMedia: (id: string): void => {
    const media = StorageService.getMedia().filter(m => m.id !== id);
    localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
  },

  getBackupData: (): BackupData => {
    return {
        posts: StorageService.getPosts(),
        media: StorageService.getMedia(),
        settings: StorageService.getSettings(),
        timestamp: Date.now(),
        version: 1
    };
  },

  restoreBackup: (data: BackupData): boolean => {
      try {
          if (!data || !Array.isArray(data.posts) || !data.settings) {
              return false;
          }
          localStorage.setItem(POSTS_KEY, JSON.stringify(data.posts));
          localStorage.setItem(MEDIA_KEY, JSON.stringify(data.media || []));
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
          return true;
      } catch (e) {
          console.error("Restore failed", e);
          return false;
      }
  },

  getStorageUsage: (): { used: number; total: number; percent: number } => {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += (localStorage[key].length * 2);
      }
    }
    const total = 5 * 1024 * 1024; // 5MB standard
    return { 
        used, 
        total, 
        percent: Math.min(100, Math.round((used / total) * 100)) 
    };
  }
};