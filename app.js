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
let draftSaveTimer = null;
let scriptureSuggestions = [];
let characterLibrary = [];
let cloudSyncTimer = null;
const DRAFT_STORAGE_KEY = 'vincentio-video-draft-v2';
const CHARACTER_PROFILE_KEY = 'vincentio-character-profile-v1';
const CHARACTER_LIBRARY_KEY = 'vincentio-character-library-v1';
const FONT_PROFILES = {
  serif: {label:'명조체 · 경건한 말씀', family:'Georgia, "Noto Serif KR", "Malgun Myeongjo", serif'},
  clean: {label:'고딕체 · 또렷한 자막', family:'"Noto Sans KR", "Malgun Gothic", Arial, sans-serif'},
  warm: {label:'따뜻한 바탕체', family:'"Gowun Batang", "Nanum Myeongjo", Georgia, serif'}
};
const DEFAULT_CHARACTER_LIBRARY = [
  {id:'jesus', name:'예수님', role:'jesus', description:'1세기 갈릴래아의 중동계 성인 남성, 햇볕에 자연스럽게 그을린 얼굴과 어깨까지 내려오는 짙은 머리와 짧고 단정한 수염, 맑고 깊이 바라보는 온화한 표정. 흰색 또는 아이보리 속옷 위에 흙빛 겉옷과 숄을 걸치고 가죽 샌들을 신음. 사람을 축복하거나 손을 내밀어 가르치고, 도움이 필요한 이에게 몸을 낮추는 자비로운 행동.'},
  {id:'mary', name:'성모 마리아', role:'mary', description:'1세기 유대 지역의 중동계 여성, 온화한 눈매와 차분하고 자애로운 표정, 머리카락을 베일로 단정히 가림. 푸른색 또는 청회색 망토와 소박한 베이지색 긴 옷, 가죽 샌들. 기도하며 두 손을 모으거나 아이를 품고 보호하는 절제된 행동, 화려한 장신구 없음.'},
  {id:'joseph', name:'성 요셉', role:'father', description:'1세기 나자렛의 중동계 성인 남성, 짧은 짙은 머리와 정돈된 짧은 수염, 신중하고 다정한 표정. 갈색 겉옷과 베이지색 튜닉, 목수의 소박한 손과 도구. 가족을 보호하고 조용히 경청하거나 나무를 다듬는 행동.'},
  {id:'peter', name:'베드로 사도', role:'disciple', description:'갈릴래아 출신의 중동계 장년 남성, 굵은 짧은 회색 수염과 바람에 거친 얼굴, 열정과 후회가 함께 느껴지는 진솔한 표정. 소박한 갈색 튜닉과 짙은 청록색 겉옷, 어부의 밧줄과 그물. 힘 있게 손을 들고 증언하거나 예수님을 바라보며 마음을 다잡는 행동.'},
  {id:'paul', name:'바오로 사도', role:'disciple', description:'1세기 지중해 지역의 중동계 남성, 높은 이마와 짧은 짙은 머리, 단정한 짧은 수염과 지혜롭고 굳은 표정. 여행에 어울리는 소박한 긴 튜닉과 망토, 가죽 샌들. 두루마리를 들고 가르치거나 먼 길을 걸으며 복음을 전하는 행동.'},
  {id:'john-baptist', name:'세례자 요한', role:'person', description:'광야에서 지내는 중동계 성인 남성, 햇볕에 그을린 얼굴과 거친 긴 머리와 수염, 회개를 촉구하는 강렬하고 진지한 표정. 낙타털을 엮은 거친 옷과 가죽 허리띠, 맨발 또는 소박한 샌들. 강가에서 손짓으로 설교하거나 세례를 베푸는 행동.'},
  {id:'disciple', name:'제자·사도', role:'disciple', description:'1세기 유대 지역의 중동계 남성, 인물마다 다른 짧은 머리와 수염, 스승의 말을 집중해 듣는 진지한 표정. 거친 베이지·갈색 튜닉과 겉옷, 가죽 샌들. 예수님을 따라 걷거나 서로 의논하고 조용히 경청하는 행동.'},
  {id:'child', name:'아이', role:'child', description:'1세기 유대 마을의 어린이, 자연스러운 곱슬머리와 호기심 어린 밝은 표정. 무늬가 거의 없는 소박한 면 소재 튜닉과 작은 샌들. 어른의 손을 잡거나 예수님을 올려다보며 편안하게 다가가는 행동.'},
  {id:'mother', name:'어머니', role:'mother', description:'1세기 유대 지역의 중동계 여성, 단정히 가린 머리와 지친 가운데도 따뜻한 표정. 흙빛 긴 옷과 머리 베일, 소박한 천 가방. 아이를 보호하거나 아픈 가족을 돌보며 감사의 눈빛을 보내는 행동.'},
  {id:'father', name:'아버지', role:'father', description:'1세기 유대 마을의 중동계 성인 남성, 짧은 머리와 단정한 수염, 가족을 걱정하는 차분한 표정. 베이지색 튜닉과 갈색 겉옷, 소박한 가죽 샌들. 가족 곁을 지키거나 도움을 청하며 겸손히 고개를 숙이는 행동.'},
  {id:'sick', name:'도움이 필요한 사람', role:'sick', description:'시대에 맞는 소박한 옷차림의 중동계 인물, 존엄을 해치지 않는 자연스러운 표정과 자세. 낡았지만 깨끗한 겉옷, 과장된 상처나 공포 표현 없음. 도움을 청하거나 치유 후 감사와 안도의 표정을 짓는 행동.'},
  {id:'samaritan-woman', name:'사마리아 여인', role:'person', description:'1세기 사마리아 지역의 중동계 여성, 햇볕에 자연스럽게 그을린 얼굴과 조심스럽지만 진실을 마주하는 표정. 단정한 긴 옷과 머리 베일, 손에 물동이. 우물가에서 물동이를 내려놓고 대화에 귀 기울이는 행동.'},
  {id:'crowd', name:'군중', role:'crowd', description:'1세기 유대 지역의 다양한 연령과 체격의 배경 인물들, 개별 유명인 얼굴이 아닌 자연스러운 비식별 얼굴. 흙빛·베이지색 소박한 튜닉과 겉옷, 가죽 샌들. 멀리서 말씀을 듣고 놀라거나 조용히 길을 비켜 주는 절제된 행동.'}
];
DEFAULT_CHARACTER_LIBRARY.forEach((character) => { character.builtIn = true; });

