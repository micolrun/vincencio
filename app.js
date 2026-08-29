const $ = (selector) => document.querySelector(selector);
let audioDuration = 0;
let audioUrl = '';
let currentProject = null;
let renderAudioContext = null;
let renderAudioSource = null;
let renderAudioDestination = null;

const commonNegative = '사진 같은 기록물, 현대 의복, 현대 건물, 글자, 자막, 로고, 워터마크, 유명인 얼굴, 성직자 얼굴 모방, 과도한 광선, 판타지 마법, 잔혹한 폭력, 왜곡된 손과 얼굴';

$('#transcript').addEventListener('input', (event) => {
  $('#char-count').textContent = `${event.target.value.length.toLocaleString()}자`;
  updateProgress();
});
$('#source').addEventListener('input', updateProgress);
$('#copyright-check').addEventListener('change', updateProgress);

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
    updateProgress();
  };
}

function updateProgress() {
  const items = [
    {ready: audioDuration > 0, id: '#check-audio'},
    {ready: $('#transcript').value.trim().length > 0, id: '#check-transcript'},
    {ready: $('#source').value.trim().length > 0, id: '#check-source'},
    {ready: $('#copyright-check').checked, id: '#check-rights'}
  ];
  items.forEach(({ready,id}) => $(id).classList.toggle('done', ready));
  const complete = items.filter(({ready}) => ready).length;
  $('#completion-count').textContent = `${complete} / 4 완료`;
  $('#progress-bar').style.width = `${complete * 25}%`;
  $('#generate').disabled = complete !== 4;
  const next = !items[0].ready ? '먼저 음성 파일을 선택해 주세요.'
    : !items[1].ready ? '다음으로 녹취문을 붙여 넣어 주세요.'
    : !items[2].ready ? '성경 위치와 승인된 출처를 입력해 주세요.'
    : !items[3].ready ? '마지막으로 인용 범위를 확인해 주세요.'
    : '준비가 끝났습니다. 장면 설계를 만들어 보세요.';
  $('#next-action').textContent = next;
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

$('#render-video').addEventListener('click', renderBrowserVideo);

async function renderBrowserVideo() {
  const button = $('#render-video');
  const status = $('#render-status');
  status.classList.remove('hidden');
  setRenderProgress(0, '영상 만들기 버튼이 정상 작동했습니다. 준비를 시작합니다…');
  if (!currentProject || !audioUrl) {
    setRenderProgress(0, '음성과 장면 설계를 먼저 만들어 주세요.');
    return alert('음성과 장면 설계를 먼저 만들어 주세요.');
  }
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    setRenderProgress(0, '현재 브라우저가 영상 제작을 지원하지 않습니다.');
    return alert('이 브라우저는 영상 제작을 지원하지 않습니다. 최신 Chrome 또는 Edge에서 열어 주세요.');
  }
  syncEdits();
  button.disabled = true;
  setRenderProgress(0, '영상 화면과 음성을 준비하고 있습니다…');

  try {
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    const visualStream = canvas.captureStream(30);
    const player = $('#audio-player');

    if (!renderAudioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      renderAudioContext = new AudioContextClass();
      renderAudioSource = renderAudioContext.createMediaElementSource(player);
      renderAudioDestination = renderAudioContext.createMediaStreamDestination();
      renderAudioSource.connect(renderAudioDestination);
    }
    await renderAudioContext.resume();
    const stream = new MediaStream([
      ...visualStream.getVideoTracks(),
      ...renderAudioDestination.stream.getAudioTracks()
    ]);
    const mimeType = chooseVideoMime();
    const recorder = new MediaRecorder(stream, {mimeType, videoBitsPerSecond: 10_000_000});
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error('브라우저 영상 인코딩 중 오류가 발생했습니다.'));
      recorder.onstop = resolve;
    });

    player.pause();
    player.currentTime = 0;
    drawVideoFrame(context, canvas, currentProject, 0);
    recorder.start(1000);
    await player.play();

    await new Promise((resolve) => {
      let animationId;
      const draw = () => {
        const time = Math.min(player.currentTime, currentProject.duration);
        drawVideoFrame(context, canvas, currentProject, time);
        const percent = Math.min(99, Math.round((time / currentProject.duration) * 100));
        setRenderProgress(percent, `영상을 만들고 있습니다 · ${formatTime(time)} / ${formatTime(currentProject.duration)}`);
        if (player.ended || time >= currentProject.duration) return resolve();
        animationId = requestAnimationFrame(draw);
      };
      player.addEventListener('ended', () => { cancelAnimationFrame(animationId); resolve(); }, {once:true});
      draw();
    });

    if (recorder.state !== 'inactive') recorder.stop();
    await finished;
    stream.getTracks().forEach((track) => track.stop());
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, {type:mimeType});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName(currentProject.title)}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setRenderProgress(100, `완료되었습니다 · ${extension.toUpperCase()} 영상이 저장되었습니다.`);
  } catch (error) {
    console.error(error);
    setRenderProgress(0, '영상 제작에 실패했습니다.');
    alert(`${error.message}\n최신 Chrome 또는 Edge에서 다시 시도해 주세요.`);
  } finally {
    button.disabled = false;
  }
}

