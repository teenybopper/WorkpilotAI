import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DocOpsPage from './pages/DocOpsPage';
import WorkspacePage from './pages/WorkspacePage';
import MeetOpsPage from './pages/MeetOpsPage';
import ActionOpsPage from './pages/ActionOpsPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DocsPage from './pages/DocsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/docops" element={<DocOpsPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="/meetops" element={<MeetOpsPage />} />
        <Route path="/workspace/:id/meetops" element={<MeetOpsPage />} />
        <Route path="/actions" element={<ActionOpsPage />} />
        <Route path="/workspace/:id/actions" element={<ActionOpsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>
    </Routes>
  );
}