const commonNegative = '사진 같은 기록물, 현대 의복, 현대 건물, 글자, 자막, 로고, 워터마크, 유명인 얼굴, 성직자 얼굴 모방, 과도한 광선, 판타지 마법, 잔혹한 폭력, 왜곡된 손과 얼굴';

$('#transcript').addEventListener('input', (event) => {
  $('#char-count').textContent = `${event.target.value.length.toLocaleString()}자`;
  updateProgress();
});
$('#source').addEventListener('input', updateProgress);
$('#source').addEventListener('input', updateCbckReferenceLink);
$('#copyright-check').addEventListener('change', updateProgress);
document.querySelectorAll('input[name="font-mode"]').forEach((input) => input.addEventListener('change', updateFontControls));
$('#font-manual').addEventListener('change', updateFontControls);
$('#result-font-mode').addEventListener('change', updateResultFontControls);
$('#result-font-manual').addEventListener('change', updateResultFontControls);
$('#compare-scripture').addEventListener('click', compareScriptureText);
$('#toggle-character-editor').addEventListener('click', toggleCharacterEditor);
$('#save-character-profile').addEventListener('click', saveCharacterProfile);
$('#add-character-profile').addEventListener('click', addCharacterProfile);
$('#approved-scripture').addEventListener('input', () => {
  $('#review-report').classList.add('hidden');
  $('#review-message').textContent = '본문을 바꾸었습니다. 자막 차이 찾아보기를 눌러 새로 비교하세요.';
});
$('#review-rights-check').addEventListener('change', () => {
  $('#review-report').classList.add('hidden');
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

const CBCK_BOOK_CODES = {
  '창세기':'Gn','탈출기':'Ex','레위기':'Lv','민수기':'Nm','신명기':'Dt','여호수아기':'Jos','판관기':'Jgs','룻기':'Ru','사무엘기 상권':'1Sm','사무엘기 하권':'2Sm','열왕기 상권':'1Kgs','열왕기 하권':'2Kgs','마태오':'Mt','마태':'Mt','마르코':'Mk','루카':'Lk','요한':'Jn','사도행전':'Acts','로마':'Rom','코린토 1':'1Cor','코린토 2':'2Cor','갈라티아':'Gal','에페소':'Eph','필리피':'Phil','콜로새':'Col','테살로니카 1':'1Thes','테살로니카 2':'2Thes','티모테오 1':'1Tm','티모테오 2':'2Tm','티토':'Ti','필레몬':'Phlm','히브리':'Heb','야고보':'Jas','베드로 1':'1Pt','베드로 2':'2Pt','요한 1':'1Jn','요한 2':'2Jn','요한 3':'3Jn','유다':'Jude','요한 묵시록':'Rv','묵시록':'Rv'
};

function updateCbckReferenceLink() {
  const link = $('#cbck-reference-link');
  const parsed = parseBibleReference($('#source').value);
  if (!parsed) {
    link.classList.add('hidden');
    return;
  }
  link.href = `https://bible.cbck.or.kr/Knb/${parsed.book}/${parsed.chapter}`;
  link.textContent = `CBCK ${parsed.label} 위치 열기 ↗`;
  link.classList.remove('hidden');
}

function parseBibleReference(value) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim();
  const match = compact.match(/([가-힣]+(?:\s*[가-힣]+)?)\s*(\d+)\s*[,.:]\s*\d+/);
  if (!match) return null;
  const rawBook = match[1].replace(/\s+/g, ' ').trim();
  const book = CBCK_BOOK_CODES[rawBook];
  return book ? {book, chapter: Number(match[2]), label: `${rawBook} ${match[2]}장`} : null;
}

function normalizeForComparison(value) {
  return String(value || '').toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitReviewUnits(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const punctuated = clean.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (punctuated.length > 1) return punctuated;
  const words = clean.split(' ');
  const units = [];
  for (let index = 0; index < words.length; index += 18) units.push(words.slice(index, index + 18).join(' '));
  return units;
}

function wordSimilarity(left, right) {
  const leftWords = normalizeForComparison(left).split(' ').filter(Boolean);
  const rightWords = normalizeForComparison(right).split(' ').filter(Boolean);
  if (!leftWords.length || !rightWords.length) return 0;
  const rightSet = new Set(rightWords);
  const overlap = leftWords.filter((word) => rightSet.has(word)).length;
  const precision = overlap / leftWords.length;
  const recall = overlap / rightWords.length;
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

function compareScriptureText() {
  const transcript = $('#transcript').value.trim();
  const reference = $('#approved-scripture').value.trim();
  const report = $('#review-report');
  if (!transcript) return alert('먼저 자동 자막을 만든 뒤 비교해 주세요.');
  if (!reference) return alert('검토할 성경 본문을 붙여 넣어 주세요.');
  if (!$('#review-rights-check').checked) return alert('검토용 본문 사용 권한을 먼저 확인해 주세요.');
  const autoUnits = splitReviewUnits(transcript);
  const referenceUnits = splitReviewUnits(reference);
  scriptureSuggestions = autoUnits.map((autoText, index) => {
    let bestText = '';
    let score = 0;
    referenceUnits.forEach((referenceText) => {
      const candidate = wordSimilarity(autoText, referenceText);
      if (candidate > score) { score = candidate; bestText = referenceText; }
    });
    return {index, autoText, suggestedText: bestText, score, applied: false};
  }).filter((item) => item.score >= .54 && normalizeForComparison(item.autoText) !== normalizeForComparison(item.suggestedText));
  report.classList.remove('hidden');
  if (!scriptureSuggestions.length) {
    report.innerHTML = '<div class="review-empty">자동으로 바꿀 만큼 확실한 차이를 찾지 못했습니다. 해설·기도 구간일 수 있으니 직접 확인해 주세요.</div>';
    $('#review-message').textContent = '자동 적용 없이 검토를 마쳤습니다.';
    return;
  }
  report.innerHTML = `<p class="review-summary">${scriptureSuggestions.length}개 구간에서 유사한 본문을 찾았습니다. 각 제안은 적용 전까지 자막을 바꾸지 않습니다.</p>${scriptureSuggestions.map((item) => `<article class="review-suggestion" data-review-index="${item.index}"><div><small>일치도 ${Math.round(item.score * 100)}% · 해설처럼 보이는 구간은 적용하지 마세요</small><p><del>${escapeHtml(item.autoText)}</del></p><p><ins>${escapeHtml(item.suggestedText)}</ins></p></div><button class="ghost" type="button" data-apply-review="${item.index}">이 제안 적용</button></article>`).join('')}<p class="review-warning">적용한 문장은 사용자가 제공한 검토 본문으로만 교체됩니다. CBCK 사이트 본문을 자동 수집하거나 복사하지 않습니다.</p>`;
  report.querySelectorAll('[data-apply-review]').forEach((button) => button.addEventListener('click', () => applyScriptureSuggestion(Number(button.dataset.applyReview))));
  $('#review-message').textContent = '제안을 하나씩 읽고 필요한 것만 적용하세요.';
}

function applyScriptureSuggestion(index) {
  const suggestion = scriptureSuggestions.find((item) => item.index === index);
  if (!suggestion || suggestion.applied) return;
  const transcript = $('#transcript').value;
  const position = transcript.indexOf(suggestion.autoText);
  if (position < 0) return alert('자막이 변경되어 이 제안을 적용할 수 없습니다. 다시 비교해 주세요.');
  $('#transcript').value = `${transcript.slice(0, position)}${suggestion.suggestedText}${transcript.slice(position + suggestion.autoText.length)}`;
  $('#transcript').dispatchEvent(new Event('input',{bubbles:true}));
  suggestion.applied = true;
  if (currentProject) {
    currentProject.transcript = $('#transcript').value;
    currentProject.captions = captionsFromReviewedTranscript(currentProject.transcript, currentProject.duration);
    currentProject.scriptureReview ||= {mode:'user_provided_authorized_text'};
    currentProject.scriptureReview.referenceText = $('#review-rights-check').checked ? $('#approved-scripture').value.trim() : '';
    currentProject.scriptureReview.rightsConfirmed = $('#review-rights-check').checked;
    currentProject.scriptureReview.suggestions = scriptureSuggestions.map(({index: itemIndex, score, applied}) => ({index:itemIndex, score, applied}));
    currentProject.scriptureReview.reviewedAt = new Date().toISOString();
  }
  const row = $(`[data-review-index="${index}"]`);
  if (row) { row.querySelector('button').textContent = '적용됨'; row.querySelector('button').disabled = true; }
  $('#review-message').textContent = '선택한 제안을 자막에 적용했습니다. 다른 제안도 반드시 확인해 주세요.';
  if (currentProject) persistDraft('검토 승인 자막을 저장했습니다.');
}

function getCharacterProfile() {
  const selectedIds = [...document.querySelectorAll('[data-character-select]:checked')].map((input) => input.value);
  const characters = characterLibrary.filter((character) => selectedIds.includes(character.id));
  return {
    selectedIds,
    characters,
    roles: [...new Set(characters.map((character) => character.role))],
    notes: $('#character-notes').value.trim()
  };
}

function persistCharacterLibrary() {
  try { localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary)); } catch { /* Keep editing available when storage is blocked. */ }
  queueCloudSync();
}

function renderCharacterDirectory(selectedIds = getCharacterProfile().selectedIds) {
  $('#character-directory').innerHTML = characterLibrary.map((character) => `<article class="character-card" data-character-id="${escapeHtml(character.id)}"><label><input type="checkbox" data-character-select value="${escapeHtml(character.id)}" ${selectedIds.includes(character.id) ? 'checked' : ''}> 사용</label><input data-character-name value="${escapeHtml(character.name)}" aria-label="인물 이름"><input data-character-description value="${escapeHtml(character.description || '')}" aria-label="인물 묘사"><button class="ghost save-character" type="button">수정</button><button class="ghost delete-character" type="button">삭제</button></article>`).join('');
  document.querySelectorAll('.save-character').forEach((button) => button.addEventListener('click', () => updateCharacterProfile(button.closest('.character-card'))));
  document.querySelectorAll('.delete-character').forEach((button) => button.addEventListener('click', () => deleteCharacterProfile(button.closest('.character-card'))));
}

function updateCharacterProfile(card) {
  const id = card.dataset.characterId;
  const character = characterLibrary.find((item) => item.id === id);
  const name = card.querySelector('[data-character-name]').value.trim();
  if (!character || !name) return alert('인물 이름을 입력해 주세요.');
  character.name = name;
  character.description = card.querySelector('[data-character-description]').value.trim();
  character.builtIn = false;
  persistCharacterLibrary();
  $('#character-profile-message').textContent = `${name} 인물 정보를 업데이트했습니다.`;
}

function deleteCharacterProfile(card) {
  const id = card.dataset.characterId;
  const character = characterLibrary.find((item) => item.id === id);
  if (!character || !confirm(`“${character.name}” 인물을 보관함에서 삭제할까요?`)) return;
  characterLibrary = characterLibrary.filter((item) => item.id !== id);
  persistCharacterLibrary();
  renderCharacterDirectory(getCharacterProfile().selectedIds.filter((selectedId) => selectedId !== id));
  $('#character-profile-message').textContent = `${character.name} 인물을 삭제했습니다.`;
}

function addCharacterProfile() {
  const name = $('#new-character-name').value.trim();
  if (!name) return alert('새 인물의 이름을 입력해 주세요.');
  const character = {id:`person-${Date.now()}`, name, role:$('#new-character-role').value, description:$('#new-character-description').value.trim(), builtIn:false};
  characterLibrary.push(character);
  persistCharacterLibrary();
  const selectedIds = [...getCharacterProfile().selectedIds, character.id];
  renderCharacterDirectory(selectedIds);
  $('#new-character-name').value = '';
  $('#new-character-description').value = '';
  $('#character-profile-message').textContent = `${name} 인물을 추가했습니다. 이번 영상에도 선택되었습니다.`;
}

function toggleCharacterEditor() {
  const body = $('#character-editor-body');
  const hidden = body.classList.toggle('hidden');
  $('#toggle-character-editor').textContent = hidden ? '등장인물 편집 열기' : '등장인물 편집 닫기';
}

function saveCharacterProfile() {
  const profile = getCharacterProfile();
  const summary = profile.characters.length ? `${profile.characters.map((character) => character.name).join(' · ')} 설정을 저장했습니다.` : '선택한 인물 없이 공통 묘사만 저장했습니다.';
  $('#character-profile-message').textContent = summary;
  try { localStorage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(profile)); } catch { /* Keep editing available when storage is blocked. */ }
  queueCloudSync();
  if (currentProject) {
    currentProject.characterProfile = profile;
    persistDraft('등장인물 설정을 저장했습니다.');
  }
}

