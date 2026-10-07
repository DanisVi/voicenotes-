// Парсер голосовых команд → { text, groupName }
// Примеры: "заметка купить хлеб", "в группу работа совещание в 10"
// Дефолт: если команд нет — весь текст = заметка без группы.

const TRANSLIT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
  'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
  'х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ы':'y','э':'e','ю':'yu','я':'ya',
};
const NUM_WORDS = /(odin|dva|dve|tri|chetyre|pyat|shest|sem|vosem|devyat|desyat|nol|zero|one|two|three|four|five|six|seven|eight|nine|ten)/g;

export function normForMatch(s) {
  let n = (s || '').toLowerCase();
  n = n.split('').map((c) => TRANSLIT[c] || c).join('');
  n = n.replace(/[^a-z0-9]/g, '');
  n = n.replace(NUM_WORDS, '');
  return n;
}

const RE_GROUP = /\s+(?:в\s+группу|в\s+группе|группа)\s+([^,.:;!?]+?)(?=\s+(?:заметка|запиши|напиши|note)\b|$)/i;
const RE_GROUP_TRAIL = /[,.]?\s*(?:в\s+группу|в\s+группе|группа)\s+(.+?)\s*$/i;
const RE_NOTE = /^\s*(?:заметка|запиши|напиши|note)(?![а-яё])[\s,.:;-]*/i;

export function parseCommand(raw, groups = []) {
  const original = (raw || '').trim();
  if (!original) return { text: '', groupName: null };

  let text = original;
  let groupName = null;

  // 1) Ищем "в группу X" в конце — самый частый вариант
  let m = text.match(RE_GROUP_TRAIL);
  if (m) {
    groupName = m[1].trim();
    text = text.slice(0, m.index).trim();
  } else {
    // 2) Иначе "в группу X" в середине (между командой и текстом)
    m = text.match(RE_GROUP);
    if (m) {
      groupName = m[1].trim();
      text = text.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // 3) Убираем префикс "заметка"/"запиши" в начале
  text = text.replace(RE_NOTE, '').trim();

  // 4) Убираем висящие точки/запятые в начале/конце
  text = text.replace(/^[,.:;\s-]+/, '').replace(/[,.:;\s-]+$/, '').trim();

  // 5) Нечёткий матчинг хвоста фразы с названиями групп
  if (!groupName && groups.length && text) {
    const words = text.split(/\s+/);
    for (let n = Math.min(4, words.length); n >= 1; n--) {
      const tail = words.slice(-n).join(' ');
      const tailNorm = normForMatch(tail);
      if (!tailNorm) continue;
      const hit = groups.find((g) => normForMatch(g.name) === tailNorm);
      if (hit) {
        groupName = hit.name;
        text = words.slice(0, -n).join(' ').trim();
        break;
      }
    }
  }


  // 6) Команда "избранное" — вырезаем и помечаем
  let favorite = false;
  const favRe = /(?:^|\s)в?\s?избранн(?:ое|ые|ым|ому|ом|ого|ой)(?![а-яёА-ЯЁ])/gi;
  if (favRe.test(text)) {
    favorite = true;
    text = text
      .replace(favRe, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, '')
      .trim();
  }

  // 7) Команда отмены — только если вся фраза целиком
  const cancelRe = /^\s*(?:отмена|удали(?:ть)?|не\s+сохраняй|стоп)\s*[.!?]?\s*$/i;
  const cancelled = cancelRe.test(original);

  return { text, groupName: groupName || null, favorite, cancelled };
}
