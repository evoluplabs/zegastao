import { Routes, Route } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { UploadPage } from '@/pages/Upload';
import { Transactions } from '@/pages/Transactions';
import { Debts } from '@/pages/Debts';
import { Rules } from '@/pages/Rules';
import { Goals } from '@/pages/Goals';
import { Projection } from '@/pages/Projection';
import { Copilot } from '@/pages/Copilot';
import { Journey } from '@/pages/Journey';
import { Investments } from '@/pages/Investments';

export default function App() {
  useAuthListener();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/journey" element={<Journey />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/projection" element={<Projection />} />
        <Route path="/copilot" element={<Copilot />} />
      </Route>
    </Routes>
  );
}
