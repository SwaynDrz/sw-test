import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cast,
  Users
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PlayerNew = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  const videoUrl = location.state?.videoUrl;
  const contentId = location.state?.contentId;
  const contentType = location.state?.contentType;
  const startTime = location.state?.startTime || 0;
  const seriesId = location.state?.seriesId;
  const seasonNumber = location.state?.seasonNumber;
  const episodeNumber = location.state?.episodeNumber;

  // États du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // État Google Cast
  const [castAvailable, setCastAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castSession, setCastSession] = useState(null);

  // États pour la navigation des séries
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [openSeasons, setOpenSeasons] = useState({});
  const [seriesInfo, setSeriesInfo] = useState(null);

  // Charger tous les épisodes de la série ET les infos de la série
  useEffect(() => {
    if ((contentType === 'episode' || contentType === 'series') && seriesId) {
      fetchAllEpisodes();
      fetchSeriesInfo();
    }
  }, [seriesId, contentType]);

  const fetchSeriesInfo = async () => {
    try {
      const response = await axios.get(`${API}/series/${seriesId}`);
      setSeriesInfo(response.data);
    } catch (error) {
      console.error('Erreur chargement série:', error);
    }
  };

  const fetchAllEpisodes = async () => {
    try {
      const response = await axios.get(`${API}/episodes?series_id=${seriesId}&per_page=500`);
      const episodes = response.data.episodes || response.data;
      
      // Trier les épisodes par saison et numéro
      const sortedEpisodes = episodes.sort((a, b) => {
        if (a.season_number !== b.season_number) {
          return a.season_number - b.season_number;
        }
        return a.episode_number - b.episode_number;
      });
      
      setAllEpisodes(sortedEpisodes);
      
      // Trouver l'épisode actuel
      const current = sortedEpisodes.find(
        ep => ep.season_number === seasonNumber && ep.episode_number === episodeNumber
      );
      setCurrentEpisode(current);
      
      // Extraire les saisons uniques
      const uniqueSeasons = [...new Set(sortedEpisodes.map(ep => ep.season_number))].sort((a, b) => a - b);
      setSeasons(uniqueSeasons);
      
      // Ouvrir automatiquement la saison en cours
      if (seasonNumber) {
        setOpenSeasons({ [seasonNumber]: true });
      }
    } catch (error) {
      console.error('Erreur chargement épisodes:', error);
    }
  };

  // Trouver l'épisode précédent
  const getPreviousEpisode = () => {
    if (!currentEpisode || allEpisodes.length === 0) return null;
    
    const currentIndex = allEpisodes.findIndex(
      ep => ep.season_number === currentEpisode.season_number && 
            ep.episode_number === currentEpisode.episode_number
    );
    
    if (currentIndex > 0) {
      return allEpisodes[currentIndex - 1];
    }
    return null;
  };

  // Trouver l'épisode suivant
  const getNextEpisode = () => {
    if (!currentEpisode || allEpisodes.length === 0) return null;
    
    const currentIndex = allEpisodes.findIndex(
      ep => ep.season_number === currentEpisode.season_number && 
            ep.episode_number === currentEpisode.episode_number
    );
    
    if (currentIndex < allEpisodes.length - 1) {
      return allEpisodes[currentIndex + 1];
    }
    return null;
  };

  // Naviguer vers un épisode
  const goToEpisode = (episode) => {
    if (!episode) return;
    
    console.log('🎬 Changement vers épisode:', episode.title, episode.video_url);
    
    // Vérifier si video_url existe
    if (!episode.video_url || episode.video_url.trim() === '') {
      console.error('❌ URL vidéo manquante pour cet épisode');
      return;
    }
    
    // IMPORTANT : Sauvegarder la progression de l'épisode ACTUEL avant de changer
    if (currentEpisode) {
      const video = videoRef.current;
      if (video) {
        const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
        const existingIndex = history.findIndex((item) => item.id === currentEpisode.id);
        
        if (existingIndex !== -1) {
          // Mettre à jour la progression de l'épisode actuel
          history[existingIndex].progress = video.currentTime;
          history[existingIndex].duration = video.duration;
          history[existingIndex].timestamp = new Date().toISOString();
          localStorage.setItem('watch_history', JSON.stringify(history));
          console.log(`💾 Progression sauvegardée pour épisode ${currentEpisode.id}: ${video.currentTime}s`);
        }
      }
    }
    
    // Changer la source vidéo directement
    const video = videoRef.current;
    if (video) {
      // Mettre en pause la vidéo actuelle
      video.pause();
      
      // Vérifier si cet épisode a déjà une progression dans l'historique
      const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
      const episodeHistory = history.find(item => item.id === episode.id);
      const startFrom = episodeHistory?.progress || 0;
      
      console.log(`📍 Démarrage de l'épisode à ${startFrom}s`);
      
      // Changer la source
      video.src = episode.video_url;
      
      // Essayer de lancer immédiatement dès que possible
      video.preload = 'auto';
      
      // Écouter l'événement loadeddata pour lancer dès que les premières données sont chargées
      const handleCanPlay = () => {
        // IMPORTANT : Remettre le temps à la bonne position
        video.currentTime = startFrom;
        video.play().catch(error => {
          console.log('Autoplay bloqué:', error);
        });
        video.removeEventListener('canplay', handleCanPlay);
      };
      
      video.addEventListener('canplay', handleCanPlay);
      
      // Forcer le chargement
      video.load();
    }
    
    // Mettre à jour l'épisode actuel
    setCurrentEpisode(episode);
    
    // Mettre à jour l'historique dans localStorage pour le NOUVEL épisode
    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const existing = history.findIndex((item) => item.id === episode.id);
    
    if (existing !== -1) {
      history.splice(existing, 1);
    }
    
    history.unshift({ 
      id: episode.id,
      title: `${seriesInfo?.title || 'Série'} - S${String(episode.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')}: ${episode.title}`,
      type: 'series', 
      timestamp: new Date().toISOString(),
      progress: 1, // Nouvel épisode commence à 1 seconde
      duration: episode.duration ? episode.duration * 60 : 2400,
      video_url: episode.video_url,
      seriesId: seriesId,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      poster_url: seriesInfo?.poster_url || '',
      backdrop_url: seriesInfo?.backdrop_url || ''
    });
    localStorage.setItem('watch_history', JSON.stringify(history.slice(0, 50)));
    
    console.log('✅ Épisode changé avec succès');
  };

  // Formater le numéro d'épisode (S01E02)
  const formatEpisodeNumber = (season, episode) => {
    return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
  };

  // Initialisation Google Cast
  useEffect(() => {
    const initializeCast = () => {
      // Vérifier que Cast est bien disponible
      if (window.chrome && window.chrome.cast && window.chrome.cast.isAvailable && window.cast && window.cast.framework) {
        try {
          const castContext = window.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });

          setCastAvailable(true);

          // Écouter les changements de session Cast
          castContext.addEventListener(
            window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event) => {
              const session = castContext.getCurrentSession();
              if (session) {
                setIsCasting(true);
                setCastSession(session);
                loadMediaOnCast(session);
              } else {
                setIsCasting(false);
                setCastSession(null);
              }
            }
          );
        } catch (error) {
          console.log('Cast non disponible:', error);
        }
      }
    };

    if (window['__onGCastApiAvailable']) {
      initializeCast();
    } else {
      window['__onGCastApiAvailable'] = (isAvailable) => {
        if (isAvailable) {
          initializeCast();
        }
      };
    }
  }, []);

  // Charger la vidéo sur Chromecast
  const loadMediaOnCast = (session) => {
    if (!session || !videoUrl) return;

    // Arrêter la vidéo locale quand on caste
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const mediaInfo = new window.chrome.cast.media.MediaInfo(videoUrl, 'video/mp4');
    mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = 'SW Streaming';
    
    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    request.currentTime = currentTime || startTime;
    request.autoplay = true;

    session.loadMedia(request).then(
      () => {
        console.log('Média chargé sur Chromecast');
        
        // Synchroniser le temps avec Chromecast
        const media = session.getMediaSession();
        if (media) {
          media.addUpdateListener(() => {
            setCurrentTime(media.getEstimatedTime());
            setIsPlaying(media.playerState === window.chrome.cast.media.PlayerState.PLAYING);
          });
        }
      },
      (error) => console.error('Erreur Cast:', error)
    );
  };

  // Bouton Cast
  const handleCastClick = () => {
    if (window.chrome && window.chrome.cast) {
      const castContext = window.cast.framework.CastContext.getInstance();
      if (isCasting) {
        castContext.endCurrentSession(true);
      } else {
        castContext.requestSession();
      }
    }
  };

  // Fonction pour revenir en arrière en sauvegardant la progression
  const handleBack = () => {
    console.log('🔙 Retour - Sauvegarde de la progression...');
    saveProgress();
    navigate(-1);
  };

  // Initialisation vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Définir le temps de départ et lancer automatiquement
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (startTime > 0) {
        video.currentTime = startTime;
      }
      // Lancer automatiquement la lecture
      video.play().catch(error => {
        console.log('Autoplay bloqué:', error);
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    // Sauvegarder la progression toutes les 5 secondes
    progressIntervalRef.current = setInterval(() => {
      saveProgress();
    }, 5000);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      saveProgress();
    };
  }, []);

  // Sauvegarder la progression
  const saveProgress = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Pour les séries, utiliser currentEpisode.id (qui change quand on navigue)
    // Pour les films, utiliser contentId
    const activeContentId = currentEpisode?.id || contentId;
    
    if (!activeContentId) return;

    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const itemIndex = history.findIndex(item => item.id === activeContentId);
    
    if (itemIndex !== -1) {
      history[itemIndex].progress = video.currentTime;
      history[itemIndex].duration = video.duration;
      history[itemIndex].timestamp = new Date().toISOString();
      localStorage.setItem('watch_history', JSON.stringify(history));
      
      console.log(`💾 Progression mise à jour pour ${activeContentId}: ${Math.floor(video.currentTime)}s / ${Math.floor(video.duration)}s`);
    }
  };

  // Gestionnaire des raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Empêcher les actions si on tape dans un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch(e.key) {
        case ' ': // Barre d'espace - Play/Pause
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        
        case 'ArrowLeft': // Flèche gauche - Reculer 10s
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        
        case 'ArrowRight': // Flèche droite - Avancer 10s
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        
        case 'f':
        case 'F': // Touche F - Toggle Fullscreen
          e.preventDefault();
          toggleFullscreen();
          break;
        
        default:
          break;
      }
    };

    // Ajouter l'écouteur d'événements
    document.addEventListener('keydown', handleKeyPress);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [videoRef, playerContainerRef]);

  // Gérer les changements de fullscreen (important pour iOS)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Écouter tous les événements de fullscreen (cross-browser)
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);


  // Contrôles vidéo
  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleSeek = (value) => {
    const video = videoRef.current;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    
    // Si on caste, contrôler le volume du Chromecast
    if (isCasting && castSession) {
      const media = castSession.getMediaSession();
      if (media) {
        const volumeRequest = new window.chrome.cast.Volume(newVolume);
        castSession.setReceiverVolumeLevel(volumeRequest.level);
      }
    } else {
      // Sinon contrôler le volume local
      const video = videoRef.current;
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    
    // Vérifier si on est déjà en plein écran (compatible tous navigateurs)
    const isCurrentlyFullscreen = document.fullscreenElement || 
                                   document.webkitFullscreenElement || 
                                   document.mozFullScreenElement || 
                                   document.msFullscreenElement;
    
    if (!isCurrentlyFullscreen) {
      // Entrer en plein écran - Tester différentes méthodes
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(err => {
          console.error('Erreur fullscreen:', err);
        });
      } else if (container.webkitRequestFullscreen) {
        // Safari Desktop
        container.webkitRequestFullscreen();
      } else if (container.webkitEnterFullscreen) {
        // iOS Safari
        container.webkitEnterFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        // Fallback: plein écran sur la vidéo directement (iOS)
        video.webkitEnterFullscreen();
      } else if (container.mozRequestFullScreen) {
        // Firefox
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        // IE/Edge
        container.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Quitter le plein écran - Tester différentes méthodes
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Gérer l'affichage des contrôles
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Formatage du temps
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-xl text-gray-400 mb-4">URL vidéo non trouvée</div>
        <Button onClick={handleBack} variant="outline" className="border-gray-700">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={playerContainerRef}
      className="h-screen w-screen bg-black relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => !isFullscreen && isPlaying && setShowControls(false)}
    >
      {/* Image "Cast en cours" quand on caste */}
      {isCasting ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="relative">
            {/* Icône Cast animée */}
            <div className="w-32 h-32 bg-[#e50914]/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
              <Cast className="w-16 h-16 text-[#e50914]" />
            </div>
            
            {/* Cercles d'onde */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-[#e50914]/30 rounded-full animate-ping" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center animation-delay-500">
              <div className="w-48 h-48 border-4 border-[#e50914]/20 rounded-full animate-ping" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Cast en cours</h2>
          <p className="text-gray-400 text-lg mb-8">Lecture sur votre TV</p>
          
          {/* Barre de progression pour le cast */}
          <div className="w-96 px-4">
            <div className="mb-2">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={(value) => {
                  if (castSession) {
                    const media = castSession.getMediaSession();
                    if (media) {
                      media.seek(new window.chrome.cast.media.SeekRequest(value[0]));
                    }
                  }
                }}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Contrôles Cast */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                onClick={() => {
                  const media = castSession?.getMediaSession();
                  if (media) {
                    if (isPlaying) {
                      media.pause(new window.chrome.cast.media.PauseRequest());
                    } else {
                      media.play(new window.chrome.cast.media.PlayRequest());
                    }
                  }
                }}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-16 w-16"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
              
              {/* Volume contrôle pour Cast */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </Button>
                <div className="w-32">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>
              
              {/* Bouton arrêter le cast */}
              <Button
                onClick={handleCastClick}
                variant="outline"
                className="border-[#e50914] text-[#e50914] hover:bg-[#e50914] hover:text-white"
              >
                <Cast className="mr-2 h-5 w-5" />
                Arrêter le Cast
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Vidéo normale */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            autoPlay
            playsInline
            preload="auto"
          />

          {/* Overlay Buffering */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-16 h-16 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}

      {/* Contrôles - Header */}
      <div 
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="text-white hover:text-[#e50914] hover:bg-[#e50914]/20 transition-all font-semibold"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>

          {/* Navigation Épisodes + Cast */}
          <div className="flex items-center gap-3">
            {/* Navigation Épisodes (uniquement pour les séries) */}
            {(contentType === 'episode' || contentType === 'series') && allEpisodes.length > 0 && (
              <>
                {/* Épisode Précédent */}
                {getPreviousEpisode() ? (
                  <Button
                    onClick={() => goToEpisode(getPreviousEpisode())}
                    variant="outline"
                    className="text-white border-white/30 hover:bg-[#e50914] hover:border-[#e50914] hover:text-white gap-2 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {formatEpisodeNumber(getPreviousEpisode().season_number, getPreviousEpisode().episode_number)}
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="text-white/30 border-white/10 cursor-not-allowed gap-2 opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    ---
                  </Button>
                )}
                
                {/* Bouton SAISON (menu dropdown) */}
                <Button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  variant="outline"
                  className={`text-white border-white/30 hover:bg-[#e50914] hover:border-[#e50914] hover:text-white px-4 transition-all ${showEpisodeList ? 'bg-[#e50914] border-[#e50914]' : ''}`}
                >
                  SAISON
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showEpisodeList ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Épisode Suivant */}
                {getNextEpisode() ? (
                  <Button
                    onClick={() => goToEpisode(getNextEpisode())}
                    variant="outline"
                    className="text-white border-white/30 hover:bg-[#e50914] hover:border-[#e50914] hover:text-white gap-2 transition-all"
                  >
                    {formatEpisodeNumber(getNextEpisode().season_number, getNextEpisode().episode_number)}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="text-white/30 border-white/10 cursor-not-allowed gap-2 opacity-40"
                  >
                    ---
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}

            {/* Cast Button */}
            {castAvailable && (
              <Button
                onClick={handleCastClick}
                variant="ghost"
                className={`text-white hover:bg-[#e50914]/20 hover:text-[#e50914] transition-all ${isCasting ? 'text-[#e50914] bg-[#e50914]/20' : ''}`}
                title="Caster sur TV"
              >
                <Cast className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Contrôles - Footer */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Barre de progression */}
        <div className="mb-4 player-progress-bar">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-sm text-white/90 mt-3 font-semibold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Boutons de contrôle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <Button
              onClick={togglePlay}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#e50914] hover:text-white h-12 w-12 transition-all"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>

            {/* Skip buttons */}
            <Button
              onClick={() => skip(-10)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#e50914]/80 hover:text-white transition-all"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => skip(10)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#e50914]/80 hover:text-white transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-[#e50914]/80 hover:text-white transition-all"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <div className="w-28 volume-slider">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                />
              </div>
            </div>
          </div>

          {/* Fullscreen */}
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#e50914]/80 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Panneau Liste des Épisodes */}
      {showEpisodeList && (contentType === 'episode' || contentType === 'series') && allEpisodes.length > 0 && (
        <div className={`absolute right-0 top-0 bottom-0 w-[420px] bg-black/98 backdrop-blur-xl border-l border-[#e50914]/30 overflow-y-auto episode-list-scroll transition-transform duration-300 shadow-2xl ${
          showControls ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e50914]/20">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Épisodes
              </h3>
              <Button
                onClick={() => setShowEpisodeList(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-[#e50914]/80 hover:text-white transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Saisons avec accordéon */}
            <div className="space-y-3">
              {seasons.map(season => {
                const seasonEpisodes = allEpisodes.filter(ep => ep.season_number === season);
                const isOpen = openSeasons[season];
                const hasCurrentEpisode = seasonEpisodes.some(ep => ep.id === currentEpisode?.id);
                
                return (
                  <div key={season} className="rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm border border-[#e50914]/10 hover:border-[#e50914]/30 transition-all">
                    {/* Header de la saison (cliquable) */}
                    <button
                      onClick={() => setOpenSeasons(prev => ({ ...prev, [season]: !prev[season] }))}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#e50914]/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-md font-bold text-sm transition-all ${
                          hasCurrentEpisode 
                            ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/50' 
                            : 'bg-white/10 text-white/80 group-hover:bg-white/20'
                        }`}>
                          S{String(season).padStart(2, '0')}
                        </div>
                        <span className="text-lg font-semibold text-white">
                          Saison {season}
                        </span>
                        <span className="text-sm text-white/60">
                          ({seasonEpisodes.length} épisodes)
                        </span>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-white/60 group-hover:text-[#e50914] transition-all duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    
                    {/* Liste des épisodes (affichée si ouverte) */}
                    <div className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-[2000px]' : 'max-h-0'
                    }`}>
                      <div className="p-2 space-y-1">
                        {seasonEpisodes.map(episode => {
                          const isCurrentEpisode = currentEpisode?.id === episode.id;
                          
                          return (
                            <div
                              key={episode.id}
                              onClick={() => {
                                goToEpisode(episode);
                                setShowEpisodeList(false);
                              }}
                              className={`p-3 rounded-md cursor-pointer transition-all group ${
                                isCurrentEpisode 
                                  ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/30' 
                                  : 'bg-white/5 hover:bg-[#e50914]/20 text-white/80 hover:text-white border border-transparent hover:border-[#e50914]/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Bouton play */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  isCurrentEpisode 
                                    ? 'bg-white/20' 
                                    : 'bg-white/10 group-hover:bg-[#e50914] group-hover:text-white'
                                } transition-all`}>
                                  {isCurrentEpisode ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4 ml-0.5" />
                                  )}
                                </div>
                                
                                {/* Numéro épisode */}
                                <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isCurrentEpisode ? 'bg-white/20' : 'bg-white/10 group-hover:bg-[#e50914]/50'
                                }`}>
                                  E{String(episode.episode_number).padStart(2, '0')}
                                </div>
                                
                                {/* Info épisode */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{episode.title}</div>
                                  {episode.duration && (
                                    <div className={`text-xs mt-0.5 ${
                                      isCurrentEpisode ? 'text-white/70' : 'text-white/50'
                                    }`}>
                                      {episode.duration} min
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerNew;
