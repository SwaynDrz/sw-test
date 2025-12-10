import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Film, Tv } from 'lucide-react';
import Navbar from '../components/Navbar';

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  };

  const removeFavorite = (id) => {
    const updated = favorites.filter((item) => item.id !== id);
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="favorites-page">
      <Navbar />

      <div className="pt-24 px-8 max-w-[2000px] mx-auto">
        {favorites.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <Heart className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucun favori pour le moment</p>
            <p className="text-gray-500 text-sm mt-2">
              Ajoutez des films et séries à vos favoris en cliquant sur le cœur
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favorites.map((item) => {
              const Icon = item.type === 'movie' ? Film : Tv;
              return (
                <div
                  key={item.id}
                  className="content-card cursor-pointer group relative"
                  data-testid={`favorite-card-${item.id}`}
                >
                  <div
                    onClick={() =>
                      navigate(`/${item.type === 'movie' ? 'movie' : 'series'}/${item.id}`)
                    }
                    className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900"
                  >
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Icon className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-sm font-semibold line-clamp-2">{item.title}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(item.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-[#e50914] transition-colors z-10"
                    data-testid={`remove-favorite-${item.id}`}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;