function restoreCharacterProfile() {
  try {
    const library = JSON.parse(localStorage.getItem(CHARACTER_LIBRARY_KEY) || 'null');
    if (Array.isArray(library) && library.length) {
      const byId = new Map(library.map((character) => [character.id, character]));
      characterLibrary = DEFAULT_CHARACTER_LIBRARY.map((defaultCharacter) => {
        const saved = byId.get(defaultCharacter.id);
        return saved?.builtIn === false ? saved : {...defaultCharacter, ...(saved || {}), description:defaultCharacter.description, builtIn:true};
      });
      library.filter((character) => !DEFAULT_CHARACTER_LIBRARY.some((defaultCharacter) => defaultCharacter.id === character.id)).forEach((character) => characterLibrary.push(character));
      persistCharacterLibrary();
    } else characterLibrary = DEFAULT_CHARACTER_LIBRARY.map((character) => ({...character}));
    const profile = JSON.parse(localStorage.getItem(CHARACTER_PROFILE_KEY) || 'null');
    const selectedIds = profile?.selectedIds || characterLibrary.filter((character) => (profile?.roles || []).includes(character.role)).map((character) => character.id);
    renderCharacterDirectory(selectedIds);
    if (!profile) return;
    $('#character-notes').value = profile.notes || '';
    $('#character-profile-message').textContent = '저장한 등장인물 설정을 불러왔습니다.';
  } catch { /* Ignore unavailable or invalid local data. */ }
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

function readLocalDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null'); } catch { return null; }
}

