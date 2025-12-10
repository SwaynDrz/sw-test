import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Tv, PlaySquare, TrendingUp, Users, Download, Lock, Unlock, RefreshCw, Link2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import axiosInstance from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isFounder, isSuperUser } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Films', value: '0', icon: Film, color: 'bg-blue-500' },
    { label: 'Séries', value: '0', icon: Tv, color: 'bg-purple-500' },
    { label: 'Épisodes', value: '0', icon: PlaySquare, color: 'bg-green-500' },
    { label: 'Utilisateurs', value: '0', icon: Users, color: 'bg-[#e50914]' },
  ]);
  const [loading, setLoading] = useState(true);
  const [seriesFreeAccess, setSeriesFreeAccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    if (isFounder && isFounder()) {
      fetchSeriesAccessSettings();
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/stats');
      const data = response.data;
      
      setStats([
        { label: 'Films', value: data.movies.toString(), icon: Film, color: 'bg-blue-500' },
        { label: 'Séries', value: data.series.toString(), icon: Tv, color: 'bg-purple-500' },
        { label: 'Épisodes', value: data.episodes.toString(), icon: PlaySquare, color: 'bg-green-500' },
        { label: 'Utilisateurs', value: data.users.toString(), icon: Users, color: 'bg-[#e50914]' },
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDatabase = async () => {
    try {
      toast.info('Préparation de l\'export de la base de données...');
      
      const response = await axiosInstance.get('/admin/export-database', {
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `streaming_db_export_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Base de données téléchargée avec succès !');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement de la base de données');
    }
  };

  const fetchSeriesAccessSettings = async () => {
    try {
      const response = await axiosInstance.get('/admin/settings/series-access');
      setSeriesFreeAccess(response.data.series_free_access);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const toggleSeriesAccess = async () => {
    try {
      setToggleLoading(true);
      const response = await axiosInstance.put('/admin/settings/series-access/toggle');
      setSeriesFreeAccess(response.data.series_free_access);
      toast.success(response.data.message);
    } catch (error) {
      console.error('Erreur lors du changement de paramètre:', error);
      toast.error('Erreur lors du changement de paramètre');
    } finally {
      setToggleLoading(false);
    }
  };

  const refreshMetadata = async () => {
    try {
      setRefreshLoading(true);
      toast.info('Rafraîchissement des métadonnées en cours... Cela peut prendre quelques minutes.');
      
      const response = await axiosInstance.post('/admin/refresh-metadata');
      
      toast.success(
        `✅ Métadonnées rafraîchies ! Films: ${response.data.updated_movies}, Séries: ${response.data.updated_series}`,
        { duration: 5000 }
      );
      
      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(`Quelques erreurs détectées. Vérifiez les logs.`, { duration: 3000 });
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
      toast.error('Erreur lors du rafraîchissement des métadonnées');
    } finally {
      setRefreshLoading(false);
    }
  };


  const fixMissingDates = async () => {
    try {
      toast.info('Correction des dates en cours...');
      
      const response = await axiosInstance.post('/admin/fix-missing-dates');
      
      toast.success(
        `✅ Dates corrigées ! Films: ${response.data.movies_fixed}, Séries: ${response.data.series_fixed}, Épisodes: ${response.data.episodes_fixed}`,
        { duration: 5000 }
      );
      
      // Recharger les stats après la correction
      fetchStats();
    } catch (error) {
      console.error('Erreur lors de la correction des dates:', error);
      toast.error('Erreur lors de la correction des dates');
    }
  };


  const initRecentContent = async () => {
    try {
      toast.info('Initialisation des contenus récents...');
      
      const response = await axiosInstance.post('/admin/init-recent-content');
      
      toast.success(
        `✅ Initialisé ! ${response.data.movies_count} films + ${response.data.series_count} séries`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Erreur initialisation récents:', error);
      toast.error('Erreur lors de l\'initialisation');
    }
  };



  const allQuickActions = [
    {
      title: 'Exporter la Base de Données',
      description: 'Télécharger une copie complète de la base de données',
      icon: Download,
      action: downloadDatabase,
      color: 'bg-gradient-to-br from-yellow-600 to-yellow-800',
      founderOnly: true, // Réservé au Fondateur uniquement
    },
    {
      title: 'Import en Masse',
      description: 'Importer plusieurs films/séries avec TMDB',
      icon: TrendingUp,
      action: () => navigate('/admin/bulk-import'),
      color: 'bg-gradient-to-br from-[#e50914] to-[#c50812]',
    },
    {
      title: 'Gérer les Films',
      description: 'Voir, modifier et supprimer les films',
      icon: Film,
      action: () => navigate('/admin/movies'),
      color: 'bg-gradient-to-br from-blue-600 to-blue-800',
    },
    {
      title: 'Gérer les Séries',
      description: 'Voir, modifier et supprimer les séries',
      icon: Tv,
      action: () => navigate('/admin/series'),
      color: 'bg-gradient-to-br from-purple-600 to-purple-800',
    },
    {
      title: 'Gérer les Épisodes',
      description: 'Ajouter et gérer les épisodes',
      icon: PlaySquare,
      action: () => navigate('/admin/episodes'),
      color: 'bg-gradient-to-br from-green-600 to-green-800',
    },
    {
      title: 'Gérer les Utilisateurs',
      description: 'Voir et modifier les rôles des utilisateurs',
      icon: Users,
      action: () => navigate('/admin/users'),
      color: 'bg-gradient-to-br from-[#c50812] to-[#8b0000]',
      superUserOnly: true, // Réservé aux Fondateurs/Co-Fondateurs/Super Admin
    },
    {
      title: 'Mots de Passe',
      description: 'Changer les mots de passe des utilisateurs',
      icon: Users,
      action: () => navigate('/admin/password-manager'),
      color: 'bg-gradient-to-br from-yellow-600 to-yellow-800',
      founderOnly: true, // Réservé UNIQUEMENT aux Fondateurs
    },
    {
      title: 'Migration d\'URLs',
      description: 'Remplacer les URLs de vos contenus en masse',
      icon: Link2,
      action: () => navigate('/admin/url-migration'),
      color: 'bg-gradient-to-br from-pink-600 to-pink-800',
      founderOnly: true, // Réservé UNIQUEMENT aux Fondateurs
    },
  ];

  // Filtrer les éléments selon les permissions
  const quickActions = allQuickActions.filter(action => {
    if (action.founderOnly) {
      return isFounder && isFounder();
    }
    if (action.superUserOnly) {
      return isSuperUser && isSuperUser();
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1b] to-[#0f0f10]" data-testid="admin-dashboard">
      <Navbar />

      <div className="pt-24 px-8 max-w-7xl mx-auto">
        {/* Header avec gradient */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#e50914]/20 to-purple-600/20 blur-3xl"></div>
          <div className="relative">
            <h1
              className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Panel Administrateur
            </h1>
            <p className="text-gray-400 text-lg">Gérez votre contenu et vos utilisateurs</p>
          </div>
        </div>

        {/* Stats Grid - Design amélioré */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {loading ? (
            <div className="col-span-4 text-center py-12 text-gray-400">Chargement des statistiques...</div>
          ) : (
            stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-6 border border-gray-800 hover:border-[#e50914]/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#e50914]/20"
                >
                  {/* Effet de brillance au survol */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-4 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-4xl font-bold mb-2 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                      <p className="text-gray-400 font-medium">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paramètres d'Accès - Visible uniquement pour le Fondateur */}
        {isFounder && isFounder() && (
          <div className="mb-12 space-y-6">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Paramètres Avancés
            </h2>

            {/* Toggle Accès Séries */}
            <div className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-8 border border-gray-800 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">
                      Accès aux Séries - Membres Gratuits
                    </h3>
                    <p className={`text-base font-medium ${seriesFreeAccess ? 'text-green-400' : 'text-red-400'}`}>
                      {settingsLoading 
                        ? 'Chargement...'
                        : seriesFreeAccess 
                          ? 'Les membres gratuits peuvent accéder aux séries'
                          : 'Les séries sont réservées aux membres Premium et VIP'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={toggleSeriesAccess}
                  disabled={toggleLoading || settingsLoading}
                  className={`${
                    seriesFreeAccess
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                  } text-white px-8 py-4 text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50`}
                >
                  {toggleLoading ? 'Modification...' : seriesFreeAccess ? 'Bloquer l\'accès' : 'Autoriser l\'accès'}
                </Button>
              </div>
            </div>

            {/* Rafraîchissement et Utilitaires - Design amélioré */}
            <div className="space-y-6">
              {/* Rafraîchir les métadonnées */}
              <div className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-6 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <RefreshCw className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">
                        Rafraîchir les Métadonnées
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Mettre à jour les réalisateurs et acteurs depuis TMDB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={refreshMetadata}
                    disabled={refreshLoading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                  {refreshLoading ? 'En cours...' : 'Rafraîchir'}
                </Button>
                </div>
              </div>

              {/* Corriger les Dates */}
              <div className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-6 border border-gray-800 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <RefreshCw className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-green-400 transition-colors">
                        Corriger les Dates
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Ajouter created_at aux anciens contenus (films récents)
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={fixMissingDates}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Corriger
                  </Button>
                </div>
              </div>

              {/* Initialiser Contenus Récents */}
              <div className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-6 border border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <RefreshCw className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-purple-400 transition-colors">
                        Initialiser les Récents
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Charger les 10 derniers films/séries dans Films Récents
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={initRecentContent}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Initialiser
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Design amélioré */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="group relative bg-gradient-to-br from-[#1a1a1b] to-[#0f0f10] rounded-2xl p-8 border border-gray-800 hover:border-[#e50914]/50 transition-all duration-300 text-left overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-[#e50914]/10"
                >
                  {/* Effet de brillance animé */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  {/* Background color overlay */}
                  <div className={`absolute inset-0 ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className="relative flex items-start gap-6">
                    <div className={`${action.color} p-4 rounded-xl flex-shrink-0 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-[#e50914] transition-colors">{action.title}</h3>
                      <p className="text-gray-400 text-base leading-relaxed">{action.description}</p>
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <svg className="w-6 h-6 text-[#e50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;