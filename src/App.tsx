import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JoinForm } from '@/components/JoinForm';
import { ThankYouPage } from '@/components/ThankYouPage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinForm />} />
        <Route path="/:slug" element={<JoinForm />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}