function readLocalCharacterProfile() {
  try { return JSON.parse(localStorage.getItem(CHARACTER_PROFILE_KEY) || 'null'); } catch { return null; }
}

function setCloudSyncMessage(message) {
  const status = $('#save-state');
  if (status) status.textContent = message;
}

function queueCloudSync(snapshot = null) {
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(async () => {
    if (!window.vincentioCloud?.saveStudioState) return;
    const localSnapshot = snapshot || readLocalDraft();
    if (!localSnapshot && !characterLibrary.length) return;
    try {
      setCloudSyncMessage('Firebase에 안전하게 동기화하는 중입니다…');
      await window.vincentioCloud.saveStudioState({snapshot:localSnapshot, characterLibrary, characterProfile:readLocalCharacterProfile()});
      setCloudSyncMessage(`이 기기와 Firebase에 저장되었습니다. ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`);
    } catch (error) {
      console.warn('Firebase sync failed', error);
      setCloudSyncMessage('이 기기에는 저장되었습니다. Firebase 동기화는 다음 로그인 때 다시 시도합니다.');
    }
  }, 550);
}

async function restoreCloudState() {
  if (!window.vincentioCloud?.loadStudioState) return;
  try {
    const remote = await window.vincentioCloud.loadStudioState();
    if (!remote) {
      const local = readLocalDraft();
      if (local || characterLibrary.length) queueCloudSync(local);
      return;
    }
    if (Array.isArray(remote.characterLibrary) && remote.characterLibrary.length) {
      characterLibrary = remote.characterLibrary;
      localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary));
      renderCharacterDirectory();
    }
    if (remote.characterProfile) {
      localStorage.setItem(CHARACTER_PROFILE_KEY, JSON.stringify(remote.characterProfile));
      const selectedIds = remote.characterProfile.selectedIds || characterLibrary.filter((character) => (remote.characterProfile.roles || []).includes(character.role)).map((character) => character.id);
      renderCharacterDirectory(selectedIds);
      $('#character-notes').value = remote.characterProfile.notes || '';
    }
    const local = readLocalDraft();
    const remoteDraft = remote.snapshot;
    if (remoteDraft && (!local || new Date(remoteDraft.savedAt || 0) > new Date(local.savedAt || 0))) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(remoteDraft));
      showDraftRestore();
      setCloudSyncMessage('Firebase에 저장된 최근 프로젝트를 불러왔습니다.');
    } else if (local) {
      queueCloudSync(local);
    }
  } catch (error) {
    console.warn('Firebase restore failed', error);
  }
}

