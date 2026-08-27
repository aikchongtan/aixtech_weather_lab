import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LocationHistoryPage } from './pages/LocationHistoryPage';
import { StoreProvider } from './state/store';

export function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Layout />} />
        <Route path="/locations/:id" element={<LocationHistoryPage />} />
      </Routes>
    </StoreProvider>
  );
}
