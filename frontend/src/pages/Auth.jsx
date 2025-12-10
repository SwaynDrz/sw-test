import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Première étape : login avec email/password
        const response = await login(formData.email, formData.password);
        
        // Si l'utilisateur a la 2FA activée, on demande le code
        if (response?.requires_2fa) {
          setNeeds2FA(true);
          setTempToken(response.temp_token);
          toast.info('Entrez votre code 2FA');
          setLoading(false);
          return;
        }
        
        toast.success('Connexion réussie !');
        navigate('/');
      } else {
        if (!formData.username) {
          toast.error('Le nom d\'utilisateur est requis');
          setLoading(false);
          return;
        }
        await register(formData.email, formData.username, formData.password);
        toast.success('Compte créé avec succès !');
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Une erreur est survenue';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Vérifier le code 2FA et finaliser la connexion
      await login(formData.email, formData.password, twoFACode);
      toast.success('Connexion réussie !');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Code 2FA invalide';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f10] px-4" data-testid="auth-page">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1574267432644-f71db2c2605a?q=80&w=2000)',
        }}
      />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1b] rounded-lg p-8 border border-gray-800 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold text-[#e50914] mb-2"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              SW STREAMING
            </h1>
            <p className="text-gray-400">{isLogin ? 'Connexion' : 'Créer un compte'}</p>
          </div>

          {/* Form */}
          {!needs2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="bg-[#0f0f10] border-gray-700 mt-1"
                    data-testid="username-input"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="bg-[#0f0f10] border-gray-700 mt-1"
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="bg-[#0f0f10] border-gray-700 pr-10"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e50914] hover:bg-[#c50812] text-white py-6 text-lg"
                data-testid="submit-btn"
              >
                {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer un compte'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#e50914]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#e50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Double authentification</h3>
                <p className="text-gray-400 text-sm">Entrez le code à 6 chiffres de votre application d'authentification</p>
              </div>

              <div>
                <Label htmlFor="twoFACode">Code de vérification</Label>
                <Input
                  id="twoFACode"
                  name="twoFACode"
                  type="text"
                  placeholder="000000"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="bg-[#0f0f10] border-gray-700 mt-1 text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading || twoFACode.length !== 6}
                className="w-full bg-[#e50914] hover:bg-[#c50812] text-white py-6 text-lg"
              >
                {loading ? 'Vérification...' : 'Vérifier le code'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setNeeds2FA(false);
                  setTwoFACode('');
                  setTempToken('');
                }}
                className="w-full text-gray-400 hover:text-white transition-colors text-sm"
              >
                Retour
              </button>
            </form>
          )}

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 hover:text-white transition-colors"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? (
                <>
                  Pas encore de compte ?{' '}
                  <span className="text-[#e50914] font-semibold">S'inscrire</span>
                </>
              ) : (
                <>
                  Déjà un compte ?{' '}
                  <span className="text-[#e50914] font-semibold">Se connecter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;