
# painhelp — платформа квизов для Bitrix24

Статический фронтенд с движком квизов и визуальным конструктором сценариев. Основной запуск идёт через файл [1st-pain-quiz-styled.html](1st-pain-quiz-styled.html), сценарии лежат в [scenarios](scenarios), а редактор — в [quiz-editor](quiz-editor).

---

## Документация

- Полный гайд: [QUIZ_GUIDE.md](QUIZ_GUIDE.md)
- Документация конструктора: [quiz-editor/index.md](quiz-editor/index.md)
- Основной сценарий: [scenarios/pain-v1_growth_2608_001.json](scenarios/pain-v1_growth_2608_001.json)

---

## Компоненты

### 1. Движок квиза

Файл: [1st-pain-quiz-styled.html](1st-pain-quiz-styled.html)

- загружает сценарий из JSON
- показывает hero → вопросы → email → результат
- считает итоговый score
- ставит флаги `is_chronic` и `failed_treatment`
- отправляет лид в Bitrix24 через webhook, если webhook настроен
- работает в demo mode, если webhook пустой или является placeholder

### 2. Конструктор квизов

Папка: [quiz-editor](quiz-editor)

- визуальное создание и редактирование вопросов
- настройка scoring
- привязка к Bitrix24 `UF_CRM_...` полям
- просмотр превью интерфейса
- экспорт итогового JSON

### 3. Сценарии

Папка: [scenarios](scenarios)

Сценарии хранятся как JSON и описывают всю логику квиза: заголовки, вопросы, результаты и маппинг в CRM.

---

## Текущая каноническая схема CRM-полей

Это финальный утверждённый список, который используется в активном сценарии и в редакторе:

- `score` → `UF_CRM_1777993552`
- `result` → `UF_CRM_1777993608`
- `is_chronic` → `UF_CRM_1777993788`
- `failed_treatment` → `UF_CRM_1777993848`
- `source` → `UF_CRM_1777993881`
- `answers_json` → `UF_CRM_1786729063`

Важно:
- `result` хранит не raw `low/medium/high`, а итоговый человекочитаемый текст результата, например: "Боль требует внимания" или "Рекомендуем обратиться к специалисту".
- `answers_json` — это единственное поле для JSON ответов пользователя, и оно маппится на `UF_CRM_1786729063`.

---

## Быстрый запуск

```bash
cd /Users/kovalevroman/Code/painhelp
python3 -m http.server 8000
```

После этого открыть:

```text
http://localhost:8000/1st-pain-quiz-styled.html?quiz=pain-v1_growth_2608_001
```

Или локально через статический сервер с папкой [quiz-editor](quiz-editor):

```bash
cd /Users/kovalevroman/Code/painhelp/quiz-editor
python3 -m http.server 8000
```

---

## Схема JSON-сценария

```json
{
  "meta": {
    "title": "Проверьте свою боль за минуту",
    "subtitle": "Ответьте на 5 вопросов и получите понимание, стоит ли обращаться к специалисту",
    "trust_badges": ["Без регистрации", "Анонимно", "Основано на опыте врачей"],
    "cta_start": "Пройти тест",
    "source_label": "Тест Квиз growth 26_08_001",
    "email_title": "Мы почти готовы показать результат",
    "email_subtitle": "Оставьте email, чтобы получить результат и рекомендации и не потерять их",
    "email_fear": "Боль, которая длится долго, может становиться хронической"
  },
  "questions": [
    {
      "id": "pain_location",
      "crm_field": "UF_CRM_1777993643",
      "text": "Где вы чаще всего чувствуете боль?",
      "options": [
        { "label": "Голова", "value": "head", "score": 1 },
        { "label": "Спина", "value": "back", "score": 2 }
      ]
    }
  ],
  "scoring": {
    "low": {
      "max": 3,
      "title": "Серьёзных признаков не выявлено",
      "text": "Судя по вашим ответам, боль пока не выглядит хронической.",
      "cta": [
        { "text": "Читать полезные материалы", "url": "" }
      ]
    }
  },
  "crm_fields": {
    "score": "UF_CRM_1777993552",
    "result": "UF_CRM_1777993608",
    "is_chronic": "UF_CRM_1777993788",
    "failed_treatment": "UF_CRM_1777993848",
    "source": "UF_CRM_1777993881",
    "answers_json": "UF_CRM_1786729063"
  }
}
```

---

## Рекомендации по сценариям

- Для продакшн-версии используйте актуальный файл сценария в [scenarios](scenarios).
- Сценарий выбирается через параметр `quiz` в URL: `?quiz=pain-v1_growth_2608_001`.
- Старые версии можно хранить в репозитории как архив, но не показывать в UI как активные варианты выбора.
- Не создавайте дополнительные дубликаты поля `answers_json`; в текущей архитектуре это одно поле и один смысл.

---

## Полезные ссылки

- [QUIZ_GUIDE.md](QUIZ_GUIDE.md)
- [quiz-editor/index.md](quiz-editor/index.md)
- [quiz-editor/app.js](quiz-editor/app.js)
- [1st-pain-quiz-styled.html](1st-pain-quiz-styled.html)

---

## История изменений

- финальный согласованный список CRM-полей зафиксирован в активном сценарии
- поле `result` переведено на человекочитаемый текст результата, а не на raw category id
- `answers_json` стандартизирован на `UF_CRM_1786729063`
- редактор обновлён так, чтобы подсказки были привязаны к реальным ролям полей в квизе и CRM


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

