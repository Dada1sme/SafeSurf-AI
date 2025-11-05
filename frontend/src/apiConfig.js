const resolveApiConfig = () => {
  if (process.env.REACT_APP_API_URL) {
    return { baseOrigin: process.env.REACT_APP_API_URL, prefix: "" };
  }

  if (typeof window === "undefined") {
    return { baseOrigin: "http://localhost:8000", prefix: "" };
  }

  const { origin, port } = window.location;

  if (port === "3000") {
    return { baseOrigin: "http://localhost:8000", prefix: "" };
  }

  return { baseOrigin: origin, prefix: "/api" };
};

const { baseOrigin, prefix } = resolveApiConfig();

export const buildApiUrl = (path = "") => {
  const normalizedPath = path.replace(/^\/+/, "");
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");

  const url = new URL(baseOrigin);
  const segments = [];

  if (normalizedPath && normalizedPrefix && normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    segments.push(normalizedPath);
  } else {
    if (normalizedPrefix) {
      segments.push(normalizedPrefix);
    }
    if (normalizedPath) {
      segments.push(normalizedPath);
    }
  }

  url.pathname = segments.join("/");

  return url.toString();
};

export const API_BASE_URL = (() => {
  const url = buildApiUrl("");
  return url.endsWith("/") ? url : `${url}/`;
})();
