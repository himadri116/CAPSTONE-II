import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthProvider";
import HomePage from "./pages/HomePage";
import RepositoryInputPage from "./pages/RepositoryInputPage";
import PredictionResultPage from "./pages/PredictionResultPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import PredictionHistoryPage from "./pages/PredictionHistoryPage";
import FeedbackPage from "./pages/FeedbackPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          <Route
            path="/repository-input"
            element={
              <ProtectedRoute>
                <RepositoryInputPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prediction-result"
            element={
              <ProtectedRoute>
                <PredictionResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prediction-history"
            element={
              <ProtectedRoute>
                <PredictionHistoryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
