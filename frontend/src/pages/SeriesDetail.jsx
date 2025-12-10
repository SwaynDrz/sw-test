import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../utils/axios';
import { Play, ArrowLeft, Star, Heart, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AdModal from '../components/AdModal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [seriesFreeAccess, setSeriesFreeAccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    fetchSeriesAndEpisodes();
    fetchSeriesAccessSettings();
  }, [id]);

  useEffect(() => {
    if (series) {
      checkFavorite();
    }
  }, [series]);

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

  const fetchSeriesAndEpisodes = async () => {
    try {
      const [seriesRes, episodesRes] = await Promise.all([
        axios.get(`${API}/series/${id}`),
        axios.get(`${API}/episodes?series_id=${id}&per_page=5000`), // Charger TOUS les épisodes
      ]);
      setSeries(seriesRes.data);
      setEpisodes(episodesRes.data.episodes || episodesRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.some((item) => item.id === series.id));
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      const updated = favorites.filter((item) => item.id !== series.id);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
      toast.success('Retiré des favoris');
    } else {
      favorites.push({ ...series, type: 'series' });
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
      toast.success('Ajouté aux favoris');
    }
  };

  const handlePlayEpisode = (e, videoUrl, episodeId, episodeTitle, seasonNumber, episodeNumber) => {
    // Empêcher la propagation
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Vérifier si video_url existe
    if (!videoUrl || videoUrl.trim() === '') {
      toast.error('URL de la vidéo manquante pour cet épisode');
      return;
    }
    
    // Navigation directe sans pub
    navigateToPlayerEpisode(videoUrl, episodeId, episodeTitle, seasonNumber, episodeNumber);
  };
  
  const navigateToPlayerEpisode = (videoUrl, episodeId, episodeTitle, seasonNumber, episodeNumber) => {
    // Add to watch history
    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const existing = history.findIndex((item) => item.id === episodeId);
    
    let startTime = 0;
    if (existing !== -1) {
      startTime = history[existing].progress || 0;
      history.splice(existing, 1);
    }
    
    history.unshift({ 
      id: episodeId,
      title: `${series.title} - S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}: ${episodeTitle}`,
      poster_url: series.poster_url,
      backdrop_url: series.backdrop_url,
      type: 'series', 
      timestamp: new Date().toISOString(),
      progress: startTime || 1,
      duration: 2400,
      video_url: videoUrl,
      seriesId: series.id,
      seriesTitle: series.title,
      episodeTitle: episodeTitle,
      seasonNumber: seasonNumber,
      episodeNumber: episodeNumber
    });
    localStorage.setItem('watch_history', JSON.stringify(history.slice(0, 50)));
    
    console.log('✅ Navigation vers le lecteur...');
    navigate('/player', { 
      state: { 
        videoUrl,
        contentId: episodeId,
        contentType: 'series',
        seriesId: id,
        seasonNumber: seasonNumber,
        episodeNumber: episodeNumber,
        startTime: startTime
      } 
    });
  };

  const groupedEpisodes = episodes.reduce((acc, episode) => {
    const season = episode.season_number;
    if (!acc[season]) acc[season] = [];
    acc[season].push(episode);
    return acc;
  }, {});

  // Afficher un loader pendant le chargement
  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f10]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-xl text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  // Si la série n'existe pas
  if (!series) {
    return (
      <div className="min-h-screen bg-[#0f0f10]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <p className="text-xl text-gray-400">Série non trouvée</p>
            <Button onClick={() => navigate('/series')} className="mt-4">
              Retour aux séries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Vérifier l'accès aux séries selon l'abonnement et le paramètre global
  const hasPremiumAccess = user && (user.subscription === 'premium' || user.subscription === 'vip');
  const hasAccess = hasPremiumAccess || seriesFreeAccess;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-black">
        <div className="flex flex-col items-center justify-center min-h-screen px-8">
          <Lock className="h-24 w-24 text-[#e50914] mb-6" />
          <h1 className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Contenu Réservé Premium/VIP
          </h1>
          <p className="text-xl text-gray-400 mb-8 text-center max-w-2xl">
            Cette série est disponible uniquement pour les abonnements <span className="text-[#e50914] font-bold">PREMIUM</span> et <span className="text-yellow-500 font-bold">VIP</span>
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/subscriptions')}
              className="bg-[#e50914] hover:bg-[#c50812] text-lg px-8 py-6"
            >
              Passer à Premium
            </Button>
            <Button
              onClick={() => navigate('/series')}
              variant="outline"
              className="border-gray-700 text-lg px-8 py-6"
            >
              Retour aux Séries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-xl text-gray-400 mb-4">Série non trouvée</div>
        <Button onClick={() => navigate('/')} variant="outline">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="series-detail-page">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${series.backdrop_url || series.poster_url})`,
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
      <div className="fixed inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10">
        {/* Back Button */}
        <div className="p-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-white hover:text-[#e50914]"
            data-testid="back-btn"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
        </div>

        {/* Series Info */}
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Colonne Gauche: Poster + Favoris + Épisodes */}
            <div className="flex-shrink-0 w-full lg:w-[400px]">
              <div className="w-full max-w-[300px] mx-auto lg:mx-0 space-y-4">
                {/* Poster */}
                <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl bg-gray-900">
                  {series.poster_url ? (
                    <img
                      src={series.poster_url}
                      alt={series.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      Pas d'image
                    </div>
                  )}
                </div>
                
                {/* Message si série indisponible */}
                {series.available === false ? (
                  <div className="w-full p-6 rounded-md bg-orange-500/10 border-2 border-orange-500/30 backdrop-blur-sm">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">🚫</div>
                      <h3 className="text-xl font-bold text-orange-400">Série temporairement indisponible</h3>
                      <p className="text-sm text-gray-300">
                        Cette série n'est pas disponible pour le moment. Elle sera de retour bientôt.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bouton Favoris */}
                    <Button
                      onClick={toggleFavorite}
                      className={`w-full py-3 rounded-md ${
                        isFavorite 
                          ? 'bg-[#e50914] hover:bg-[#c50812] text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                      }`}
                      data-testid="favorite-btn"
                    >
                      <Heart className={`mr-2 h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    </Button>
                  </>
                )}

                {/* Saisons et Épisodes */}
                <div data-testid="episodes-list">
                  {Object.keys(groupedEpisodes).length > 0 ? (
                    <Accordion type="single" collapsible className="space-y-2">
                      {Object.keys(groupedEpisodes)
                        .sort((a, b) => a - b)
                        .map((season) => (
                          <AccordionItem
                            key={season}
                            value={`season-${season}`}
                            className="bg-white/5 backdrop-blur-md rounded-lg border-0 overflow-hidden"
                            data-testid={`season-${season}`}
                          >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5">
                              <span className="text-base font-semibold">Saison {season}</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3">
                              {/* Message si toute la saison est indisponible */}
                              {groupedEpisodes[season].every(ep => ep.available === false) && (
                                <div className="mb-3 p-4 rounded-md bg-orange-500/10 border border-orange-500/30">
                                  <div className="flex items-center gap-2 text-orange-400">
                                    <div className="text-lg">⚠️</div>
                                    <p className="text-sm font-semibold">Saison temporairement indisponible</p>
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2 pt-2">
                                {groupedEpisodes[season]
                                  .sort((a, b) => a.episode_number - b.episode_number)
                                  .map((episode) => (
                                    <div
                                      key={episode.id}
                                      onClick={episode.available === false ? undefined : (e) => handlePlayEpisode(e, episode.video_url, episode.id, episode.title, episode.season_number, episode.episode_number)}
                                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                        episode.available === false 
                                          ? 'bg-gray-800/50 opacity-60 cursor-not-allowed' 
                                          : 'bg-white/5 hover:bg-white/10 cursor-pointer group'
                                      }`}
                                      data-testid={`episode-${episode.id}`}
                                    >
                                      {episode.available === false ? (
                                        <>
                                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-700 rounded-full">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">Ép. {episode.episode_number}</span>
                                              <span className="text-xs text-orange-400 font-semibold">Indisponible</span>
                                            </div>
                                            <h4 className="font-semibold text-sm truncate text-gray-400">{episode.title}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Cet épisode n'est pas disponible pour le moment
                                            </p>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-[#e50914] rounded-full group-hover:scale-110 transition-transform">
                                            <Play className="h-5 w-5 fill-current" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-400">Ép. {episode.episode_number}</span>
                                            </div>
                                            <h4 className="font-semibold text-sm truncate">{episode.title}</h4>
                                            {episode.description && (
                                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                                {episode.description}
                                              </p>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-lg">
                      <p className="text-gray-400 text-sm">Aucun épisode disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne Droite: Détails */}
            <div className="flex-1 space-y-6">
              <h1
                className="text-5xl font-bold"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                data-testid="series-title"
              >
                {series.title}
              </h1>

              <div className="flex items-center gap-6 text-sm">
                {series.release_year && (
                  <span className="text-gray-300">{series.release_year}</span>
                )}
                {series.total_seasons && (
                  <span className="text-gray-300">{series.total_seasons} saison(s)</span>
                )}
                {series.rating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{series.rating}/10</span>
                  </div>
                )}
              </div>

              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {series.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-4 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-lg text-gray-300 leading-relaxed">{series.description}</p>

              {/* Créateur/Réalisateur */}
              {series.creator && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Créateur</h3>
                  <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-lg p-4">
                    {series.creator_photo ? (
                      <img 
                        src={series.creator_photo} 
                        alt={series.creator}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
                        {series.creator.charAt(0)}
                      </div>
                    )}
                    <span className="text-lg">{series.creator}</span>
                  </div>
                </div>
              )}

              {/* Acteurs principaux */}
              {series.cast && series.cast.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Acteurs principaux</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {series.cast.slice(0, 6).map((actor, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-4">
                        {actor.photo ? (
                          <img 
                            src={actor.photo} 
                            alt={actor.name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
                            {actor.name.charAt(0)}
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium text-sm">{actor.name}</p>
                          {actor.character && (
                            <p className="text-xs text-gray-400">{actor.character}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesDetail;