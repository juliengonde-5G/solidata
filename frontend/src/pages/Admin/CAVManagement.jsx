import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';
import {
  MapPin, Plus, Edit2, Trash2, X, Search, XCircle,
  AlertTriangle, CheckCircle, Eye, EyeOff, Filter, QrCode, Printer
} from 'lucide-react';

const TYPE_LABELS = {
  cav: { label: 'CAV', color: 'bg-green-100 text-green-700' },
  decheterie: { label: 'Déchèterie', color: 'bg-blue-100 text-blue-700' },
  partenaire: { label: 'Partenaire', color: 'bg-purple-100 text-purple-700' },
  evenement: { label: 'Événement', color: 'bg-amber-100 text-amber-700' },
  boite_a_dons: { label: 'Boîte à dons', color: 'bg-pink-100 text-pink-700' },
};

const emptyForm = {
  name: '', type: 'cav', address: '', addressComplement: '', city: '',
  postalCode: '', latitude: '', longitude: '', nbCav: 1, frequence: 1,
  ecoTlcRef: '', owner: '', communaute: '', surface: '',
  contactName: '', contactPhone: ''
};

export default function CAVManagement() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // all, true, false
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showSuspendModal, setShowSuspendModal] = useState(null);
  const [suspensionMotif, setSuspensionMotif] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showQrModal, setShowQrModal] = useState(null);
  const qrPrintRef = useRef(null);

  const handlePrintQR = (point) => {
    setShowQrModal(point);
    setTimeout(() => {
      if (qrPrintRef.current) {
        const printWindow = window.open('', '_blank', 'width=400,height=500');
        printWindow.document.write(`
          <html><head><title>QR Code - ${point.name}</title>
          <style>body{font-family:Arial,sans-serif;text-align:center;padding:20px}
          .name{font-size:14px;font-weight:bold;margin:10px 0}
          .code{font-size:18px;font-family:monospace;margin:5px 0}
          .addr{font-size:11px;color:#666}</style></head><body>
          ${qrPrintRef.current.innerHTML}
          <script>window.print();window.close();</script>
          </body></html>
        `);
        printWindow.document.close();
      }
    }, 300);
  };

  const fetchPoints = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterActive !== 'all') params.active = filterActive;
      if (filterType) params.type = filterType;
      const res = await api.get('/collection/points', { params });
      setPoints(res.data);
    } catch (err) {
      console.error('Erreur chargement CAV:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, filterType]);

  useEffect(() => { setLoading(true); fetchPoints(); }, [fetchPoints]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (data.latitude) data.latitude = parseFloat(data.latitude);
      if (data.longitude) data.longitude = parseFloat(data.longitude);
      if (data.nbCav) data.nbCav = parseInt(data.nbCav);
      if (data.frequence) data.frequence = parseInt(data.frequence);

      if (editing) {
        await api.put(`/collection/points/${editing}`, data);
      } else {
        await api.post('/collection/points', data);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });
      fetchPoints();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (point) => {
    setForm({
      name: point.name || '',
      type: point.type || 'cav',
      address: point.address || '',
      addressComplement: point.addressComplement || '',
      city: point.city || '',
      postalCode: point.postalCode || '',
      latitude: point.latitude || '',
      longitude: point.longitude || '',
      nbCav: point.nbCav || 1,
      frequence: point.frequence || 1,
      ecoTlcRef: point.ecoTlcRef || '',
      owner: point.owner || '',
      communaute: point.communaute || '',
      surface: point.surface || '',
      contactName: point.contactName || '',
      contactPhone: point.contactPhone || '',
    });
    setEditing(point.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/collection/points/${id}`);
      setDeleteConfirm(null);
      fetchPoints();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleSuspend = async () => {
    if (!showSuspendModal) return;
    try {
      await api.put(`/collection/points/${showSuspendModal}`, {
        active: false,
        suspensionMotif: suspensionMotif
      });
      setShowSuspendModal(null);
      setSuspensionMotif('');
      fetchPoints();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await api.put(`/collection/points/${id}`, {
        active: true,
        suspensionMotif: null
      });
      fetchPoints();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const stats = {
    total: points.length,
    active: points.filter(p => p.active).length,
    inactive: points.filter(p => !p.active).length,
    totalCav: points.reduce((s, p) => s + (p.nbCav || 1), 0),
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">Gestion des CAV</h1>
          <p className="text-sm text-gray-500 mt-1">Administration des points de collecte</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditing(null); setShowForm(true); }}
          className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Ajouter un point
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Total points</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Actifs</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Indisponibles</div>
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">Total conteneurs</div>
          <div className="text-2xl font-bold text-soltex-green">{stats.totalCav}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, ville, adresse..."
            className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Indisponibles</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Point de collecte</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ville</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Conteneurs</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fréq./sem</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GPS</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">QR Code</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {points.map(point => {
                const type = TYPE_LABELS[point.type] || TYPE_LABELS.cav;
                return (
                  <tr key={point.id} className={`hover:bg-gray-50 ${!point.active ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{point.name}</div>
                      <div className="text-xs text-gray-400">{point.address}</div>
                      {point.qrCode && <div className="text-[10px] text-gray-300 font-mono">{point.qrCode}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${type.color}`}>
                        {type.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{point.city || '-'}</td>
                    <td className="px-4 py-3 text-center font-medium">{point.nbCav || 1}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{point.frequence || 1}x</td>
                    <td className="px-4 py-3 text-center">
                      {point.latitude && point.longitude ? (
                        <CheckCircle className="w-4 h-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {point.qrCode ? (
                        <button onClick={(e) => { e.stopPropagation(); handlePrintQR(point); }}
                          className="inline-flex items-center gap-1 text-xs text-soltex-green hover:underline" title="Voir / Imprimer QR">
                          <QrCode className="w-4 h-4" />
                          <span className="font-mono text-[10px]">{point.qrCode}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {point.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                          Actif
                        </span>
                      ) : (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                            Indisponible
                          </span>
                          {point.suspensionMotif && (
                            <div className="text-[10px] text-red-500 mt-0.5">{point.suspensionMotif}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(point)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="Modifier">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {point.active ? (
                          <button onClick={() => { setShowSuspendModal(point.id); setSuspensionMotif(''); }}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded" title="Rendre indisponible">
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(point.id)}
                            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded" title="Réactiver">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(point.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {points.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    Aucun point de collecte trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Modifier le point' : 'Nouveau point de collecte'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Nom du point *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: ROUEN - 27 rue Saint-Sever" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Ville</label>
                  <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Adresse</label>
                  <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Complément d'adresse</label>
                  <input type="text" value={form.addressComplement} onChange={e => setForm({ ...form, addressComplement: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Code postal</label>
                  <input type="text" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" maxLength={5} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Latitude</label>
                  <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="49.4431" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Longitude</label>
                  <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="1.0993" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Nombre de conteneurs</label>
                  <input type="number" min={1} value={form.nbCav} onChange={e => setForm({ ...form, nbCav: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Fréquence hebdo</label>
                  <input type="number" min={1} max={7} value={form.frequence} onChange={e => setForm({ ...form, frequence: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Réf. Eco TLC</label>
                  <input type="text" value={form.ecoTlcRef} onChange={e => setForm({ ...form, ecoTlcRef: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Propriétaire</label>
                  <input type="text" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Communauté de communes</label>
                  <input type="text" value={form.communaute} onChange={e => setForm({ ...form, communaute: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Type de surface</label>
                  <select value={form.surface} onChange={e => setForm({ ...form, surface: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    <option value="">-</option>
                    <option value="Publique">Publique</option>
                    <option value="Parking CC">Parking CC</option>
                    <option value="Privé">Privé</option>
                    <option value="Associatif">Associatif</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Contact (nom)</label>
                  <input type="text" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Contact (tél.)</label>
                  <input type="text" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit"
                  className="px-4 py-2 bg-soltex-green text-white rounded-lg text-sm hover:bg-soltex-green/90">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSuspendModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold">Rendre indisponible</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Ce point de collecte ne sera plus inclus dans les tournées. Indiquez le motif de suspension.
              </p>
              <label className="text-xs font-medium text-gray-500">Motif de suspension *</label>
              <select value={suspensionMotif} onChange={e => setSuspensionMotif(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 mb-2">
                <option value="">-- Choisir un motif --</option>
                <option value="Travaux">Travaux</option>
                <option value="Dégradation">Dégradation</option>
                <option value="Vandalisme">Vandalisme</option>
                <option value="Inaccessible">Inaccessible</option>
                <option value="Retrait demandé">Retrait demandé</option>
                <option value="Saturation">Saturation</option>
                <option value="Autre">Autre</option>
              </select>
              {suspensionMotif === 'Autre' && (
                <input type="text" placeholder="Précisez le motif..."
                  onChange={e => setSuspensionMotif(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowSuspendModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={handleSuspend} disabled={!suspensionMotif}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold">Supprimer le point</h2>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Cette action est irréversible. Le point sera supprimé de toutes les tournées associées.
                Préférez « Rendre indisponible » si la suspension est temporaire.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">QR Code</h2>
              <button onClick={() => setShowQrModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div ref={qrPrintRef} className="text-center">
              <QRCodeSVG value={showQrModal.qrCode} size={200} className="mx-auto mb-4" />
              <p className="name font-bold text-sm">{showQrModal.name}</p>
              <p className="code text-lg font-mono font-bold text-soltex-green">{showQrModal.qrCode}</p>
              <p className="addr text-xs text-gray-500">{showQrModal.address}, {showQrModal.city}</p>
            </div>
            <button onClick={() => handlePrintQR(showQrModal)}
              className="w-full mt-4 bg-soltex-green text-white rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-medium">
              <Printer className="w-4 h-4" /> Imprimer le QR code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
