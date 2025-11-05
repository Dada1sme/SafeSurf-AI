import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import iconPw from "./assets/Icon_PW.svg";
import iconEmail from "./assets/Icon_Email.svg";
import invisible1 from "./assets/invisible-1.svg";
import naver from "./assets/naver.svg";
import kakao from "./assets/kakao.svg";
import google from "./assets/google.svg";
import path351 from "./assets/path-35_1.svg";
import path361 from "./assets/path-36_1.svg";
import saly10 from "./assets/saly-10.svg";
import { buildApiUrl } from "./apiConfig";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const openOAuthPopup = (endpoint, windowName) => {
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      buildApiUrl(endpoint),
      windowName,
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) {
      alert("팝업이 차단되었습니다. 팝업을 허용해주세요.");
      return;
    }

    const handleOAuthMessage = (event) => {
      if (event.data?.type === "OAUTH_SUCCESS") {
        fetch(buildApiUrl("auth/me"), {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.username) {
              localStorage.setItem("user", JSON.stringify(data));
              window.location.href = "/";
            }
          })
          .catch((err) => console.error("OAuth check failed", err))
          .finally(() => {
            window.removeEventListener("message", handleOAuthMessage);
          });
      }
    };

    const cleanupOnClose = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(cleanupOnClose);
        window.removeEventListener("message", handleOAuthMessage);
      }
    }, 500);

    window.addEventListener("message", handleOAuthMessage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(buildApiUrl("token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include",
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("access_token", data.access_token);
        navigate("/");
      } else {
        alert(data.detail || "로그인 실패");
      }
    } catch (error) {
      alert("서버에 연결할 수 없습니다.");
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-white">

      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
        <h1 className="font-semibold text-[#5c4fff] text-3xl md:text-4xl tracking-tight font-[Poppins-SemiBold]">
          SafeSurf AI
        </h1>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-[55px] h-[55px] flex rounded-[27.5px]
          shadow-[0px_4px_4px_#00000040] bg-[linear-gradient(179deg,rgba(92,79,255,1)_0%,rgba(92,79,255,1)_100%)]
          hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#5c4fff] focus:ring-offset-2 transition-opacity"
          aria-label="Navigation menu"
        >
          <div className="mt-[19px] w-[17.5px] h-[17.5px] ml-[19px] relative">
            <img className="-top-px w-3 h-5 absolute -left-px" alt="" src={path351} aria-hidden="true" />
            <img className="top-2 w-5 h-0.5 absolute -left-px" alt="" src={path361} aria-hidden="true" />
          </div>
        </button>
      </div>

      <main className="flex flex-col md:flex-row w-full max-w-[1440px] min-h-screen mx-auto">
        <section className="flex-1 flex flex-col justify-center items-start px-6 md:px-16 py-8 bg-white">
          <div className="max-w-[430px] w-full flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl md:text-4xl font-medium font-[Poppins-Medium] text-black tracking-tight leading-snug">
                Sign in
              </h2>

              <div className="text-base font-normal font-[Poppins-Regular] text-black tracking-normal leading-normal">
                <p>If you don&apos;t have an account register</p>
                <p className="text-transparent">
                  <span className="text-black">You can&nbsp;&nbsp; </span>
                  <a
                    href="/register"
                    className="font-semibold font-[Poppins-SemiBold] text-[#0c21c1] hover:underline focus:underline focus:outline-none"
                  >
                    Register here !
                  </a>
                </p>
              </div>
            </div>

            <form className="w-full max-w-[430px]" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-12 mb-10">
                <div className="flex flex-col gap-1.5 w-full max-w-[400px]">
                  <label
                    htmlFor="email-input"
                    className="text-[#999999] text-sm font-medium font-[Poppins-Medium]"
                  >
                    Email
                  </label>
                  <div className="flex items-center border-b border-[#000741] pb-1">
                    <img
                      className="w-5 h-auto mr-3"
                      alt=""
                      src={iconEmail}
                      aria-hidden="true"
                    />
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 font-normal font-[Poppins-Regular] text-[#000741] text-base tracking-normal leading-normal focus:outline-none"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full max-w-[400px]">
                  <label
                    htmlFor="password-input"
                    className="text-[#999999] text-sm font-medium font-[Poppins-Medium]"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center border-b border-[#999999] pb-1">
                    <img
                      className="w-[12.26px] h-[17px] mr-4"
                      alt=""
                      src={iconPw}
                      aria-hidden="true"
                    />
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your Password"
                      className="flex-1 font-normal font-[Poppins-Regular] text-[#000741] text-base tracking-normal leading-normal focus:outline-none"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={handleTogglePassword}
                      className="w-9 h-9 focus:outline-none focus:ring-2 focus:ring-[#5648e0] rounded absolute right-0 top-1/2 transform -translate-y-1/2 flex justify-center items-center"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <img
                        className="w-4 h-4"
                        alt=""
                        src={invisible1}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full max-w-[400px] bg-[#5648e0] rounded-2xl shadow-[0px_4px_26px_#00000040] py-4 md:py-6 text-white font-medium font-[Poppins-Medium] text-lg tracking-normal leading-normal hover:bg-[#4a3dd4] focus:bg-[#4a3dd4] focus:outline-none focus:ring-2 focus:ring-[#5648e0] focus:ring-offset-2 transition-colors"
                aria-label="Login"
              >
                Login
              </button>
            </form>

            <div className="flex flex-col items-center w-full max-w-[400px] mt-6">
              <div className="text-[#b4b4b4] text-base font-medium font-[Poppins] mb-4">
                or continue with
              </div>
              <div className="flex flex-row gap-x-4 justify-center w-full">
                <img
                  className="w-10 h-10 cursor-pointer hover:scale-110 transition-transform"
                  alt="Naver login"
                  src={naver}
                  onClick={() => openOAuthPopup("auth/naver/login", "NaverLoginPopup")}
                />
                <img
                  className="w-10 h-10 cursor-pointer hover:scale-110 transition-transform"
                  alt="Kakao login"
                  src={kakao}
                  onClick={() => openOAuthPopup("auth/kakao/login", "KakaoLoginPopup")}
                />
                <img
                  className="w-10 h-10 cursor-pointer hover:scale-110 transition-transform"
                  alt="Google login"
                  src={google}
                  onClick={() => openOAuthPopup("auth/google/login", "GoogleLoginPopup")}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="relative w-full md:w-1/2 bg-[#5c4fff] text-white flex flex-col justify-center items-center rounded-l-2xl p-10">
          <div className="max-w-[546px] w-full flex flex-col gap-20 items-center">
            <div
              className="w-full h-[350px] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${saly10})` }}
            />
            <div className="w-full max-w-[400px] text-center">
              <h1 className="text-3xl md:text-4xl font-semibold font-[Poppins-SemiBold] mb-4">
                Sign in to email
              </h1>
              <p className="font-light font-[Poppins-Light] text-xl tracking-normal leading-normal">
                For your safe Web Surfing
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
