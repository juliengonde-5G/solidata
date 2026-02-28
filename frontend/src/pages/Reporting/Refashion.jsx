import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { FileDown, Check, RefreshCw, FileSpreadsheet } from 'lucide-react';

const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  valide: { label: 'Validé', color: 'bg-green-100 text-green-700' },
  transmis: { label: 'Transmis', color: 'bg-blue-100 text-blue-700' }
};

export default function Refashion() {
  const [declarations, setDeclarations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({
    year: new Date().getFullYear(),
    semester: 'S1'
  });
  const [genMonthForm, setGenMonthForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const fetchData = async () => {
    try {
      const [declRes, repRes] = await Promise.all([
        api.get('/reporting/refashion'),
        api.get('/reporting/reports')
      ]);
      setDeclarations(declRes.data);
      setReports(repRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const generateMonthlyReport = async () => {
    setGenerating(true);
    try {
      await api.post('/reporting/reports/generate', genMonthForm);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setGenerating(false);
    }
  };

  const generateDeclaration = async () => {
    setGenerating(true);
    try {
      await api.post('/reporting/refashion/generate', genForm);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = async (id) => {
    try {
      const response = await api.get(`/reporting/refashion/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `refashion_${id}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      fetchData();
    } catch (err) {
      alert('Erreur export');
    }
  };

  const validateReport = async (id) => {
    try {
      await api.put(`/reporting/reports/${id}/validate`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Conformité Refashion</h1>

      {/* Génération rapports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Rapport mensuel</h2>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-gray-500">Année</label>
              <input type="number" value={genMonthForm.year} onChange={e => setGenMonthForm({...genMonthForm, year: parseInt(e.target.value)})} className="border rounded px-2 py-1 w-20 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Mois</label>
              <select value={genMonthForm.month} onChange={e => setGenMonthForm({...genMonthForm, month: parseInt(e.target.value)})} className="border rounded px-2 py-1 text-sm">
                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
            <button onClick={generateMonthlyReport} disabled={generating} className="bg-soltex-green text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} /> Générer
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Déclaration semestrielle</h2>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-gray-500">Année</label>
              <input type="number" value={genForm.year} onChange={e => setGenForm({...genForm, year: parseInt(e.target.value)})} className="border rounded px-2 py-1 w-20 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Semestre</label>
              <select value={genForm.semester} onChange={e => setGenForm({...genForm, semester: e.target.value})} className="border rounded px-2 py-1 text-sm">
                <option value="S1">S1</option>
                <option value="S2">S2</option>
              </select>
            </div>
            <button onClick={generateDeclaration} disabled={generating} className="bg-soltex-green text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} /> Générer
            </button>
          </div>
        </div>
      </div>

      {/* Déclarations Refashion */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-soltex-green" /> Déclarations Refashion
        </h2>
        {declarations.length === 0 ? (
          <p className="text-center text-gray-400 py-4">Aucune déclaration générée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-semibold text-gray-600">Période</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Tonnage</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Réemploi</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Recyclage</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Val. énergie</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Déchets</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Salariés</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Heures</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {declarations.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm font-medium text-gray-700">{d.year} {d.semester}</td>
                    <td className="p-2 text-sm text-right text-gray-600">{d.totalTonnage?.toFixed(2)} t</td>
                    <td className="p-2 text-sm text-right text-green-600">{d.reuseTonnage?.toFixed(2)} t</td>
                    <td className="p-2 text-sm text-right text-blue-600">{d.recycleTonnage?.toFixed(2)} t</td>
                    <td className="p-2 text-sm text-right text-orange-600">{d.energyRecoveryTonnage?.toFixed(2)} t</td>
                    <td className="p-2 text-sm text-right text-red-600">{d.wasteTonnage?.toFixed(2)} t</td>
                    <td className="p-2 text-sm text-center text-gray-600">{d.numberOfEmployees}</td>
                    <td className="p-2 text-sm text-center text-gray-600">{d.numberOfInsertionHours?.toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[d.status]?.color}`}>{STATUS_CONFIG[d.status]?.label}</span>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => exportCSV(d.id)} className="text-soltex-green hover:text-soltex-green/80" title="Exporter CSV">
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rapports mensuels */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Rapports mensuels</h2>
        {reports.length === 0 ? (
          <p className="text-center text-gray-400 py-4">Aucun rapport</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-semibold text-gray-600">Période</th>
                  <th className="text-left p-2 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Poids</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Collectes</th>
                  <th className="text-right p-2 text-sm font-semibold text-gray-600">Points</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="text-center p-2 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm font-medium text-gray-700">{r.period}</td>
                    <td className="p-2 text-sm text-gray-600">{r.periodType}</td>
                    <td className="p-2 text-sm text-right text-gray-600">{(r.totalWeightKg / 1000).toFixed(2)} t</td>
                    <td className="p-2 text-sm text-right text-gray-600">{r.totalCollections}</td>
                    <td className="p-2 text-sm text-right text-gray-600">{r.totalPoints}</td>
                    <td className="p-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[r.status]?.color}`}>{STATUS_CONFIG[r.status]?.label}</span>
                    </td>
                    <td className="p-2 text-center">
                      {r.status === 'brouillon' && (
                        <button onClick={() => validateReport(r.id)} className="text-green-600 hover:text-green-700" title="Valider">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
