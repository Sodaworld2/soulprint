import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import Verify from './pages/Verify';
import { CertificateView } from './pages/CertificateView';
import ForensicLab from './pages/ForensicLab';
import ForensicReportPage from './pages/ForensicReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/certificate/:id" element={<CertificateView />} />
          <Route path="/lab" element={<ForensicLab />} />
          <Route path="/report/:id" element={<ForensicReportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
