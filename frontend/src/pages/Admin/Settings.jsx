import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Save, RefreshCw, Database, Settings as SettingsIcon } from 'lucide-react';

const CATEGORY_LABELS = {
  general: 'Général',
  equipes: 'Équipes',
  collecte: 'Collecte',
  reporting: 'Reporting',
  email: 'Email',
  securite: 'Sécurité'
};

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [dbStats, setDbStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState('settings');
  const [initializing, setInitializing] = useState(false);

  const fetchData = async () => {
    try {
      const [settingsRes, dbRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/settings/db/stats')
      ]);
      setSettings(settingsRes.data);
      setDbStats(dbRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const initSettings = async () => {
    setInitializing(true);
    try {
      const res = await api.post('/admin/settings/init');
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert('Erreur initialisation');
    } finally {
      setInitializing(false);
    }
  };

  const saveSetting = async (key, value) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await api.put(`/admin/settings/${key}`, { value });
    } catch (err) {
      alert('Erreur sauvegarde');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const updateLocalSetting = (key, value) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const groupedSettings = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Administration</h1>
        <button onClick={initSettings} disabled={initializing} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${initializing ? 'animate-spin' : ''}`} /> Initialiser les paramètres
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'settings' ? 'bg-soltex-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <SettingsIcon className="w-4 h-4" /> Paramètres
        </button>
        <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'database' ? 'bg-soltex-green text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <Database className="w-4 h-4" /> Base de données
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {settings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500 mb-4">Aucun paramètre configuré</p>
              <button onClick={initSettings} className="bg-soltex-green text-white px-6 py-2 rounded-lg">Initialiser les paramètres par défaut</button>
            </div>
          ) : (
            Object.entries(groupedSettings).map(([category, items]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">{CATEGORY_LABELS[category] || category}</h2>
                <div className="space-y-4">
                  {items.map(s => (
                    <div key={s.key} className="flex items-start gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">{s.label || s.key}</label>
                        {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 w-80">
                        {s.type === 'boolean' ? (
                          <select
                            value={s.value}
                            onChange={e => { updateLocalSetting(s.key, e.target.value); saveSetting(s.key, e.target.value); }}
                            className="border rounded-lg px-3 py-2 w-full text-sm"
                          >
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                          </select>
                        ) : (
                          <input
                            type={s.type === 'number' ? 'number' : 'text'}
                            value={s.value || ''}
                            onChange={e => updateLocalSetting(s.key, e.target.value)}
                            className="border rounded-lg px-3 py-2 w-full text-sm"
                          />
                        )}
                        <button
                          onClick={() => saveSetting(s.key, s.value)}
                          disabled={saving[s.key]}
                          className="p-2 text-soltex-green hover:bg-soltex-green/10 rounded-lg disabled:opacity-50"
                          title="Sauvegarder"
                        >
                          <Save className={`w-4 h-4 ${saving[s.key] ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'database' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tables de la base de données</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-sm font-semibold text-gray-600">Table</th>
                <th className="text-right p-2 text-sm font-semibold text-gray-600">Lignes</th>
                <th className="text-right p-2 text-sm font-semibold text-gray-600">Taille</th>
              </tr>
            </thead>
            <tbody>
              {dbStats.map(t => (
                <tr key={t.tablename} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-sm font-medium text-gray-700">{t.tablename}</td>
                  <td className="p-2 text-sm text-right text-gray-600">{t.row_count}</td>
                  <td className="p-2 text-sm text-right text-gray-600">{t.size}</td>
                </tr>
              ))}
              {dbStats.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400">Aucune donnée</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
