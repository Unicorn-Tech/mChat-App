import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import PrivateRoute from "./components/PrivateRoute.jsx";
import ChatPage from "./pages/Chat.jsx";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/messenger/login" replace />} />
        <Route path="/messenger/login" element={<LoginPage />} />
        <Route path="/messenger/register" element={<RegisterPage />} />
        <Route
          path="/messenger"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/messenger/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
