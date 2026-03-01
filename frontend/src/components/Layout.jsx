import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCheck,
  Truck,
  CalendarDays,
  Route,
  Package,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  User,
  ClipboardList,
  Shield,
  PartyPopper,
  Map,
  Radio,
  Compass
} from 'lucide-react';
import { useState } from 'react';

const TEAM_LABELS = {
  tri: 'Tri',
  collecte: 'Collecte',
  magasin_lhopital: "Mag. L'Hôpital",
  magasin_st_sever: 'Mag. St Sever',
  magasin_vernon: 'Mag. Vernon',
  administration: 'Administration'
};

const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Manager',
  collaborateur: 'Collaborateur',
  rh: 'Ressources Humaines'
};

// Navigation complète — filtrée selon le rôle
function getNavSections(role, team) {
  const sections = [];

  // Général : tout le monde voit le tableau de bord (adapté)
  sections.push({
    title: 'Général',
    items: [
      { path: '/', label: 'Accueil', icon: LayoutDashboard },
    ]
  });

  // Recrutement : admin, manager, rh
  if (['admin', 'manager', 'rh'].includes(role)) {
    sections.push({
      title: 'Recrutement',
      items: [
        { path: '/recrutement', label: 'Candidatures', icon: Users },
        { path: '/recrutement/postes', label: 'Postes', icon: Briefcase },
      ]
    });
  }

  // Équipe : admin, manager, rh
  if (['admin', 'manager', 'rh'].includes(role)) {
    sections.push({
      title: 'Équipe',
      items: [
        { path: '/equipe', label: 'Salariés', icon: UserCheck },
        { path: '/equipe/affectations', label: 'Affectations', icon: ClipboardList },
        { path: '/equipe/postes-travail', label: 'Postes de travail', icon: Shield },
        { path: '/equipe/vak', label: 'VAK', icon: PartyPopper },
        { path: '/equipe/vehicules', label: 'Véhicules', icon: Truck },
        { path: '/equipe/planning', label: 'Planning', icon: CalendarDays },
      ]
    });
  }

  // Collecte : admin, manager, rh + collaborateur collecte
  if (['admin', 'manager', 'rh'].includes(role) || (role === 'collaborateur' && team === 'collecte')) {
    sections.push({
      title: 'Collecte',
      items: [
        ...(role === 'collaborateur' ? [
          { path: '/collecte/mobile', label: 'Ma tournée', icon: Truck },
        ] : [
          { path: '/collecte', label: 'Collectes', icon: Package },
          { path: '/collecte/planning', label: 'Planning', icon: Compass },
          { path: '/collecte/tournees', label: 'Tournées std', icon: Route },
        ]),
        { path: '/collecte/carte', label: 'Carte CAV', icon: Map },
        { path: '/collecte/live', label: 'Suivi live', icon: Radio },
      ]
    });
  }

  // Reporting : admin, manager, rh
  if (['admin', 'manager', 'rh'].includes(role)) {
    sections.push({
      title: 'Reporting',
      items: [
        { path: '/reporting', label: 'Tableau de bord', icon: BarChart3 },
        { path: '/reporting/refashion', label: 'Refashion', icon: FileSpreadsheet },
      ]
    });
  }

  // Mon profil : collaborateurs
  if (role === 'collaborateur') {
    sections.push({
      title: 'Mon espace',
      items: [
        { path: '/mon-profil', label: 'Mon profil', icon: User },
        { path: '/mon-planning', label: 'Mon planning', icon: CalendarDays },
      ]
    });
  }

  // Administration : admin uniquement
  if (role === 'admin') {
    sections.push({
      title: 'Administration',
      items: [
        { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: ShieldCheck },
        { path: '/admin/parametres', label: 'Paramètres', icon: Settings },
      ]
    });
  }

  // RH : admin + rh
  if (['admin', 'rh'].includes(role)) {
    // Pour le moment juste un accès rapide aux utilisateurs
    if (role === 'rh') {
      sections.push({
        title: 'Ressources Humaines',
        items: [
          { path: '/admin/utilisateurs', label: 'Profils', icon: ShieldCheck },
        ]
      });
    }
  }

  return sections;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections = getNavSections(user?.role, user?.team);

  return (
    <div className="min-h-screen flex bg-soltex-gray">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Solidarité Textiles" className="h-10 w-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <h1 className="text-lg font-bold text-soltex-green">Solidata</h1>
              <p className="text-xs text-gray-400">v2.1</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          {navSections.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-soltex-green text-white'
                          : 'text-gray-600 hover:bg-soltex-green/10 hover:text-soltex-green'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: user?.avatarColor || '#7AB51D' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="text-sm leading-tight">
                <p className="font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
                <p className="text-gray-400 text-xs">{ROLE_LABELS[user?.role] || user?.role}{user?.team ? ` — ${TEAM_LABELS[user?.team] || user?.team}` : ''}</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/logo.png" alt="SolTex" className="h-8 w-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          <h1 className="text-lg font-bold text-soltex-green">Solidata</h1>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
