/**
 * 简历网站 - 渲染 + 酷炫动效
 * 渲染逻辑（hero/skills/projects）+ 动效（打字机/粒子/视差/3D卡片/光晕/reveal）
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --- 导航滚动效果 ---
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // --- 加载数据 ---
  try {
    const response = await fetch('data/projects.json');
    const data = await response.json();
    renderProfile(data.profile);
    renderSkills(data.profile.skills);
    renderProjects(data.projects);
    initEffects();
  } catch (err) {
    console.error('Failed to load project data:', err);
    document.getElementById('projects-grid').innerHTML =
      '<div class="empty-state"><div class="empty-icon">📭</div><p>数据加载失败，请稍后刷新</p></div>';
  }
});

/* ================================================
   渲染函数
   ================================================ */

function renderProfile(profile) {
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-location').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    ${profile.location}
  `;
  document.getElementById('hero-summary').textContent = profile.summary;
  document.title = `${profile.name} | 简历`;

  // 打字机效果
  typeWriter(document.getElementById('hero-title'), profile.title || '');
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

/* ================================================
   动效函数
   ================================================ */

function initEffects() {
  initParticles();
  initReveal();
  initCursorGlow();
  initParallax();
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
