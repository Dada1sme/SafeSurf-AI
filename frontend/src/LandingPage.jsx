import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Search } from "lucide-react";
import { buildApiUrl } from "./apiConfig";
import SafeSurfLogo from "./assets/SafeSurf_AI_Icon.svg";

export default function LandingPage() {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState("");
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // ✅ 쿠키 기반 인증만 시도 (Authorization 헤더 제거)
        const res = await axios.get(buildApiUrl("auth/me"), {
          withCredentials: true,
        });

        setUser(res.data);
        setIsLoggedIn(true);
      } catch (err) {
        console.warn("❌ Token invalid or expired or no session:", err.response?.status);
        localStorage.removeItem("access_token");
        setUser(null);
        setIsLoggedIn(false);
      }
    };

    fetchUser();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setStatus("");
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(buildApiUrl("api/analyze"), { url }, { headers });
      const { prediction, result } = res.data;

      // Log result, prediction, and probability for debugging
      console.log("🔎 Result:", result, "Probability:", res.data.probability);

      if (result === "unanalyzable" || prediction === null || typeof prediction !== "number") {
        setStatus("Unanalyzable");
        setScore(null);
      } else {
        setScore(res.data.probability);
        if (prediction === 1) setStatus("Safe");
        else if (prediction === 0) setStatus("Suspicious");
        else if (prediction === -1) setStatus("Danger");
        else setStatus("Unanalyzable");
      }
    } catch (error) {
      setStatus("Unanalyzable");
      setScore(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        buildApiUrl("auth/logout"),
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.warn("❌ Logout request failed:", error);
    } finally {
      localStorage.removeItem("access_token");
      setIsLoggedIn(false);
      setUser(null);
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#f6f5ff] to-[#eae7ff] min-h-screen w-full flex flex-col">
      {/* Header */}
      <header className="w-full h-[100px] bg-[#5c4fff] shadow-md flex items-center justify-between px-8 relative">
        <div className="flex items-center gap-3">
          <img src={SafeSurfLogo} alt="SafeSurf AI logo" className="w-10 h-10 md:w-12 md:h-12" />
          <h1 className="text-white text-2xl md:text-3xl font-bold">SafeSurf AI</h1>
        </div>
        <div className="flex gap-4 relative">
          {!isLoggedIn ? (
            <>
              <Button
                onClick={() => navigate("/login")}
                className="bg-white text-[#5c4fff] px-6 py-2 rounded-full shadow"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/register")}
                className="bg-white text-[#5c4fff] px-6 py-2 rounded-full shadow"
              >
                Register
              </Button>
            </>
          ) : (
            <div className="relative">
              <Button
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-white text-[#5c4fff] px-6 py-2 rounded-full shadow hover:bg-[#f0f0ff] hover:scale-105 transition-all duration-200"
              >
                {user?.username || "User"}
              </Button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg p-2 z-50 w-32">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/logging");
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                  >
                    검색 기록
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 pt-16 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-black mb-2">Protect Yourself.</h2>
          <p className="text-4xl font-bold text-[#5c4fff]">Analyze Every Website You visit.</p>
        </div>

        <div className="flex items-center w-full max-w-[700px] h-[64px] bg-white rounded-full shadow-md px-4">
          <Search size={24} className="text-[#202020] mr-3" />
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://google.com"
            className="flex-1 border-none outline-none text-gray-600 text-lg bg-transparent"
          />
          <Button
            type="button"
            onClick={handleSearch}
            className="rounded-full bg-[#5c4fff] text-white px-6 py-2 ml-2 hover:bg-[#5c4fff]/90"
          >
            Search Now
          </Button>
        </div>

        {loading && (
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-[#5c4fff] border-solid"></div>
            <p className="mt-2 text-gray-500 text-sm">분석 중입니다...</p>
          </div>
        )}

        {["Safe", "Suspicious", "Danger", "Unanalyzable"].includes(status) && (
          <div className="mt-10 text-center">
            <div className={`
              inline-block px-4 py-2 rounded-full font-bold text-lg
              ${status === "Safe" ? "bg-green-100 text-green-600 border border-green-400" : ""}
              ${status === "Suspicious" ? "bg-orange-100 text-orange-600 border border-orange-400" : ""}
              ${status === "Danger" ? "bg-red-100 text-red-600 border border-red-400" : ""}
              ${status === "Unanalyzable" ? "bg-gray-200 text-gray-600 border border-gray-400" : ""}
            `}>
              {status === "Unanalyzable" ? "⚠️ 검색할 수 없는 URL입니다." : status}
            </div>
            {status !== "Unanalyzable" && (
              <p className="mt-2 text-gray-600">
                Probability of {status === "Safe" ? "being Safe" : status === "Suspicious" ? "being Suspicious" : "being a Phishing URL"}
                <span className={`font-semibold ml-1 ${status === "Safe" ? "text-green-600" : status === "Suspicious" ? "text-orange-600" : "text-red-600"}`}>
                  {(score * 100).toFixed(2)}%
                </span>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
