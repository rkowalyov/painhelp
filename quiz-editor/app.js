/* ============================================================
   QUIZ EDITOR — app.js
   Редактор JSON-квизов под Битрикс24
   ============================================================ */

// ---------- AUTHENTICATION ----------
const AUTH_TOKEN_KEY = 'quiz_editor_auth_token';

function initAuthScreen() {
  const loginScreen = document.getElementById('loginScreen');
  const editorContainer = document.getElementById('editorContainer');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // Проверить, авторизован ли пользователь
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (authToken) {
    try {
      const tokenData = JSON.parse(authToken);
      if (Date.now() < tokenData.expires) {
        loginScreen.style.display = 'none';
        editorContainer.style.display = 'block';
        initializeEditor();
        return true;
      }
    } catch (e) {}
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  // Показать экран входа
  loginScreen.style.display = 'flex';
  editorContainer.style.display = 'none';

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    loginError.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Проверка...';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        // Успешная авторизация — сохраняем токен
        localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({
          token: data.token,
          username: data.username,
          expires: data.expires
        }));
        loginScreen.style.display = 'none';
        editorContainer.style.display = 'block';
        loginForm.reset();
        initializeEditor();
      } else {
        loginError.textContent = data.error || 'Неверный логин или пароль';
        loginError.classList.add('show');
        loginPassword.value = '';
        loginPassword.focus();
      }
    } catch (err) {
      loginError.textContent = 'Ошибка соединения с сервером';
      loginError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Войти';
    }
  });

  return false;
}

async function initializeEditor() {
  // Эта функция вызывается после успешной авторизации
  // Приоритет у параметра ?load, чтобы редактор открывал именно выбранный сценарий, а не старое состояние из localStorage
  let loadedData = null;
  if (getLoadParam()) {
    console.log("[EDITOR] Loading scenario by URL param");
    loadedData = await loadFromUrlScenario();
    if (!loadedData) {
      console.warn("[EDITOR] URL param provided but no scenario file was loaded; ignoring stale localStorage data");
    }
  } else {
    loadedData = loadFromStorage();
    console.log("[EDITOR] Loaded from localStorage:", !!loadedData);
  }

  // Загружаем данные
  console.log("[EDITOR] Using data:", loadedData ? "external/saved" : "default");
  loadFromObject(loadedData || DEFAULT_JSON);
  initFieldHelp();
}

// ---------- LOAD FROM EXTERNAL SOURCE ----------
function getLoadParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('load');
}

function normalizeLoadParam() {
  const raw = (getLoadParam() || '').trim();
  if (!raw) return '';
  if (raw.includes('..')) return '';
  const safe = raw.replace(/[^a-zA-Z0-9_.\-\/]/g, '');
  return safe;
}

