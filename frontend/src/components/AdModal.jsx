import React, { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';

const AdModal = ({ isOpen, onClose, onAdClick }) => {
  const [loading, setLoading] = useState(false);
  
  const handleAdClick = () => {
    setLoading(true);
    onAdClick();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-red-500 rounded-2xl max-w-md w-full mx-4 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {!loading ? (
          <>
            {/* Icône */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-500/20 rounded-full p-4">
                <PlayCircle className="w-16 h-16 text-red-500" />
              </div>
            </div>

            {/* Titre */}
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              📢 Publicité Requise
            </h2>

            {/* Message */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
              <p className="text-white text-center leading-relaxed">
                Pour accéder à ce contenu <span className="font-bold text-green-400">gratuitement</span>, veuillez visionner une courte publicité.
              </p>
              <p className="text-gray-400 text-sm text-center mt-3">
                Les publicités nous permettent de maintenir ce service gratuit pour vous.
              </p>
            </div>

            {/* Bouton Voir la Pub */}
            <button
              onClick={handleAdClick}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg mb-4"
            >
              🎬 Voir la Publicité
            </button>

            {/* Alternative Premium */}
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 text-center">
              <p className="text-gray-300 text-sm mb-2">
                Ou passez à <span className="font-bold text-blue-400">Premium</span> pour regarder sans pub
              </p>
              <button
                onClick={() => window.location.href = '/subscriptions'}
                className="text-blue-400 hover:text-blue-300 text-sm font-semibold underline"
              >
                Découvrir Premium (3.99€/mois)
              </button>
            </div>

            {/* Bouton Fermer (annuler) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            {/* État de chargement - Attente pub */}
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                📺 Publicité en cours...
              </h2>
              
              <p className="text-gray-300 text-center mb-2">
                La publicité va s'ouvrir dans un nouvel onglet
              </p>
              <p className="text-gray-400 text-sm text-center">
                Chargement du contenu...
              </p>
              
              <div className="mt-6 flex gap-2 justify-center">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdModal;
