import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `Ты агент для анализа объявлений на сайте Блокет (blocket.se).
Найди объявления по запросу, переведи всё на русский язык, верни ТОЛЬКО JSON:
{
  "query": "запрос",
  "total_found": число,
  "price_analysis": { "min": число, "max": число, "average": число, "median": число },
  "listings": [{ "title": "название", "price": число или null, "location": "город", "description": "описание", "condition": "состояние", "url": "ссылка" }],
  "insights": { "price_trend": "текст", "popular_brands": [], "common_conditions": "текст", "best_deal": "текст", "recommendation": "текст" }
}`;

const formatSEK = n => n != null ? Math.round(n).toLocaleString("sv-SE") + " kr" : "—";
const formatDate = ts => new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("search");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  useEffect(() => {
    const k = localStorage.getItem("anthropic_key");
    if (k) setApiKey(k);
    try { setHistory(JSON.parse(localStorage.getItem("blocket_history") || "[]")); } catch {}
  }, []);

  const saveKey = () => { localStorage.setItem("anthropic_key", keyDraft); setApiKey(keyDraft); setShowKey(false); };
  const addHistory = e => { const u = [e, ...history].slice(0, 50); localStorage.setItem("blocket_history", JSON.stringify(u)); setHistory(u); };
  const delHistory = ts => { const u = history.filter(h => h.timestamp !== ts); localStorage.setItem("blocket_history", JSON.stringify(u)); setHistory(u); };

  const analyze = async () => {
    if (!query.trim() || !apiKey) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system: SYSTEM_PROMPT, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: `Найди объявления на blocket.se: "${query}". Верни только JSON.` }] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content.map(b => b.type === "text" ? b.text : "").join("\n");
      const match = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Нет данных");
      const parsed = JSON.parse(match[0]);
      setResult(parsed);
      addHistory({ ...parsed, timestamp: Date.now(), searchQuery: query });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const s = { page: { minHeight: "100vh", background: "#0d0d0d", color: "#f0ede8", fontFamily: "Georgia, serif", paddingBottom: "40px" } };

  return (
    <div style={s.page}>
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", background: "#e8460a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", color: "white", fontFamily: "sans-serif" }}>B</div>
          <div><div style={{ fontSize: "17px", fontWeight: "600" }}>Агент Блокет</div><div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif" }}>blocket.se</div></div>
        </div>
        <button onClick={() => setShowKey(v => !v)} style={{ background: apiKey ? "#1a2a1a" : "#2a1a1a", color: apiKey ? "#5a9a5a" : "#cc6655", border: "1px solid " + (apiKey ? "#2a4a2a" : "#4a2a2a"), borderRadius: "7px", padding: "7px 12px", fontSize: "11px", fontFamily: "sans-serif", cursor: "pointer" }}>
          {apiKey ? "🔑 Ключ задан" : "🔑 Добавить ключ"}
        </button>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 16px" }}>
        {showKey && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", marginBottom: "8px" }}>API ключ (console.anthropic.com)</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="password" value={keyDraft} onChange={e => setKeyDraft(e.target.value)} placeholder="sk-ant-..." style={{ flex: 1, background: "#0d0d0d", border: "1px solid #333", borderRadius: "8px", color: "#f0ede8", fontFamily: "monospace", fontSize: "13px", padding: "10px 12px", outline: "none" }} />
              <button onClick={saveKey} style={{ background: "#e8460a", color: "white", border: "none", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontFamily: "sans-serif", cursor: "pointer" }}>Сохранить</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
          {[["search", "🔍 Поиск"], ["history", "📋 История" + (history.length ? " (" + history.length + ")" : "")]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? "#2a2a2a" : "transparent", color: tab === k ? "#f0ede8" : "#666", border: "1px solid " + (tab === k ? "#3a3a3a" : "transparent"), borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontFamily: "sans-serif", cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {tab === "search" && (
          <>
            {!apiKey && <div style={{ background: "#1a1200", border: "1px solid #3a2a00", borderRadius: "12px", padding: "16px", marginBottom: "16px", color: "#cc9933", fontFamily: "sans-serif", fontSize: "13px" }}>⚠️ Добавь API ключ вверху</div>}
            <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#666", fontFamily: "sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Что ищем?</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()} placeholder="iPhone 14, cykel, soffa..." disabled={!apiKey} style={{ flex: 1, background: "#0d0d0d", border: "1px solid #333", borderRadius: "8px", color: "#f0ede8", fontFamily: "Georgia, serif", fontSize: "15px", padding: "12px 14px", outline: "none", opacity: !apiKey ? 0.4 : 1 }} />
                <button onClick={analyze} disabled={loading || !query.trim() || !apiKey} style={{ background: loading || !query.trim() || !apiKey ? "#333" : "#e8460a", color: "white", border: "none", borderRadius: "8px", padding: "12px 18px", fontSize: "14px", fontFamily: "sans-serif", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>{loading ? "⏳" : "Найти"}</button>
              </div>
            </div>
            {loading && <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "40px", textAlign: "center" }}><div style={{ fontSize: "28px", marginBottom: "10px" }}>🔍</div><div style={{ color: "#ccc", fontFamily: "sans-serif" }}>Ищу на blocket.se... (15-30 сек)</div></div>}
            {error && <div style={{ background: "#1a0a0a", border: "1px solid #5a1a1a", borderRadius: "12px", padding: "16px", color: "#ff6b6b", fontFamily: "sans-serif", fontSize: "13px" }}>⚠️ {error}</div>}
            {result && !loading && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px", marginBottom: "16px" }}>
                  {[["Найдено", (result.total_found || "?") + " объявл."], ["Средняя", formatSEK(result.price_analysis?.average)], ["Минимум", formatSEK(result.price_analysis?.min)], ["Максимум", formatSEK(result.price_analysis?.max)]].map(([l, v]) => (
                    <div key={l} style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px" }}>
                      <div style={{ fontSize: "10px", color: "#555", fontFamily: "sans-serif", textTransform: "uppercase", marginBottom: "5px" }}>{l}</div>
                      <div style={{ fontSize: "17px", fontWeight: "700", color: "#e8c87a" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {result.insights?.recommendation && (
                  <div style={{ background: "#0f1a0f", border: "1px solid #1e3a1e", borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#5a9a5a", fontFamily: "sans-serif", marginBottom: "8px" }}>💡 Рекомендация</div>
                    <div style={{ fontSize: "14px", color: "#d0f0d0", lineHeight: "1.6" }}>{result.insights.recommendation}</div>
                  </div>
                )}
                {result.listings?.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid #2a2a2a", fontSize: "10px", color: "#555", fontFamily: "sans-serif", textTransform: "uppercase" }}>Объявления ({result.listings.length})</div>
                    {result.listings.map((item, i) => (
                      <div key={i} style={{ padding: "14px 18px", borderBottom: i < result.listings.length - 1 ? "1px solid #1e1e1e" : "none", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#f0ede8", textDecoration: "underline", textDecorationColor: "#444" }}>{item.title}</a> : item.title}</div>
                          {item.description && <div style={{ fontSize: "12px", color: "#777", marginBottom: "4px" }}>{item.description}</div>}
                          <div style={{ display: "flex", gap: "8px" }}>
                            {item.location && <span style={{ fontSize: "11px", color: "#555", fontFamily: "sans-serif" }}>📍 {item.location}</span>}
                            {item.condition && <span style={{ fontSize: "11px", color: "#555", fontFamily: "sans-serif" }}>🏷 {item.condition}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: item.price ? "#e8c87a" : "#5a9a5a", whiteSpace: "nowrap", fontFamily: "sans-serif" }}>{item.price ? formatSEK(item.price) : "Бесплатно"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "17px", fontWeight: "600" }}>История</div>
            </div>
            {history.length === 0 && <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#555", fontFamily: "sans-serif" }}>История пуста</div>}
            {history.map(entry => (
              <div key={entry.timestamp} style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "18px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div><div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "3px" }}>{entry.searchQuery || entry.query}</div><div style={{ fontSize: "11px", color: "#555", fontFamily: "sans-serif" }}>🕐 {formatDate(entry.timestamp)}</div></div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => { setResult(entry); setQuery(entry.searchQuery || ""); setTab("search"); }} style={{ background: "#2a2a2a", color: "#ccc", border: "1px solid #3a3a3a", borderRadius: "7px", padding: "6px 12px", fontSize: "12px", fontFamily: "sans-serif", cursor: "pointer" }}>Открыть</button>
                    <button onClick={() => delHistory(entry.timestamp)} style={{ background: "transparent", color: "#555", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "6px 10px", fontSize: "12px", fontFamily: "sans-serif", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                  {[["Средняя", formatSEK(entry.price_analysis?.average)], ["Мин", formatSEK(entry.price_analysis?.min)], ["Макс", formatSEK(entry.price_analysis?.max)]].map(([l, v]) => (
                    <div key={l} style={{ background: "#0d0d0d", borderRadius: "8px", padding: "10px" }}>
                      <div style={{ fontSize: "10px", color: "#444", fontFamily: "sans-serif", textTransform: "uppercase", marginBottom: "3px" }}>{l}</div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8c87a" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
