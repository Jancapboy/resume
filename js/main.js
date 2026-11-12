/**
 * 简历网站 - 渲染 + 酷炫动效
 * 渲染逻辑（hero/skills/projects）+ 动效（打字机/粒子/视差/3D卡片/光晕/reveal）
 */

const DATA_CACHE_KEY = 'resume-data-v1';

/* 读取 index.html 内联的兜底数据（由 tools/inject_inline_data.py 注入） */
function readInlineData() {
  const el = document.getElementById('resume-data');
  if (!el) return null;
  try {
    const d = JSON.parse(el.textContent);
    return d && (d.projects || d.videos) ? d : null;
  } catch (e) {
    return null;
  }
}

/* 上一次成功拉取的数据，localStorage 二次兜底 */
function readCachedData() {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && (d.projects || d.videos) ? d : null;
  } catch (e) {
    return null;
  }
}

function cacheData(d) {
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(d));
  } catch (e) {
    /* 隐私模式可能禁写，忽略即可 */
  }
}

function dataSignature(d) {
  return JSON.stringify([d.profile, d.projects, d.videos]);
}

function applyData(data) {
  // 挂到 window 供动效层兜底读取：studio.js 以 async 加载，
  // 可能在它注册 resume:dataready 监听前本函数就已派发事件，
  // 事件丢失会导致指标矩阵显示 0（数据其实存在）。
  window.__resumeData = data;
  // 各渲染单元独立容错：单个区块失败不影响其余区块渲染
  const safe = (fn, label) => {
    try {
      fn();
    } catch (err) {
      console.error(`Render failed [${label}]:`, err);
    }
  };
  safe(() => renderProfile(data.profile), 'profile');
  safe(() => renderSkills(data.profile.skills), 'skills');
  safe(() => renderProjects(data.projects), 'projects');
  safe(() => renderVideos(data.videos), 'videos');

  // 通知动效层：数据已就绪，可以启动编排
  document.dispatchEvent(new CustomEvent('resume:dataready', { detail: data }));
}

