// 11/8 연수 내용 속 '직접 해 보기' 체험. content.js 의 { demo: '이름' } 블록이 이 모듈을 부른다.
// 모두 이 기기 안에서만 움직인다(저장·전송·AI 호출 없음). 단 11/8부터 일정(schedule)은 회차에 함께 저장해 모두의 화면이 같이 바뀐다(talk.js 가 ctx 로 넘김). 화면 속 회사·사람·숫자는 모두 가상이며, AI 결과는 미리 써 둔 예시다.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function dayAt(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
const won = (n) => n.toLocaleString('ko-KR') + '원';

function shell(name, title, sub) {
  const box = document.createElement('div');
  box.className = 'demo demo-' + name;
  box.innerHTML = `<div class="demo-head"><span class="demo-badge">직접 해 보기</span><b>${esc(title)}</b></div>${sub ? `<p class="demo-sub">${esc(sub)}</p>` : ''}<div class="demo-body"></div>
    <p class="demo-foot">체험용 화면입니다. 이 기기 안에서만 움직이고 저장되지 않습니다. 회사·사람·숫자는 모두 가상입니다.</p>`;
  return [box, box.querySelector('.demo-body')];
}
async function typeOut(node, text, speed = 12) {
  node.textContent = '';
  const tok = (node._tok = (node._tok || 0) + 1);
  for (let i = 0; i < text.length; i += 2) {
    if (node._tok !== tok) return;
    node.textContent = text.slice(0, i + 2);
    await sleep(speed);
  }
}

// ---------------------------------------------------------------- 1. 프롬프트 재료 더하기
const PR = {
  base: '안내 메일 써 줘.',
  steps: [
    { k: '역할', add: '너는 학교 정보화기기 유지보수 회사의 영업 담당자야.' },
    { k: '받는 사람', add: '받는 사람은 지난달 전자칠판 20대를 설치한 중학교 행정실장님이야.' },
    { k: '목적', add: '설치 한 달 점검 결과를 알리고, 겨울방학 정기 점검 날짜를 잡고 싶어.' },
    { k: '형식·조건', add: '5문장 이내로 정중하게 쓰고, 끝에 가능한 날짜 2개를 제안해 줘. 모르는 숫자는 [확인 필요]로 남겨.' },
  ],
  out: [
    { t: '안녕하세요. 안내 말씀 드립니다. 관련하여 궁금하신 점이 있으시면 언제든 연락 주시기 바랍니다. 감사합니다.', note: '무엇을, 누구에게 안내하는지 몰라 빈말만 나왔습니다.' },
    { t: '안녕하세요, 유지보수 담당 ○○○입니다. 저희 회사의 서비스에 대해 안내드리고자 연락드렸습니다. 필요하신 점이 있으시면 편하게 말씀해 주세요.', note: '말투는 업체답지만 받는 사람과 용건이 없습니다.' },
    { t: '행정실장님, 안녕하십니까. 지난달 전자칠판 20대 설치를 맡았던 ○○○입니다. 사용하시면서 불편한 점은 없으신지 여쭙고자 연락드렸습니다. 필요하시면 언제든 찾아뵙겠습니다.', note: '누구에게 쓰는지 알려 주자 글이 구체적으로 바뀌었습니다.' },
    { t: '행정실장님, 안녕하십니까. 지난달 전자칠판 20대 설치를 맡았던 ○○○입니다. 한 달 동안 원격 점검한 결과 20대 모두 정상이며, 터치가 어긋난 2대는 지난주 보정을 마쳤습니다. 겨울방학 중 정기 점검을 하려 하니 편하신 날을 알려 주시면 맞추겠습니다.', note: '용건이 생겼습니다. 그런데 "2대 보정"은 AI가 지어낸 숫자입니다. 실제 기록과 꼭 맞춰 보세요.' },
    { t: '행정실장님, 안녕하십니까. 지난달 전자칠판 20대 설치를 맡았던 ○○○입니다. 설치 한 달 점검 결과 [확인 필요: 이상 대수]를 빼고는 모두 정상입니다. 겨울방학 중 정기 점검으로 남은 문제까지 살피려 합니다. 1월 7일(수) 또는 1월 9일(금) 오전 중 편하신 날을 알려 주시면 맞춰 방문하겠습니다.', note: '형식과 조건까지 정하니 바로 보낼 수 있는 수준입니다. 모르는 숫자는 [확인 필요]로 남겨 사람이 채웁니다.' },
  ],
};
function demoPrompt() {
  const [box, body] = shell('prompt', '같은 부탁, 재료를 더하면 달라지는 답', '"안내 메일 써 줘"에 재료를 하나씩 더해 보세요. AI의 답이 어떻게 바뀌는지 봅니다.');
  let lv = 0;
  body.innerHTML = `<div class="pr-chips"></div>
    <div class="pr-box"><div class="pr-label">내가 쓴 프롬프트</div><div class="pr-text"></div></div>
    <div class="pr-arrow">↓ AI의 답(예시)</div>
    <div class="pr-out"><div class="pr-res"></div><div class="pr-note"></div></div>
    <div class="demo-btns"><button class="btn primary" data-a="add">＋ 재료 더하기</button><button class="btn" data-a="reset">처음부터</button></div>`;
  const draw = () => {
    body.querySelector('.pr-chips').innerHTML = PR.steps.map((s, i) => `<span class="pr-chip ${i < lv ? 'on' : ''}">${i < lv ? '✓ ' : ''}${s.k}</span>`).join('');
    body.querySelector('.pr-text').innerHTML = [...PR.steps.slice(0, lv).map((s) => `<mark>${esc(s.add)}</mark>`), esc(PR.base)].join(' ');
    typeOut(body.querySelector('.pr-res'), PR.out[lv].t);
    body.querySelector('.pr-note').textContent = '💡 ' + PR.out[lv].note;
    const add = body.querySelector('[data-a=add]');
    add.disabled = lv >= PR.steps.length;
    add.textContent = lv >= PR.steps.length ? '재료를 다 넣었어요' : `＋ 재료 더하기: ${PR.steps[lv].k}`;
  };
  body.querySelector('[data-a=add]').onclick = () => { if (lv < PR.steps.length) { lv++; draw(); } };
  body.querySelector('[data-a=reset]').onclick = () => { lv = 0; draw(); };
  draw();
  return box;
}

