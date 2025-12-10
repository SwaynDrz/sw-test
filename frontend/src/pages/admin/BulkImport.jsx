import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Download, Upload, Film } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import axiosInstance from '../../utils/axios';
import { toast } from 'sonner';

const BulkImport = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [searchResults, setSearchResults] = useState({});

  const extractTitleFromUrl = (url) => {
    try {
      const filename = url.split('/').pop().split('.')[0];
      const titleWithYear = filename.replace(/-/g, ' ').replace(/_/g, ' ');
      const yearMatch = titleWithYear.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : null;
      const title = titleWithYear.replace(/\d{4}/, '').trim();
      return { title, year };
    } catch {
      return { title: '', year: null };
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        tmdb_id: '',
        video_url: '',
        searchTitle: '',
        searchYear: '',
        status: 'pending', // pending, searching, results, valid, invalid, importing, success, error
        error: null,
        results: [],
      },
    ]);
  };

  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value, status: 'pending' } : item))
    );
  };

  const searchOnTMDB = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item.video_url) {
      updateItemStatus(id, 'invalid', 'URL vidéo requise');
      return;
    }

    updateItemStatus(id, 'searching', null);

    try {
      // Extract title from URL
      const { title, year } = extractTitleFromUrl(item.video_url);
      
      // Use manual search if provided, otherwise use extracted
      const searchTitle = item.searchTitle || title;
      const searchYear = item.searchYear || year;

      if (!searchTitle) {
        updateItemStatus(id, 'invalid', 'Impossible d\'extraire le titre de l\'URL');
        return;
      }

      // Update item with search terms
      setItems(
        items.map((i) => 
          i.id === id ? { ...i, searchTitle, searchYear } : i
        )
      );

      // Search on TMDB
      const endpoint = 'movie';
      let url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=976d2a444a2b928cf0fe232191e163d8&query=${encodeURIComponent(searchTitle)}&language=fr-FR`;
      
      if (searchYear) {
        url += `&year=${searchYear}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setItems(
            items.map((i) =>
              i.id === id ? { ...i, status: 'results', results: data.results, error: null } : i
            )
          );
        } else {
          updateItemStatus(id, 'invalid', 'Aucun résultat trouvé sur TMDB');
        }
      } else {
        updateItemStatus(id, 'invalid', 'Erreur de recherche TMDB');
      }
    } catch (error) {
      updateItemStatus(id, 'invalid', 'Erreur de recherche');
    }
  };

  const selectResult = (itemId, tmdbId, title, posterPath) => {
    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              tmdb_id: tmdbId,
              title: title,
              poster_path: posterPath,
              status: 'valid',
              error: null,
            }
          : item
      )
    );
  };

  const updateItemStatus = (id, status, error = null, title = null) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status, error, title: title || item.title } : item
      )
    );
  };

  const searchAll = async () => {
    for (const item of items) {
      if (item.status === 'pending' || item.status === 'invalid') {
        await searchOnTMDB(item.id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay to avoid rate limiting
      }
    }
  };

  const importAll = async () => {
    const validItems = items.filter((item) => item.status === 'valid');
    if (validItems.length === 0) {
      toast.error('Aucun élément valide à importer');
      return;
    }

    setImporting(true);

    for (const item of validItems) {
      updateItemStatus(item.id, 'importing');

      try {
        const endpoint = '/movies/import-tmdb';
        await axiosInstance.post(endpoint, {
          tmdb_id: parseInt(item.tmdb_id),
          video_url: item.video_url,
        });
        updateItemStatus(item.id, 'success');
      } catch (error) {
        updateItemStatus(
          item.id,
          'error',
          error.response?.data?.detail || 'Erreur lors de l\'import'
        );
      }
    }

    setImporting(false);
    toast.success(`Import terminé ! ${validItems.filter((i) => i.status === 'success').length} éléments importés`);
  };

  const parseBatchInput = () => {
    const lines = batchInput.split('\n').filter((line) => line.trim());
    const newItems = [];

    lines.forEach((line) => {
      // Support both formats: URL only OR TMDB_ID, URL
      const parts = line.split(',').map((p) => p.trim());
      
      if (parts.length === 1 && parts[0].startsWith('http')) {
        // Just URL - will auto-extract title
        newItems.push({
          id: Date.now() + Math.random(),
          tmdb_id: '',
          video_url: parts[0],
          searchTitle: '',
          searchYear: '',
          status: 'pending',
          error: null,
          results: [],
        });
      } else if (parts.length >= 2) {
        // TMDB_ID, URL format (legacy)
        newItems.push({
          id: Date.now() + Math.random(),
          tmdb_id: parts[0],
          video_url: parts[1],
          searchTitle: '',
          searchYear: '',
          status: 'pending',
          error: null,
          results: [],
        });
      }
    });

    if (newItems.length > 0) {
      setItems([...items, ...newItems]);
      setBatchInput('');
      toast.success(`${newItems.length} éléments ajoutés`);
    } else {
      toast.error('Format invalide. Utilisez: URL_VIDEO ou TMDB_ID, URL_VIDEO');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'results':
        return <div className="h-5 w-5 rounded-full border-2 border-blue-500 bg-blue-500/20" />;
      case 'invalid':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'searching':
      case 'importing':
        return (
          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="bulk-import-page">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a1b]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/dashboard')}
                variant="ghost"
                className="text-white hover:text-[#e50914]"
                data-testid="back-btn"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Import en Masse
                </h1>
                <p className="text-gray-400 text-sm mt-1">Importez plusieurs contenus depuis TMDB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Titre de la section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-[#e50914]" />
            Import en Masse - Films
          </h2>
          <p className="text-gray-400 mt-2">Importez plusieurs films depuis TMDB en utilisant leurs IDs</p>
        </div>

        {/* Batch Input */}
        <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Ajout Rapide (En Masse)</h3>
          <p className="text-sm text-gray-400 mb-4">
            Collez les URLs vidéo (une par ligne). Le système extraira automatiquement le titre du film.
          </p>
          <Textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="https://cinechake.xyz/movies/Lilo-Et-Stitch-2025.mp4\nhttps://example.com/movies/Matrix-1999.mp4\nhttps://example.com/movies/Forrest-Gump-1994.mp4"
            rows={6}
            className="bg-[#0f0f10] border-gray-700 font-mono text-sm mb-4"
          />
          <Button onClick={parseBatchInput} className="bg-[#e50914] hover:bg-[#c50812]">
            <Upload className="mr-2 h-4 w-4" />
            Ajouter ces lignes
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={addItem} variant="outline" className="border-gray-700">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un élément
            </Button>
            <span className="text-sm text-gray-400">{items.length} élément(s)</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={searchAll}
              disabled={items.length === 0}
              variant="outline"
              className="border-gray-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Rechercher Tout
            </Button>
            <Button
              onClick={importAll}
              disabled={importing || items.filter((i) => i.status === 'valid').length === 0}
              className="bg-[#e50914] hover:bg-[#c50812]"
            >
              <Download className="mr-2 h-4 w-4" />
              {importing ? 'Import en cours...' : 'Importer Tout'}
            </Button>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-12 text-center">
              <p className="text-gray-400">Aucun élément. Cliquez sur "Ajouter un élément" pour commencer.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="pt-2">{getStatusIcon(item.status)}</div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-xs text-gray-400 mb-1">URL Vidéo</Label>
                      <Input
                        value={item.video_url}
                        onChange={(e) => updateItem(item.id, 'video_url', e.target.value)}
                        placeholder="https://cinechake.xyz/movies/Lilo-Et-Stitch-2025.mp4"
                        className="bg-[#0f0f10] border-gray-700"
                        disabled={item.status === 'importing' || item.status === 'success'}
                      />
                    </div>
                    
                    {(item.status === 'results' || item.status === 'invalid' || item.searchTitle) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-400 mb-1">Titre (manuel)</Label>
                          <Input
                            value={item.searchTitle}
                            onChange={(e) => updateItem(item.id, 'searchTitle', e.target.value)}
                            placeholder="Lilo Et Stitch"
                            className="bg-[#0f0f10] border-gray-700 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400 mb-1">Année (optionnel)</Label>
                          <Input
                            value={item.searchYear}
                            onChange={(e) => updateItem(item.id, 'searchYear', e.target.value)}
                            placeholder="2025"
                            className="bg-[#0f0f10] border-gray-700 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-6">
                    {(item.status === 'pending' || item.status === 'invalid') && (
                      <Button
                        size="sm"
                        onClick={() => searchOnTMDB(item.id)}
                        variant="outline"
                        className="border-gray-700"
                      >
                        Rechercher
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      variant="ghost"
                      className="hover:text-red-500"
                      disabled={item.status === 'importing'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {item.status === 'results' && item.results && item.results.length > 0 && (
                  <div className="mt-4 ml-9">
                    <p className="text-sm text-blue-400 mb-3">Sélectionnez le bon film :</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {item.results.slice(0, 8).map((result) => (
                        <button
                          key={result.id}
                          onClick={() =>
                            selectResult(
                              item.id,
                              result.id,
                              result.title || result.name,
                              result.poster_path
                            )
                          }
                          className="group relative bg-[#0f0f10] rounded-lg overflow-hidden border border-gray-700 hover:border-[#e50914] transition-all"
                        >
                          <div className="aspect-[2/3] bg-gray-900">
                            {result.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w200${result.poster_path}`}
                                alt={result.title || result.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <Film className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs font-semibold line-clamp-2">
                                {result.title || result.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {result.release_date?.substring(0, 4) || result.first_air_date?.substring(0, 4)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title/Error Display */}
                {item.title && item.status === 'valid' && (
                  <div className="mt-3 ml-9 flex items-center gap-3">
                    {item.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                        alt={item.title}
                        className="w-16 h-24 object-cover rounded border border-gray-700"
                      />
                    )}
                    <div>
                      <div className="text-sm text-green-500 font-semibold">✓ {item.title}</div>
                      <div className="text-xs text-gray-400">TMDB ID: {item.tmdb_id}</div>
                    </div>
                  </div>
                )}
                {item.error && (
                  <div className="mt-2 ml-9 text-sm text-red-500">✗ {item.error}</div>
                )}
                {item.status === 'success' && (
                  <div className="mt-2 ml-9 text-sm text-green-500">✓ Importé avec succès</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImport;