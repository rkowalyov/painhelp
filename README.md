
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
