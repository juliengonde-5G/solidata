import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/Recruitment/KanbanBoard';
import CandidateDetail from './pages/Recruitment/CandidateDetail';
import Positions from './pages/Recruitment/Positions';
import PersonalityQuiz from './pages/Recruitment/PersonalityQuiz';
import PersonalityResults from './pages/Recruitment/PersonalityResults';
import Employees from './pages/Team/Employees';
import Vehicles from './pages/Team/Vehicles';
import PlanningPage from './pages/Team/Planning';
import RoutesPage from './pages/Collection/Routes';
import RouteDetail from './pages/Collection/RouteDetail';
import Collections from './pages/Collection/Collections';
import ReportingDashboard from './pages/Reporting/Dashboard';
import Refashion from './pages/Reporting/Refashion';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-soltex-gray">
        <div className="text-soltex-green text-xl">Chargement...</div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/test-personnalite/:testId" element={<PersonalityQuiz />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="recrutement">
          <Route index element={<KanbanBoard />} />
          <Route path="postes" element={<Positions />} />
          <Route path="candidat/:id" element={<CandidateDetail />} />
          <Route path="personnalite/:testId" element={<PersonalityResults />} />
        </Route>
        <Route path="equipe">
          <Route index element={<Employees />} />
          <Route path="vehicules" element={<Vehicles />} />
          <Route path="planning" element={<PlanningPage />} />
        </Route>
        <Route path="collecte">
          <Route index element={<Collections />} />
          <Route path="tournees" element={<RoutesPage />} />
          <Route path="tournee/:id" element={<RouteDetail />} />
        </Route>
        <Route path="reporting">
          <Route index element={<ReportingDashboard />} />
          <Route path="refashion" element={<Refashion />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
