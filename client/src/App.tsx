import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/lib/locale/vi_VN';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Files from './pages/Files';
import Folders from './pages/Folders';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#0088cc',
          },
        }}
      >
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
            <Route path="/files" element={<PrivateRoute><Layout><Files /></Layout></PrivateRoute>} />
            <Route path="/folders" element={<PrivateRoute><Layout><Folders /></Layout></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App; 