const $ = (selector) => document.querySelector(selector);
let audioDuration = 0;
let audioUrl = '';
let currentProject = null;

const commonNegative = '사진 같은 기록물, 현대 의복, 현대 건물, 글자, 자막, 로고, 워터마크, 유명인 얼굴, 성직자 얼굴 모방, 과도한 광선, 판타지 마법, 잔혹한 폭력, 왜곡된 손과 얼굴';

$('#transcript').addEventListener('input', (event) => {
  $('#char-count').textContent = `${event.target.value.length.toLocaleString()}자`;
});

$('#audio-file').addEventListener('change', (event) => loadAudio(event.target.files[0]));
['dragenter','dragover'].forEach((name) => $('#dropzone').addEventListener(name, (event) => {
  event.preventDefault(); $('#dropzone').classList.add('drag');
}));
['dragleave','drop'].forEach((name) => $('#dropzone').addEventListener(name, (event) => {
  event.preventDefault(); $('#dropzone').classList.remove('drag');
  if (name === 'drop') {
    const file = event.dataTransfer.files[0];
    if (file) loadAudio(file);
  }
}));

function loadAudio(file) {
  if (!file) return;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(file);
  const player = $('#audio-player');
  player.src = audioUrl;
  player.classList.remove('hidden');
  $('#file-name').textContent = file.name;
  player.onloadedmetadata = () => {
    audioDuration = Number.isFinite(player.duration) ? player.duration : 0;
    $('#file-name').textContent = `${file.name} · ${formatTime(audioDuration)}`;
  };
}

$('#generate').addEventListener('click', () => {
  const transcript = $('#transcript').value.trim();
  if (!audioDuration) return alert('먼저 음성 파일을 선택해 주세요.');
  if (!transcript) return alert('녹음 원고 또는 전사문을 입력해 주세요.');
  if (!$('#source').value.trim()) return alert('성경 위치와 승인된 출처를 입력해 주세요.');
  if (!$('#copyright-check').checked) return alert('성경·전례문 인용 범위를 확인해 주세요.');
  currentProject = buildProject(transcript);
  renderProject(currentProject);
});

function buildProject(transcript) {
  const duration = Math.max(5, audioDuration);
  const sceneTotal = Math.ceil(duration / 5);
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordsPerScene = Math.max(1, Math.ceil(words.length / sceneTotal));
  const title = $('#title').value.trim() || inferTitle(transcript);
  const scenes = [];
  for (let index = 0; index < sceneTotal; index += 1) {
    const start = index * 5;
    const end = Math.min(duration, start + 5);
    const narration = words.slice(index * wordsPerScene, (index + 1) * wordsPerScene).join(' ') || words.slice(-wordsPerScene).join(' ');
    scenes.push({
      index: index + 1, start, end, narration,
      prompt: makePrompt(narration, index),
      negativePrompt: commonNegative,
      status: 'review_required'
    });
  }
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    title,
    source: $('#source').value.trim(),
    duration,
    transcript,
    hashtags: makeHashtags(transcript),
    thumbnailPrompt: `고요한 새벽빛 아래 펼쳐진 성경과 따뜻한 빛, ${title}의 정서를 상징하는 절제된 수채화, 오른쪽 제목 여백, 16:9, 이미지 안 글자 없음`,
    scenes
  };
}

function makePrompt(text, index) {
  const symbols = ['고요한 길과 따뜻한 빛','펼쳐진 성경과 창가의 자연광','흙 위의 작은 씨앗과 새벽빛','잔잔한 물결과 멀리 열린 길','빈 성당 의자와 부드러운 햇살'];
  return `가톨릭 묵상 영상용 절제된 성화풍 수채화, “${text}”의 의미를 ${symbols[index % symbols.length]}으로 상징적으로 표현, 원문에 없는 인물이나 사건 추가 금지, 베이지·짙은 청색·은은한 금색, 경건하고 고요한 분위기, 하단 자막 여백, 16:9, 글자 없음`;
}

function inferTitle(text) {
  const short = text.replace(/\s+/g,' ').slice(0,34).replace(/[.,!?]$/,'');
  return short ? `${short}… | 오늘의 말씀` : '오늘의 말씀과 삶으로 옮기는 한 가지';
}

function makeHashtags(text) {
  const tags = ['#빈첸시오말씀방','#가톨릭묵상','#오늘의말씀'];
  if (/기도/.test(text)) tags.push('#기도');
  if (/복음/.test(text)) tags.push('#오늘의복음');
  if (/감사/.test(text)) tags.push('#감사기도');
  return tags.slice(0,5);
}

function renderProject(project) {
  $('#input-panel').classList.add('hidden');
  $('#result-panel').classList.remove('hidden');
  $('#result-title').textContent = project.title;
  $('#thumbnail-copy').textContent = project.title;
  $('#hashtags').innerHTML = project.hashtags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  $('#duration-summary').textContent = `재생시간 ${formatTime(project.duration)} · ${project.scenes.length}개 장면`;
  $('#source-summary').textContent = `출처: ${project.source}`;
  $('#scene-count').textContent = `총 ${project.scenes.length}개`;
  $('#scene-list').innerHTML = project.scenes.map((scene,index) => `
    <article class="scene" data-index="${index}">
      <time>${formatTime(scene.start)}–${formatTime(scene.end)}</time>
      <div><p><b>${scene.index}.</b> ${escapeHtml(scene.narration)}</p><textarea aria-label="${scene.index}번 이미지 프롬프트">${escapeHtml(scene.prompt)}</textarea></div>
      <div><select aria-label="${scene.index}번 검수 상태"><option value="review_required">확인 필요</option><option value="verified">원문 확인됨</option></select></div>
    </article>`).join('');
  window.scrollTo({top: $('#result-panel').offsetTop - 85,behavior:'smooth'});
}

function syncEdits() {
  if (!currentProject) return;
  document.querySelectorAll('.scene').forEach((row) => {
    const scene = currentProject.scenes[Number(row.dataset.index)];
    scene.prompt = row.querySelector('textarea').value;
    scene.status = row.querySelector('select').value;
  });
}

$('#edit-again').addEventListener('click', () => {
  $('#result-panel').classList.add('hidden'); $('#input-panel').classList.remove('hidden');
});
$('#download-json').addEventListener('click', () => {
  syncEdits(); download(`${safeName(currentProject.title)}.json`, JSON.stringify(currentProject,null,2), 'application/json');
});
$('#download-srt').addEventListener('click', () => {
  syncEdits();
  const srt = currentProject.scenes.map((scene,index) => `${index+1}\n${srtTime(scene.start)} --> ${srtTime(scene.end)}\n${scene.narration}\n`).join('\n');
  download(`${safeName(currentProject.title)}.srt`, srt, 'text/plain;charset=utf-8');
});

function download(name,content,type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
function formatTime(value){const seconds=Math.max(0,Math.floor(value||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function srtTime(value){const ms=Math.round(value*1000);const h=Math.floor(ms/3600000);const m=Math.floor(ms%3600000/60000);const s=Math.floor(ms%60000/1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
function safeName(value){return value.replace(/[\\/:*?"<>|]/g,'_').slice(0,70)||'vincentio-project';}
function escapeHtml(value){const div=document.createElement('div');div.textContent=value??'';return div.innerHTML;}
