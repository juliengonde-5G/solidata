import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../utils/api';
import {
  Download, Calendar, MapPin, TrendingUp, TrendingDown, Minus,
  Leaf, Box, AlertTriangle, BarChart3
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Marqueurs colorés selon le taux de remplissage
function makeIcon(fillRate, selected) {
  const color = fillRate > 70 ? '#EF4444' : fillRate > 40 ? '#F59E0B' : fillRate > 0 ? '#22C55E' : '#9CA3AF';
  const size = selected ? 16 : 10;
  const border = selected ? '3px solid #1E40AF' : '2px solid white';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

// Composant pour recentrer la carte
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const coords = points.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]);
      if (coords.length > 0) map.fitBounds(coords, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

// Formater un nombre avec séparateur de milliers
function fmt(n) {
  if (n == null) return '-';
  return Math.round(n).toLocaleString('fr-FR');
}

export default function RapportAutorite() {
  const [kpis, setKpis] = useState(null);
  const [points, setPoints] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [pointStats, setPointStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('mois'); // jour, mois, annee
  const [dateFilter, setDateFilter] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return {
      startDate: `${y}-${m}-01`,
      endDate: now.toISOString().slice(0, 10)
    };
  });
  const mapRef = useRef(null);

  // Calculer dates selon le mode de filtre
  const handleFilterMode = useCallback((mode) => {
    setFilterMode(mode);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    if (mode === 'jour') {
      setDateFilter({ startDate: `${y}-${m}-${d}`, endDate: `${y}-${m}-${d}` });
    } else if (mode === 'mois') {
      setDateFilter({ startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${d}` });
    } else {
      setDateFilter({ startDate: `${y}-01-01`, endDate: `${y}-${m}-${d}` });
    }
  }, []);

  // Charger toutes les données
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, pointsRes, monthlyRes] = await Promise.all([
        api.get('/reporting/autorite/kpis', { params: dateFilter }),
        api.get('/reporting/autorite/points', { params: dateFilter }),
        api.get('/reporting/autorite/monthly')
      ]);
      setKpis(kpiRes.data);
      setPoints(pointsRes.data);
      setMonthly(monthlyRes.data);
    } catch (err) {
      console.error('Erreur chargement rapport:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Charger les stats d'un point au clic
  const handlePointClick = async (point) => {
    setSelectedPoint(point);
    setLoadingStats(true);
    try {
      const { data } = await api.get(`/reporting/autorite/point/${point.id}/stats`, { params: dateFilter });
      setPointStats(data);
    } catch (err) {
      console.error(err);
      setPointStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!kpis) return;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(122, 181, 29); // soltex-green
    doc.text('Rapport Autorité Administrative', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Solidarité Textiles — Solidata`, 14, 25);
    doc.text(`Période : ${dateFilter.startDate} au ${dateFilter.endDate}`, 14, 31);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 37);

    // KPIs
    doc.setFontSize(12);
    doc.setTextColor(50);
    let y = 48;

    const kpiTable = [
      ['CAV disponibles', `${kpis.cav.disponibles}`, 'CAV indisponibles', `${kpis.cav.indisponibles}`],
      ['Collecté (période)', `${kpis.tonnage.periodeTonnes} t`, 'Collecté (année)', `${kpis.tonnage.anneeTonnes} t`],
      ['Tendance N/N-1', `${kpis.tendance.pourcentage != null ? (kpis.tendance.pourcentage > 0 ? '+' : '') + kpis.tendance.pourcentage + '%' : 'N/A'}`, '', ''],
      ['Eco CO2 (période)', `${fmt(kpis.co2.periode)} kg`, 'Eco CO2 (année)', `${fmt(kpis.co2.annee)} kg`]
    ];

    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur', 'Indicateur', 'Valeur']],
      body: kpiTable,
      theme: 'grid',
      headStyles: { fillColor: [122, 181, 29], textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Données mensuelles
    if (monthly.length > 0) {
      doc.setFontSize(12);
      doc.text('Tonnages mensuels (tonnes)', 14, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [['Mois', ...monthly.map(m => m.mois)]],
        body: [
          ['Année en cours', ...monthly.map(m => m.anneeEnCours || '-')],
          ['Année précédente', ...monthly.map(m => m.anneePrecedente || '-')]
        ],
        theme: 'grid',
        headStyles: { fillColor: [122, 181, 29], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Liste des points (page 2)
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Points de collecte', 14, 18);

    const pointRows = points.map(p => [
      p.name,
      p.city,
      p.nbCav || 1,
      p.avgFillRate != null ? `${p.avgFillRate}%` : '-',
      p.lastCollectionDate || '-',
      p.collectionsYTD || 0
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Nom', 'Ville', 'CAV', 'Remplissage', 'Dernière collecte', 'Collectes année']],
      body: pointRows,
      theme: 'striped',
      headStyles: { fillColor: [122, 181, 29], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`rapport-autorite-${dateFilter.startDate}-${dateFilter.endDate}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement du rapport...</div>
      </div>
    );
  }

  const tendanceIcon = kpis?.tendance?.pourcentage > 0 ? TrendingUp
    : kpis?.tendance?.pourcentage < 0 ? TrendingDown : Minus;
  const TendanceIcon = tendanceIcon;
  const tendanceColor = kpis?.tendance?.pourcentage > 0 ? 'text-green-600' : kpis?.tendance?.pourcentage < 0 ? 'text-red-600' : 'text-gray-500';

  return (
    <div>
      {/* Header + filtres */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">Rapport Autorité Administrative</h1>
          <p className="text-sm text-gray-500">Solidarité Textiles</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode filtre */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { key: 'jour', label: 'Jour' },
              { key: 'mois', label: 'Mois' },
              { key: 'annee', label: 'Année' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterMode(f.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterMode === f.key ? 'bg-white text-soltex-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Dates manuelles */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date" value={dateFilter.startDate}
              onChange={e => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
            <span className="text-gray-400 text-sm">au</span>
            <input
              type="date" value={dateFilter.endDate}
              onChange={e => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90 active:scale-95 transition-transform text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* CAV disponibles / indisponibles */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Box className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Points de collecte</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{fmt(kpis.cav.disponibles)}</p>
            <p className="text-xs text-gray-400 mt-1">disponibles</p>
            <div className="mt-2 pt-2 border-t flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <span className="text-sm text-orange-600 font-medium">{fmt(kpis.cav.indisponibles)}</span>
              <span className="text-xs text-gray-400">indisponibles</span>
            </div>
          </div>

          {/* Tonnage collecté */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Collecté</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{kpis.tonnage.periodeTonnes} <span className="text-lg font-normal text-gray-400">t</span></p>
            <p className="text-xs text-gray-400 mt-1">sur la période</p>
            <div className="mt-2 pt-2 border-t">
              <span className="text-sm text-gray-600 font-medium">{kpis.tonnage.anneeTonnes} t</span>
              <span className="text-xs text-gray-400 ml-1">depuis le 1er janvier</span>
            </div>
          </div>

          {/* Tendance N/N-1 */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                kpis.tendance.pourcentage > 0 ? 'bg-green-100' : kpis.tendance.pourcentage < 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <TendanceIcon className={`w-5 h-5 ${tendanceColor}`} />
              </div>
              <span className="text-sm text-gray-500">Tendance N/N-1</span>
            </div>
            <p className={`text-3xl font-bold ${tendanceColor}`}>
              {kpis.tendance.pourcentage != null
                ? `${kpis.tendance.pourcentage > 0 ? '+' : ''}${kpis.tendance.pourcentage}%`
                : 'N/A'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">vs année précédente</p>
            <div className="mt-2 pt-2 border-t">
              <span className="text-xs text-gray-400">N-1 : {fmt(kpis.tendance.periodePrecedente)} kg</span>
            </div>
          </div>

          {/* Économie CO2 */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Économie CO2</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{fmt(kpis.co2.periode)} <span className="text-lg font-normal text-gray-400">kg</span></p>
            <p className="text-xs text-gray-400 mt-1">sur la période</p>
            <div className="mt-2 pt-2 border-t">
              <span className="text-sm text-emerald-600 font-medium">{fmt(kpis.co2.annee)} kg</span>
              <span className="text-xs text-gray-400 ml-1">depuis le 1er janvier</span>
            </div>
          </div>
        </div>
      )}

      {/* Carte interactive + panneau stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carte */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden" style={{ minHeight: 500 }}>
          <MapContainer
            center={[49.5, 1.05]}
            zoom={11}
            style={{ height: '100%', minHeight: 500 }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />

            {points.filter(p => p.latitude && p.longitude).map(p => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={makeIcon(p.avgFillRate || 0, selectedPoint?.id === p.id)}
                eventHandlers={{ click: () => handlePointClick(p) }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{p.name}</strong><br />
                    {p.city} — {p.nbCav || 1} CAV
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Panneau stats point sélectionné */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          {!selectedPoint ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <MapPin className="w-12 h-12 mb-3" />
              <p className="text-sm text-gray-400 text-center">
                Cliquez sur un point de collecte sur la carte pour afficher ses statistiques
              </p>
            </div>
          ) : loadingStats ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Chargement...
            </div>
          ) : pointStats ? (
            <div>
              <div className="mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold text-gray-800">{pointStats.point.name}</h3>
                <p className="text-sm text-gray-500">{pointStats.point.address}, {pointStats.point.city}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {pointStats.point.nbCav || 1} CAV
                  </span>
                  {pointStats.point.avgFillRate != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pointStats.point.avgFillRate > 70 ? 'bg-red-100 text-red-700'
                      : pointStats.point.avgFillRate > 40 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                    }`}>
                      Remplissage moy. {pointStats.point.avgFillRate}%
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Dernière collecte */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Dernière collecte</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {pointStats.derniereCollecte
                      ? new Date(pointStats.derniereCollecte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Aucune'
                    }
                  </p>
                </div>

                {/* Cumul depuis début d'année */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cumul depuis le 1er janvier</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {fmt(pointStats.cumulAnnee)} kg
                    <span className="text-sm text-gray-400 font-normal ml-2">
                      ({pointStats.nbCollectesAnnee} collectes)
                    </span>
                  </p>
                </div>

                {/* Cumul période filtrée */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cumul période filtrée</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {fmt(pointStats.cumulPeriode)} kg
                    <span className="text-sm text-gray-400 font-normal ml-2">
                      ({pointStats.nbCollectesPeriode} collectes)
                    </span>
                  </p>
                </div>

                {/* Moyenne par collecte */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Moyenne par collecte (période)</p>
                  <p className="text-lg font-semibold text-gray-700">{fmt(pointStats.moyennePeriode)} kg</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-400">Erreur de chargement des statistiques</div>
          )}

          {/* Légende */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Légende carte</p>
            <div className="flex flex-wrap gap-3">
              {[
                { color: '#EF4444', label: '> 70%' },
                { color: '#F59E0B', label: '40-70%' },
                { color: '#22C55E', label: '< 40%' },
                { color: '#9CA3AF', label: 'N/A' }
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Graphique tendance mensuelle (simplifié en table visuelle) */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Tonnages mensuels comparés (tonnes)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 text-gray-500 font-medium">Mois</th>
                  {monthly.map(m => (
                    <th key={m.mois} className="text-center py-2 px-1 text-gray-500 font-medium text-xs">{m.mois}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-3 text-gray-600 font-medium">{new Date().getFullYear()}</td>
                  {monthly.map(m => (
                    <td key={m.mois} className="text-center py-2 px-1">
                      <span className="font-semibold text-soltex-green">{m.anneeEnCours || '-'}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-3 text-gray-400">{new Date().getFullYear() - 1}</td>
                  {monthly.map(m => (
                    <td key={m.mois} className="text-center py-2 px-1">
                      <span className="text-gray-400">{m.anneePrecedente || '-'}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Barres visuelles */}
          <div className="flex items-end gap-1 mt-4 h-24">
            {monthly.map(m => {
              const max = Math.max(...monthly.map(x => Math.max(x.anneeEnCours || 0, x.anneePrecedente || 0)), 1);
              const h1 = ((m.anneeEnCours || 0) / max) * 100;
              const h2 = ((m.anneePrecedente || 0) / max) * 100;
              return (
                <div key={m.mois} className="flex-1 flex items-end gap-0.5 justify-center">
                  <div
                    className="w-2 bg-soltex-green/80 rounded-t transition-all"
                    style={{ height: `${h1}%`, minHeight: h1 > 0 ? 2 : 0 }}
                    title={`${m.mois} ${new Date().getFullYear()}: ${m.anneeEnCours}t`}
                  />
                  <div
                    className="w-2 bg-gray-300 rounded-t transition-all"
                    style={{ height: `${h2}%`, minHeight: h2 > 0 ? 2 : 0 }}
                    title={`${m.mois} ${new Date().getFullYear() - 1}: ${m.anneePrecedente}t`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-soltex-green/80 rounded inline-block" /> Année en cours</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-300 rounded inline-block" /> Année précédente</span>
          </div>
        </div>
      )}
    </div>
  );
}
