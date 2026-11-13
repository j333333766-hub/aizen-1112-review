// 복기 사이트 화면 그리기. 연수 사이트(talk.js)의 내용 블록 그리기를 옮기고, 실시간 저장·Firebase 연결은 모두 뺐다.
// 내용은 content.js, 현장 결과(익명 집계)는 data.js, '직접 해 보기'는 demos.js(이 기기 안에서만 움직임).
import { PAGES, QUESTIONS } from './content.js';
import { buildDemo } from './demos.js';
import { RESULT } from './data.js';

const STEPS = [
  { id: 'survey', no: 1, title: '시작 설문 · AI 이해', tag: '설문 결과와 요즘 AI 활용 추세' },
  { id: 'daily', no: 2, title: '일상 활용', tag: '카페 주문 앱, 행사 스케치 영상, 회사 홍보 영상' },
  { id: 'school', no: 3, title: '수업·평가에서의 AI 활용', tag: '3D 모델링과 AR, 실시간 수업, 평가' },
  { id: 'work', no: 4, title: '일터의 AI', tag: '일정 브리핑, 스킬·MCP, 회의 녹음 정리' },
  { id: 'maint', no: 5, title: '유지보수 접수 앱 체험', tag: '선생님 접수부터 대시보드까지' },
  { id: 'qna', no: 6, title: '질문과 마무리', tag: '현장에서 나온 질문, 내일 해 볼 일' },
];
const THEMES = ['t-read', 't-walk', 't-write'];
const themeOf = (s) => THEMES[s.no % 3];
const MOODS = [
  { label: '아주 좋아요!', emoji: '1f604', color: '#3db271' },
  { label: '좋아요!', emoji: '1f642', color: '#84cc16' },
  { label: '괜찮아요!', emoji: '1f610', color: '#eab308' },
  { label: '어려움을 겪고 있어요!', emoji: '1f61f', color: '#f97316' },
  { label: '기분이 좋지 않아요!', emoji: '1f622', color: '#e7464c' },
];
const AR_URL = 'https://dancing-bublanina-48349a.netlify.app/';
const TRIPO_URL = 'https://studio.tripo3d.ai/', CAR_IMG = 'img/tesla-roadster.jpg';

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}

// ---------- 막대(설문·기분) ----------
const BAR_COLORS = ['#ed7833', '#3db271', '#1e9bd7', '#be0081', '#f9c04c', '#e7464c', '#7dbe3e', '#005baa', '#8b5cf6'];
function textBars(options, counts, total) {
  const max = Math.max(1, ...counts);
  return el('div', { class: 'tbars' }, options.map((t, i) => {
    const pct = total ? Math.round((counts[i] / total) * 100) : 0;
    return el('div', { class: 'tbar' },
      el('div', { class: 'tbar-top' }, el('span', { class: 'tbar-label' }, t), el('span', { class: 'tbar-num' }, counts[i] ? `${counts[i]}명 · ${pct}%` : '0')),
      el('div', { class: 'tbar-track' }, el('div', { class: 'tbar-fill', style: `width:${(counts[i] / max) * 100}%;background:${BAR_COLORS[i % BAR_COLORS.length]}` })));
  }));
}
function moodBars(counts, total) {
  const max = Math.max(1, ...counts);
  return el('div', {}, MOODS.map((m, i) => el('div', { class: 'bar-row' },
    el('img', { class: 'bar-emoji', src: `emoji/${m.emoji}.svg`, alt: '' }),
    el('div', { class: 'bar-label' }, m.label),
    el('div', { class: 'bar-track' }, el('div', { class: 'bar-fill', style: `width:${(counts[i] / max) * 100}%;background:${m.color}` })),
    el('div', { class: 'bar-num' }, counts[i] ? `${counts[i]}명 · ${Math.round((counts[i] / total) * 100)}%` : '0'))));
}

