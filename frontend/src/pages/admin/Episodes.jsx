import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { ArrowLeft, Plus, Trash2, Edit2, PlaySquare, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';


const AdminEpisodes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState([]);
  const [series, setSeries] = useState([]);

  const getSeriesName = (seriesId) => {
    const s = series.find((s) => s.id === seriesId);
    return s ? s.title : 'Série inconnue';
  };
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState('');
  const [openSeries, setOpenSeries] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const seriesPerPage = 10; // 10 séries par page
  const [formData, setFormData] = useState({
    series_id: '',
    tmdb_series_id: '',
    season_number: '',
    episode_number: '',
    title: '',
    description: '',
    video_url: '',
    duration: '',
  });
  const [tmdbImporting, setTmdbImporting] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    series_id: '',
    tmdb_series_id: '',
    season_number: '',
    starting_episode: '1',
    episode_count: '10', // Nombre d'épisodes à ajouter
    episodes: Array(50).fill('').map(() => ({ video_url: '' }))
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [episodesRes, seriesRes] = await Promise.all([
        axiosInstance.get('/episodes?per_page=50000'), // Charger jusqu'à 50 000 épisodes
        axiosInstance.get('/series?per_page=5000'), // Charger TOUTES les séries
      ]);
      setEpisodes(episodesRes.data.episodes || episodesRes.data);
      setSeries(seriesRes.data.series || seriesRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const importFromTMDB = async () => {
    if (!formData.series_id || !formData.tmdb_series_id || !formData.season_number || !formData.episode_number || !formData.video_url) {
      toast.error('Série, TMDB ID, saison, épisode et URL vidéo requis');
      return;
    }

    setTmdbImporting(true);
    try {
      await axiosInstance.post('/episodes/import-tmdb', {
        series_id: formData.series_id,
        tmdb_series_id: parseInt(formData.tmdb_series_id),
        season_number: parseInt(formData.season_number),
        episode_number: parseInt(formData.episode_number),
        video_url: formData.video_url,
      });
      toast.success('Épisode importé depuis TMDB');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import TMDB');
    } finally {
      setTmdbImporting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFormData.series_id || !bulkFormData.tmdb_series_id || !bulkFormData.season_number) {
      toast.error('Série, TMDB ID et saison requis');
      return;
    }

    // Filtrer les épisodes avec URL
    const validEpisodes = bulkFormData.episodes
      .map((ep, index) => ({
        ...ep,
        episode_number: parseInt(bulkFormData.starting_episode) + index
      }))
      .filter(ep => ep.video_url.trim() !== '');

    if (validEpisodes.length === 0) {
      toast.error('Ajoutez au moins un lien vidéo');
      return;
    }

    setTmdbImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const episode of validEpisodes) {
      try {
        await axiosInstance.post('/episodes/import-tmdb', {
          series_id: bulkFormData.series_id,
          tmdb_series_id: parseInt(bulkFormData.tmdb_series_id),
          season_number: parseInt(bulkFormData.season_number),
          episode_number: episode.episode_number,
          video_url: episode.video_url,
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Erreur épisode ${episode.episode_number}:`, error);
      }
    }

    setTmdbImporting(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} épisode(s) importé(s) avec succès`);
      setBulkDialogOpen(false);
      resetBulkForm();
      fetchData();
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} épisode(s) en erreur`);
    }
  };

  const resetBulkForm = () => {
    setBulkFormData({
      series_id: '',
      tmdb_series_id: '',
      season_number: '',
      starting_episode: '1',
      episodes: Array(10).fill('').map(() => ({ video_url: '' }))
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.series_id || !formData.season_number || !formData.episode_number || !formData.title || !formData.video_url) {
      toast.error('Série, saison, numéro, titre et URL vidéo requis');
      return;
    }

    const episodeData = {
      series_id: formData.series_id,
      season_number: parseInt(formData.season_number),
      episode_number: parseInt(formData.episode_number),
      title: formData.title,
      description: formData.description || null,
      video_url: formData.video_url,
      still_url: formData.still_url || null,
      duration: formData.duration ? parseInt(formData.duration) : null,
    };

    try {
      if (editingEpisode) {
        await axiosInstance.put(`/episodes/${editingEpisode.id}`, episodeData);
        toast.success('Épisode modifié');
      } else {
        await axiosInstance.post('/episodes', episodeData);
        toast.success('Épisode créé');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet épisode ?')) return;

    try {
      await axiosInstance.delete(`/episodes/${id}`);
      toast.success('Épisode supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleEpisodeAvailability = async (episodeId, currentAvailable) => {
    try {
      const response = await axiosInstance.patch(`/episodes/${episodeId}/availability`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification de la disponibilité');
    }
  };

  const handleToggleSeasonAvailability = async (seriesId, seasonNumber, currentAvailable) => {
    try {
      const response = await axiosInstance.patch(`/series/${seriesId}/season/${seasonNumber}/availability`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification de la disponibilité');
    }
  };

  const handleEdit = (episode) => {
    setEditingEpisode(episode);
    setFormData({
      series_id: episode.series_id,
      tmdb_series_id: '',
      season_number: episode.season_number,
      episode_number: episode.episode_number,
      title: episode.title,
      description: episode.description || '',
      video_url: episode.video_url,
      still_url: episode.still_url || '',
      duration: episode.duration || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      series_id: '',
      tmdb_series_id: '',
      season_number: '',
      episode_number: '',
      title: '',
      description: '',
      video_url: '',
      still_url: '',
      duration: '',
    });
    setEditingEpisode(null);
  };

  // Filtrage combiné : par série sélectionnée ET par recherche textuelle
  const filteredEpisodes = useMemo(() => {
    let filtered = episodes;
    
    // Filtre par série sélectionnée
    if (selectedSeries) {
      filtered = filtered.filter((ep) => ep.series_id === selectedSeries);
    }
    
    // Filtre par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ep => 
        ep.title?.toLowerCase().includes(query) ||
        ep.description?.toLowerCase().includes(query) ||
        getSeriesName(ep.series_id)?.toLowerCase().includes(query) ||
        `S${ep.season_number}E${ep.episode_number}`.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [episodes, selectedSeries, searchQuery]);

  // Grouper les épisodes par série ET filtrer les épisodes orphelins (sans série valide)
  const groupedEpisodes = useMemo(() => {
    const grouped = {};
    
    filteredEpisodes.forEach(episode => {
      // Vérifier que la série existe
      const seriesExists = series.find(s => s.id === episode.series_id);
      
      if (seriesExists) {
        if (!grouped[episode.series_id]) {
          grouped[episode.series_id] = [];
        }
        grouped[episode.series_id].push(episode);
      }
    });
    
    // Trier les épisodes dans chaque série par saison puis épisode
    Object.keys(grouped).forEach(seriesId => {
      grouped[seriesId].sort((a, b) => {
        if (a.season_number !== b.season_number) {
          return a.season_number - b.season_number;
        }
        return a.episode_number - b.episode_number;
      });
    });
    
    return grouped;
  }, [filteredEpisodes, series]);

  // Compter les épisodes orphelins (sans série valide)
  const orphanEpisodes = useMemo(() => {
    return filteredEpisodes.filter(ep => !series.find(s => s.id === ep.series_id));
  }, [filteredEpisodes, series]);

  

  // Réinitialiser la page lors de la recherche
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="admin-episodes-page">
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
                Gestion des Épisodes
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
                onClick={() => navigate('/admin/series')}
                variant="outline"
                className="border-gray-700"
                data-testid="nav-series-btn"
              >
                Séries
              </Button>
              <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
                setBulkDialogOpen(open);
                if (!open) resetBulkForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700" data-testid="bulk-add-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter 10 Épisodes
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1b] border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Ajouter jusqu'à 50 Épisodes</DialogTitle>
                    <p className="text-sm text-gray-400 mt-2">
                      💡 Astuce: Choisissez le nombre d'épisodes, puis remplissez EP 01 avec un pattern (E01, E02, etc.) → auto-remplit les autres !
                    </p>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Série Selection */}
                    <div>
                      <Label>Série *</Label>
                      <Select
                        value={bulkFormData.series_id}
                        onValueChange={(value) => {
                          const selectedSeries = series.find(s => s.id === value);
                          setBulkFormData((prev) => ({ 
                            ...prev, 
                            series_id: value,
                            tmdb_series_id: selectedSeries?.tmdb_id || ''
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white">
                          <SelectValue placeholder="Sélectionnez une série" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1b] border-gray-700">
                          {series.map((s) => (
                            <SelectItem 
                              key={s.id} 
                              value={s.id}
                              className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer"
                            >
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>TMDB ID Série *</Label>
                        <Input
                          value={bulkFormData.tmdb_series_id}
                          onChange={(e) => setBulkFormData((prev) => ({ ...prev, tmdb_series_id: e.target.value }))}
                          className="bg-[#0f0f10] border-gray-700"
                          placeholder="1399"
                        />
                      </div>
                      <div>
                        <Label>Saison *</Label>
                        <Input
                          type="number"
                          value={bulkFormData.season_number}
                          onChange={(e) => setBulkFormData((prev) => ({ ...prev, season_number: e.target.value }))}
                          className="bg-[#0f0f10] border-gray-700"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label>Début Épisode</Label>
                        <Input
                          type="number"
                          value={bulkFormData.starting_episode}
                          onChange={(e) => setBulkFormData((prev) => ({ ...prev, starting_episode: e.target.value }))}
                          className="bg-[#0f0f10] border-gray-700"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label>Nb d'Épisodes *</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={bulkFormData.episode_count}
                          onChange={(e) => {
                            const count = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                            setBulkFormData((prev) => ({ ...prev, episode_count: count.toString() }));
                          }}
                          className="bg-[#0f0f10] border-gray-700"
                          placeholder="10"
                        />
                      </div>
                    </div>

                    {/* Liste dynamique des épisodes */}
                    <div className="space-y-3 border-t border-gray-700 pt-4">
                      <h3 className="font-semibold text-lg">URLs Vidéos (MP4) - {bulkFormData.episode_count} épisodes</h3>
                      {bulkFormData.episodes.slice(0, parseInt(bulkFormData.episode_count || 10)).map((episode, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 w-16">Ep {parseInt(bulkFormData.starting_episode || 1) + index}</span>
                          <Input
                            value={episode.video_url}
                            onChange={(e) => {
                              let url = e.target.value;
                              const newEpisodes = [...bulkFormData.episodes];
                              
                              // Adapter TOUS les numéros de saison dans l'URL si différent
                              const selectedSeason = parseInt(bulkFormData.season_number || 1);
                              const seasonPatterns = [
                                { regex: /S(\d{2})/gi, format: (num) => `S${String(num).padStart(2, '0')}` },
                                { regex: /S(\d{1})(?!\d)/gi, format: (num) => `S${num}` },
                                { regex: /saison(\d{2})/gi, format: (num) => `saison${String(num).padStart(2, '0')}` },
                              ];
                              
                              for (const pattern of seasonPatterns) {
                                // Remplacer TOUTES les occurrences (flag 'g')
                                url = url.replace(pattern.regex, (match, seasonNum) => {
                                  const urlSeasonNum = parseInt(seasonNum, 10);
                                  if (urlSeasonNum !== selectedSeason) {
                                    return pattern.format(selectedSeason);
                                  }
                                  return match;
                                });
                              }
                              
                              newEpisodes[index] = { video_url: url };
                              
                              // Auto-complétion si c'est le premier épisode et qu'on détecte un pattern
                              if (index === 0 && url.length > 10) {
                                const episodeCount = parseInt(bulkFormData.episode_count || 10);
                                
                                // Patterns de détection d'épisodes
                                const patterns = [
                                  /E(\d{2})/i,        // E01, E02
                                  /E(\d{1})(?!\d)/i,  // E1, E2 (mais pas E12)
                                  /ep(\d{2})/i,       // ep01, ep02
                                  /episode(\d{2})/i,  // episode01
                                ];
                                
                                for (const pattern of patterns) {
                                  const match = url.match(pattern);
                                  if (match) {
                                    const currentEpNum = parseInt(match[1], 10);
                                    const matchedText = match[0]; // Ex: "E01"
                                    
                                    // Remplir selon le nombre d'épisodes choisis
                                    for (let i = 1; i < episodeCount; i++) {
                                      const nextEpNum = currentEpNum + i;
                                      
                                      // Générer le nouveau pattern avec le même format
                                      let newPattern;
                                      if (matchedText.match(/E\d{2}/i)) {
                                        // Format E01
                                        newPattern = matchedText[0] + String(nextEpNum).padStart(2, '0');
                                      } else if (matchedText.match(/E\d{1}/i)) {
                                        // Format E1
                                        newPattern = matchedText[0] + nextEpNum;
                                      } else if (matchedText.match(/ep\d{2}/i)) {
                                        // Format ep01
                                        newPattern = 'ep' + String(nextEpNum).padStart(2, '0');
                                      } else if (matchedText.match(/episode\d{2}/i)) {
                                        // Format episode01
                                        newPattern = 'episode' + String(nextEpNum).padStart(2, '0');
                                      }
                                      
                                      // Créer l'URL suivante avec TOUS les S01 remplacés par S02
                                      let nextUrl = url.replace(matchedText, newPattern);
                                      
                                      // Remplacer TOUS les numéros de saison dans cette URL aussi
                                      for (const seasonPattern of seasonPatterns) {
                                        nextUrl = nextUrl.replace(seasonPattern.regex, (match, seasonNum) => {
                                          const urlSeasonNum = parseInt(seasonNum, 10);
                                          if (urlSeasonNum !== selectedSeason) {
                                            return seasonPattern.format(selectedSeason);
                                          }
                                          return match;
                                        });
                                      }
                                      
                                      newEpisodes[i] = { video_url: nextUrl };
                                    }
                                    
                                    break;
                                  }
                                }
                              }
                              
                              setBulkFormData((prev) => ({ ...prev, episodes: newEpisodes }));
                            }}
                            className="bg-[#0f0f10] border-gray-700"
                            placeholder={index === 0 ? "https://...S01-E01.mp4 (auto-adapte saison + épisodes)" : "https://...video.mp4"}
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleBulkImport}
                      disabled={tmdbImporting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {tmdbImporting ? 'Import en cours...' : 'Importer les épisodes'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-[#e50914] hover:bg-[#c50812]" data-testid="add-episode-btn">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter 1 Épisode
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a1b] border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {editingEpisode ? 'Éditer l\'\u00c9pisode' : 'Nouvel Épisode'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* TMDB Import Section */}
                    <div className="bg-[#e50914]/10 border border-[#e50914]/30 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-[#e50914]">Import automatique TMDB</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label htmlFor="series_id_tmdb">Série *</Label>
                          <Select
                            value={formData.series_id}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, series_id: value }))}
                          >
                            <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white" data-testid="series-select">
                              <SelectValue placeholder="Sélectionnez une série" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1b] border-gray-700">
                              {series.map((s) => (
                                <SelectItem 
                                  key={s.id} 
                                  value={s.id}
                                  className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer"
                                >
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="tmdb_series_id">TMDB ID Série</Label>
                          <Input
                            id="tmdb_series_id"
                            name="tmdb_series_id"
                            placeholder="1399"
                            value={formData.tmdb_series_id}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="tmdb-series-id-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="video_url_tmdb">URL Vidéo MP4</Label>
                          <Input
                            id="video_url_tmdb"
                            name="video_url"
                            placeholder="https://...video.mp4"
                            value={formData.video_url}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="video-url-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="season_number_tmdb">Saison</Label>
                          <Input
                            id="season_number_tmdb"
                            name="season_number"
                            type="number"
                            placeholder="1"
                            value={formData.season_number}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="season-number-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="episode_number_tmdb">Épisode</Label>
                          <Input
                            id="episode_number_tmdb"
                            name="episode_number"
                            type="number"
                            placeholder="1"
                            value={formData.episode_number}
                            onChange={handleInputChange}
                            className="bg-[#0f0f10] border-gray-700"
                            data-testid="episode-number-input"
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
                        rows={3}
                        className="bg-[#0f0f10] border-gray-700"
                        data-testid="description-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="still_url">URL Image</Label>
                        <Input
                          id="still_url"
                          name="still_url"
                          value={formData.still_url}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="still-url-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Durée (minutes)</Label>
                        <Input
                          id="duration"
                          name="duration"
                          type="number"
                          placeholder="45"
                          value={formData.duration}
                          onChange={handleInputChange}
                          className="bg-[#0f0f10] border-gray-700"
                          data-testid="duration-input"
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
                        {editingEpisode ? 'Modifier' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-col gap-4">
          {/* Barre de recherche */}
          <div>
            <Input
              type="text"
              placeholder="🔍 Rechercher un épisode par titre, description, série ou code (ex: S01E05)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1a1b] border-gray-800 text-white placeholder:text-gray-500 focus:border-[#e50914] focus:ring-0 focus:outline-none"
            />
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                {filteredEpisodes.length} résultat{filteredEpisodes.length !== 1 ? 's' : ''} trouvé{filteredEpisodes.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Filtre par série */}
          <div className="flex items-center gap-4">
            <Label className="text-sm text-white">Filtrer par série:</Label>
            <Select value={selectedSeries || "all"} onValueChange={(value) => setSelectedSeries(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[300px] bg-[#1a1a1b] border-gray-700 text-white" data-testid="filter-series-select">
                <SelectValue placeholder="Toutes les séries" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1b] border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">
                  Toutes les séries
                </SelectItem>
                {series.map((s) => (
                  <SelectItem 
                    key={s.id} 
                    value={s.id}
                    className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer"
                  >
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <PlaySquare className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            {searchQuery || selectedSeries ? (
              <>
                <p className="text-gray-400 text-lg">Aucun épisode trouvé</p>
                <p className="text-gray-500 text-sm mt-2">Essayez une autre recherche ou changez le filtre</p>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-lg">Aucun épisode ajouté</p>
                <p className="text-gray-500 text-sm mt-2">Commencez par ajouter votre premier épisode</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Stats et Pagination */}
            <div className="mb-6 flex items-center justify-between text-gray-400">
              <div className="text-sm">
                {Object.keys(groupedEpisodes).length} série{Object.keys(groupedEpisodes).length > 1 ? 's' : ''} • {filteredEpisodes.length} épisode{filteredEpisodes.length > 1 ? 's' : ''}
              </div>
              {Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage) > 1 && (
                <div className="text-sm">
                  Page {currentPage} / {Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage)}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {Object.keys(groupedEpisodes)
                .slice((currentPage - 1) * seriesPerPage, currentPage * seriesPerPage)
                .map(seriesId => {
              const seriesEpisodes = groupedEpisodes[seriesId];
              const isOpen = openSeries[seriesId];
              const seriesInfo = series.find(s => s.id === seriesId);
              
              return (
                <div key={seriesId} className="bg-[#1a1a1b] rounded-lg border border-gray-800 overflow-hidden">
                  {/* Header de la série (cliquable) */}
                  <button
                    onClick={() => setOpenSeries(prev => ({ ...prev, [seriesId]: !prev[seriesId] }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 aspect-video bg-gray-900 rounded overflow-hidden flex-shrink-0">
                        {seriesInfo?.poster_url ? (
                          <img src={seriesInfo.poster_url} alt={seriesInfo.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <PlaySquare className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-white">{getSeriesName(seriesId)}</h3>
                        <p className="text-sm text-gray-400">{seriesEpisodes.length} épisode{seriesEpisodes.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-400 group-hover:text-white transition-all duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {/* Liste des épisodes groupés par saison */}
                  <div className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-[5000px]' : 'max-h-0'
                  }`}>
                    <div className="border-t border-gray-800">
                      {/* Grouper par saison */}
                      {Object.entries(
                        seriesEpisodes.reduce((acc, ep) => {
                          if (!acc[ep.season_number]) acc[ep.season_number] = [];
                          acc[ep.season_number].push(ep);
                          return acc;
                        }, {})
                      )
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([seasonNum, seasonEpisodes]) => (
                        <div key={`season-${seasonNum}`} className="border-b border-gray-700 last:border-b-0">
                          {/* Header Saison */}
                          <div className="w-full flex items-center justify-between p-3 bg-gray-900/50">
                            <button
                              onClick={() => setOpenSeries(prev => ({ 
                                ...prev, 
                                [`${seriesId}-season-${seasonNum}`]: !prev[`${seriesId}-season-${seasonNum}`] 
                              }))}
                              className="flex items-center gap-3 flex-1 hover:bg-gray-800/50 transition-all -m-3 p-3 rounded-l"
                            >
                              <div className="px-3 py-1 bg-[#e50914]/20 rounded text-sm font-bold text-[#e50914]">
                                S{String(seasonNum).padStart(2, '0')}
                              </div>
                              <span className="text-white font-semibold">Saison {seasonNum}</span>
                              <span className="text-sm text-gray-400">({seasonEpisodes.length} épisodes)</span>
                            </button>
                            <div className="flex items-center gap-2">
                              {/* Bouton disponibilité saison (Fondateurs, Co-Fondateurs et Super Admin) */}
                              {(user?.role === 'fondateur' || user?.role === 'co_fondateur' || user?.role === 'super_admin') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleSeasonAvailability(seriesId, parseInt(seasonNum), seasonEpisodes[0]?.available)}
                                  className={seasonEpisodes[0]?.available === false ? "hover:text-green-500" : "hover:text-orange-500"}
                                  title={seasonEpisodes[0]?.available === false ? "Rendre la saison disponible" : "Masquer la saison"}
                                >
                                  {seasonEpisodes[0]?.available === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              )}
                              <ChevronDown 
                                className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                                  openSeries[`${seriesId}-season-${seasonNum}`] ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>
                          
                          {/* Episodes de la saison */}
                          <div className={`overflow-hidden transition-all duration-300 ${
                            openSeries[`${seriesId}-season-${seasonNum}`] ? 'max-h-[3000px]' : 'max-h-0'
                          }`}>
                            {seasonEpisodes
                              .sort((a, b) => a.episode_number - b.episode_number)
                              .map((episode) => (
                                <div
                                  key={episode.id}
                                  className="p-4 border-b border-gray-800 last:border-b-0 hover:bg-white/5 transition-colors flex items-center gap-4"
                                  data-testid={`episode-item-${episode.id}`}
                                >
                                  <div className="flex-shrink-0 w-40 aspect-video bg-gray-900 rounded overflow-hidden">
                                    {episode.still_url ? (
                                      <img src={episode.still_url} alt={episode.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        <PlaySquare className="h-8 w-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-white mb-1">
                                      E{String(episode.episode_number).padStart(2, '0')} - {episode.title}
                                    </h4>
                                    <p className="text-sm text-gray-400 line-clamp-2">{episode.description || 'Pas de description'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {episode.duration && <span className="text-sm text-gray-500">{episode.duration} min</span>}
                                    
                                    {/* Boutons visibles uniquement pour Fondateurs, Co-Fondateurs et Super Admin */}
                                    {(user?.role === 'fondateur' || user?.role === 'co_fondateur' || user?.role === 'super_admin') && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleEpisodeAvailability(episode.id, episode.available)}
                                          className={episode.available === false ? "text-white hover:bg-green-500 hover:text-white" : "text-white hover:bg-orange-500 hover:text-white"}
                                          title={episode.available === false ? "Rendre disponible" : "Masquer"}
                                        >
                                          {episode.available === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleEdit(episode)}
                                          className="text-white hover:bg-[#e50914] hover:text-white"
                                          data-testid={`edit-btn-${episode.id}`}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDelete(episode.id)}
                                          className="text-white hover:bg-red-500 hover:text-white"
                                          data-testid={`delete-btn-${episode.id}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Contrôles de pagination */}
            {Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage) > 1 && (
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
                  {[...Array(Math.min(5, Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage)))].map((_, index) => {
                    const totalPages = Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage);
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
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(Object.keys(groupedEpisodes).length / seriesPerPage)}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Message pour les épisodes orphelins */}
            {orphanEpisodes.length > 0 && (
              <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <PlaySquare className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <strong>Attention :</strong> {orphanEpisodes.length} épisode{orphanEpisodes.length > 1 ? 's' : ''} sans série valide détecté{orphanEpisodes.length > 1 ? 's' : ''}. 
                    Ces épisodes ont probablement été ajoutés pour une série qui a été supprimée. 
                    Vous pouvez les supprimer ou les réaffecter à une série existante.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminEpisodes;