import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, User, Mail, Shield, Calendar, Crown, Lock, ShieldCheck, 
  Eye, EyeOff, Zap, Star, LogOut, Check, Copy, Settings, Award,
  Film, Tv, Heart, Clock, TrendingUp, Activity, X
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '../utils/axios';
import Navbar from '../components/Navbar';

const ProfileNew = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  
  // États pour la section Sécurité
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour la section 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // États pour les stats
  const [stats, setStats] = useState({
    total_views: 0,
    movies_watched: 0,
    series_watched: 0,
    total_favorites: 0,
    last_movie: null,
    last_series: null,
    total_watch_hours: 0
  });

  // Récupérer le statut 2FA et les stats
  useEffect(() => {
    if (user) {
      fetchTwoFactorStatus();
      fetchUserStats();
    }
  }, [user]);

  const fetchTwoFactorStatus = async () => {
    try {
      const response = await axiosInstance.get('/auth/2fa/status');
      setTwoFactorEnabled(response.data.enabled);
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await axiosInstance.get('/auth/profile/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Récupérer l'avatar personnalisé
  const [avatar, setAvatar] = useState(() => {
    const saved = localStorage.getItem(`avatar_${user?.email}`);
    return saved ? JSON.parse(saved) : null;
  });

  // Fonction pour obtenir les initiales
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Obtenir la couleur de badge selon l'abonnement
  const getSubscriptionBadge = () => {
    switch (user?.subscription) {
      case 'vip':
        return {
          icon: Crown,
          text: 'VIP',
          gradient: 'from-yellow-500 via-yellow-400 to-orange-500',
          color: 'text-yellow-400',
          glow: 'shadow-yellow-500/50'
        };
      case 'premium':
        return {
          icon: Zap,
          text: 'Premium',
          gradient: 'from-[#e50914] via-[#f40612] to-[#ff1a1a]',
          color: 'text-[#e50914]',
          glow: 'shadow-[#e50914]/50'
        };
      default:
        return {
          icon: Star,
          text: 'Gratuit',
          gradient: 'from-gray-500 to-gray-600',
          color: 'text-gray-400',
          glow: 'shadow-gray-500/50'
        };
    }
  };

  // Obtenir le badge de rôle
  const getRoleBadge = () => {
    switch (user?.role) {
      case 'fondateur':
        return { text: 'Fondateur', color: 'text-white', icon: Award };
      case 'co_fondateur':
        return { text: 'Co-Fondateur', color: 'text-white', icon: Award };
      case 'super_admin':
        return { text: 'Super Admin', color: 'text-white', icon: Shield };
      case 'admin':
        return { text: 'Admin', color: 'text-white', icon: Shield };
      default:
        return { text: 'Utilisateur', color: 'text-white', icon: User };
    }
  };

  // Gérer le changement de mot de passe
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.put('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      toast.success('Mot de passe modifié avec succès');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Activer 2FA
  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/2fa/enable');
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
      toast.success('Scannez le QR code avec votre application d\'authentification');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'activation de la 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier et confirmer 2FA
  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/2fa/verify', {
        code: verificationCode
      });
      
      setTwoFactorEnabled(true);
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      toast.success('2FA activée avec succès');
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  // Désactiver 2FA
  const handleDisable2FA = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver la double authentification ?')) {
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/2fa/disable');
      setTwoFactorEnabled(false);
      toast.success('2FA désactivée');
      await refreshUser();
    } catch (error) {
      toast.error('Erreur lors de la désactivation de la 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Copier le secret
  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copié dans le presse-papier');
  };

  const subscriptionBadge = getSubscriptionBadge();
  const roleBadge = getRoleBadge();

  const tabs = [
    { id: 'general', label: 'Général', icon: User },
    { id: 'subscription', label: 'Abonnement', icon: Crown },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: '2fa', label: '2FA', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />
      
      <div className="pt-28 lg:pt-20 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Hero Section avec Avatar */}
        <div className="relative mb-8">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#e50914]/20 via-transparent to-transparent rounded-3xl blur-3xl"></div>
          
          <div className="relative bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-2xl p-8 overflow-hidden">
            {/* Pattern de fond */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, #e50914 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}></div>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Retour</span>
            </button>

            <div className="relative flex flex-col md:flex-row items-center md:items-center gap-8">
              {/* Avatar avec animation à gauche */}
              <div className="relative group flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-[#e50914] to-[#ff1a1a] rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#e50914] via-[#f40612] to-[#ff1a1a] flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-[#e50914]/50 border-4 border-[#1f1f1f]">
                  {avatar ? (
                    <span className="text-5xl">{avatar.emoji}</span>
                  ) : (
                    getInitials(user?.username)
                  )}
                </div>
                {/* Badge vérifié animé */}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#e50914] rounded-full flex items-center justify-center border-4 border-[#1f1f1f] shadow-lg animate-pulse">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Message de bienvenue au centre */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  Bienvenue sur votre profil
                </h1>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Gérez vos informations personnelles, votre abonnement et la sécurité de votre compte
                </p>
              </div>

              {/* Boutons à droite */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {/* Bouton Discord */}
                <a
                  href="https://discord.gg/vQz894Zdft"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] rounded-xl transition-all flex items-center gap-2 border border-[#5865F2]/20 hover:border-[#5865F2]/40 hover:shadow-lg hover:shadow-[#5865F2]/20"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="font-semibold">Discord</span>
                </a>

                {/* Bouton déconnexion */}
                <button
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="px-6 py-3 bg-[#e50914]/10 hover:bg-[#e50914]/20 text-[#e50914] rounded-xl transition-all flex items-center gap-2 border border-[#e50914]/20 hover:border-[#e50914]/40 hover:shadow-lg hover:shadow-[#e50914]/20"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout avec navigation à gauche et contenu à droite */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation à onglets verticale à gauche */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-[#1f1f1f] border border-gray-800 rounded-2xl p-2 flex flex-col gap-2 sticky top-24">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-6 py-4 font-semibold rounded-xl transition-all text-left ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#e50914] to-[#f40612] text-white shadow-lg shadow-[#e50914]/30'
                      : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contenu des onglets à droite */}
          <div className="flex-1 max-w-5xl">
          {/* Onglet Général */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pseudo */}
                <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-6 hover:border-[#e50914]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f40612] flex items-center justify-center shadow-lg group-hover:shadow-[#e50914]/50 transition-shadow">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pseudo</p>
                      <p className="text-xl font-bold text-white">{user?.username}</p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-6 hover:border-[#e50914]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f40612] flex items-center justify-center shadow-lg group-hover:shadow-[#e50914]/50 transition-shadow">
                      <Mail className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-xl font-bold text-white truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Rôle */}
                <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-6 hover:border-[#e50914]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f40612] flex items-center justify-center shadow-lg group-hover:shadow-[#e50914]/50 transition-shadow">
                      <roleBadge.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rôle</p>
                      <p className={`text-xl font-bold ${roleBadge.color}`}>
                        {roleBadge.text}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Membre depuis */}
                <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-6 hover:border-[#e50914]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e50914] to-[#f40612] flex items-center justify-center shadow-lg group-hover:shadow-[#e50914]/50 transition-shadow">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Membre depuis</p>
                      <p className="text-xl font-bold text-white">{formatDate(user?.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Abonnement */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {/* Card plan actuel premium */}
              <div className="relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#e50914] via-[#f40612] to-[#ff1a1a]"></div>
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}></div>
                
                <div className="relative p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <subscriptionBadge.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">Votre plan</p>
                      <h3 className="text-4xl font-bold text-white">Plan {subscriptionBadge.text}</h3>
                    </div>
                  </div>
                  
                  <p className="text-white/90 text-lg">
                    Profitez de l'expérience ultime avec un streaming de qualité exceptionnelle
                  </p>
                </div>
              </div>

              {/* Avantages */}
              <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-6">
                <h4 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  Avantages inclus
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user?.subscription === 'gratuit' && (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Tous les films en illimité</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Qualité Full HD</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Accès Watch Party pour films</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <X className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-gray-400 font-medium">Pas de séries</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <X className="w-5 h-5 text-red-400" />
                        </div>
                        <span className="text-gray-400 font-medium">Pas de contenu exclusif</span>
                      </div>
                    </>
                  )}

                  {user?.subscription === 'premium' && (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Tout du gratuit</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Toutes les séries</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Qualité Full HD</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Support prioritaire 24/7</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Demande d'ajout films/séries</span>
                      </div>
                    </>
                  )}

                  {user?.subscription === 'vip' && (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Tout du premium</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Toutes les séries</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Qualité Full HD</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Accès anticipé</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Support prioritaire 24/7</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-[#e50914]/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#e50914]" />
                        </div>
                        <span className="text-gray-200 font-medium">Demande d'ajout films/séries</span>
                      </div>
                    </>
                  )}
                </div>

                {user?.subscription === 'gratuit' && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <button
                      onClick={() => navigate('/subscriptions')}
                      className="w-full py-4 bg-gradient-to-r from-[#e50914] to-[#f40612] hover:from-[#f40612] hover:to-[#ff1a1a] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 text-lg"
                    >
                      Passer à Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Sécurité */}
          {activeTab === 'security' && (
            <div>
              <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-[#e50914]" />
                    Modifier votre mot de passe
                  </h3>
                  <p className="text-gray-400">Assurez-vous d'utiliser un mot de passe fort et unique</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                  {/* Mot de passe actuel */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent pr-12 placeholder-gray-500"
                        placeholder="Entrez votre mot de passe actuel"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent pr-12 placeholder-gray-500"
                        placeholder="Entrez votre nouveau mot de passe"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmer mot de passe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent placeholder-gray-500"
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                      minLength={8}
                    />
                  </div>

                  {/* Conseil de sécurité */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-300 font-medium mb-1">Conseil de sécurité</p>
                        <p className="text-sm text-blue-300/80">
                          Utilisez au moins 8 caractères avec des lettres, chiffres et symboles pour un mot de passe sécurisé.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton modifier */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-[#e50914] to-[#f40612] hover:from-[#f40612] hover:to-[#ff1a1a] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 text-lg"
                  >
                    {loading ? 'Modification en cours...' : 'Modifier le mot de passe'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Onglet 2FA */}
          {activeTab === '2fa' && (
            <div>
              <div className="bg-gradient-to-br from-[#1f1f1f] to-[#141414] border border-gray-800 rounded-xl p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-[#e50914]" />
                    Double authentification (2FA)
                  </h3>
                  <p className="text-gray-400">
                    Renforcez la sécurité de votre compte avec une double authentification
                  </p>
                </div>

                {!twoFactorEnabled && !qrCode ? (
                  // 2FA désactivée
                  <div>
                    <div className="bg-[#e50914]/10 border border-[#e50914]/20 rounded-xl p-6 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#e50914]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">⚠️</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-[#e50914] mb-1">2FA Désactivée</h4>
                          <p className="text-gray-400">Votre compte n'est pas protégé par la double authentification</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#2a2a2a] border border-gray-700 rounded-xl p-6 mb-6">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
                        <ShieldCheck className="w-5 h-5 text-[#e50914]" />
                        Comment activer la 2FA ?
                      </h4>
                      <div className="space-y-3">
                        <div className="flex gap-3 p-3 bg-[#1f1f1f] rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold flex-shrink-0">1</span>
                          <p className="text-gray-300">Téléchargez Google Authenticator, Microsoft Authenticator ou Authy</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-[#1f1f1f] rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold flex-shrink-0">2</span>
                          <p className="text-gray-300">Cliquez sur "Activer la 2FA" ci-dessous</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-[#1f1f1f] rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold flex-shrink-0">3</span>
                          <p className="text-gray-300">Scannez le QR code avec votre application</p>
                        </div>
                        <div className="flex gap-3 p-3 bg-[#1f1f1f] rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold flex-shrink-0">4</span>
                          <p className="text-gray-300">Entrez le code à 6 chiffres pour confirmer</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleEnable2FA}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-[#e50914] to-[#f40612] hover:from-[#f40612] hover:to-[#ff1a1a] text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[#e50914]/30 hover:shadow-[#e50914]/50 flex items-center justify-center gap-2 text-lg"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>{loading ? 'Activation...' : 'Activer la 2FA'}</span>
                    </button>
                  </div>
                ) : qrCode ? (
                  // Configuration 2FA en cours
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-block p-6 bg-white rounded-2xl mb-4 shadow-2xl">
                        <img src={qrCode} alt="QR Code 2FA" className="w-64 h-64" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">Scannez ce QR code</h4>
                      <p className="text-gray-400">Utilisez votre application d'authentification</p>
                    </div>

                    {secret && (
                      <div className="bg-[#2a2a2a] rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-2 font-medium">Code manuel (si vous ne pouvez pas scanner) :</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-[#1f1f1f] px-4 py-3 rounded-lg text-sm font-mono text-white border border-gray-700">{secret}</code>
                          <button
                            onClick={copySecret}
                            className="p-3 bg-[#e50914] hover:bg-[#f40612] rounded-lg transition-colors"
                          >
                            <Copy className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                        Entrez le code à 6 chiffres
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-xl px-4 py-4 text-white text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleVerify2FA}
                        disabled={loading || verificationCode.length !== 6}
                        className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {loading ? 'Vérification...' : 'Vérifier et activer'}
                      </button>

                      <button
                        onClick={() => {
                          setQrCode('');
                          setSecret('');
                          setVerificationCode('');
                        }}
                        className="px-6 py-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-xl transition-all border border-gray-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  // 2FA activée
                  <div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-7 h-7 text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-green-400 mb-1">2FA Activée</h4>
                          <p className="text-gray-400">Votre compte est maintenant protégé par la double authentification</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#2a2a2a] border border-gray-700 rounded-xl p-6 mb-6">
                      <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                        Protection active
                      </h4>
                      <p className="text-gray-300 text-sm">
                        À chaque connexion, vous devrez entrer le code généré par votre application d'authentification en plus de votre mot de passe.
                      </p>
                    </div>

                    <button
                      onClick={handleDisable2FA}
                      disabled={loading}
                      className="w-full py-4 bg-[#e50914]/10 hover:bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/20 rounded-xl transition-all disabled:opacity-50 font-semibold hover:border-[#e50914]/40"
                    >
                      {loading ? 'Désactivation...' : 'Désactiver la 2FA'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileNew;
