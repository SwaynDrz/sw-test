import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { ArrowLeft, Plus, Trash2, Edit2, Film, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AdminMovies = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 20;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    tmdb_id: '',
    genres: '',
    release_year: '',
    duration: '',
    rating: '',
  });
  const [tmdbImporting, setTmdbImporting] = useState(false);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await axiosInstance.get('/movies?per_page=5000'); // Charger TOUS les films
      setMovies(response.data.movies || response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des films');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const importFromTMDB = async () => {
    if (!formData.tmdb_id || !formData.video_url) {
      toast.error('TMDB ID et URL vidéo requis');
      return;
    }

    setTmdbImporting(true);
    try {
      const response = await axiosInstance.post('/movies/import-tmdb', {
        tmdb_id: parseInt(formData.tmdb_id),
        video_url: formData.video_url,
      });
      toast.success('Film importé depuis TMDB');
      setDialogOpen(false);
      resetForm();
      fetchMovies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import TMDB');
    } finally {
      setTmdbImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.video_url) {
      toast.error('Titre et URL vidéo requis');
      return;
    }

    const movieData = {
      title: formData.title,
      description: formData.description || null,
      video_url: formData.video_url,
      poster_url: formData.poster_url || null,
      backdrop_url: formData.backdrop_url || null,
      genres: formData.genres ? formData.genres.split(',').map((g) => g.trim()) : [],
      release_year: formData.release_year ? parseInt(formData.release_year) : null,
      duration: formData.duration ? parseInt(formData.duration) : null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
    };

    try {
      if (editingMovie) {
        await axiosInstance.put(`/movies/${editingMovie.id}`, movieData);
        toast.success('Film modifié');
      } else {
        await axiosInstance.post('/movies', movieData);
        toast.success('Film créé');
      }
      setDialogOpen(false);
      resetForm();
      fetchMovies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce film ?')) return;

    try {
      await axiosInstance.delete(`/movies/${id}`);
      toast.success('Film supprimé');
      fetchMovies();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleAvailability = async (movieId, currentAvailable) => {
    try {
      const response = await axiosInstance.patch(`/movies/${movieId}/availability`);
      toast.success(response.data.message);
      fetchMovies();
    } catch (error) {
      toast.error('Erreur lors de la modification de la disponibilité');
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      description: movie.description || '',
      video_url: movie.video_url,
      poster_url: movie.poster_url || '',
      backdrop_url: movie.backdrop_url || '',
      tmdb_id: movie.tmdb_id || '',
      genres: movie.genres?.join(', ') || '',
      release_year: movie.release_year || '',
      duration: movie.duration || '',
      rating: movie.rating || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      poster_url: '',
      backdrop_url: '',
      tmdb_id: '',
      genres: '',
      release_year: '',
      duration: '',
      rating: '',
    });
    setEditingMovie(null);
  };

  // Filtrer les films selon la recherche
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    
    const query = searchQuery.toLowerCase();
    return movies.filter(movie => 
      movie.title?.toLowerCase().includes(query) ||
      movie.description?.toLowerCase().includes(query) ||
      movie.genres?.some(genre => genre.toLowerCase().includes(query))
    );
  }, [movies, searchQuery]);

  // Réinitialiser la page lors de la recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="admin-movies-page">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a1b]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/dashboard')}
                variant="ghost"
                className="text-white hover:text-[#e50914]"
                data-testid="back-home-btn"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Gestion des Films
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/series')}
                variant="outline"
                className="border-gray-700"
                data-testid="nav-series-btn"
              >
                Séries
              </Button>
              <Button
                onClick={() => navigate('/admin/episodes')}
                variant="outline"
                className="border-gray-700"
                data-testid="nav-episodes-btn"
              >
                Épisodes
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#e50914] hover:bg-[#c50812]" data-testid="add-movie-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un Film
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1b] border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {editingMovie ? 'Éditer le Film' : 'Nouveau Film'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* TMDB Import Section */}
                    <div className="bg-[#e50914]/10 border border-[#e50914]/30 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-[#e50914]">Import automatique TMDB</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="tmdb_id">TMDB ID</Label>
                          <Input
                            id="tmdb_id"
                            name="tmdb_id"
                            placeholder="550"
                            value={formData.tmdb_id}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="tmdb-id-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="video_url">URL Vidéo MP4</Label>
                          <Input
                            id="video_url"
                            name="video_url"
                            placeholder="https://...video.mp4"
                            value={formData.video_url}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="video-url-input"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={importFromTMDB}
                        disabled={tmdbImporting}
                        className="w-full bg-[#e50914] hover:bg-[#c50812]"
                        data-testid="import-tmdb-btn"
                      >
                        {tmdbImporting ? 'Import en cours...' : 'Importer depuis TMDB'}
                      </Button>
                    </div>

                    <div className="border-t border-gray-800 pt-4">
                      <p className="text-sm text-gray-400 mb-4">Ou remplir manuellement :</p>
                    </div>

                    {/* Manual Form */}
                    <div>
                      <Label htmlFor="title">Titre *</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="bg-[#0f0f10] border-gray-700"
                        data-testid="title-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="bg-[#0f0f10] border-gray-700"
                        data-testid="description-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="poster_url">URL Poster</Label>
                        <Input
                          id="poster_url"
                          name="poster_url"
                          value={formData.poster_url}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="poster-url-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="backdrop_url">URL Backdrop</Label>
                        <Input
                          id="backdrop_url"
                          name="backdrop_url"
                          value={formData.backdrop_url}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="backdrop-url-input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="genres">Genres (séparés par virgule)</Label>
                        <Input
                          id="genres"
                          name="genres"
                          placeholder="Action, Drame"
                          value={formData.genres}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="genres-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="release_year">Année</Label>
                        <Input
                          id="release_year"
                          name="release_year"
                          type="number"
                          placeholder="2024"
                          value={formData.release_year}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="year-input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="duration">Durée (minutes)</Label>
                        <Input
                          id="duration"
                          name="duration"
                          type="number"
                          placeholder="120"
                          value={formData.duration}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="duration-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rating">Note (0-10)</Label>
                        <Input
                          id="rating"
                          name="rating"
                          type="number"
                          step="0.1"
                          placeholder="8.5"
                          value={formData.rating}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="rating-input"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                        className="flex-1 border-gray-700"
                        data-testid="cancel-btn"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#e50914] hover:bg-[#c50812]"
                        data-testid="submit-btn"
                      >
                        {editingMovie ? 'Modifier' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Movies List */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Barre de recherche */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="🔍 Rechercher un film par titre, description ou genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1a1a1b] border-gray-800 text-white placeholder:text-gray-500 focus:border-[#e50914]"
          />
          {searchQuery && (
            <p className="text-sm text-gray-400 mt-2">
              {filteredMovies.length} résultat{filteredMovies.length !== 1 ? 's' : ''} trouvé{filteredMovies.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <Film className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            {searchQuery ? (
              <>
                <p className="text-gray-400 text-lg">Aucun film trouvé</p>
                <p className="text-gray-500 text-sm mt-2">Essayez une autre recherche</p>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-lg">Aucun film ajouté</p>
                <p className="text-gray-500 text-sm mt-2">Commencez par ajouter votre premier film</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Stats et Pagination */}
            <div className="mb-6 flex items-center justify-between text-gray-400">
              <div className="text-sm">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredMovies.length)} sur {filteredMovies.length} films
              </div>
              {Math.ceil(filteredMovies.length / itemsPerPage) > 1 && (
                <div className="text-sm">
                  Page {currentPage} / {Math.ceil(filteredMovies.length / itemsPerPage)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMovies
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((movie) => (
              <div
                key={movie.id}
                className="bg-[#1a1a1b] rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
                data-testid={`movie-item-${movie.id}`}
              >
                <div className="aspect-video bg-gray-900 relative">
                  {movie.backdrop_url || movie.poster_url ? (
                    <img
                      src={movie.backdrop_url || movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Film className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{movie.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {movie.description || 'Pas de description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {movie.release_year && <span>{movie.release_year}</span>}
                      {movie.duration && (
                        <span>
                          • {Math.floor(movie.duration / 60)}H{String(movie.duration % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    {/* Boutons visibles uniquement pour Fondateurs, Co-Fondateurs et Super Admin */}
                    {(user?.role === 'fondateur' || user?.role === 'co_fondateur' || user?.role === 'super_admin') && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAvailability(movie.id, movie.available)}
                          className={movie.available === false ? "hover:text-green-500" : "hover:text-orange-500"}
                          title={movie.available === false ? "Rendre disponible" : "Masquer"}
                        >
                          {movie.available === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(movie)}
                          data-testid={`edit-btn-${movie.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(movie.id)}
                          className="hover:text-red-500"
                          data-testid={`delete-btn-${movie.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contrôles de pagination */}
          {Math.ceil(filteredMovies.length / itemsPerPage) > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, Math.ceil(filteredMovies.length / itemsPerPage)))].map((_, index) => {
                  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = index + 1;
                  } else if (currentPage <= 3) {
                    pageNum = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + index;
                  } else {
                    pageNum = currentPage - 2 + index;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className={currentPage === pageNum 
                        ? 'bg-[#e50914] hover:bg-[#c50812] text-white' 
                        : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      }
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMovies.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredMovies.length / itemsPerPage)}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
};

export default AdminMovies;