document.addEventListener('vincentio-cloud-ready', restoreCloudState);

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
  const characterProfile = getCharacterProfile();
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
    const characters = [...new Set([...chooseSceneCharacters(narration), ...characterProfile.roles])].slice(0,4);
    const setting = chooseSceneSetting(narration);
    const baseCharacterDescription = buildCharacterDescription(characters, narration, setting);
    const savedCharacterDescriptions = characterProfile.characters.map((character) => `${character.name}: ${character.description || characterLabel(character.role)}`).join('; ');
    const characterDescription = [baseCharacterDescription, savedCharacterDescriptions ? `저장한 인물 설정: ${savedCharacterDescriptions}` : '', characterProfile.notes ? `공통 인물 설정: ${characterProfile.notes}` : ''].filter(Boolean).join(' ');
    scenes.push({
      index: index + 1, start, end, narration,
      prompt: makePrompt(narration, index, characters, characterDescription),
      negativePrompt: commonNegative,
      visual: chooseSceneVisual(narration, index),
      characters,
      setting,
      characterDescription,
      status: 'review_required'
    });
  }
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    title,
    source: $('#source').value.trim(),
    duration,
    transcript,
    captions,
    scriptureReview: {
      mode: 'user_provided_authorized_text',
      referenceText: $('#review-rights-check').checked ? $('#approved-scripture').value.trim() : '',
      rightsConfirmed: $('#review-rights-check').checked,
      suggestions: scriptureSuggestions.map(({index, score, applied}) => ({index, score, applied})),
      reviewedAt: scriptureSuggestions.length ? new Date().toISOString() : null
    },
    characterProfile,
    font: getSelectedFont(transcript),
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

