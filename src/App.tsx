import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/AuthGuard';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Queue from '@/pages/Queue';
import Drafts from '@/pages/Drafts';
import NewReel from '@/pages/NewReel';
import EditReel from '@/pages/EditReel';
import Pages from '@/pages/Pages';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

import { RssAutoPilot } from '@/pages/RssAutoPilot';
import Groups from '@/pages/Groups';
import Comments from '@/pages/Comments';
import AiAutoPilot from '@/pages/AiAutoPilot';
import BrandingSettings from '@/pages/BrandingSettings';
import EngagementAutomation from '@/pages/EngagementAutomation';
import AbTesting from '@/pages/AbTesting';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/queue"
          element={
            <AuthGuard>
              <Queue />
            </AuthGuard>
          }
        />
        <Route
          path="/reels/new"
          element={
            <AuthGuard>
              <NewReel />
            </AuthGuard>
          }
        />
        <Route
          path="/reels/:id/edit"
          element={
            <AuthGuard>
              <EditReel />
            </AuthGuard>
          }
        />
        <Route
          path="/drafts"
          element={
            <AuthGuard>
              <Drafts />
            </AuthGuard>
          }
        />
        <Route
          path="/pages"
          element={
            <AuthGuard>
              <Pages />
            </AuthGuard>
          }
        />
        <Route
          path="/branding"
          element={
            <AuthGuard>
              <BrandingSettings />
            </AuthGuard>
          }
        />
        <Route
          path="/engagement"
          element={
            <AuthGuard>
              <EngagementAutomation />
            </AuthGuard>
          }
        />
        <Route
          path="/ab-testing"
          element={
            <AuthGuard>
              <AbTesting />
            </AuthGuard>
          }
        />
        <Route
          path="/rss-autopilot"
          element={
            <AuthGuard>
              <RssAutoPilot />
            </AuthGuard>
          }
        />
        <Route
          path="/ai-autopilot"
          element={
            <AuthGuard>
              <AiAutoPilot />
            </AuthGuard>
          }
        />
        <Route
          path="/groups"
          element={
            <AuthGuard>
              <Groups />
            </AuthGuard>
          }
        />
        <Route
          path="/comments"
          element={
            <AuthGuard>
              <Comments />
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Settings />
            </AuthGuard>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
