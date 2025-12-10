import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import useDevToolsBlocker from './hooks/useDevToolsBlocker';
import ScrollToTop from './components/ScrollToTop';

// Lazy Loading de toutes les pages
const Home = lazy(() => import('./pages/Home'));
const MoviesPage = lazy(() => import('./pages/MoviesPage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const Favorites = lazy(() => import('./pages/Favorites'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const SeriesDetail = lazy(() => import('./pages/SeriesDetail'));
const Player = lazy(() => import('./pages/Player'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/ProfileNew'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminMovies = lazy(() => import('./pages/admin/Movies'));
const AdminSeries = lazy(() => import('./pages/admin/Series'));
const AdminEpisodes = lazy(() => import('./pages/admin/Episodes'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const BulkImport = lazy(() => import('./pages/admin/BulkImport'));
const PasswordManager = lazy(() => import('./pages/admin/PasswordManager'));
const URLMigration = lazy(() => import('./pages/admin/URLMigration'));

// Composant de chargement élégant
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-4">
        {/* Spinner animé */}
        <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-[#e50914] rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-400 text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        Chargement...
      </p>
    </div>
  </div>
);

// Protected Route Component for Admin
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f10]">
        <div className="text-xl text-gray-400">Chargement...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f10]">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Accès refusé</h1>
        <p className="text-gray-400 mb-6">Vous devez être administrateur pour accéder à cette page</p>
        <Navigate to="/" replace />
      </div>
    );
  }
  
  return children;
};

function AppRoutes() {
  // Bloquer les DevTools sur PC uniquement
  useDevToolsBlocker();
  
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
        <Route path="/player" element={<Player />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/movies"
          element={
            <AdminRoute>
              <AdminMovies />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/series"
          element={
            <AdminRoute>
              <AdminSeries />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/episodes"
          element={
            <AdminRoute>
              <AdminEpisodes />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bulk-import"
          element={
            <AdminRoute>
              <BulkImport />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/password-manager"
          element={
            <AdminRoute>
              <PasswordManager />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/url-migration"
          element={
            <AdminRoute>
              <URLMigration />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;