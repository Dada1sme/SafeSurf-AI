
import React from 'react';
import axios from 'axios';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import { Login } from './LoginPage';
import { Register } from './RegisterPage';
import { LoggingPage } from './LoggingPage';
import ProtectedRoute from './ProtectedRoute';
import OAuthPopupSuccess from './OAuthPopupSuccess';
import './App.css';
import { API_BASE_URL } from './apiConfig';

// ✅ axios 설정은 import 이후에 배치
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/logging"
        element={
          <ProtectedRoute>
            <LoggingPage />
          </ProtectedRoute>
        }
      />
      <Route path="/oauth-popup-success" element={<OAuthPopupSuccess />} />
    </Routes>
  );
}

export default App;
