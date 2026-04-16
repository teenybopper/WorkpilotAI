import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import JoinOrgPage from './pages/JoinOrgPage';
import DashboardPage from './pages/DashboardPage';
import DocOpsPage from './pages/DocOpsPage';
import WorkspacePage from './pages/WorkspacePage';
import MeetOpsPage from './pages/MeetOpsPage';
import ActionOpsPage from './pages/ActionOpsPage';
import SettingsPage from './pages/SettingsPage';
import LocalCompanionSetupPage from './pages/LocalCompanionSetupPage';
import OrgBotSetupPage from './pages/OrgBotSetupPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/join-org" element={<JoinOrgPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/docops" element={<DocOpsPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="/meetops" element={<MeetOpsPage />} />
          <Route path="/workspace/:id/meetops" element={<MeetOpsPage />} />
          <Route path="/actions" element={<ActionOpsPage />} />
          <Route path="/workspace/:id/actions" element={<ActionOpsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/setup/companion" element={<LocalCompanionSetupPage />} />
          <Route path="/setup/bot" element={<OrgBotSetupPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
