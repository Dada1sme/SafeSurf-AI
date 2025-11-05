import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { buildApiUrl } from "./apiConfig";

export default function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null); // null: 로딩 중, true: 인증됨, false: 실패

  useEffect(() => {
    let cancelled = false;

    const verifyAuth = async () => {
      const token = localStorage.getItem("access_token");

      const requestWithToken = () =>
        axios.get(buildApiUrl("auth/me"), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });

      try {
        await requestWithToken();
        if (!cancelled) {
          setIsValid(true);
        }
      } catch (error) {
        if (token) {
          localStorage.removeItem("access_token");
          try {
            await axios.get(buildApiUrl("auth/me"), { withCredentials: true });
            if (!cancelled) {
              setIsValid(true);
            }
            return;
          } catch {
            // fall through to failure
          }
        }
        if (!cancelled) {
          setIsValid(false);
        }
      }
    };

    verifyAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isValid === null) {
    return <p style={{ textAlign: "center", marginTop: "20px" }}>🔒 인증 확인 중...</p>;
  }

  if (isValid === false) {
    alert("로그인이 필요한 페이지입니다.");
    return <Navigate to="/login" replace />;
  }

  return children;
}
