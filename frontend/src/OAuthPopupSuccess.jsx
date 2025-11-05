import { useEffect } from "react";

function OAuthPopupSuccess() {
  useEffect(() => {
    try {
      // Popup was used for OAuth. The backend now sets the access_token as an HTTP-only cookie.
      // The popup does not need to read any token from URL. Simply notify parent to reload so
      // it picks up the cookie and authenticated state, then close the popup.
      if (window.opener && !window.opener.closed) {
        try {
          // trigger parent to redirect to main landing page
          window.opener.location.href = "/";
        } catch (e) {
          console.warn("Failed to reload opener:", e);
        }
        // close the popup
        window.close();
      } else {
        // If opener is not available (opened in same tab), redirect to landing
        window.location.href = "/";
      }
    } catch (e) {
      console.error("OAuth popup handling error:", e);
    }
  }, []);

  return (
    <div className="flex justify-center items-center h-screen text-lg text-gray-700">
      <p>Google 계정 인증 중입니다... 잠시만 기다려 주세요.</p>
    </div>
  );
}

export default OAuthPopupSuccess;