function captionsFromReviewedTranscript(transcript, duration) {
  const timed = makeTimedCaptions(transcript, autoTranscriptChunks, duration);
  if (timed.length) return timed;
  const units = splitReviewUnits(transcript);
  return units.map((text, index) => ({index:index + 1, start:index * duration / units.length, end:(index + 1) * duration / units.length, text}));
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

function makePrompt(text, index, characters = [], characterDescription = '') {
  const symbols = ['고요한 길과 따뜻한 빛','펼쳐진 성경과 창가의 자연광','흙 위의 작은 씨앗과 새벽빛','잔잔한 물결과 멀리 열린 길','빈 성당 의자와 부드러운 햇살'];
  const people = characters.length ? `원고에 언급된 인물만 표현: ${characterDescription}` : '원고에 인물이 명시되지 않아 사람은 추가하지 않음';
  return `가톨릭 묵상 영상용 절제된 성화풍 수채화, “${text}”의 의미를 ${symbols[index % symbols.length]}으로 상징적으로 표현, ${people}, 원문에 없는 인물이나 사건 추가 금지, 베이지·짙은 청색·은은한 금색, 경건하고 고요한 분위기, 하단 자막 여백, 16:9, 글자 없음`;
}

function buildCharacterDescription(characters, text, setting) {
  if (!characters.length) return '본문에 특정 인물이 언급되지 않았습니다. 사람을 추가하지 않고 장소와 상징만 표현합니다.';
  const actions = /걸어|길|따르/.test(text) ? '천천히 길을 걷는 모습'
    : /기도|찬미|감사/.test(text) ? '두 손을 모아 기도하거나 고요히 묵상하는 모습'
    : /가르치|말씀|복음/.test(text) ? '상대에게 말씀을 전하거나 경청하는 모습'
    : /치유|도움|돌보/.test(text) ? '따뜻하게 돌보고 돕는 모습'
    : '원고의 흐름을 해치지 않는 차분한 자세';
  const location = ({church:'성전 또는 성당의 절제된 실내',waterside:'1세기 갈릴래아를 연상시키는 물가',mountain:'단순한 산과 언덕',road:'먼지 나는 고요한 길',home:'소박한 가정의 실내', 'sacred-light':'부드러운 자연광이 비치는 절제된 공간'})[setting] || '절제된 공간';
  const roleDetails = {
    jesus:'예수님은 1세기 유대 지역의 성인 남성으로, 단정한 중동계 외모와 수수한 아이보리 겉옷, 과장되지 않은 온화한 표정',
    mary:'성모 마리아는 푸른 망토와 절제된 베이지 옷차림, 평온하고 자애로운 분위기',
    disciple:'제자·사도는 1세기 유대 지역의 소박한 여행자 복장과 경청하는 태도',
    priest:'성직자는 전례 예복을 과장하지 않은 단정한 현대 가톨릭 사제 복장',
    child:'아이는 시대와 장면에 어울리는 소박한 옷차림과 자연스러운 표정',
    mother:'어머니는 소박한 의복과 따뜻한 보호자의 태도',
    father:'아버지는 소박한 의복과 차분한 보호자의 태도',
    sick:'도움이 필요한 사람은 존엄을 해치지 않는 단정한 모습',
    crowd:'군중은 개별 얼굴을 특정하지 않는 절제된 배경 인물',
    praying:'기도하는 사람은 특정 개인을 닮지 않는 단정한 실루엣',
    person:'본문의 맥락에 맞는 비식별 인물 실루엣'
  };
  return `${characters.map((role) => roleDetails[role] || characterLabel(role)).join('; ')}. ${location}에서 ${actions}. 실제 유명인·성직자·개인 얼굴을 모방하지 않고, 원문에 없는 행동이나 인물을 추가하지 않습니다.`;
}

function getSelectedFont(text = '') {
  const mode = document.querySelector('input[name="font-mode"]:checked')?.value || 'auto';
  const manual = $('#font-manual').value || 'serif';
  const resolved = mode === 'manual' ? manual : recommendFont(text);
  return {mode, manual, resolved, label: FONT_PROFILES[resolved].label};
}

function recommendFont(text) {
  if (/기도|묵상|성모|예수|복음|찬미/.test(text)) return 'serif';
  if (text.length > 700) return 'clean';
  return 'warm';
}

function updateFontControls() {
  const mode = document.querySelector('input[name="font-mode"]:checked')?.value || 'auto';
  $('#font-manual').disabled = mode !== 'manual';
  const preview = getSelectedFont($('#transcript').value);
  $('#font-recommendation').textContent = mode === 'auto' ? `자동 추천: ${preview.label}` : `직접 선택: ${preview.label}`;
  if (currentProject) {
    currentProject.font = preview;
    updateProjectFontSummary();
    persistDraft('글꼴 설정이 저장되었습니다.');
  }
}

function chooseSceneCharacters(text) {
  const roles = [];
  const add = (role) => { if (!roles.includes(role) && roles.length < 4) roles.push(role); };
  if (/예수|그리스도/.test(text)) add('jesus');
  if (/성모|마리아/.test(text)) add('mary');
  if (/제자|사도|베드로|바오로|요한/.test(text)) add('disciple');
  if (/신부|사제|교황|주교/.test(text)) add('priest');
  if (/어린이|아이|아기/.test(text)) add('child');
  if (/어머니|엄마/.test(text)) add('mother');
  if (/아버지|아빠/.test(text)) add('father');
  if (/가족/.test(text)) ['mother','father','child'].forEach(add);
  if (/병자|환자|아픈 사람/.test(text)) add('sick');
  if (/군중|사람들|이웃|백성/.test(text)) add('crowd');
  if (!roles.length && /기도|묵상|감사|찬미/.test(text)) add('praying');
  if (!roles.length && /사람|여인|여자|남자/.test(text)) add('person');
  return roles;
}

function chooseSceneSetting(text) {
  if (/성당|성전|교회/.test(text)) return 'church';
  if (/바다|강|물|호수/.test(text)) return 'waterside';
  if (/산|언덕/.test(text)) return 'mountain';
  if (/길|여정|걸어/.test(text)) return 'road';
  if (/집|가정|가족/.test(text)) return 'home';
  return 'sacred-light';
}

function characterLabel(role) {
  return ({jesus:'예수님',mary:'성모 마리아',disciple:'제자·사도',priest:'성직자',child:'아이',mother:'어머니',father:'아버지',sick:'도움이 필요한 사람',crowd:'군중',praying:'기도하는 사람',person:'사람'})[role] || '사람';
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
  project.font ||= getSelectedFont(project.transcript || '');
  project.scenes.forEach((scene) => {
    scene.characters ||= chooseSceneCharacters(scene.narration || '');
    scene.setting ||= chooseSceneSetting(scene.narration || '');
    if (scene.characterDescription == null) scene.characterDescription = buildCharacterDescription(scene.characters, scene.narration || '', scene.setting);
  });
  $('#input-panel').classList.add('hidden');
  $('#result-panel').classList.remove('hidden');
  $('#result-title').textContent = project.title;
  $('#thumbnail-copy').textContent = project.title;
  $('#hashtags').innerHTML = project.hashtags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  $('#duration-summary').textContent = `재생시간 ${formatTime(project.duration)} · ${project.scenes.length}개 장면`;
  $('#source-summary').textContent = `출처: ${project.source}`;
  $('#scene-count').textContent = `총 ${project.scenes.length}개`;
  updateProjectFontSummary();
  $('#scene-list').innerHTML = project.scenes.map((scene,index) => `
    <article class="scene" data-index="${index}">
      <time>${formatTime(scene.start)}–${formatTime(scene.end)}</time>
      <div><p><b>${scene.index}.</b> ${escapeHtml(scene.narration || '묵상의 여백')}</p><div class="scene-tags"><span class="visual-tag">배경 · ${visualLabel(scene.visual)}</span><span class="person-tag">인물 · ${scene.characters?.length ? scene.characters.map(characterLabel).join(' · ') : '원고에 언급 없음'}</span></div><label class="character-field">인물 묘사 · 영상 그림용<textarea aria-label="${scene.index}번 인물 묘사">${escapeHtml(scene.characterDescription)}</textarea></label><label class="prompt-field">AI 이미지 프롬프트<textarea aria-label="${scene.index}번 이미지 프롬프트">${escapeHtml(scene.prompt)}</textarea></label></div>
      <div><select aria-label="${scene.index}번 검수 상태"><option value="review_required">확인 필요</option><option value="verified">원문 확인됨</option></select></div>
    </article>`).join('');
  document.querySelectorAll('.scene textarea, .scene select').forEach((element) => element.addEventListener('input', scheduleDraftSave));
  document.querySelectorAll('.scene select').forEach((element) => element.addEventListener('change', scheduleDraftSave));
  persistDraft('새 프로젝트가 이 기기에 저장되었습니다.');
  window.scrollTo({top: $('#result-panel').offsetTop - 85,behavior:'smooth'});
}

function syncEdits() {
  if (!currentProject) return;
  document.querySelectorAll('.scene').forEach((row) => {
    const scene = currentProject.scenes[Number(row.dataset.index)];
    scene.characterDescription = row.querySelector('textarea[aria-label*="인물 묘사"]').value;
    scene.prompt = row.querySelector('textarea[aria-label*="이미지 프롬프트"]').value;
    scene.status = row.querySelector('select').value;
  });
}

function updateProjectFontSummary() {
  if (!currentProject?.font) return;
  $('#project-font-summary').textContent = `${currentProject.font.mode === 'auto' ? '자동 추천' : '직접 선택'} · ${currentProject.font.label}`;
  $('#result-font-mode').value = currentProject.font.mode;
  $('#result-font-manual').value = currentProject.font.manual || currentProject.font.resolved;
  $('#result-font-manual').disabled = currentProject.font.mode !== 'manual';
}

function updateResultFontControls() {
  if (!currentProject) return;
  const mode = $('#result-font-mode').value;
  const manual = $('#result-font-manual').value;
  $('#result-font-manual').disabled = mode !== 'manual';
  document.querySelector(`input[name="font-mode"][value="${mode}"]`).checked = true;
  $('#font-manual').value = manual;
  $('#font-manual').disabled = mode !== 'manual';
  currentProject.font = {mode, manual, resolved: mode === 'manual' ? manual : recommendFont(currentProject.transcript), label: FONT_PROFILES[mode === 'manual' ? manual : recommendFont(currentProject.transcript)].label};
  updateProjectFontSummary();
  persistDraft('글꼴 설정이 업데이트되었습니다.');
}

function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    syncEdits();
    persistDraft('수정 내용이 자동 저장되었습니다.');
  }, 500);
}

