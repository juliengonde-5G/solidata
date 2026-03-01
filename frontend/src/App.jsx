import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Auth/Login';
import ForcePasswordChange from './pages/Auth/ForcePasswordChange';
import Dashboard from './pages/Dashboard';
import CollaborateurHome from './pages/CollaborateurHome';
import MonProfil from './pages/MonProfil';
import MonPlanning from './pages/MonPlanning';
import KanbanBoard from './pages/Recruitment/KanbanBoard';
import CandidateDetail from './pages/Recruitment/CandidateDetail';
import Positions from './pages/Recruitment/Positions';
import PersonalityQuiz from './pages/Recruitment/PersonalityQuiz';
import PersonalityResults from './pages/Recruitment/PersonalityResults';
import Employees from './pages/Team/Employees';
import EmployeeDetail from './pages/Team/EmployeeDetail';
import Vehicles from './pages/Team/Vehicles';
import PlanningPage from './pages/Team/Planning';
import DailyPlanning from './pages/Team/DailyPlanning';
import WorkStations from './pages/Team/WorkStations';
import VakModule from './pages/Team/VakModule';
import RoutesPage from './pages/Collection/Routes';
import RouteDetail from './pages/Collection/RouteDetail';
import Collections from './pages/Collection/Collections';
import ReportingDashboard from './pages/Reporting/Dashboard';
import Refashion from './pages/Reporting/Refashion';
import AdminUsers from './pages/Admin/Users';
import AdminSettings from './pages/Admin/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-soltex-gray">
        <div className="text-soltex-green text-xl">Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  // Forcer le changement de mot de passe
  if (user.mustChangePassword) return <ForcePasswordChange />;
  return children;
}

// Route réservée à certains rôles
function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return children;
}

// Page d'accueil adaptative selon le rôle
function AdaptiveDashboard() {
  const { user } = useAuth();
  if (user?.role === 'collaborateur') {
    return <CollaborateurHome />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/test-personnalite/:testId" element={<PersonalityQuiz />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<AdaptiveDashboard />} />

        {/* Mon espace (tous) */}
        <Route path="mon-profil" element={<MonProfil />} />
        <Route path="mon-planning" element={<MonPlanning />} />

        {/* Recrutement (admin, manager, rh) */}
        <Route path="recrutement">
          <Route index element={<RoleRoute roles={['admin', 'manager', 'rh']}><KanbanBoard /></RoleRoute>} />
          <Route path="postes" element={<RoleRoute roles={['admin', 'manager', 'rh']}><Positions /></RoleRoute>} />
          <Route path="candidat/:id" element={<RoleRoute roles={['admin', 'manager', 'rh']}><CandidateDetail /></RoleRoute>} />
          <Route path="personnalite/:testId" element={<RoleRoute roles={['admin', 'manager', 'rh']}><PersonalityResults /></RoleRoute>} />
        </Route>

        {/* Équipe (admin, manager, rh) */}
        <Route path="equipe">
          <Route index element={<RoleRoute roles={['admin', 'manager', 'rh']}><Employees /></RoleRoute>} />
          <Route path="salarie/:id" element={<RoleRoute roles={['admin', 'manager', 'rh']}><EmployeeDetail /></RoleRoute>} />
          <Route path="vehicules" element={<RoleRoute roles={['admin', 'manager', 'rh']}><Vehicles /></RoleRoute>} />
          <Route path="planning" element={<RoleRoute roles={['admin', 'manager', 'rh']}><PlanningPage /></RoleRoute>} />
          <Route path="affectations" element={<RoleRoute roles={['admin', 'manager', 'rh']}><DailyPlanning /></RoleRoute>} />
          <Route path="postes-travail" element={<RoleRoute roles={['admin', 'manager', 'rh']}><WorkStations /></RoleRoute>} />
          <Route path="vak" element={<RoleRoute roles={['admin', 'manager', 'rh']}><VakModule /></RoleRoute>} />
        </Route>

        {/* Collecte (admin, manager, rh + collaborateur collecte) */}
        <Route path="collecte">
          <Route index element={<Collections />} />
          <Route path="tournees" element={<RoleRoute roles={['admin', 'manager', 'rh']}><RoutesPage /></RoleRoute>} />
          <Route path="tournee/:id" element={<RoleRoute roles={['admin', 'manager', 'rh']}><RouteDetail /></RoleRoute>} />
        </Route>

        {/* Reporting (admin, manager, rh) */}
        <Route path="reporting">
          <Route index element={<RoleRoute roles={['admin', 'manager', 'rh']}><ReportingDashboard /></RoleRoute>} />
          <Route path="refashion" element={<RoleRoute roles={['admin', 'manager', 'rh']}><Refashion /></RoleRoute>} />
        </Route>

        {/* Administration (admin + rh pour certaines pages) */}
        <Route path="admin">
          <Route path="utilisateurs" element={<RoleRoute roles={['admin', 'rh']}><AdminUsers /></RoleRoute>} />
          <Route path="parametres" element={<RoleRoute roles={['admin']}><AdminSettings /></RoleRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
