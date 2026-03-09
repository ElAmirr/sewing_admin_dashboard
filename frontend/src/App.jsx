import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const { user } = useAuth();
  return user ? <AdminDashboard /> : <LoginPage />;
}
