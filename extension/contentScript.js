(() => {
  if (window.top !== window.self) {
    return;
  }

  let overlayEl = null;

  const COLORS = {
    phishing: { bg: "rgba(239,68,68,0.95)", text: "#fff", badge: "위험" },
    suspicious: { bg: "rgba(251,191,36,0.95)", text: "#111", badge: "주의" },
    error: { bg: "rgba(75,85,99,0.95)", text: "#fff", badge: "오류" }
  };

  const removeOverlay = () => {
    if (overlayEl?.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
  };

  const formatProbability = (probability) => {
    if (typeof probability !== "number") return "N/A";
    return `${(probability * 100).toFixed(2)}%`;
  };

  const createOverlay = (payload) => {
    const { status } = payload;
    const palette = COLORS[status] || COLORS.phishing;
    removeOverlay();

    overlayEl = document.createElement("div");
    overlayEl.id = "safesurf-warning-overlay";
    overlayEl.style.position = "fixed";
    overlayEl.style.top = "0";
    overlayEl.style.left = "0";
    overlayEl.style.right = "0";
    overlayEl.style.padding = "16px";
    overlayEl.style.background = palette.bg;
    overlayEl.style.color = palette.text;
    overlayEl.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    overlayEl.style.zIndex = "2147483647";
    overlayEl.style.display = "flex";
    overlayEl.style.justifyContent = "space-between";
    overlayEl.style.alignItems = "center";
    overlayEl.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";

    const infoWrapper = document.createElement("div");
    infoWrapper.style.display = "flex";
    infoWrapper.style.flexDirection = "column";

    const badge = document.createElement("span");
    badge.textContent = `SafeSurf AI · ${palette.badge}`;
    badge.style.fontWeight = "700";
    badge.style.marginBottom = "4px";

    const urlLine = document.createElement("span");
    urlLine.textContent = payload.url || window.location.href;
    urlLine.style.fontSize = "14px";
    urlLine.style.opacity = "0.9";

    const detailLine = document.createElement("span");
    detailLine.style.fontSize = "13px";
    detailLine.style.marginTop = "4px";
    detailLine.textContent =
      status === "error"
        ? payload.message || "백엔드 분석 요청에 실패했습니다."
        : `예측 결과: ${status.toUpperCase()} · 위험 확률 ${formatProbability(
            payload.probability
          )}`;

    infoWrapper.appendChild(badge);
    infoWrapper.appendChild(urlLine);
    infoWrapper.appendChild(detailLine);

    const actionsWrapper = document.createElement("div");
    actionsWrapper.style.display = "flex";
    actionsWrapper.style.alignItems = "center";
    actionsWrapper.style.gap = "8px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "무시";
    closeBtn.style.background = "transparent";
    closeBtn.style.border = "1px solid currentColor";
    closeBtn.style.borderRadius = "999px";
    closeBtn.style.padding = "6px 12px";
    closeBtn.style.color = "inherit";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontWeight = "600";
    closeBtn.addEventListener("click", removeOverlay);

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "페이지 나가기";
    exitBtn.style.background = "#fff";
    exitBtn.style.color = "#111";
    exitBtn.style.border = "none";
    exitBtn.style.borderRadius = "999px";
    exitBtn.style.padding = "8px 14px";
    exitBtn.style.cursor = "pointer";
    exitBtn.style.fontWeight = "700";
    exitBtn.addEventListener("click", () => {
      removeOverlay();
      window.location.href = "about:blank";
    });

    actionsWrapper.appendChild(closeBtn);
    if (status !== "error") {
      actionsWrapper.appendChild(exitBtn);
    }

    overlayEl.appendChild(infoWrapper);
    overlayEl.appendChild(actionsWrapper);
    document.body.appendChild(overlayEl);
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SAFESURF_WARNING") {
      createOverlay(message.payload || {});
    } else if (message?.type === "SAFESURF_CLEAR") {
      removeOverlay();
    }
  });
})();