// ---------- 내용 블록 ----------
function copyBox(text) {
  const b = el('button', { class: 'btn copybtn', type: 'button' }, '복사하기');
  b.onclick = async () => {
    try { await navigator.clipboard.writeText(text); b.textContent = '복사했습니다'; } catch { b.textContent = '길게 눌러 직접 복사해 주세요'; }
    setTimeout(() => { b.textContent = '복사하기'; }, 2000);
  };
  return el('div', { class: 'copy-wrap' }, el('div', { class: 'copy' }, text), b);
}
function qrSvg(url) {
  const box = el('div', { class: 'lq-qr', 'aria-label': 'QR 코드' });
  if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
  return box;
}
function linkQr(url, label) {
  return el('div', { class: 'lq' },
    el('a', { class: 'btn big primary', href: url, target: '_blank', rel: 'noopener' }, label + ' ↗'),
    qrSvg(url),
    el('div', { class: 'qr-try-url lq-url' }, url.replace(/^https?:\/\//, '').replace(/\/$/, '')));
}
function moreBox(items) {
  const btns = el('div', { class: 'more-btns' }), panes = [];
  const wrap = el('div', { class: 'more' }, btns);
  items.forEach(([label, body, kind]) => {
    const pane = el('div', { class: 'more-pane' + (kind === 'warn' ? ' warn' : ''), hidden: true },
      Array.isArray(body) ? el('ol', {}, body.map(([t, x]) => el('li', {}, el('b', {}, t + ': '), x))) : el('p', {}, body));
    const b = el('button', { class: 'more-btn' + (kind === 'warn' ? ' warn' : ''), type: 'button', 'aria-expanded': 'false' }, label);
    b.onclick = () => {
      const open = pane.hidden;
      panes.forEach(([pb, pp]) => { pp.hidden = true; pb.classList.remove('on'); pb.setAttribute('aria-expanded', 'false'); });
      if (open) { pane.hidden = false; b.classList.add('on'); b.setAttribute('aria-expanded', 'true'); }
    };
    panes.push([b, pane]); btns.append(b); wrap.append(pane);
  });
  return wrap;
}
function shots(list) {
  return el('div', { class: 'shots' }, list.map(([src, cap]) => el('figure', { class: 'shot' },
    el('a', { href: src, target: '_blank', rel: 'noopener', title: '크게 보기' }, el('img', { src, alt: cap, loading: 'lazy' })),
    el('figcaption', {}, cap))));
}
function tripoBox() {
  const COPY = '📋 사진 복사하기';
  const copyBtn = el('button', { class: 'btn big primary tripo-copy', type: 'button' }, COPY);
  copyBtn.onclick = async () => {
    try {
      const png = new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'); }; img.onerror = rej; img.src = CAR_IMG; });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      copyBtn.textContent = '사진을 복사했어요 ✓';
    } catch { copyBtn.textContent = '사진 위에서 오른쪽 단추 → 이미지 복사'; }
    setTimeout(() => { copyBtn.textContent = COPY; }, 3500);
  };
  return el('div', { class: 'tripo' },
    el('ol', { class: 'tripo-steps' },
      el('li', {}, el('b', {}, '사진 준비: '), '휴대폰은 [사진 저장하기], PC는 [사진 복사하기]를 눌러요.'),
      el('li', {}, el('b', {}, 'Tripo 열기: '), '[Tripo 3D 열기]를 누르거나 QR을 휴대폰 카메라로 비춰요.'),
      el('li', {}, el('b', {}, '로그인: '), '‘Continue with Google’ → ', el('b', {}, '본인 구글 계정'), '으로 로그인해요.'),
      el('li', {}, el('b', {}, '3D 만들기: '), '사진을 올리거나 Ctrl+V로 붙여 넣고 만들기(Generate) → 1~2분 기다리기'),
      el('li', {}, el('b', {}, '돌려 보기: '), '완성된 모델을 끌어 돌리고, 두 손가락(휠)으로 크게·작게 보세요.')),
    el('figure', { class: 'tripo-img' }, el('img', { src: CAR_IMG, alt: '3D로 만들 자동차 사진(테슬라 로드스터)', loading: 'lazy' })),
    el('div', { class: 'go-btns tripo-btns' }, el('a', { class: 'btn big primary', href: CAR_IMG, download: 'tesla-roadster.jpg' }, '📥 사진 저장하기'), copyBtn),
    linkQr(TRIPO_URL, 'Tripo 3D 열기'),
    el('p', { class: 'muted' }, '처음이면 무료 크레딧으로 충분해요. 개인 자료는 올리지 마세요.'));
}
function arBox() {
  return el('div', { class: 'ar-share on' },
    el('h4', {}, '🥽 연수 때 만든 AR 작품 보기'),
    qrSvg(AR_URL),
    el('a', { class: 'btn big primary', href: AR_URL, target: '_blank', rel: 'noopener' }, 'AR 보기 열기 ↗'),
    el('div', { class: 'qr-try-url' }, AR_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')),
    el('p', {}, '휴대폰에서 열고 AR 보기 단추를 누른 뒤 바닥이나 책상을 비추면 작품이 나타납니다. PC라면 QR을 휴대폰 카메라로 비추세요.'));
}
function liveResult() {
  const L = RESULT.live;
  const opts = ['원기둥', '원뿔', '구', '직육면체'];
  const box = el('div', { class: 'result-box' },
    el('h4', {}, '📊 연수 당일 결과(익명)'),
    el('p', { class: 'muted' }, `${L.n}명이 들어와 ${L.done}명이 마지막 쪽까지 마쳤고, 마친 분의 평균 점수는 ${L.avg}점(50점 만점)이었습니다.`),
    el('h5', {}, '1쪽 「직사각형을 한 변을 회전축으로 돌리면?」에서 고른 답'),
    textBars(opts.map((o, i) => (i === 0 ? o + ' (정답)' : o)), L.p1, L.p1.reduce((a, b) => a + b, 0)));
  if (L.ideas.length) box.append(el('h5', {}, '4쪽 「회사에서는 어디에 써 볼까?」 한 줄 생각'), el('div', { class: 'chips-static' }, L.ideas.map((t) => el('span', {}, t))));
  return box;
}
function qnaList() {
  return el('div', { class: 'result-box' },
    el('p', { class: 'muted' }, `연수 당일 질문 벽에 이름 없이 남겨 주신 질문 ${RESULT.qna.length}개입니다.`),
    el('div', { class: 'qboard-static' }, RESULT.qna.map((t, i) => el('div', { class: 'qnote', style: `--r:${(i % 3) - 1}deg` }, t))));
}
function block(b) {
  if (b.h) return el('h3', { class: 'pg-h' }, b.h);
  if (b.p) return el('p', { class: 'pg-p' }, b.p);
  if (b.lead) return el('p', { class: 'lead pg-lead' }, b.lead);
  if (b.copy) return copyBox(b.copy);
  if (b.demo) return buildDemo(b.demo);
  if (b.tripo) return tripoBox();
  if (b.arshare) return arBox();
  if (b.more) return moreBox(b.more);
  if (b.shots) return shots(b.shots);
  if (b.liveResult) return liveResult();
  if (b.qnaList) return qnaList();
  if (b.compare) {
    return el('div', { class: 'cmp' }, b.compare.map(([src, cap, sub], i) => el('figure', { class: 'cmp-item' + (i ? ' after' : ' before') },
      el('a', { href: src, target: '_blank', rel: 'noopener', title: '크게 보기' }, el('img', { src, alt: cap, loading: 'lazy' })),
      el('figcaption', {}, el('b', {}, cap), sub ? el('small', {}, sub) : ''))));
  }
  if (b.topic) {
    const [tag, title, qs, note] = b.topic;
    return el('div', { class: 'topic-box' }, el('span', { class: 'topic-tag' }, tag), el('h4', {}, title), el('ol', {}, qs.map((q) => el('li', {}, q))), note ? el('p', {}, note) : '');
  }
  if (b.yt) {
    const [id, cap, opt = {}] = b.yt;
    const q = opt.loop ? `?rel=0&playsinline=1&loop=1&playlist=${id}` : '?rel=0';
    return el('figure', { class: 'yt-box' },
      el('div', { class: 'yt-frame' }, el('iframe', { src: `https://www.youtube-nocookie.com/embed/${id}${q}`, title: cap, loading: 'lazy', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin' })),
      el('figcaption', {}, cap, ' · ', el('a', { href: `https://youtu.be/${id}`, target: '_blank', rel: 'noopener' }, '유튜브에서 보기 ↗')));
  }
  if (b.ol) return el('ol', { class: 'pg-ol' }, b.ol.map(([t, x]) => el('li', {}, el('b', {}, t + ': '), x)));
  return el('div');
}

// ---------- 카드 ----------
function head(s, card) {
  card.append(el('span', { class: 'step-tag' }, `${s.no}단계 · ${s.tag}`), el('h2', {}, s.title));
}
function surveyCard(s) {
  const card = el('section', { class: `card step-card pg ${themeOf(s)}`, id: s.id });
  head(s, card);
  const R = RESULT.survey;
  const res = el('div', { class: 'sv-result' });
  QUESTIONS.filter((q) => q.type !== 'text').forEach((q) => {
    const r = R[q.id];
    const opts = q.id === 'keywords' ? q.options.slice(0, q.none) : q.options;
    res.append(el('div', { class: 'sv-q' }, el('h4', {}, q.title, el('small', {}, ` ${r.n}명`)), textBars(opts, r.c.slice(0, opts.length), r.n)));
  });
  card.append(
    el('p', { class: 'lead pg-lead' }, `연수를 시작하며 2분 설문을 했습니다. 이름과 연결되지 않은 ${RESULT.surveyN}명의 응답 합계입니다.`),
    el('details', { class: 'sv-fold', open: true }, el('summary', {}, '📊 설문 결과 보기'), res,
      RESULT.asks.length ? el('div', { class: 'sv-q' }, el('h4', {}, '오늘 연수에서 특히 궁금한 점(서술형)'), el('ul', { class: 'asks' }, RESULT.asks.map((t) => el('li', {}, t)))) : ''),
    el('h3', { class: 'sv-ai-title' }, PAGES.ai.title), ...PAGES.ai.body.map(block));
  return card;
}
function pageCard(s) {
  const card = el('section', { class: `card step-card pg ${themeOf(s)}`, id: s.id });
  head(s, card);
  card.append(...PAGES[s.id].body.map(block));
  return card;
}
function moodCard() {
  const M = RESULT.mood;
  const words = Object.entries(M.words).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
  const max = words.length ? words[0][1] : 1;
  return el('section', { class: 'card t-read', id: 'mood' },
    el('span', { class: 'step-tag' }, '처음 · 입장과 오늘 기분'),
    el('h2', {}, '우리의 오늘 기분'),
    el('p', { class: 'lead' }, `입장하면서 오늘 기분을 골랐습니다. ${M.n}명이 남긴 기분의 합계입니다.`),
    moodBars(M.mood, M.n),
    el('h3', {}, '감정 낱말'),
    el('div', { class: 'cloud' }, words.map(([w, n]) => el('span', { class: 'cloud-word', style: `font-size:${(15 + (max > 1 ? ((n - 1) / (max - 1)) * 21 : 6)).toFixed(1)}px` }, w, n > 1 ? el('sup', {}, String(n)) : null))));
}

const main = document.getElementById('steps');
main.append(moodCard(), ...STEPS.map((s) => (s.id === 'survey' ? surveyCard(s) : pageCard(s))));
document.getElementById('toc').append(...STEPS.map((s) => el('a', { href: '#' + s.id, class: themeOf(s) }, el('b', {}, String(s.no)), el('span', {}, s.title))));
document.getElementById('n-people').textContent = String(RESULT.people);