// ---------------------------------------------------------------- 2. 묻는 AI vs 일하는 AI
function demoAgent() {
  const [box, body] = shell('agent', '묻는 AI와 일하는 AI(에이전트)', '같은 일을 두 가지 방식으로 맡겨 봅니다.');
  const ask = '다음 주 거래처 학교 3곳 방문 일정을 짜 줘.';
  const LOG = [
    ['📅', '캘린더에서 다음 주 빈 시간 찾기', '월 오후 · 수 오전 · 목 오후가 비어 있습니다.'],
    ['📧', '메일에서 세 학교의 요청 사항 읽기', '가람중: 프린터 2대 / 나래초: 전자칠판 터치 / 다온고: 무선망 점검'],
    ['🗺️', '이동 거리로 순서 정하기', '가람중 → 나래초는 10분, 다온고는 따로 가는 편이 빠릅니다.'],
    ['📝', '방문 일정과 준비물 정리', '월 14시 가람중(토너·드럼) → 15시 나래초(보정 도구) / 수 10시 다온고(측정기)'],
    ['✋', '보내기 전에 사람에게 확인 받기', '세 학교에 보낼 방문 안내 메일 초안 3통을 만들었습니다. 보낼까요?'],
  ];
  body.innerHTML = `<div class="ag-ask">💬 ${esc(ask)}</div>
    <div class="ag-cols"><div class="ag-col"><h5>묻는 AI(채팅)</h5><div class="ag-chat"><p class="muted">눌러서 시작해 보세요.</p></div><button class="btn" data-a="chat">물어보기</button></div>
    <div class="ag-col"><h5>일하는 AI(에이전트)</h5><ol class="ag-log"></ol><div class="ag-done hidden"><button class="btn primary" data-a="ok">확인했어요, 보내 주세요</button> <button class="btn" data-a="stop">멈추기</button></div><button class="btn primary" data-a="run">일 맡기기</button></div></div>`;
  body.querySelector('[data-a=chat]').onclick = async (e) => {
    e.target.disabled = true;
    await typeOut(body.querySelector('.ag-chat'), '방문 일정을 짜려면 다음 정보가 필요합니다. ① 방문할 학교 이름 ② 가능한 요일과 시간 ③ 학교별 용건 ④ 이동 수단. 알려 주시면 표로 정리해 드릴게요.');
    body.querySelector('.ag-chat').insertAdjacentHTML('beforeend', '<p class="ag-tip">→ 내가 자료를 찾아 다시 알려 줘야 합니다.</p>');
  };
  body.querySelector('[data-a=run]').onclick = async (e) => {
    e.target.classList.add('hidden');
    const ol = body.querySelector('.ag-log'); ol.innerHTML = '';
    for (const [ic, t, r] of LOG) {
      const li = document.createElement('li'); li.className = 'run';
      li.innerHTML = `<span class="ic">${ic}</span><div><b>${esc(t)}</b><small>…</small></div>`;
      ol.append(li); await sleep(900);
      li.className = 'ok'; li.querySelector('small').textContent = r; await sleep(300);
    }
    body.querySelector('.ag-done').classList.remove('hidden');
  };
  body.querySelector('[data-a=ok]').onclick = () => { body.querySelector('.ag-done').innerHTML = '<div class="tipline">✅ 메일 3통을 보냈다고 가정합니다. 보내는 단추는 사람이 눌렀습니다.</div>'; };
  body.querySelector('[data-a=stop]').onclick = () => { body.querySelector('.ag-done').innerHTML = '<div class="tipline">⏸ 멈췄습니다. 초안만 남기고 보내지 않았습니다.</div>'; };
  return box;
}

// ---------------------------------------------------------------- 3. 카페 주문 앱 → 조사 도구
function demoOrder() {
  const [box, body] = shell('order', '주문 앱 하나로 주문도, 조사도', '세 사람 몫을 한 번에 담아 주문해 보고, 같은 앱을 조사 도구로 바꿔 봅니다.');
  const MENU = [['아메리카노', 2000, '☕'], ['카페라테', 3000, '🥛'], ['유자차', 3500, '🍋'], ['쿠키', 1500, '🍪']];
  const PEOPLE = ['나', '김 팀장', '이 대리'];
  const cart = PEOPLE.map(() => MENU.map(() => 0));
  let who = 0, mode = 'order', sent = false;
  const Q = { q: '올해 송년회는 어디에서 할까요?', o: ['회사 근처 식당', '볼링·보드게임', '공연 관람', '점심 송년회'], base: [4, 3, 2, 3] };
  let myVote = -1;
  body.innerHTML = `<div class="seg"><button data-m="order" class="on">🧾 주문 앱</button><button data-m="survey">📊 조사 도구로 바꾸기</button></div><div class="od-view"></div>`;
  const view = body.querySelector('.od-view');
  function drawOrder() {
    const tot = cart.flat().reduce((s, n, i) => s + n * MENU[i % MENU.length][1], 0);
    view.innerHTML = `<div class="od-people">${PEOPLE.map((p, i) => `<button data-p="${i}" class="${i === who ? 'on' : ''}">${p} <small>${cart[i].reduce((a, b) => a + b, 0)}</small></button>`).join('')}</div>
      <div class="od-menu">${MENU.map(([n, w, ic], i) => `<div class="od-item"><span class="ic">${ic}</span><div><b>${n}</b><small>${won(w)}</small></div>
        <div class="od-step"><button data-d="-1" data-i="${i}">−</button><span>${cart[who][i]}</span><button data-d="1" data-i="${i}">＋</button></div></div>`).join('')}</div>
      <div class="demo-btns"><span class="od-tot">합계 <b>${won(tot)}</b></span><button class="btn primary" data-a="send" ${tot ? '' : 'disabled'}>한 번에 주문하기</button></div>
      <div class="od-board ${sent ? '' : 'hidden'}"></div>`;
    view.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { who = +b.dataset.p; drawOrder(); }; });
    view.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { const i = +b.dataset.i; cart[who][i] = Math.max(0, cart[who][i] + +b.dataset.d); sent = false; drawOrder(); }; });
    view.querySelector('[data-a=send]').onclick = () => { sent = true; drawOrder(); };
    if (sent) {
      const sum = MENU.map((_, i) => cart.reduce((s, c) => s + c[i], 0));
      view.querySelector('.od-board').innerHTML = `<h5>📟 카페 주문판 <span class="live">방금 들어옴</span></h5>
        <div class="od-sum">${MENU.map(([n, , ic], i) => sum[i] ? `<span>${ic} ${n} <b>${sum[i]}</b></span>` : '').join('')}</div>
        <div class="muted">${PEOPLE.map((p, i) => { const s = MENU.map(([n], j) => cart[i][j] ? `${n} ${cart[i][j]}` : '').filter(Boolean).join(', '); return s ? `${p}: ${s}` : ''; }).filter(Boolean).join(' · ')}</div>`;
    }
  }
  function drawSurvey() {
    const c = Q.base.map((n, i) => n + (i === myVote ? 1 : 0)), tot = c.reduce((a, b) => a + b, 0), mx = Math.max(...c);
    view.innerHTML = `<p class="od-q">❓ ${Q.q}</p><div class="od-opts">${Q.o.map((o, i) => `<button data-v="${i}" class="${i === myVote ? 'on' : ''}">${o}</button>`).join('')}</div>
      <div class="od-res">${Q.o.map((o, i) => `<div class="bar"><span>${o}${i === myVote ? ' · 내 선택' : ''}</span><i style="width:${(c[i] / mx) * 100}%"></i><b>${c[i]}</b></div>`).join('')}</div>
      <p class="muted">직원 ${tot}명 응답(가상) · 메뉴 자리에 질문과 보기를 넣었을 뿐, 앱은 그대로입니다. 오늘 시작 설문도 같은 방식입니다.</p>`;
    view.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { myVote = +b.dataset.v; drawSurvey(); }; });
  }
  body.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { mode = b.dataset.m; body.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b)); mode === 'order' ? drawOrder() : drawSurvey(); }; });
  drawOrder();
  return box;
}

