
# painhelp — Платформа квизов для Битрикс24

Статический фронтенд с движком квизов + визуальный конструктор для создания новых квизов.

---

## 📦 Компоненты

### 1. Движок квиза (`1st-pain-quiz-styled.html`)
- Однофайловое приложение (HTML + CSS + JS)
- Загружает сценарий из JSON
- Интеграция с Битрикс24 (webhook)
- Поддержка флагов и скоринга

**Использование:**
```bash
python3 -m http.server 8000
# Открыть http://localhost:8000/1st-pain-quiz-styled.html?quiz=pain-v1
```

### 2. Quiz Editor (`quiz-editor/`)
Визуальный конструктор для создания JSON-квизов без кода.

**Возможности:**
- ✅ Создание вопросов и вариантов ответов
- ✅ Настройка скоринга (3 уровня результатов)
- ✅ CRM-интеграция (привязка к полям Битрикс24)
- ✅ Специальные флаги (`is_chronic`, `failed_treatment`)
- ✅ Интерактивный предпросмотр
- ✅ Автосохранение в localStorage
- ✅ Экспорт готового JSON

**Файлы:**
- [`quiz-editor/index.html`](quiz-editor/index.html) — интерфейс
- [`quiz-editor/style.css`](quiz-editor/style.css) — стили
- [`quiz-editor/app.js`](quiz-editor/app.js) — логика
- [`quiz-editor/index.md`](quiz-editor/index.md) — полная документация

**Запуск локально:**
```bash
npx serve quiz-editor
# или
python3 -m http.server 8000 --directory quiz-editor
```

---

## 📚 Структура проекта

```
.
├── 1st-pain-quiz-styled.html    — основной обработчик квиза
├── scenarios/
│   └── pain-v1.json             — сценарий квиза про боль
├── quiz-editor/                 — конструктор квизов
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── index.md                 — документация
├── api/
│   └── lead.js                  — сервис отправки лидов
└── README.md                    — этот файл
```

---

## 🚀 Быстрый старт

### Создать новый квиз

1. Открыть `quiz-editor/index.html` (локально или на хостинге)
2. Заполнить метаданные (заголовок, вебхук Битрикс24)
3. Добавить вопросы и варианты ответов
4. Настроить скоринг
5. Указать CRM-поля
6. Скачать JSON → положить в `scenarios/`
7. Подключить в URL: `?quiz=название`

### Подключить квиз к Битрикс24

В редакторе страниц Битрикс24 Сайты:
```html
<iframe src="https://yourhost/1st-pain-quiz-styled.html?quiz=pain-v1" 
        width="100%" height="600" frameborder="0"></iframe>
```

---

## 🔧 Схема JSON-квиза

