/* ============================================================
   QUIZ EDITOR — app.js
   Редактор JSON-квизов под Битрикс24
   ============================================================ */

// ---------- LOAD FROM EXTERNAL SOURCE ----------
function getLoadParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('load');
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

const DEFAULT_JSON = {
  meta: {
    title: "Проверьте свою боль за минуту",
    subtitle: "Ответьте на 5 вопросов и получите понимание, стоит ли обращаться к специалисту",
    trust_badges: ["Без регистрации", "Анонимно", "Основано на опыте врачей"],
    cta_start: "Пройти тест",
    webhook: "",
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
    source: "UF_CRM_1777993881"
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
    const text = (typeof cta === 'object' && cta?.text) ? cta.text : '';
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
  setVal('meta-webhook', m.webhook || '');
  setVal('meta-email_title', m.email_title || '');
  setVal('meta-email_subtitle', m.email_subtitle || '');
  setVal('meta-email_fear', m.email_fear || '');
  setVal('meta-trust_badges', Array.isArray(m.trust_badges) ? m.trust_badges.join(', ') : (m.trust_badges || ''));

  // Scoring
  const s = data.scoring || {};
  ['low','medium','high'].forEach(lvl => {
    const sc = s[lvl] || {};
    setVal(`score-${lvl}-max`, sc.max ?? '');
    setVal(`score-${lvl}-title`, sc.title || '');
    setVal(`score-${lvl}-text`, sc.text || '');
    
    // Обработать CTA: может быть массив объектов {text, url} или старый формат
    let cta = sc.cta || [];
    let ctaCount = 1;
    if (Array.isArray(cta)) {
      ctaCount = Math.min(Math.max(cta.length, 1), 3);
    }
    
    // Рендерить CTA элементы
    renderCtaButtons(lvl, ctaCount, cta);
  });

  // CRM fields
  const c = data.crm_fields || {};
  setVal('crm-score', c.score || '');
  setVal('crm-result', c.result || '');
  setVal('crm-is_chronic', c.is_chronic || '');
  setVal('crm-failed_treatment', c.failed_treatment || '');
  setVal('crm-source', c.source || '');

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

function renderQuestion(idx) {
  const q = questions[idx];
  const clone = questionTemplate.content.cloneNode(true);
  const card = clone.querySelector('.question-card');
  card.dataset.qIndex = idx;
  card.querySelector('.question-num').textContent = `Вопрос ${idx + 1}`;

  // Bind fields
  const qText  = card.querySelector('.q-text');
  const qId    = card.querySelector('.q-id');
  const qCrm   = card.querySelector('.q-crm');
  const qFlag  = card.querySelector('.q-flag');
  const flagParamWrap  = card.querySelector('.q-flag-param-wrap');
  const flagParamLabel = card.querySelector('.q-flag-param-label');
  const flagParam      = card.querySelector('.q-flag-param');
  const flagParamHint  = card.querySelector('.q-flag-param-hint');

  qText.value  = q.text || '';
  qId.value    = q.id || '';
  qCrm.value   = q.crm_field || '';
  qFlag.value  = q.flag || '';

  function applyFlagUI(flagVal) {
    if (flagVal === 'chronic_if_gte_index') {
      flagParamWrap.style.display = 'flex';
      flagParamLabel.textContent = 'Порог индекса (chronic_threshold)';
      flagParam.value = q.chronic_threshold ?? '';
      flagParamHint.textContent = 'Флаг ставится если индекс выбранного варианта ≥ этого значения';
    } else if (flagVal === 'failed_treatment_if_value') {
      flagParamWrap.style.display = 'flex';
      flagParamLabel.textContent = 'Значение ответа (failed_treatment_value)';
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
  qCrm.addEventListener('input',  () => { questions[idx].crm_field = qCrm.value; });
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
    q.crm_field = card.querySelector('.q-crm')?.value ?? q.crm_field;
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

  const out = {
    meta: {
      title:          gv('meta-title'),
      subtitle:       gv('meta-subtitle'),
      trust_badges:   gv('meta-trust_badges').split(',').map(s => s.trim()).filter(Boolean),
      cta_start:      gv('meta-cta_start'),
      webhook:        gv('meta-webhook'),
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
    scoring: {
      low: {
        max:   parseInt(gv('score-low-max')) || 0,
        title: gv('score-low-title'),
        text:  gv('score-low-text'),
        cta:   getCtaFromDom('low')
      },
      medium: {
        max:   parseInt(gv('score-medium-max')) || 0,
        title: gv('score-medium-title'),
        text:  gv('score-medium-text'),
        cta:   getCtaFromDom('medium')
      },
      high: {
        max:   parseInt(gv('score-high-max')) || 99,
        title: gv('score-high-title'),
        text:  gv('score-high-text'),
        cta:   getCtaFromDom('high')
      }
    },
    crm_fields: {
      score:            gv('crm-score'),
      result:           gv('crm-result'),
      is_chronic:       gv('crm-is_chronic'),
      failed_treatment: gv('crm-failed_treatment'),
      source:           gv('crm-source')
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

// Загружаем данные
console.log("[EDITOR] Using data:", loadedData ? "external/saved" : "default");
loadFromObject(loadedData || DEFAULT_JSON);

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
      answers[idx] = { qIdx: idx, optIdx: oi, score: opt.score || 0, value: opt.value, label: opt.label };

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
        const next = idx + 1;
        if (next < qp.questions.length) {
          step = next;
        } else {
          step = 'email';
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
    const sc = qp.scoring || {};
    let level = 'high';
    if (totalScore <= (sc.low?.max ?? 3))    level = 'low';
    else if (totalScore <= (sc.medium?.max ?? 7)) level = 'medium';

    const levelData = sc[level] || {};
    const ctas = (levelData.cta || []).map(c =>
      `<button class="qp-cta-btn">${esc(c)}</button>`
    ).join('');

    // Flags display
    const flagChips = [];
    if (isChronicFlag)       flagChips.push('✅ Хронический флаг');
    if (failedTreatmentFlag) flagChips.push('⚠️ Неудачное лечение');
    const flagsHtml = flagChips.length
      ? `<div class="qp-flags">${flagChips.map(f => `<span class="qp-flag-chip">${f}</span>`).join('')}</div>`
      : '';

    screen.innerHTML = `
      <div class="qp-result">
        <div class="qp-result-score-ring ${level}-ring">
          <span class="qp-score-num ${level}">${totalScore}</span>
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
