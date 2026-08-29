const $ = (selector) => document.querySelector(selector);
let audioDuration = 0;
let audioUrl = '';
let audioFile = null;
let currentProject = null;
let renderAudioContext = null;
let renderAudioSource = null;
let renderAudioDestination = null;
let whisperTranscriber = null;
let autoTranscriptChunks = [];
let transcriptionSequence = 0;

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
  audioFile = file;
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
    autoTranscribeAudio(file);
  };
}

$('#retry-transcribe').addEventListener('click', () => {
  if (audioFile) autoTranscribeAudio(audioFile, true);
});

async function autoTranscribeAudio(file, force = false) {
  if (!file || (!force && $('#transcript').value.trim())) return;
  const sequence = ++transcriptionSequence;
  const box = $('#transcribe-box');
  box.classList.remove('hidden','done','error');
  setTranscribeProgress(2, 'Whisper AI 준비 중', '음성은 외부로 전송하지 않고 이 브라우저에서 처리합니다.');
  $('#retry-transcribe').disabled = true;
  try {
    if (!whisperTranscriber) {
      const {pipeline} = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
      const progressCallback = (event) => {
        if (sequence !== transcriptionSequence) return;
        if (event.status === 'progress') {
          const value = Math.max(3, Math.min(65, Math.round((event.progress || 0) * .62)));
          setTranscribeProgress(value, '한국어 음성 모델 내려받는 중', `${value}% · 처음 한 번만 필요합니다.`);
        } else if (event.status === 'ready') {
          setTranscribeProgress(68, '한국어 음성 모델 준비 완료', '이제 음성을 분석합니다.');
        }
      };
      const options = {progress_callback: progressCallback};
      if ('gpu' in navigator) options.device = 'webgpu';
      try {
        whisperTranscriber = await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',options);
      } catch (webGpuError) {
        if (!options.device) throw webGpuError;
        setTranscribeProgress(8, '호환 모드로 다시 준비 중', '그래픽 가속 대신 안정적인 CPU 모드를 사용합니다.');
        whisperTranscriber = await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{progress_callback:progressCallback,device:'wasm'});
      }
    }
    if (sequence !== transcriptionSequence) return;
    setTranscribeProgress(72, '목소리를 글자로 바꾸는 중', '녹음 길이와 컴퓨터 성능에 따라 몇 분 걸릴 수 있습니다.');
    const result = await whisperTranscriber(audioUrl, {
      language: 'ko', task: 'transcribe', return_timestamps: true,
      chunk_length_s: 30, stride_length_s: 5
    });
    if (sequence !== transcriptionSequence) return;
    const text = String(result.text || '').trim();
    if (!text) throw new Error('음성에서 말소리를 찾지 못했습니다.');
    autoTranscriptChunks = (result.chunks || []).map((chunk) => ({
      text: String(chunk.text || '').trim(),
      timestamp: [Number(chunk.timestamp?.[0] || 0), Number(chunk.timestamp?.[1] ?? audioDuration)]
    })).filter((chunk) => chunk.text);
    $('#transcript').value = text;
    $('#transcript').dispatchEvent(new Event('input',{bubbles:true}));
    box.classList.add('done');
    setTranscribeProgress(100, '자동 자막이 완성되었습니다', '아래 자막을 읽어보고 잘못 들은 부분만 고쳐주세요.');
  } catch (error) {
    console.error('Automatic transcription failed', error);
    autoTranscriptChunks = [];
    box.classList.add('error');
    setTranscribeProgress(0, '자동 자막을 만들지 못했습니다', '다시 받기를 누르거나 녹취문을 직접 입력해 주세요.');
  } finally {
    if (sequence === transcriptionSequence) $('#retry-transcribe').disabled = false;
  }
}