Полная спецификация в [`quiz-editor/index.md`](quiz-editor/index.md#схема-json-квиза).

```json
{
  "meta": {
    "title": "Заголовок",
    "subtitle": "Подзаголовок",
    "webhook": "https://xxx.bitrix24.ru/rest/.../crm.lead.add",
    "source_label": "Метка источника"
  },
  "questions": [...],
  "scoring": {...},
  "crm_fields": {...}
}
```

---

## 📖 Документация

- **Quiz Editor** — [`quiz-editor/index.md`](quiz-editor/index.md)
  - Архитектура редактора
  - Схема JSON и флаги
  - Интеграция с Битрикс24
  - Автосохранение и предпросмотр

---

## 🛠 Разработка

### Локальный сервер

```bash
# Любой статический сервер подойдёт
python3 -m http.server 8000
npx serve .
```

### Браузерная совместимость

Все компоненты используют:
- ES2020+ JavaScript (нативный)
- localStorage API
- HTML5 Drag & Drop
- Поддержка Chrome, Firefox, Safari, Edge (2020+)

---

## 📝 История изменений

===260601===
Удалось решитьзадачку отключением показа оболжки квиза (точнее пропуск и переход к первой карточке)
Что добавлено
Новый URL-параметр: skip_cover
Если в URL есть ?skip_cover=1 или ?skip_cover=true, то после загрузки сценария сразу запускается startQuiz() и открывается первая карточка.
Пример
Параметр распознаёт варианты 1, true, yes, on.


===260530===

решена проблема прозрчности фона при вызове popup в Битрикс24

в польз CSS основной/вызывающей страницы добавляем 

.fancybox-content,
.fancybox-iframe {
  background: transparent !important;
}

# painhelp --- ПроБоль
# ===260507-1===

## Исправлены ошибки в именах полей лидов

Готово! Обновлённый `pain-v1.json` с реальными именами полей.

## Что было исправлено

| Логическое имя | Реальное поле в Bitrix24 | Тип |
|---|---|---|
| QUIZ_SCORE | `UF_CRM_1777993552` | double |
| QUIZ_RESULT | `UF_CRM_1777993608` | string |
| PAIN_LOCATION | `UF_CRM_1777993643` | string |
| PAIN_DURATION | `UF_CRM_1777993660` | string |
| PAIN_INTENSITY | `UF_CRM_1777993688` | string |
| PAIN_IMPACT | `UF_CRM_1777993717` | string |
| DOCTOR_VISIT | `UF_CRM_1777993749` | string |
| IS_CHRONIC | `UF_CRM_1777993788` | boolean |
| FAILED_TREATMENT | `UF_CRM_1777993848` | boolean |
| SOURCE | `UF_CRM_1777993881` | string |

> `QUIZ_DATE` убран — такого поля в вашем Bitrix24 нет. Дату создания лида Bitrix24 фиксирует сам в `DATE_CREATE`.

Замените файл `scenarios/pain-v1.json` в репозитории и проверьте — теперь все поля должны заполняться.





# ===260507===


# сейчас все работает о лично. Теперь хотелось бы выделить сценарий квиза, чтобы в коде можно было заменить ссылку на файл-сценарий и не менять весь код

Отличная идея — разделить **данные** и **движок** квиза. Тогда для нового квиза достаточно создать новый JSON-файл со сценарием и поменять одну строку в HTML.

## Архитектура

```
rkowalyov.github.io/pain-quiz/
├── 1st-pain-quiz-styled.html   ← актуальный движок
├── arc/                       ← архив старых реализаций
└── scenarios/
    └── pain-v1.json           ← сценарий (меняем здесь)
```

В `1st-pain-quiz-styled.html` основная точка смены сценария:

```js
const DEFAULT_SCENARIO_URL = "./scenarios/pain-v1.json";
const SCENARIO_QUERY_KEY = "quiz";
```

Теперь сценарий можно выбирать двумя способами:
- жестко в коде: оставить `DEFAULT_SCENARIO_URL`
- через query-параметр: `1st-pain-quiz-styled.html?quiz=pain-v1`

Если передать имя без `.json`, файл ищется в папке `scenarios/`.

Пример iframe-встраивания:

```html
<iframe
  src="https://quiz.painhelp.ru/1st-pain-quiz-styled.html?quiz=pain-v1"
  width="100%"
  height="720"
  frameborder="0"
  style="border:none;border-radius:24px;overflow:hidden;"
  scrolling="auto"
></iframe>
```

```

***

## Формат JSON-сценария

```json
{
  "meta": {
    "title": "Проверьте свою боль за 1 минуту",
    "subtitle": "Ответьте на 5 вопросов и получите понимание, стоит ли обращаться к специалисту",
    "trust_badges": ["Без регистрации", "Анонимно", "Основано на опыте врачей"],
    "cta_start": "Пройти тест",
    "webhook": "https://interpain.bitrix24.ru/rest/1/aigq909p2tgc5twx/crm.lead.add",
    "source_label": "Тест Квиз 26_05_05"
  },

  "questions": [
    {
      "id": "pain_location",
      "crm_field": "UF_CRM_PAIN_LOCATION",
      "text": "Где вы чаще всего чувствуете боль?",
      "options": [
        { "label": "Голова",  "value": "head",   "score": 1 },
        { "label": "Спина",   "value": "back",   "score": 2 },
        { "label": "Шея",     "value": "neck",   "score": 2 },
        { "label": "Суставы", "value": "joints", "score": 2 },
        { "label": "Другое",  "value": "other",  "score": 1 }
      ]
    },
    {
      "id": "pain_duration",
      "crm_field": "UF_CRM_PAIN_DURATION",
      "text": "Как давно появилась боль?",
      "flag": "chronic_if_gte_index",
      "chronic_threshold": 2,
      "options": [
        { "label": "Несколько дней",    "value": "short",   "score": 0 },
        { "label": "Несколько недель",  "value": "weeks",   "score": 1 },
        { "label": "Несколько месяцев", "value": "months",  "score": 2 },
        { "label": "Более 6 месяцев",  "value": "chronic", "score": 4 }
      ]
    },
    {
      "id": "pain_intensity",
      "crm_field": "UF_CRM_PAIN_INTENSITY",
      "text": "Насколько сильная боль?",
      "options": [
        { "label": "Слабая, почти не мешает", "value": "low",      "score": 0 },
        { "label": "Умеренная",               "value": "medium",   "score": 1 },
        { "label": "Сильная",                 "value": "high",     "score": 2 },
        { "label": "Очень сильная",           "value": "very_high","score": 3 }
      ]
    },
    {
      "id": "pain_impact",
      "crm_field": "UF_CRM_PAIN_IMPACT",
      "text": "Насколько боль влияет на вашу жизнь?",
      "options": [
        { "label": "Практически не влияет",          "value": "none",     "score": 0 },
        { "label": "Иногда мешает",                   "value": "moderate", "score": 1 },
        { "label": "Сильно влияет на повседневные дела","value": "strong",  "score": 3 }
      ]
    },
    {
      "id": "doctor_visit",
      "crm_field": "UF_CRM_DOCTOR_VISIT",
      "text": "Обращались ли вы к врачу с этой проблемой?",
      "flag": "failed_treatment_if_value",
      "failed_treatment_value": "no_result",
      "options": [
        { "label": "Нет",                       "value": "no",        "score": 2 },
        { "label": "Да, но лечение не помогло", "value": "no_result", "score": 3 },
        { "label": "Да, сейчас прохожу лечение","value": "treatment", "score": 1 }
      ]
    }
  ],

  "scoring": {
    "low":    { "max": 3, "title": "Серьёзных признаков не выявлено", "text": "Судя по вашим ответам, боль пока не выглядит хронической. Но важно наблюдать за состоянием.", "cta": ["Читать полезные материалы", "Узнать больше о боли"] },
    "medium": { "max": 7, "title": "Боль требует внимания",            "text": "Некоторые ответы могут указывать на развитие хронической боли. Рекомендуем не откладывать.",    "cta": ["Получить консультацию", "Изучить методы лечения"] },
    "high":   { "max": 99,"title": "Рекомендуем обратиться к специалисту","text": "Ваши ответы указывают на высокую вероятность хронической боли или неэффективного лечения.",   "cta": ["Найти клинику", "Записаться на консультацию"] }
  },

  "crm_fields": {
    "score":            "UF_CRM_QUIZ_SCORE",
    "result":           "UF_CRM_QUIZ_RESULT",
    "is_chronic":       "UF_CRM_IS_CHRONIC",
    "failed_treatment": "UF_CRM_FAILED_TREATMENT",
    "source":           "UF_CRM_SOURCE",
    "quiz_date":        "UF_CRM_QUIZ_DATE"
  }
}
```


***

## Что даёт такой подход

|  | Сейчас | После |
| :-- | :-- | :-- |
| Новый квиз | Переписать весь HTML | Создать новый `.json` |
| Сменить вопрос | Искать нужную строку в коде | Открыть JSON, поправить текст |
| Сменить webhook | Искать в коде | Одно поле `meta.webhook` в JSON |
| Несколько квизов | Копировать весь HTML | Один HTML + разные JSON |


***

Хотите — обновлю `1st-pain-quiz-styled.html` под эту архитектуру и сразу подготовлю `pain-v1.json` с текущим сценарием, чтобы всё совпало по полям Bitrix24?




# ===260505===

текущее значение вебхука 
const WEBHOOK_URL = 'https://interpain.bitrix24.ru/rest/1/aigq909p2tgc5twx/crm.lead.add.json';


брать тут https://interpain.bitrix24.ru/devops/ в разделе "Инетгрировать с внешними ситстемами"

ВНИМАНИЕ! Обнаружено,что - При каждом открытии этого раздела фомрмируется новый токен авторизации.
Надо бы почитать описание...


Proxy server (to protect Bitrix webhook)
--------------------------------------
Чтобы не хранить и не показывать Bitrix webhook в клиентском коде, в репозитории добавлен простой Express-прокси.

На сервере этот прокси выполняет две задачи:
- отдаёт статические файлы фронтенда из репозитория;
- принимает POST `/api/lead` и пересылает данные в Bitrix с помощью `BITRIX_WEBHOOK` из окружения.

Это значит, что в продакшене работоспособность не зависит от вашей локальной машины: достаточно развернуть `server.js` на хостинге и задать секрет как переменную окружения.

Local development (optional):

1. Скопируйте `.env.example` в `.env` и заполните `BITRIX_WEBHOOK`.

2. Установите зависимости и запустите сервер:

```bash
cd painhelp
npm install
npm run dev   # или `npm start`
```

3. Откройте в браузере:

```bash
http://localhost:3000/1st-pain-quiz-styled.html
```

В этом режиме один процесс обслуживает и фронтенд, и `/api/lead`.

Production deployment:

- Разверните этот репозиторий на любом Node.js-хостинге (Render, Railway, Heroku, DigitalOcean App Platform и т.п.).
- Установите в хостинге переменную окружения `BITRIX_WEBHOOK`.
- Не коммитьте реальные ключи в репозиторий.

Примеры развёртывания:

1) Heroku

- Создайте приложение.
- В разделе Config Vars добавьте `BITRIX_WEBHOOK`.
- Залейте в Heroku репозиторий. Процесс запустит `Procfile`.

2) Docker

```bash
cd painhelp
docker build -t painhelp-proxy .
docker run -d -p 3000:3000 \
  -e BITRIX_WEBHOOK="https://interpain.bitrix24.ru/rest/1/YOUR_KEY/crm.lead.add" \
  -e ALLOWED_ORIGINS="https://yourdomain.com" \
  painhelp-proxy
```

3) Render

Если вы хотите deploy без дополнительных настроек, Render поддерживает `render.yaml` в корне репозитория.

- Загрузите репозиторий на Render.
- В разделе Environment → Environment Variables добавьте `BITRIX_WEBHOOK`.
- При необходимости установите `ALLOWED_ORIGINS`.
- Render автоматически запустит `npm install` и `npm start`.

4) Vercel (самый простой)

- Установите Vercel CLI: `npm i -g vercel`.
- В корне репозитория запустите `vercel`.
- В настройках проекта на Vercel добавьте `BITRIX_WEBHOOK`.

Vercel автоматически развернёт статические страницы и API-функцию `/api/lead`, поэтому никаких дополнительных серверов запускать не нужно.

Важное замечание: если вы используете Vercel, удалите локальный `server.js` из ветки или не используйте его, потому что `api/lead.js` берёт на себя прокси.

Важно: в production фронтенд и прокси должны работать вместе на одном хосте, чтобы браузер мог обращаться к `/api/lead` без дополнительных настроек CORS.

Security notes:
- `.env` должен оставаться локальным и не попадать в git.
- В production храните `BITRIX_WEBHOOK` в защищённых переменных окружения провайдера.
- Используйте `ALLOWED_ORIGINS` для ограничения CORS.
- Rate limit уже включён в proxy, но для продакшена стоит добавить логирование и мониторинг.