// ---------------------------------------------------------------- 4. 행사 스케치 영상: 말로 부탁하기
function demoSketch() {
  const [box, body] = shell('sketch', '영상 편집을 말로 부탁하기', '세 가지를 고르면 AI에게 보낼 부탁과 편집 계획(예시)이 만들어집니다.');
  const OPT = { kind: ['회사 홍보 영상', '회사 송년회', '신제품 설치 현장', '가족 여행'], mood: ['따뜻하게', '경쾌하게', '차분하게'], len: ['1분', '3분', '5분'] };
  const pick = { kind: 0, mood: 1, len: 1 };   // 11/8 사용자: '회사 홍보 영상' 추가(맨 앞, 기본 선택)
  const PLAN = {
    0: ['오프닝: 회사 로고와 한 줄 슬로건이 움직이며 등장(모션그래픽)', '회사 소개: 설립 연도·주요 실적을 숫자가 올라가는 카드로', '사업 분야별 꼭지: 분야마다 현장 사진·설치 영상과 하단 자막', '연혁 타임라인: 주요 사건을 한 줄로 이어 보여 주기', '엔딩: 연락처·홈페이지 주소와 사진·음악 출처'],
    1: ['오프닝: 회사 로고와 "2026 송년회" 제목', '1부: 도착·인사 장면, 이름표 자막', '2부: 시상과 웃음 장면 모음(사진 콜라주)', '3부: 단체 사진, 대표 인사 한 줄', '엔딩: "내년에도 함께해요" 자막'],
    2: ['오프닝: 설치 전 교실 모습', '1부: 장비 반입·설치 과정(빠르게 넘기기)', '2부: 작동 시험 장면, 화면 위 설명 자막', '3부: 선생님 사용 모습', '엔딩: 회사 이름과 연락처'],
    3: ['오프닝: 이동 경로 지도 애니메이션', '1부: 첫날 풍경, 장소 이름표', '2부: 식사·체험 사진 콜라주', '3부: 가족 단체 사진', '엔딩: 날짜와 한 줄 소감'],
  };
  body.innerHTML = Object.entries({ kind: '무엇을', mood: '분위기', len: '길이' }).map(([k, l]) => `<div class="sk-row"><span>${l}</span><div class="chips">${OPT[k].map((o, i) => `<button data-k="${k}" data-i="${i}">${o}</button>`).join('')}</div></div>`).join('')
    + '<div class="pr-box"><div class="pr-label">AI에게 보낼 부탁</div><div class="sk-ask"></div></div><div class="sk-plan"></div>';
  const draw = () => {
    body.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('on', pick[b.dataset.k] === +b.dataset.i));
    body.querySelector('.sk-ask').textContent = pick.kind === 0
      ? `우리 회사 홈페이지 주소를 줄게. 홈페이지의 글과 사진, 폴더에 있는 현장 사진과 영상으로 ${OPT.len[pick.len]} 길이의 회사 홍보 영상을 ${OPT.mood[pick.mood]} 만들어 줘. 사업 분야별로 꼭지를 나누고 모션그래픽을 넣어 줘. 숫자와 연혁은 홈페이지에서 확인한 것만 쓰고, 음악은 사용 조건을 확인한 곡만 써 줘.`
      : `폴더에 있는 ${OPT.kind[pick.kind]} 사진과 영상으로 ${OPT.len[pick.len]} 길이의 스케치 영상을 ${OPT.mood[pick.mood]} 만들어 줘. 구간마다 제목 자막을 넣고, 음악은 사용 조건을 확인한 곡만 써 줘. 얼굴이 크게 나온 사진은 쓰기 전에 나에게 물어봐.`;
    body.querySelector('.sk-plan').innerHTML = `<h5>🎬 AI가 세운 편집 계획(예시)</h5><ol>${PLAN[pick.kind].map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p class="muted">음악: ${OPT.mood[pick.mood]} 분위기 곡 1개 · 전체 ${OPT.len[pick.len]} · 마지막에 사람이 소리와 내용을 끝까지 보고 확인</p>`;
  };
  body.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { pick[b.dataset.k] = +b.dataset.i; draw(); }; });
  draw();
  return box;
}

// ---------------------------------------------------------------- 5. 논서술형 AI 채점 + 교사 재검토
function demoGrade() {
  const [box, body] = shell('grade', 'AI가 먼저 채점하고, 교사가 다시 봅니다', 'AI 점수는 초안입니다. 선생님이 되어 점수를 고쳐 보세요.');
  const Q = '학교 앞 횡단보도에 신호등을 새로 설치하자는 의견에 대한 내 입장을 밝히고, 근거 2가지를 쓰시오. (10점)';
  const RUB = '입장이 분명함 2점 · 근거 하나마다 4점(근거가 서로 달라야 함)';
  const A = [
    { who: '학생 가', t: '찬성한다. 등굣길에 차가 빠르게 지나가 위험하고, 저학년 학생은 차를 잘 살피지 못하기 때문이다.', ai: 10, why: '입장 분명, 서로 다른 근거 2개' },
    { who: '학생 나', t: '찬성한다. 차가 빨리 달려서 위험하다. 그리고 차가 너무 빨라서 사고가 날 수 있다.', ai: 10, why: '입장 분명, 근거 2개', hint: '두 근거가 사실상 같은 말입니다.' },
    { who: '학생 다', t: '횡단보도 근처에서 넘어질 뻔한 친구를 봤다. 신호등이 생기면 모두가 멈춰 서서 안전하게 건널 수 있다.', ai: 4, why: '입장이 드러나지 않음, 근거 1개만 인정', hint: '찬성한다는 말은 없지만 글 전체가 찬성 입장입니다.' },
  ];
  const tch = A.map((a) => a.ai);
  body.innerHTML = `<div class="gr-q"><b>문제</b> ${esc(Q)}<br><small>채점 기준: ${esc(RUB)}</small></div><div class="gr-list"></div><div class="gr-sum"></div>`;
  const draw = () => {
    body.querySelector('.gr-list').innerHTML = A.map((a, i) => `<div class="gr-item ${tch[i] !== a.ai ? 'changed' : ''}"><div class="gr-top"><b>${a.who}</b><span class="gr-ai">AI ${a.ai}점</span></div>
      <p class="gr-ans">${esc(a.t)}</p><p class="muted">AI 근거: ${esc(a.why)}</p>${a.hint ? `<details><summary>교사 눈으로 보면?</summary><p>${esc(a.hint)}</p></details>` : ''}
      <div class="gr-me">교사 점수 <button data-i="${i}" data-d="-1">−</button><b>${tch[i]}</b><button data-i="${i}" data-d="1">＋</button>${tch[i] !== a.ai ? `<span class="gr-tag">AI와 ${tch[i] > a.ai ? '+' : ''}${tch[i] - a.ai}점</span>` : ''}</div></div>`).join('');
    const n = A.filter((a, i) => tch[i] !== a.ai).length;
    body.querySelector('.gr-sum').innerHTML = `<b>AI와 다르게 매긴 답안 ${n}개 / ${A.length}개</b><p class="muted">실제로 강사는 143명 답안을 이렇게 다시 보고 50명의 점수를 고쳤습니다. 최종 판단과 책임은 사람의 몫입니다.</p>`;
    body.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { const i = +b.dataset.i; tch[i] = Math.min(10, Math.max(0, tch[i] + +b.dataset.d)); draw(); }; });
  };
  draw();
  return box;
}

