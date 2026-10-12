import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeVaults } from '../src/core/backup.js';

const iso = (s) => new Date(s).toISOString();

test('группы: union по id, локальная версия приоритетнее', () => {
  const local = { notes: [], groups: [{ id: 1, name: 'Локальная' }, { id: 2, name: 'Вторая' }] };
  const imported = { notes: [], groups: [{ id: 1, name: 'Чужая' }, { id: 3, name: 'Третья' }] };
  const m = mergeVaults(local, imported);
  const g1 = m.groups.find((g) => g.id === 1);
  assert.equal(g1.name, 'Локальная');
  assert.equal(m.groups.length, 3);
});

test('заметки без коллизии: сохраняются обе', () => {
  const local = { notes: [{ id: 'a', text: 'локальная', timestamp: iso('2025-01-01') }], groups: [] };
  const imported = { notes: [{ id: 'b', text: 'чужая', timestamp: iso('2025-02-01') }], groups: [] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes.length, 2);
});

test('коллизия id: побеждает более новая по timestamp (ISO-строки)', () => {
  const local = { notes: [{ id: 1, text: 'старая локальная', timestamp: iso('2025-01-01') }], groups: [] };
  const imported = { notes: [{ id: 1, text: 'новая чужая', timestamp: iso('2025-06-01') }], groups: [] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes.length, 1);
  assert.equal(m.notes[0].text, 'новая чужая');
});

test('сортировка: новые заметки сверху (ISO-строки)', () => {
  const local = { notes: [{ id: 'new', text: 'новая', timestamp: iso('2025-06-01') }], groups: [] };
  const imported = { notes: [{ id: 'old', text: 'старая', timestamp: iso('2025-01-01') }], groups: [] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes[0].id, 'new');
});

test('битая ссылка groupId вычищается в null', () => {
  const local = { notes: [{ id: 1, text: 'x', timestamp: iso('2025-01-01'), groupId: 999 }], groups: [] };
  const imported = { notes: [], groups: [{ id: 5, name: 'есть' }] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes[0].groupId, null);
});

test('числовые timestamp работают (обратная совместимость)', () => {
  const local = { notes: [{ id: 1, text: 'старая', timestamp: 1000 }], groups: [] };
  const imported = { notes: [{ id: 1, text: 'новая', timestamp: 2000 }], groups: [] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes[0].text, 'новая');
  assert.equal(m.notes.length, 1);
});

test('входные объекты не мутируются', () => {
  const local = { notes: [{ id: 1, text: 'x', timestamp: iso('2025-01-01'), groupId: 7 }], groups: [{ id: 7, name: 'g' }] };
  const imported = { notes: [{ id: 2, text: 'y', timestamp: iso('2025-02-01') }], groups: [{ id: 7, name: 'g' }] };
  const localSnapshot = JSON.stringify(local);
  const importedSnapshot = JSON.stringify(imported);
  mergeVaults(local, imported);
  assert.equal(JSON.stringify(local), localSnapshot);
  assert.equal(JSON.stringify(imported), importedSnapshot);
});

test('битые элементы (null, без id) игнорируются', () => {
  const local = { notes: [null, { text: 'без id' }, { id: 1, text: 'ok', timestamp: iso('2025-01-01') }], groups: [null, { name: 'без id' }] };
  const imported = { notes: [undefined], groups: [] };
  const m = mergeVaults(local, imported);
  assert.equal(m.notes.length, 1);
  assert.equal(m.notes[0].text, 'ok');
  assert.equal(m.groups.length, 0);
});
