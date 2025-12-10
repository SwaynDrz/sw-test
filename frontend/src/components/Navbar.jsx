import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, Tv, Heart, History, Crown, User, LogOut, Users, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  // Récupérer l'avatar depuis localStorage
  const [selectedAvatar, setSelectedAvatar] = React.useState(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`avatar_${user.email}`);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Mettre à jour l'avatar quand l'utilisateur change
  React.useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`avatar_${user.email}`);
      setSelectedAvatar(saved ? JSON.parse(saved) : null);
    }
  }, [user]);

  const navItems = [
    { name: 'Accueil', path: '/', icon: Home },
    { name: 'Films', path: '/movies', icon: Film },
    { name: 'Séries', path: '/series', icon: Tv },
    { name: 'Abonnements', path: '/subscriptions', icon: Crown },
    { name: 'Favoris', path: '/favorites', icon: Heart },
    { name: 'Historique', path: '/history', icon: History },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-3 md:py-4" data-testid="navbar">
      <div className="flex items-center justify-between max-w-[2000px] mx-auto">
        {/* Logo */}
        <h1
          onClick={() => navigate('/')}
          className="text-xl md:text-2xl lg:text-3xl font-bold cursor-pointer bg-gradient-to-r from-red-600 to-red-600 bg-clip-text text-transparent"
          style={{ 
            fontFamily: 'Space Grotesk, sans-serif',
            letterSpacing: '0.05em'
          }}
          data-testid="logo"
        >
          SW STREAMING
        </h1>

        {/* Navigation - Desktop only */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive(item.path)
                    ? 'text-[#e50914]'
                    : 'text-gray-200 hover:text-white'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Admin Button (only for admins) */}
          {user && isAdmin() && (
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="ghost"
              className="hidden md:flex text-[#e50914] hover:text-white hover:bg-[#e50914]/10 transition-all"
              data-testid="admin-panel-btn"
            >
              <Shield className="mr-2 h-4 w-4" />
              Panel Admin
            </Button>
          )}

          {/* User Menu */}
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-full transition-all"
              data-testid="profile-btn"
            >
              {selectedAvatar ? (
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${selectedAvatar.color} flex items-center justify-center text-2xl shadow-lg border-2 border-gray-600`}>
                  {selectedAvatar.emoji}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#e50914] to-[#b20710] flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-gray-600">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </button>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#e50914] hover:bg-[#f40612] shadow-lg"
              data-testid="login-btn"
            >
              <User className="mr-2 h-4 w-4" />
              Connexion
            </Button>
          )}
        </div>
      </div>

      {/* Navigation scrollable - Mobile & Tablette */}
      <nav className="lg:hidden overflow-x-auto scrollbar-hide px-4 mt-2">
        <div className="flex items-center gap-2 min-w-max pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive(item.path)
                    ? 'bg-[#e50914] text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Style pour cacher la scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </header>
  );
};

export default Navbar;