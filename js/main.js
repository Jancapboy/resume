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
}

document.addEventListener('DOMContentLoaded', async () => {
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
});

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

  // 打字机效果（只在首次渲染时跑，避免数据刷新后重复播放）
  if (!_profileRendered) {
    _profileRendered = true;
    typeWriter(document.getElementById('hero-title'), profile.title || '');
  }
}

function renderSkills(skills) {
  const grid = document.getElementById('skills-grid');
  grid.innerHTML = skills.map((skill, i) => `
    <span class="skill-tag" style="animation: fade-up 0.5s ${0.3 + i * 0.04}s var(--ease-out) both">
      ${skill.name}
      <span class="skill-category">${skill.category}</span>
    </span>
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
        </div>
        <div class="card-more">查看详情 →</div>
      </div>
    </a>
  `).join('');

  // 绑定 3D 倾斜
  document.querySelectorAll('[data-tilt]').forEach(bindTilt);
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
  // 粒子/光晕/视差只初始化一次；reveal 每次重绘后都要重新绑定新插入的元素
  if (!_effectsInited) {
    _effectsInited = true;
    initParticles();
    initCursorGlow();
    initParallax();
  }
  initReveal();
}

// 打字机
function typeWriter(el, text) {
  if (!el || !text) return;
  el.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'type-cursor';
  el.appendChild(cursor);

  let i = 0;
  const speed = 60;
  function step() {
    if (i < text.length) {
      cursor.before(document.createTextNode(text[i]));
      i++;
      setTimeout(step, speed);
    }
  }
  // 稍微延迟，让 hero 入场动画先播
  setTimeout(step, 600);
}

// 粒子背景
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  const particles = [];
  const COUNT = 60;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.4,
      color: ['#3b82f6', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 3)],
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // 连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.12 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // 绘制粒子
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// 滚动 reveal
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => observer.observe(el));
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
function bindTilt(card) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -8;
    const ry = ((x / rect.width) - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}