function persistDraft(message = '이 기기에 저장되었습니다.') {
  if (!currentProject) return;
  try {
    const snapshot = {
      project: currentProject,
      form: {title: $('#title').value, source: $('#source').value, transcript: $('#transcript').value, copyright: $('#copyright-check').checked, approvedScripture: $('#approved-scripture').value, reviewRights: $('#review-rights-check').checked, characterProfile: getCharacterProfile()},
      savedAt: new Date().toISOString(),
      audioName: audioFile?.name || null
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    $('#save-state').textContent = `${message} ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`;
    queueCloudSync(snapshot);
  } catch (error) {
    console.warn('Draft save failed', error);
    $('#save-state').textContent = '이 브라우저에서는 자동 저장을 사용할 수 없습니다.';
  }
}

function showDraftRestore() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft?.project?.title) return;
    $('#draft-banner').classList.remove('hidden');
    $('#draft-summary').textContent = `${draft.project.title} · ${new Date(draft.savedAt).toLocaleDateString('ko-KR')}`;
  } catch { /* Ignore unavailable or invalid local data. */ }
}

$('#restore-draft').addEventListener('click', () => {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (!draft?.project) return;
    $('#title').value = draft.form?.title || draft.project.title || '';
    $('#source').value = draft.form?.source || draft.project.source || '';
    $('#transcript').value = draft.form?.transcript || draft.project.transcript || '';
    $('#copyright-check').checked = Boolean(draft.form?.copyright);
    $('#approved-scripture').value = draft.form?.approvedScripture || draft.project.scriptureReview?.referenceText || '';
    $('#review-rights-check').checked = Boolean(draft.form?.reviewRights || draft.project.scriptureReview?.rightsConfirmed);
    const characterProfile = draft.form?.characterProfile || draft.project.characterProfile || {};
    const selectedIds = characterProfile.selectedIds || characterLibrary.filter((character) => (characterProfile.roles || []).includes(character.role)).map((character) => character.id);
    renderCharacterDirectory(selectedIds);
    $('#character-notes').value = characterProfile.notes || '';
    currentProject = draft.project;
    currentProject.font ||= getSelectedFont(currentProject.transcript || '');
    document.querySelector(`input[name="font-mode"][value="${currentProject.font.mode || 'auto'}"]`).checked = true;
    $('#font-manual').value = currentProject.font.manual || currentProject.font.resolved || 'serif';
    updateFontControls();
    $('#char-count').textContent = `${$('#transcript').value.length.toLocaleString()}자`;
    updateCbckReferenceLink();
    renderProject(currentProject);
    $('#save-state').textContent = '저장된 프로젝트를 불러왔습니다. 영상을 다시 만들려면 원본 음성을 다시 선택해 주세요.';
  } catch {
    alert('저장된 프로젝트를 불러오지 못했습니다.');
  }
});

