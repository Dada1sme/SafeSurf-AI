import {
  API_BASE_URL,
  ANALYZE_ENDPOINT,
  CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  RISK_RESULTS
} from "./config.js";

const resultCache = new Map();
const tabEvaluations = new Map();

const buildEndpoint = () => {
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  return `${base}${ANALYZE_ENDPOINT}`;
};

const normalizeUrl = (rawUrl) => {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
};

const cacheResult = (url, data) => {
  resultCache.set(url, { timestamp: Date.now(), data });
  if (resultCache.size > 100) {
    const oldestKey = resultCache.keys().next().value;
    resultCache.delete(oldestKey);
  }
};

const getCachedResult = (url) => {
  const cached = resultCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    resultCache.delete(url);
    return null;
  }
  return cached.data;
};

const notifyTab = async (tabId, payload) => {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (error) {
    // Tabs such as chrome://, pdf viewers, or discarded tabs cannot receive messages.
  }
};

const setTabEvaluation = (tabId, data) => {
  tabEvaluations.set(tabId, {
    ...data,
    tabId,
    checkedAt: new Date().toISOString()
  });
};

const handleAnalysisResult = async (tabId, url, result) => {
  cacheResult(url, result);
  const status = result?.result || "unanalyzable";
  const probability =
    typeof result?.probability === "number" ? result.probability : null;

  setTabEvaluation(tabId, {
    url,
    status,
    probability,
    raw: result
  });

  if (status && RISK_RESULTS.has(status)) {
    await notifyTab(tabId, {
      type: "SAFESURF_WARNING",
      payload: {
        url,
        status,
        probability: result?.probability,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    await notifyTab(tabId, { type: "SAFESURF_CLEAR" });
  }
};

const analyzeUrl = async (tabId, url) => {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return;
  }

  const cached = getCachedResult(normalized);
  if (cached) {
    await handleAnalysisResult(tabId, normalized, cached);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`SafeSurf AI 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    await handleAnalysisResult(tabId, normalized, data);
  } catch (error) {
    setTabEvaluation(tabId, {
      url: normalized,
      status: "error",
      probability: null,
      message: error.message
    });
    await notifyTab(tabId, {
      type: "SAFESURF_WARNING",
      payload: {
        url: normalized,
        status: "error",
        message: error.message || "분석 요청에 실패했습니다."
      }
    });
  } finally {
    clearTimeout(timeout);
  }
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab?.url) {
    analyzeUrl(tabId, tab.url);
  } else if (changeInfo.url) {
    analyzeUrl(tabId, changeInfo.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab?.url) {
    analyzeUrl(activeInfo.tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvaluations.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SAFESURF_GET_STATUS") {
    const entry = tabEvaluations.get(message.tabId) || null;
    sendResponse(entry);
    return true;
  }
  return false;
});