function setTranscribeProgress(percent, title, message) {
  $('#transcribe-progress').style.width = `${percent}%`;
  $('#transcribe-title').textContent = title;
  $('#transcribe-message').textContent = message;
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

$('#generate').addEventListener('click', async () => {
  const transcript = $('#transcript').value.trim();
  if (!audioDuration) return alert('먼저 음성 파일을 선택해 주세요.');
  if (!transcript) return alert('녹음 원고 또는 전사문을 입력해 주세요.');
  if (!$('#source').value.trim()) return alert('성경 위치와 승인된 출처를 입력해 주세요.');
  if (!$('#copyright-check').checked) return alert('성경·전례문 인용 범위를 확인해 주세요.');
  const button = $('#generate');
  button.disabled = true;
  button.innerHTML = '목소리 구간 분석 중…';
  try {
    currentProject = await buildProject(transcript);
    renderProject(currentProject);
  } catch (error) {
    console.error(error);
    alert('음성 분석 중 오류가 발생했습니다. 다른 MP3 또는 WAV 파일로 다시 시도해 주세요.');
  } finally {
    button.innerHTML = '5초 장면 설계 만들기 <span>→</span>';
    updateProgress();
  }
});

async function buildProject(transcript) {
  const duration = Math.max(5, audioDuration);
  const sceneTotal = Math.ceil(duration / 5);
  const words = transcript.split(/\s+/).filter(Boolean);
  const captions = makeTimedCaptions(transcript, autoTranscriptChunks, duration);
  const speechWeights = captions.length ? Array(sceneTotal).fill(1) : await analyzeSpeechWeights(audioFile, sceneTotal).catch(() => Array(sceneTotal).fill(1));
  const totalWeight = speechWeights.reduce((sum, value) => sum + value, 0) || sceneTotal;
  const title = $('#title').value.trim() || inferTitle(transcript);
  const scenes = [];
  let wordCursor = 0;
  let accumulatedWeight = 0;
  for (let index = 0; index < sceneTotal; index += 1) {
    const start = index * 5;
    const end = Math.min(duration, start + 5);
    let narration;
    if (captions.length) {
      narration = captions.filter((caption) => caption.end > start && caption.start < end).map((caption) => caption.text).join(' ');
    } else {
      accumulatedWeight += speechWeights[index];
      const targetCursor = index === sceneTotal - 1 ? words.length : Math.round(words.length * accumulatedWeight / totalWeight);
      narration = words.slice(wordCursor, Math.max(wordCursor, targetCursor)).join(' ');
      wordCursor = targetCursor;
    }
    scenes.push({
      index: index + 1, start, end, narration,
      prompt: makePrompt(narration, index),
      negativePrompt: commonNegative,
      visual: chooseSceneVisual(narration, index),
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
    captions,
    hashtags: makeHashtags(transcript),
    thumbnailPrompt: `고요한 새벽빛 아래 펼쳐진 성경과 따뜻한 빛, ${title}의 정서를 상징하는 절제된 수채화, 오른쪽 제목 여백, 16:9, 이미지 안 글자 없음`,
    scenes
  };
}

function makeTimedCaptions(transcript, chunks, duration) {
  if (!chunks.length) return [];
  const words = transcript.split(/\s+/).filter(Boolean);
  const weights = chunks.map((chunk) => Math.max(1, chunk.text.split(/\s+/).filter(Boolean).length));
  const total = weights.reduce((sum,value) => sum + value,0);
  let cursor = 0;
  let accumulated = 0;
  return chunks.map((chunk,index) => {
    accumulated += weights[index];
    const target = index === chunks.length - 1 ? words.length : Math.round(words.length * accumulated / total);
    const text = words.slice(cursor,target).join(' ') || chunk.text;
    cursor = target;
    const start = Math.max(0, Number(chunk.timestamp[0] || 0));
    const endValue = Number(chunk.timestamp[1]);
    const end = Math.min(duration, Number.isFinite(endValue) && endValue > start ? endValue : start + 5);
    return {index:index+1,start,end,text};
  });
}

async function analyzeSpeechWeights(file, sceneTotal) {
  if (!file) return Array(sceneTotal).fill(1);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const analysisContext = new AudioContextClass();
  try {
    const buffer = await analysisContext.decodeAudioData(await file.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const frameSize = Math.max(1, Math.floor(buffer.sampleRate * .05));
    const frames = [];
    for (let offset = 0; offset < samples.length; offset += frameSize) {
      let energy = 0;
      const limit = Math.min(samples.length, offset + frameSize);
      for (let index = offset; index < limit; index += 1) energy += samples[index] * samples[index];
      frames.push(Math.sqrt(energy / Math.max(1, limit - offset)));
    }
    const sorted = [...frames].sort((a,b) => a-b);
    const noise = sorted[Math.floor(sorted.length * .2)] || 0;
    const voice = sorted[Math.floor(sorted.length * .9)] || .01;
    const threshold = noise + Math.max(.003, (voice - noise) * .18);
    const weights = Array(sceneTotal).fill(0);
    frames.forEach((energy,index) => {
      if (energy <= threshold) return;
      const time = index * .05;
      const sceneIndex = Math.min(sceneTotal - 1, Math.floor(time / 5));
      weights[sceneIndex] += Math.min(3, energy / Math.max(threshold,.001));
    });
    const nonzero = weights.filter(Boolean);
    const fallback = nonzero.length ? Math.max(1, Math.min(...nonzero) * .12) : 1;
    return weights.map((value) => value || fallback);
  } finally {
    analysisContext.close();
  }
}

function chooseSceneVisual(text, index) {
  if (/성경|말씀|복음|구절/.test(text)) return 'bible';
  if (/물|바다|강|세례|생명수/.test(text)) return 'water';
  if (/씨앗|씨|열매|자라|포도/.test(text)) return 'seed';
  if (/길|걸어|여정|따르|인도/.test(text)) return 'path';
  if (/기도|감사|촛불|성당/.test(text)) return 'candle';
  if (/십자가|예수|그리스도|구원/.test(text)) return 'cross';
  return ['light','bible','path','water','seed'][index % 5];
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
      <div><p><b>${scene.index}.</b> ${escapeHtml(scene.narration || '묵상의 여백')}</p><span class="visual-tag">자동 일러스트 · ${visualLabel(scene.visual)}</span><textarea aria-label="${scene.index}번 이미지 프롬프트">${escapeHtml(scene.prompt)}</textarea></div>
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

function visualLabel(value) {
  return ({bible:'펼쳐진 성경',water:'생명의 물',seed:'자라나는 씨앗',path:'빛으로 가는 길',candle:'기도의 촛불',cross:'십자가',light:'말씀의 빛'})[value] || '말씀의 빛';
}

$('#edit-again').addEventListener('click', () => {
  $('#result-panel').classList.add('hidden'); $('#input-panel').classList.remove('hidden');
});
$('#download-json').addEventListener('click', () => {
  syncEdits(); download(`${safeName(currentProject.title)}.json`, JSON.stringify(currentProject,null,2), 'application/json');
});
$('#download-srt').addEventListener('click', () => {
  syncEdits();
  const entries = currentProject.captions?.length ? currentProject.captions : currentProject.scenes.map((scene) => ({start:scene.start,end:scene.end,text:scene.narration}));
  const srt = entries.map((entry,index) => `${index+1}\n${srtTime(entry.start)} --> ${srtTime(entry.end)}\n${entry.text}\n`).join('\n');
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
  const timedCaption = project.captions?.find((item) => time >= item.start && time < item.end);
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

  drawSceneIllustration(ctx, canvas, scene.visual, colors, local);

  ctx.fillStyle = 'rgba(255,253,247,.80)'; ctx.font = '600 28px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('VINCENTIO · 말씀 영상 스튜디오', 120, 105);
  ctx.fillStyle = colors[2]; ctx.fillRect(120, 146, 92, 4);
  ctx.fillStyle = '#fffdf7'; ctx.font = '700 58px "Malgun Gothic", sans-serif';
  drawWrappedText(ctx, timedCaption?.text || scene.narration || '묵상의 여백', 120, 690, 1100, 82, 4);
  ctx.fillStyle = 'rgba(255,255,255,.70)'; ctx.font = '28px "Malgun Gothic", sans-serif';
  ctx.fillText(project.source, 120, 950);
  ctx.textAlign = 'right'; ctx.fillText(`${scene.index} / ${project.scenes.length}`, 1800, 950);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(120, 995, 1680, 5);
  ctx.fillStyle = colors[2]; ctx.fillRect(120, 995, 1680 * Math.min(1, time / project.duration), 5);
}

function drawSceneIllustration(ctx, canvas, visual, colors, local) {
  const x = canvas.width * .74;
  const y = canvas.height * .38;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(247,228,186,.88)';
  ctx.fillStyle = 'rgba(247,228,186,.76)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalAlpha = .22;
  ctx.beginPath(); ctx.arc(0, 0, 330 + Math.sin(local) * 8, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  if (visual === 'bible') {
    ctx.beginPath(); ctx.moveTo(-250,-80); ctx.quadraticCurveTo(-115,-145,-12,-55); ctx.lineTo(-12,170); ctx.quadraticCurveTo(-130,95,-250,125); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(250,-80); ctx.quadraticCurveTo(115,-145,12,-55); ctx.lineTo(12,170); ctx.quadraticCurveTo(130,95,250,125); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(25,57,48,.55)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(0,170);ctx.stroke();
  } else if (visual === 'water') {
    for (let row=0;row<5;row+=1){ctx.beginPath();for(let px=-290;px<=290;px+=20){const py=row*58-110+Math.sin(px/70+local*1.2+row)*18;px===-290?ctx.moveTo(px,py):ctx.lineTo(px,py)}ctx.stroke();}
    ctx.beginPath();ctx.arc(0,-170,62,0,Math.PI*2);ctx.fill();
  } else if (visual === 'seed') {
    ctx.beginPath();ctx.moveTo(-310,135);ctx.quadraticCurveTo(0,40,310,135);ctx.lineTo(310,240);ctx.lineTo(-310,240);ctx.closePath();ctx.fillStyle='rgba(83,61,42,.62)';ctx.fill();
    ctx.strokeStyle='rgba(247,228,186,.92)';ctx.beginPath();ctx.moveTo(0,120);ctx.quadraticCurveTo(-15,5,8,-155);ctx.stroke();
    ctx.fillStyle='rgba(197,221,164,.9)';ctx.beginPath();ctx.ellipse(-65,-70,85,38,-.45,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(70,-120,90,40,.4,0,Math.PI*2);ctx.fill();
  } else if (visual === 'path') {
    ctx.fillStyle='rgba(247,228,186,.55)';ctx.beginPath();ctx.moveTo(-55,-260);ctx.quadraticCurveTo(170,-60,-260,280);ctx.lineTo(250,280);ctx.quadraticCurveTo(-55,-15,55,-260);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(247,228,186,.9)';ctx.beginPath();ctx.arc(0,-260,42,0,Math.PI*2);ctx.fill();
  } else if (visual === 'candle') {
    ctx.fillStyle='rgba(255,245,214,.92)';ctx.fillRect(-90,-40,180,250);ctx.fillStyle=colors[2];ctx.beginPath();ctx.moveTo(0,-220);ctx.bezierCurveTo(-95,-105,-48,-60,0,-45);ctx.bezierCurveTo(55,-75,88,-125,0,-220);ctx.fill();
    ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(0,-110,220+Math.sin(local*2)*12,0,Math.PI*2);ctx.fill();
  } else if (visual === 'cross') {
    ctx.fillRect(-38,-250,76,520);ctx.fillRect(-210,-90,420,76);ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(0,0,320+Math.sin(local)*10,0,Math.PI*2);ctx.fill();
  } else {
    ctx.globalAlpha=.24;for(let ring=0;ring<4;ring+=1){ctx.beginPath();ctx.arc(0,0,90+ring*75+Math.sin(local)*5,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;ctx.font='110px Georgia';ctx.textAlign='center';ctx.fillText('✦',0,38);
  }
  ctx.restore();
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
