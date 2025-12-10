import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import { ArrowLeft, Link2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const URLMigration = () => {
  const navigate = useNavigate();
  const [oldPattern, setOldPattern] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handlePreview = async () => {
    if (!oldPattern || !newPattern) {
      toast.error('Veuillez remplir les deux champs');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/admin/url-migration/preview', {
        old_pattern: oldPattern,
        new_pattern: newPattern
      });
      setPreviewData(response.data);
      
      if (response.data.total_count === 0) {
        toast.info('Aucun contenu trouvé avec ce pattern');
      } else {
        toast.success(`${response.data.total_count} éléments trouvés`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la prévisualisation');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!previewData || previewData.total_count === 0) {
      toast.error('Aucun élément à migrer');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ATTENTION - Action irréversible!\n\n` +
      `Vous allez modifier:\n` +
      `- ${previewData.movies_count} films\n` +
      `- ${previewData.episodes_count} épisodes\n\n` +
      `Total: ${previewData.total_count} éléments\n\n` +
      `Voulez-vous vraiment continuer?`
    );

    if (!confirmed) return;

    setMigrating(true);
    try {
      const response = await axiosInstance.post('/admin/url-migration/execute', {
        old_pattern: oldPattern,
        new_pattern: newPattern
      });
      
      toast.success(response.data.message);
      
      // Réinitialiser le formulaire
      setOldPattern('');
      setNewPattern('');
      setPreviewData(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la migration');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a1b]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="text-white hover:text-[#e50914]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <Link2 className="h-8 w-8 text-[#e50914]" />
                  Migration d'URLs
                </h1>
                <p className="text-sm text-gray-400 mt-1">Remplacer les URLs de vos contenus en masse</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-500 mb-1">⚠️ Action irréversible</h3>
            <p className="text-sm text-gray-300">
              Cette action modifiera les URLs de tous les films et épisodes correspondants. 
              Prévisualisez toujours avant d'exécuter la migration.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6 mb-8">
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">Ancien pattern d'URL</Label>
              <Input
                type="text"
                placeholder="Ex: https://cinecake.xyz"
                value={oldPattern}
                onChange={(e) => setOldPattern(e.target.value)}
                className="bg-[#0f0f10] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Le début de l'URL à remplacer (ex: https://ancien-serveur.com)
              </p>
            </div>

            <div>
              <Label className="text-white mb-2 block">Nouveau pattern d'URL</Label>
              <Input
                type="text"
                placeholder="Ex: https://nouveau-serveur.com"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                className="bg-[#0f0f10] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Le nouveau début d'URL qui remplacera l'ancien
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handlePreview}
                disabled={loading || !oldPattern || !newPattern}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Prévisualiser'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Results */}
        {previewData && previewData.total_count > 0 && (
          <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Prévisualisation
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0f0f10] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-[#e50914]">{previewData.movies_count}</div>
                <div className="text-sm text-gray-400">Films</div>
              </div>
              <div className="bg-[#0f0f10] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-[#e50914]">{previewData.episodes_count}</div>
                <div className="text-sm text-gray-400">Épisodes</div>
              </div>
              <div className="bg-[#0f0f10] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-500">{previewData.total_count}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
            </div>

            {/* Sample URLs */}
            {previewData.sample_movies.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Exemple de films:</h4>
                <div className="space-y-2">
                  {previewData.sample_movies.map((movie, index) => (
                    <div key={index} className="bg-[#0f0f10] rounded p-3 text-xs">
                      <div className="font-semibold text-white mb-1">{movie.title}</div>
                      <div className="text-red-400 mb-1">❌ {movie.old_url}</div>
                      <div className="text-green-400">✅ {movie.new_url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewData.sample_episodes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Exemple d'épisodes:</h4>
                <div className="space-y-2">
                  {previewData.sample_episodes.map((episode, index) => (
                    <div key={index} className="bg-[#0f0f10] rounded p-3 text-xs">
                      <div className="font-semibold text-white mb-1">{episode.title}</div>
                      <div className="text-red-400 mb-1">❌ {episode.old_url}</div>
                      <div className="text-green-400">✅ {episode.new_url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Migrate Button */}
            <Button
              onClick={handleMigrate}
              disabled={migrating}
              className="w-full bg-[#e50914] hover:bg-[#c50812] text-lg py-6"
            >
              {migrating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Migration en cours...
                </>
              ) : (
                <>
                  🚀 Lancer la migration ({previewData.total_count} éléments)
                </>
              )}
            </Button>
          </div>
        )}

        {/* No results */}
        {previewData && previewData.total_count === 0 && (
          <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun contenu ne commence par ce pattern</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default URLMigration;
