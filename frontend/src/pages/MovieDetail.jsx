import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, ArrowLeft, Star, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import AdModal from '../components/AdModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchMovie();
  }, [id]);

  useEffect(() => {
    if (movie) {
      checkFavorite();
    }
  }, [movie]);

  const fetchMovie = async () => {
    try {
      const response = await axios.get(`${API}/movies/${id}`);
      setMovie(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.some((item) => item.id === movie.id));
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      const updated = favorites.filter((item) => item.id !== movie.id);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
      toast.success('Retiré des favoris');
    } else {
      favorites.push({ ...movie, type: 'movie' });
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
      toast.success('Ajouté aux favoris');
    }
  };

  const handlePlay = () => {
    // Navigation directe sans pub
    navigateToPlayer();
  };
  
  const navigateToPlayer = () => {
    // Add to watch history
    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const existing = history.findIndex((item) => item.id === movie.id);
    
    let startTime = 0;
    if (existing !== -1) {
      startTime = history[existing].progress || 0;
      history.splice(existing, 1);
    }
    
    history.unshift({ 
      ...movie, 
      type: 'movie', 
      timestamp: new Date().toISOString(),
      progress: startTime,
      duration: 0
    });
    localStorage.setItem('watch_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
    
    navigate('/player', { 
      state: { 
        videoUrl: movie.video_url,
        contentId: movie.id,
        contentType: 'movie',
        startTime: startTime
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-xl text-gray-400 mb-4">Film non trouvé</div>
        <Button onClick={() => navigate('/')} variant="outline">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="movie-detail-page">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${movie.backdrop_url || movie.poster_url})`,
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

        {/* Movie Info */}
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="w-[300px] space-y-4">
                <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl bg-gray-900">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      Pas d'image
                    </div>
                  )}
                </div>
                
                {/* Message si film indisponible */}
                {movie.available === false ? (
                  <div className="w-full p-6 rounded-md bg-orange-500/10 border-2 border-orange-500/30 backdrop-blur-sm">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">🚫</div>
                      <h3 className="text-xl font-bold text-orange-400">Film temporairement indisponible</h3>
                      <p className="text-sm text-gray-300">
                        Ce film n'est pas disponible pour le moment. Il sera de retour bientôt.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bouton Lire le film */}
                    <Button
                      onClick={handlePlay}
                      className="w-full bg-[#e50914] hover:bg-[#c50812] text-white py-3 rounded-md"
                      data-testid="play-movie-btn"
                    >
                      <Play className="mr-2 h-5 w-5 fill-current" />
                      Lire le film
                    </Button>
                    
                    {/* Bouton Favoris sous le bouton play */}
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
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-6">
              <h1
                className="text-5xl font-bold"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                data-testid="movie-title"
              >
                {movie.title}
              </h1>

              <div className="flex items-center gap-6 text-sm">
                {movie.release_year && (
                  <span className="text-gray-300">{movie.release_year}</span>
                )}
                {movie.duration && (
                  <span className="text-gray-300">
                    {Math.floor(movie.duration / 60)}H{String(movie.duration % 60).padStart(2, '0')}
                  </span>
                )}
                {movie.rating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{movie.rating}/10</span>
                  </div>
                )}
              </div>

              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-4 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-lg text-gray-300 leading-relaxed">{movie.description}</p>

              {/* Réalisateur */}
              {movie.director && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Réalisateur</h3>
                  <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-lg p-4">
                    {movie.director_photo ? (
                      <img 
                        src={movie.director_photo} 
                        alt={movie.director}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
                        {movie.director.charAt(0)}
                      </div>
                    )}
                    <span className="text-lg">{movie.director}</span>
                  </div>
                </div>
              )}

              {/* Acteurs principaux */}
              {movie.cast && movie.cast.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Acteurs principaux</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {movie.cast.slice(0, 6).map((actor, index) => (
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

export default MovieDetail;