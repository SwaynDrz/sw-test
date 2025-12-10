import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Info, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import RecentContent from '../components/RecentContent';
import { Top10Section } from '../components/Top10';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const navigate = useNavigate();
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    fetchHeroContent();
  }, []);

  useEffect(() => {
    if (allContent.length === 0) return;

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % allContent.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [allContent.length]);

  const fetchHeroContent = async () => {
    try {
      // Charger films et séries pour le hero
      const [moviesRes, seriesRes] = await Promise.all([
        axios.get(`${API}/recent-movies?limit=10`),
        axios.get(`${API}/recent-series?limit=10`)
      ]);
      
      const movies = moviesRes.data.movies || [];
      const series = seriesRes.data.series || [];
      const combined = [...movies, ...series].sort(() => Math.random() - 0.5).slice(0, 20);
      
      setAllContent(combined);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const heroContent = allContent[heroIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f10]">
        <div className="text-xl text-gray-400">Chargement...</div>
      </div>
    );
  }

  // Si pas de contenu, afficher un message
  if (!loading && allContent.length === 0) {
    return (
      <div className="min-h-screen bg-black" data-testid="home-page">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">Bienvenue sur votre plateforme de streaming</h2>
            <p className="text-gray-400">Aucun contenu disponible pour le moment. Ajoutez des films et séries depuis le panel admin.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative" data-testid="home-page">
      <div className="relative z-10">
        <Navbar />

      {heroContent && (
        <div className="relative h-screen w-full overflow-hidden flex">
          
          {/* Gradient global du bas sur toute la section */}
          <div className="absolute bottom-0 left-0 right-0 h-[600px] bg-gradient-to-b to-black from-transparent pointer-events-none z-20"></div>
          
          {/* PARTIE GAUCHE - Texte */}
          <div className="flex items-end lg:items-center relative z-30 absolute inset-0 pt-32 p-14 pb-24 w-full md:w-[45%] lg:w-[40%] bg-black transition-opacity ease-in-out duration-500">
            <div className="w-full flex flex-col items-center lg:items-start space-y-4 lg:space-y-7 max-w-xl">

              {/* Titre avec logo officiel ou texte - Hauteur fixe */}
              <div className="h-32 md:h-40 lg:h-48 flex items-center justify-center lg:justify-start">
                {heroContent.logo_url ? (
                  <img 
                    src={heroContent.logo_url} 
                    alt={heroContent.title}
                    className="w-auto max-w-md h-auto max-h-32 md:max-h-40 lg:max-h-48 object-contain drop-shadow-2xl"
                    style={{
                      filter: 'drop-shadow(2px 2px 8px rgba(0,0,0,0.9))'
                    }}
                  />
                ) : (
                  <h1
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-tight drop-shadow-2xl tracking-tight"
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      textShadow: '2px 2px 8px rgba(0,0,0,0.8)'
                    }}
                  >
                    {heroContent.title}
                  </h1>
                )}
              </div>

              {/* Badge Netflix normal */}
              {heroContent.rating && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-4 py-2 rounded-md">
                    <Star className="w-5 h-5 text-white fill-white" />
                    <span className="text-white font-bold text-base md:text-lg">
                      Recommandé à {Math.round(heroContent.rating * 10)}%
                    </span>
                  </div>
                  {heroContent.release_year && (
                    <span className="text-white text-base md:text-lg font-semibold px-3 py-2 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
                      {heroContent.release_year}
                    </span>
                  )}
                  {/* Durée pour Films ou Saisons pour Séries */}
                  {heroContent.duration ? (
                    <span className="text-white text-base md:text-lg px-3 py-2 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
                      {Math.floor(heroContent.duration / 60)}H{String(heroContent.duration % 60).padStart(2, '0')}
                    </span>
                  ) : heroContent.total_seasons && (
                    <span className="text-white text-base md:text-lg px-3 py-2 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
                      {heroContent.total_seasons} saison{heroContent.total_seasons > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-sm md:text-base lg:text-lg text-gray-100 leading-relaxed line-clamp-3 drop-shadow-lg">
                {heroContent.description}
              </p>

              {/* Boutons Netflix */}
              <div className="flex items-center gap-3 md:gap-4 pt-2">
                <Button
                  onClick={() => {
                    const type = heroContent.video_url ? 'movie' : 'series';
                    if (type === 'movie') {
                      navigate('/player', {
                        state: {
                          videoUrl: heroContent.video_url,
                          contentId: heroContent.id,
                          contentType: 'movie',
                        },
                      });
                    } else {
                      navigate(`/series/${heroContent.id}`);
                    }
                  }}
                  className="bg-white hover:bg-gray-200 text-black px-8 md:px-10 py-3 md:py-4 rounded-md font-bold text-base md:text-lg transition-all hover:scale-105 shadow-2xl flex items-center gap-2 md:gap-3 justify-center min-w-[140px] md:min-w-[160px] border-0"
                >
                  <Play className="h-5 w-5 md:h-6 md:w-6 fill-black" />
                  <span>Lecture</span>
                </Button>
                
                <Button
                  onClick={() => {
                    const type = heroContent.video_url ? 'movie' : 'series';
                    navigate(`/${type}/${heroContent.id}`);
                  }}
                  className="bg-gray-600/80 hover:bg-gray-500/80 text-white px-8 md:px-10 py-3 md:py-4 rounded-md font-bold text-base md:text-lg backdrop-blur-sm transition-all hover:scale-105 shadow-xl flex items-center gap-2 md:gap-3 justify-center min-w-[140px] md:min-w-[180px] border border-white/20"
                >
                  <Info className="h-5 w-5 md:h-6 md:w-6 stroke-white" strokeWidth={2} />
                  <span>Plus d'infos</span>
                </Button>
              </div>
            </div>
          </div>

          {/* PARTIE DROITE - Image claire et visible (60%) */}
          <div className="absolute inset-0 overflow-hidden md:relative right-0 top-0 w-full md:w-[55%] lg:w-[60%] h-full">
            <img
              src={heroContent.backdrop_url || heroContent.poster_url}
              alt={heroContent.title}
              className="hero-image w-full h-full object-cover object-center"
              style={{
                objectPosition: 'center center',
              }}
              loading="eager"
              onError={(e) => {
                if (heroContent.poster_url && e.target.src !== heroContent.poster_url) {
                  e.target.src = heroContent.poster_url;
                }
              }}
            />
            
            {/* Overlay gradient Netflix */}
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
            
            {/* Gradient bas Netflix - Transition vers contenu du bas (600px) */}
            <div className="absolute bottom-0 left-0 right-0 h-[600px] bg-gradient-to-b to-black from-transparent pointer-events-none"></div>
          </div>

          {/* Indicateurs de carousel - Style Netflix */}
          {allContent.length > 1 && (
            <div className="absolute bottom-12 right-1/2 translate-x-1/2 flex items-center gap-2 z-20">
              {allContent.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setHeroIndex(index)}
                  className={`h-1 rounded-full transition-all relative overflow-hidden ${
                    index === heroIndex 
                      ? 'w-10 bg-gray-500' 
                      : 'w-2 bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Aller au contenu ${index + 1}`}
                >
                  {/* Barre de progression rouge Netflix */}
                  {index === heroIndex && (
                    <div 
                      className="absolute inset-0 bg-[#e50914] origin-left"
                      style={{
                        animation: 'progress 8s linear'
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structure: Top 10 Films -> Films Récents -> Top 10 Séries -> Séries Récentes */}
      
      {/* Top 10 Films */}
      <Top10Section type="movies" title="Top 10 Films" />
      
      {/* Films Récents */}
      <RecentContent showMovies={true} showSeries={false} />
      
      {/* Top 10 Séries */}
      <Top10Section type="series" title="Top 10 Séries" />
      
      {/* Séries Récentes */}
      <RecentContent showMovies={false} showSeries={true} />
      </div>
    </div>
  );
};

export default Home;
