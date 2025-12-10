import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Film, Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

const RecentContent = ({ showMovies = true, showSeries = true }) => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [moviesScrollState, setMoviesScrollState] = useState({ atStart: true, atEnd: false });
  const [seriesScrollState, setSeriesScrollState] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    loadRecentMovies();
    loadRecentSeries();
  }, []);

  const loadRecentMovies = async () => {
    try {
      setLoadingMovies(true);
      const response = await axios.get(`${API}/api/recent-movies?limit=10`);
      if (response.data.success && response.data.movies) {
        setMovies(response.data.movies);
      }
    } catch (error) {
      console.error('Erreur chargement films récents:', error);
    } finally {
      setLoadingMovies(false);
    }
  };

  const loadRecentSeries = async () => {
    try {
      setLoadingSeries(true);
      const response = await axios.get(`${API}/api/recent-series?limit=10`);
      if (response.data.success && response.data.series) {
        setSeries(response.data.series);
      }
    } catch (error) {
      console.error('Erreur chargement séries récentes:', error);
    } finally {
      setLoadingSeries(false);
    }
  };

  const checkScrollPosition = (ref, setState) => {
    if (ref && ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setState({
        atStart: scrollLeft === 0,
        atEnd: scrollLeft + clientWidth >= scrollWidth - 10
      });
    }
  };

  const scroll = (ref, direction, setState) => {
    if (ref && ref.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      
      // Vérifier la position après le scroll
      setTimeout(() => checkScrollPosition(ref, setState), 300);
    }
  };

  const moviesScrollRef = React.useRef(null);
  const seriesScrollRef = React.useRef(null);

  // Vérifier la position au chargement des films et séries
  useEffect(() => {
    if (movies.length > 0) {
      setTimeout(() => checkScrollPosition(moviesScrollRef, setMoviesScrollState), 100);
    }
  }, [movies]);

  useEffect(() => {
    if (series.length > 0) {
      setTimeout(() => checkScrollPosition(seriesScrollRef, setSeriesScrollState), 100);
    }
  }, [series]);

  if (loadingMovies && loadingSeries) {
    return (
      <div className="px-4 md:px-8 lg:px-16 py-10">
        <div className="text-center text-gray-400">Chargement des contenus récents...</div>
      </div>
    );
  }

  return (
    <>
      {/* FILMS RÉCENTS */}
      {showMovies && movies.length > 0 && (
        <section className="relative px-4 md:px-8 lg:px-16 py-10 md:py-20 max-w-[2000px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Films Récents
            </h2>
            <Button onClick={() => navigate('/movies')} variant="ghost" className="text-gray-400 hover:text-white">
              Voir tout →
            </Button>
          </div>

          <div className="relative group">
            {/* Bouton Gauche - visible seulement si pas au début */}
            {!moviesScrollState.atStart && (
              <button
                onClick={() => scroll(moviesScrollRef, 'left', setMoviesScrollState)}
                className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}

            {/* Carrousel Films */}
            <div
              ref={moviesScrollRef}
              onScroll={() => checkScrollPosition(moviesScrollRef, setMoviesScrollState)}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="group/card cursor-pointer flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px]"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-lg transition-all duration-300 group-hover/card:shadow-2xl mb-3">
                    {movie.poster_url ? (
                      <img 
                        src={movie.poster_url} 
                        alt={movie.title} 
                        className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-[0.4]" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-xs text-gray-300 line-clamp-3">{movie.description}</p>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover/card:text-[#e50914] transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {movie.rating && (
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        {movie.rating}
                      </span>
                    )}
                    {movie.release_year && <span>{movie.release_year}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton Droit - visible seulement si pas à la fin */}
            {!moviesScrollState.atEnd && (
              <button
                onClick={() => scroll(moviesScrollRef, 'right', setMoviesScrollState)}
                className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* SÉRIES RÉCENTES */}
      {showSeries && series.length > 0 && (
        <section className="relative px-4 md:px-8 lg:px-16 py-10 md:py-20 max-w-[2000px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Séries Récentes
            </h2>
            <Button onClick={() => navigate('/series')} variant="ghost" className="text-gray-400 hover:text-white">
              Voir tout →
            </Button>
          </div>

          <div className="relative group">
            {/* Bouton Gauche - visible seulement si pas au début */}
            {!seriesScrollState.atStart && (
              <button
                onClick={() => scroll(seriesScrollRef, 'left', setSeriesScrollState)}
                className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}

            {/* Carrousel Séries */}
            <div
              ref={seriesScrollRef}
              onScroll={() => checkScrollPosition(seriesScrollRef, setSeriesScrollState)}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {series.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/series/${s.id}`)}
                  className="group/card cursor-pointer flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px]"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-lg transition-all duration-300 group-hover/card:shadow-2xl mb-3">
                    {s.poster_url ? (
                      <img 
                        src={s.poster_url} 
                        alt={s.title} 
                        className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-[0.4]" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Tv className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-xs text-gray-300 line-clamp-3">{s.description}</p>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover/card:text-[#e50914] transition-colors">
                    {s.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {s.rating && (
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        {s.rating}
                      </span>
                    )}
                    {s.release_year && <span>{s.release_year}</span>}
                    {s.total_seasons && <span>{s.total_seasons} saison{s.total_seasons > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton Droit - visible seulement si pas à la fin */}
            {!seriesScrollState.atEnd && (
              <button
                onClick={() => scroll(seriesScrollRef, 'right', setSeriesScrollState)}
                className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              >
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Message si aucun contenu */}
      {movies.length === 0 && series.length === 0 && !loadingMovies && !loadingSeries && (
        <div className="px-4 md:px-8 lg:px-16 py-20 text-center">
          <Film className="h-24 w-24 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucun contenu récent disponible</p>
        </div>
      )}
    </>
  );
};

export default RecentContent;
