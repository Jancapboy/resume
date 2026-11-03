/**
 * Resume Site - Admin JS
 * Password-protected project management with local editing
 */

// --- Config ---
const ADMIN_PASSWORD = 'dev2026';
const DATA_URL = 'data/projects.json';
const STORAGE_KEY = 'resume_admin_auth';
const LOCAL_DATA_KEY = 'resume_local_projects';

// --- State ---
let projects = [];
let editingId = null;
let currentHighlights = [];

/* 读取页面内联的兜底数据（projects.json 拉不到时用） */
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
let currentTechStack = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  // Check if already authenticated
  if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
    showDashboard();
    loadData();
  }

  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('password-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Add project
  document.getElementById('btn-add-project').addEventListener('click', () => openModal());

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);

  // Copy skill instruction
  document.getElementById('btn-copy-skill').addEventListener('click', copySkillInstruction);

  // Modal actions
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('project-form').addEventListener('submit', handleSave);

  // Highlights
  document.getElementById('btn-add-highlight').addEventListener('click', addHighlightRow);

  // Tech stack
  document.getElementById('btn-add-tech').addEventListener('click', addTechTag);
  document.getElementById('form-tech-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTechTag(); }
  });

  // Screenshot upload
  document.getElementById('screenshot-upload-area').addEventListener('click', () => {
    document.getElementById('screenshot-file-input').click();
  });
  document.getElementById('screenshot-file-input').addEventListener('change', handleScreenshotFile);
  document.getElementById('btn-remove-screenshot').addEventListener('click', removeScreenshot);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

// --- Auth ---
function handleLogin() {
  const input = document.getElementById('password-input');
  const error = document.getElementById('login-error');
  if (input.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    error.classList.remove('show');
    showDashboard();
    loadData();
  } else {
    error.classList.add('show');
    input.value = '';
    input.focus();
  }
}

