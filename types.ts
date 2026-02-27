
export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export type PostType = 'post' | 'page';

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: PostStatus;
  type: PostType;
  author: string;
  createdAt: number;
  updatedAt: number;
  coverImage?: string;
  tags: string[];
}

export interface MenuItem {
  id: string;
  label: string;
  url: string; // Can be a URL or "post:{id}"
}

export interface SiteSettings {
  title: string;
  description: string;
  footerText: string;
  language: string;
  postsPerPage: number;
  logoUrl?: string;
  socialTwitter?: string;
  socialGithub?: string;
  homePageMode: 'list' | 'feed';
  showAuthor: boolean;
  showDate: boolean;
  
  // Navigation
  navigation: MenuItem[];

  // Header Options
  headerStyle: 'left' | 'center' | 'split' | 'right';
  stickyHeader: boolean;
  showAdminButtons?: boolean;

  // Design Options
  fontFamily: string; // Changed from union type to string to support specific font names
  accentColor: 'black' | 'zinc' | 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow' | 'teal';
  borderRadius: 'none' | 'subtle' | 'pill';
  contentWidth: 'compact' | 'standard' | 'relaxed';
  customCss?: string;

  // Security & Integrations
  adminEmail?: string;
  adminPassword?: string;
  webhookUrl?: string;
}

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: string;
  mediaType?: MediaType;
  createdAt: number;
  size: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'editor';
}

export type View = 'dashboard' | 'posts' | 'media' | 'editor' | 'settings' | 'site' | 'publish' | 'help';

export interface RouterState {
  view: View;
  postId?: string | null;
}