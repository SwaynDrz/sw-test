import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Film, Tv, Trash2, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import axiosInstance from '../utils/axios';
import { useAuth } from '../context/AuthContext';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [seriesFreeAccess, setSeriesFreeAccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    fetchSeriesAccessSettings();
  }, []);

  const fetchSeriesAccessSettings = async () => {
    try {
      const response = await axiosInstance.get('/admin/settings/series-access');
      setSeriesFreeAccess(response.data.series_free_access);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setSeriesFreeAccess(false);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadHistory = () => {
    const stored = localStorage.getItem('watch_history');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sort by timestamp descending (plus récent en haut, plus ancien en bas)
      setHistory(parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }
  };

  const clearHistory = () => {
    if (window.confirm('Effacer tout l\'historique ?')) {
      localStorage.removeItem('watch_history');
      setHistory([]);
    }
  };

  const removeItem = (id) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('watch_history', JSON.stringify(updated));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (item) => {
    if (!item.duration || item.duration === 0) return 0;
    return Math.min((item.progress / item.duration) * 100, 100);
  };

  const handleResume = (item) => {
    navigate('/player', {
      state: {
        videoUrl: item.video_url,
        contentId: item.id,
        contentType: item.type,
        startTime: item.progress || 0,
        // Pour les séries, on ajoute les infos nécessaires
        ...(item.type === 'series' && {
          seriesId: item.seriesId,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber
        })
      }
    });
  };

  // Filtrer l'historique en fonction des permissions d'accès
  const getFilteredHistory = () => {
    // Si les paramètres sont en cours de chargement, retourner l'historique complet
    if (settingsLoading) {
      return history;
    }

    // Vérifier si l'utilisateur a accès aux séries
    const hasPremiumAccess = user && (user.subscription === 'premium' || user.subscription === 'vip');
    const hasSeriesAccess = hasPremiumAccess || seriesFreeAccess;

    // Si l'utilisateur a accès aux séries, retourner tout l'historique
    if (hasSeriesAccess) {
      return history;
    }

    // Sinon, filtrer les séries de l'historique
    return history.filter(item => item.type !== 'series');
  };

  const filteredHistory = getFilteredHistory();

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="history-page">
      <Navbar />

      <div className="pt-24 px-8 max-w-[2000px] mx-auto">
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-end mb-8">
            <Button
              onClick={clearHistory}
              variant="outline"
              className="border-gray-700 hover:bg-[#e50914]/10 hover:text-[#e50914]"
              data-testid="clear-history-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Effacer l'historique
            </Button>
          </div>
        )}

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <History className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucun historique</p>
            <p className="text-gray-500 text-sm mt-2">Vos vidéos regardées apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => {
              const Icon = item.type === 'movie' ? Film : Tv;
              const progressPercent = getProgressPercentage(item);
              const hasProgress = item.duration && item.progress;
              
              return (
                <div
                  key={item.id + item.timestamp}
                  className="bg-[#1a1a1b] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors overflow-hidden"
                  data-testid={`history-item-${item.id}`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div
                      onClick={() => {
                        if (item.type === 'movie') {
                          navigate(`/movie/${item.id}`);
                        } else {
                          // Pour les séries, utiliser seriesId au lieu de l'ID de l'épisode
                          navigate(`/series/${item.seriesId || item.id}`);
                        }
                      }}
                      className="flex-shrink-0 w-32 aspect-video bg-gray-900 rounded overflow-hidden cursor-pointer group relative"
                    >
                      {item.backdrop_url || item.poster_url ? (
                        <img
                          src={item.backdrop_url || item.poster_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Icon className="h-8 w-8" />
                        </div>
                      )}
                      {hasProgress && progressPercent < 95 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div
                        onClick={() =>
                          navigate(`/${item.type === 'movie' ? 'movie' : 'series'}/${item.id}`)
                        }
                        className="cursor-pointer"
                      >
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-gray-400">{formatDate(item.timestamp)}</p>
                        
                        {hasProgress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>{formatTime(item.progress)}</span>
                              <span>{formatTime(item.duration)}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#e50914] transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {hasProgress && progressPercent < 95 && (
                        <Button
                          onClick={() => handleResume(item)}
                          className="bg-[#e50914] hover:bg-[#c50812]"
                          data-testid={`resume-btn-${item.id}`}
                        >
                          <Play className="mr-2 h-4 w-4 fill-current" />
                          Reprendre
                        </Button>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-[#e50914] transition-colors"
                        data-testid={`remove-history-${item.id}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;