async function loadFromUrlScenario() {
  const quizName = normalizeLoadParam();
  if (!quizName) return null;

  const scenarioFile = quizName.endsWith('.json') ? quizName : `${quizName}.json`;
  const url = scenarioFile.startsWith('./') || scenarioFile.startsWith('/') || scenarioFile.includes('/')
    ? scenarioFile
    : `../scenarios/${scenarioFile}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    localStorage.removeItem('quiz_editor_load');
    console.log('[EDITOR] Loaded quiz from URL:', url);
    return data;
  } catch (e) {
    console.error('[EDITOR] Failed to load quiz by URL:', e);
    return null;
  }
}

function loadFromSessionStorage() {
  try {
    console.log("[EDITOR] Checking localStorage...");
    const data = localStorage.getItem('quiz_editor_load');
    console.log("[EDITOR] Found data:", !!data);
    if (data) {
      const parsed = JSON.parse(data);
      localStorage.removeItem('quiz_editor_load');
      console.log("[EDITOR] Loaded quiz from localStorage");
      return parsed;
    }
  } catch (e) {
    console.error('[EDITOR] Failed to load from localStorage:', e);
  }
  return null;
}

// ---------- STATE ----------
let questions = [];
let scoringLevels = [];

function scoringToneByIndex(index, total) {
  if (total <= 1) return 'high';
  const ratio = index / (total - 1);
  if (ratio < 1 / 3) return 'low';
  if (ratio < 2 / 3) return 'medium';
  return 'high';
}

function normalizeScoring(scoring) {
  const raw = [];
  if (Array.isArray(scoring)) {
    scoring.forEach((lvl, i) => {
      if (!lvl || typeof lvl !== 'object') return;
      raw.push({
        id: lvl.id || `level_${i + 1}`,
        max: Number(lvl.max),
        title: lvl.title || '',
        text: lvl.text || '',
        cta: Array.isArray(lvl.cta) ? lvl.cta : []
      });
    });
  } else if (scoring && typeof scoring === 'object') {
    Object.entries(scoring).forEach(([id, lvl], i) => {
      const src = (lvl && typeof lvl === 'object') ? lvl : {};
      raw.push({
        id: id || `level_${i + 1}`,
        max: Number(src.max),
        title: src.title || '',
        text: src.text || '',
        cta: Array.isArray(src.cta) ? src.cta : []
      });
    });
  }

  const safe = raw.filter(lvl => Number.isFinite(lvl.max));
  if (!safe.length) {
    return [
      { id: 'low', max: 3, title: '', text: '', cta: [] },
      { id: 'medium', max: 7, title: '', text: '', cta: [] },
      { id: 'high', max: 99, title: '', text: '', cta: [] }
    ];
  }

  safe.sort((a, b) => a.max - b.max);
  return safe;
}

function nextScoringLevelId() {
  let n = scoringLevels.length + 1;
  const used = new Set(scoringLevels.map(l => l.id));
  while (used.has(`level_${n}`)) n++;
  return `level_${n}`;
}

function renderScoringLevels() {
  const wrap = document.getElementById('scoring-levels');
  if (!wrap) return;
  wrap.innerHTML = '';

  scoringLevels.forEach((lvl, idx) => {
    const tone = scoringToneByIndex(idx, scoringLevels.length);
    const card = document.createElement('div');
    card.className = `scoring-card ${tone}`;
    card.dataset.level = lvl.id;

    card.innerHTML = `
      <div class="scoring-badge">Уровень ${idx + 1}</div>
      <div class="field-group">
        <label class="field-label">Ключ уровня</label>
        <input class="field-input" type="text" value="${lvl.id}" readonly />
      </div>
      <div class="field-group">
        <label class="field-label">Макс. баллов (включительно)</label>
        <input class="field-input score-max" type="number" value="${Number.isFinite(lvl.max) ? lvl.max : ''}" min="0" />
      </div>
      <div class="field-group">
        <label class="field-label">Заголовок результата</label>
        <input class="field-input score-title" type="text" value="${lvl.title || ''}" placeholder="Заголовок" />
      </div>
      <div class="field-group">
        <label class="field-label">Текст</label>
        <textarea class="field-input field-textarea score-text" placeholder="Описание результата...">${lvl.text || ''}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">CTA кнопки</label>
        <div class="cta-button-count-selector">
          <span class="count-label">Количество:</span>
          <button type="button" class="btn-count active" data-count="1">1</button>
          <button type="button" class="btn-count" data-count="2">2</button>
          <button type="button" class="btn-count" data-count="3">3</button>
        </div>
      </div>
      <div class="cta-buttons-container" id="cta-${lvl.id}-container"></div>
      <button type="button" class="btn btn-outline remove-scoring-level" ${scoringLevels.length <= 1 ? 'disabled' : ''}>Удалить уровень</button>
    `;
    wrap.appendChild(card);

    const ctaCount = Math.min(Math.max((lvl.cta || []).length, 1), 3);
    renderCtaButtons(lvl.id, ctaCount, lvl.cta || []);
  });
}

const TEMPLATE_CRM_FIELDS = [
  { label: 'Насколько сильная боль — UF_CRM_1777993688', value: 'UF_CRM_1777993688' },
  { label: 'Где болит — UF_CRM_1777993643', value: 'UF_CRM_1777993643' },
  { label: 'Как давно появилась боль — UF_CRM_1777993660', value: 'UF_CRM_1777993660' },
  { label: 'Влияние боли на жизнь — UF_CRM_1777993717', value: 'UF_CRM_1777993717' },
  { label: 'Обращались к врачу — UF_CRM_1777993749', value: 'UF_CRM_1777993749' },
  { label: 'Хроническая боль — UF_CRM_1777993788', value: 'UF_CRM_1777993788' },
  { label: 'Лечение не помогло — UF_CRM_1777993848', value: 'UF_CRM_1777993848' }
];

const DEFAULT_JSON = {
  meta: {
    title: "Проверьте свою боль за минуту",
    subtitle: "Ответьте на 5 вопросов и получите понимание, стоит ли обращаться к специалисту",
    trust_badges: ["Без регистрации", "Анонимно", "Основано на опыте врачей"],
    cta_start: "Пройти тест",
    source_label: "Тест Квиз 26_05_07",
    email_title: "Мы почти готовы показать результат",
    email_subtitle: "Оставьте email, чтобы получить результат и рекомендации и не потерять их",
    email_fear: "Боль, которая длится долго, может становиться хронической"
  },
  questions: [
    {
      id: "pain_location", crm_field: "UF_CRM_1777993643",
      text: "Где вы чаще всего чувствуете боль?",
      options: [
        { label: "Голова",  value: "head",   score: 1 },
        { label: "Спина",   value: "back",   score: 2 },
        { label: "Шея",     value: "neck",   score: 2 },
        { label: "Суставы", value: "joints", score: 2 },
        { label: "Другое",  value: "other",  score: 1 }
      ]
    },
    {
      id: "pain_duration", crm_field: "UF_CRM_1777993660",
      text: "Как давно появилась боль?",
      flag: "chronic_if_gte_index", chronic_threshold: 2,
      options: [
        { label: "Несколько дней",    value: "short",   score: 0 },
        { label: "Несколько недель",  value: "weeks",   score: 1 },
        { label: "Несколько месяцев", value: "months",  score: 2 },
        { label: "Более 6 месяцев",   value: "chronic", score: 4 }
      ]
    },
    {
      id: "pain_intensity", crm_field: "UF_CRM_1777993688",
      text: "Насколько сильная боль?",
      options: [
        { label: "Слабая, почти не мешает", value: "low",       score: 0 },
        { label: "Умеренная",               value: "medium",    score: 1 },
        { label: "Сильная",                 value: "high",      score: 2 },
        { label: "Очень сильная",           value: "very_high", score: 3 }
      ]
    },
    {
      id: "pain_impact", crm_field: "UF_CRM_1777993717",
      text: "Насколько боль влияет на вашу жизнь?",
      options: [
        { label: "Практически не влияет",             value: "none",     score: 0 },
        { label: "Иногда мешает",                      value: "moderate", score: 1 },
        { label: "Сильно влияет на повседневные дела", value: "strong",   score: 3 }
      ]
    },
    {
      id: "doctor_visit", crm_field: "UF_CRM_1777993749",
      text: "Обращались ли вы к врачу с этой проблемой?",
      flag: "failed_treatment_if_value", failed_treatment_value: "no_result",
      options: [
        { label: "Нет",                        value: "no",        score: 2 },
        { label: "Да, но лечение не помогло",  value: "no_result", score: 3 },
        { label: "Да, сейчас прохожу лечение", value: "treatment", score: 1 }
      ]
    }
  ],
  scoring: {
    low:    { max: 3,  title: "Серьёзных признаков не выявлено", text: "Судя по вашим ответам, боль пока не выглядит хронической.", cta: [{ text: "Читать полезные материалы", url: "" }, { text: "Узнать больше о боли", url: "" }] },
    medium: { max: 7,  title: "Боль требует внимания", text: "Некоторые ответы могут указывать на развитие хронической боли.", cta: [{ text: "Получить консультацию", url: "" }, { text: "Изучить методы лечения", url: "" }] },
    high:   { max: 99, title: "Рекомендуем обратиться к специалисту", text: "Ваши ответы указывают на высокую вероятность хронической боли.", cta: [{ text: "Найти клинику", url: "" }, { text: "Записаться на консультацию", url: "" }] }
  },
  crm_fields: {
    score: "UF_CRM_1777993552",
    result: "UF_CRM_1777993608",
    is_chronic: "UF_CRM_1777993788",
    failed_treatment: "UF_CRM_1777993848",
    source: "UF_CRM_1777993881",
    answers_json: "UF_CRM_1786729063"
  }
};

// ---------- THEME ----------
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  const sunSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  if (t) {
    t.innerHTML = d === 'dark' ? sunSVG : moonSVG;
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      t.innerHTML = d === 'dark' ? sunSVG : moonSVG;
    });
  }
})();

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'preview') updatePreview();
  });
});

function syncDescriptionValues() {
  const fields = [
    ['crm-score', 'crm-score-value'],
    ['crm-result', 'crm-result-value'],
    ['crm-is_chronic', 'crm-is_chronic-value'],
    ['crm-failed_treatment', 'crm-failed_treatment-value'],
    ['crm-source', 'crm-source-value'],
    ['crm-answers_json', 'crm-answers_json-value']
  ];

  fields.forEach(([sourceId, targetId]) => {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    if (source && target) {
      target.textContent = source.value || source.placeholder || '—';
    }
  });
}

async function loadEditorGuide() {
  const guidePanel = document.getElementById('guidePanel');
  const guideContent = document.getElementById('guideContent');
  if (!guidePanel || !guideContent) return;

  try {
    const response = await fetch('../QUIZ_GUIDE.md');
    if (!response.ok) throw new Error('Guide file not found');
    const text = await response.text();
    guideContent.textContent = text;
    guidePanel.hidden = false;
    guidePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    guideContent.textContent = 'Не удалось загрузить описание редактора. Проверьте файл QUIZ_GUIDE.md в корне проекта.';
    guidePanel.hidden = false;
  }
}

const openGuideBtn = document.getElementById('openGuideBtn');
if (openGuideBtn) {
  openGuideBtn.addEventListener('click', loadEditorGuide);
}

const closeGuideBtn = document.getElementById('closeGuideBtn');
if (closeGuideBtn) {
  closeGuideBtn.addEventListener('click', () => {
    const panel = document.getElementById('guidePanel');
    if (panel) panel.hidden = true;
  });
}

const crmValuesSyncObserver = new MutationObserver(() => {
  syncDescriptionValues();
});

const crmFieldsTarget = document.getElementById('tab-crm');
if (crmFieldsTarget) {
  crmValuesSyncObserver.observe(crmFieldsTarget, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

syncDescriptionValues();

// ---------- LOAD JSON ----------
document.getElementById('loadJsonBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      loadFromObject(data);
    } catch {
      alert('Ошибка парсинга JSON файла');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Функция для рендеринга CTA кнопок (должна быть ДО loadFromObject)
function renderCtaButtons(level, count, existingCta) {
  const container = document.getElementById(`cta-${level}-container`);
  if (!container) return;
  
  // Установить активную кнопку количества
  const card = document.querySelector(`.scoring-card[data-level="${level}"]`);
  if (card) {
    card.querySelectorAll('.btn-count').forEach(btn => btn.classList.remove('active'));
    card.querySelector(`.btn-count[data-count="${count}"]`)?.classList.add('active');
    card.dataset.ctaCount = count;
  }
  
  // Очистить контейнер
  container.innerHTML = '';
  
  // Рендерить поля для каждой кнопки
  for (let i = 0; i < count; i++) {
    const cta = existingCta?.[i];
    const text = (typeof cta === 'object' && cta?.text) ? cta.text : (typeof cta === 'string' ? cta : '');
    const url = (typeof cta === 'object' && cta?.url) ? cta.url : '';
    
    const row = document.createElement('div');
    row.className = 'cta-button-row';
    row.dataset.ctaIndex = i;
    row.innerHTML = `
      <div class="field-group">
        <label class="field-label">Текст кнопки ${i + 1}</label>
        <input 
          class="field-input cta-text" 
          type="text" 
          placeholder="Например: Читать статью"
          value="${text}"
          data-level="${level}"
          data-index="${i}"
        />
      </div>
      <div class="field-group">
        <label class="field-label">URL действия ${i + 1}</label>
        <input 
          class="field-input cta-url" 
          type="url" 
          placeholder="https://example.com"
          value="${url}"
          data-level="${level}"
          data-index="${i}"
        />
      </div>
    `;
    container.appendChild(row);
  }
}

function loadFromObject(data) {
  // Meta
  const m = data.meta || {};
  setVal('meta-title', m.title || '');
  setVal('meta-subtitle', m.subtitle || '');
  setVal('meta-cta_start', m.cta_start || '');
  setVal('meta-source_label', m.source_label || '');
  setVal('meta-email_title', m.email_title || '');
  setVal('meta-email_subtitle', m.email_subtitle || '');
  setVal('meta-email_fear', m.email_fear || '');
  setVal('meta-trust_badges', Array.isArray(m.trust_badges) ? m.trust_badges.join(', ') : (m.trust_badges || ''));

  // Scoring
  scoringLevels = normalizeScoring(data.scoring || {});
  renderScoringLevels();

  // CRM fields
  const c = data.crm_fields || {};
  setVal('crm-score', c.score || '');
  setVal('crm-result', c.result || '');
  setVal('crm-is_chronic', c.is_chronic || '');
  setVal('crm-failed_treatment', c.failed_treatment || '');
  setVal('crm-source', c.source || '');
  setVal('crm-answers_json', c.answers_json || '');

  // Questions
  questions = (data.questions || []).map(q => ({
    id: q.id || '',
    crm_field: q.crm_field || '',
    text: q.text || '',
    flag: q.flag || '',
    chronic_threshold: q.chronic_threshold,
    failed_treatment_value: q.failed_treatment_value || '',
    options: (q.options || []).map(o => ({ label: o.label || '', value: o.value || '', score: o.score ?? 0 }))
  }));
  renderAllQuestions();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function initFieldHelp() {
  const popover = document.getElementById('fieldHelpPopover');
  if (!popover) return;

  const helpMap = {
    'meta-title': {
      title: 'Главный заголовок квиза',
      text: 'Это текст, который видит пользователь на самом первом экране. Он задаёт общий смысл теста и должен сразу объяснять, зачем проходить опрос.',
      target: 'hero',
      preview: 'title'
    },
    'meta-subtitle': {
      title: 'Подзаголовок',
      text: 'Короткое пояснение про пользу от прохождения: что получит пользователь в итоге, сколько времени займёт и зачем это нужно.',
      target: 'hero',
      preview: 'subtitle'
    },
    'meta-cta_start': {
      title: 'Кнопка старта',
      text: 'Текст на кнопке запуска квиза. Обычно это короткий призыв вроде «Пройти тест» или «Проверить состояние».',
      target: 'cta',
      preview: 'cta'
    },
    'meta-source_label': {
      title: 'Метка источника в CRM',
      text: 'Эта надпись отмечает, откуда пришёл лид и какой вариант квиза был запущен. В Bitrix она обычно хранится как название источника или кампании.',
      target: 'hero',
      preview: 'source'
    },
    'meta-email_title': {
      title: 'Заголовок экрана email',
      text: 'Сообщение перед формой email. Оно объясняет, почему стоит оставить контакты, чтобы получить результат и рекомендации.',
      target: 'hero',
      preview: 'email-title'
    },
    'meta-email_subtitle': {
      title: 'Подзаголовок экрана email',
      text: 'Дополнительное пояснение к запросу email. Оно снижает тревожность и делает мотивацию более понятной.',
      target: 'hero',
      preview: 'email-subtitle'
    },
    'meta-email_fear': {
      title: 'Fear-фраза',
      text: 'Фраза-мотиватор, которая усиливает ценность результата и помогает пользователю понять важность получения рекомендаций.',
      target: 'hero',
      preview: 'fear'
    },
    'meta-trust_badges': {
      title: 'Метки доверия',
      text: 'Список коротких тезисов под заголовком: «Без регистрации», «Анонимно», «Основано на опыте врачей» и т.п. Они повышают доверие к квизу.',
      target: 'hero',
      preview: 'badges'
    },
    'q-text': {
      title: 'Текст вопроса',
      text: 'Формулировка, которую видит пользователь в интерфейсе квиза. Важно, чтобы вопрос был понятным, конкретным и без двусмысленностей.',
      target: 'question'
    },
    'q-id': {
      title: 'ID вопроса',
      text: 'Внутренний идентификатор вопроса. Он используется в JSON, в логике подсчёта и в маппинге на CRM-поля. Пользователю не показывается.',
      target: 'data'
    },
    'q-crm-select': {
      title: 'CRM-поле ответа',
      text: 'Это Bitrix-значение, в которое сохраняется выбор пользователя для данного вопроса. Каждый вопрос обычно связан с отдельным UF_CRM_... полем.',
      target: 'field'
    },
    'q-flag': {
      title: 'Флаг условия',
      text: 'Автоматически ставит диагностический маркер по ответу: например, хроническая боль или отсутствие эффекта от лечения.',
      target: 'logic'
    },
    'q-flag-param': {
      title: 'Параметр флага',
      text: 'Значение для сравнения: порог индекса или конкретный ответ, при котором срабатывает условный флаг. Например, «более 6 месяцев» или «no_result».',
      target: 'logic'
    },
    'crm-score': {
      title: 'Итоговый балл',
      text: 'Числовой итог score по всем ответам пользователя. Это число используется для выбора уровня результата: low / medium / high.',
      target: 'data'
    },
    'crm-result': {
      title: 'Текст результата',
      text: 'CRM-поле, в которое отправляется итоговый заголовок выбранного уровня: например «Боль требует внимания» или «Рекомендуем обратиться к специалисту».',
      target: 'cta'
    },
    'crm-is_chronic': {
      title: 'Флаг «хроническая боль»',
      text: 'Булевый флаг Y/N. Он автоматически ставится, если условие по вопросу сработало: например, боль длится долго или индекс выше порога.',
      target: 'logic'
    },
    'crm-failed_treatment': {
      title: 'Флаг «неуспешное лечение»',
      text: 'Булевый флаг Y/N. Он сигнализирует, что пользователь уже обращался за помощью, но лечение не дало результата.',
      target: 'logic'
    },
    'crm-source': {
      title: 'Источник лида',
      text: 'Код или метка, откуда пришёл пользователь: тип квиза, источник трафика, канал или конкретная кампания.',
      target: 'data'
    },
    'crm-answers_json': {
      title: 'JSON ответов квиза',
      text: 'один JSON со всеми ответами пользователя. Он нужен для аналитики, отладки и дальнейшей обработки в CRM без потери структуры ответов.',
      target: 'data'
    }
  };

  const labels = document.querySelectorAll('[data-help-id]');
  labels.forEach((label) => {
    const helper = document.createElement('button');
    helper.type = 'button';
    helper.className = 'field-help-btn';
    helper.setAttribute('aria-label', 'Показать подсказку');
    helper.textContent = '?';
    helper.addEventListener('mouseenter', (event) => showFieldHelp(event, label.dataset.helpId));
    helper.addEventListener('focus', (event) => showFieldHelp(event, label.dataset.helpId));
    helper.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = label.dataset.helpId;
      if (popover.dataset.active === id && popover.classList.contains('is-visible')) {
        hideFieldHelp();
        return;
      }
      showFieldHelp(event, id);
    });
    label.appendChild(helper);
  });

  function showFieldHelp(event, key) {
    const config = helpMap[key] || { title: 'Подсказка', text: 'Описание будет добавлено позже.', target: 'field' };
    const previewVariant = config.preview || config.target || 'field';
    const previewMarkup = (() => {
      switch (previewVariant) {
        case 'title':
          return `
            <div class="field-help-real field-help-real-hero">
              <div class="field-help-real-topbar"><span>painhelp</span><span>start</span></div>
              <div class="field-help-real-progress"><span></span></div>
              <div class="field-help-real-card">
                <div class="field-help-real-badges">
                  <span class="field-help-real-badge">Без регистрации</span>
                  <span class="field-help-real-badge">Анонимно</span>
                </div>
                <div class="field-help-real-title target"></div>
                <div class="field-help-real-subtitle"></div>
                <div class="field-help-real-subtitle short"></div>
                <div class="field-help-real-button target"></div>
              </div>
              <div class="field-help-real-context">заголовок / старт</div>
            </div>
          `;
        case 'subtitle':
          return `
            <div class="field-help-real field-help-real-hero">
              <div class="field-help-real-topbar"><span>painhelp</span><span>start</span></div>
              <div class="field-help-real-progress"><span></span></div>
              <div class="field-help-real-card">
                <div class="field-help-real-badges">
                  <span class="field-help-real-badge">Без регистрации</span>
                  <span class="field-help-real-badge">Анонимно</span>
                </div>
                <div class="field-help-real-title"></div>
                <div class="field-help-real-subtitle target longer"></div>
                <div class="field-help-real-subtitle short"></div>
                <div class="field-help-real-button"></div>
              </div>
              <div class="field-help-real-context">подзаголовок</div>
            </div>
          `;
        case 'source':
          return `
            <div class="field-help-real field-help-real-hero">
              <div class="field-help-real-topbar"><span>painhelp</span><span>source</span></div>
              <div class="field-help-real-progress"><span></span></div>
              <div class="field-help-real-card">
                <div class="field-help-real-badges">
                  <span class="field-help-real-badge target">utm_pain_01</span>
                  <span class="field-help-real-badge">organic</span>
                </div>
                <div class="field-help-real-title"></div>
                <div class="field-help-real-subtitle"></div>
                <div class="field-help-real-subtitle short"></div>
                <div class="field-help-real-button"></div>
              </div>
              <div class="field-help-real-context">метка в CRM</div>
            </div>
          `;
        case 'cta':
          return `
            <div class="field-help-real field-help-real-result">
              <div class="field-help-real-topbar"><span>painhelp</span><span>result</span></div>
              <div class="field-help-real-progress"><span style="width:100%"></span></div>
              <div class="field-help-real-card result-card">
                <div class="field-help-real-badge tiny"></div>
                <div class="field-help-real-title small"></div>
                <div class="field-help-real-subtitle longer"></div>
                <div class="field-help-real-subtitle"></div>
                <div class="field-help-real-cta-row">
                  <div class="field-help-real-button target"></div>
                  <div class="field-help-real-button secondary"></div>
                </div>
              </div>
              <div class="field-help-real-context">кнопка старта / CTA</div>
            </div>
          `;
        case 'email-title':
          return `
            <div class="field-help-real field-help-real-form">
              <div class="field-help-real-topbar"><span>painhelp</span><span>email</span></div>
              <div class="field-help-real-card form-card">
                <div class="field-help-real-email-icon"></div>
                <div class="field-help-real-title small target"></div>
                <div class="field-help-real-subtitle longer"></div>
                <div class="field-help-real-field"></div>
                <div class="field-help-real-helper"></div>
                <div class="field-help-real-button footer"></div>
              </div>
              <div class="field-help-real-context">заголовок email</div>
            </div>
          `;
        case 'email-subtitle':
          return `
            <div class="field-help-real field-help-real-form">
              <div class="field-help-real-topbar"><span>painhelp</span><span>email</span></div>
              <div class="field-help-real-card form-card">
                <div class="field-help-real-email-icon"></div>
                <div class="field-help-real-label"></div>
                <div class="field-help-real-subtitle longer target"></div>
                <div class="field-help-real-field"></div>
                <div class="field-help-real-helper"></div>
                <div class="field-help-real-button footer"></div>
              </div>
              <div class="field-help-real-context">подтекст email</div>
            </div>
          `;
        case 'fear':
          return `
            <div class="field-help-real field-help-real-form">
              <div class="field-help-real-topbar"><span>painhelp</span><span>email</span></div>
              <div class="field-help-real-card form-card">
                <div class="field-help-real-email-icon"></div>
                <div class="field-help-real-label"></div>
                <div class="field-help-real-field target"></div>
                <div class="field-help-real-helper target"></div>
                <div class="field-help-real-checkbox-row">
                  <span class="field-help-real-checkbox"></span>
                  <span class="field-help-real-checkbox-label"></span>
                </div>
                <div class="field-help-real-button footer"></div>
              </div>
              <div class="field-help-real-context">fear-фраза</div>
            </div>
          `;
        case 'badges':
          return `
            <div class="field-help-real field-help-real-hero">
              <div class="field-help-real-topbar"><span>painhelp</span><span>trust</span></div>
              <div class="field-help-real-progress"><span></span></div>
              <div class="field-help-real-card">
                <div class="field-help-real-badges">
                  <span class="field-help-real-badge target">Без регистрации</span>
                  <span class="field-help-real-badge target">Анонимно</span>
                  <span class="field-help-real-badge target">Проверено врачами</span>
                </div>
                <div class="field-help-real-title"></div>
                <div class="field-help-real-subtitle"></div>
                <div class="field-help-real-subtitle short"></div>
                <div class="field-help-real-button"></div>
              </div>
              <div class="field-help-real-context">метки доверия</div>
            </div>
          `;
        case 'question':
          return `
            <div class="field-help-real field-help-real-question">
              <div class="field-help-real-topbar"><span>painhelp</span><span>step 2/5</span></div>
              <div class="field-help-real-progress"><span style="width:40%"></span></div>
              <div class="field-help-real-card question-card">
                <div class="field-help-real-label"></div>
                <div class="field-help-real-question-title target"></div>
                <div class="field-help-real-option selected target"></div>
                <div class="field-help-real-option"></div>
                <div class="field-help-real-option"></div>
              </div>
              <div class="field-help-real-context">выше / ниже</div>
            </div>
          `;
        case 'logic':
          return `
            <div class="field-help-real field-help-real-logic">
              <div class="field-help-real-topbar"><span>painhelp</span><span>logic</span></div>
              <div class="field-help-real-card logic-card">
                <div class="field-help-real-rule target">if score ≥ 7</div>
                <div class="field-help-real-rule-row">
                  <span class="field-help-real-rule-line"></span>
                  <span class="field-help-real-rule-line short"></span>
                </div>
                <div class="field-help-real-rule-line short"></div>
              </div>
              <div class="field-help-real-context">рядом с вопросом</div>
            </div>
          `;
        case 'data':
          return `
            <div class="field-help-real field-help-real-data">
              <div class="field-help-real-topbar"><span>painhelp</span><span>json</span></div>
              <div class="field-help-real-card data-card">
                <div class="field-help-real-json-header"></div>
                <div class="field-help-real-json-line"></div>
                <div class="field-help-real-json-line short"></div>
                <div class="field-help-real-json-line"></div>
                <div class="field-help-real-json-line short"></div>
              </div>
              <div class="field-help-real-context">внутри логики</div>
            </div>
          `;
        case 'field':
        default:
          return `
            <div class="field-help-real field-help-real-form">
              <div class="field-help-real-topbar"><span>painhelp</span><span>email</span></div>
              <div class="field-help-real-card form-card">
                <div class="field-help-real-email-icon"></div>
                <div class="field-help-real-label"></div>
                <div class="field-help-real-field target"></div>
                <div class="field-help-real-helper"></div>
                <div class="field-help-real-checkbox-row">
                  <span class="field-help-real-checkbox"></span>
                  <span class="field-help-real-checkbox-label"></span>
                </div>
                <div class="field-help-real-button footer"></div>
              </div>
              <div class="field-help-real-context">выше / ниже / рядом</div>
            </div>
          `;
      }
    })();

    popover.innerHTML = `
      <div class="field-help-preview">
        <div class="field-help-phone">
          ${previewMarkup}
        </div>
      </div>
      <div class="field-help-copy">
        <strong>${config.title}</strong>
        ${config.text}
      </div>
    `;

    const rect = (event.target || event.currentTarget || document.body).getBoundingClientRect();
    const width = popover.offsetWidth || 330;
    const height = popover.offsetHeight || 280;
    const left = Math.min(window.innerWidth - width - 12, rect.left + 18);
    const top = Math.min(Math.max(12, rect.bottom + 12), window.innerHeight - height - 12);
    popover.style.left = `${Math.max(12, left)}px`;
    popover.style.top = `${Math.max(12, top)}px`;
    popover.dataset.active = key;
    popover.classList.add('is-visible');
  }

  function hideFieldHelp() {
    popover.classList.remove('is-visible');
    delete popover.dataset.active;
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.field-help-btn') && !event.target.closest('.field-help-popover')) {
      hideFieldHelp();
    }
  });

  document.addEventListener('mouseleave', (event) => {
    if (event.target && event.target.classList && event.target.classList.contains('field-help-btn')) {
      hideFieldHelp();
    }
  });
}

// ---------- QUESTIONS RENDER ----------
const questionsList = document.getElementById('questions-list');
const questionTemplate = document.getElementById('question-template');
const optionTemplate = document.getElementById('option-template');

// ---------- DRAG STATE ----------
let dragSrcIdx = null;       // вопрос
let optDragSrc = null;       // { qIdx, oIdx, el }

function renderAllQuestions() {
  questionsList.innerHTML = '';
  questions.forEach((_, i) => renderQuestion(i));
  // Mark boundary cards for CSS
  const cards = questionsList.querySelectorAll('.question-card');
  cards.forEach((c, i) => {
    c.dataset.first = i === 0 ? 'true' : 'false';
    c.dataset.last  = i === cards.length - 1 ? 'true' : 'false';
  });
  initQuestionDnD();
}

function getUsedTemplateCrmFields(excludeIndex = null) {
  const used = new Set();
  questions.forEach((q, i) => {
    if (i === excludeIndex) return;
    const value = String(q.crm_field || '').trim();
    if (value && TEMPLATE_CRM_FIELDS.some(field => field.value === value)) {
      used.add(value);
    }
  });
  return used;
}

function getCrmFieldOptions(currentValue, excludeIndex = null) {
  const used = getUsedTemplateCrmFields(excludeIndex);
  const options = [{ label: '— не указано —', value: '' }];

  TEMPLATE_CRM_FIELDS.forEach(field => {
    const isUsedByAnotherQuestion = used.has(field.value) && field.value !== (currentValue || '');
    options.push({
      label: field.label,
      value: field.value,
      disabled: isUsedByAnotherQuestion
    });
  });

  return options;
}

function renderQuestion(idx) {
  const q = questions[idx];
  const clone = questionTemplate.content.cloneNode(true);
  const card = clone.querySelector('.question-card');
  card.dataset.qIndex = idx;
  card.querySelector('.question-num').textContent = `Вопрос ${idx + 1}`;

  // Bind fields
  const qText  = card.querySelector('.q-text');
  const qId    = card.querySelector('.q-id');
  const qCrmSelect = card.querySelector('.q-crm-select');
  const qFlag  = card.querySelector('.q-flag');
  const flagParamWrap  = card.querySelector('.q-flag-param-wrap');
  const flagParamLabel = card.querySelector('.q-flag-param-label');
  const flagParam      = card.querySelector('.q-flag-param');
  const flagParamHint  = card.querySelector('.q-flag-param-hint');

  qText.value  = q.text || '';
  qId.value    = q.id || '';
  qFlag.value  = q.flag || '';

  const selectedValue = String(q.crm_field || '').trim();
  qCrmSelect.innerHTML = '';
  getCrmFieldOptions(selectedValue, idx).forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    opt.disabled = Boolean(option.disabled);
    qCrmSelect.appendChild(opt);
  });

  qCrmSelect.value = selectedValue || '';

  qCrmSelect.addEventListener('change', () => {
    questions[idx].crm_field = qCrmSelect.value;
  });

  function applyFlagUI(flagVal) {
    if (flagVal === 'chronic_if_gte_index') {
      flagParamWrap.style.display = 'flex';
      flagParamLabel.textContent = 'Порог индекса';
      flagParam.value = q.chronic_threshold ?? '';
      flagParamHint.textContent = 'Флаг ставится если индекс выбранного варианта ≥ этого значения';
    } else if (flagVal === 'failed_treatment_if_value') {
      flagParamWrap.style.display = 'flex';
      flagParamLabel.textContent = 'Значение ответа';
      flagParam.value = q.failed_treatment_value || '';
      flagParamHint.textContent = 'Флаг ставится если value ответа совпадает с этим значением';
    } else {
      flagParamWrap.style.display = 'none';
    }
  }
  applyFlagUI(q.flag || '');

  // Live updates
  qText.addEventListener('input', () => { questions[idx].text = qText.value; });
  qId.addEventListener('input',   () => { questions[idx].id = qId.value; });
  qFlag.addEventListener('change', () => {
    const fv = qFlag.value;
    questions[idx].flag = fv;
    if (fv === 'chronic_if_gte_index') {
      delete questions[idx].failed_treatment_value;
    } else if (fv === 'failed_treatment_if_value') {
      delete questions[idx].chronic_threshold;
    } else {
      delete questions[idx].chronic_threshold;
      delete questions[idx].failed_treatment_value;
    }
    applyFlagUI(fv);
  });
  flagParam.addEventListener('input', () => {
    const fv = questions[idx].flag;
    if (fv === 'chronic_if_gte_index') {
      questions[idx].chronic_threshold = parseInt(flagParam.value) || 0;
    } else if (fv === 'failed_treatment_if_value') {
      questions[idx].failed_treatment_value = flagParam.value;
    }
  });

  // Collapse
  card.querySelector('.btn-collapse').addEventListener('click', () => card.classList.toggle('collapsed'));

  // Move up / down
  card.querySelector('.btn-move-up').addEventListener('click', () => {
    if (idx === 0) return;
    syncDomToState();
    [questions[idx - 1], questions[idx]] = [questions[idx], questions[idx - 1]];
    renderAllQuestions();
    // scroll to moved card
    const cards = questionsList.querySelectorAll('.question-card');
    cards[idx - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  card.querySelector('.btn-move-down').addEventListener('click', () => {
    if (idx === questions.length - 1) return;
    syncDomToState();
    [questions[idx], questions[idx + 1]] = [questions[idx + 1], questions[idx]];
    renderAllQuestions();
    const cards = questionsList.querySelectorAll('.question-card');
    cards[idx + 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Duplicate question
  card.querySelector('.btn-duplicate-q').addEventListener('click', () => {
    syncDomToState();
    const copy = JSON.parse(JSON.stringify(questions[idx]));
    // Make ID unique
    copy.id = copy.id ? copy.id + '_copy' : `question_${questions.length + 1}`;
    questions.splice(idx + 1, 0, copy);
    renderAllQuestions();
    // Scroll to the new card
    const cards = questionsList.querySelectorAll('.question-card');
    cards[idx + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Delete question
  card.querySelector('.btn-delete-q').addEventListener('click', () => {
    if (confirm(`Удалить вопрос ${idx + 1}?`)) {
      syncDomToState();
      questions.splice(idx, 1);
      renderAllQuestions();
    }
  });

  // Options
  const optList = card.querySelector('.options-list');
  q.options.forEach((opt, oi) => addOptionRow(optList, idx, oi, opt));

  // Add option button
  card.querySelector('.add-option-btn').addEventListener('click', () => {
    questions[idx].options.push({ label: '', value: '', score: 0 });
    const oi = questions[idx].options.length - 1;
    addOptionRow(optList, idx, oi, questions[idx].options[oi]);
  });

  questionsList.appendChild(clone);
}

// ---------- QUESTION DRAG-AND-DROP ----------
function initQuestionDnD() {
  const cards = questionsList.querySelectorAll('.question-card');

  cards.forEach((card) => {
    const handle = card.querySelector('.question-drag');
    card.setAttribute('draggable', 'false'); // drag only via handle

    handle.addEventListener('mousedown', () => {
      card.setAttribute('draggable', 'true');
    });
    handle.addEventListener('mouseup', () => {
      card.setAttribute('draggable', 'false');
    });

    card.addEventListener('dragstart', (e) => {
      dragSrcIdx = parseInt(card.dataset.qIndex);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragSrcIdx);
    });

    card.addEventListener('dragend', () => {
      card.setAttribute('draggable', 'false');
      card.classList.remove('dragging');
      questionsList.querySelectorAll('.question-card').forEach(c => c.classList.remove('drag-over'));
      dragSrcIdx = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const overIdx = parseInt(card.dataset.qIndex);
      if (dragSrcIdx !== null && overIdx !== dragSrcIdx) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const overIdx = parseInt(card.dataset.qIndex);
      if (dragSrcIdx === null || dragSrcIdx === overIdx) return;

      // Sync DOM values → state before reorder
      syncDomToState();

      // Reorder
      const moved = questions.splice(dragSrcIdx, 1)[0];
      questions.splice(overIdx, 0, moved);
      dragSrcIdx = null;
      renderAllQuestions();
    });
  });
}

// Sync all DOM field values back to questions[] state
function syncDomToState() {
  document.querySelectorAll('.question-card').forEach((card, idx) => {
    if (!questions[idx]) return;
    const q = questions[idx];
    q.text      = card.querySelector('.q-text')?.value ?? q.text;
    q.id        = card.querySelector('.q-id')?.value ?? q.id;
    const crtSelect = card.querySelector('.q-crm-select');
    q.crm_field = crtSelect?.value || q.crm_field;
    const flagEl = card.querySelector('.q-flag');
    if (flagEl) q.flag = flagEl.value;
    const flagParam = card.querySelector('.q-flag-param');
    if (flagParam && q.flag === 'chronic_if_gte_index') {
      q.chronic_threshold = parseInt(flagParam.value) || 0;
    } else if (flagParam && q.flag === 'failed_treatment_if_value') {
      q.failed_treatment_value = flagParam.value;
    }
    card.querySelectorAll('.option-row').forEach((row, oi) => {
      if (!q.options[oi]) q.options[oi] = {};
      q.options[oi].label = row.querySelector('.opt-label')?.value || '';
      q.options[oi].value = row.querySelector('.opt-value')?.value || '';
      q.options[oi].score = parseInt(row.querySelector('.opt-score')?.value) || 0;
    });
  });
}

function addOptionRow(container, qIdx, oIdx, opt) {
  const clone = optionTemplate.content.cloneNode(true);
  const row = clone.querySelector('.option-row');

  const optLabel = row.querySelector('.opt-label');
  const optValue = row.querySelector('.opt-value');
  const optScore = row.querySelector('.opt-score');

  optLabel.value = opt.label || '';
  optValue.value = opt.value || '';
  optScore.value = opt.score ?? 0;

  optLabel.addEventListener('input', () => { questions[qIdx].options[oIdx].label = optLabel.value; });
  optValue.addEventListener('input', () => { questions[qIdx].options[oIdx].value = optValue.value; });
  optScore.addEventListener('input', () => { questions[qIdx].options[oIdx].score = parseInt(optScore.value) || 0; });

  row.querySelector('.btn-delete-opt').addEventListener('click', () => {
    syncDomToState();
    questions[qIdx].options.splice(oIdx, 1);
    renderAllQuestions();
  });

  // Duplicate option
  row.querySelector('.btn-duplicate-opt').addEventListener('click', (e) => {
    e.stopPropagation();
    syncDomToState();
    const copy = { ...questions[qIdx].options[oIdx] };
    questions[qIdx].options.splice(oIdx + 1, 0, copy);
    renderAllQuestions();
  });

  // Option move up / down
  row.querySelector('.btn-opt-up').addEventListener('click', (e) => {
    e.stopPropagation();
    if (oIdx === 0) return;
    syncDomToState();
    const opts = questions[qIdx].options;
    [opts[oIdx - 1], opts[oIdx]] = [opts[oIdx], opts[oIdx - 1]];
    renderAllQuestions();
  });
  row.querySelector('.btn-opt-down').addEventListener('click', (e) => {
    e.stopPropagation();
    if (oIdx === questions[qIdx].options.length - 1) return;
    syncDomToState();
    const opts = questions[qIdx].options;
    [opts[oIdx], opts[oIdx + 1]] = [opts[oIdx + 1], opts[oIdx]];
    renderAllQuestions();
  });

  // ---------- OPTION DRAG-AND-DROP ----------
  row.setAttribute('draggable', 'false');
  const optHandle = row.querySelector('.option-drag');

  optHandle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
  optHandle.addEventListener('mouseup',   () => row.setAttribute('draggable', 'false'));

  row.addEventListener('dragstart', (e) => {
    optDragSrc = { qIdx, oIdx, el: row };
    row.classList.add('dragging-opt');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', oIdx);
    e.stopPropagation(); // не запускать drag вопроса
  });

  row.addEventListener('dragend', () => {
    row.setAttribute('draggable', 'false');
    row.classList.remove('dragging-opt');
    container.querySelectorAll('.option-row').forEach(r => r.classList.remove('drag-over-opt'));
    optDragSrc = null;
  });

  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (optDragSrc && optDragSrc.qIdx === qIdx && optDragSrc.oIdx !== oIdx) {
      row.classList.add('drag-over-opt');
    }
  });

  row.addEventListener('dragleave', () => row.classList.remove('drag-over-opt'));

  row.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove('drag-over-opt');
    if (!optDragSrc || optDragSrc.qIdx !== qIdx || optDragSrc.oIdx === oIdx) return;

    syncDomToState();
    const moved = questions[qIdx].options.splice(optDragSrc.oIdx, 1)[0];
    questions[qIdx].options.splice(oIdx, 0, moved);
    optDragSrc = null;
    renderAllQuestions();
  });

  // Mark boundary rows
  row.dataset.first = oIdx === 0 ? 'true' : 'false';
  row.dataset.last  = oIdx === questions[qIdx].options.length - 1 ? 'true' : 'false';

  container.appendChild(clone);
}

// Add question button
document.getElementById('addQuestionBtn').addEventListener('click', () => {
  questions.push({
    id: `question_${questions.length + 1}`,
    crm_field: '',
    text: '',
    flag: '',
    options: [
      { label: '', value: '', score: 0 },
      { label: '', value: '', score: 0 }
    ]
  });
  renderAllQuestions();
  // Scroll to last
  const cards = document.querySelectorAll('.question-card');
  if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- BUILD JSON ----------
function buildJson() {
  const gv = id => (document.getElementById(id) || {}).value || '';

  syncDomToState();

  const getCtaFromDom = (level) => {
    const container = document.getElementById(`cta-${level}-container`);
    if (!container) return [];
    
    const cta = [];
    container.querySelectorAll('.cta-button-row').forEach(row => {
      const text = row.querySelector('.cta-text')?.value?.trim() || '';
      const url = row.querySelector('.cta-url')?.value?.trim() || '';
      if (text || url) {
        cta.push({ text, url });
      }
    });
    return cta;
  };

  const scoringOut = {};
  document.querySelectorAll('.scoring-card').forEach((card, idx) => {
    const levelId = card.dataset.level || `level_${idx + 1}`;
    const max = parseInt(card.querySelector('.score-max')?.value, 10);
    scoringOut[levelId] = {
      max: Number.isFinite(max) ? max : 0,
      title: card.querySelector('.score-title')?.value?.trim() || '',
      text: card.querySelector('.score-text')?.value?.trim() || '',
      cta: getCtaFromDom(levelId)
    };
  });

  const out = {
    meta: {
      title:          gv('meta-title'),
      subtitle:       gv('meta-subtitle'),
      trust_badges:   gv('meta-trust_badges').split(',').map(s => s.trim()).filter(Boolean),
      cta_start:      gv('meta-cta_start'),
      source_label:   gv('meta-source_label'),
      email_title:    gv('meta-email_title'),
      email_subtitle: gv('meta-email_subtitle'),
      email_fear:     gv('meta-email_fear')
    },
    questions: questions.map(q => {
      const obj = {
        id:        q.id,
        crm_field: q.crm_field,
        text:      q.text,
        options:   q.options.map(o => ({ label: o.label, value: o.value, score: o.score }))
      };
      if (q.flag) {
        obj.flag = q.flag;
        if (q.flag === 'chronic_if_gte_index' && q.chronic_threshold !== undefined) {
          obj.chronic_threshold = q.chronic_threshold;
        }
        if (q.flag === 'failed_treatment_if_value' && q.failed_treatment_value) {
          obj.failed_treatment_value = q.failed_treatment_value;
        }
      }
      return obj;
    }),
    scoring: scoringOut,
    crm_fields: {
      score:            gv('crm-score'),
      result:           gv('crm-result'),
      is_chronic:       gv('crm-is_chronic'),
      failed_treatment: gv('crm-failed_treatment'),
      source:           gv('crm-source'),
      answers_json:     gv('crm-answers_json')
    }
  };
  return out;
}

// ---------- PREVIEW ----------
function updatePreview() {
  const json = buildJson();
  document.getElementById('jsonPreview').textContent = JSON.stringify(json, null, 2);
}

// ---------- EXPORT ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  document.getElementById('exportModal').style.display = 'flex';
});
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('exportModal').style.display = 'none';
});
document.getElementById('exportModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

function downloadJson() {
  const json = buildJson();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'quiz.json'; a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('modalDownload').addEventListener('click', () => {
  downloadJson();
  document.getElementById('exportModal').style.display = 'none';
});
document.getElementById('downloadBtn').addEventListener('click', downloadJson);

document.getElementById('modalCopy').addEventListener('click', () => {
  const json = JSON.stringify(buildJson(), null, 2);
  navigator.clipboard.writeText(json).then(() => {
    document.getElementById('exportModal').style.display = 'none';
    showToast();
  });
});
document.getElementById('copyJsonBtn').addEventListener('click', () => {
  updatePreview();
  const txt = document.getElementById('jsonPreview').textContent;
  navigator.clipboard.writeText(txt).then(showToast);
});

document.getElementById('modalPreview').addEventListener('click', () => {
  document.getElementById('exportModal').style.display = 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="preview"]').classList.add('active');
  document.getElementById('tab-preview').classList.add('active');
  updatePreview();
});

function showToast() {
  const t = document.getElementById('copyToast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ---------- LOCALSTORAGE AUTOSAVE ----------
const LS_KEY = 'quiz_editor_state';

function saveToStorage() {
  try {
    const json = buildJson();
    localStorage.setItem(LS_KEY, JSON.stringify(json));
  } catch (e) { /* quota exceeded or private mode */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

// Debounced autosave — fires 800ms after last change
let saveTimer = null;

function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveToStorage(); showSaveIndicator(); }, 800);
}

// Listen to all input/change/click events in the main content area
const mainEl = document.querySelector('.app-main');
mainEl.addEventListener('input',  scheduleSave);
mainEl.addEventListener('change', scheduleSave);
mainEl.addEventListener('click',  (e) => {
  // Обработчик для кнопок количества CTA
  if (e.target.classList.contains('btn-count')) {
    const card = e.target.closest('.scoring-card');
    if (card) {
      const level = card.dataset.level;
      const count = parseInt(e.target.dataset.count);
      renderCtaButtons(level, count, []);
    }
  }
  if (e.target.id === 'addScoringLevelBtn') {
    scoringLevels.push({ id: nextScoringLevelId(), max: 99, title: '', text: '', cta: [] });
    renderScoringLevels();
  }
  if (e.target.classList.contains('remove-scoring-level')) {
    const card = e.target.closest('.scoring-card');
    if (card) {
      const level = card.dataset.level;
      scoringLevels = scoringLevels.filter(l => l.id !== level);
      renderScoringLevels();
    }
  }
  scheduleSave();
});

// Кнопка сброса
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Сбросить к демо-квизу? Текущие данные будут потеряны.')) {
    localStorage.removeItem(LS_KEY);
    loadFromObject(DEFAULT_JSON);
    // Переключаемся на вкладку Мета чтобы были видны изменения
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="meta"]').classList.add('active');
    document.getElementById('tab-meta').classList.add('active');
    // Сохраняем новое состояние сразу чтобы дебаунс не спас старое
    saveToStorage();
    showSaveIndicator();
  }
});

// ---------- INIT: load from sessionStorage or localStorage or default ----------
// Сначала проверяем sessionStorage (загрузка из quiz-handler)
console.log("[EDITOR] Initializing...");
let loadedData = loadFromSessionStorage();
console.log("[EDITOR] Loaded from external:", !!loadedData);

// Если нет, пробуем localStorage
if (!loadedData) {
  loadedData = loadFromStorage();
  console.log("[EDITOR] Loaded from localStorage:", !!loadedData);
}

// ===== ИНИЦИАЛИЗАЦИЯ АВТОРИЗАЦИИ =====
initAuthScreen();

// ============================================================
// QUIZ PREVIEW ENGINE
// ============================================================
(function () {
  const screen = document.getElementById('qpScreen');
  const restartBtn = document.getElementById('qpRestartBtn');
  if (!screen) return;

  // State
  let qp = {}; // snapshot of quiz data
  let step = 'start'; // 'start' | 0..N-1 | 'email' | 'result'
  let answers = []; // { qIdx, optIdx, score, value, label }
  let totalScore = 0;
  let isChronicFlag = false;
  let failedTreatmentFlag = false;

  function getSortedScoringEntries(scoring) {
    return normalizeScoring(scoring || {});
  }

  function resolvePreviewLevel(score, scoring) {
    const levels = getSortedScoringEntries(scoring);
    let chosen = levels[levels.length - 1] || { id: 'high', max: 99, title: '', text: '', cta: [] };
    for (const lvl of levels) {
      if (score <= lvl.max) {
        chosen = lvl;
        break;
      }
    }
    const idx = levels.findIndex(l => l.id === chosen.id);
    return { level: chosen, tone: scoringToneByIndex(idx < 0 ? levels.length - 1 : idx, levels.length) };
  }

  // Render fresh every time the tab is opened
  document.querySelector('[data-tab="quizpreview"]').addEventListener('click', () => {
    startPreview();
  });
  restartBtn.addEventListener('click', startPreview);

  function startPreview() {
    syncDomToState();
    qp = buildJson();
    step = 'start';
    answers = [];
    totalScore = 0;
    isChronicFlag = false;
    failedTreatmentFlag = false;
    if (!qp.questions || qp.questions.length === 0) {
      screen.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;padding:2rem">Добавьте хотя бы один вопрос во вкладке «Вопросы»</div>`;
      return;
    }
    render();
  }

  function render() {
    screen.innerHTML = '';
    if (step === 'start')       renderStart();
    else if (step === 'email')  renderEmail();
    else if (step === 'result') renderResult();
    else                        renderQuestion(step);
  }

  // ---- START SCREEN ----
  function renderStart() {
    const m = qp.meta || {};
    const badges = (m.trust_badges || []).map(b =>
      `<span class="qp-badge">${esc(b)}</span>`
    ).join('');

    screen.innerHTML = `
      <div class="qp-start">
        <div class="qp-badges">${badges}</div>
        <div class="qp-start-title">${esc(m.title || 'Квиз')}</div>
        <div class="qp-start-sub">${esc(m.subtitle || '')}</div>
        <button class="qp-btn-start" id="qpBtnStart">${esc(m.cta_start || 'Начать')}</button>
      </div>`;

    document.getElementById('qpBtnStart').addEventListener('click', () => {
      if (!qp.questions || !qp.questions.length) return;
      step = 0;
      render();
    });
  }

  // ---- QUESTION SCREEN ----
  function renderQuestion(idx) {
    const q = qp.questions[idx];
    const total = qp.questions.length;
    const pct = Math.round((idx / total) * 100);

    const optionsHtml = (q.options || []).map((opt, oi) => {
      const sel = answers[idx] && answers[idx].optIdx === oi ? 'selected' : '';
      return `<button class="qp-option ${sel}" data-oi="${oi}">${esc(opt.label)}</button>`;
    }).join('');

    screen.innerHTML = `
      <div class="qp-question">
        <div class="qp-progress-wrap">
          <div class="qp-progress-label">Вопрос ${idx + 1} из ${total}</div>
          <div class="qp-progress-bar"><div class="qp-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="qp-q-text">${esc(q.text)}</div>
        <div class="qp-options" id="qpOpts">${optionsHtml}</div>
      </div>`;

    document.getElementById('qpOpts').addEventListener('click', e => {
      const btn = e.target.closest('.qp-option');
      if (!btn) return;
      const oi = parseInt(btn.dataset.oi);
      const opt = q.options[oi];

      // Record answer
      answers[idx] = { qIdx: idx, optIdx: oi, score: opt.score ?? 0, value: opt.value, label: opt.label };

      // Check flags
      if (q.flag === 'chronic_if_gte_index') {
        isChronicFlag = isChronicFlag || (oi >= (q.chronic_threshold || 0));
      }
      if (q.flag === 'failed_treatment_if_value') {
        if (opt.value === q.failed_treatment_value) failedTreatmentFlag = true;
      }

      // Highlight and advance
      document.querySelectorAll('.qp-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      setTimeout(() => {
        // score=0 means disqualifying answer — skip to final immediately
        if ((opt.score ?? 0) === 0) {
          step = 'email';
        } else {
          const next = idx + 1;
          step = next < qp.questions.length ? next : 'email';
        }
        render();
      }, 320);
    });
  }

  // ---- EMAIL SCREEN ----
  function renderEmail() {
    const m = qp.meta || {};
    screen.innerHTML = `
      <div class="qp-email-screen">
        <div class="qp-email-title">${esc(m.email_title || 'Осталось немного')}</div>
        <div class="qp-email-sub">${esc(m.email_subtitle || '')}</div>
        ${m.email_fear ? `<div class="qp-email-fear">⚠️ ${esc(m.email_fear)}</div>` : ''}
        <div class="qp-contact-fields">
          <input type="text"  placeholder="Имя" id="qpName" />
          <input type="text"  placeholder="Фамилия" id="qpSurname" />
          <input type="text"  placeholder="Отчество" id="qpPatronymic" />
          <input type="email" placeholder="Email" id="qpEmail" />
          <input type="tel"   placeholder="Телефон" id="qpPhone" />
        </div>
        <button class="qp-btn-submit" id="qpSubmit">Получить результат</button>
      </div>`;

    document.getElementById('qpSubmit').addEventListener('click', () => {
      // Calculate score
      totalScore = answers.reduce((sum, a) => sum + (a ? a.score : 0), 0);
      step = 'result';
      render();
    });
  }

  // ---- RESULT SCREEN ----
  function renderResult() {
    const resolved = resolvePreviewLevel(totalScore, qp.scoring || {});
    const levelData = resolved.level || {};
    const tone = resolved.tone || 'high';
    const ctas = (levelData.cta || []).map(c => {
      const text = (typeof c === 'object' && c?.text) ? c.text : c;
      return `<button class="qp-cta-btn">${esc(text)}</button>`;
    }).join('');

    // Flags display
    const flagChips = [];
    if (isChronicFlag)       flagChips.push('✅ Хронический флаг');
    if (failedTreatmentFlag) flagChips.push('⚠️ Неудачное лечение');
    const flagsHtml = flagChips.length
      ? `<div class="qp-flags">${flagChips.map(f => `<span class="qp-flag-chip">${f}</span>`).join('')}</div>`
      : '';

    screen.innerHTML = `
      <div class="qp-result">
        <div class="qp-result-score-ring ${tone}-ring">
          <span class="qp-score-num ${tone}">${totalScore}</span>
          <span class="qp-score-label">баллов</span>
        </div>
        <div class="qp-result-title">${esc(levelData.title || '')}</div>
        <div class="qp-result-text">${esc(levelData.text || '')}</div>
        <div class="qp-result-ctas">${ctas}</div>
        ${flagsHtml}
      </div>`;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
})();
