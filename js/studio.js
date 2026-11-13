/**
 * STUDIO LAYER · 动效与包装组件编排
 * ------------------------------------------------------------
 * 职责：Lenis 平滑滚动 + GSAP 时间轴编排 / 系统状态栏 / 自定义光标
 *       终端档案逐行揭示 / 指标数字计数 / GitHub 活跃度拉取
 *       项目卡高光跟随与架构分层展开
 *
 * 降级策略：任一依赖（GSAP / ScrollTrigger / Lenis）缺失或网络失败，
 *          对应能力自动关闭，页面保持完全可用，绝不因特效而白屏。
 */
(function () {
  'use strict';

  // 依赖检测必须是动态的：本脚本以 async 加载，可能早于 GSAP 执行，
  // 若在顶层求值就会永久判定为「不可用」而失去动效。
  const HAS_GSAP = () => typeof window.gsap !== 'undefined';
  const HAS_ST = () => typeof window.ScrollTrigger !== 'undefined';
  const HAS_SPLIT = () => typeof window.SplitText !== 'undefined';
  const HAS_LENIS = () => typeof window.Lenis !== 'undefined';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let _pluginsReady = false;
  function ensurePlugins() {
    if (_pluginsReady || !HAS_GSAP()) return _pluginsReady;
    const list = [];
    if (HAS_ST()) list.push(window.ScrollTrigger);
    if (HAS_SPLIT()) list.push(window.SplitText);
    if (list.length) window.gsap.registerPlugin.apply(window.gsap, list);
    _pluginsReady = true;
    return true;
  }

  // 等待动效库就绪（最多 3 秒）；即便超时，非动效功能也已正常工作
  function waitForGsap(cb) {
    if (HAS_GSAP()) { ensurePlugins(); cb(true); return; }
    let tries = 0;
    const timer = setInterval(() => {
      if (HAS_GSAP()) { clearInterval(timer); ensurePlugins(); cb(true); }
      else if (++tries > 30) { clearInterval(timer); cb(false); }
    }, 100);
  }

  /* ============================================================
     0. 加载指示
     ------------------------------------------------------------
     刻意不等 window.load：那要等 CDN 动效库与背景视频全部就绪，
     国内网络下会阻塞数秒。此处在 DOM 就绪后即刻收尾，内容始终可见、
     页面始终可滚动。
     ============================================================ */
  function closeBoot() {
    const boot = $('#boot');
    if (boot) {
      boot.classList.add('done');
      setTimeout(() => { boot.style.display = 'none'; }, 500);
    }
    const sb = $('#sb-state');
    if (sb) sb.textContent = 'READY';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(closeBoot, 120));
  } else {
    setTimeout(closeBoot, 120);
  }
  setTimeout(closeBoot, 2500); // 兜底：进度条绝不能一直挂着

  /* ============================================================
     1. 系统状态栏
     ============================================================ */
  function initStatusBar() {
    const bar = $('#statusbar');
    if (!bar) return;
    const clock = $('#sb-clock');
    const lat = $('#sb-lat');

    const tick = () => {
      if (clock) {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      }
    };
    tick();
    setInterval(tick, 1000);

    // 坐标：用访客时区偏移表示，避免额外请求定位接口
    if (lat) {
      const tz = -new Date().getTimezoneOffset() / 60;
      lat.textContent = `UTC${tz >= 0 ? '+' : ''}${tz}`;
    }

    const ver = $('#sb-ver');
    if (ver) ver.textContent = '2.0';

    requestAnimationFrame(() => bar.classList.add('ready'));
  }

  /* ============================================================
     2. 自定义光标（与原有鼠标光晕共存）
     ============================================================ */
  function initCursor() {
    const dot = $('#cursor-dot');
    const ring = $('#cursor-ring');
    if (!dot || !ring || REDUCED) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.classList.add('on');
      ring.classList.add('on');
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      dot.classList.remove('on');
      ring.classList.remove('on');
    });

    // 外环带阻尼跟随，产生"液态"迟滞感
    const loop = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    // 悬停形态切换
    const setMode = (mode) => {
      ring.classList.toggle('link', mode === 'link');
      ring.classList.toggle('card', mode === 'card');
    };
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('a, button, input, textarea, .project-card-link')) setMode('link');
      else if (t.closest('.project-card')) setMode('card');
      else setMode('');
    });
  }

  /* ============================================================
     3. 终端档案逐行揭示
     ============================================================ */
  function initTerminal() {
    const body = $('#term-body');
    if (!body) return;
    const lines = $$('.term-line', body);
    if (!lines.length) return;

    if (!HAS_GSAP() || REDUCED) {
      lines.forEach((l) => { l.style.opacity = 1; l.style.transform = 'none'; });
      return;
    }
    gsap.to(lines, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.075,
      ease: 'power2.out',
      delay: 0.35,
      scrollTrigger: { trigger: body, start: 'top 92%' }
    });
  }

  /* ============================================================
     4. 指标矩阵：数字滚动计数
     ============================================================ */
  function animateCount(el, target, suffix) {
    if (!el) return;
    if (!HAS_GSAP() || REDUCED) {
      el.textContent = target + (suffix || '');
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.7,
      ease: 'power3.out',
      onUpdate: () => { el.textContent = Math.round(obj.v) + (suffix || ''); },
      scrollTrigger: { trigger: el, start: 'top 94%' }
    });
  }

  function initMetrics(data) {
    const box = $('#metrics');
    if (!box) return;
    const nums = $$('[data-count]', box);
    if (!nums.length) return;

    const projects = (data && data.projects ? data.projects : []).filter((p) => p.public !== false);
    const videos = (data && data.videos ? data.videos : []) || [];
    const techSet = new Set();
    projects.forEach((p) => (p.techStack || []).forEach((t) => techSet.add(String(t).trim())));

    // 前三项来自站点自身数据，必定真实
    const local = [projects.length, videos.length, techSet.size];

    // 第四项来自 GitHub 公开 API，失败则退化为"仓库数未知"而不是编造
    animateCount(nums[0], local[0]);
    animateCount(nums[1], local[1]);
    animateCount(nums[2], local[2]);

    fetchGitHubRepos((repos) => {
      if (nums[3]) {
        if (repos && repos.count !== undefined) {
          animateCount(nums[3], repos.count);
          const src = nums[3].parentElement.querySelector('.metric-source');
          if (src) src.textContent = 'github api · live';
        } else {
          nums[3].textContent = '—';
        }
      }
    });

    // 状态栏展示真实技术栈覆盖数
    const stack = $('#sb-stack');
    if (stack) stack.textContent = techSet.size + ' 项';
  }

  /* ============================================================
     5. GitHub 公开数据
     ============================================================ */
  const GH_API = 'https://api.github.com';
  const GH_USER = 'Jancapboy';

  function gh(path, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 8000);
    return fetch(GH_API + path, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .finally(() => clearTimeout(timer));
  }

  function fetchGitHubRepos(cb) {
    gh(`/users/${GH_USER}/repos?per_page=100&sort=updated`).then((list) => {
      if (!Array.isArray(list)) return cb(null);
      cb({ count: list.length, list: list });
    }).catch(() => cb(null));
  }

  function initGitHubPanel() {
    const chart = $('#gh-chart');
    if (!chart) return;

    const fail = () => {
      chart.innerHTML = '<div style="flex:1;font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted);align-self:center">GitHub 数据暂不可达（网络受限），稍后自动重试</div>';
    };

    Promise.all([
      gh(`/users/${GH_USER}/repos?per_page=100&sort=updated`).catch(() => null),
      gh(`/users/${GH_USER}/events/public?per_page=100`).catch(() => null)
    ]).then(([repos, events]) => {
      if (!Array.isArray(repos)) return fail();

      // 仓库数与语言分布
      const repoEl = $('#gh-repos');
      if (repoEl) repoEl.textContent = repos.length + ' repos';

      const langCount = {};
      repos.forEach((r) => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
      const langs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const topEl = $('#gh-lang-top');
      if (topEl && langs.length) topEl.textContent = langs[0][0];

      const langBox = $('#gh-langs');
      if (langBox) {
        const palette = ['#22d3ee', '#6366f1', '#a78bfa', '#fbbf24', '#2dd4bf', '#e879f9'];
        langBox.innerHTML = langs.map(([name, n], i) =>
          `<span class="gh-lang"><i style="background:${palette[i % palette.length]}"></i>${name} · ${n}</span>`
        ).join('');
      }

      // 近 12 周活跃度：用每个仓库的最近推送时间聚合。
      // 公开事件接口只覆盖最近 30 天，铺不满 12 周；
      // 而 pushed_at 覆盖全部 26 个仓库，分布更完整且同样真实。
      const weeks = new Array(12).fill(0);
      const now = Date.now();
      const WEEK = 7 * 24 * 3600 * 1000;
      let pushes = 0;
      repos.forEach((r) => {
        if (!r.pushed_at) return;
        const ago = (now - new Date(r.pushed_at).getTime()) / WEEK;
        const idx = Math.floor(ago);
        if (idx >= 0 && idx < 12) weeks[11 - idx]++;
      });
      if (Array.isArray(events)) {
        events.forEach((e) => { if (e.type === 'PushEvent') pushes++; });
      }
      const pushEl = $('#gh-push');
      if (pushEl) pushEl.textContent = pushes + ' pushes / 30d';

      const max = Math.max.apply(null, weeks.concat([1]));
      chart.innerHTML = weeks.map((n, i) => {
        const h = Math.max(3, Math.round((n / max) * 88));
        return `<div class="gh-bar" data-n="${n}" style="height:${h}px"></div>`;
      }).join('');

      if (HAS_GSAP && !REDUCED) {
        gsap.to($$('.gh-bar', chart), {
          scaleY: 1,
          duration: 0.8,
          stagger: 0.05,
          ease: 'power2.out',
          scrollTrigger: { trigger: chart, start: 'top 88%' }
        });
      } else {
        $$('.gh-bar', chart).forEach((b) => { b.style.transform = 'scaleY(1)'; });
      }
    }).catch(fail);
  }

  /* ============================================================
     6. 技术栈分层映射（真实技术，归类规则显式声明）
     ============================================================ */
  const LAYER_RULES = [
    { name: '接入层', cls: '', re: /react|vue|javascript|typescript|^node(\.js)?$|vite|zustand|three\.js|^css|移动端适配|edge headless|chrome devtools|websocket|rest api|api$|webhook|^cors|cdn|localstorage|es2023|^html|前端|接入|webgl|gsl|gsap|scrolltrigger|splittext|lenis|intersectionobserver|backdrop-filter|echarts|数字孪生|cdp|datamatrix|rfid|sse|unrealbloom|二维码|wechaty|wechat4u|sidecar/i },
    { name: '服务层', cls: 'l2', re: /python|spring boot|shell|node-?red|langchain|langgraph|^dag$|^lcel$|openclaw|自动化流水线|aiohttp|media|selenium|playwright|curl|globalping|check-host|git(hub)? cli|数字人|^tts$|^llm$|^fde$|mulberry|or-tools|cassowary|crdt|oplog|自动化|流媒体|一致性控制|ros2|rclpy|行为树|路径规划|任务队列|硬件抽象|^go |stl|几何推导|哈希链|契约层|故障分类|网格简化|门禁决策|顶点焊接|固定区间|字典序|插件源码/i },
    { name: '数据层', cls: '', re: /mysql|redis|oceanbase|mgr|proxysql|sql server|rss|知识图谱|数据库|存储|mongo|postgres|kafka|clickhouse|elastic|数据|缓存|sqlite/i },
    { name: '基础设施', cls: 'l3', re: /linux|docker|nginx|caddy|systemd|wsl|mihomo|edgeone|github pages|cloudstudio|edge functions|gpu 集群|ffmpeg|server酱|部署|运维|k8s|kubernetes|prometheus|ci\/cd|架构|工程|grafana|资产门禁/i },
    { name: 'AI / 模型', cls: 'l2', re: /llm|langchain|langgraph|hunyuan|lora|comfyui|minimax|数字人|^tts$|ai 漫剧|知识图谱|agent|rag|deepseek|stable diffusion|模型|智能体|生成|yolov8|rknn/i }
  ];

  function buildLayers(techs) {
    // 允许一项技术归属多层（LangChain 既是服务层也是 AI 层），
    // 规则显式声明、可核对，不做隐式猜测
    const out = [];
    LAYER_RULES.forEach((L) => {
      const hit = techs.filter((t) => L.re.test(t));
      if (hit.length) out.push({ name: L.name, cls: L.cls, items: hit });
    });
    // 未被任何规则覆盖的技术合并为一条，避免重复的「其他」行
    const covered = new Set();
    out.forEach((l) => l.items.forEach((t) => covered.add(t)));
    const rest = techs.filter((t) => !covered.has(t));
    if (rest.length) out.push({ name: '其它组件', cls: 'l3', items: rest });
    return out.slice(0, 5);
  }

  /* ============================================================
     7. 项目卡：高光跟随 + 架构分层展开
     ============================================================ */
  function initProjectCards(data) {
    const cards = $$('#projects-grid .project-card-link');
    if (!cards.length) return;
    const projects = (data && data.projects ? data.projects : []) || [];

    cards.forEach((link) => {
      const card = $('.project-card', link);
      const id = link.getAttribute('data-project-id');
      const proj = projects.find((p) => p.id === id);
      if (!card || !proj) return;

      // 架构分层：全部来自该项目真实 techStack
      const layers = buildLayers(proj.techStack || []);
      if (layers.length) {
        const peek = document.createElement('div');
        peek.className = 'arch-peek';
        peek.innerHTML =
          '<div class="arch-peek-title">技术分层</div>' +
          layers.map((L) =>
            `<div class="arch-layer ${L.cls}"><span>${L.name}</span><span>${L.items.join(' · ')}</span></div>`
          ).join('');
        card.appendChild(peek);
      }

      if (REDUCED) return;

      // 方向感知微位移 + 高光跟随（rAF 节流）
      let raf = null, tx = 0, ty = 0, px = 0, py = 0;
      link.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 8;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 6;
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        if (raf) return;
        raf = requestAnimationFrame(() => {
          px += (tx - px) * 0.12;
          py += (ty - py) * 0.12;
          card.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
          raf = null;
        });
      }, { passive: true });

      link.addEventListener('pointerleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = '';
      });
    });
  }

  /* ============================================================
     8. 滚动编排
     ============================================================ */
  function initScroll() {
    if (!HAS_GSAP()) return;

    // Hero 标题：逐字揭示（SplitText 可用时）
    const h1 = $('#hero-name');
    if (h1 && HAS_SPLIT() && !REDUCED) {
      try {
        const split = new SplitText(h1, { type: 'chars,words', charsClass: 'sp-char' });
        gsap.set(h1, { opacity: 1 });
        gsap.from(split.chars, {
          yPercent: 118,
          opacity: 0,
          duration: 0.85,
          stagger: 0.032,
          ease: 'power4.out',
          delay: 0.25
        });
      } catch (e) { /* SplitText 失败则保持静态 */ }
    }

    // 分区标题：进入时上移淡入
    if (HAS_ST() && !REDUCED) {
      $$('.section-title').forEach((t) => {
        if (t.classList.contains('animate-in')) return;
        gsap.from(t, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: t, start: 'top 90%' }
        });
      });
    }
  }

  /* ============================================================
     9. 启动
     ============================================================ */
  function boot(withData) {
    initStatusBar();

    // 滚动标记：用于降低悬浮按钮存在感，避免遮挡内容
    window.addEventListener('scroll', () => {
      document.body.classList.toggle('scrolled', window.scrollY > 140);
    }, { passive: true });

    initCursor();
    initMetrics(withData);
    initGitHubPanel();
    initProjectCards(withData);

    // 依赖 GSAP 的部分等库就绪后再启动
    waitForGsap(function (ok) {
      if (!ok) {
        console.info('[studio] 动效库未就绪，已降级为无 GSAP 模式');
        initTerminal();   // 终端逐行揭示降级为直接显示
        return;
      }
      initTerminal();
      initScroll();
      setupLenis();
    });

  }

  // Lenis 平滑滚动：接管原生滚动并驱动 ScrollTrigger。
  // 移动端不启用：原生触摸滚动手感更好，也避开与 ScrollTrigger 的兼容问题。
  function setupLenis() {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (HAS_LENIS() && HAS_ST() && !REDUCED && !isCoarse) {
      const lenis = new window.Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      // 锚点跳转交给 Lenis，避免原生 scrollTop 与平滑滚动打架
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -118 });
      });
      window.__lenis = lenis;
    }
  }

  // 等待数据就绪；超时兜底（数据层失败也要让页面动起来）
  let started = false;
  let lastData = null;
  const start = (d) => {
    if (started) {
      // 数据迟到时补齐指标，避免显示 0；同一份数据只补一次，防止数字重复滚动
      if (d && d !== lastData) {
        lastData = d;
        initMetrics(d);
      }
      return;
    }
    started = true;
    lastData = d || null;
    boot(d || null);
  };
  document.addEventListener('resume:dataready', (e) => start(e.detail));
  // 本脚本以 async 加载，可能晚于 main.js 派发事件（监听器尚未注册，事件已丢失），
  // 因此兜底时优先读 main.js 挂在 window 上的数据，而不是直接传 null。
  setTimeout(
    () => start(window.__resumeData || null),
    window.__resumeData ? 0 : 2600
  );
})();
