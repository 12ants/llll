import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostList from './components/PostList';
import Editor from './components/Editor';
import Login from './components/Login';
import SitePreview from './components/SitePreview';
import Settings from './components/Settings';
import MediaLibrary from './components/MediaLibrary';
import Publish from './components/Publish';
import Help from './components/Help';
import { Post, View, SiteSettings, MediaItem } from './types';
import { StorageService } from './services/storageService';

// Wrapper to handle post loading for the editor
const EditorWrapper = ({ 
  posts, 
  onSave, 
  onUploadMedia 
}: { 
  posts: Post[], 
  onSave: (post: Post, shouldNavigate?: boolean) => void, 
  onUploadMedia: (item: MediaItem) => void 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = id ? posts.find(p => p.id === id) : undefined;

  return (
    <div className="absolute inset-0 z-50 bg-white">
      <Editor 
        post={post} 
        onSave={onSave} 
        onCancel={() => navigate(posts.length > 0 ? '/admin/posts' : '/admin/dashboard')} 
        media={StorageService.getMedia()}
        onUploadMedia={onUploadMedia}
      />
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App State
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(StorageService.getSettings());

  // Load initial data & Auth check
  useEffect(() => {
    const checkAuth = () => {
        const storedAuth = localStorage.getItem('zenpress_auth');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
        }
        setIsLoadingAuth(false);
    };

    const loadedPosts = StorageService.getPosts();
    const loadedMedia = StorageService.getMedia();
    setPosts(loadedPosts);
    setMedia(loadedMedia);

    // Listener for dashboard quick action
    const handleNavEditor = () => {
        navigate('/admin/editor');
    };

    const handleNavHelp = () => {
        navigate('/admin/help');
    };
    
    window.addEventListener('nav-editor', handleNavEditor);
    window.addEventListener('nav-help', handleNavHelp);
    checkAuth();

    return () => {
        window.removeEventListener('nav-editor', handleNavEditor);
        window.removeEventListener('nav-help', handleNavHelp);
    };
  }, [navigate]);

  const handleLogin = () => {
      localStorage.setItem('zenpress_auth', 'true');
      setIsAuthenticated(true);
      navigate('/admin/dashboard');
  };

  const handleLogout = () => {
      localStorage.removeItem('zenpress_auth');
      setIsAuthenticated(false);
      navigate('/');
  };

  const handleNavigate = (newView: View) => {
    if (newView === 'site') {
        navigate('/');
        return;
    }
    navigate(`/admin/${newView}`);
  };

  const handleEditPost = (id: string) => {
    navigate(`/admin/editor/${id}`);
  };

  const handleDeletePost = (id: string) => {
    StorageService.deletePost(id);
    setPosts(StorageService.getPosts()); // Refresh
  };

  const handleSavePost = (post: Post, shouldNavigate: boolean = true) => {
    StorageService.savePost(post);
    setPosts(StorageService.getPosts());
    if (shouldNavigate) {
        navigate('/admin/posts');
    }
  };

  const handleSaveSettings = (newSettings: SiteSettings) => {
    StorageService.saveSettings(newSettings);
    setSettings(newSettings);
    alert('Settings saved.');
  };

  const handleUploadMedia = (item: MediaItem) => {
    StorageService.saveMedia(item);
    setMedia(StorageService.getMedia());
  };

  const handleDeleteMedia = (id: string) => {
    StorageService.deleteMedia(id);
    setMedia(StorageService.getMedia());
  };

  if (isLoadingAuth) return null;

  const currentAdminView = location.pathname.split('/')[2] as View || 'dashboard';

  return (
    <Routes>
      {/* Admin Login */}
      <Route path="/admin/login" element={
        isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login onLogin={handleLogin} />
      } />

      {/* Editor - Full Screen (Outside Layout) */}
      <Route path="/admin/editor/:id?" element={
        !isAuthenticated ? <Navigate to="/admin/login" replace /> : (
          <EditorWrapper 
            posts={posts}
            onSave={handleSavePost}
            onUploadMedia={handleUploadMedia}
          />
        )
      } />

      {/* Admin Routes */}
      <Route path="/admin/*" element={
        !isAuthenticated ? <Navigate to="/admin/login" replace /> : (
          <Layout 
            currentView={currentAdminView} 
            onChangeView={handleNavigate} 
            siteName={settings.title} 
            onLogout={handleLogout}
          >
            <Routes>
              <Route path="dashboard" element={<Dashboard posts={posts} onNavigateToPost={handleEditPost} />} />
              <Route path="posts" element={<PostList posts={posts} onEdit={handleEditPost} onDelete={handleDeletePost} />} />
              <Route path="media" element={<MediaLibrary media={media} onUpload={handleUploadMedia} onDelete={handleDeleteMedia} />} />
              <Route path="publish" element={<Publish posts={posts} settings={settings} media={media} />} />
              <Route path="settings" element={<Settings settings={settings} onSave={handleSaveSettings} />} />
              <Route path="help" element={<Help />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Layout>
        )
      } />

      {/* Site Root & Public Routes */}
      <Route path="/*" element={
        <SitePreview 
          posts={posts} 
          settings={settings}
          onBackToDashboard={() => navigate('/admin/dashboard')}
          onEditPost={handleEditPost}
          media={media}
        />
      } />
    </Routes>
  );
}

export default App;
