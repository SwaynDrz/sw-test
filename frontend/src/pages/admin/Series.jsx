import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { ArrowLeft, Plus, Trash2, Edit2, Tv, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AdminSeries = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 20;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tmdb_id: '',
    genres: '',
    release_year: '',
    rating: '',
    total_seasons: '',
  });
  const [tmdbImporting, setTmdbImporting] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const response = await axiosInstance.get('/series?per_page=5000'); // Charger TOUTES les séries
      setSeries(response.data.series || response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des séries');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const importFromTMDB = async () => {
    if (!formData.tmdb_id) {
      toast.error('TMDB ID requis');
      return;
    }

    setTmdbImporting(true);
    try {
      const response = await axiosInstance.post('/series/import-tmdb', {
        tmdb_id: parseInt(formData.tmdb_id),
        video_url: 'placeholder',
      });
      toast.success('Série importée depuis TMDB');
      setDialogOpen(false);
      resetForm();
      fetchSeries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import TMDB');
    } finally {
      setTmdbImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error('Titre requis');
      return;
    }

    const seriesData = {
      title: formData.title,
      description: formData.description || null,
      poster_url: formData.poster_url || null,
      backdrop_url: formData.backdrop_url || null,
      genres: formData.genres ? formData.genres.split(',').map((g) => g.trim()) : [],
      release_year: formData.release_year ? parseInt(formData.release_year) : null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      total_seasons: formData.total_seasons ? parseInt(formData.total_seasons) : null,
    };

    try {
      if (editingSeries) {
        await axiosInstance.put(`/series/${editingSeries.id}`, seriesData);
        toast.success('Série modifiée');
      } else {
        await axiosInstance.post('/series', seriesData);
        toast.success('Série créée');
      }
      setDialogOpen(false);
      resetForm();
      fetchSeries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette série et tous ses épisodes ?')) return;

    try {
      await axiosInstance.delete(`/series/${id}`);
      toast.success('Série supprimée');
      fetchSeries();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleAvailability = async (seriesId, currentAvailable) => {
    try {
      const response = await axiosInstance.patch(`/series/${seriesId}/availability`);
      toast.success(response.data.message);
      fetchSeries();
    } catch (error) {
      toast.error('Erreur lors de la modification de la disponibilité');
    }
  };

  const handleEdit = (s) => {
    setEditingSeries(s);
    setFormData({
      title: s.title,
      description: s.description || '',
      poster_url: s.poster_url || '',
      backdrop_url: s.backdrop_url || '',
      tmdb_id: s.tmdb_id || '',
      genres: s.genres?.join(', ') || '',
      release_year: s.release_year || '',
      rating: s.rating || '',
      total_seasons: s.total_seasons || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      poster_url: '',
      backdrop_url: '',
      tmdb_id: '',
      genres: '',
      release_year: '',
      rating: '',
      total_seasons: '',
    });
    setEditingSeries(null);
  };

  // Filtrer les séries selon la recherche
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return series;
    
    const query = searchQuery.toLowerCase();
    return series.filter(s => 
      s.title?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.genres?.some(genre => genre.toLowerCase().includes(query))
    );
  }, [series, searchQuery]);

  // Réinitialiser la page lors de la recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="admin-series-page">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a1b]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="text-white hover:text-[#e50914]"
                data-testid="back-home-btn"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Gestion des Séries
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/movies')}
                variant="outline"
                className="border-gray-700"
                data-testid="nav-movies-btn"
              >
                Films
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
                  <Button className="bg-[#e50914] hover:bg-[#c50812]" data-testid="add-series-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une Série
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1b] border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {editingSeries ? 'Éditer la Série' : 'Nouvelle Série'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* TMDB Import Section */}
                    <div className="bg-[#e50914]/10 border border-[#e50914]/30 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-[#e50914]">Import automatique TMDB</h3>
                      <div>
                        <Label htmlFor="tmdb_id">TMDB ID</Label>
                        <Input
                          id="tmdb_id"
                          name="tmdb_id"
                          placeholder="1399"
                          value={formData.tmdb_id}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="tmdb-id-input"
                        />
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
                        <Label htmlFor="total_seasons">Nombre de saisons</Label>
                        <Input
                          id="total_seasons"
                          name="total_seasons"
                          type="number"
                          placeholder="5"
                          value={formData.total_seasons}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="seasons-input"
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
                        {editingSeries ? 'Modifier' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Series List */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Barre de recherche */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="🔍 Rechercher une série par titre, description ou genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1a1a1b] border-gray-800 text-white placeholder:text-gray-500 focus:border-[#e50914]"
          />
          {searchQuery && (
            <p className="text-sm text-gray-400 mt-2">
              {filteredSeries.length} résultat{filteredSeries.length !== 1 ? 's' : ''} trouvé{filteredSeries.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <Tv className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            {searchQuery ? (
              <>
                <p className="text-gray-400 text-lg">Aucune série trouvée</p>
                <p className="text-gray-500 text-sm mt-2">Essayez une autre recherche</p>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-lg">Aucune série ajoutée</p>
                <p className="text-gray-500 text-sm mt-2">Commencez par ajouter votre première série</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Stats et Pagination */}
            <div className="mb-6 flex items-center justify-between text-gray-400">
              <div className="text-sm">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredSeries.length)} sur {filteredSeries.length} séries
              </div>
              {Math.ceil(filteredSeries.length / itemsPerPage) > 1 && (
                <div className="text-sm">
                  Page {currentPage} / {Math.ceil(filteredSeries.length / itemsPerPage)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((s) => (
              <div
                key={s.id}
                className="bg-[#1a1a1b] rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
                data-testid={`series-item-${s.id}`}
              >
                <div className="aspect-video bg-gray-900 relative">
                  {s.backdrop_url || s.poster_url ? (
                    <img
                      src={s.backdrop_url || s.poster_url}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Tv className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{s.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {s.description || 'Pas de description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.release_year && <span>{s.release_year}</span>}
                      {s.total_seasons && <span>• {s.total_seasons} saison(s)</span>}
                    </div>
                    
                    {/* Boutons visibles uniquement pour Fondateurs, Co-Fondateurs et Super Admin */}
                    {(user?.role === 'fondateur' || user?.role === 'co_fondateur' || user?.role === 'super_admin') && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAvailability(s.id, s.available)}
                          className={s.available === false ? "hover:text-green-500" : "hover:text-orange-500"}
                          title={s.available === false ? "Rendre disponible" : "Masquer"}
                        >
                          {s.available === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(s)}
                          data-testid={`edit-btn-${s.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(s.id)}
                          className="hover:text-red-500"
                          data-testid={`delete-btn-${s.id}`}
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
          {Math.ceil(filteredSeries.length / itemsPerPage) > 1 && (
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
                {[...Array(Math.min(5, Math.ceil(filteredSeries.length / itemsPerPage)))].map((_, index) => {
                  const totalPages = Math.ceil(filteredSeries.length / itemsPerPage);
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
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredSeries.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredSeries.length / itemsPerPage)}
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

export default AdminSeries;