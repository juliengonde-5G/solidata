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
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navSections = [
  {
    title: 'Général',
    items: [
      { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Recrutement',
    items: [
      { path: '/recrutement', label: 'Candidatures', icon: Users },
      { path: '/recrutement/postes', label: 'Postes', icon: Briefcase },
    ]
  },
  {
    title: 'Équipe',
    items: [
      { path: '/equipe', label: 'Salariés', icon: UserCheck },
      { path: '/equipe/vehicules', label: 'Véhicules', icon: Truck },
      { path: '/equipe/planning', label: 'Planning', icon: CalendarDays },
    ]
  },
  {
    title: 'Collecte',
    items: [
      { path: '/collecte', label: 'Collectes', icon: Package },
      { path: '/collecte/tournees', label: 'Tournées', icon: Route },
    ]
  },
  {
    title: 'Reporting',
    items: [
      { path: '/reporting', label: 'Tableau de bord', icon: BarChart3 },
      { path: '/reporting/refashion', label: 'Refashion', icon: FileSpreadsheet },
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            <img src="/logo.png" alt="SolTex" className="h-10" />
            <div>
              <h1 className="text-lg font-bold text-soltex-green">Solidata</h1>
              <p className="text-xs text-gray-400">v2.0</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {navSections.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
              <p className="text-gray-400 text-xs">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-soltex-green">Solidata</h1>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