// ---------------------------------------------------------------- 6. 일정 등록 → 캘린더 → 아침 브리핑
// 복기 사이트: 연수 당일에는 Apps Script 웹앱이 Gemini 비서 메모를 붙여 실제로 메일을 보냈다. 여기서는 보내지 않고 받은 메일 모양만 보여 준다.
function demoSchedule(ctx = {}) {
  // 11/8 사용자: 캘린더는 한 달(이번 달) 전체, 누가 등록하면 모두의 캘린더·시트·브리핑이 함께 바뀌게.
  // 등록한 일정은 azSessions/{회차}/sched 에 이름 없이 저장(by=익명 uid, 내가 쓴 것만 지울 수 있음). 예시 일정 3개는 이 기기에만.
  const [box, body] = shell('schedule', '일정 등록 → 캘린더 → 아침 브리핑', '일정을 하나 넣어 보세요. 시트와 캘린더에 들어가고, 그날 아침 받을 브리핑이 만들어집니다. (연수 당일에는 등록한 일정이 모든 분의 화면에 함께 보였어요. 복기 사이트에서는 이 기기에서만 보입니다.)');
  box.querySelector('.demo-foot').textContent = '복기 사이트에서는 등록한 일정이 저장되지 않고 이 화면에서만 보입니다. 예시 일정·회사·사람은 가상입니다.';
  const CATS = { 회의: '#7a4fd6', 방문: '#16967c', 마감: '#d64545', 행사: '#e0821b' };
  const today = dayAt(0), Y = today.getFullYear(), M = today.getMonth(), TODAY = ymd(today);
  const toD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const diff = (s) => Math.round((toD(s) - today) / 86400000);
  const mdS = (s) => md(toD(s));
  // 11/8 사용자: 기본 일정은 이번 달 전체에 한 주 2개씩(가상)
  const dOf = (n) => `${Y}-${pad(M + 1)}-${pad(n)}`;
  const sample = [
    [3, '10:00', '가람중 전자칠판 점검', '방문', '가람중'],
    [5, '15:00', '협력사 단가 협의', '회의', '본사 회의실'],
    [10, '14:00', '나래초 컴퓨터실 PC 교체', '방문', '나래초'],
    [12, '14:00', '대표님을 위한 AI 활용 연수', '행사', '인천창조경제혁신센터'],
    [17, '', '교육청 견적서 제출', '마감', ''],
    [19, '10:00', '하늘중 무선 AP 설치', '방문', '하늘중'],
    [24, '16:00', '월간 유지보수 결과 회의', '회의', '본사 회의실'],
    [26, '', '정기점검 보고서 제출', '마감', ''],
    [30, '11:00', '12월 점검 일정 회의', '회의', '본사 회의실'],
  ].filter(([d]) => d <= new Date(Y, M + 1, 0).getDate())
    .map(([d, t, title, cat, place]) => ({ date: dOf(d), t, title, cat, place, ex: true }));
  let shared = [], freshId = null;
  const f = { date: dayAt(1).getMonth() === M ? ymd(dayAt(1)) : TODAY, t: '14:00', cat: '회의' };
  const chs = new Set(['gemini']);
  const CH = [['gemini', '제미나이 알림'], ['gmail', 'Gmail'], ['tasks', '할 일'], ['keep', 'Keep 메모'], ['docs', '문서 일지']];
  body.innerHTML = `<div class="sc-form">
      <input class="sc-title" maxlength="40" placeholder="무슨 일정인가요? 예: 나래초 프린터 수리">
      <div class="sk-row"><span>날짜</span><div class="sc-datebox"><b class="sc-pick"></b><small class="sc-hint">아래 달력에서 날짜를 누르세요</small></div></div>
      <div class="sk-row"><span>시간</span><div class="chips" data-g="t">${['09:00', '11:00', '14:00', '16:00', '종일'].map((v) => `<button data-v="${v}">${v}</button>`).join('')}</div></div>
      <div class="sk-row"><span>분류</span><div class="chips" data-g="cat">${Object.keys(CATS).map((v) => `<button data-v="${v}">${v}</button>`).join('')}</div></div>
      <button class="btn primary big sc-add">등록하기</button><div class="sc-flow"></div></div>
    <div class="sc-month"><h5>📅 캘린더 · ${Y}년 ${M + 1}월 <small class="sc-live"></small></h5>
      <div class="sc-wd">${WD.map((w, i) => `<span class="${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</span>`).join('')}</div><div class="sc-mcal"></div></div>
    <div class="sc-sheetwrap"><h5>📄 시트 기록 <small>(${M + 1}월, 날짜순)</small></h5><div class="sc-sheet"></div></div>
    <div class="sc-brief"><h5>☀️ <span class="sc-bd"></span> 아침 7:30 브리핑은 어디로 받을까요? <small>(여러 개 고를 수 있어요 · 달력에서 날짜를 누르면 그날 브리핑)</small></h5><div class="chips sc-ch">${CH.map(([k, l]) => `<button data-c="${k}">${l}</button>`).join('')}</div><div class="sc-out"></div>
      <div class="sc-mail"><h5>✉️ 브리핑을 내 메일로 받아 보기 <small>(AI 비서가 준비할 것을 덧붙여 보내요)</small></h5>
        <div class="chips sc-kind" role="group" aria-label="브리핑 기간">${[['day', '일간'], ['week', '주간'], ['month', '월간']].map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div>
        <p class="sc-kind-info"></p>
        <div class="sc-mail-row"><input class="sc-mail-to" type="email" inputmode="email" autocomplete="email" maxlength="80" placeholder="받을 이메일 주소"><button class="btn primary sc-mail-go" type="button">메일로 보내기</button></div>
        <div class="sc-mail-res"></div>
        <p class="sc-mail-note">연수 당일에는 실제로 메일이 발송되었습니다. 복기 사이트에서는 메일을 보내지 않고, 받은 메일 모양을 보여 드립니다.</p></div></div>`;
  const $ = (q) => body.querySelector(q);
  const all = () => [...sample, ...shared].sort((a, b) => a.date.localeCompare(b.date) || (a.t || '00').localeCompare(b.t || '00'));
  function drawPick() {
    body.querySelectorAll('[data-g]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(f[g.dataset.g]) === b.dataset.v)));
    $('.sc-pick').textContent = '📅 ' + mdS(f.date);
    $('.sc-bd').textContent = mdS(f.date);
  }
  function drawCal() {
    const ev = all(), first = new Date(Y, M, 1), last = new Date(Y, M + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push('<div class="sc-day blank"></div>');
    for (let d = 1; d <= last; d++) {
      const ds = `${Y}-${pad(M + 1)}-${pad(d)}`, list = ev.filter((e) => e.date === ds), wd = new Date(Y, M, d).getDay();
      const cls = ['sc-day', ds === TODAY ? 'today' : '', ds === f.date ? 'sel' : '', wd === 0 ? 'sun' : wd === 6 ? 'sat' : '', ds < TODAY ? 'past' : ''].filter(Boolean).join(' ');
      const evs = list.slice(0, 3).map((e) => `<span class="sc-ev${e.id && e.id === freshId ? ' fresh' : ''}${e.ex ? ' ex' : ''}" style="--cc:${CATS[e.cat]}">${e.t ? e.t.slice(0, 2) + '시 ' : ''}${esc(e.title)}</span>`).join('');
      cells.push(`<button type="button" class="${cls}" data-day="${ds}"><span class="sc-dn">${d}</span>${evs}${list.length > 3 ? `<span class="sc-more">+${list.length - 3}</span>` : ''}</button>`);
    }
    $('.sc-mcal').innerHTML = cells.join('');
    $('.sc-mcal').querySelectorAll('[data-day]').forEach((b) => { b.onclick = () => { f.date = b.dataset.day; drawPick(); redraw(); }; });
    const inMonth = ev.filter((e) => e.date.startsWith(`${Y}-${pad(M + 1)}`));
    const uid = ctx.uid ? ctx.uid() : null;
    $('.sc-sheet').innerHTML = `<table><tr><th>날짜</th><th>시간</th><th>제목</th><th>분류</th><th></th></tr>${inMonth.map((e) => `<tr class="${e.id && e.id === freshId ? 'fresh' : ''}"><td>${e.date.slice(5).replace('-', '/')}</td><td>${e.t || '종일'}</td><td>${esc(e.title)}${e.ex ? ' <small>(예시)</small>' : ''}</td><td>${e.cat}</td><td>${e.id && uid && e.by === uid ? `<button class="sc-del" data-id="${e.id}" title="내가 등록한 일정 지우기">✕</button>` : ''}</td></tr>`).join('')}</table>`;
    $('.sc-sheet').querySelectorAll('.sc-del').forEach((b) => {
      b.onclick = () => { if (ctx.schedDel) ctx.schedDel(b.dataset.id).catch(() => { if (ctx.toast) ctx.toast('지우지 못했어요'); }); };
    });
    $('.sc-live').textContent = ctx.schedWatch ? `· 함께 등록한 일정 ${shared.length}건(실시간)` : '';
  }
  function brief() {
    const ev = all(), day = ev.filter((e) => e.date === f.date), dd = diff(f.date);
    const due = ev.filter((e) => e.cat === '마감' && diff(e.date) > dd && diff(e.date) <= dd + 7);
    // 빈 시간: 일정마다 1시간으로 보고, 09~18시 사이 가장 긴 빈 시간(1시간 이상)을 알려 준다
    const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3), hm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const timed = day.filter((e) => e.t).map((e) => mins(e.t)).sort((a, b) => a - b);
    let gap = '', cur = 9 * 60, best = 0;
    for (const st of [...timed, 18 * 60]) { if (st - cur >= 60 && st - cur > best) { best = st - cur; gap = `${hm(cur)}~${hm(st)}이 가장 길게 비어 있어요(${best / 60}시간)`; } cur = Math.max(cur, st + 60); }
    return { date: mdS(f.date), tm: day, due, gap, dd };
  }
  const line = (e) => `${e.t || '종일'} ${e.title}${e.place ? ` (${e.place})` : ''}`;
  // 11/12 사용자: 메일 브리핑을 일간·주간·월간으로 골라 보내기. 기준 날짜 = 달력에서 고른 날
  let kind = 'day';
  function mailBrief() {
    if (kind === 'day') { const b = brief(); return { kind, label: b.date, events: b.tm, due: b.due, info: `${b.date} 하루 일정 ${b.tm.length}건${b.due.length ? ` + 다가오는 마감 ${b.due.length}건` : ''}` }; }
    const base = toD(f.date);
    let a, z, label;
    if (kind === 'week') {
      a = new Date(base); a.setDate(base.getDate() - ((base.getDay() + 6) % 7));   // 월요일
      z = new Date(a); z.setDate(a.getDate() + 6);                                 // 일요일
      label = `${md(a)}~${md(z)}`;
    } else {
      a = new Date(base.getFullYear(), base.getMonth(), 1); z = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      label = `${base.getFullYear()}년 ${base.getMonth() + 1}월`;
    }
    const A = ymd(a), Z = ymd(z), events = all().filter((e) => e.date >= A && e.date <= Z);
    return { kind, label, events, due: [], info: `${label} 일정 ${events.length}건(마감 ${events.filter((e) => e.cat === '마감').length}건 포함)` };
  }
  function drawKind() {
    body.querySelectorAll('.sc-kind [data-k]').forEach((b) => b.classList.toggle('on', b.dataset.k === kind));
    $('.sc-kind-info').textContent = '보낼 내용: ' + mailBrief().info + (kind === 'day' ? '' : ' · 기준 날짜는 달력에서 고른 날');
  }
  function drawOut() {
    body.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', chs.has(b.dataset.c)));
    const b = brief(), dl = (e) => `D-${diff(e.date) - b.dd} ${e.title}`;
    const P = {
      gemini: `<div class="ch-phone"><div class="ch-notif"><b>✦ Gemini</b><small>${b.date} 오전 7:30</small><p>☀️ ${b.date} 업무 브리핑 · 일정 ${b.tm.length}건${b.due.length ? ` · 마감 ${b.due.length}건` : ''}</p></div>
        <div class="ch-msg">${b.tm.map((e) => `• ${esc(line(e))}`).join('<br>') || '이날은 등록된 업무 일정이 없습니다.'}${b.due.length ? `<br><br>⏰ ${b.due.map((e) => esc(dl(e))).join(', ')}` : ''}${b.gap ? `<br><br>🕐 ${b.gap}` : ''}</div></div>`,
      gmail: `<div class="ch-mail"><div class="ch-mh"><b>[아침 브리핑] ${b.date} 일정 ${b.tm.length}건</b><small>보낸 사람 Gemini · 받는 사람 나</small></div><p>${b.tm.map((e) => esc(line(e))).join('<br>') || '등록된 일정이 없습니다.'}</p>${b.due.length ? `<p><b>다가오는 마감</b><br>${b.due.map((e) => esc(dl(e))).join('<br>')}</p>` : ''}</div>`,
      tasks: `<div class="ch-tasks"><h6>✔ 할 일 목록 「업무 준비」</h6>${b.tm.map((e) => `<label><input type="checkbox"> ${esc(e.title)} 준비 <small>${b.date} ${e.t || ''}</small></label>`).join('')}${b.due.map((e) => `<label><input type="checkbox"> ${esc(e.title)} <small class="due">마감 ${mdS(e.date)}</small></label>`).join('')}${b.tm.length || b.due.length ? '' : '<small>준비할 일이 없습니다</small>'}</div>`,
      keep: `<div class="ch-keep"><h6>📌 ${b.date} 브리핑</h6><p>${b.tm.map((e) => '· ' + esc(line(e))).join('<br>') || '· 없음'}</p><small>매일 아침 이 메모 하나를 새로 고칩니다</small></div>`,
      docs: `<div class="ch-doc"><h6>📘 업무 일지</h6><div class="old">${md(dayAt(0))} — 일정 2건, 마감 1건 …</div><div><b>${b.date}</b><br>${b.tm.map((e) => '· ' + esc(line(e))).join('<br>') || '· 없음'}</div><small>날짜별로 한 문서에 쌓입니다</small></div>`,
    };
    $('.sc-out').innerHTML = [...chs].map((k) => `<div class="ch-wrap"><div class="ch-k">${CH.find((x) => x[0] === k)[1]}</div>${P[k]}</div>`).join('') || '<p class="muted">받을 곳을 하나 이상 골라 주세요.</p>';
  }
  function redraw() { drawCal(); drawOut(); drawKind(); }
  body.querySelectorAll('.sc-kind [data-k]').forEach((b) => { b.onclick = () => { kind = b.dataset.k; drawKind(); }; });
  // 브리핑 메일 보내기: 고른 날짜의 일정 + 다가오는 마감 → Apps Script(Gemini 비서 메모) → 메일
  $('.sc-mail-go').onclick = () => {
    const res = $('.sc-mail-res'), b = mailBrief();
    res.className = 'sc-mail-res ok';
    res.innerHTML = `<b>복기 사이트에서는 메일을 보내지 않아요.</b> 연수 당일에는 이 단추로 ${esc(b.info)}을 AI 비서 메모와 함께 메일로 받았습니다. 아래는 그날 받은 메일의 모양입니다.<div class="sc-mail-ai"><img src="shots/mail.jpg" alt="연수 당일 받은 아침 브리핑 메일 화면" style="width:100%;max-width:520px;border-radius:10px"></div>`;
  };
  $('.sc-mail-to').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) $('.sc-mail-go').click(); };
  // 함께 쓰는 일정 구독: 회차가 바뀌면 다시 구독한다
  let unsub = null, subSid = null;
  function resub() {
    const sid = ctx.sid ? ctx.sid() : null;
    if (!ctx.schedWatch || !sid || sid === subSid) return;
    if (unsub) unsub();
    subSid = sid; shared = []; freshId = null;
    unsub = ctx.schedWatch((rows) => { shared = rows; redraw(); });
  }
  resub();
  setInterval(resub, 3000);
  body.querySelectorAll('[data-g] button').forEach((b) => { b.onclick = () => { const g = b.parentNode.dataset.g; f[g] = b.dataset.v; drawPick(); if (g === 'date') redraw(); }; });
  body.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { if (chs.has(b.dataset.c)) chs.delete(b.dataset.c); else chs.add(b.dataset.c); drawOut(); }; });
  $('.sc-add').onclick = async (e) => {
    const title = $('.sc-title').value.trim();
    if (!title) { $('.sc-title').focus(); $('.sc-title').placeholder = '제목을 먼저 적어 주세요'; return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    const flow = $('.sc-flow'); flow.innerHTML = '';
    const steps = ['📄 시트에 한 줄 기록', '📅 구글 캘린더에 넣기', '☀️ 그날 아침 브리핑에 반영'];
    try {
      flow.insertAdjacentHTML('beforeend', `<span class="run">${steps[0]}…</span>`);
      const item = { date: f.date, t: f.t === '종일' ? '' : f.t, title, cat: f.cat };
      if (ctx.schedAdd) freshId = await ctx.schedAdd(item);
      else { freshId = 'local-' + Date.now(); shared = [...shared, { ...item, id: freshId }]; }
      flow.lastElementChild.className = 'ok'; flow.lastElementChild.textContent = steps[0] + ' ✓';
      for (const s of steps.slice(1)) { flow.insertAdjacentHTML('beforeend', `<span class="run">${s}…</span>`); await sleep(450); flow.lastElementChild.className = 'ok'; flow.lastElementChild.textContent = s + ' ✓'; }
      $('.sc-title').value = ''; redraw();
    } catch (err) {
      console.warn('일정 등록', err && err.code);
      flow.innerHTML = '<span class="run">등록하지 못했어요. 잠시 뒤 다시 눌러 주세요.</span>';
    } finally { btn.disabled = false; }
  };
  $('.sc-title').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) $('.sc-add').click(); };
  drawPick(); redraw();
  return box;
}

// ---------------------------------------------------------------- 7. 쌓인 문서에서 할 일 뽑기
function demoDocs() {
  const [box, body] = shell('docs', '쌓인 메일·공문에서 할 일 뽑기', '이번 주에 들어온 문서 8건(가상)입니다. AI에게 할 일과 마감을 뽑게 하고, 사람이 골라 등록합니다.');
  const D = [
    ['교육청', '2027학년도 학교 정보화기기 유지보수 계약 갱신 안내', '견적서·실적 증명 제출', '2026-11-20'],
    ['조달청', '전자칠판 다수공급자계약 2단계 경쟁 공고', '입찰 서류 제출(17시 마감)', '2026-11-25'],
    ['협력사', '부품 단가 조정 요청(12월 반영)', '단가 조정 회신', '2026-11-18'],
    ['고객 학교', '가람중 겨울방학 정기 점검 요청', '방문 날짜 조율(1월 첫 주 희망)', ''],
    ['세무서', '2기 부가가치세 확정 신고 안내', '부가세 신고 준비', '2027-01-25'],
    ['사내', '직원 산업안전 교육 실시 안내', '안전 교육 이수 확인', '2026-11-28'],
    ['교육청', '[재발송] 유지보수 계약 갱신 안내', '견적서·실적 증명 제출', '2026-11-20', true],
    ['고객 학교', '나래초 무선망 속도 저하 문의', '원인 확인 회신', '2026-11-13'],
  ];
  body.innerHTML = `<div class="dc-in">${D.map((d) => `<div class="dc-mail"><span class="tag">${d[0]}</span>${esc(d[1])}</div>`).join('')}</div>
    <button class="btn primary big dc-run">AI로 할 일 뽑기</button><div class="dc-out"></div>`;
  body.querySelector('.dc-run').onclick = async (e) => {
    e.target.classList.add('hidden');
    const out = body.querySelector('.dc-out');
    out.innerHTML = '<table class="dc-t"><tr><th></th><th>할 일</th><th>마감</th><th>출처</th></tr></table><div class="dc-sum"></div>';
    const t = out.querySelector('table');
    for (const d of D) {
      await sleep(380);
      const due = d[3] ? md(new Date(d[3] + 'T00:00')) : '조율';
      t.insertAdjacentHTML('beforeend', d[4] ? `<tr class="dup"><td>—</td><td>${esc(d[2])}</td><td>${due}</td><td>${d[0]} <span class="dup-tag">중복 → 뺌</span></td></tr>`
        : `<tr><td><input type="checkbox" checked></td><td>${esc(d[2])}</td><td>${due}</td><td>${d[0]}</td></tr>`);
    }
    const sum = out.querySelector('.dc-sum');
    sum.innerHTML = `<p>문서 ${D.length}건 → 할 일 ${D.length - 1}건(중복 1건 뺌). 등록할 것만 남기고 체크를 풀어 보세요.</p><button class="btn primary">캘린더에 등록하기</button>`;
    sum.querySelector('button').onclick = () => { const n = t.querySelectorAll('input:checked').length; sum.innerHTML = `<div class="tipline">✅ ${n}건을 캘린더에 등록했다고 가정합니다. 강사는 실제로 한 달 공문 681건에서 일정 후보 95건을 뽑고, 중복 7건을 뺀 88건을 사람이 확인해 등록했습니다.</div>`; };
  };
  return box;
}

// ---------------------------------------------------------------- 8. 업무 설명서(스킬)로 맡기기
function demoSkill() {
  const [box, body] = shell('skill', '한 번 가르친 업무를 그대로 맡기기(스킬)', '"출장 신청" 업무 설명서를 AI에게 주고 맡겨 봅니다. 결재 직전에는 사람이 확인합니다.');
  const SK = ['업무 시스템에 들어가 [출장 신청] 화면 열기', '출장 목적·장소·시간을 메모에서 가져와 칸 채우기', '규정과 다른 점 살피기(근무 시간 밖·여비 기준)', '결재선 확인(팀장 → 대표)', '사람에게 확인받은 뒤 결재 올리기'];
  body.innerHTML = `<div class="sk-doc"><h6>📘 스킬: 출장 신청하기</h6><ol>${SK.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><small>한 번 적어 두면 다음부터 AI가 이 순서대로 일합니다.</small></div>
    <div class="pr-box"><div class="pr-label">맡길 일</div>내일 14:00~19:00 다온고 무선망 점검 출장 신청해 줘.</div>
    <button class="btn primary big sk-run">AI에게 맡기기</button><ol class="ag-log sk-log"></ol><div class="sk-end"></div>`;
  body.querySelector('.sk-run').onclick = async (e) => {
    e.target.classList.add('hidden');
    const ol = body.querySelector('.sk-log'), R = ['출장 신청 화면을 열었습니다.', '목적: 다온고 무선망 점검 / 장소: 다온고 / 시간: 14:00~19:00', '⚠ 끝나는 시각 19:00이 근무 시간(18:00) 밖입니다. 시간 외 근무 신청이 함께 필요할 수 있습니다.', '결재선: 정 팀장 → 대표', ''];
    for (let i = 0; i < SK.length - 1; i++) {
      const li = document.createElement('li'); li.className = 'run'; li.innerHTML = `<span class="ic">${i + 1}</span><div><b>${esc(SK[i])}</b><small>…</small></div>`;
      ol.append(li); await sleep(800); li.className = R[i].startsWith('⚠') ? 'warn' : 'ok'; li.querySelector('small').textContent = R[i];
    }
    const end = body.querySelector('.sk-end');
    end.innerHTML = `<div class="sk-confirm"><b>✋ 결재를 올리기 전에 확인해 주세요</b><p>근무 시간 밖 1시간이 있습니다. 그대로 올릴까요?</p><button class="btn primary" data-a="go">18시로 고쳐서 올리기</button> <button class="btn" data-a="keep">그대로 올리기</button></div>`;
    end.querySelectorAll('button').forEach((b) => { b.onclick = () => { end.innerHTML = `<div class="tipline">✅ ${b.dataset.a === 'go' ? '14:00~18:00으로 고쳐' : '19:00 그대로'} 결재를 올렸다고 가정합니다. 이상한 점은 AI가 먼저 알려 주고, 올리는 결정은 사람이 했습니다.</div>`; }; });
  };
  return box;
}

// ---------------------------------------------------------------- 9. 회의 녹음 정리
function demoMeeting() {
  const [box, body] = shell('meeting', '회의는 녹음, 정리는 AI', '10분 회의를 글로 옮긴 일부입니다(가상). AI에게 정리를 맡기고, 사람이 확인할 곳을 봅니다.');
  const TR = [
    ['대표', '이번 겨울방학 점검, 학교가 작년보다 늘었죠?'],
    ['정 팀장', '네, 열두 곳에서 열네 곳으로 늘었습니다. 기사 두 명으로는 빠듯합니다.'],
    ['윤 기사', '전자칠판 보정 도구가 하나뿐이라 두 팀이 동시에 못 나갑니다.'],
    ['대표', '그럼 보정 도구 하나 더 사고, 다음 주 목요일까지 방문 순서 짜 주세요.'],
    ['영업 김', '가람중은 1월 첫 주를 원하셨어요. 제가 날짜 확인해서 정 팀장님께 드릴게요.'],
    ['정 팀장', '그럼 김 대리님 확인 받고 목요일에 전체 일정 공유하겠습니다.'],
  ];
  const CHECK = ['열두 곳에서 열네 곳', '다음 주 목요일', '김 대리님'];
  body.innerHTML = `<div class="mt-tr">${TR.map(([w, t]) => `<p><b>${w}</b> <span>${esc(t)}</span></p>`).join('')}</div>
    <button class="btn primary big mt-run">AI로 정리하기</button><div class="mt-out"></div>`;
  body.querySelector('.mt-run').onclick = async (e) => {
    e.target.classList.add('hidden');
    const out = body.querySelector('.mt-out');
    out.innerHTML = '<p class="muted">글로 옮긴 내용을 읽는 중…</p>'; await sleep(900);
    out.innerHTML = `<div class="mt-card"><h6>📝 요약</h6><p>겨울방학 점검 학교가 14곳으로 늘어 인력과 장비가 빠듯하다. 보정 도구를 하나 더 사고, 방문 순서를 정해 공유하기로 했다.</p></div>
      <div class="mt-card"><h6>✅ 결정</h6><p>· 전자칠판 보정 도구 1개 추가 구입<br>· 방문 순서를 정해 전 직원에게 공유</p></div>
      <div class="mt-card"><h6>📌 할 일</h6><table><tr><th>누가</th><th>무엇을</th><th>언제까지</th></tr><tr><td>영업 김</td><td>가람중 방문 날짜 확인</td><td>다음 주 초</td></tr><tr><td>정 팀장</td><td>14곳 방문 순서 짜서 공유</td><td>다음 주 목요일</td></tr><tr><td>(담당 미정)</td><td>보정 도구 구입</td><td>—</td></tr></table></div>
      <div class="mt-card warnish"><h6>🔍 사람이 확인할 곳</h6><p>· "영업 김"을 "김 대리"라고 부름 — 같은 사람인가요?<br>· "다음 주 목요일"이 정확히 며칠인가요?<br>· 보정 도구 구입은 누가 맡나요? 회의에서 정하지 않았습니다.</p>
      <button class="btn" data-a="hl">회의 글에서 확인할 곳 표시하기</button></div>`;
    out.querySelector('[data-a=hl]').onclick = () => {
      body.querySelectorAll('.mt-tr span').forEach((s) => { let h = s.textContent; for (const c of CHECK) h = h.split(c).join(`\u0001${c}\u0002`); s.innerHTML = esc(h).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>'); });
      body.querySelector('.mt-tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  };
  return box;
}

// ---------------------------------------------------------------- 10. 유지보수 앱 흐름 미리 보기
function demoMaintFlow() {
  const [box, body] = shell('maintflow', '접수 한 건이 지나가는 길', '단계를 눌러 각 단계에서 누가 무엇을 하는지 봅니다. 실제 앱 화면은 아래 그림으로 볼 수 있어요.');
  const S = [
    ['📱', '선생님 접수', '휴대폰으로 장소·기기를 고르고 한 줄만 적습니다. 1분이면 끝납니다.'],
    ['🤖', 'AI 자동 안내', '그 기기의 사양과 지난 수리 기록을 보고 "기사님 오기 전에 해 볼 것"을 바로 알려 줍니다. 해결되면 방문 없이 끝납니다.'],
    ['🖥️', '원격 지원', '기사님이 연결 코드로 원격 지원을 하고 채팅으로 안내합니다.'],
    ['🚶', '방문·조치', '원격으로 안 되면 방문합니다. AI가 원인 후보, 확인 순서, 챙길 부품을 미리 제안합니다.'],
    ['📝', '결과보고', '원인·조치·부품·시간을 남깁니다. 이 기록이 다음 접수의 AI 안내 근거가 됩니다.'],
    ['📊', '대시보드', '유형·장소·모델별로 쌓여 예비 부품, 교체 계획, 계약 근거가 됩니다.'],
  ];
  let i = 0;
  body.innerHTML = `<div class="mf-steps">${S.map(([ic, t], n) => `<button data-n="${n}"><span>${ic}</span>${t}</button>`).join('<i>→</i>')}</div><div class="mf-say"></div>`;
  const draw = () => { body.querySelectorAll('[data-n]').forEach((b) => b.classList.toggle('on', +b.dataset.n === i)); body.querySelector('.mf-say').innerHTML = `<b>${S[i][0]} ${S[i][1]}</b><p>${esc(S[i][2])}</p>`; };
  body.querySelectorAll('[data-n]').forEach((b) => { b.onclick = () => { i = +b.dataset.n; draw(); }; });
  draw();
  return box;
}


// ---------------------------------------------------------------- 11. 오답의 재발견(학생이 되어 보기)
function demoOdap() {
  const [box, body] = shell('odap', '학생이 되어 보기: 답과 이유를 내면 AI가 되묻습니다', '중학교 1학년 수학 문제입니다. 일부러 틀린 답을 골라 보셔도 좋습니다.');
  const OPT = [
    { a: '2', ok: true, ask: '맞았어요! 그런데 "빼기 음수"를 어떻게 생각했는지 한 문장으로 설명해 볼까요? 친구에게 알려 준다고 생각해 보세요.' },
    { a: '−8', ask: '−3에서 5를 더 내려가면 −8이 되지요. 그런데 문제는 "−5를 빼는 것"이에요. 빚 5만 원을 누가 없애 주면 내 형편은 나빠질까요, 좋아질까요?' },
    { a: '8', ask: '부호를 바꾸는 생각은 좋아요! 그런데 −3의 부호까지 바꿨네요. 바뀌는 것은 빼는 수(−5)의 부호뿐이에요. 다시 계산하면 얼마일까요?' },
    { a: '−2', ask: '3과 5의 차이가 2라는 것은 맞아요. 그럼 부호는 왜 −로 정했나요? 수직선에서 −3에서 출발해 어느 쪽으로 움직였는지 그려 볼까요?' },
  ];
  const CLASS = [14, 6, 3, 5];
  let pick = -1, stage = 0;
  body.innerHTML = `<div class="gr-q"><b>문제</b> (−3) − (−5) 의 값은?</div><div class="od-opts od-a"></div>
    <textarea class="sc-title od-why" rows="2" maxlength="80" placeholder="그렇게 생각한 이유를 한 줄로 적어 보세요"></textarea>
    <button class="btn primary big od-send">답 내기</button><div class="od-ai"></div><div class="od-teacher hidden"></div>`;
  const draw = () => { body.querySelector('.od-a').innerHTML = OPT.map((o, i) => `<button data-i="${i}" class="${i === pick ? 'on' : ''}">${o.a}</button>`).join(''); body.querySelectorAll('.od-a button').forEach((b) => { b.onclick = () => { pick = +b.dataset.i; draw(); }; }); };
  body.querySelector('.od-send').onclick = async (e) => {
    if (pick < 0) { body.querySelector('.od-ai').innerHTML = '<p class="muted">먼저 답을 하나 골라 주세요.</p>'; return; }
    e.target.disabled = true; stage++;
    const ai = body.querySelector('.od-ai');
    ai.innerHTML = '<div class="mt-card"><h6>🤖 AI가 되묻습니다</h6><p class="od-say"></p><p class="muted">정답을 바로 알려 주지 않고, 학생이 스스로 다시 생각하게 묻습니다.</p></div>';
    await typeOut(ai.querySelector('.od-say'), OPT[pick].ask, 14);
    e.target.disabled = false; e.target.textContent = '답 다시 내기';
    const c = CLASS.slice(); c[pick]++; const n = c.reduce((a, b) => a + b, 0), mx = Math.max(...c);
    const t = body.querySelector('.od-teacher'); t.classList.remove('hidden');
    t.innerHTML = `<div class="mt-card"><h6>👩‍🏫 교사 화면(가상 반 ${n}명)</h6><div class="od-res">${OPT.map((o, i) => `<div class="bar"><span>${o.a}${o.ok ? ' (정답)' : ''}${i === pick ? ' · 나' : ''}</span><i style="width:${(c[i] / mx) * 100}%"></i><b>${c[i]}</b></div>`).join('')}</div>
      <p class="muted">오개념 알림: "부호를 모두 바꿈(8)" ${c[2]}명, "빼기를 그대로 내려감(−8)" ${c[1]}명 → 다음 시간에 수직선으로 다시 설명</p></div>`;
  };
  draw();
  return box;
}

// ---------------------------------------------------------------- 12. 내일 해 볼 일 카드
function demoTomorrow() {
  const [box, body] = shell('tomorrow', '내일 해 볼 일 카드 만들기', '내 업무 하나와 쓸 도구를 고르면, 내일 아침 바로 붙여 넣을 첫 부탁이 만들어집니다.');
  const JOB = {
    '회의 정리': '오늘 회의 녹음(또는 메모)을 붙여 넣을게. 결정 사항, 할 일(누가·무엇을·언제까지), 아직 정하지 않은 것 세 부분으로 나눠 정리해 줘. 사람 이름과 날짜가 헷갈리는 곳은 [확인 필요]라고 표시해 줘.',
    '메일·문서 할 일': '아래는 이번 주에 받은 메일 제목과 본문이야. 내가 해야 할 일과 마감을 표(할 일·마감·보낸 곳)로 뽑아 줘. 같은 내용이 두 번 온 것은 하나로 합치고, 마감이 없는 것은 "조율"이라고 적어 줘.',
    '견적·제안서 초안': '너는 학교 정보화기기 유지보수 회사의 영업 담당이야. 아래 요청 메일을 읽고 1쪽 제안서 초안을 써 줘. 현재 문제, 제안 내용, 기대 효과, 일정 순서로 쓰고, 모르는 금액과 수치는 [확인 필요]로 남겨 줘.',
    '아침 일정 브리핑': '매일 아침 7시 30분에 내 구글 캘린더의 오늘 일정을 시간 순서로 정리하고, 7일 안에 있는 마감을 D-day와 함께 알려 줘. 휴대폰 화면 한 장에 들어가게 짧게 써 줘.',
    '고객 문의 분석': '아래는 지난달 고객 문의 접수 목록이야. 유형별 건수를 세고, 가장 많은 문제 세 가지와 대응 방안을 세 줄로 정리해 줘. 표에 없는 원인은 지어내지 말고 "자료에 없음"이라고 해 줘.',
  };
  const TOOL = ['ChatGPT', '제미나이', '클로드', '회사에서 쓰는 AI'];
  let j = '회의 정리', t = '제미나이';
  body.innerHTML = `<div class="sk-row"><span>업무</span><div class="chips tj">${Object.keys(JOB).map((k) => `<button data-j="${k}">${k}</button>`).join('')}</div></div>
    <div class="sk-row"><span>도구</span><div class="chips tt">${TOOL.map((k) => `<button data-t="${k}">${k}</button>`).join('')}</div></div>
    <div class="tm-card"><div class="tm-h">📌 내일 해 볼 일</div><div class="tm-what"></div><div class="copy tm-copy"></div><button class="btn primary tm-btn">복사하기</button></div>`;
  const draw = () => {
    body.querySelectorAll('[data-j]').forEach((b) => b.classList.toggle('on', b.dataset.j === j));
    body.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    body.querySelector('.tm-what').innerHTML = `<b>${esc(j)}</b>을(를) <b>${esc(t)}</b>에 맡겨 보기 · 결과는 꼭 내가 확인`;
    body.querySelector('.tm-copy').textContent = JOB[j] + (j === '아침 일정 브리핑' && t !== '제미나이' ? '\n(예약 실행은 제미나이 스파크처럼 예약 기능이 있는 도구에서 해 보세요.)' : '');
  };
  body.querySelectorAll('[data-j]').forEach((b) => { b.onclick = () => { j = b.dataset.j; draw(); }; });
  body.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { t = b.dataset.t; draw(); }; });
  body.querySelector('.tm-btn').onclick = async (e) => { try { await navigator.clipboard.writeText(body.querySelector('.tm-copy').textContent); e.target.textContent = '복사했습니다'; } catch { e.target.textContent = '길게 눌러 직접 복사해 주세요'; } setTimeout(() => { e.target.textContent = '복사하기'; }, 2000); };
  draw();
  return box;
}

const DEMOS = { prompt: demoPrompt, agent: demoAgent, order: demoOrder, sketch: demoSketch, grade: demoGrade, schedule: demoSchedule, docs: demoDocs, skill: demoSkill, meeting: demoMeeting, maintflow: demoMaintFlow, odap: demoOdap, tomorrow: demoTomorrow };
export function buildDemo(name, ctx) {
  try { return (DEMOS[name] || (() => document.createElement('div')))(ctx); }
  catch (e) { console.warn('체험', name, e); const d = document.createElement('div'); d.className = 'muted'; d.textContent = '체험 화면을 열지 못했습니다.'; return d; }
}