function chooseVideoMime() {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function setRenderProgress(percent, message) {
  $('#render-progress').style.width = `${percent}%`;
  $('#render-percent').textContent = `${percent}%`;
  $('#render-message').textContent = message;
}

function drawVideoFrame(ctx, canvas, project, time) {
  const scene = project.scenes.find((item) => time >= item.start && time < item.end) || project.scenes.at(-1);
  const local = Math.max(0, time - scene.start);
  const palettes = [
    ['#102f28','#5f7769','#d0a45b'], ['#182c38','#677d80','#d8b36b'],
    ['#352f29','#8a755b','#e2c489'], ['#1a3534','#527775','#c8a35d'],
    ['#292d3a','#747387','#d9b875']
  ];
  const colors = palettes[(scene.index - 1) % palettes.length];
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(canvas.width * .72, canvas.height * .25, 0, canvas.width * .72, canvas.height * .25, 560);
  glow.addColorStop(0, `${colors[2]}99`); glow.addColorStop(1, `${colors[2]}00`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width * .73, canvas.height * .37);
  ctx.rotate(local * .025);
  for (let ring = 0; ring < 4; ring += 1) {
    ctx.beginPath(); ctx.arc(0, 0, 100 + ring * 82, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,224,181,${.20 - ring * .035})`; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = '#f3dca8'; ctx.font = '72px Georgia'; ctx.textAlign = 'center'; ctx.fillText('✦', 0, 24);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,253,247,.80)'; ctx.font = '600 28px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('VINCENTIO · 말씀 영상 스튜디오', 120, 105);
  ctx.fillStyle = colors[2]; ctx.fillRect(120, 146, 92, 4);
  ctx.fillStyle = '#fffdf7'; ctx.font = '700 58px "Malgun Gothic", sans-serif';
  drawWrappedText(ctx, scene.narration, 120, 690, 1100, 82, 4);
  ctx.fillStyle = 'rgba(255,255,255,.70)'; ctx.font = '28px "Malgun Gothic", sans-serif';
  ctx.fillText(project.source, 120, 950);
  ctx.textAlign = 'right'; ctx.fillText(`${scene.index} / ${project.scenes.length}`, 1800, 950);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(120, 995, 1680, 5);
  ctx.fillStyle = colors[2]; ctx.fillRect(120, 995, 1680 * Math.min(1, time / project.duration), 5);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
}

function download(name,content,type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const link = document.createElement('a'); link.href=url; link.download=name; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
function formatTime(value){const seconds=Math.max(0,Math.floor(value||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function srtTime(value){const ms=Math.round(value*1000);const h=Math.floor(ms/3600000);const m=Math.floor(ms%3600000/60000);const s=Math.floor(ms%60000/1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
function safeName(value){return value.replace(/[\\/:*?"<>|]/g,'_').slice(0,70)||'vincentio-project';}
function escapeHtml(value){const div=document.createElement('div');div.textContent=value??'';return div.innerHTML;}

updateProgress();
