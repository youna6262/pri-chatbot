import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseApp";
import "./TeacherDashboard.css";

export default function TeacherDashboard() {
  const [works, setWorks] = useState([]);
  const [stats, setStats] = useState({ total: 0, priDist: {}, depthDist: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const classId = localStorage.getItem("pri_classId") || "";

  useEffect(() => {
    if (!classId) {
      setError("학급 코드가 없습니다. 먼저 로그인해주세요.");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "classes", classId, "works"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setWorks(list);

        // 통계 계산
        const priDist = {};
        const depthDist = {};
        list.forEach((w) => {
          const pri = w.fractalParams?.pri || "없음";
          const depth = w.fractalParams?.depth || 0;
          priDist[pri] = (priDist[pri] || 0) + 1;
          depthDist[depth] = (depthDist[depth] || 0) + 1;
        });

        setStats({ total: list.length, priDist, depthDist });
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [classId]);

  if (loading) return <div className="dashboard-loading">로딩 중...</div>;
  if (error) return <div className="dashboard-error">❌ {error}</div>;

  return (
    <div className="teacherDashboard">
      <h2>📊 우리반 대시보드</h2>

      <div className="statsGrid">
        <div className="statCard">
          <div className="statLabel">전체 작품</div>
          <div className="statValue">{stats.total}개</div>
        </div>

        <div className="statCard">
          <div className="statLabel">PRI 분포</div>
          <div className="statDist">
            {Object.entries(stats.priDist).map(([pri, count]) => (
              <div key={pri} className="distItem">
                <span className="distKey">{pri}</span>
                <span className="distVal">{count}개</span>
              </div>
            ))}
          </div>
        </div>

        <div className="statCard">
          <div className="statLabel">깊이 분포</div>
          <div className="statDist">
            {Object.entries(stats.depthDist).map(([depth, count]) => (
              <div key={depth} className="distItem">
                <span className="distKey">깊이 {depth}</span>
                <span className="distVal">{count}개</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3>최근 작품 (최대 50개)</h3>
      <div className="worksList">
        {works.length === 0 && <div className="emptyHint">아직 작품이 없습니다.</div>}
        {works.map((w) => (
          <div key={w.id} className="workCard">
            {w.thumbnail && (
              <img src={w.thumbnail} alt={w.title} className="workThumb" />
            )}
            <div className="workInfo">
              <div className="workTitle">{w.title || "제목 없음"}</div>
              <div className="workMeta">
                PRI: {w.fractalParams?.pri || "없음"} / 깊이: {w.fractalParams?.depth || 0} / 종류: {w.fractalParams?.type || "없음"}
              </div>
              <div className="workMeta">
                작성자: {w.nickname || "익명"} / 시간: {w.createdAt?.toDate?.()?.toLocaleString() || "알 수 없음"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}






