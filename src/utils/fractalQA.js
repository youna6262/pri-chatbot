// 질문 버튼만 표시하는 패널 초기화
export function initFractalQAPrompts() {
  const root = document.getElementById("fractal-qa-prompts-root");
  if(!root) return;
  
  // 이미 마운트되었는지 확인
  if (root.hasAttribute("data-qa-prompts-mounted")) return;
  root.setAttribute("data-qa-prompts-mounted", "true");

  (function(){
    // ---------- 0) 공통: 파라미터 연결(React/바닐라 공용) ----------
    function readParams(){
      // ✅ 1순위: MakeFractal에서 매번 동기화해 주는 전역 값
      const wp = (typeof window !== "undefined") ? window.fractalParams : null;
      if (wp && typeof wp === "object") {
        return {
          fractalType: wp.fractalType ?? "tree",   // "tree" | "sierpinski" | "koch"
          angle: Number(wp.angle ?? 25),
          ratio: Number(wp.ratio ?? 0.72),
          depth: Number(wp.depth ?? 7),
        };
      }

      // ✅ 2순위: bg 단계에서만 존재하는 DOM 값(있을 때만)
      const typeEl = document.querySelector("#fractalType");
      const angleEl = document.querySelector("#angle");
      const ratioEl = document.querySelector("#ratio");
      const depthEl = document.querySelector("#depth");

      return {
        fractalType: typeEl?.value ?? "tree",
        angle: Number(angleEl?.value ?? 25),
        ratio: Number(ratioEl?.value ?? 0.72),
        depth: Number(depthEl?.value ?? 7),
      };
    }

    function typeLabel(t){
      return t === "tree" ? "프랙탈 나무"
        : t === "sierpinski" ? "시어핀스키 삼각형"
        : "코흐 눈송이";
    }

    function fmt(n){ return Math.round(n*100)/100; }

    function generateAnswer(tab, qid, params, title){
      const t = params.fractalType;
      const a = params.angle, r = params.ratio, d = params.depth;

      if(tab === "principle"){
        if(qid === "repeat"){
          if(t === "tree"){
            return `반복은 "같은 가지 규칙을 계속 적용하는 것"이야.\n지금 단계가 ${d}라서 가지가 규칙대로 ${d}번 반복되어 늘어나.\n→ 단계가 커질수록 더 촘촘해져.`;
          }
          if(t === "sierpinski"){
            return `시어핀스키 삼각형의 반복은 이거야: "큰 삼각형을 4개로 나누고 가운데를 비우기"를 계속 반복!\n단계 ${d}일수록 빈 공간(구멍)과 작은 삼각형이 계속 늘어나.`;
          }
          return `코흐 눈송이의 반복은 "한 변을 3등분 → 가운데를 삼각형 봉우리로 바꾸기"를 계속 하는 거야.\n단계 ${d}일수록 변이 더 울퉁불퉁해지고 길이도 늘어 보여.`;
        }
        if(qid === "selfsimilar"){
          if(t === "tree"){
            return `자기닮음은 작은 가지가 큰 가지의 축소판처럼 보이는 현상이야.\n매번 길이를 ${fmt(r)}배로 줄이고 같은 방식으로 갈라지니까 부분이 전체를 닮아 보여.`;
          }
          if(t === "sierpinski"){
            return `시어핀스키는 "전체 삼각형 모양이 작은 삼각형들 안에 반복해서 나타나는" 자기닮음이야.\n큰 삼각형 안에 작은 삼각형 3개가 있고, 그 안에서도 또 같은 패턴이 반복돼.`;
          }
          return `코흐 눈송이는 "전체의 톱니(봉우리) 모양이 작은 크기에서도 똑같이 반복되는" 자기닮음이야.\n한 번 만든 톱니를 다시 더 작은 톱니로 바꾸는 규칙이 반복돼.`;
        }
        if(qid === "complex"){
          if(t === "tree"){
            return `단계를 올리면 가지 분기 횟수가 늘어나서 가지 수가 빠르게 많아져.\n그래서 겹치고 촘촘해져서 더 복잡해 보여.`;
          }
          if(t === "sierpinski"){
            return `단계를 올리면 "가운데를 비우는 작업"이 더 작은 삼각형에서도 계속 일어나.\n그래서 구멍(빈 공간)이 늘고 패턴이 더 촘촘해져 복잡해 보여.`;
          }
          return `단계를 올리면 각 변이 더 잘게 쪼개지고, 봉우리가 더 많이 생겨.\n그래서 윤곽선이 점점 더 복잡한 눈송이처럼 보여.`;
        }
        if(qid === "angle"){
          if(t !== "tree"){
            return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 각도보다는 '단계(반복)'가 모양을 더 크게 바꿔!`;
          }
          const feel = (a<20)?"좁게 모이는 느낌":(a<45)?"자연스럽게 퍼지는 느낌":"넓게 펼쳐지는 느낌";
          return `각도(∠)는 가지가 벌어지는 방향을 정해.\n지금은 ${a}°라서 ${feel}이야.\n각도를 키우면 더 넓게, 줄이면 더 좁게 모여 보여.`;
        }
        if(qid === "ratio"){
          if(t !== "tree"){
            return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 길이 비율 대신 '단계(반복)' 관찰이 핵심이야!`;
          }
          const feel = (r<0.62)?"빨리 짧아져 단정해짐":(r<0.75)?"균형 있게 줄어듦":"길게 유지되어 크게 뻗음";
          return `길이 비율은 다음 가지가 이전 가지의 몇 배 길이인지야.\n지금 비율 ${fmt(r)}에서는 가지가 ${feel}.\n비율이 일정해서 자기닮음이 더 뚜렷해져.`;
        }
      }
      if(tab === "share"){
        if(qid==="titlehelp"){
          if(t === "tree"){
            const vibe = (a>=45)?"퍼짐":(a<=18)?"집중":"균형";
            return `제목 아이디어:\n- 규칙이 만든 ${vibe}의 나무\n- ∠${a}° · 비율 ${fmt(r)} · 단계 ${d}\n- 반복으로 자라는 프랙탈\n- 부분이 전체를 닮는 숲`;
          }
          if(t === "sierpinski"){
            return `제목 아이디어:\n- 구멍이 늘어나는 삼각형\n- 단계 ${d}의 시어핀스키\n- 반복으로 생긴 패턴\n- 부분이 전체를 닮는 삼각형`;
          }
          return `제목 아이디어:\n- 울퉁불퉁한 눈송이\n- 단계 ${d}의 코흐 곡선\n- 반복으로 생긴 톱니\n- 부분이 전체를 닮는 눈송이`;
        }
        if(qid==="explain"){
          const name = typeLabel(t);
          if(t === "tree"){
            const tt = title ? `「${title}」` : "내 작품";
            return `${tt}은(는) ${name}로, ∠${a}°와 비율 ${fmt(r)} 규칙을 ${d}단계 반복해 만들었어.\n같은 규칙이 반복되면서 작은 부분이 전체를 닮는 '자기닮음'이 나타나.`;
          }
          const tt = title ? `「${title}」` : "내 작품";
          return `${tt}은(는) ${name}로, '같은 분할 규칙'을 ${d}단계 반복해 만든 프랙탈이야.\n반복될수록 작은 부분에서도 같은 패턴이 나타나는 '자기닮음'을 볼 수 있어.`;
        }
        if(qid==="compare"){
          if(t === "tree"){
            return `한 줄 정리: ∠${a}° / 비율 ${fmt(r)} / 단계 ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
          }
          return `한 줄 정리: ${typeLabel(t)} / 단계(반복) ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
        }
      }
      if(tab === "ethics"){
        if(qid==="aiwhat"){
          return `AI의 '이해'는 사람처럼 느끼는 게 아니라, 많은 예시에서 패턴을 학습해 결과를 계산하는 거야.\n그래서 AI 답은 근거(조건/규칙)를 확인하고 내 말로 다시 정리하는 게 중요해.`;
        }
        if(qid==="bias"){
          return `AI는 자료의 영향으로 틀리거나 한쪽으로 치우칠 수 있어.\n그래서 근거를 요구하고("왜?"), 다른 표현으로 다시 질문해 검증하는 습관이 필요해.`;
        }
        if(qid==="copyright"){
          return `공유할 때 출처를 남기는 건 만든 사람의 권리를 존중하고, 내 작품의 신뢰도도 높이기 위해서야.\n남의 그림/사진을 썼다면 "어디서 가져왔는지"를 꼭 밝혀야 해.`;
        }
        if(qid==="prompt"){
          return `좋은 질문은 조건을 구체적으로 쓰는 거야.\n예: "각도 ${a}°, 비율 ${fmt(r)}, 단계 ${d}에서 자기닮음이 생기는 이유를 2문장으로 설명해줘."\n그리고 답을 받은 뒤 내 말로 한 줄 요약해보자.`;
        }
      }
      return "다른 질문 버튼도 눌러보자!";
    }

    const QUESTIONS = {
      principle: [
        { id:"repeat", text:"프랙탈에서 '반복'은 어디에서 보이나요?" },
        { id:"selfsimilar", text:"'부분이 전체를 닮는' 모습은 무엇인가요?" },
        { id:"complex", text:"단계를 올리면 왜 더 복잡해지나요?" },
        { id:"angle", text:"각도(∠)가 바뀌면 모양이 어떻게 달라지나요?" },
        { id:"ratio", text:"길이 비율이 바뀌면 어떤 차이가 생기나요?" }
      ],
      share: [
        { id:"titlehelp", text:"내 작품에 어울리는 제목 추천해줘" },
        { id:"explain", text:"발표용 설명을 2문장으로 만들어줘" },
        { id:"compare", text:"내 규칙(각도·비율·단계)을 한 줄로 정리해줘" }
      ],
      ethics: [
        { id:"aiwhat", text:"AI가 프랙탈을 '이해'한다는 건 무슨 뜻인가요?" },
        { id:"bias", text:"AI가 그림/설명을 할 때 조심할 점은?" },
        { id:"copyright", text:"작품 공유할 때 저작권/출처는 왜 중요하죠?" },
        { id:"prompt", text:"AI에게 질문(프롬프트)할 때 좋은 태도는?" }
      ]
    };

    const STYLE = `
      <style>
        :root{ --stroke:#ffd2dc; --stroke2:#ffc1d0; --pink:#ff7aa6; --pink2:#ff9fbe; --muted:#6a5d62; --shadow:0 10px 30px rgba(255,122,166,.18); }
        .qaPromptsCard{ margin-top:0; background:#ffffffcc; border:1px solid var(--stroke); border-radius:22px; box-shadow:var(--shadow); overflow:hidden; font-family: ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo","Noto Sans KR"; }
        .qaPromptsHead{ padding:18px 18px 12px; text-align:center; border-bottom:1px solid rgba(255,210,220,.7); background:linear-gradient(180deg,#fff9fb 0%, #fff6f8 100%); }
        .qaPromptsHead h1{ margin:0; font-size:22px; font-weight:950; letter-spacing:-.8px; color:#ff6a9a; }
        .qaPromptsHead .sub{ margin-top:6px; font-size:12px; color:var(--muted); font-weight:600; }
        .qaPromptsTabs{ padding:12px 18px 10px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
        .qaPromptsTab{ border:2px solid var(--stroke2); background:#fff; color:#5a4c52; border-radius:999px; padding:8px 12px; font-weight:900; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 8px 18px rgba(255,122,166,.10); font-size:12px; }
        .qaPromptsTab.active{ background:linear-gradient(90deg,#ff8bb3 0%, #ffb1c7 100%); border-color:transparent; color:#fff; }
        .qaPromptsChips{ padding:6px 18px 14px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .qaPromptsChip{ border:1px solid var(--stroke2); background:#fff; border-radius:999px; padding:8px 12px; cursor:pointer; font-weight:800; color:#6a4e58; font-size:12px; transition:.15s ease; }
        .qaPromptsChip:hover{ transform:translateY(-1px); box-shadow:0 10px 18px rgba(255,122,166,.12); }
      </style>
    `;

    root.innerHTML = STYLE + `
      <section class="qaPromptsCard">
        <div class="qaPromptsHead">
          <h1>프리 질문 🧚</h1>
          <div class="sub">질문 버튼을 눌러보세요</div>
        </div>

        <div class="qaPromptsTabs" id="qaPromptsTabs"></div>
        <div class="qaPromptsChips" id="qaPromptsChips"></div>
      </section>
    `;

    const tabs = root.querySelector("#qaPromptsTabs");
    const chips = root.querySelector("#qaPromptsChips");

    let activeTab = "principle";

    function renderTabs(){
      tabs.innerHTML = "";
      ["principle","share","ethics"].forEach(k=>{
        const label = k==="principle"?"🔎 원리":k==="share"?"🏷️ 발표":"🤖 윤리";
        const b = document.createElement("button");
        b.className = "qaPromptsTab" + (activeTab===k?" active":"");
        b.textContent = label;
        b.onclick = ()=> {
          activeTab = k;
          renderTabs();
          renderChips();
        };
        tabs.appendChild(b);
      });
    }

    function renderChips(){
      chips.innerHTML = "";
      QUESTIONS[activeTab].forEach(q=>{
        const b = document.createElement("button");
        b.className = "qaPromptsChip";
        b.textContent = q.text;
        b.onclick = ()=>{
          // 질문 버튼 클릭 시 prefill-chat 이벤트 발생
          window.dispatchEvent(new CustomEvent("prefill-chat", { detail: q.text }));
        };
        chips.appendChild(b);
      });
    }

    renderTabs();
    renderChips();
  })();
}

// 채팅만 표시하는 패널 초기화
export function initFractalQAChat() {
  const root = document.getElementById("fractal-qa-chat-root");
  if(!root) return;
  
  // 이미 마운트되었는지 확인
  if (root.hasAttribute("data-qa-chat-mounted")) return;
  root.setAttribute("data-qa-chat-mounted", "true");

  (function(){
    function readParams(){
      const wp = (typeof window !== "undefined") ? window.fractalParams : null;
      if (wp && typeof wp === "object") {
        return {
          fractalType: wp.fractalType ?? "tree",
          angle: Number(wp.angle ?? 25),
          ratio: Number(wp.ratio ?? 0.72),
          depth: Number(wp.depth ?? 7),
        };
      }
      const typeEl = document.querySelector("#fractalType");
      const angleEl = document.querySelector("#angle");
      const ratioEl = document.querySelector("#ratio");
      const depthEl = document.querySelector("#depth");
      return {
        fractalType: typeEl?.value ?? "tree",
        angle: Number(angleEl?.value ?? 25),
        ratio: Number(ratioEl?.value ?? 0.72),
        depth: Number(depthEl?.value ?? 7),
      };
    }

    function typeLabel(t){
      return t === "tree" ? "프랙탈 나무"
        : t === "sierpinski" ? "시어핀스키 삼각형"
        : "코흐 눈송이";
    }

    function fmt(n){ return Math.round(n*100)/100; }

    function generateAnswer(tab, qid, params, title){
      const t = params.fractalType;
      const a = params.angle, r = params.ratio, d = params.depth;

      if(tab === "principle"){
        if(qid === "repeat"){
          if(t === "tree"){
            return `반복은 "같은 가지 규칙을 계속 적용하는 것"이야.\n지금 단계가 ${d}라서 가지가 규칙대로 ${d}번 반복되어 늘어나.\n→ 단계가 커질수록 더 촘촘해져.`;
          }
          if(t === "sierpinski"){
            return `시어핀스키 삼각형의 반복은 이거야: "큰 삼각형을 4개로 나누고 가운데를 비우기"를 계속 반복!\n단계 ${d}일수록 빈 공간(구멍)과 작은 삼각형이 계속 늘어나.`;
          }
          return `코흐 눈송이의 반복은 "한 변을 3등분 → 가운데를 삼각형 봉우리로 바꾸기"를 계속 하는 거야.\n단계 ${d}일수록 변이 더 울퉁불퉁해지고 길이도 늘어 보여.`;
        }
        if(qid === "selfsimilar"){
          if(t === "tree"){
            return `자기닮음은 작은 가지가 큰 가지의 축소판처럼 보이는 현상이야.\n매번 길이를 ${fmt(r)}배로 줄이고 같은 방식으로 갈라지니까 부분이 전체를 닮아 보여.`;
          }
          if(t === "sierpinski"){
            return `시어핀스키는 "전체 삼각형 모양이 작은 삼각형들 안에 반복해서 나타나는" 자기닮음이야.\n큰 삼각형 안에 작은 삼각형 3개가 있고, 그 안에서도 또 같은 패턴이 반복돼.`;
          }
          return `코흐 눈송이는 "전체의 톱니(봉우리) 모양이 작은 크기에서도 똑같이 반복되는" 자기닮음이야.\n한 번 만든 톱니를 다시 더 작은 톱니로 바꾸는 규칙이 반복돼.`;
        }
        if(qid === "complex"){
          if(t === "tree"){
            return `단계를 올리면 가지 분기 횟수가 늘어나서 가지 수가 빠르게 많아져.\n그래서 겹치고 촘촘해져서 더 복잡해 보여.`;
          }
          if(t === "sierpinski"){
            return `단계를 올리면 "가운데를 비우는 작업"이 더 작은 삼각형에서도 계속 일어나.\n그래서 구멍(빈 공간)이 늘고 패턴이 더 촘촘해져 복잡해 보여.`;
          }
          return `단계를 올리면 각 변이 더 잘게 쪼개지고, 봉우리가 더 많이 생겨.\n그래서 윤곽선이 점점 더 복잡한 눈송이처럼 보여.`;
        }
        if(qid === "angle"){
          if(t !== "tree"){
            return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 각도보다는 '단계(반복)'가 모양을 더 크게 바꿔!`;
          }
          const feel = (a<20)?"좁게 모이는 느낌":(a<45)?"자연스럽게 퍼지는 느낌":"넓게 펼쳐지는 느낌";
          return `각도(∠)는 가지가 벌어지는 방향을 정해.\n지금은 ${a}°라서 ${feel}이야.\n각도를 키우면 더 넓게, 줄이면 더 좁게 모여 보여.`;
        }
        if(qid === "ratio"){
          if(t !== "tree"){
            return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 길이 비율 대신 '단계(반복)' 관찰이 핵심이야!`;
          }
          const feel = (r<0.62)?"빨리 짧아져 단정해짐":(r<0.75)?"균형 있게 줄어듦":"길게 유지되어 크게 뻗음";
          return `길이 비율은 다음 가지가 이전 가지의 몇 배 길이인지야.\n지금 비율 ${fmt(r)}에서는 가지가 ${feel}.\n비율이 일정해서 자기닮음이 더 뚜렷해져.`;
        }
      }
      if(tab === "share"){
        if(qid==="titlehelp"){
          if(t === "tree"){
            const vibe = (a>=45)?"퍼짐":(a<=18)?"집중":"균형";
            return `제목 아이디어:\n- 규칙이 만든 ${vibe}의 나무\n- ∠${a}° · 비율 ${fmt(r)} · 단계 ${d}\n- 반복으로 자라는 프랙탈\n- 부분이 전체를 닮는 숲`;
          }
          if(t === "sierpinski"){
            return `제목 아이디어:\n- 구멍이 늘어나는 삼각형\n- 단계 ${d}의 시어핀스키\n- 반복으로 생긴 패턴\n- 부분이 전체를 닮는 삼각형`;
          }
          return `제목 아이디어:\n- 울퉁불퉁한 눈송이\n- 단계 ${d}의 코흐 곡선\n- 반복으로 생긴 톱니\n- 부분이 전체를 닮는 눈송이`;
        }
        if(qid==="explain"){
          const name = typeLabel(t);
          if(t === "tree"){
            const tt = title ? `「${title}」` : "내 작품";
            return `${tt}은(는) ${name}로, ∠${a}°와 비율 ${fmt(r)} 규칙을 ${d}단계 반복해 만들었어.\n같은 규칙이 반복되면서 작은 부분이 전체를 닮는 '자기닮음'이 나타나.`;
          }
          const tt = title ? `「${title}」` : "내 작품";
          return `${tt}은(는) ${name}로, '같은 분할 규칙'을 ${d}단계 반복해 만든 프랙탈이야.\n반복될수록 작은 부분에서도 같은 패턴이 나타나는 '자기닮음'을 볼 수 있어.`;
        }
        if(qid==="compare"){
          if(t === "tree"){
            return `한 줄 정리: ∠${a}° / 비율 ${fmt(r)} / 단계 ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
          }
          return `한 줄 정리: ${typeLabel(t)} / 단계(반복) ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
        }
      }
      if(tab === "ethics"){
        if(qid==="aiwhat"){
          return `AI의 '이해'는 사람처럼 느끼는 게 아니라, 많은 예시에서 패턴을 학습해 결과를 계산하는 거야.\n그래서 AI 답은 근거(조건/규칙)를 확인하고 내 말로 다시 정리하는 게 중요해.`;
        }
        if(qid==="bias"){
          return `AI는 자료의 영향으로 틀리거나 한쪽으로 치우칠 수 있어.\n그래서 근거를 요구하고("왜?"), 다른 표현으로 다시 질문해 검증하는 습관이 필요해.`;
        }
        if(qid==="copyright"){
          return `공유할 때 출처를 남기는 건 만든 사람의 권리를 존중하고, 내 작품의 신뢰도도 높이기 위해서야.\n남의 그림/사진을 썼다면 "어디서 가져왔는지"를 꼭 밝혀야 해.`;
        }
        if(qid==="prompt"){
          return `좋은 질문은 조건을 구체적으로 쓰는 거야.\n예: "각도 ${a}°, 비율 ${fmt(r)}, 단계 ${d}에서 자기닮음이 생기는 이유를 2문장으로 설명해줘."\n그리고 답을 받은 뒤 내 말로 한 줄 요약해보자.`;
        }
      }
      return "다른 질문 버튼도 눌러보자!";
    }

    const QUESTIONS = {
      principle: [
        { id:"repeat", text:"프랙탈에서 '반복'은 어디에서 보이나요?" },
        { id:"selfsimilar", text:"'부분이 전체를 닮는' 모습은 무엇인가요?" },
        { id:"complex", text:"단계를 올리면 왜 더 복잡해지나요?" },
        { id:"angle", text:"각도(∠)가 바뀌면 모양이 어떻게 달라지나요?" },
        { id:"ratio", text:"길이 비율이 바뀌면 어떤 차이가 생기나요?" }
      ],
      share: [
        { id:"titlehelp", text:"내 작품에 어울리는 제목 추천해줘" },
        { id:"explain", text:"발표용 설명을 2문장으로 만들어줘" },
        { id:"compare", text:"내 규칙(각도·비율·단계)을 한 줄로 정리해줘" }
      ],
      ethics: [
        { id:"aiwhat", text:"AI가 프랙탈을 '이해'한다는 건 무슨 뜻인가요?" },
        { id:"bias", text:"AI가 그림/설명을 할 때 조심할 점은?" },
        { id:"copyright", text:"작품 공유할 때 저작권/출처는 왜 중요하죠?" },
        { id:"prompt", text:"AI에게 질문(프롬프트)할 때 좋은 태도는?" }
      ]
    };

    const STYLE = `
      <style>
        :root{ --stroke:#ffd2dc; --stroke2:#ffc1d0; --pink:#ff7aa6; --pink2:#ff9fbe; --muted:#6a5d62; --shadow:0 10px 30px rgba(255,122,166,.18); }
        .qaChatCard{ background:#ffffffcc; border:1px solid var(--stroke); border-radius:22px; box-shadow:var(--shadow); overflow:hidden; font-family: ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo","Noto Sans KR"; height: 100%; display: flex; flex-direction: column; }
        .qaChatBox{ flex: 1; padding: 14px 14px 20px; overflow-y: auto; min-height: 0; }
        .qaChatMsg{ display:flex; gap:10px; margin:10px 0; align-items:flex-start; }
        .qaChatMsg.user{ justify-content:flex-end; }
        .qaChatAvatar{ width:34px; height:34px; border-radius:999px; display:grid; place-items:center; font-size:18px; border:1px solid var(--stroke2); background:#fff; }
        .qaChatBubble{ padding:10px 12px; border-radius:16px; max-width:82%; line-height:1.45; font-size:13.5px; border:1px solid #eee; white-space:pre-line; }
        .qaChatMsg.user .qaChatBubble{ background:#fff3f7; border-color:#ffd8e2; }
        .qaChatMsg.bot .qaChatBubble{ background:#fff; border-color:#ffe0e8; }
        .qaChatInput{ padding: 14px; border-top: 1px solid var(--stroke); display: flex; gap: 10px; }
        .qaChatInput input{ flex: 1; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--stroke); outline: none; font-weight: 700; }
        .qaChatInput button{ padding: 10px 16px; border-radius: 12px; border: none; background: linear-gradient(90deg,var(--pink) 0%, var(--pink2) 100%); color: #fff; font-weight: 900; cursor: pointer; }
      </style>
    `;

    root.innerHTML = STYLE + `
      <div class="qaChatCard">
        <div class="qaChatBox" id="qaChatBox"></div>
        <div class="qaChatInput">
          <input type="text" id="qaChatInput" placeholder="프리에게 질문하기... ✨" />
          <button id="qaChatSend">전송</button>
        </div>
      </div>
    `;

    const chatBox = root.querySelector("#qaChatBox");
    const chatInput = root.querySelector("#qaChatInput");
    const chatSend = root.querySelector("#qaChatSend");

    let activeTab = "principle";
    let artTitle = "";

    function add(role, text){
      const msg = document.createElement("div");
      msg.className = "qaChatMsg " + role;
      if(role === "bot"){
        const av = document.createElement("div");
        av.className = "qaChatAvatar";
        av.textContent = "🧚";
        msg.appendChild(av);
      }
      const bub = document.createElement("div");
      bub.className = "qaChatBubble";
      bub.textContent = text;
      msg.appendChild(bub);
      chatBox.appendChild(msg);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage(){
      const text = chatInput.value.trim();
      if(!text) return;
      
      add("user", text);
      chatInput.value = "";

      // 질문 텍스트로 탭과 질문 ID 찾기
      let foundTab = null;
      let foundQid = null;
      for(const [tab, questions] of Object.entries(QUESTIONS)){
        const q = questions.find(qq => qq.text === text);
        if(q){
          foundTab = tab;
          foundQid = q.id;
          break;
        }
      }

      if(foundTab && foundQid){
        const p = readParams();
        const ans = generateAnswer(foundTab, foundQid, p, artTitle);
        setTimeout(() => add("bot", ans), 300);
      } else {
        setTimeout(() => add("bot", "질문 버튼을 눌러서 질문해주세요! ✨"), 300);
      }
    }

    // prefill-chat 이벤트 리스너
    window.addEventListener("prefill-chat", (e) => {
      if(e.detail){
        chatInput.value = e.detail;
        chatInput.focus();
      }
    });

    chatSend.onclick = sendMessage;
    chatInput.onkeypress = (e) => {
      if(e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        sendMessage();
      }
    };

    add("bot", "안녕! 나는 프랙탈 요정 프리야 ✨\n오른쪽 질문 버튼을 눌러서 질문해보자!");
  })();
}

// 기존 함수 (하위 호환성)
export function initFractalQA() {
  const root = document.getElementById("fractal-qa-root");
  if(!root) return;
  
  // 이미 마운트되었는지 확인
  if (root.hasAttribute("data-qa-mounted")) return;
  root.setAttribute("data-qa-mounted", "true");

(function(){
  // ---------- 0) 공통: 파라미터 연결(React/바닐라 공용) ----------
  function readParams(){
    // ✅ 1순위: MakeFractal에서 매번 동기화해 주는 전역 값
    const wp = (typeof window !== "undefined") ? window.fractalParams : null;
    if (wp && typeof wp === "object") {
      return {
        fractalType: wp.fractalType ?? "tree",   // "tree" | "sierpinski" | "koch"
        angle: Number(wp.angle ?? 25),
        ratio: Number(wp.ratio ?? 0.72),
        depth: Number(wp.depth ?? 7),
      };
    }

    // ✅ 2순위: bg 단계에서만 존재하는 DOM 값(있을 때만)
    const typeEl = document.querySelector("#fractalType");
    const angleEl = document.querySelector("#angle");
    const ratioEl = document.querySelector("#ratio");
    const depthEl = document.querySelector("#depth");

    return {
      fractalType: typeEl?.value ?? "tree",
      angle: Number(angleEl?.value ?? 25),
      ratio: Number(ratioEl?.value ?? 0.72),
      depth: Number(depthEl?.value ?? 7),
    };
  }

  function typeLabel(t){
    return t === "tree" ? "프랙탈 나무"
      : t === "sierpinski" ? "시어핀스키 삼각형"
      : "코흐 눈송이";
  }

  function onParamChange(cb){
    window.addEventListener("fractalParamsChange", cb);

    ["#fractalType", "#angle", "#ratio", "#depth"].forEach(sel=>{
      const el = document.querySelector(sel);
      if(!el) return;
      el.addEventListener("input", cb);
      el.addEventListener("change", cb);
    });
  }

  // ---------- 1) 답변 생성(핵심: 현재 파라미터 반영) ----------
  function fmt(n){ return Math.round(n*100)/100; }

  function generateAnswer(tab, qid, params, title){
    const t = params.fractalType; // "tree" | "sierpinski" | "koch"
    const a = params.angle, r = params.ratio, d = params.depth;

    // ---- 프랙탈 원리 ----
    if(tab === "principle"){
      // 공통 질문: 반복
      if(qid === "repeat"){
        if(t === "tree"){
          return `반복은 "같은 가지 규칙을 계속 적용하는 것"이야.\n지금 단계가 ${d}라서 가지가 규칙대로 ${d}번 반복되어 늘어나.\n→ 단계가 커질수록 더 촘촘해져.`;
        }
        if(t === "sierpinski"){
          return `시어핀스키 삼각형의 반복은 이거야: "큰 삼각형을 4개로 나누고 가운데를 비우기"를 계속 반복!\n단계 ${d}일수록 빈 공간(구멍)과 작은 삼각형이 계속 늘어나.`;
        }
        // koch
        return `코흐 눈송이의 반복은 "한 변을 3등분 → 가운데를 삼각형 봉우리로 바꾸기"를 계속 하는 거야.\n단계 ${d}일수록 변이 더 울퉁불퉁해지고 길이도 늘어 보여.`;
      }

      // 공통 질문: 자기닮음
      if(qid === "selfsimilar"){
        if(t === "tree"){
          return `자기닮음은 작은 가지가 큰 가지의 축소판처럼 보이는 현상이야.\n매번 길이를 ${fmt(r)}배로 줄이고 같은 방식으로 갈라지니까 부분이 전체를 닮아 보여.`;
        }
        if(t === "sierpinski"){
          return `시어핀스키는 "전체 삼각형 모양이 작은 삼각형들 안에 반복해서 나타나는" 자기닮음이야.\n큰 삼각형 안에 작은 삼각형 3개가 있고, 그 안에서도 또 같은 패턴이 반복돼.`;
        }
        return `코흐 눈송이는 "전체의 톱니(봉우리) 모양이 작은 크기에서도 똑같이 반복되는" 자기닮음이야.\n한 번 만든 톱니를 다시 더 작은 톱니로 바꾸는 규칙이 반복돼.`;
      }

      // 공통 질문: 단계 올리면 복잡
      if(qid === "complex"){
        if(t === "tree"){
          return `단계를 올리면 가지 분기 횟수가 늘어나서 가지 수가 빠르게 많아져.\n그래서 겹치고 촘촘해져서 더 복잡해 보여.`;
        }
        if(t === "sierpinski"){
          return `단계를 올리면 "가운데를 비우는 작업"이 더 작은 삼각형에서도 계속 일어나.\n그래서 구멍(빈 공간)이 늘고 패턴이 더 촘촘해져 복잡해 보여.`;
        }
        return `단계를 올리면 각 변이 더 잘게 쪼개지고, 봉우리가 더 많이 생겨.\n그래서 윤곽선이 점점 더 복잡한 눈송이처럼 보여.`;
      }

      // 나무 전용 질문: 각도/비율
      if(qid === "angle"){
        if(t !== "tree"){
          return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 각도보다는 '단계(반복)'가 모양을 더 크게 바꿔!`;
        }
        const feel = (a<20)?"좁게 모이는 느낌":(a<45)?"자연스럽게 퍼지는 느낌":"넓게 펼쳐지는 느낌";
        return `각도(∠)는 가지가 벌어지는 방향을 정해.\n지금은 ${a}°라서 ${feel}이야.\n각도를 키우면 더 넓게, 줄이면 더 좁게 모여 보여.`;
      }

      if(qid === "ratio"){
        if(t !== "tree"){
          return `이 질문은 '프랙탈 나무'에서 특히 중요해.\n지금 작품은 ${typeLabel(t)}이라서 길이 비율 대신 '단계(반복)' 관찰이 핵심이야!`;
        }
        const feel = (r<0.62)?"빨리 짧아져 단정해짐":(r<0.75)?"균형 있게 줄어듦":"길게 유지되어 크게 뻗음";
        return `길이 비율은 다음 가지가 이전 가지의 몇 배 길이인지야.\n지금 비율 ${fmt(r)}에서는 가지가 ${feel}.\n비율이 일정해서 자기닮음이 더 뚜렷해져.`;
      }
    }

    // ---- 제목/발표/공유 탭도 작품별로 살짝 보정(권장) ----
    if(tab === "share"){
      if(qid==="titlehelp"){
        if(t === "tree"){
          const vibe = (a>=45)?"퍼짐":(a<=18)?"집중":"균형";
          return `제목 아이디어:\n- 규칙이 만든 ${vibe}의 나무\n- ∠${a}° · 비율 ${fmt(r)} · 단계 ${d}\n- 반복으로 자라는 프랙탈\n- 부분이 전체를 닮는 숲`;
        }
        if(t === "sierpinski"){
          return `제목 아이디어:\n- 구멍이 늘어나는 삼각형\n- 단계 ${d}의 시어핀스키\n- 반복으로 생긴 패턴\n- 부분이 전체를 닮는 삼각형`;
        }
        // koch
        return `제목 아이디어:\n- 울퉁불퉁한 눈송이\n- 단계 ${d}의 코흐 곡선\n- 반복으로 생긴 톱니\n- 부분이 전체를 닮는 눈송이`;
      }
      if(qid==="explain"){
        const name = typeLabel(t);
        if(t === "tree"){
          const tt = title ? `「${title}」` : "내 작품";
          return `${tt}은(는) ${name}로, ∠${a}°와 비율 ${fmt(r)} 규칙을 ${d}단계 반복해 만들었어.\n같은 규칙이 반복되면서 작은 부분이 전체를 닮는 '자기닮음'이 나타나.`;
        }
        const tt = title ? `「${title}」` : "내 작품";
        return `${tt}은(는) ${name}로, '같은 분할 규칙'을 ${d}단계 반복해 만든 프랙탈이야.\n반복될수록 작은 부분에서도 같은 패턴이 나타나는 '자기닮음'을 볼 수 있어.`;
      }
      if(qid==="compare"){
        if(t === "tree"){
          return `한 줄 정리: ∠${a}° / 비율 ${fmt(r)} / 단계 ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
        }
        return `한 줄 정리: ${typeLabel(t)} / 단계(반복) ${d} → 규칙이 반복되어 자기닮음이 생긴다.`;
      }
    }

    if(tab === "ethics"){
      if(qid==="aiwhat"){
        return `AI의 '이해'는 사람처럼 느끼는 게 아니라, 많은 예시에서 패턴을 학습해 결과를 계산하는 거야.\n그래서 AI 답은 근거(조건/규칙)를 확인하고 내 말로 다시 정리하는 게 중요해.`;
      }
      if(qid==="bias"){
        return `AI는 자료의 영향으로 틀리거나 한쪽으로 치우칠 수 있어.\n그래서 근거를 요구하고("왜?"), 다른 표현으로 다시 질문해 검증하는 습관이 필요해.`;
      }
      if(qid==="copyright"){
        return `공유할 때 출처를 남기는 건 만든 사람의 권리를 존중하고, 내 작품의 신뢰도도 높이기 위해서야.\n남의 그림/사진을 썼다면 "어디서 가져왔는지"를 꼭 밝혀야 해.`;
      }
      if(qid==="prompt"){
        return `좋은 질문은 조건을 구체적으로 쓰는 거야.\n예: "각도 ${a}°, 비율 ${fmt(r)}, 단계 ${d}에서 자기닮음이 생기는 이유를 2문장으로 설명해줘."\n그리고 답을 받은 뒤 내 말로 한 줄 요약해보자.`;
      }
    }
    return "다른 질문 버튼도 눌러보자!";
  }

  // ---------- 2) UI 데이터 ----------
  const QUESTIONS = {
    principle: [
      { id:"repeat", text:"프랙탈에서 '반복'은 어디에서 보이나요?" },
      { id:"selfsimilar", text:"'부분이 전체를 닮는' 모습은 무엇인가요?" },
      { id:"complex", text:"단계를 올리면 왜 더 복잡해지나요?" },
      { id:"angle", text:"각도(∠)가 바뀌면 모양이 어떻게 달라지나요?" },
      { id:"ratio", text:"길이 비율이 바뀌면 어떤 차이가 생기나요?" }
    ],
    share: [
      { id:"titlehelp", text:"내 작품에 어울리는 제목 추천해줘" },
      { id:"explain", text:"발표용 설명을 2문장으로 만들어줘" },
      { id:"compare", text:"내 규칙(각도·비율·단계)을 한 줄로 정리해줘" }
    ],
    ethics: [
      { id:"aiwhat", text:"AI가 프랙탈을 '이해'한다는 건 무슨 뜻인가요?" },
      { id:"bias", text:"AI가 그림/설명을 할 때 조심할 점은?" },
      { id:"copyright", text:"작품 공유할 때 저작권/출처는 왜 중요하죠?" },
      { id:"prompt", text:"AI에게 질문(프롬프트)할 때 좋은 태도는?" }
    ]
  };

  // ---------- 3) 공통 스타일(참고 이미지 느낌) ----------
  const STYLE = `
    <style>
      :root{ --stroke:#ffd2dc; --stroke2:#ffc1d0; --pink:#ff7aa6; --pink2:#ff9fbe; --muted:#6a5d62; --shadow:0 10px 30px rgba(255,122,166,.18); }
      .qaCard{ margin-top:18px; background:#ffffffcc; border:1px solid var(--stroke); border-radius:22px; box-shadow:var(--shadow); overflow:hidden; font-family: ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo","Noto Sans KR"; }
      .qaHead{ padding:18px 18px 12px; text-align:center; border-bottom:1px solid rgba(255,210,220,.7); background:linear-gradient(180deg,#fff9fb 0%, #fff6f8 100%); }
      .qaHead h1{ margin:0; font-size:26px; font-weight:950; letter-spacing:-.8px; color:#ff6a9a; }
      .qaHead .sub{ margin-top:6px; font-size:13px; color:var(--muted); font-weight:600; }
      .tabs{ padding:12px 18px 10px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
      .tab{ border:2px solid var(--stroke2); background:#fff; color:#5a4c52; border-radius:999px; padding:10px 14px; font-weight:900; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 8px 18px rgba(255,122,166,.10); font-size:13px; }
      .tab.active{ background:linear-gradient(90deg,#ff8bb3 0%, #ffb1c7 100%); border-color:transparent; color:#fff; }
      .chips{ padding:6px 18px 14px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
      .chip{ border:1px solid var(--stroke2); background:#fff; border-radius:999px; padding:10px 14px; cursor:pointer; font-weight:800; color:#6a4e58; font-size:13px; transition:.15s ease; }
      .chip:hover{ transform:translateY(-1px); box-shadow:0 10px 18px rgba(255,122,166,.12); }
      .chat{ padding:0 18px 18px; }
      .chatBox{ border:1px solid var(--stroke); background:#fff; border-radius:18px; padding:14px; min-height:200px; }
      .msg{ display:flex; gap:10px; margin:10px 0; align-items:flex-start; }
      .msg.user{ justify-content:flex-end; }
      .avatar{ width:34px; height:34px; border-radius:999px; display:grid; place-items:center; font-size:18px; border:1px solid var(--stroke2); background:#fff; }
      .bubble{ padding:10px 12px; border-radius:16px; max-width:82%; line-height:1.45; font-size:13.5px; border:1px solid #eee; white-space:pre-line; }
      .msg.user .bubble{ background:#fff3f7; border-color:#ffd8e2; }
      .msg.bot .bubble{ background:#fff; border-color:#ffe0e8; }
      .footer{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; align-items:center; }
      .mini{ font-size:12px; color:var(--muted); font-weight:700; }
      .btns{ display:flex; gap:10px; flex-wrap:wrap; }
      .btn{ border:1px solid var(--stroke2); background:#fff; color:#5a4c52; font-weight:900; border-radius:999px; padding:10px 12px; cursor:pointer; font-size:12.5px; }
      .btn.primary{ border:none; background:linear-gradient(90deg,var(--pink) 0%, var(--pink2) 100%); color:#fff; }
      .form{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .form input{ flex:1 1 320px; padding:11px 12px; border-radius:12px; border:1px solid var(--stroke); outline:none; font-weight:700; }
    </style>
  `;

  // ---------- 4) 바닐라 렌더러 ----------
  function mountVanilla(root){
    root.innerHTML = STYLE + `
      <section class="qaCard">
        <div class="qaHead">
          <h1>프랙탈 요정 프리 🧚</h1>
          <div class="sub">그림 그리기 규칙(각도·비율·단계)로 질문에 답하며 개념을 정리해보자!</div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="principle">🔎 프랙탈 원리</button>
          <button class="tab" data-tab="share">🏷️ 제목·발표·공유</button>
          <button class="tab" data-tab="ethics">🤖 AI 윤리 마무리</button>
        </div>

        <div class="chips" id="chips"></div>

        <div class="chat">
          <div class="chatBox" id="chatBox"></div>

          <div class="footer">
            <div class="mini" id="paramHint"></div>
            <div class="btns">
              <button class="btn" id="reset">대화 지우기</button>
              <button class="btn primary" id="oneLine">내 말 한 줄로 정리</button>
            </div>
          </div>

          <div class="form" id="shareForm" style="display:none;">
            <input id="title" type="text" placeholder="작품 제목(예: 비율로 자란 나무)" />
            <button class="btn primary" id="save">제목 저장</button>
            <button class="btn" id="copy">설명 복사</button>
          </div>
        </div>
      </section>
    `;

    const chatBox = root.querySelector("#chatBox");
    const chips = root.querySelector("#chips");
    const paramHint = root.querySelector("#paramHint");
    const shareForm = root.querySelector("#shareForm");
    const titleInput = root.querySelector("#title");

    let activeTab = "principle";
    let artTitle = "";
    let lastSummary = "";

    function add(role, text){
      const msg = document.createElement("div");
      msg.className = "msg " + role;
      if(role === "bot"){
        const av = document.createElement("div");
        av.className = "avatar";
        av.textContent = "🧚";
        msg.appendChild(av);
      }
      const bub = document.createElement("div");
      bub.className = "bubble";
      bub.textContent = text;
      msg.appendChild(bub);
      chatBox.appendChild(msg);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function welcome(){
      if(activeTab==="principle") return "안녕! 나는 프랙탈 요정 프리야 ✨\n아래 질문 버튼을 눌러서 방금 만든 규칙으로 개념을 설명해보자!";
      if(activeTab==="share") return "좋아! 이제 발표 준비를 해보자 🗣️\n제목을 정하고, 내 작품 규칙을 짧게 설명해보자.";
      return "마무리 단계야 🤖\nAI를 사용할 때 '정확함'과 '책임'을 함께 생각해보자.";
    }

    function hintText(p){
      if(p.fractalType === "tree"){
        return `현재 작품: ${typeLabel(p.fractalType)} / ∠ ${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth}`;
      }
      // 시어핀스키, 코흐는 보통 '단계(반복)'가 핵심
      return `현재 작품: ${typeLabel(p.fractalType)} / 단계(반복) ${p.depth}`;
    }

    function syncHint(){
      const p = readParams();
      paramHint.textContent = hintText(p);
    }

    function renderChips(){
      chips.innerHTML = "";
      QUESTIONS[activeTab].forEach(q=>{
        const b = document.createElement("button");
        b.className = "chip";
        b.textContent = q.text;
        b.onclick = ()=>{
          const p = readParams();
          add("user", q.text);
          const ans = generateAnswer(activeTab, q.id, p, artTitle);
          // 공유 탭 답변을 요약으로 저장
          if(activeTab==="share" && (q.id==="explain" || q.id==="compare")){
            lastSummary = ans.replace(/\n/g," ");
          }
          add("bot", ans);
        };
        chips.appendChild(b);
      });
      shareForm.style.display = (activeTab==="share") ? "flex" : "none";
    }

    function setTab(tab){
      activeTab = tab;
      root.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===tab));
      chatBox.innerHTML = "";
      add("bot", welcome());
      renderChips();
    }

    // 탭 클릭
    root.querySelectorAll(".tab").forEach(t=>{
      t.onclick = ()=> setTab(t.dataset.tab);
    });

    // 버튼들
    root.querySelector("#reset").onclick = ()=>{
      chatBox.innerHTML = "";
      add("bot", welcome());
    };
    root.querySelector("#oneLine").onclick = ()=>{
      const p = readParams();
      const s = lastSummary || `내 말 한 줄: ∠${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth}에서 규칙이 반복되어 자기닮음이 생긴다.`;
      add("user", s);
    };

    root.querySelector("#save").onclick = ()=>{
      artTitle = titleInput.value.trim();
      if(!artTitle) return add("bot","제목을 먼저 입력해줘!");
      add("bot", `좋아! 작품 제목은 「${artTitle}」로 저장했어. 이제 '발표용 설명 2문장'도 눌러보자.`);
    };

    root.querySelector("#copy").onclick = async ()=>{
      const p = readParams();
      let text = lastSummary;
      if(!text){
        if(p.fractalType === "tree"){
          text = `∠${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth} 규칙으로 만든 프랙탈(자기닮음).`;
        } else {
          text = `${typeLabel(p.fractalType)} / 단계(반복) ${p.depth} 규칙으로 만든 프랙탈(자기닮음).`;
        }
      }
      try{ await navigator.clipboard.writeText(text); add("bot","설명을 복사했어!"); }
      catch{ add("bot","복사가 막혀있으면 드래그해서 직접 복사해줘!"); }
    };

    // 파라미터 변경 반영
    onParamChange(()=>{
      syncHint();
    });

    // 초기
    syncHint();
    add("bot", welcome());
    renderChips();
  }

  // ---------- 5) React 렌더러(가능하면) ----------
  function mountReact(root){
    const React = window.React;
    const ReactDOM = window.ReactDOM;

    function App(){
      const [tab, setTab] = React.useState("principle");
      const [msgs, setMsgs] = React.useState([{role:"bot", text: welcomeText("principle")}]);
      const [title, setTitle] = React.useState("");
      const [savedTitle, setSavedTitle] = React.useState("");
      const [hint, setHint] = React.useState("");
      const [lastSummary, setLastSummary] = React.useState("");

      function welcomeText(t){
        if(t==="principle") return "안녕! 나는 프랙탈 요정 프리야 ✨\n아래 질문 버튼을 눌러서 방금 만든 규칙으로 개념을 설명해보자!";
        if(t==="share") return "좋아! 이제 발표 준비를 해보자 🗣️\n제목을 정하고, 내 작품 규칙을 짧게 설명해보자.";
        return "마무리 단계야 🤖\nAI를 사용할 때 '정확함'과 '책임'을 함께 생각해보자.";
      }

      function hintText(p){
        if(p.fractalType === "tree"){
          return `현재 작품: ${typeLabel(p.fractalType)} / ∠ ${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth}`;
        }
        // 시어핀스키, 코흐는 보통 '단계(반복)'가 핵심
        return `현재 작품: ${typeLabel(p.fractalType)} / 단계(반복) ${p.depth}`;
      }

      function syncHint(){
        const p = readParams();
        setHint(hintText(p));
      }

      React.useEffect(()=>{
        syncHint();
        const cb = ()=> syncHint();
        onParamChange(cb);
        return ()=> window.removeEventListener("fractalParamsChange", cb);
      },[]);

      function push(role, text){
        setMsgs(prev => [...prev, {role, text}]);
      }

      function changeTab(next){
        setTab(next);
        setMsgs([{role:"bot", text: welcomeText(next)}]);
      }

      async function copy(){
        const p = readParams();
        let text = lastSummary;
        if(!text){
          if(p.fractalType === "tree"){
            text = `∠${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth} 규칙으로 만든 프랙탈(자기닮음).`;
          } else {
            text = `${typeLabel(p.fractalType)} / 단계(반복) ${p.depth} 규칙으로 만든 프랙탈(자기닮음).`;
          }
        }
        try{ await navigator.clipboard.writeText(text); push("bot","설명을 복사했어!"); }
        catch{ push("bot","복사가 막혀있으면 드래그해서 직접 복사해줘!"); }
      }

      return React.createElement(React.Fragment, null,
        React.createElement("div", {dangerouslySetInnerHTML:{__html:STYLE}}),
        React.createElement("section",{className:"qaCard"},
          React.createElement("div",{className:"qaHead"},
            React.createElement("h1",null,"프랙탈 요정 프리 🧚"),
            React.createElement("div",{className:"sub"},"그림 그리기 규칙(각도·비율·단계)로 질문에 답하며 개념을 정리해보자!")
          ),
          React.createElement("div",{className:"tabs"},
            ["principle","share","ethics"].map(k=>{
              const label = k==="principle"?"🔎 프랙탈 원리":k==="share"?"🏷️ 제목·발표·공유":"🤖 AI 윤리 마무리";
              return React.createElement("button",{key:k,className:"tab"+(tab===k?" active":""),onClick:()=>changeTab(k)},label);
            })
          ),
          React.createElement("div",{className:"chips"},
            QUESTIONS[tab].map(q =>
              React.createElement("button",{key:q.id,className:"chip",onClick:()=>{
                const p = readParams();
                push("user", q.text);
                const ans = generateAnswer(tab, q.id, p, savedTitle);
                if(tab==="share" && (q.id==="explain"||q.id==="compare")) setLastSummary(ans.replace(/\n/g," "));
                push("bot", ans);
              }}, q.text)
            )
          ),
          React.createElement("div",{className:"chat"},
            React.createElement("div",{className:"chatBox"},
              msgs.map((m, idx)=>{
                const cls = "msg " + m.role;
                return React.createElement("div",{key:idx,className:cls},
                  m.role==="bot" ? React.createElement("div",{className:"avatar"},"🧚") : null,
                  React.createElement("div",{className:"bubble"}, m.text)
                );
              })
            ),
            React.createElement("div",{className:"footer"},
              React.createElement("div",{className:"mini"}, hint),
              React.createElement("div",{className:"btns"},
                React.createElement("button",{className:"btn",onClick:()=>setMsgs([{role:"bot", text: welcomeText(tab)}])},"대화 지우기"),
                React.createElement("button",{className:"btn primary",onClick:()=>{
                  const p = readParams();
                  let s = lastSummary;
                  if(!s){
                    if(p.fractalType === "tree"){
                      s = `내 말 한 줄: ∠${p.angle}° / 비율 ${fmt(p.ratio)} / 단계 ${p.depth}에서 규칙이 반복되어 자기닮음이 생긴다.`;
                    } else {
                      s = `내 말 한 줄: ${typeLabel(p.fractalType)} / 단계(반복) ${p.depth}에서 규칙이 반복되어 자기닮음이 생긴다.`;
                    }
                  }
                  push("user", s);
                }},"내 말 한 줄로 정리")
              )
            ),
            tab==="share" ? React.createElement("div",{className:"form"},
              React.createElement("input",{value:title,onChange:(e)=>setTitle(e.target.value),placeholder:"작품 제목(예: 비율로 자란 나무)"}),
              React.createElement("button",{className:"btn primary",onClick:()=>{
                const t = title.trim();
                if(!t) return push("bot","제목을 먼저 입력해줘!");
                setSavedTitle(t);
                push("bot", `좋아! 작품 제목은 「${t}」로 저장했어. 이제 '발표용 설명 2문장'도 눌러보자.`);
              }},"제목 저장"),
              React.createElement("button",{className:"btn",onClick:copy},"설명 복사")
            ) : null
          )
        )
      );
    }

    ReactDOM.render(React.createElement(App), root);
  }

  // ---------- 6) 자동 탐지 후 마운트 ----------

  const hasReact = !!(window.React && (window.ReactDOM || window.ReactDOMClient));
  // React 18 createRoot 지원이면 우선 사용
  if(hasReact && window.ReactDOMClient && window.ReactDOMClient.createRoot){
    // React18 경로 - 하지만 vanilla로 처리하는 게 안정적
    mountVanilla(root);
  }else if(hasReact && window.ReactDOM && window.ReactDOM.render){
    mountReact(root);
  }else{
    mountVanilla(root);
  }
})();
}