// 不等待 DOMContentLoaded：defer 脚本（GSAP 等 CDN 资源）的加载会推迟
// DOMContentLoaded 触发，而国内访问 cdnjs 常常很慢——等它等于等 CDN，
// 首屏要多等好几秒。DOM 解析完毕即开始渲染。
(function () {
  const start = async () => {
  // --- 导航滚动效果 ---
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // --- 第一步：用内联兜底数据立即渲染 ---
  // 项目与视频板块完全由数据驱动，GitHub Pages 在国内访问不稳时 fetch 会失败，
  // 两个板块会同时空白。内联数据保证零网络依赖也能立刻显示内容。
  const inlineData = readInlineData();
  if (inlineData) {
    applyData(inlineData);
    initEffects();
  }

  // --- 第二步：拉取最新数据，仅在内容确实变化时重绘，避免闪烁 ---
  try {
    const response = await fetch('data/projects.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    cacheData(data);
    if (!inlineData || dataSignature(data) !== dataSignature(inlineData)) {
      applyData(data);
      initEffects();
    }
  } catch (err) {
    console.warn('projects.json 拉取失败，改用兜底数据:', err);
    if (!inlineData) {
      const cached = readCachedData();
      if (cached) {
        applyData(cached);
        initEffects();
      } else {
        document.getElementById('projects-grid').innerHTML =
          '<div class="empty-state"><div class="empty-icon">📭</div><p>数据加载失败，请检查网络后刷新重试</p></div>';
      }
    }
  }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

/* ================================================
   渲染函数
   ================================================ */

let _profileRendered = false;
function renderProfile(profile) {
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-location').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    ${profile.location}
  `;
  document.getElementById('hero-summary').textContent = profile.summary;
  document.title = `${profile.name} | 简历`;

  // 副标题直接呈现：逐字打字会延迟关键信息的可读性，
  // 该角色已由终端档案（.hero-terminal）承担。
  const sub = document.getElementById('hero-title');
  if (sub && !sub.textContent) sub.textContent = profile.title || '';
}

function renderSkills(skills) {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;

  // 按类别分组呈现：混杂的标签云看不出技术栈结构，
  // 分组后每个方向的覆盖度一目了然，组标题已表达分类，标签内不再重复徽章
  const groups = [];
  const index = new Map();
  (skills || []).forEach((s) => {
    const c = s.category || '其它';
    if (!index.has(c)) {
      index.set(c, groups.length);
      groups.push({ name: c, items: [] });
    }
    groups[index.get(c)].items.push(s.name);
  });

  grid.innerHTML = groups.map((g, gi) => `
    <div class="skill-group sg-${gi % 6}" style="animation: fade-up 0.55s ${0.1 + gi * 0.06}s var(--ease-out) both">
      <div class="skill-group-head">
        <span class="skill-group-name">${g.name}</span>
        <span class="skill-group-count">${g.items.length}</span>
      </div>
      <div class="skill-group-tags">
        ${g.items.map((n) => `<span class="skill-tag">${n}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  const publicProjects = projects.filter((p) => p.public !== false);

  if (publicProjects.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🚀</div><p>暂无公开项目，敬请期待</p></div>';
    return;
  }

  grid.innerHTML = publicProjects.map((proj, index) => `
    <a class="project-card-link" href="project.html?id=${proj.id}" data-project-id="${proj.id}">
      <div class="project-card animate-in" data-tilt style="animation-delay: ${index * 0.08}s">
        ${proj.screenshot ? `<img class="card-screenshot" src="${proj.screenshot}" alt="${proj.title}" loading="lazy">` : ''}
        <div class="card-category">${proj.category}</div>
        <div class="card-title">${proj.title}</div>
        <div class="card-desc">${proj.description}</div>
        ${proj.highlights && proj.highlights.length > 0 ? `
          <ul class="card-highlights">
            ${proj.highlights.slice(0, 4).map((h) => `<li>${h}</li>`).join('')}
          </ul>
        ` : ''}
        <div class="card-tech">
          ${(proj.techStack || []).map((tech) => `<span class="tech-badge">${tech}</span>`).join('')}
          ${(proj.techStack || []).length > 3 ? `<span class="tech-badge tech-more">+${proj.techStack.length - 3}</span>` : ''}
        </div>
        <div class="card-more">查看详情 →</div>
      </div>
    </a>
  `).join('');

  // 卡片的高光跟随与架构展开由 studio.js 统一处理，
  // 这里不再绑定裸 mousemove 3D 倾斜（无节流会掉帧）。
}

/* 视频作品 */
function renderVideos(videos) {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;

  if (!videos || videos.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎬</div><p>暂无视频作品，敬请期待</p></div>';
    return;
  }

  grid.innerHTML = videos.map((v, index) => `
    <figure class="video-card animate-in" style="animation-delay: ${index * 0.08}s">
      <div class="video-wrap">
        <video controls preload="none" poster="${v.poster}" playsinline>
          <source src="${v.src}" type="video/mp4">
          你的浏览器不支持 video 标签。
        </video>
        <span class="video-duration">${v.duration || ''}</span>
      </div>
      <figcaption class="video-info">
        <h3 class="video-title">${v.title}</h3>
        <p class="video-desc">${v.desc || ''}</p>
        <div class="video-tags">
          ${(v.tags || []).map((t) => `<span class="tech-badge">${t}</span>`).join('')}
        </div>
      </figcaption>
    </figure>
  `).join('');
}

/* ================================================
   动效函数
   ================================================ */

let _effectsInited = false;
function initEffects() {
  // 鼠标光晕与视差只初始化一次；reveal 每次重绘后都要重新绑定新插入的元素。
  // canvas 粒子背景已移除：与内容无关的装饰噪音且持续占用主线程。
  if (!_effectsInited) {
    _effectsInited = true;
    initCursorGlow();
    initParallax();
  }
  initReveal();
}

// 打字机
// 粒子背景
// 滚动 reveal
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }

  // 关键：IntersectionObserver 的 threshold 是「相交面积 ÷ 元素自身面积」。
  // 项目网格在竖屏下高 12000px 以上，而手机视口只有约 844px，
  // 即便元素完全盖住视口，相交比例也只有 844/12646 ≈ 6.7%，
  // 永远达不到 12% 阈值 —— 整块项目区永久停在 opacity:0，
  // 表现为「项目和视频之间空出好几屏」。
  //
  // 因此分两套策略：
  //  · 超高元素（高度 > 1.5 屏）：用 threshold 0 + 负 rootMargin，
  //    元素顶端进入视口即触发，不受自身高度影响
  //  · 普通元素：保留 12% 比例阈值，避免过早出现
  const show = (entry) => {
    entry.target.classList.add('visible');
    tallObs.unobserve(entry.target);
    normObs.unobserve(entry.target);
  };

  const tallObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) show(e); }),
    { threshold: 0, rootMargin: '0px 0px -15% 0px' }
  );

  const normObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) show(e); }),
    { threshold: 0.12 }
  );

  els.forEach((el) => {
    const tall = el.getBoundingClientRect().height > window.innerHeight * 1.5;
    (tall ? tallObs : normObs).observe(el);
  });

  // 兜底：首屏渲染后 2.5 秒仍未可见的 .reveal，若已滚到可见区域则强制显示，
  // 杜绝任何因阈值或布局异常导致的空白区块。
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.2) {
        el.classList.add('visible');
      }
    });
  }, 2500);
}

// 鼠标光晕
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  let raf = null;
  window.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
      raf = null;
    });
  });
}

// 视差背景层
function initParallax() {
  const layers = document.querySelectorAll('[data-parallax]');
  if (!layers.length) return;
  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const y = window.scrollY;
      layers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.parallax || '0.5');
        layer.style.transform = `translateY(${y * speed}px)`;
      });
      raf = null;
    });
  });
}

// 3D 卡片倾斜

