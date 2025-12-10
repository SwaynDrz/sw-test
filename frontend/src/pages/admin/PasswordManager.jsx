import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Search, Shield } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import axiosInstance from '../../utils/axios';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const PasswordManager = () => {
  const navigate = useNavigate();
  const { isFounder } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // Rediriger si pas fondateur
  useEffect(() => {
    if (!isFounder || !isFounder()) {
      navigate('/admin/dashboard');
      toast.error('Accès refusé - Réservé aux fondateurs');
    }
  }, [isFounder, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/users', {
        params: { page: 1, per_page: 50000 }
      });
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChangePassword = async () => {
    if (!selectedUser) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setUpdating(true);
      await axiosInstance.put(`/admin/users/${selectedUser.id}/password`, null, {
        params: { new_password: newPassword }
      });

      toast.success(`Mot de passe changé pour ${selectedUser.email}`);
      
      // Réinitialiser
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      fondateur: 'bg-gradient-to-r from-yellow-500 to-[#e50914] text-black',
      co_fondateur: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
      super_admin: 'bg-gradient-to-r from-red-600 to-red-800 text-white',
      admin: 'bg-[#e50914] text-white',
      user: 'bg-gray-700 text-white'
    };

    const roleLabels = {
      fondateur: '👑 Fondateur',
      co_fondateur: '🎖️ Co-Fondateur',
      super_admin: '⚡ Super Admin',
      admin: '🛡️ Admin',
      user: '👤 Utilisateur'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${roleColors[role] || roleColors.user}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a1a1b] border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/admin/dashboard')}
                variant="ghost"
                className="text-white hover:text-[#e50914]"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Retour
              </Button>
              <div className="flex items-center gap-3">
                <Key className="h-8 w-8 text-[#e50914]" />
                <div>
                  <h1 className="text-2xl font-bold">Gestion des Mots de Passe</h1>
                  <p className="text-sm text-gray-400">Réservé aux fondateurs uniquement</p>
                </div>
              </div>
            </div>
            <Shield className="h-10 w-10 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des utilisateurs */}
          <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-[#e50914]" />
              Sélectionner un utilisateur
            </h2>

            {/* Barre de recherche */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Rechercher par email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0f0f10] border-gray-700 text-white"
              />
            </div>

            {/* Liste */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucun utilisateur trouvé</p>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedUser?.id === user.id
                        ? 'bg-[#e50914] border-[#e50914] text-white'
                        : 'bg-[#0f0f10] border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{user.email}</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {user.id.substring(0, 8)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulaire de changement */}
          <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-[#e50914]" />
              Changer le mot de passe
            </h2>

            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Shield className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-center">Sélectionnez un utilisateur<br />dans la liste de gauche</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info utilisateur sélectionné */}
                <div className="bg-[#0f0f10] rounded-lg p-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Utilisateur sélectionné :</p>
                  <p className="text-lg font-semibold text-white mb-2">{selectedUser.email}</p>
                  {getRoleBadge(selectedUser.role)}
                </div>

                {/* Nouveau mot de passe */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Nouveau mot de passe
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="bg-[#0f0f10] border-gray-700 text-white"
                  />
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    className="bg-[#0f0f10] border-gray-700 text-white"
                  />
                </div>

                {/* Validation visuelle */}
                {newPassword && (
                  <div className="space-y-2 text-sm">
                    <div className={newPassword.length >= 6 ? 'text-green-500' : 'text-red-500'}>
                      {newPassword.length >= 6 ? '✓' : '✗'} Au moins 6 caractères
                    </div>
                    {confirmPassword && (
                      <div className={newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'}>
                        {newPassword === confirmPassword ? '✓' : '✗'} Les mots de passe correspondent
                      </div>
                    )}
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setSelectedUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={updating || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="flex-1 bg-[#e50914] hover:bg-[#c50812] text-white disabled:opacity-50"
                  >
                    {updating ? 'Changement...' : 'Confirmer le changement'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Avertissement */}
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200">
              <strong>Attention :</strong> Cette fonctionnalité est réservée aux fondateurs. 
              Le changement de mot de passe est immédiat et irréversible. 
              L'utilisateur devra se reconnecter avec son nouveau mot de passe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordManager;
