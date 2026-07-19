export interface TopicMeta {
  id: number;
  title: string;
  subject: string;
  file: string;
  questionCount?: number;
}

export const STATIC_TOPICS: Record<string, TopicMeta> = {
  '1': { id: 1, title: 'Ерте орта Қазақстан VI-IX', subject: 'Қазақстан тарихы', file: 'test/data/turik.json' },
  '2': { id: 2, title: 'Ерте орта ғасыр мәдениеті VI-IX', subject: 'Қазақстан тарихы', file: 'test/data/turikmadinet.json' },
  '3': { id: 3, title: 'IX-XI ғасырлардағы Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/qarakhan.json' },
  '5': { id: 5, title: 'Біртұтас қазақ хандығының құрылуы', subject: 'Қазақстан тарихы', file: 'test/data/khanat-v2.json' },
  '6': { id: 6, title: 'Жаңа замандағы Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/zhongar.json' },
  '8': { id: 8, title: 'Сырым Датұлы', subject: 'Қазақстан тарихы', file: 'test/data/syrymdatuly.json' },
  '9': { id: 9, title: 'XV-XIX ғасырлардағы мәдениеті', subject: 'Қазақстан тарихы', file: 'test/data/xvmadinet.json' },
  '10': { id: 10, title: 'Ноғай', subject: 'Қазақстан тарихы', file: 'test/data/nogai.json' },
  '11': { id: 11, title: 'Алтын орда', subject: 'Қазақстан тарихы', file: 'test/data/altynorda.json' },
  '12': { id: 12, title: 'Шыңғыс хан', subject: 'Қазақстан тарихы', file: 'test/data/mongolshapkyn.json' },
  '13': { id: 13, title: 'Ежелгі Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/ezhelgi.json' },
  '14': { id: 14, title: 'Қазақстандағы хандық биліктің жойылуы', subject: 'Қазақстан тарихы', file: 'test/data/khanatedel.json' },
  '15': { id: 15, title: 'Есет пен Жаңқожа', subject: 'Қазақстан тарихы', file: 'test/data/kz-history-10-test-1.json' },
  '16': { id: 16, title: '1867-1868 Жылдардағы реформа', subject: 'Қазақстан тарихы', file: 'test/data/eset.json' },
  '17': { id: 17, title: '10-сынып Қазақстан тарихы тест 1', subject: 'Қазақстан тарихы', file: 'test/data/67-68.json' },
  '18': { id: 18, title: 'XIX ғасырдағы 50 жылдар', subject: 'Қазақстан тарихы', file: 'test/data/koterilis.json' },
  '19': { id: 19, title: 'XIX ғасырдың 60-70 көтерілістер', subject: 'Қазақстан тарихы', file: 'test/data/XiX60-70.json' },
  '20': { id: 20, title: 'ХХ ғасыр басыңдағы Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/1907.json' },
  '21': { id: 21, title: '1991 жыл: Тәуелсіздік кезеңі', subject: 'Қазақстан тарихы', file: 'test/data/1991.json' },
  '22': { id: 22, title: 'Juz40 (тарих)', subject: 'Қазақстан тарихы', file: 'test/data/juz40tarih.json' },
  '23': { id: 23, title: '1920-1930 жылдардағы Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/1920-30.json' },
  '24': { id: 24, title: 'Ұлы Отан соғысы', subject: 'Қазақстан тарихы', file: 'test/data/ulyOtan.json' },
  '25': { id: 25, title: 'Тоқырау жылдарындағы Қазақстан', subject: 'Қазақстан тарихы', file: 'test/data/tokyrau.json' },
  '26': { id: 26, title: '1930 жылдардағы қоғамдық-саяси', subject: 'Қазақстан тарихы', file: 'test/data/1930.json' },
  '27': { id: 27, title: '2025 мамырдағы тест Физ/Мат', subject: 'Қазақстан тарихы', file: 'test/data/2025mayarai.json' },
  '28': { id: 28, title: '2025 мамырдағы тест Био/Хим', subject: 'Қазақстан тарихы', file: 'test/data/2025mayaruzhan.json' },
  '29': { id: 29, title: '2025 мамырдағы тест Инфо/Мат', subject: 'Қазақстан тарихы', file: 'test/data/2025maynurseit.json' },
  '30': { id: 30, title: '2025 тамыздағы тест Инфо/Мат', subject: 'Қазақстан тарихы', file: 'test/data/2025augustramazan.json' },
  '31': { id: 31, title: 'XIX ғасырдың соңы', subject: 'Қазақстан тарихы', file: 'test/data/xixend.json' },
  '150': { id: 150, title: '1.1 Компьютер конфигурациясы', subject: 'Информатика', file: 'test/data/1.1.json' },
  '151': { id: 151, title: '1.2 Компьютер жады', subject: 'Информатика', file: 'test/data/1.2.json' },
  '152': { id: 152, title: '1.3 Бағдармалалық жасақтама', subject: 'Информатика', file: 'test/data/1.3.json' },
  '153': { id: 153, title: '1.4 Басқару құрылғысы АЛҚ ЖАД регистірі', subject: 'Информатика', file: 'test/data/1.4.json' },
  '154': { id: 154, title: '2.1 Ақпарат сипаты және қасиеті', subject: 'Информатика', file: 'test/data/2.1.json' },
  '155': { id: 155, title: '2.2 Ақпаратты кодтау және декодтау', subject: 'Информатика', file: 'test/data/2.2.json' },
  '156': { id: 156, title: '2.5 Екілік, ондық, сегіздік, он алтылық', subject: 'Информатика', file: 'test/data/2.5.json' },
  '158': { id: 158, title: '4.1 Компьютерлік желілері', subject: 'Информатика', file: 'test/data/4.1.json' },
  '159': { id: 159, title: '4.3 IP адрес', subject: 'Информатика', file: 'test/data/4.3.json' },
  '160': { id: 160, title: '10.1.1 HTML', subject: 'Информатика', file: 'test/data/10.1.1.json' },
  '162': { id: 162, title: 'Python тесті', subject: 'Информатика', file: 'test/data/python.json' },
  '163': { id: 163, title: 'CSS тесті', subject: 'Информатика', file: 'test/data/css.json' },
  '165': { id: 165, title: 'Excel тесті', subject: 'Информатика', file: 'test/data/excel.json' },
  '166': { id: 166, title: 'HTML-CSS-JS-Python', subject: 'Информатика', file: 'test/data/imported/html-css-js-python.json' },
};

export async function fetchAllTopics(): Promise<TopicMeta[]> {
  const list = Object.values(STATIC_TOPICS);
  try {
    const res = await fetch('./test/data/catalog.json');
    if (res.ok) {
      const external: any[] = await res.json();
      external.forEach(item => {
        const idNum = Number(item.id);
        if (!isNaN(idNum) && item.file && item.title) {
          // Check if already exist, if yes merge
          const existingIdx = list.findIndex(t => t.id === idNum);
          const topicEntry: TopicMeta = {
            id: idNum,
            title: item.title,
            subject: item.subject || 'Жалпы тест',
            file: item.file,
            questionCount: item.questionCount
          };
          if (existingIdx !== -1) {
            list[existingIdx] = { ...list[existingIdx], ...topicEntry };
          } else {
            list.push(topicEntry);
          }
        }
      });
    }
  } catch (err) {
    console.warn('Failed to load external test catalog, using static topics', err);
  }
  return list.sort((a, b) => a.id - b.id);
}
