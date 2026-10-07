# VoiceNotes Pro

🔒 Локальные зашифрованные голосовые заметки. Всё работает в браузере — данные никогда не покидают устройство.

**Live:** https://danisvi.github.io/voicenotes-/

---

## Возможности

- 🔐 **Шифрование** — AES-256-GCM, ключ из мастер-пароля (PBKDF2, 250 000 итераций)
- 🎙 **Голосовой ввод** — через Web Speech API, с превью и ручной правкой
- 🗣 **Голосовые команды** — во время диктовки: «группа X», «в избранное», «отмена». В модалке появляется badge 🎯 · ★
- 📝 **Заметки** — CRUD, поиск, избранное (★), привязка к группам
- 🗂 **Группы** — свои названия + эмодзи-иконки
- 📴 **PWA** — устанавливается на домашний экран, офлайн-кэш
- ⏱ **Автоблокировка** — при сворачивании/через 30 с неактивности
- 💾 **Хранение** — IndexedDB (зашифрованные блобы + canary для верификации пароля)
- 💾 **Резервная копия** — экспорт/импорт .vnp (AES-256-GCM). При импорте — выбор: **Слить** с текущими или **Заменить**
- 🌐 **Без бэкенда** — 100% клиентская сторона, ноль сетевых запросов с данными

## Стек

- **Vite 5.4** + vanilla JS (ESM)
- **Tailwind CSS 3.4** (PostCSS, autoprefixer)
- **Web Crypto API** (AES-GCM, PBKDF2)
- **IndexedDB** через тонкую обёртку
- **Web Speech API** для распознавания речи
- **GitHub Pages** + Actions для CI/CD

## Архитектура

- `src/app.js` — роутинг LockScreen ↔ Shell + autolock
- `src/main.js` — точка входа
- `src/core/crypto.js` — AES-256-GCM, PBKDF2 250k
- `src/core/storage.js` — IndexedDB, saveEncrypted/loadEncrypted
- `src/core/auth.js` — canary-based верификация пароля
- `src/core/state.js` — createStore
- `src/core/autolock.js` — visibilitychange + timeout 30s
- `src/ui/LockScreen.js` — экран ввода мастер-пароля
- `src/ui/MainScreen.js` — заметки, поиск, ★, группы, FAB, 🎤
- `src/ui/SecurityScreen.js` — настройки безопасности
- `src/ui/GroupsScreen.js` — CRUD групп + эмодзи-picker
- `src/ui/VoiceModal.js` — Web Speech, состояния записи
- `src/ui/Shell.js` — 3 таба: Заметки / Группы / Безопасность
- `src/modules/voice.js` — обёртка Web Speech API
- `src/modules/parser.js` — парсер голосовых команд (группа / избранное / отмена)
- `src/utils/dom.js` — el()
## Модель данных

    Vault = { notes: [...], groups: [...] }
    Note  = { id, text, timestamp, favorite, groupId }
    Group = { id, name, emoji }

Всё содержимое Vault шифруется целиком перед записью в IndexedDB.

## Разработка

    npm install
    npm run dev        # http://127.0.0.1:5173
    npm run build      # -> dist/
    npm run preview    # локальный предпросмотр прод-сборки

## Деплой

Каждый push в main запускает workflow deploy.yml:

1. npm ci
2. npm run build
3. Публикация dist/ на GitHub Pages

Base-path Vite — /voicenotes-/, чтобы ассеты корректно резолвились на danisvi.github.io/voicenotes-/.

## Безопасность

- Мастер-пароль нигде не хранится — только деривация ключа
- crypto.getRandomValues для salt и IV
- localStorage не используется для чувствительных данных
- При блокировке ключ обнуляется в памяти
- Web Speech API — единственный «сетевой» вызов, инициируется только явным нажатием 🎤

## Что дальше

- [x] Экспорт/импорт зашифрованного vault (.vnp) с опциями Слить/Заменить
- [x] Парсер голосовых команд
- [ ] Тёмная тема
- [ ] Поиск по группам + фильтр избранного
- [ ] Каскадное удаление заметок при удалении группы

## Лицензия

MIT