function handleLogout() {
  sessionStorage.removeItem(STORAGE_KEY);
  document.getElementById('admin-dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('password-input').value = '';
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
}

// --- Data Loading ---
async function loadData() {
  try {
    // 优先级：本地编辑缓存 > 页面内联兜底 > 服务器数据
    const localData = localStorage.getItem(LOCAL_DATA_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      projects = parsed.projects || [];
    } else {
      const inline = readInlineData();
      if (inline && inline.projects && inline.projects.length) {
        projects = inline.projects;
      } else {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        projects = data.projects || [];
      }
    }
  } catch (err) {
    console.error('Failed to load data:', err);
    // 最后一层：内联兜底
    const inline = readInlineData();
    projects = inline && inline.projects ? inline.projects : [];
  }
  renderProjectList();
}

function saveLocalData() {
  const data = { projects };
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
}

// --- Render ---
function renderProjectList() {
  const list = document.getElementById('admin-project-list');
  const empty = document.getElementById('empty-state');

  if (projects.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = projects.map((proj, index) => `
    <div class="admin-project-item">
      <div class="item-info">
        <span style="color:var(--text-muted);font-size:0.8rem;min-width:24px">#${index + 1}</span>
        <div>
          <div class="item-title">${proj.title}</div>
          <div class="item-category">${proj.category || '未分类'}</div>
        </div>
      </div>
      <div class="item-badges">
        ${proj.public !== false
          ? '<span class="badge badge-public">公开</span>'
          : '<span class="badge badge-private">私密</span>'}
        ${proj.screenshot
          ? '<span class="badge badge-has-screenshot">有截图</span>'
          : ''}
        <span class="badge" style="background:rgba(59,130,246,0.08);color:var(--accent);border:1px solid rgba(59,130,246,0.15);">
          ${(proj.techStack || []).length} 项技术
        </span>
      </div>
      <div class="item-actions">
        <button class="btn-sm btn-edit" onclick="editProject('${proj.id}')">编辑</button>
        <button class="btn-sm btn-delete" onclick="deleteProject('${proj.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// --- Modal ---
function openModal(projectId = null) {
  editingId = projectId;
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');

  if (projectId) {
    title.textContent = '编辑项目';
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      document.getElementById('form-edit-id').value = proj.id;
      document.getElementById('form-title').value = proj.title || '';
      document.getElementById('form-category').value = proj.category || '';
      document.getElementById('form-desc').value = proj.description || '';
      document.getElementById('form-link').value = proj.link || '';
      document.getElementById('form-public').checked = proj.public !== false;
      document.getElementById('form-screenshot').value = proj.screenshot || '';

      currentHighlights = [...(proj.highlights || [])];
      currentTechStack = [...(proj.techStack || [])];

      renderHighlights();
      renderTechTags();

      if (proj.screenshot) {
        showScreenshotPreview(proj.screenshot);
      } else {
        hideScreenshotPreview();
      }
    }
  } else {
    title.textContent = '添加项目';
    document.getElementById('form-edit-id').value = '';
    document.getElementById('form-title').value = '';
    document.getElementById('form-category').value = '';
    document.getElementById('form-desc').value = '';
    document.getElementById('form-link').value = '';
    document.getElementById('form-public').checked = true;
    document.getElementById('form-screenshot').value = '';

    currentHighlights = [];
    currentTechStack = [];

    renderHighlights();
    renderTechTags();
    hideScreenshotPreview();
  }

  modal.classList.add('active');
  document.getElementById('form-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingId = null;
}

// --- Highlights ---
function renderHighlights() {
  const editor = document.getElementById('highlights-editor');
  if (currentHighlights.length === 0) {
    currentHighlights.push('');
  }
  editor.innerHTML = currentHighlights.map((h, i) => `
    <div class="highlight-row">
      <input type="text" value="${escapeHtml(h)}" placeholder="项目亮点..." data-highlight-index="${i}">
      <button type="button" class="btn-remove-highlight" onclick="removeHighlight(${i})" title="删除">✕</button>
    </div>
  `).join('');
}

function addHighlightRow() {
  currentHighlights.push('');
  renderHighlights();
}

function removeHighlight(index) {
  if (currentHighlights.length <= 1) return;
  currentHighlights.splice(index, 1);
  renderHighlights();
}

// --- Tech Stack ---
function renderTechTags() {
  const display = document.getElementById('tech-tags-display');
  display.innerHTML = currentTechStack.map((tech, i) => `
    <span class="tech-tag-editable">
      ${escapeHtml(tech)}
      <span class="remove-tag" onclick="removeTechTag(${i})">✕</span>
    </span>
  `).join('');
}

function addTechTag() {
  const input = document.getElementById('form-tech-input');
  const value = input.value.trim();
  if (value && !currentTechStack.includes(value)) {
    currentTechStack.push(value);
    renderTechTags();
  }
  input.value = '';
  input.focus();
}

function removeTechTag(index) {
  currentTechStack.splice(index, 1);
  renderTechTags();
}

// --- Screenshot ---
function handleScreenshotFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const base64 = ev.target.result;
    document.getElementById('form-screenshot').value = base64;
    showScreenshotPreview(base64);
  };
  reader.readAsDataURL(file);
}

function showScreenshotPreview(src) {
  document.getElementById('screenshot-preview-img').src = src;
  document.getElementById('screenshot-preview').style.display = 'block';
}

function hideScreenshotPreview() {
  document.getElementById('screenshot-preview').style.display = 'none';
  document.getElementById('screenshot-preview-img').src = '';
}

function removeScreenshot() {
  document.getElementById('form-screenshot').value = '';
  hideScreenshotPreview();
  document.getElementById('screenshot-file-input').value = '';
}

// --- Save ---
function handleSave(e) {
  e.preventDefault();

  // Collect highlights from editor inputs
  const highlightInputs = document.querySelectorAll('#highlights-editor input');
  currentHighlights = Array.from(highlightInputs)
    .map(input => input.value.trim())
    .filter(h => h.length > 0);

  const formData = {
    id: editingId || 'proj-' + Date.now(),
    title: document.getElementById('form-title').value.trim(),
    category: document.getElementById('form-category').value.trim(),
    description: document.getElementById('form-desc').value.trim(),
    highlights: currentHighlights,
    techStack: currentTechStack,
    link: document.getElementById('form-link').value.trim(),
    screenshot: document.getElementById('form-screenshot').value,
    public: document.getElementById('form-public').checked
  };

  if (!formData.title || !formData.description) {
    showToast('请填写项目标��和描述', 'error');
    return;
  }

  if (editingId) {
    // Update existing
    const index = projects.findIndex(p => p.id === editingId);
    if (index >= 0) {
      projects[index] = formData;
    }
  } else {
    // Add new
    projects.push(formData);
  }

  saveLocalData();
  renderProjectList();
  closeModal();
  showToast(editingId ? '项目已更新（本地保存）' : '项目已添加（本地保存）', 'success');
}

// --- Edit / Delete ---
function editProject(id) {
  openModal(id);
}

function deleteProject(id) {
  if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return;

  projects = projects.filter(p => p.id !== id);
  saveLocalData();
  renderProjectList();
  showToast('项目已删除（本地保存）', 'success');
}

// --- Export ---
function exportJSON() {
  const data = {
    profile: null, // profile will be loaded from server
    projects
  };

  // Load profile from original data and merge
  const buildAndDownload = (original) => {
    data.profile = (original && original.profile) || null;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON 数据已导出，可发送给 WorkBuddy 上传', 'success');
  };
  fetch(DATA_URL)
    .then(r => r.json())
    .then(buildAndDownload)
    .catch(() => buildAndDownload(readInlineData()));
}

// --- Copy skill instruction ---
function copySkillInstruction() {
  const text = '上传项目到简历网站';
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制！在 WorkBuddy 对话中粘贴即可触发上传 Skill', 'success');
  }).catch(() => {
    showToast('复制失败，请手动输入：上传项目到简历网站', 'error');
  });
}

// --- Toast ---
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  // Force reflow
  toast.offsetHeight;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// --- Helpers ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Expose functions globally for onclick handlers
window.editProject = editProject;
window.deleteProject = deleteProject;
window.removeHighlight = removeHighlight;
window.removeTechTag = removeTechTag;
