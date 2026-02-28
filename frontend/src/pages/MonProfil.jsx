import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { User, Mail, Phone, Shield, Users, Lock, Check, AlertCircle } from 'lucide-react';

const TEAM_LABELS = {
  tri: 'Tri',
  collecte: 'Collecte',
  magasin_lhopital: "Magasin L'Hôpital",
  magasin_st_sever: 'Magasin St Sever',
  magasin_vernon: 'Magasin Vernon',
  administration: 'Administration',
};

const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Manager',
  collaborateur: 'Collaborateur',
  rh: 'Ressources Humaines'
};

export default function MonProfil() {
  const { user, login } = useAuth();
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Minimum 6 caractères');
      return;
    }

    try {
      const res = await api.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      // Mettre à jour le token
      if (res.data.token) {
        localStorage.setItem('solidata_token', res.data.token);
        localStorage.setItem('solidata_user', JSON.stringify(res.data.user));
      }
      setPwSuccess('Mot de passe modifié avec succès');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Mon profil</h1>

      {/* Carte profil — gros et visuel */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-3" style={{ backgroundColor: user?.avatarColor || '#7AB51D' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{user?.firstName} {user?.lastName}</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Mail className="w-6 h-6 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Email</p>
              <p className="text-lg text-gray-700">{user?.email}</p>
            </div>
          </div>

          {user?.phone && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Phone className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Téléphone</p>
                <p className="text-lg text-gray-700">{user?.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Shield className="w-6 h-6 text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Rôle</p>
              <p className="text-lg text-gray-700">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
          </div>

          {user?.team && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Users className="w-6 h-6 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Équipe</p>
                <p className="text-lg text-gray-700">{TEAM_LABELS[user?.team] || user?.team}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Changement de mot de passe */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <button onClick={() => setShowPwForm(!showPwForm)} className="flex items-center gap-3 text-lg font-semibold text-gray-700 w-full">
          <Lock className="w-6 h-6 text-gray-400" />
          Changer mon mot de passe
        </button>

        {pwSuccess && (
          <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" /> {pwSuccess}
          </div>
        )}

        {showPwForm && (
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
            {pwError && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" /> {pwError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Mot de passe actuel</label>
              <input type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} className="w-full border rounded-xl px-4 py-3 text-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Nouveau mot de passe</label>
              <input type="password" required value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} className="w-full border rounded-xl px-4 py-3 text-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Confirmer le nouveau mot de passe</label>
              <input type="password" required value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} className="w-full border rounded-xl px-4 py-3 text-lg" />
            </div>
            <button type="submit" className="w-full bg-soltex-green text-white py-3 rounded-xl text-lg font-semibold flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Enregistrer
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
