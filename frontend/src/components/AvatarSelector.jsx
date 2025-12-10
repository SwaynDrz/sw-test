import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const AvatarSelector = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  const [activeCategory, setActiveCategory] = useState('disney');

  // Bloquer le scroll du body quand la modal est ouverte
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup au démontage
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const avatarCategories = {
    disney: {
      name: '🏰 Disney',
      avatars: [
        { id: 'princess-1', emoji: '👸', name: 'Princesse', color: 'from-pink-400 to-purple-600' },
        { id: 'prince', emoji: '🤴', name: 'Prince', color: 'from-blue-500 to-purple-600' },
        { id: 'fairy', emoji: '🧚', name: 'Fée', color: 'from-pink-300 to-blue-400' },
        { id: 'mermaid', emoji: '🧜‍♀️', name: 'Sirène', color: 'from-cyan-400 to-blue-600' },
        { id: 'elf', emoji: '🧝', name: 'Elfe', color: 'from-green-400 to-emerald-600' },
        { id: 'snowman', emoji: '☃️', name: 'Bonhomme de neige', color: 'from-cyan-200 to-blue-400' },
        { id: 'castle', emoji: '🏰', name: 'Château', color: 'from-purple-400 to-pink-500' },
        { id: 'crown', emoji: '👑', name: 'Couronne', color: 'from-yellow-400 to-amber-600' },
      ]
    },
    marvel: {
      name: '🦸 Marvel',
      avatars: [
        { id: 'superhero-m', emoji: '🦸‍♂️', name: 'Super-héros', color: 'from-red-600 to-blue-700' },
        { id: 'superhero-f', emoji: '🦸‍♀️', name: 'Super-héroïne', color: 'from-red-500 to-purple-600' },
        { id: 'spider', emoji: '🕷️', name: 'Araignée', color: 'from-red-600 to-blue-800' },
        { id: 'shield', emoji: '🛡️', name: 'Bouclier', color: 'from-blue-600 to-red-700' },
        { id: 'hammer', emoji: '🔨', name: 'Marteau', color: 'from-gray-400 to-blue-600' },
        { id: 'lightning-hero', emoji: '⚡', name: 'Éclair', color: 'from-yellow-400 to-red-600' },
        { id: 'green-hero', emoji: '💚', name: 'Hulk', color: 'from-green-500 to-green-800' },
        { id: 'robot-suit', emoji: '🤖', name: 'Armure', color: 'from-red-600 to-yellow-500' },
      ]
    },
    starwars: {
      name: '⭐ Star Wars',
      avatars: [
        { id: 'jedi', emoji: '🧙‍♂️', name: 'Jedi', color: 'from-blue-600 to-green-500' },
        { id: 'sith', emoji: '🧛', name: 'Sith', color: 'from-red-700 to-black' },
        { id: 'robot-sw', emoji: '🤖', name: 'Droïde', color: 'from-gray-300 to-blue-500' },
        { id: 'alien-sw', emoji: '👽', name: 'Alien', color: 'from-green-400 to-blue-600' },
        { id: 'lightsaber-blue', emoji: '⚔️', name: 'Sabre laser', color: 'from-blue-400 to-cyan-600' },
        { id: 'spaceship', emoji: '🚀', name: 'Vaisseau', color: 'from-gray-600 to-blue-700' },
        { id: 'planet-sw', emoji: '🪐', name: 'Planète', color: 'from-purple-500 to-blue-700' },
        { id: 'death-star', emoji: '⚫', name: 'Étoile noire', color: 'from-gray-700 to-black' },
      ]
    },
    pixar: {
      name: '💡 Pixar',
      avatars: [
        { id: 'toy-car', emoji: '🚗', name: 'Voiture', color: 'from-red-500 to-[#c50812]' },
        { id: 'fish', emoji: '🐠', name: 'Poisson', color: 'from-[#e50914] to-blue-500' },
        { id: 'monster-1', emoji: '👹', name: 'Monstre', color: 'from-blue-500 to-purple-700' },
        { id: 'monster-2', emoji: '👺', name: 'Monstre rouge', color: 'from-red-500 to-[#c50812]' },
        { id: 'robot-pixar', emoji: '🤖', name: 'Robot', color: 'from-gray-400 to-blue-500' },
        { id: 'lamp', emoji: '💡', name: 'Lampe', color: 'from-yellow-300 to-white' },
        { id: 'balloon', emoji: '🎈', name: 'Ballon', color: 'from-red-400 to-pink-600' },
        { id: 'house', emoji: '🏠', name: 'Maison', color: 'from-blue-400 to-green-500' },
      ]
    },
    simpsons: {
      name: '📺 Les Simpsons',
      avatars: [
        { id: 'yellow-m', emoji: '👨', name: 'Homme', color: 'from-yellow-400 to-[#e50914]' },
        { id: 'yellow-f', emoji: '👩', name: 'Femme', color: 'from-yellow-400 to-blue-500' },
        { id: 'yellow-boy', emoji: '👦', name: 'Garçon', color: 'from-yellow-400 to-[#c50812]' },
        { id: 'yellow-girl', emoji: '👧', name: 'Fille', color: 'from-yellow-400 to-red-500' },
        { id: 'yellow-baby', emoji: '👶', name: 'Bébé', color: 'from-yellow-300 to-blue-400' },
        { id: 'donut', emoji: '🍩', name: 'Donut', color: 'from-pink-400 to-yellow-500' },
        { id: 'tv', emoji: '📺', name: 'TV', color: 'from-blue-400 to-purple-600' },
      ]
    },
    anime: {
      name: '🎌 Anime',
      avatars: [
        { id: 'ninja', emoji: '🥷', name: 'Ninja', color: 'from-[#e50914] to-blue-700' },
        { id: 'samurai', emoji: '⚔️', name: 'Samouraï', color: 'from-red-600 to-gray-800' },
        { id: 'detective', emoji: '🕵️', name: 'Détective', color: 'from-blue-600 to-gray-700' },
        { id: 'student', emoji: '👨‍🎓', name: 'Étudiant', color: 'from-blue-500 to-purple-600' },
        { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirate', color: 'from-black to-red-700' },
        { id: 'dragon-ball', emoji: '🐉', name: 'Dragon', color: 'from-[#e50914] to-green-600' },
        { id: 'pokeball', emoji: '⚪', name: 'Pokéball', color: 'from-red-500 to-white' },
        { id: 'japan-flag', emoji: '🎌', name: 'Drapeau', color: 'from-white to-red-600' },
      ]
    },
    halloween: {
      name: '🎃 Halloween',
      avatars: [
        { id: 'pumpkin', emoji: '🎃', name: 'Citrouille', color: 'from-[#e50914] to-red-600' },
        { id: 'ghost', emoji: '👻', name: 'Fantôme', color: 'from-gray-300 to-gray-500' },
        { id: 'vampire', emoji: '🧛', name: 'Vampire', color: 'from-red-700 to-purple-900' },
        { id: 'witch', emoji: '🧙', name: 'Sorcière', color: 'from-purple-600 to-purple-900' },
        { id: 'zombie', emoji: '🧟', name: 'Zombie', color: 'from-green-700 to-gray-800' },
        { id: 'skull', emoji: '💀', name: 'Crâne', color: 'from-gray-200 to-gray-600' },
        { id: 'bat', emoji: '🦇', name: 'Chauve-souris', color: 'from-gray-800 to-black' },
        { id: 'demon', emoji: '😈', name: 'Démon', color: 'from-red-600 to-red-900' },
      ]
    },
    gaming: {
      name: '🎮 Gaming',
      avatars: [
        { id: 'controller', emoji: '🎮', name: 'Manette', color: 'from-blue-500 to-purple-600' },
        { id: 'mushroom', emoji: '🍄', name: 'Champignon', color: 'from-red-500 to-white' },
        { id: 'coin', emoji: '🪙', name: 'Pièce', color: 'from-yellow-400 to-[#c50812]' },
        { id: 'star-power', emoji: '⭐', name: 'Étoile', color: 'from-yellow-300 to-yellow-600' },
        { id: 'sword', emoji: '⚔️', name: 'Épée', color: 'from-gray-400 to-blue-600' },
        { id: 'joystick', emoji: '🕹️', name: 'Joystick', color: 'from-red-500 to-black' },
        { id: 'trophy-game', emoji: '🏆', name: 'Trophée', color: 'from-yellow-400 to-amber-700' },
      ]
    },
  };

  const currentAvatars = avatarCategories[activeCategory].avatars;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1b] rounded-3xl border border-gray-800 max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1b] border-b border-gray-800 p-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold">
            Choisir un Avatar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Categories - Scrollable horizontalement */}
        <div className="bg-[#1a1a1b] border-b border-gray-800 p-4 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {Object.keys(avatarCategories).map((categoryKey) => (
              <button
                key={categoryKey}
                onClick={() => setActiveCategory(categoryKey)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 font-semibold ${
                  activeCategory === categoryKey
                    ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {avatarCategories[categoryKey].name}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Grid - Tout visible sans scroll */}
        <div className="flex-1 p-6 flex flex-col min-h-0">
          <h3 className="text-xl font-bold mb-4 text-[#e50914] flex-shrink-0">
            {avatarCategories[activeCategory].name}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 flex-1 content-start">
            {currentAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => {
                  onSelect(avatar);
                  onClose();
                }}
                className={`aspect-square rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-3xl sm:text-4xl transition-all hover:scale-110 hover:shadow-xl hover:shadow-[#e50914]/30 ${
                  currentAvatar?.id === avatar.id ? 'ring-4 ring-[#e50914] scale-105' : ''
                }`}
                title={avatar.name}
              >
                {avatar.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1a1b] border-t border-gray-800 p-4 flex-shrink-0">
          <p className="text-center text-gray-400 text-sm">
            {currentAvatars.length} avatars dans {avatarCategories[activeCategory].name}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
