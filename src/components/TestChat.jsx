import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/firebaseApp";

export default function TestChat() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    if (!question.trim()) {
      setError("질문을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const chatPri = httpsCallable(functions, "chatPri");
      const res = await chatPri({ question: question.trim() });
      
      console.log("✅ chatPri 응답:", res.data);
      setResponse(res.data);
    } catch (err) {
      console.error("❌ chatPri error:", err);
      setError(err.message || "앗! 프리가 잠시 바빠서 답변을 못했어요. 😅");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>chatPri 함수 테스트</h2>
      
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="프리에게 질문하기... (예: 프랙탈이 뭐야?)"
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            marginBottom: "8px"
          }}
          onKeyDown={(e) => e.key === "Enter" && !loading && ask()}
          maxLength={500}
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            backgroundColor: loading ? "#ccc" : "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {loading ? "전송 중..." : "질문 보내기"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "8px",
            marginBottom: "16px"
          }}
        >
          ❌ {error}
        </div>
      )}

      {response && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f0f9ff",
            borderRadius: "12px",
            border: "2px solid #3b82f6"
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1e40af" }}>프리의 답변</h3>
          
          {response.shortAnswer && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ color: "#3b82f6", marginBottom: "8px" }}>📝 짧은 답</h4>
              <p style={{ margin: 0, lineHeight: "1.6" }}>{response.shortAnswer}</p>
            </div>
          )}

          {response.oneLineSummary && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ color: "#3b82f6", marginBottom: "8px" }}>✨ 한 줄 요약</h4>
              <p style={{ margin: 0, lineHeight: "1.6", fontWeight: "600" }}>
                {response.oneLineSummary}
              </p>
            </div>
          )}

          {response.nextQuestion && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ color: "#3b82f6", marginBottom: "8px" }}>❓ 다음 질문</h4>
              <p style={{ margin: 0, lineHeight: "1.6" }}>{response.nextQuestion}</p>
            </div>
          )}

          {response.raw && (
            <details style={{ marginTop: "16px" }}>
              <summary style={{ cursor: "pointer", color: "#666", fontSize: "14px" }}>
                원본 응답 보기
              </summary>
              <pre
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  overflow: "auto",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap"
                }}
              >
                {response.raw}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

