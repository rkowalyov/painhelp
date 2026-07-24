# Quiz Editor — Аутентификация (Защита редактора)

## Быстрый старт

### 1. Настроить переменные окружения в Vercel

В Vercel dashboard → Project Settings → Environment Variables:

**Добавить переменную:**

```
QUIZ_EDITOR_USERS = user1:password1,user2:password2,user3:password3
```

**Формат:**
```
USERNAME1:PASSWORD1,USERNAME2:PASSWORD2,...
```

**Примеры:**
```
admin:super_secret_123,editor:quiz_pass,demo:demo123
```

> ⚠️ **Безопасность:** Используйте сильные пароли. Эта переменная видна только на стороне сервера.

### 2. Получить доступ к редактору

Откройте ссылку с параметром `?edit=Y`:

```
https://quiz.painhelp.ru/?edit=Y
```

Появится модальное окно с формой входа:
- Введите логин и пароль
- Нажмите «Войти»
- При успехе модал закроется и откроется редактор

### 3. Сеанс сохраняется в браузере

После успешного входа токен сохраняется в `sessionStorage`. 

- Это означает: окно браузера закроется → сеанс завершится
- Новое окно/вкладка → требуется новый вход

---

## API Аутентификации

### Endpoint

```
POST /api/auth
```

### Запрос

```json
{
  "username": "admin",
  "password": "secret123"
}
```

### Успешный ответ (200 OK)

```json
{
  "ok": true,
  "token": "YWRtaW46MTcyMDMxNDU2Nzg5MA==",
  "message": "Welcome, admin!"
}
```

### Ошибка (401 Unauthorized)

```json
{
  "error": "Invalid credentials"
}
```

### Ошибка конфигурации (500)

```json
{
  "error": "Server misconfiguration"
}
```

---

## Как это работает

1. **Открытие редактора с `?edit=Y`:**
   - Скрипт проверяет URL параметр
   - Если токен уже есть в `sessionStorage` → редактор открывается
   - Если нет → показывается модал входа

2. **Отправка учётных данных:**
   - Форма отправляет POST на `/api/auth` с логином/паролем
   - Сервер проверяет против `QUIZ_EDITOR_USERS` в env vars
   - При совпадении возвращает токен

3. **Разблокировка редактора:**
   - Токен сохраняется в `sessionStorage`
   - Модал закрывается
   - Редактор полностью функционален

---

## Примеры использования

### Ссылка для дизайнера

```
https://quiz.painhelp.ru/quiz-editor/?edit=Y
```

### Ссылка для обычного просмотра конструктора (без защиты)

```
https://quiz.painhelp.ru/quiz-editor/
```

### Локальное тестирование

```bash
# 1. Установить переменную окружения локально
export QUIZ_EDITOR_USERS="test:test123"

# 2. Запустить сервер Vercel locally
vercel dev

# 3. Открыть
http://localhost:3000/quiz-editor/?edit=Y
```

---

## Развертывание на Vercel

1. Коммитите изменения в GitHub
2. Vercel автоматически реагирует на новые коммиты в `main`
3. В Project Settings → Environment Variables добавьте `QUIZ_EDITOR_USERS`
4. Редеплой произойдёт автоматически

---

## Часто задаваемые вопросы

**Q: Потеряю ли я доступ если закрою браузер?**  
A: Да. `sessionStorage` очищается при закрытии окна браузера. При перезагрузке той же вкладки сеанс сохраняется.

**Q: Можно ли использовать без `?edit=Y`?**  
A: Да! Редактор работает и без параметра. Аутентификация активируется только если явно передать `?edit=Y`.

**Q: Как изменить пароль?**  
A: Обновите переменную `QUIZ_EDITOR_USERS` в Vercel → Project Settings → Environment Variables.

**Q: Что если забуду пароль?**  
A: Обновите `QUIZ_EDITOR_USERS` в Vercel с новым паролем.

**Q: Можно ли использовать с другими параметрами?**  
A: Да! Например: `?edit=Y&quiz=pain-v1` — откроет редактор с загруженным квизом.

---

## Архитектура

### Frontend (`quiz-editor/app.js`)

```javascript
// 1. Проверка параметра ?edit=Y
const editParam = getEditParam();

// 2. Если есть, показываем модал входа
if (editParam === 'Y' && !getAuthToken()) {
  showAuthModal();
}

// 3. При отправке формы
await authenticateUser(username, password);

// 4. Сохраняем токен в sessionStorage
setAuthToken(token);
```

### Backend (`api/auth.js`)

```javascript
// 1. Получить переменную окружения
const credentialsEnv = process.env.QUIZ_EDITOR_USERS;

// 2. Распарсить: "user1:pass1,user2:pass2"
const validCredentials = credentialsEnv.split(',').map(...);

// 3. Проверить учётные данные
const isValid = validCredentials.some(...);

// 4. Вернуть токен или ошибку
res.json({ ok: true, token });
```

---

*Документация актуальна на 2026-07-24*
