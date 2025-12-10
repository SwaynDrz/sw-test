import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldAlert, User, Search, Crown, Star, Zap, ShieldCheck, Users, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import axiosInstance from '../../utils/axios';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user: currentUser, isFounder, isSuperUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updating, setUpdating] = useState({});
  const itemsPerPage = 20; // Pagination: 20 utilisateurs par page
  
  // États pour la modale de changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, subscriptionFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/users', {
        params: {
          page: currentPage,
          per_page: itemsPerPage,
          search: searchQuery || undefined,
          subscription: subscriptionFilter !== 'all' ? subscriptionFilter : undefined
        }
      });
      
      setUsers(response.data.users);
      setTotalPages(response.data.total_pages);
      setTotalUsers(response.data.total);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les utilisateurs (avec useMemo pour optimisation)
  const filteredUsers = useMemo(() => {
    return users; // Les filtres sont maintenant côté serveur
  }, [users]);

  // Pas besoin de pagination frontend, elle est déjà faite côté serveur
  // On utilise directement filteredUsers (qui est en fait users)

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, subscriptionFilter]);

  const toggleRole = async (userId, newRole) => {
    setUpdating(prev => ({ ...prev, [`role-${userId}`]: true }));
    try {
      await axiosInstance.put(`/admin/users/${userId}/role`, null, {
        params: { role: newRole },
      });
      
      // Mise à jour locale (pas de rechargement)
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      toast.success(`Rôle mis à jour vers ${getRoleLabel(newRole)}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setUpdating(prev => ({ ...prev, [`role-${userId}`]: false }));
    }
  };

  const handleChangePassword = async () => {
    // Validations
    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setUpdating(prev => ({ ...prev, [`pwd-${selectedUserId}`]: true }));
    try {
      await axiosInstance.put(`/admin/users/${selectedUserId}/password`, null, {
        params: { new_password: newPassword },
      });
      
      toast.success('Mot de passe changé avec succès');
      
      // Fermer la modale et réinitialiser
      setShowPasswordModal(false);
      setSelectedUserId(null);
      setSelectedUserEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setUpdating(prev => ({ ...prev, [`pwd-${selectedUserId}`]: false }));
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      `⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer définitivement le compte de ${userEmail} ?\n\nCette action est IRRÉVERSIBLE et supprimera toutes les données de l'utilisateur.`
    );
    
    if (!confirmed) return;

    setUpdating(prev => ({ ...prev, [`delete-${userId}`]: true }));
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      
      toast.success(`✅ Compte ${userEmail} supprimé avec succès`);
      
      // Rafraîchir la liste des utilisateurs
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setUpdating(prev => ({ ...prev, [`delete-${userId}`]: false }));
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      'user': 'Utilisateur',
      'admin': 'Administrateur',
      'super_admin': 'Super Admin',
      'co_fondateur': 'Co-Fondateur',
      'fondateur': 'Fondateur'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'fondateur':
        return (
          <Badge className="bg-gradient-to-r from-yellow-500 to-[#e50914] text-black font-bold">
            👑 Fondateur
          </Badge>
        );
      case 'co_fondateur':
        return (
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
            🎖️ Co-Fondateur
          </Badge>
        );
      case 'super_admin':
        return (
          <Badge className="bg-gradient-to-r from-red-600 to-red-800 text-white font-bold">
            ⚡ Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-[#e50914] hover:bg-[#c50812] text-white">
            🛡️ Administrateur
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-700 text-gray-300">
            👤 Utilisateur
          </Badge>
        );
    }
  };

  const updateSubscription = async (userId, newSubscription) => {
    setUpdating(prev => ({ ...prev, [`sub-${userId}`]: true }));
    try {
      await axiosInstance.put(`/admin/users/${userId}/subscription`, null, {
        params: { subscription: newSubscription },
      });
      
      // Mise à jour locale (pas de rechargement)
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, subscription: newSubscription } : user
      ));
      toast.success(`Abonnement mis à jour vers ${newSubscription.toUpperCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour de l\'abonnement');
    } finally {
      setUpdating(prev => ({ ...prev, [`sub-${userId}`]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f10]" data-testid="admin-users-page">
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
                  Gestion des Utilisateurs
                </h1>
                <p className="text-gray-400 text-sm mt-1">Gérez les rôles et permissions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par pseudo ou email..."
              className="pl-12 bg-[#1a1a1b] border-gray-800 text-white h-14 text-lg"
            />
          </div>
          <div className="w-64">
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="bg-[#1a1a1b] border-gray-800 text-white h-14">
                <SelectValue placeholder="Filtrer par abonnement" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1b] border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Tous les abonnements</SelectItem>
                <SelectItem value="gratuit" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Gratuit</SelectItem>
                <SelectItem value="premium" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">Premium</SelectItem>
                <SelectItem value="vip" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        {/* Stats et pagination */}
        <div className="mb-6 flex items-center justify-between text-gray-400">
          <div className="text-sm">
            Affichage de {filteredUsers.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0} à {Math.min(currentPage * itemsPerPage, totalUsers)} sur {totalUsers} utilisateurs
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                className="bg-[#1a1a1b] border-gray-800 hover:bg-gray-900 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-4">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                className="bg-[#1a1a1b] border-gray-800 hover:bg-gray-900 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-24 w-24 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-[#1a1a1b] rounded-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors"
                data-testid={`user-card-${user.id}`}
              >
                {/* Avatar */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{user.username}</h3>
                    <p className="text-sm text-gray-400 break-all">{user.email}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {/* Role Badge */}
                  {getRoleBadge(user.role)}
                  
                  {/* Subscription Badge */}
                  {user.subscription === 'vip' ? (
                    <Badge className="bg-yellow-500 text-black">
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  ) : user.subscription === 'premium' ? (
                    <Badge className="bg-[#e50914] text-white">
                      <Zap className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-700 text-gray-400">
                      <Star className="h-3 w-3 mr-1" />
                      Gratuit
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  <div>Inscrit le {formatDate(user.created_at)}</div>
                  {user.subscription_date && user.subscription !== 'gratuit' && (
                    <div className="text-[#e50914]">
                      Abonné le {formatDate(user.subscription_date)}
                    </div>
                  )}
                </div>

                {/* Subscription Selector */}
                <div className="mb-3">
                  <label className="text-xs text-gray-400 mb-2 block">Abonnement</label>
                  <Select 
                    value={user.subscription || 'gratuit'} 
                    onValueChange={(value) => updateSubscription(user.id, value)}
                    disabled={updating[`sub-${user.id}`]}
                  >
                    <SelectTrigger className="bg-[#0f0f10] border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1b] border-gray-700">
                      <SelectItem value="gratuit" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">⭐ Gratuit</SelectItem>
                      <SelectItem value="premium" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">⚡ Premium</SelectItem>
                      <SelectItem value="vip" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">👑 VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  {updating[`sub-${user.id}`] && (
                    <div className="text-xs text-gray-500 mt-1">Mise à jour...</div>
                  )}
                </div>

                {/* Role Selector - Only for Founder */}
                {isFounder && isFounder() ? (
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-2 block">Rôle</label>
                    <Select 
                      value={user.role} 
                      onValueChange={(value) => toggleRole(user.id, value)}
                      disabled={updating[`role-${user.id}`]}
                    >
                      <SelectTrigger className="bg-[#0f0f10] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1b] border-gray-700">
                        <SelectItem value="user" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">👤 Utilisateur</SelectItem>
                        <SelectItem value="admin" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">🛡️ Administrateur</SelectItem>
                        <SelectItem value="super_admin" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">⚡ Super Admin</SelectItem>
                        <SelectItem value="co_fondateur" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">🎖️ Co-Fondateur</SelectItem>
                        <SelectItem value="fondateur" className="text-white hover:bg-[#e50914]/20 focus:bg-[#e50914]/30 focus:text-white cursor-pointer">👑 Fondateur</SelectItem>
                      </SelectContent>
                    </Select>
                    {updating[`role-${user.id}`] && (
                      <div className="text-xs text-gray-500 mt-1">Mise à jour...</div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-2 block">Rôle</label>
                    <div className="bg-[#0f0f10] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-yellow-500" />
                      <span>{getRoleLabel(user.role)} - Seul le fondateur peut modifier</span>
                    </div>
                  </div>
                )}
                
                {/* Boutons actions - Only for Founder */}
                {isFounder && isFounder() && (
                  <div className="space-y-2 mt-3">
                    <Button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedUserEmail(user.email);
                        setShowPasswordModal(true);
                      }}
                      variant="outline"
                      className="w-full border-[#e50914] text-[#e50914] hover:bg-[#e50914] hover:text-white"
                    >
                      🔑 Changer le mot de passe
                    </Button>
                    
                    <Button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={updating[`delete-${user.id}`]}
                      variant="outline"
                      className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                    >
                      {updating[`delete-${user.id}`] ? (
                        <>⏳ Suppression...</>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer le compte
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modale Changement de Mot de Passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1b] rounded-lg border border-gray-800 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              🔑 Changer le mot de passe
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">
                Utilisateur : <span className="text-white font-semibold">{selectedUserEmail}</span>
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Nouveau mot de passe</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="bg-[#0f0f10] border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Confirmer le mot de passe</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  className="bg-[#0f0f10] border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUserId(null);
                  setSelectedUserEmail('');
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
                className="flex-1 bg-[#e50914] hover:bg-[#c50812] text-white"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
