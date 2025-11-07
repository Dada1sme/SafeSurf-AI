const STATUS_PRESETS = {
  phishing: { text: "위험", color: "#ef4444", detail: "피싱 의심 사이트입니다." },
  suspicious: { text: "주의", color: "#fb923c", detail: "의심스러운 패턴이 감지되었습니다." },
  legitimate: { text: "안전", color: "#10b981", detail: "SafeSurf AI가 안전하다고 판단했습니다." },
  unanalyzable: { text: "분석 불가", color: "#6b7280", detail: "필요한 데이터를 수집할 수 없습니다." },
  error: { text: "오류", color: "#6366f1", detail: "분석 요청 중 문제가 발생했습니다." }
};

const formatProbability = (probability) => {
  if (typeof probability !== "number") return "확률 정보 없음";
  return `위험 확률 ${(probability * 100).toFixed(2)}%`;
};

const renderStatus = (container, data) => {
  if (!data) {
    container.innerHTML =
      "<p>아직 분석된 기록이 없습니다. 페이지를 새로고침해 주세요.</p>";
    return;
  }

  const preset = STATUS_PRESETS[data.status] || STATUS_PRESETS.unanalyzable;

  container.innerHTML = `
    <div class="label" style="background:${preset.color}1a;color:${preset.color}">
      ${preset.text}
    </div>
    <div class="url">${data.url || "알 수 없는 URL"}</div>
    <p class="detail">
      ${preset.detail}
      ${data.status === "error" && data.message ? `<br />${data.message}` : ""}
      ${
        data.status === "phishing" || data.status === "suspicious"
          ? `<br />${formatProbability(data.probability)}`
          : data.status === "legitimate" && typeof data.probability === "number"
          ? `<br />${formatProbability(data.probability)}`
          : ""
      }
    </p>
    <p class="detail" style="font-size:12px;color:#9ca3af;margin-top:8px;">
      마지막 분석: ${new Date(data.checkedAt).toLocaleTimeString()}
    </p>
  `;
};

const init = async () => {
  const statusEl = document.getElementById("status");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      statusEl.innerHTML = "<p>활성 탭을 찾을 수 없습니다.</p>";
      return;
    }

    chrome.runtime.sendMessage(
      { type: "SAFESURF_GET_STATUS", tabId: tab.id },
      (response) => {
        if (chrome.runtime.lastError) {
          statusEl.innerHTML = `<p>확장 프로그램 오류: ${chrome.runtime.lastError.message}</p>`;
          return;
        }
        renderStatus(statusEl, response);
      }
    );
  } catch (error) {
    statusEl.innerHTML = `<p>정보를 불러오지 못했습니다: ${error.message}</p>`;
  }
};

document.addEventListener("DOMContentLoaded", init);
