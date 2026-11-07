/**
 * 简历网站 - 项目详情页
 * 通过 URL 参数 ?id=proj-XXX 加载 data/projects.json 渲染对应项目
 * 若存在 data/details/{id}.html 则作为完整内容页渲染，否则显示占位
 *
 * 容错：projects.json 拉取失败时（国内访问 GitHub Pages 不稳），
 * 回退到 HTML 内联的兜底数据，保证详情页不会出现空白。
 */

/* 读取页面内联的兜底数据 */
function readInlineData() {
  const el = document.getElementById('resume-data');
  if (!el) return null;
  try {
    const d = JSON.parse(el.textContent);
    return d && Array.isArray(d.projects) ? d : null;
  } catch (e) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('detail-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🔗</div><p>缺少项目 ID，请从项目列表进入</p></div>';
    return;
  }

  const showMissing = () => {
    document.getElementById('detail-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🤔</div><p>未找到该项目</p></div>';
  };
  const showFailed = () => {
    document.getElementById('detail-content').innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>数据加载失败，请检查网络后刷新重试</p></div>';
  };

  // --- 第一步：用内联兜底数据立即渲染 ---
  let current = null;
  const inline = readInlineData();
  if (inline) {
    current = inline.projects.find((p) => p.id === id) || null;
    if (current) {
      renderProject(current);
      document.title = `${current.title} | 全栈工程师`;
    }
  }

  // --- 第二步：拉取最新数据，有变化才重绘 ---
  try {
    const response = await fetch('data/projects.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const proj = data.projects.find((p) => p.id === id);
    if (!proj) {
      if (!current) showMissing();
      return;
    }
    if (!current || JSON.stringify(proj) !== JSON.stringify(current)) {
      current = proj;
      renderProject(proj);
      document.title = `${proj.title} | 全栈工程师`;
    }
  } catch (err) {
    console.warn('projects.json 拉取失败，使用兜底数据:', err);
    if (!current) showFailed();
  }
});

function renderProject(proj) {
  document.getElementById('detail-category').textContent = proj.category;
  document.getElementById('detail-title').textContent = proj.title;
  document.getElementById('detail-desc').textContent = proj.description;

  const techEl = document.getElementById('detail-tech');
  techEl.innerHTML = (proj.techStack || [])
    .map((tech) => `<span class="tech-badge">${tech}</span>`)
    .join('');

  const highlightsEl = document.getElementById('detail-highlights');
  highlightsEl.innerHTML = (proj.highlights || [])
    .map((h) => `<li>${h}</li>`)
    .join('');

  // 技术分层（真实 techStack 归类）
  renderLayers(proj);

  // 实现要点（本站实际运行的代码）
  renderCode(proj);

  // 内容页：存在 data/details/{id}.html 则渲染完整内容，否则占位
  const contentEl = document.getElementById('detail-content');
  fetch(`data/details/${proj.id}.html`)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error('not found'))))
    .then((html) => {
      contentEl.innerHTML = html;
    })
    .catch(() => {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>详细内容整理中，敬请期待</p>
        </div>`;
    });
}

/* ============================================================
   技术分层：按项目真实 techStack 归类，归类规则显式可查
   ============================================================ */
const LAYER_RULES = [
  { name: '接入层', cls: '', re: /react|vue|javascript|typescript|^node(\.js)?$|vite|zustand|three\.js|^css|移动端适配|edge headless|chrome devtools|websocket|rest api|api$|webhook|^cors|cdn|localstorage|es2023|^html|前端|接入|webgl|gsl|gsap|scrolltrigger|splittext|lenis|intersectionobserver|backdrop-filter/i },
  { name: '服务层', cls: 'l2', re: /python|spring boot|shell|node-?red|langchain|langgraph|^dag$|^lcel$|openclaw|自动化流水线|aiohttp|media|selenium|playwright|curl|globalping|check-host|git(hub)? cli|数字人|^tts$|^llm$|^fde$|mulberry|or-tools|cassowary|crdt|oplog|自动化|流媒体|一致性控制/i },
  { name: '数据层', cls: '', re: /mysql|redis|oceanbase|mgr|proxysql|sql server|rss|知识图谱|数据库|存储|mongo|postgres|kafka|clickhouse|elastic|数据|缓存/i },
  { name: '基础设施', cls: 'l3', re: /linux|docker|nginx|caddy|systemd|wsl|mihomo|edgeone|github pages|cloudstudio|edge functions|gpu 集群|ffmpeg|server酱|部署|运维|k8s|kubernetes|prometheus|ci\/cd|架构|工程|grafana/i },
  { name: 'AI / 模型', cls: 'l2', re: /llm|langchain|langgraph|hunyuan|lora|comfyui|minimax|数字人|^tts$|ai 漫剧|知识图谱|agent|rag|deepseek|stable diffusion|模型|智能体|生成/i }
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

function renderLayers(proj) {
  const box = document.getElementById('detail-layers');
  const wrap = document.getElementById('detail-arch-box');
  if (!box || !wrap) return;
  const techs = (proj.techStack || []).filter(Boolean);
  const layers = buildLayers(techs);
  if (!layers.length) { wrap.style.display = 'none'; return; }
  box.innerHTML = layers.map((L) =>
    `<div class="arch-layer ${L.cls}"><span>${L.name}</span><span>${L.items.join(' · ')}</span></div>`
  ).join('');
}

/* ============================================================
   实现要点：展示本站实际运行的代码，而非虚构伪代码
   ============================================================ */
const SNIPPETS = [
  {
    file: 'edge-functions/api/contact.js',
    lang: 'javascript',
    keywords: ['web', 'api', 'python', 'node', 'react', 'vue', '运维', 'devops', '企业', '平台'],
    note: '本站联系表单的 Edge Function：来源白名单 + 滑动窗口限流 + Server酱 转发，密钥仅存服务端环境变量，从不落到前端。',
    code: `function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // 简单防内存膨胀
  return false;
}

function originAllowed(context, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  const origin = context.request.headers.get('origin') || '';
  const referer = context.request.headers.get('referer') || '';
  const candidate = origin || referer;
  return allowed.some((o) => candidate.startsWith(o));
}`
  },
  {
    file: 'js/main.js',
    lang: 'javascript',
    keywords: ['react', 'vue', 'html', 'css', '前端', '全栈'],
    note: '本站的离线兜底：projects.json 拉取失败时回退到 HTML 内联数据，保证项目与视频板块在弱网下依然完整渲染。',
    code: `function readInlineData() {
  const el = document.getElementById('resume-data');
  if (!el) return null;
  try {
    const d = JSON.parse(el.textContent);
    return d && (d.projects || d.videos) ? d : null;
  } catch (e) {
    return null;
  }
}

// 优先级：内联数据（零网络延迟） → fetch 最新 → localStorage 缓存
const inlineData = readInlineData();
if (inlineData) {
  applyData(inlineData);
  initEffects();
}`
  },
  {
    file: 'tools/refresh_contact_token.py',
    lang: 'python',
    keywords: ['linux', 'shell', '运维', 'devops', 'docker', 'k8s', 'go'],
    note: '本站 EdgeOne 令牌自动刷新：代理端口探活 + 双通道重试。代理未运行时自动切直连，避免所有请求被拒。',
    code: `def proxy_alive(host="127.0.0.1", port=7890, timeout=1.5):
    """本地代理端口（Clash/mihomo 7890）是否还能连上。

    代理一旦退出，端口会直接消失，走代理的请求全部 ECONNREFUSED。
    而 edgeone CLI 会把 Pages API 探测失败报成 "Invalid API TOKEN"——
    看起来像令牌失效，实际是网络不通。
    """
    import socket
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False`
  },
  {
    file: 'tools/inject_inline_data.py',
    lang: 'python',
    keywords: ['mysql', 'oceanbase', 'redis', '数据库', 'sql'],
    note: '本站的构建期注入：把 projects.json 写回三个页面的内联数据块，保持 JSON 原排版，diff 最小。',
    code: `pattern = re.compile(
    r'(<script id="resume-data" type="application/json">)(.*?)(</script>)',
    re.S,
)

new_html = pattern.sub(
    lambda m: m.group(1) + payload + m.group(3),
    html,
    count=1,
)`
  }
];

function pickSnippet(proj) {
  const hay = ((proj.techStack || []).join(' ') + ' ' + (proj.category || '')).toLowerCase();
  for (const s of SNIPPETS) {
    for (const k of s.keywords) {
      if (hay.indexOf(String(k).toLowerCase()) >= 0) return s;
    }
  }
  return SNIPPETS[0];
}

function highlight(code, lang) {
  const esc = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const kw = lang === 'python'
    ? 'def|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|class|lambda|None|True|False|and|or|not|in|is|pass|yield|async|await|print|self'
    : 'function|const|let|var|return|if|else|for|while|await|async|export|default|new|try|catch|throw|null|undefined|true|false|of|in|typeof';
  const re = new RegExp(
    '(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +
    '|("[^"]*?"|\'[^\']*?\'|`[^`]*?`)' +
    '|(\\b\\d+(?:\\.\\d+)?\\b)' +
    '|(\\b(?:' + kw + ')\\b)' +
    '|([A-Za-z_$][\\w$]*)(?=\\()',
    'g'
  );
  return esc.replace(re, (m, com, str, num, k, fn) => {
    if (com) return '<span class="tok-com">' + com + '</span>';
    if (str) return '<span class="tok-str">' + str + '</span>';
    if (num) return '<span class="tok-num">' + num + '</span>';
    if (k) return '<span class="tok-kw">' + k + '</span>';
    if (fn) return '<span class="tok-fn">' + fn + '</span>';
    return m;
  });
}

function renderCode(proj) {
  const body = document.getElementById('code-body');
  const fileEl = document.getElementById('code-file');
  const langEl = document.getElementById('code-lang');
  const noteEl = document.getElementById('code-note');
  const wrap = document.getElementById('detail-code-box');
  if (!body || !wrap) return;
  const s = pickSnippet(proj);
  if (fileEl) fileEl.textContent = s.file;
  if (langEl) langEl.textContent = s.lang;
  if (noteEl) noteEl.textContent = s.note;
  body.innerHTML = highlight(s.code, s.lang);
}
