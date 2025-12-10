import React, { useState } from 'react';
import { Check, Crown, Star, Zap, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Subscriptions = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'gratuit',
      name: 'GRATUIT',
      price: '0€',
      period: '/mois',
      description: 'Pour commencer votre aventure streaming',
      icon: Star,
      color: 'gray',
      borderColor: 'border-gray-600',
      bgColor: 'bg-gray-600/10',
      hoverColor: 'hover:border-gray-400',
      features: [
        { text: 'Tous les films en illimité', available: true },
        { text: 'Qualité Full HD', available: true },
        { text: 'Accès à la Watch Party uniquement pour les films ', available: true },
        { text: 'Pas de séries', available: false },
        { text: 'Pas de contenu exclusif', available: false },
      ],
      watchPartyWarning: 'La création de la Watch Party est réservée uniquement aux PREMIUM/VIP.',
    },
    {
      id: 'premium',
      name: 'PREMIUM',
      price: '3.99€',
      period: '/mois',
      description: 'Le meilleur rapport qualité/prix',
      icon: Zap,
      color: 'red',
      borderColor: 'border-[#e50914]',
      bgColor: 'bg-[#e50914]/10',
      hoverColor: 'hover:border-[#e50914]',
      recommended: true,
      features: [
        { text: 'Tout du gratuit', available: true },
        { text: 'Toutes les séries', available: true },
        { text: 'Qualité Full HD', available: true },
        { text: 'Support prioritaire 24/7', available: true },
        { text: 'Demande d\'ajout films/séries', available: true },
      ],
    },
    {
      id: 'vip',
      name: 'VIP',
      price: '4.99€',
      period: '/mois',
      description: 'L\'expérience ultime',
      icon: Crown,
      color: 'yellow',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-500/10',
      hoverColor: 'hover:border-yellow-400',
      features: [
        { text: 'Tout du premium', available: true },
        { text: 'Toutes les séries', available: true },
        { text: 'Qualité Full HD', available: true },
        { text: 'Accès anticipé', available: true },
        { text: 'Support prioritaire 24/7', available: true },
        { text: 'Demande d\'ajout films/séries', available: true },
      ],
    },
  ];

  const handleSelectPlan = (planId) => {
    // Si c'est le plan gratuit, pas d'action nécessaire
    if (planId === 'gratuit') {
      toast.info('Vous avez déjà accès au plan gratuit !');
      return;
    }

    // Si l'utilisateur a déjà cet abonnement
    if (user && user.subscription === planId) {
      toast.info('Vous possédez déjà cet abonnement !');
      return;
    }

    // Rediriger vers Discord pour tous les autres plans
    window.open('https://discord.gg/vQz894Zdft', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <Navbar />
      
      <div className="pt-32 pb-20 px-8 max-w-[1400px] mx-auto">
        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 ${plan.borderColor} ${plan.bgColor} p-8 transition-all duration-300 ${plan.hoverColor} ${
                  isSelected ? 'shadow-2xl ring-2 ring-white/50' : ''
                } flex flex-col min-h-[600px]`}
              >
                {/* Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-[#e50914] text-white px-4 py-1 rounded-full text-sm font-bold">
                      LE PLUS VENDU
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className={`relative p-5 rounded-2xl ${plan.bgColor} border-2 ${plan.borderColor} shadow-2xl ${
                    plan.color === 'red' ? 'shadow-[#e50914]/30' : 
                    plan.color === 'yellow' ? 'shadow-yellow-500/30' : 
                    'shadow-gray-500/20'
                  }`}>
                    <Icon className={`h-10 w-10 ${
                      plan.color === 'red' ? 'text-[#e50914]' : 
                      plan.color === 'yellow' ? 'text-yellow-400' : 
                      'text-gray-300'
                    } ${plan.color !== 'gray' ? 'drop-shadow-lg' : ''}`} />
                    {plan.recommended && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#e50914] to-[#c50812] rounded-full flex items-center justify-center shadow-lg shadow-[#e50914]/50 animate-pulse">
                        <Star className="h-3 w-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Name */}
                <h2 className="text-3xl font-bold text-center mb-2">{plan.name}</h2>
                
                {/* Description */}
                <p className="text-gray-400 text-center mb-6 min-h-[50px]">{plan.description}</p>

                {/* Price */}
                <div className="text-center mb-8">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-lg">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {feature.available ? (
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          plan.color === 'red' ? 'text-[#e50914]' : 
                          plan.color === 'yellow' ? 'text-yellow-500' : 
                          'text-gray-400'
                        }`} />
                      ) : (
                        <X className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" />
                      )}
                      <span className={`${feature.available ? 'text-gray-300' : 'text-gray-500 line-through'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Message d'avertissement pour le plan gratuit */}
                {plan.watchPartyWarning && (
                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400 font-semibold text-center">
                      ⚠️ {plan.watchPartyWarning}
                    </p>
                  </div>
                )}

                {/* CTA Button */}
                {user && user.subscription === plan.id ? (
                  <Button
                    disabled
                    className="w-full py-6 text-lg font-bold bg-green-600 hover:bg-green-600 text-white flex items-center justify-center gap-3 cursor-default"
                  >
                    <Check className="w-6 h-6" />
                    VOUS POSSÉDEZ CE PACK
                  </Button>
                ) : plan.id === 'gratuit' ? (
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full py-6 text-lg font-bold bg-gray-700 hover:bg-gray-600 transition-all flex items-center justify-center gap-3"
                  >
                    <Check className="w-6 h-6" />
                    PLAN ACTUEL
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={!user}
                    className={`w-full py-6 text-lg font-bold transition-all flex items-center justify-center gap-3 ${
                      plan.color === 'red'
                        ? 'bg-[#e50914] hover:bg-[#c50812]'
                        : plan.color === 'yellow'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <Crown className="w-6 h-6" />
                    {user ? 'SOUSCRIRE' : 'SE CONNECTER'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Paiement sécurisé • Résiliation facile • Support 24/7</p>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
