import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { Lock, Check, AlertCircle } from 'lucide-react';

export default function ForcePasswordChange() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Minimum 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      if (res.data.token) {
        localStorage.setItem('solidata_token', res.data.token);
        localStorage.setItem('solidata_user', JSON.stringify(res.data.user));
        updateUser(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soltex-green to-soltex-green-dark p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Changement de mot de passe</h1>
          <p className="text-gray-500 mt-2">
            Bonjour {user?.firstName}, vous devez changer votre mot de passe temporaire avant de continuer.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel (temporaire)</label>
            <input
              type="password"
              required
              value={form.currentPassword}
              onChange={e => setForm({...form, currentPassword: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-lg"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              value={form.newPassword}
              onChange={e => setForm({...form, newPassword: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-lg"
              placeholder="6 caractères minimum"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={e => setForm({...form, confirmPassword: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-lg"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-soltex-green hover:bg-soltex-green-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-lg"
          >
            <Check className="w-5 h-5" />
            {loading ? 'Enregistrement...' : 'Valider mon nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
