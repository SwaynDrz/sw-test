import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../utils/axios';
import { Tv, Search, SlidersHorizontal, X, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SeriesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [seriesFreeAccess, setSeriesFreeAccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const itemsPerPage = 24; // 24 séries par page

  useEffect(() => {
    fetchSeries();
    fetchSeriesAccessSettings();
  }, []);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, sortBy]);

  // Remonter le scroll quand la page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const fetchSeries = async () => {
    try {
      const response = await axios.get(`${API}/series?per_page=5000`);
      setSeries(response.data.series || response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesAccessSettings = async () => {
    try {
      const response = await axiosInstance.get('/admin/settings/series-access');
      setSeriesFreeAccess(response.data.series_free_access);
      console.log('Paramètre series_free_access:', response.data.series_free_access);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      // En cas d'erreur, on garde le comportement par défaut (bloqué)
      setSeriesFreeAccess(false);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Gérer le clic sur une série - Navigation directe, SANS PUB
  const handleSeriesClick = (seriesId) => {
    navigate(`/series/${seriesId}`);
  };

 

  const getAllGenres = () => {
    const genres = new Set();
    series.forEach((s) => {
      if (s.genres) {
        s.genres.forEach((genre) => genres.add(genre));
      }
    });
    return Array.from(genres).sort();
  };

  // Utiliser useMemo pour filtrer et trier
  const filteredSeries = useMemo(() => {
    let filtered = [...series];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(
        (s) => s.genres && s.genres.includes(selectedGenre)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'year':
        filtered.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [series, searchQuery, selectedGenre, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredSeries.length / itemsPerPage);
  const paginatedSeries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSeries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSeries, currentPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSortBy('recent');
  };

  const activeFiltersCount = (searchQuery ? 1 : 0) + (selectedGenre !== 'all' ? 1 : 0);

  // Bloquer l'accès si l'utilisateur n'a pas premium/vip ET que le paramètre global n'autorise pas l'accès gratuit
  const hasPremiumAccess = user && (user.subscription === 'premium' || user.subscription === 'vip');
  const hasAccess = hasPremiumAccess || seriesFreeAccess;

  // Afficher un loader pendant le chargement des settings
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f10]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-gray-400 text-xl">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0f0f10]">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-8">
          <Lock className="h-24 w-24 text-[#e50914] mb-6" />
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Accès aux Séries Restreint
          </h1>
          <p className="text-xl text-gray-400 mb-8 text-center max-w-2xl">
            Les séries sont disponibles uniquement pour les abonnements <span className="text-[#e50914] font-bold">PREMIUM</span> et <span className="text-yellow-500 font-bold">VIP</span>
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/subscriptions')}
              className="bg-[#e50914] hover:bg-[#c50812] text-lg px-8 py-6"
            >
              Voir les Abonnements
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-gray-700 text-lg px-8 py-6"
            >
              Retour à l'Accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="series-page">
      <Navbar />

      <div className="pt-24 px-8 lg:px-16 max-w-[2000px] mx-auto">
        {/* Search and Filters Bar */}
        <div className="bg-[#1a1a1b] rounded-xl border border-gray-800 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher une série..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0f0f10] border-gray-700 pl-12 py-6 text-lg"
                data-testid="search-input"
              />
            </div>

            {/* Filters Toggle */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="border-gray-700 relative"
              data-testid="filters-toggle"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#e50914] rounded-full flex items-center justify-center text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Genre Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Genre</label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white hover:border-[#e50914] focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]" data-testid="genre-select">
                    <SelectValue className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1b] border-[#e50914] text-white">
                    <SelectItem value="all" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Tous les genres</SelectItem>
                    {getAllGenres().map((genre) => (
                      <SelectItem key={genre} value={genre} className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Trier par</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white hover:border-[#e50914] focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]" data-testid="sort-select">
                    <SelectValue className="text-white" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1b] border-[#e50914] text-white">
                    <SelectItem value="recent" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Plus récent</SelectItem>
                    <SelectItem value="rating" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Mieux noté</SelectItem>
                    <SelectItem value="title" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Titre (A-Z)</SelectItem>
                    <SelectItem value="year" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Année</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full border-gray-700 hover:bg-[#e50914]/10 hover:text-[#e50914]"
                  data-testid="clear-filters"
                >
                  <X className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm text-gray-400">Filtres actifs:</span>
            {searchQuery && (
              <Badge variant="outline" className="border-[#e50914] text-[#e50914]">
                Recherche: {searchQuery}
              </Badge>
            )}
            {selectedGenre !== 'all' && (
              <Badge variant="outline" className="border-[#e50914] text-[#e50914]">
                Genre: {selectedGenre}
              </Badge>
            )}
          </div>
        )}

        {/* Series Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <Tv className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Aucune série trouvée</p>
            <Button onClick={clearFilters} variant="outline" className="border-gray-700">
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
            {paginatedSeries.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSeriesClick(s.id)}
                className="group cursor-pointer"
                data-testid={`series-card-${s.id}`}
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 shadow-lg transition-shadow duration-300 group-hover:shadow-xl mb-3">
                  {s.poster_url ? (
                    <img
                      src={s.poster_url}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Tv className="h-16 w-16" />
                    </div>
                  )}
                  
                  {/* Overlay au survol */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                    <div className="text-center space-y-2">
                      <p className="text-sm line-clamp-4">{s.description || "Aucune description disponible"}</p>
                      {s.genres && s.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {s.genres.slice(0, 2).map((genre, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#e50914] rounded text-xs">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Infos en dessous */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-[#e50914] transition-colors">
                    {s.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {s.rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{s.rating}</span>
                      </div>
                    )}
                    {s.release_year && <span>{s.release_year}</span>}
                    {s.total_seasons && <span>{s.total_seasons} saison{s.total_seasons > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredSeries.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 pb-12">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="bg-[#1a1a1b] border-gray-800 hover:bg-gray-900 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    className={currentPage === pageNum ? 'bg-[#e50914] hover:bg-[#c50812]' : 'bg-[#1a1a1b] border-gray-800 hover:bg-gray-900'}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="bg-[#1a1a1b] border-gray-800 hover:bg-gray-900 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-400 ml-4">
              Page {currentPage} / {totalPages}
            </span>
          </div>
        )}
      </div>

 
    </div>
  );
};

export default SeriesPage;