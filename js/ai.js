/**
 * Demo 版 AI 逻辑（本地预览用）
 * 说明：此文件用于本地预览 AI 交互效果，用 mock 数据模拟后端返回。
 * 正式部署时，请使用 js/ai.js（真实调用 EdgeOne Functions）。
 */
(function () {
  'use strict';

  let resumeContext = null;
  let chatHistory = [];

  async function loadResumeContext() {
    try {
      const res = await fetch('data/projects.json');
      const data = await res.json();
      resumeContext = {
        profile: data.profile,
        projects: (data.projects || []).filter((p) => p.public !== false),
      };
    } catch (e) {
      resumeContext = { profile: {}, projects: [] };
    }
  }

  // ============ Mock 后端 ============
  function mockChatReply(text) {
    const t = text.toLowerCase();
    if (/数据库|mysql|oceanbase|dba|高可用|集群|sql/.test(t)) {
      return '这位工程师在数据库方向有深厚积累，主要有两个代表性项目：\n\n1️⃣ MySQL MGR 高可用架构：搭建过多主集群，实现了故障自动切换、读写分离和数据一致性校验，适合金融级高可用场景。\n\n2️⃣ OceanBase 前线部署工程：作为 FDE 负责分布式数据库的现场交付、性能调优和容灾演练。\n\n如果你有数据库相关的需求，可以提交需求表单，我会详细和你沟通。';
    }
    if (/爬虫|抓取|采集|数据爬|小红书|scrap|反爬/.test(t)) {
      return '他的爬虫经验很扎实：基于 MediaCrew 框架做过小红书数据自动化采集系统，涵盖笔记/评论/用户画像多维采集，还解决了反爬对抗和 IP 池管理。技术栈是 Python + Selenium + MySQL + Redis。\n\n如果你需要数据采集或竞品监控类的系统，他的经验可以直接复用。';
    }
    if (/ai|大模型|数字人|视频|3d|agent|直播|llm|混元|深度/.test(t)) {
      return 'AI 应用是他近期的重点方向，项目包括：\n\n🤖 AI 直播互动助手（抖音/B站弹幕智能回复）\n🎬 AI 视频生成（知识库 + 数字人 + 配音）\n🧊 AI 文生 3D 模型（Hunyuan3D-2.0）\n⚙️ OpenClaw Agent 集成\n\n从 LLM 应用到 Agent 落地都有实战经验。';
    }
    if (/全栈|前端|后端|vue|react|node|spring|web|小程序|订餐|刷题/.test(t)) {
      return '他有多年的全栈开发经验，做过企业订餐管理系统（Vue + Node.js + MySQL）和企业内训刷题系统（React + Spring Boot + Redis），都是前后端分离架构。\n\n既能独立开发，也能做架构设计。';
    }
    if (/联系|合作|招聘|兼职|外包|怎么找|价格|报价|邮箱/.test(t)) {
      return '太棒了！他目前可接兼职 / 远程协作。你可以通过以下方式联系：\n\n📧 邮箱：1069007377@qq.com\n💬 或直接在页面下方「提交需求」，留下你的联系方式，他会尽快回复你。';
    }
    if (/你好|hi|hello|在吗|介绍/.test(t)) {
      return '你好！我是这位工程师的 AI 助手 🤖\n\n他是一名全栈工程师，擅长：\n• 数据库高可用（MySQL MGR / OceanBase）\n• Python 爬虫与数据采集\n• AI 应用（直播助手 / 数字人 / 3D 生成）\n• 企业级全栈开发\n\n你可以问我任何关于他技能和项目的问题！';
    }
    return '这个问题我记录一下。从简历来看，他最擅长的方向是数据库高可用、Python 爬虫、AI 应用和企业级全栈开发。\n\n你可以更具体地问，比如"做过什么数据库项目"、"会不会爬虫"、"AI 方面有什么经验"。';
  }

  function mockRecommend(need) {
    const projects = resumeContext?.projects || [];
    const scored = projects.map((p) => {
      let score = 0;
      const text = (p.title + p.description + (p.techStack || []).join(' ') + p.category).toLowerCase();
      const n = need.toLowerCase();
      const keywords = {
        '数据库': ['数据库', 'mysql', 'oceanbase', '高可用', '集群', 'sql', 'dba', '存储', '容灾'],
        '爬虫': ['爬虫', '抓取', '采集', '数据爬', '小红书', '反爬', 'scrap', 'selenium', '监控'],
        'ai': ['ai', '大模型', '数字人', '视频', '3d', 'agent', '直播', 'llm', '混元', '智能'],
        '全栈': ['全栈', '前端', '后端', 'vue', 'react', 'node', 'spring', 'web', '系统', '管理平台'],
        '集成': ['集成', '企业微信', '接口', '报表', 'mes', 'node-red', '对接', 'api'],
      };
      for (const [cat, kws] of Object.entries(keywords)) {
        if (kws.some((k) => n.includes(k))) {
          if (kws.some((k) => text.includes(k))) score += 40;
        }
      }
      if (text.includes(n) || n.split(/\s+/).some((w) => w.length > 1 && text.includes(w))) score += 20;
      return { project: p, score };
    });
    const top = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    if (top.length === 0) {
      return { recommendations: [], summary: '暂时没有高度匹配的项目，欢迎直接提交需求，我会和你详细沟通。' };
    }
    const reasons = {
      '数据库': '数据库方向实战经验丰富，与你需求的技术栈高度吻合',
      '爬虫': '爬虫与数据采集经验直接对应你的场景',
      'ai': 'AI 应用落地经验能快速满足你的智能化需求',
      '全栈': '全栈开发能力可以端到端交付完整系统',
      '集成': '企业级系统集成经验与你的需求匹配',
    };
    return {
      recommendations: top.map((s) => ({
        projectId: s.project.id,
        title: s.project.title,
        reason: reasons[s.project.category] || `该项目与你的需求较为匹配`,
        matchScore: Math.min(95, 60 + s.score),
      })),
      summary: '基于你的需求，这位工程师有相关的项目实战经验，可以快速上手。',
    };
  }

  // ============ 1. AI 问答 ============
  function initChat() {
    const fab = document.getElementById('ai-fab');
    const panel = document.getElementById('ai-chat-panel');
    const closeBtn = document.getElementById('ai-chat-close');
    const messagesEl = document.getElementById('ai-chat-messages');
    const inputEl = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    if (!fab || !panel) return;

    fab.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      fab.classList.toggle('active', open);
      if (open && chatHistory.length === 0) {
        appendMessage('assistant', '你好！我是这位工程师的 AI 助手 🤖 你可以问我关于他的技能、项目经验、技术方向等问题。');
      }
    });
    closeBtn?.addEventListener('click', () => {
      panel.classList.remove('open');
      fab.classList.remove('active');
    });

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      appendMessage('user', text);
      const typingId = appendTyping();
      setTimeout(() => {
        removeTyping(typingId);
        const reply = mockChatReply(text);
        appendMessage('assistant', reply);
      }, 600 + Math.random() * 500);
    }
    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    function appendMessage(role, content) {
      const div = document.createElement('div');
      div.className = `ai-msg ai-msg-${role}`;
      div.textContent = content;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function appendTyping() {
      const id = 'typing-' + Date.now();
      const div = document.createElement('div');
      div.className = 'ai-msg ai-msg-assistant ai-typing';
      div.id = id;
      div.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return id;
    }
    function removeTyping(id) { document.getElementById(id)?.remove(); }
  }

  // ============ 2. 项目推荐 ============
  function initRecommend() {
    const inputEl = document.getElementById('ai-recommend-input');
    const btn = document.getElementById('ai-recommend-btn');
    const resultEl = document.getElementById('ai-recommend-result');
    if (!inputEl || !btn) return;

    function recommend() {
      const need = inputEl.value.trim();
      if (!need) {
        resultEl.innerHTML = '<p class="ai-recommend-tip">请先描述您的需求，例如"我需要一个能抓取电商数据的系统"</p>';
        return;
      }
      btn.disabled = true;
      btn.textContent = '匹配中...';
      resultEl.innerHTML = '<p class="ai-recommend-loading">AI 正在分析您的需求，匹配最相关的项目...</p>';
      setTimeout(() => {
        const data = mockRecommend(need);
        renderResult(data, resultEl);
        btn.disabled = false;
        btn.textContent = '✨ 智能匹配项目';
      }, 800);
    }
    btn.addEventListener('click', recommend);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') recommend(); });

    function renderResult(data, container) {
      const recs = data?.recommendations || [];
      let html = '';
      if (data?.summary) html += `<p class="ai-recommend-summary">💡 ${escapeHtml(data.summary)}</p>`;
      if (recs.length === 0) {
        html += '<p class="ai-recommend-tip">暂未找到高度匹配的项目，欢迎直接提交需求与我沟通。</p>';
      } else {
        html += '<div class="ai-recommend-list">';
        recs.forEach((r) => {
          html += `
            <div class="ai-recommend-item" data-project-id="${escapeHtml(r.projectId)}">
              <div class="ai-recommend-item-head">
                <span class="ai-recommend-title">${escapeHtml(r.title)}</span>
                <span class="ai-recommend-score">匹配 ${r.matchScore ?? 0}%</span>
              </div>
              <p class="ai-recommend-reason">${escapeHtml(r.reason)}</p>
            </div>`;
        });
        html += '</div>';
      }
      container.innerHTML = html;
      document.querySelectorAll('.project-card').forEach((c) => c.classList.remove('highlighted'));
      container.querySelectorAll('.ai-recommend-item').forEach((item) => {
        const id = item.dataset.projectId;
        document.querySelectorAll('.project-card').forEach((card) => {
          if (card.dataset.projectId === id) {
            card.classList.add('highlighted');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    }
  }

  // ============ 3. 需求表单 ============
  function initContactForm() {
    const form = document.getElementById('ai-contact-form');
    const statusEl = document.getElementById('ai-contact-status');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const contact = form.querySelector('[name="contact"]')?.value?.trim() || '';
      const need = form.querySelector('[name="need"]')?.value?.trim() || '';
      if (!contact) { showStatus('请留下联系方式，方便我联系您', 'error'); return; }
      if (need.length < 5) { showStatus('请简要描述您的需求（至少 5 个字）', 'error'); return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = '提交中...';
      setTimeout(() => {
        showStatus('✅ 需求已发送，我会尽快联系您！（演示环境，未真实发送）', 'success');
        form.reset();
        btn.disabled = false;
        btn.textContent = '提交需求';
      }, 800);
    });
    function showStatus(msg, type) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'ai-contact-status ' + type;
      statusEl.style.display = 'block';
    }
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadResumeContext();
    initChat();
    initRecommend();
    initContactForm();
  });
})();
