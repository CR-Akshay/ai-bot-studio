async function apiRequest(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = { message: text };
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Request failed.');
  }

  return payload;
}

const state = {
  bots: [],
  projects: []
};

const botForm = document.getElementById('botForm');
const projectForm = document.getElementById('projectForm');
const botsList = document.getElementById('botsList');
const botSelector = document.getElementById('botSelector');
const projectsList = document.getElementById('projectsList');
const refreshButton = document.getElementById('refreshAll');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBotOptions() {
  if (!state.bots.length) {
    botSelector.innerHTML = '<div class="empty-state">No bots yet. Create your first bot above.</div>';
    return;
  }

  botSelector.innerHTML = state.bots
    .map(
      (bot) => `
        <label class="checkbox-item">
          <input type="checkbox" name="projectBots" value="${bot.id}" />
          <span>${escapeHtml(bot.name)}</span>
        </label>
      `
    )
    .join('');
}

function renderBots() {
  if (!state.bots.length) {
    botsList.innerHTML = '<div class="empty-state">No bots created yet.</div>';
    return;
  }

  botsList.innerHTML = state.bots
    .map(
      (bot) => `
        <div class="bot-card">
          <div class="bot-card-header">
            <div>
              <h3>${escapeHtml(bot.name)}</h3>
              <div class="bot-meta">Model: ${escapeHtml(bot.model || 'gpt-4o-mini')}</div>
            </div>
            <button class="small-button danger delete-bot" data-id="${bot.id}">Delete</button>
          </div>
          <p>${escapeHtml(bot.description || 'No description provided.')}</p>
          <div class="tag-list">
            <span class="tag">Prompt</span>
            <span class="tag">${escapeHtml((bot.systemPrompt || 'General').slice(0, 22))}</span>
          </div>
          <div class="actions">
            <button class="small-button" data-role="edit-bot" data-id="${bot.id}">Edit</button>
          </div>
        </div>
      `
    )
    .join('');
}

function renderProjects() {
  if (!state.projects.length) {
    projectsList.innerHTML = '<div class="empty-state">No projects yet. Link multiple bots to create one.</div>';
    return;
  }

  projectsList.innerHTML = state.projects
    .map(
      (project) => `
        <article class="project-card">
          <div class="project-card-header">
            <div>
              <h3>${escapeHtml(project.name)}</h3>
              <div class="project-meta">${escapeHtml(project.description || 'No description')}</div>
            </div>
            <button class="small-button danger delete-project" data-id="${project.id}">Delete</button>
          </div>
          <div class="tag-list">
            ${(project.bots || [])
              .map((bot) => `<span class="tag">${escapeHtml(bot.name)}</span>`)
              .join('') || '<span class="tag">No bots linked</span>'}
          </div>
          <div class="actions">
            <button class="small-button" data-role="share-project" data-id="${project.id}">Share / Export</button>
            <label class="small-button" style="display:inline-block; cursor:pointer;">
              Upload output
              <input class="hidden" type="file" data-role="upload-output" data-id="${project.id}" />
            </label>
          </div>
          <div class="outputs-container" data-output-list="${project.id}"></div>
        </article>
      `
    )
    .join('');

  for (const project of state.projects) {
    loadProjectOutputs(project.id);
  }
}

async function loadProjectOutputs(projectId) {
  try {
    const result = await apiRequest(`/api/projects/${projectId}/outputs`);
    const outputContainer = document.querySelector(`[data-output-list="${projectId}"]`);
    if (!outputContainer) return;

    if (!result.outputs.length) {
      outputContainer.innerHTML = '<div class="empty-state">No uploaded outputs yet.</div>';
      return;
    }

    outputContainer.innerHTML = result.outputs
      .map(
        (output) => `
          <div class="output-item">
            <div class="output-header">
              <strong>${escapeHtml(output.originalName)}</strong>
              <span class="project-meta">${Number(output.fileSize / 1024).toFixed(1)} KB</span>
            </div>
            <div class="actions">
              <a class="small-button" href="${output.filePath}" target="_blank" rel="noopener">Open</a>
            </div>
          </div>
        `
      )
      .join('');
  } catch (error) {
    console.error('Unable to load outputs', error);
  }
}

async function loadBots() {
  try {
    const result = await apiRequest('/api/bots');
    state.bots = result.bots || [];
    renderBots();
    renderBotOptions();
  } catch (error) {
    console.error(error);
    botsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function loadProjects() {
  try {
    const result = await apiRequest('/api/projects');
    state.projects = result.projects || [];
    renderProjects();
  } catch (error) {
    console.error(error);
    projectsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function refreshAll() {
  await Promise.all([loadBots(), loadProjects()]);
}

botForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(botForm);
  const payload = {
    name: formData.get('name'),
    description: formData.get('description'),
    model: formData.get('model') || 'gpt-4o-mini',
    systemPrompt: formData.get('systemPrompt'),
    prompt: formData.get('prompt')
  };

  try {
    await apiRequest('/api/bots', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    botForm.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(projectForm);
  const selectedBots = Array.from(document.querySelectorAll('input[name="projectBots"]:checked'))
    .map((input) => Number(input.value));

  const payload = {
    name: formData.get('projectName'),
    description: formData.get('projectDescription'),
    bots: selectedBots
  };

  try {
    await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    projectForm.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

projectsList.addEventListener('click', async (event) => {
  const { role, id } = event.target.dataset;
  const projectId = Number(id);

  if (event.target.classList.contains('delete-project')) {
    try {
      await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (role === 'share-project') {
    try {
      const result = await apiRequest(`/api/projects/${projectId}/share`, { method: 'POST' });
      window.open(result.downloadUrl, '_blank');
      alert(`Project exported: ${result.fileName}`);
    } catch (error) {
      alert(error.message);
    }
  }
});

projectsList.addEventListener('change', async (event) => {
  const { role, id } = event.target.dataset;
  if (role !== 'upload-output') return;

  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    await fetch(`/api/projects/${id}/upload`, {
      method: 'POST',
      body: formData
    });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

botsList.addEventListener('click', async (event) => {
  const { id } = event.target.dataset;
  if (!id) return;

  const botId = Number(id);

  if (event.target.classList.contains('delete-bot')) {
    try {
      await apiRequest(`/api/bots/${botId}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (event.target.dataset.role === 'edit-bot') {
    const bot = state.bots.find((item) => item.id === botId);
    if (!bot) return;

    botForm.name.value = bot.name;
    botForm.description.value = bot.description || '';
    botForm.model.value = bot.model || 'gpt-4o-mini';
    botForm.systemPrompt.value = bot.systemPrompt || '';
    botForm.prompt.value = bot.prompt || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const saveButton = botForm.querySelector('button[type="submit"]');
    saveButton.textContent = 'Update Bot';

    botForm.dataset.editingId = String(botId);
  }
});

botForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(botForm);
  const payload = {
    name: formData.get('name'),
    description: formData.get('description'),
    model: formData.get('model') || 'gpt-4o-mini',
    systemPrompt: formData.get('systemPrompt'),
    prompt: formData.get('prompt')
  };

  try {
    const editingId = botForm.dataset.editingId;
    if (editingId) {
      await apiRequest(`/api/bots/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      delete botForm.dataset.editingId;
      botForm.querySelector('button[type="submit"]').textContent = 'Save Bot';
    } else {
      await apiRequest('/api/bots', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    botForm.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

refreshButton.addEventListener('click', refreshAll);

refreshAll();
