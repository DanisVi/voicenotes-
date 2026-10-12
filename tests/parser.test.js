import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, normForMatch } from '../src/modules/parser.js';

test('пустой ввод — пустая заметка без группы', () => {
  const r = parseCommand('');
  assert.equal(r.text, '');
  assert.equal(r.groupName, null);
});

test('префикс «заметка» срезается', () => {
  const r = parseCommand('заметка купить хлеб');
  assert.equal(r.text, 'купить хлеб');
  assert.equal(r.groupName, null);
});

test('префиксы «запиши»/«напиши»/«note» срезаются', () => {
  assert.equal(parseCommand('запиши позвонить маме').text, 'позвонить маме');
  assert.equal(parseCommand('напиши отчёт').text, 'отчёт');
  assert.equal(parseCommand('note buy milk').text, 'buy milk');
});

test('«в группу X» в конце фразы', () => {
  const r = parseCommand('совещание в 10 в группу работа');
  assert.equal(r.groupName, 'работа');
  assert.equal(r.text, 'совещание в 10');
});

test('«группа X» в конце фразы', () => {
  const r = parseCommand('купить хлеб, группа покупки');
  assert.equal(r.groupName, 'покупки');
  assert.equal(r.text, 'купить хлеб');
});

test('неотчётливый хвост фразы матчится с названием группы (регистр, транслит)', () => {
  const groups = [{ id: 1, name: 'Работа' }];
  const r = parseCommand('купить хлеб работа', groups);
  assert.equal(r.groupName, 'Работа');
  assert.equal(r.text, 'купить хлеб');
});

test('команда «в избранное» вырезается и помечает флаг', () => {
  const r = parseCommand('запиши идея избранное');
  assert.equal(r.favorite, true);
  assert.equal(r.text, 'идея');
});

test('отмена — только вся фраза целиком', () => {
  assert.equal(parseCommand('отмена').cancelled, true);
  assert.equal(parseCommand('стоп').cancelled, true);
  assert.equal(parseCommand('не сохраняй').cancelled, true);
  assert.equal(parseCommand('удалить файл').cancelled, false);
});

test('normForMatch: транслит + вычистка небукв', () => {
  assert.equal(normForMatch('Работа'), 'rabota');
  assert.equal(normForMatch('Мой Дом!'), 'moydom');
});
