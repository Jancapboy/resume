/**
 * 简历网站 - 项目详情页
 * 通过 URL 参数 ?id=proj-XXX 加载 data/projects.json 渲染对应项目
 * 若存在 data/details/{id}.html 则作为完整内容页渲染，否则显示占位
 */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('detail-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🔗</div><p>缺少项目 ID，请从项目列表进入</p></div>';
    return;
  }

  try {
    const response = await fetch('data/projects.json');
    const data = await response.json();
    const proj = data.projects.find((p) => p.id === id);

    if (!proj) {
      document.getElementById('detail-content').innerHTML = '<div class="empty-state"><div class="empty-icon">🤔</div><p>未找到该项目</p></div>';
      return;
    }

    renderProject(proj);
    document.title = `${proj.title} | 全栈工程师`;
  } catch (err) {
    console.error('Failed to load project:', err);
    document.getElementById('detail-content').innerHTML =
      '<div class="empty-state"><div class="empty-icon">📭</div><p>数据加载失败，请稍后刷新</p></div>';
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
