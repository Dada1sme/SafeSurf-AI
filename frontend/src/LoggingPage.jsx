import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import  icon  from "./assets/Icon.svg";
import  lefticon  from "./assets/lefticon.svg";
import  trash  from "./assets/trash.svg";
import eye from "./assets/eye.svg";
import rectangle from "./assets/rectangle.svg";
import image from "./assets/divider.svg";
import vector21 from "./assets/vector.svg";
import { buildApiUrl } from "./apiConfig";


// 검색 기록 state는 컴포넌트 내부에서 관리합니다.

const getStatusStyles = (status) => {
  if (status === "Offline") return "bg-[#fbf3f3] border-[#bc4141] text-[#bc4141]";
  return "bg-[#ebf9f1] border-[#41bc63] text-[#41bc63]"; // Online (green)
};

const getTagStyles = (tag) => {
  if (tag === "Dangerous") return "bg-[#fbf4f4] border-[#bc4141] text-[#bc4141]"; // red
  if (tag === "Suspicious") return "bg-[#fff8e1] border-[#ffa000] text-[#ffa000]"; // orange
  return "bg-[#ebf9f1] border-[#41bc63] text-[#41bc63]"; // Safe (green)
};

export const LoggingPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [searchHistoryData, setSearchHistoryData] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [inspectData, setInspectData] = useState({});
  const [loadingInspectId, setLoadingInspectId] = useState(null);

  const handleViewDetail = async (item) => {
    const token = localStorage.getItem("access_token");
    if (expandedRow === item.id) {
      setExpandedRow(null);
      return;
    }
    setLoadingInspectId(item.id);
    try {
      const config = {
        params: { url: item.url },
        withCredentials: true,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      };
      const res = await axios.get(buildApiUrl("inspect"), config);
      setInspectData((prev) => ({ ...prev, [item.id]: res.data }));
      setExpandedRow(item.id);
    } catch (err) {
      if (token) {
        localStorage.removeItem("access_token");
        try {
          const fallbackRes = await axios.get(buildApiUrl("inspect"), {
            params: { url: item.url },
            withCredentials: true,
          });
          setInspectData((prev) => ({ ...prev, [item.id]: fallbackRes.data }));
          setExpandedRow(item.id);
          return;
        } catch (fallbackErr) {
          console.error("❌ 상세 정보 재시도 실패:", fallbackErr);
        }
      }
      console.error("❌ 상세 정보 불러오기 실패:", err);
    } finally {
      setLoadingInspectId(null);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    try {
      const config = {
        withCredentials: true,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      };
      await axios.delete(buildApiUrl(`history/${id}`), config);
      setSearchHistoryData(searchHistoryData.filter((item) => item.id !== id));
    } catch (error) {
      if (token) {
        localStorage.removeItem("access_token");
        try {
          await axios.delete(buildApiUrl(`history/${id}`), { withCredentials: true });
          setSearchHistoryData(searchHistoryData.filter((item) => item.id !== id));
          return;
        } catch (fallbackErr) {
          console.error("❌ 삭제 재시도 실패:", fallbackErr);
        }
      }
      console.error("❌ 삭제 실패:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");
      const config = {
        withCredentials: true,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      };

      const fetchWithConfig = async (cfg) => {
        const userRes = await axios.get(buildApiUrl("auth/me"), cfg);
        const historyRes = await axios.get(buildApiUrl("history"), cfg);
        return { userRes, historyRes };
      };

      try {
        const { userRes, historyRes } = await fetchWithConfig(config);
        if (!cancelled) {
          setUsername(userRes.data.username);
          setSearchHistoryData(historyRes.data);
        }
      } catch (error) {
        if (token) {
          localStorage.removeItem("access_token");
          try {
            const fallbackConfig = { withCredentials: true };
            const { userRes, historyRes } = await fetchWithConfig(fallbackConfig);
            if (!cancelled) {
              setUsername(userRes.data.username);
              setSearchHistoryData(historyRes.data);
            }
            return;
          } catch (fallbackErr) {
            if (!cancelled) {
              console.error("❌ 쿠키 기반 재시도 실패:", fallbackErr);
            }
          }
        }
        if (!cancelled) {
          navigate("/login");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Pagination logic
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = searchHistoryData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(searchHistoryData.length / recordsPerPage);

  return (
    <div className="bg-white min-h-screen w-full relative overflow-x-auto">
      <div className="left-0 w-[1512px] h-[103px] bg-[#d9d9d9] absolute top-0" />

      {/* 사이드바 */}
      <aside className="flex flex-col justify-between absolute w-[280px] h-full top-0 left-0 bg-[#5c4fff] rounded-r-[40px]">
        <div>
          <header className="absolute top-[45px] left-[118px] font-extrabold text-white text-2xl">
            Log
          </header>
          <img className="absolute top-[113px] left-[22px] w-[251px] h-px object-cover" alt="Divider" src={image} />
          <nav className="absolute top-36 left-[22px]">
            <h2 className="font-semibold text-white text-base">Menu</h2>
            <button className="mt-[50px] w-[251px] h-12 flex gap-2 bg-white rounded">
              <icon className="!mt-3 !w-6 !h-6 !ml-3" />
              <span className="mt-[13px] text-[#5041bc] font-semibold text-base">Search histories</span>
            </button>
          </nav>
        </div>
        <div className="mb-6 px-[22px]">
          <img className="w-[251px] h-px mt-[29px] object-cover" alt="Divider" src={image} />
          <div className="h-12 relative">
            <div className="absolute top-px left-[3px] font-semibold text-white text-base">Profile</div>
            <div className="absolute top-px left-[161px] font-semibold text-white text-base">{username}</div>
          </div>
          <button
            className="w-[251px] h-[34px] flex items-center gap-2 bg-white rounded mt-2"
            onClick={async () => {
              try {
                await axios.post(buildApiUrl("auth/logout"), {}, { withCredentials: true });
              } catch (error) {
                console.warn("❌ 로그아웃 요청 실패:", error);
              } finally {
                localStorage.removeItem("access_token");
                navigate("/");
              }
            }}
          >
            <lefticon className="!h-5 !w-5 !ml-[80.5px]" />
            <span className="h-5 w-16 font-semibold text-[#5041bc] text-base">Log out</span>
          </button>
        </div>
      </aside>

      <div
        className="absolute top-0 left-[280px] right-0 bottom-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${rectangle})` }}
      />

      {/* 본문 */}
      <main className="absolute top-[38px] left-[300px] right-0 pr-8">
        <h1 className="h-[45px] flex items-end justify-center font-bold text-black text-[32px]">
          Search histories
        </h1>
        <div className="mt-[25px] w-full flex flex-col px-8">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-[500px]">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#5c4fff] border-opacity-70"></div>
              <p className="mt-4 text-[#5c4fff] font-semibold text-lg">Loading search history...</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="w-full h-[49px] bg-white">
                    <th className="px-6 py-3 font-bold text-black text-base text-center">URL</th>
                    <th className="px-6 py-3 font-bold text-black text-base text-left">Title</th>
                    <th className="px-6 py-3 font-bold text-black text-base text-left">Search Date & Time</th>
                    <th className="px-6 py-3 font-bold text-black text-base text-center">Status</th>
                    <th className="px-6 py-3 font-bold text-black text-base text-center">Tag</th>
                    <th className="px-6 py-3 font-bold text-black text-base text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500 text-base font-medium">
                        No search history available.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((item, index) => (
                      <React.Fragment key={item.id}>
                        <tr className={index % 2 === 0 ? "bg-[#f7f6fe]" : "bg-white"}>
                          <td className="text-center px-6 py-4 text-base">{item.url}</td>
                          <td className="text-left px-6 py-4 text-base">{item.title}</td>
                          <td className="text-left px-6 py-4 text-base">{item.searched_at}</td>
                          <td className="text-center px-6 py-4 text-base">
                            <span
                              className={`inline-block px-4 py-1 text-xs rounded-[22px] border ${getStatusStyles(
                                item.status,
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="text-center px-6 py-4 text-base">
                            <span
                              className={`inline-block px-4 py-1 text-xs rounded-[22px] border ${getTagStyles(
                                item.tag,
                              )}`}
                            >
                              {item.tag}
                            </span>
                          </td>
                          <td className="text-center px-6 py-4 text-base">
                            <div className="flex justify-center items-center gap-3">
                              <button aria-label="View" onClick={() => handleViewDetail(item)} className="hover:scale-110 transition-transform">
                                <img src={eye} alt="View" className="w-6 h-6" />
                              </button>
                              <button aria-label="Delete" onClick={() => handleDelete(item.id)} className="hover:scale-110 transition-transform">
                                <img src={trash} alt="Delete" className="w-6 h-6" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRow === item.id && (
                          <tr>
                            <td colSpan={6} className="bg-[#f9f9ff] border-l-4 border-[#5c4fff] rounded-xl p-6">
                              {loadingInspectId === item.id ? (
                                <div className="flex justify-center items-center py-10">
                                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#5c4fff] border-opacity-70"></div>
                                  <p className="ml-3 text-[#5c4fff] font-semibold">상세 분석 중...</p>
                                </div>
                              ) : (
                                <div>
                                  <h3 className="text-lg font-semibold text-[#5c4fff] mb-3">🔍 URL 분석 상세 내역</h3>

                                  {/* SSL Info */}
                                  {inspectData[item.id]?.ssl ? (
                                    <>
                                      <h4 className="text-md font-semibold text-[#5c4fff] mb-1">🔒 SSL Certificate</h4>
                                      <p><b>Issuer Organization:</b> {inspectData[item.id].ssl.issuer?.O || "N/A"}</p>
                                      <p><b>Subject CN:</b> {inspectData[item.id].ssl.subject?.CN || "N/A"}</p>
                                      <p><b>Expiration:</b> {inspectData[item.id].ssl.notAfter || "N/A"}</p>
                                    </>
                                  ) : <p>SSL 정보 없음</p>}

                                  {/* HTTP Headers */}
                                  <h4 className="text-md font-semibold text-[#5c4fff] mt-4 mb-1">📡 HTTP Headers</h4>
                                  <div className="overflow-y-scroll h-[180px] bg-white p-4 font-mono text-xs rounded">
                                    {inspectData[item.id]?.headers
                                      ? Object.entries(inspectData[item.id].headers).map(([key, val]) => (
                                          <p key={key}><b>{key}:</b> {String(val)}</p>
                                        ))
                                      : "로딩 중 또는 데이터 없음"}
                                  </div>

                                  {/* GEO Info */}
                                  <h4 className="text-md font-semibold text-[#5c4fff] mt-4 mb-1">🌍 Server Info</h4>
                                  {inspectData[item.id]?.geo ? (
                                    <>
                                      <p><b>Country:</b> {inspectData[item.id].geo.country || "N/A"}</p>
                                      <p><b>Region:</b> {inspectData[item.id].geo.regionName || "N/A"}</p>
                                      <p><b>Organization:</b> {inspectData[item.id].geo.org || "N/A"}</p>
                                      <p><b>ISP:</b> {inspectData[item.id].geo.isp || "N/A"}</p>
                                    </>
                                  ) : (
                                    <p>서버 정보 없음</p>
                                  )}

                                  {/* AI Reason */}
                                  <h4 className="text-md font-semibold text-[#5c4fff] mt-4 mb-1">🧠 AI Analysis Summary</h4>
                                  <div className="bg-[#f8f7ff] p-4 rounded-lg border border-[#d9d6ff] text-sm leading-relaxed">
                                    {inspectData[item.id]?.ai_reason ? (
                                      <p>{inspectData[item.id].ai_reason}</p>
                                    ) : (
                                      <p className="text-gray-500">AI 분석 근거 정보를 불러오는 중이거나 제공되지 않았습니다.</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
              {/* Pagination controls */}
              {searchHistoryData.length > 0 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === i + 1 ? "bg-[#5c4fff] text-white" : "bg-gray-200"
                      } hover:bg-[#5c4fff] hover:text-white transition-all`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 뒤로가기 버튼 */}
      <button
        className="absolute top-[124px] left-[250px] w-[39px] h-[39px] flex bg-white rounded-full border border-[#e6e6e6] shadow-md hover:bg-[#f0f0f0] hover:scale-105 transition-all duration-200"
        aria-label="Back"
        onClick={() => navigate("/")}
      >
        <div className="m-auto w-[20.8px] h-[20.8px] relative">
          <img className="absolute w-[25%] h-[50%] top-[20%] left-[32.69%]" alt="Back arrow" src={vector21} />
        </div>
      </button>
    </div>
  );
};
