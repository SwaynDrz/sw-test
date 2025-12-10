import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Top10Section = ({ type, title }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: false });
  const navigate = useNavigate();
  const scrollContainerRef = React.useRef(null);

  useEffect(() => {
    fetchTop10();
  }, [type]);

  const fetchTop10 = async () => {
    try {
      const endpoint = type === 'movies' ? '/top-movies' : '/top-series';
      const res = await axios.get(`${API}${endpoint}?limit=10`);
      setItems(type === 'movies' ? res.data.movies : res.data.series);
    } catch (error) {
      console.error('Erreur chargement Top 10:', error);
    } finally {
      setLoading(false);
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

  const scroll = (direction) => {
    if (scrollContainerRef && scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -800 : 800;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      
      // Vérifier la position après le scroll
      setTimeout(() => checkScrollPosition(scrollContainerRef, setScrollState), 300);
    }
  };

  // Vérifier la position au chargement des items
  useEffect(() => {
    if (items.length > 0) {
      setTimeout(() => checkScrollPosition(scrollContainerRef, setScrollState), 100);
    }
  }, [items]);

  if (loading || items.length === 0) return null;

  return (
    <section className="py-8 bg-black">
      <div className="relative px-4 md:px-8 lg:px-16 max-w-[2000px] mx-auto">
        
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          {title}
        </h2>

        {/* Carousel avec flèches */}
        <div className="relative group">
          
          {/* Flèche gauche - visible seulement si pas au début */}
          {!scrollState.atStart && (
            <button
              onClick={() => scroll('left')}
              className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          )}

          {/* Container scrollable horizontal */}
          <div
            ref={scrollContainerRef}
            onScroll={() => checkScrollPosition(scrollContainerRef, setScrollState)}
            className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                className="group/card cursor-pointer flex-shrink-0 w-[150px] sm:w-[170px] md:w-[200px] lg:w-[220px]"
                onClick={() => {
                  if (type === 'movies') {
                    navigate(`/movie/${item.id}`);
                  } else {
                    navigate(`/series/${item.id}`);
                  }
                }}
              >
                {/* Poster rectangulaire avec numéro */}
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-lg transition-all duration-300 group-hover/card:shadow-2xl mb-3">
                  {/* Image poster */}
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-[0.4]"
                    loading="lazy"
                  />
                  
                  {/* Numéro en haut à gauche */}
                  <div className="absolute -top-1 left-2">
                    <span 
                      className="text-[#e50914] text-3xl md:text-4xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                      style={{
                        WebkitTextStroke: '1px black'
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Overlay gradient au survol avec description */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs text-gray-300 line-clamp-3">{item.description}</p>
                    </div>
                  </div>
                </div>

                {/* Titre en dessous */}
                <h3 className="font-semibold text-sm line-clamp-2 group-hover/card:text-[#e50914] transition-colors">
                  {item.title}
                </h3>

                {/* Note en dessous */}
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  {item.rating && (
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      {item.rating}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Flèche droite - visible seulement si pas à la fin */}
          {!scrollState.atEnd && (
            <button
              onClick={() => scroll('right')}
              className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-20 bg-black/90 hover:bg-black text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

// Composant principal qui exporte les deux sections
const Top10 = () => {
  return (
    <>
      <Top10Section type="movies" title="Top 10 Films" />
      <Top10Section type="series" title="Top 10 Séries" />
    </>
  );
};

// Export individuels pour utilisation séparée
export { Top10Section };
export default Top10;
