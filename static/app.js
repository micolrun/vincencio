const $ = (selector) => document.querySelector(selector);
let current = null;

async function health() {
  const response = await fetch('/api/health');
  const data = await response.json();
  $('#mode-badge').textContent = data.demo_mode ? '데모 모드' : 'AI 연결됨';
  const auth = await fetch('/auth/status').then((response) => response.json());
  if (auth.google_user) $('#google-login').textContent = auth.google_user.name || auth.google_user.email;
  if (auth.github_connected) $('#github-connect').textContent = 'GitHub 연결됨';
}

$('#audio').addEventListener('change', (event) => {
  $('#filename').textContent = event.target.files[0]?.name || '';
});

['dragenter', 'dragover'].forEach((name) => $('#dropzone').addEventListener(name, (e) => {
  e.preventDefault(); $('#dropzone').classList.add('drag');
}));
['dragleave', 'drop'].forEach((name) => $('#dropzone').addEventListener(name, () => $('#dropzone').classList.remove('drag')));

$('#upload-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#progress').classList.remove('hidden');
  const form = new FormData(event.target);
  try {
    const response = await fetch('/api/jobs', {method: 'POST', body: form});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || '생성에 실패했습니다.');
    current = data; render(data);
  } catch (error) { alert(error.message); }
  finally { $('#progress').classList.add('hidden'); }
});

function render(project) {
  $('#upload-panel').classList.add('hidden');
  $('#result-panel').classList.remove('hidden');
  $('#project-title').textContent = project.title;
  $('#thumb-title').textContent = project.title;
  $('#transcript').value = project.transcript;
  $('#tags').innerHTML = project.hashtags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  $('#warnings').innerHTML = project.warnings.map((warning) => `<p>※ ${escapeHtml(warning)}</p>`).join('');
  $('#scene-list').innerHTML = project.scenes.map((scene, index) => `
    <div class="scene" data-index="${index}">
      <time>${format(scene.start)}–${format(scene.end)}</time>
      <div><p><b>${index + 1}.</b> ${escapeHtml(scene.narration)}</p><textarea>${escapeHtml(scene.visual_prompt_ko)}</textarea></div>
      <div><select><option value="review_required" ${scene.source_status === 'review_required' ? 'selected' : ''}>확인 필요</option><option value="verified" ${scene.source_status === 'verified' ? 'selected' : ''}>원문 확인됨</option></select></div>
    </div>`).join('');
  window.scrollTo({top: $('.workspace').offsetTop - 70, behavior: 'smooth'});
}

$('#save-review').addEventListener('click', async () => {
  if (!current) return;
  current.transcript = $('#transcript').value;
  document.querySelectorAll('.scene').forEach((row) => {
    const index = Number(row.dataset.index);
    current.scenes[index].visual_prompt_ko = row.querySelector('textarea').value;
    current.scenes[index].source_status = row.querySelector('select').value;
  });
  const response = await fetch(`/api/jobs/${current.id}`, {
    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(current)
  });
  if (!response.ok) return alert('저장에 실패했습니다.');
  alert('검수 내용을 저장했습니다.');
});

async function saveCurrent() {
  current.transcript = $('#transcript').value;
  document.querySelectorAll('.scene').forEach((row) => {
    const index = Number(row.dataset.index);
    current.scenes[index].visual_prompt_ko = row.querySelector('textarea').value;
    current.scenes[index].source_status = row.querySelector('select').value;
  });
  const response = await fetch(`/api/jobs/${current.id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(current)});
  if (!response.ok) throw new Error('검수 내용 저장에 실패했습니다.');
  current = await response.json();
}

$('#approve').addEventListener('click', async () => {
  try {
    await saveCurrent();
    const response = await fetch(`/api/jobs/${current.id}/approve`, {method:'POST'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || '승인할 수 없습니다.');
    current = data; $('#render').disabled = false; alert('최종 승인되었습니다.');
  } catch (error) { alert(error.message); }
});

$('#render').addEventListener('click', async () => {
  $('#render').disabled = true; $('#render').textContent = '렌더링 중…';
  try {
    const response = await fetch(`/api/jobs/${current.id}/render`, {method:'POST'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || '렌더링에 실패했습니다.');
    location.href = data.download_url;
  } catch (error) { alert(error.message); $('#render').disabled = false; }
  finally { $('#render').textContent = '영상 렌더링'; }
});

$('#back').addEventListener('click', () => { $('#result-panel').classList.add('hidden'); $('#upload-panel').classList.remove('hidden'); });
$('#google-login').addEventListener('click', () => location.href = '/auth/google');
$('#github-connect').addEventListener('click', () => location.href = '/auth/github');

function format(seconds) { const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${String(s).padStart(2, '0')}`; }
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value ?? ''; return div.innerHTML; }
health();
