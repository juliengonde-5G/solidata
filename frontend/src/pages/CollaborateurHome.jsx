import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  CalendarDays,
  User,
  Package,
  Truck,
  Clock,
  Sun
} from 'lucide-react';

const TEAM_LABELS = {
  tri: 'Tri',
  collecte: 'Collecte',
  magasin_lhopital: "Magasin L'Hôpital",
  magasin_st_sever: 'Magasin St Sever',
  magasin_vernon: 'Magasin Vernon',
};

const TEAM_ICONS = {
  tri: '🧵',
  collecte: '🚛',
  magasin_lhopital: '🏪',
  magasin_st_sever: '🏪',
  magasin_vernon: '🏪',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function CollaborateurHome() {
  const { user } = useAuth();
  const isCollecte = user?.team === 'collecte';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Salutation avec grosse typo + icône */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: user?.avatarColor || '#7AB51D' }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          <Sun className="w-8 h-8 inline-block text-yellow-400 mr-2" />
          {getGreeting()}, {user?.firstName} !
        </h1>
        <p className="text-lg text-gray-500">
          {TEAM_ICONS[user?.team]} Équipe {TEAM_LABELS[user?.team] || user?.team}
        </p>
      </div>

      {/* Gros boutons d'action — très visuels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mon profil */}
        <Link to="/mon-profil" className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent hover:border-soltex-green">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <span className="text-lg font-bold text-gray-700">Mon profil</span>
          <span className="text-sm text-gray-400 text-center">Voir mes informations</span>
        </Link>

        {/* Mon planning */}
        <Link to="/mon-planning" className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent hover:border-soltex-green">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-green-600" />
          </div>
          <span className="text-lg font-bold text-gray-700">Mon planning</span>
          <span className="text-sm text-gray-400 text-center">Voir mon emploi du temps</span>
        </Link>

        {/* Collecte — uniquement pour l'équipe collecte */}
        {isCollecte && (
          <Link to="/collecte" className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent hover:border-soltex-green sm:col-span-2">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Truck className="w-8 h-8 text-orange-600" />
            </div>
            <span className="text-lg font-bold text-gray-700">Mes collectes</span>
            <span className="text-sm text-gray-400 text-center">Saisir et voir les collectes du jour</span>
          </Link>
        )}
      </div>
    </div>
  );
}
