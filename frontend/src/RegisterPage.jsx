import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "./apiConfig";
import user from "./assets/user.svg";
import invisible1 from "./assets/invisible-1.svg";
import padlock from "./assets/Icon_PW.svg"
import path351 from "./assets/path-35_1.svg";
import path361 from "./assets/path-36_1.svg";
import vector from "./assets/Icon_Email.svg";
import saly10 from "./assets/saly-10.svg";

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(buildApiUrl("signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        }),
      });
      const data = await response.json();
      if (
        response.ok &&
        (data.message === "회원가입 성공" || data.access_token)
      ) {
        localStorage.setItem("access_token", data.access_token);
        alert("회원가입이 완료되었습니다!");
        navigate("/");
        return;
      } else {
        // Handle error response
        console.error("❌ 서버 응답 오류:", data);
        // Friendly error handling
        if (Array.isArray(data.detail)) {
          // Pydantic validation errors
          if (data.detail.length > 0 && data.detail[0].msg) {
            let msg = data.detail[0].msg;
            // Localize password min length errors
            if (
              msg.includes("String should have at least") ||
              msg.includes("min_length")
            ) {
              msg = "비밀번호는 최소 6자 이상이어야 합니다.";
            }
            alert(msg);
          } else {
            alert("입력값에 문제가 있습니다. 다시 확인해주세요.");
          }
        } else if (typeof data.detail === "string") {
          // Known error messages
          if (data.detail.includes("이미 존재하는 사용자")) {
            alert(data.detail);
          } else {
            alert(data.detail);
          }
        } else {
          alert("서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }
    } catch (error) {
      console.error("🚨 회원가입 요청 중 오류:", error);
      alert(`회원가입 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
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
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(138deg,rgba(92,79,255,0.1)_0%,rgba(255,255,255,0.1)_20%,rgba(92,79,255,0.1)_44%,rgba(255,255,255,0.1)_76%,rgba(92,79,255,0.1)_100%)]" />


      <div className="flex flex-col md:flex-row w-full max-w-[1440px] min-h-screen mx-auto">
        <main className="flex-1 flex flex-col justify-center items-start px-6 md:px-16 py-8 bg-white">

          <div className="w-[334px] h-[121px] gap-[22px] flex flex-col">
            <h1 className="w-28 h-[45px] [font-family:'Poppins-Medium',Helvetica] font-medium text-black text-3xl tracking-[0] leading-[normal]">
              Sign up
            </h1>

            <div className="w-[336px] h-[54px] flex flex-col gap-1.5">
              <p className="w-[332px] h-6 [font-family:'Poppins-Regular',Helvetica] font-normal text-black text-base tracking-[0] leading-[normal]">
                If you already have an account register
              </p>

              <p className="w-[308px] h-6 [font-family:'Poppins-Regular',Helvetica] font-normal text-transparent text-base tracking-[0] leading-[normal]">
                <span className="text-black">You can&nbsp;&nbsp; </span>

                <a
                  href="/login"
                  className="[font-family:'Poppins-SemiBold',Helvetica] font-semibold text-[#0c21c1] hover:underline"
                >
                  Login here !
                </a>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="w-[429px] h-16 relative mt-[52px]">
              <label
                htmlFor="email"
                className="absolute w-[8.39%] h-[31.25%] top-0 left-0 [font-family:'Poppins-Medium',Helvetica] font-medium text-[#999999] text-[13px] tracking-[0] leading-[normal]"
              >
                Email
              </label>

              <div className="absolute w-full h-[3.12%] top-[96.88%] left-0 bg-[#000741]" />

              <div className="absolute w-[3.96%] h-[26.56%] top-[54.69%] left-0 flex px-0 py-[2.7px] items-start rotate-180">
                <img src={vector} alt="" className="w-[17px] h-3" />
              </div>

              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                aria-required="true"
                className="absolute w-[46.39%] h-[37.50%] top-[48.44%] left-[6.29%] [font-family:'Poppins-Regular',Helvetica] font-normal text-[#000741] text-base tracking-[0] leading-[normal] placeholder:text-[#000741]"
              />
            </div>

            <div className="w-[429px] h-16 relative mt-[42px]">
              <label
                htmlFor="username"
                className="absolute w-[15.85%] h-[31.25%] top-0 left-0 [font-family:'Poppins-Medium',Helvetica] font-medium text-[#999999] text-[13px] tracking-[0] leading-[normal]"
              >
                Username
              </label>

              <div className="absolute w-full h-[3.12%] top-[96.88%] left-0 bg-[#999999]" />

              <div className="absolute top-[33px] left-0 w-4 h-4 pointer-events-none">
                <img src={user} alt="User icon" className="w-full h-full" />
              </div>

              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your User name"
                required
                aria-required="true"
                className="absolute w-[39.86%] h-[37.50%] top-[48.44%] left-[6.29%] [font-family:'Poppins-Regular',Helvetica] font-normal text-[#000741] text-base tracking-[0] leading-[normal] placeholder:text-[#000741]"
              />
            </div>

            <div className="w-[432px] h-16 relative mt-[42px]">
              <label
                htmlFor="password"
                className="absolute top-0 left-px [font-family:'Poppins-Medium',Helvetica] font-medium text-[#999999] text-[13px] tracking-[0] leading-[normal]"
              >
                Password
              </label>

              <div className="absolute top-[62px] left-px w-[429px] h-0.5 bg-[#999999]" />

              <div className="absolute top-[30px] left-0 w-48 h-6 flex gap-[11px] pointer-events-none">
                <img
                  className="mt-[5px] w-[17px] h-[17px]"
                  alt=""
                  src={padlock}
                />
              </div>

              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your Password"
                required
                aria-required="true"
                className="absolute top-[30px] left-[28px] w-[162px] h-6 [font-family:'Poppins-Regular',Helvetica] font-normal text-[#000741] text-base tracking-[0] leading-[normal] placeholder:text-[#000741]"
              />

              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-[39px] left-[416px] w-3.5 h-3.5 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <img className="w-full h-full" alt="" src={invisible1} />
              </button>
            </div>

            <div className="w-[432px] h-16 relative mt-[42px]">
              <label
                htmlFor="confirmPassword"
                className="absolute top-0 left-px [font-family:'Poppins-Medium',Helvetica] font-medium text-[#999999] text-[13px] tracking-[0] leading-[normal]"
              >
                Confirm Password
              </label>

              <div className="absolute top-[62px] left-px w-[429px] h-0.5 bg-[#999999]" />

              <div className="absolute top-[30px] left-0 w-[216px] h-6 flex gap-[11px] pointer-events-none">
                <img
                  className="mt-[3px] w-[17px] h-[17px]"
                  alt=""
                  src={padlock}
                />
              </div>

              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your Password"
                required
                aria-required="true"
                className="absolute top-[30px] left-[28px] w-[186px] h-6 [font-family:'Poppins-Regular',Helvetica] font-normal text-[#000741] text-base tracking-[0] leading-[normal] placeholder:text-[#000741]"
              />

              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="absolute top-[39px] left-[416px] w-3.5 h-3.5 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <img className="w-full h-full" alt="" src={invisible1} />
              </button>
            </div>

            <div className="ml-px w-[431px] h-[53px] relative mt-[58px]">
              <button
                type="submit"
                className="absolute top-0 left-0 w-[429px] h-[53px] bg-[#5648e0] rounded-[32px] shadow-[0px_4px_26px_#00000040] cursor-pointer hover:bg-[#4a3dd4] transition-colors"
              >
                <span className="absolute top-3.5 left-[180px] [font-family:'Poppins-Medium',Helvetica] font-medium text-white text-[17px] tracking-[0] leading-[normal]">
                  Register
                </span>
              </button>
            </div>
          </form>
        </main>

        <aside className="flex-1 bg-[#5c4fff] text-white flex flex-col justify-center items-center rounded-l-2xl p-10">
          <img
            src={saly10}
            alt="Illustration of person working at desk"
            className="object-contain max-w-[400px] w-3/4 h-auto mb-8"
          />
          <h2 className="[font-family:'Poppins-SemiBold',Helvetica] font-semibold text-white text-[40px] tracking-[0] leading-[normal] mb-4 text-center">
            Sign Up to email
          </h2>
          <p className="[font-family:'Poppins-Light',Helvetica] font-light text-white text-xl tracking-[0] leading-[normal] text-center max-w-md">
            For your safe Web Surfing
          </p>
        </aside>
      </div>
    </div>
  );
};