$('#save-project').addEventListener('click', () => {
  syncEdits();
  persistDraft('변경한 프로젝트를 저장했습니다.');
});

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
  drawCharacterGroup(ctx, canvas, scene.characters || [], colors, local, scene.characterDescription || '');

  const videoFont = FONT_PROFILES[project.font?.resolved]?.family || FONT_PROFILES.serif.family;

  ctx.fillStyle = 'rgba(255,253,247,.80)'; ctx.font = `600 28px ${videoFont}`; ctx.textAlign = 'left';
  ctx.fillText('VINCENTIO · 말씀 영상 스튜디오', 120, 105);
  ctx.fillStyle = colors[2]; ctx.fillRect(120, 146, 92, 4);
  ctx.fillStyle = '#fffdf7'; ctx.font = `700 58px ${videoFont}`;
  drawWrappedText(ctx, timedCaption?.text || scene.narration || '묵상의 여백', 120, 690, 1100, 82, 4);
  ctx.fillStyle = 'rgba(255,255,255,.70)'; ctx.font = `28px ${videoFont}`;
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

function drawCharacterGroup(ctx, canvas, roles, colors, local, description) {
  if (!roles.length) return;
  const expanded = [];
  roles.forEach((role) => {
    if (role === 'crowd') expanded.push('person','person','person');
    else expanded.push(role);
  });
  const people = expanded.slice(0,4);
  const spacing = people.length === 1 ? 0 : Math.min(215, 650 / (people.length - 1));
  const startX = canvas.width * .75 - spacing * (people.length - 1) / 2;
  ctx.save();
  ctx.globalAlpha = .22;
  ctx.fillStyle = '#071e19';
  ctx.beginPath();ctx.ellipse(canvas.width*.75,820,390,55,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  people.forEach((role,index) => drawPerson(ctx,startX+index*spacing,800,role,colors,local,index,description));
}

function drawPerson(ctx, x, groundY, role, colors, local, index, description = '') {
  const isChild = role === 'child';
  const scale = isChild ? .68 : role === 'sick' ? .82 : 1;
  const bob = Math.sin(local*1.2+index)*3;
  const palettes = {
    jesus:['#f2ead7','#a34f3c','#5c3c2f'], mary:['#355f82','#ede6d2','#46392f'],
    disciple:['#9b7653','#566c59','#43362e'], priest:['#252b2a','#f3efe5','#35302d'],
    child:['#c78c5c','#5f7d69','#4b342a'], mother:['#8a5863','#d3ae7c','#49352e'],
    father:['#65725d','#9a724f','#44332c'], sick:['#837464','#b49a75','#51433a'],
    praying:['#6d7083','#b89567','#44332d'], person:['#667b70','#b48a63','#42342d']
  };
  const palette = palettes[role] || palettes.person;
  if (/푸른|파란|청색/.test(description)) palette[0] = '#426f95';
  if (/붉은|빨간|적색/.test(description)) palette[0] = '#a45048';
  if (/흰|아이보리|밝은/.test(description)) palette[0] = '#e9dfc8';
  ctx.save();ctx.translate(x,groundY+bob);ctx.scale(scale,scale);
  if (role === 'jesus' || role === 'mary') {
    ctx.strokeStyle='rgba(244,214,145,.76)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,-310,78,0,Math.PI*2);ctx.stroke();
  }
  ctx.fillStyle='rgba(232,190,151,.98)';ctx.beginPath();ctx.arc(0,-300,48,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=palette[2];
  if (role === 'mary') {ctx.beginPath();ctx.moveTo(-68,-308);ctx.quadraticCurveTo(0,-400,68,-308);ctx.lineTo(45,-220);ctx.lineTo(-45,-220);ctx.closePath();ctx.fill();}
  else {ctx.beginPath();ctx.arc(0,-318,50,Math.PI,Math.PI*2);ctx.lineTo(50,-285);ctx.quadraticCurveTo(65,-235,38,-220);ctx.lineTo(-38,-220);ctx.quadraticCurveTo(-65,-235,-50,-285);ctx.closePath();ctx.fill();}
  ctx.fillStyle=palette[0];ctx.beginPath();ctx.moveTo(-58,-240);ctx.quadraticCurveTo(-112,-80,-120,0);ctx.lineTo(120,0);ctx.quadraticCurveTo(110,-105,58,-240);ctx.closePath();ctx.fill();
  ctx.fillStyle=palette[1];ctx.beginPath();ctx.moveTo(8,-235);ctx.quadraticCurveTo(70,-90,65,0);ctx.lineTo(122,0);ctx.quadraticCurveTo(110,-120,55,-240);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(232,190,151,.98)';ctx.lineWidth=28;ctx.lineCap='round';
  ctx.beginPath();
  if (role === 'praying' || role === 'priest' || role === 'mary') {ctx.moveTo(-48,-205);ctx.lineTo(-12,-120);ctx.lineTo(0,-150);ctx.moveTo(48,-205);ctx.lineTo(12,-120);ctx.lineTo(0,-150);}
  else if (role === 'jesus') {ctx.moveTo(-48,-205);ctx.lineTo(-128,-140);ctx.moveTo(48,-205);ctx.lineTo(128,-140);}
  else if (role === 'sick') {ctx.moveTo(-48,-205);ctx.lineTo(-90,-80);ctx.moveTo(48,-205);ctx.lineTo(90,-80);}
  else {ctx.moveTo(-48,-205);ctx.lineTo(-72,-95);ctx.moveTo(48,-205);ctx.lineTo(72,-95);}
  ctx.stroke();
  if (role === 'priest') {ctx.fillStyle='#fff';ctx.fillRect(-20,-244,40,16);}
  ctx.fillStyle='rgba(244,224,181,.32)';ctx.beginPath();ctx.ellipse(0,8,135,22,0,0,Math.PI*2);ctx.fill();
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
updateFontControls();
updateCbckReferenceLink();
restoreCharacterProfile();
showDraftRestore();
