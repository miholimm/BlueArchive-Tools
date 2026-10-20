import studentNames from './student-names.json'
import portraitMap from './portrait-map.json'
import storyTitles from './story-titles.json'

export type AcademyId =
  | 'all'
  | 'millennium'
  | 'trinity'
  | 'gehenna'
  | 'abydos'
  | 'hyakkiyako'
  | 'shanhaijing'
  | 'arius'
  | 'srt'
  | 'valkyrie'
  | 'redwinter'
  | 'other'

export interface AcademyInfo {
  id: AcademyId
  name: string
  nameEn: string
  themeColor: string
  glowColor: string
  badgeBg: string
  motto: string
}

export const ACADEMIES: AcademyInfo[] = [
  {
    id: 'millennium',
    name: '千禧年科技',
    nameEn: 'Millennium Science School',
    themeColor: '#0089e0',
    glowColor: 'rgba(0, 137, 224, 0.45)',
    badgeBg: 'rgba(0, 137, 224, 0.12)',
    motto: '真理、逻辑与无限进步',
  },
  {
    id: 'trinity',
    name: '崔尼蒂综合',
    nameEn: 'Trinity General School',
    themeColor: '#e94f78',
    glowColor: 'rgba(233, 79, 120, 0.45)',
    badgeBg: 'rgba(233, 79, 120, 0.12)',
    motto: '荣光、教养与古老誓约',
  },
  {
    id: 'gehenna',
    name: '歌裴娜学园',
    nameEn: 'Gehenna Academy',
    themeColor: '#c026d3',
    glowColor: 'rgba(192, 38, 211, 0.45)',
    badgeBg: 'rgba(192, 38, 211, 0.12)',
    motto: '自由、混沌与狂想曲',
  },
  {
    id: 'abydos',
    name: '阿拜多斯高中',
    nameEn: 'Abydos High School',
    themeColor: '#2ea9ff',
    glowColor: 'rgba(46, 169, 255, 0.45)',
    badgeBg: 'rgba(46, 169, 255, 0.12)',
    motto: '砂海中的不屈意志',
  },
  {
    id: 'hyakkiyako',
    name: '百鬼夜行联合',
    nameEn: 'Allied Hyakkiyako Academy',
    themeColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    badgeBg: 'rgba(239, 68, 68, 0.12)',
    motto: '繁樱飘落的祭典之境',
  },
  {
    id: 'shanhaijing',
    name: '山海经高级中学',
    nameEn: 'Shanhaijing Senior Secondary',
    themeColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    motto: '传统、武艺与至纯美食',
  },
  {
    id: 'arius',
    name: '阿里乌斯分校',
    nameEn: 'Arius Branch School',
    themeColor: '#64748b',
    glowColor: 'rgba(100, 116, 139, 0.45)',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    motto: '凡事虚空，何求其益',
  },
  {
    id: 'srt',
    name: 'SRT特殊学园',
    nameEn: 'SRT Special Academy',
    themeColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    motto: '冷雨中的战术决断',
  },
  {
    id: 'valkyrie',
    name: '女武神警察',
    nameEn: 'Valkyrie Police Academy',
    themeColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    motto: '秩序、守护与市民安全',
  },
  {
    id: 'redwinter',
    name: '赤冬联邦',
    nameEn: 'Red Winter Federal Academy',
    themeColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    badgeBg: 'rgba(220, 38, 38, 0.12)',
    motto: '暴风雪中的同志意志',
  },
  {
    id: 'other',
    name: '联邦夏莱 / 其他',
    nameEn: 'General / SCHALE',
    themeColor: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    badgeBg: 'rgba(2, 132, 199, 0.12)',
    motto: '所有奇迹的始发点',
  },
]

const STUDENT_ACADEMY_RULE: Record<string, AcademyId> = {
  // Millennium
  优香: 'millennium',
  诺亚: 'millennium',
  小雪: 'millennium',
  莉绪: 'millennium',
  尼禄: 'millennium',
  花凛: 'millennium',
  明日奈: 'millennium',
  茜: 'millennium',
  时: 'millennium',
  爱丽丝: 'millennium',
  绿: 'millennium',
  桃: 'millennium',
  柚子: 'millennium',
  真纪: 'millennium',
  晴: 'millennium',
  小玉: 'millennium',
  千寻: 'millennium',
  咏叶: 'millennium',
  响: 'millennium',
  柯托莉: 'millennium',
  堇: 'millennium',
  艾米: 'millennium',
  礼纱: 'millennium',
  玲纱: 'millennium',

  // Trinity
  渚: 'trinity',
  未花: 'trinity',
  圣亚: 'trinity',
  梓: 'trinity',
  日富美: 'trinity',
  小春: 'trinity',
  花子: 'trinity',
  鹤城: 'trinity',
  莲实: 'trinity',
  剑先: 'trinity',
  一花: 'trinity',
  樱子: 'trinity',
  玛丽: 'trinity',
  日向: 'trinity',
  忧: 'trinity',
  芹奈: 'trinity',
  花绘: 'trinity',
  铃美: 'trinity',
  志美子: 'trinity',
  爱莉: 'trinity',
  夏: 'trinity',
  喜美: 'trinity',
  和纱: 'trinity',
  美弥: 'trinity',

  // Gehenna
  日奈: 'gehenna',
  亚子: 'gehenna',
  伊织: 'gehenna',
  千夏: 'gehenna',
  阿露: 'gehenna',
  睦月: 'gehenna',
  佳代子: 'gehenna',
  遥香: 'gehenna',
  晴奈: 'gehenna',
  淳子: 'gehenna',
  枫香: 'gehenna',
  茱莉: 'gehenna',
  明里: 'gehenna',
  伊吕波: 'gehenna',
  伊吹: 'gehenna',
  真琴: 'gehenna',
  霞: 'gehenna',
  惠: 'gehenna',

  // Abydos
  白子: 'abydos',
  星野: 'abydos',
  野宫: 'abydos',
  芹香: 'abydos',
  绫音: 'abydos',

  // Hyakkiyako
  泉奈: 'hyakkiyako',
  椿: 'hyakkiyako',
  千世: 'hyakkiyako',
  枫: 'hyakkiyako',
  静子: 'hyakkiyako',
  满: 'hyakkiyako',
  筑紫: 'hyakkiyako',
  三森: 'hyakkiyako',
  桔梗: 'hyakkiyako',
  莲华: 'hyakkiyako',

  // Shanhaijing
  瞬: 'shanhaijing',
  心奈: 'shanhaijing',
  纱绫: 'shanhaijing',
  瑠美: 'shanhaijing',
  弥奈: 'shanhaijing',

  // Arius
  纱织: 'arius',
  亚津子: 'arius',
  美咲: 'arius',
  日和: 'arius',

  // SRT
  宫子: 'srt',
  咲: 'srt',
  美游: 'srt',
  萌绘: 'srt',

  // Valkyrie
  桐乃: 'valkyrie',
  吹雪: 'valkyrie',
  康奈: 'valkyrie',

  // Red Winter
  切里诺: 'redwinter',
  玛利娜: 'redwinter',
  巴: 'redwinter',
  诺多卡: 'redwinter',
  时雨: 'redwinter',
  莫米吉: 'redwinter',
}

export function getAcademyByStudentName(rawName: string): AcademyInfo {
  const baseName = rawName.replace(/\(.*?\)/g, '').trim()
  const academyId = STUDENT_ACADEMY_RULE[baseName] || STUDENT_ACADEMY_RULE[rawName] || 'other'
  return ACADEMIES.find((a) => a.id === academyId) || ACADEMIES[ACADEMIES.length - 1]
}

export interface FeaturedStudent {
  id: string
  name: string
  fullName: string
  role: string
  academy: AcademyId
  portrait: string
  quote: string
  initialStoryPath: string
  sampleLocalUrl?: string
  episodes: Array<{ ep: number; title: string; path: string }>
}

export const FEATURED_STUDENTS: FeaturedStudent[] = [
  {
    id: '13010',
    name: '早濑优香',
    fullName: '早濑优香 / Hayase Yuuka',
    role: '研讨会 · 会计',
    academy: 'millennium',
    portrait: '/images/portraits/13010.webp',
    quote: '老师，请把这周的发票交给我过目！哪怕多花了一百日元我都会算清楚的！',
    initialStoryPath: 'favor/13010/130101',
    sampleLocalUrl: '/ba-stories/yuuka.json',
    episodes: [
      { ep: 1, title: '第1话 · 老师的私账诊断', path: 'favor/13010/130101' },
      { ep: 3, title: '第2话 · 研讨会的忙碌午后', path: 'favor/13010/130103' },
      { ep: 5, title: '第3话 · 操心体质的优香', path: 'favor/13010/130105' },
      { ep: 6, title: '第4话 · 彼此守护的契约', path: 'favor/13010/130106' },
      { ep: 8, title: '第5话 · 计算器之外的心跳', path: 'favor/13010/130108' },
      { ep: 20, title: '纪念大厅 · 专属时光', path: 'favor/13010/1301020' },
    ],
  },
  {
    id: '10010',
    name: '砂狼白子',
    fullName: '砂狼白子 / Sunaookami Shiroko',
    role: '对策委员会 · 突击队长',
    academy: 'abydos',
    portrait: '/images/portraits/10010.webp',
    quote: '嗯，老师……今天也一起去晨跑吗？无论何时，我都在你身边。',
    initialStoryPath: 'favor/10010/100102',
    episodes: [
      { ep: 1, title: '第1话 · 砂海中的晨跑', path: 'favor/10010/100102' },
      { ep: 2, title: '第2话 · 呼吸与节奏', path: 'favor/10010/100103' },
      { ep: 3, title: '第3话 · 自行车修理计划', path: 'favor/10010/100105' },
      { ep: 4, title: '第4话 · 银发狼耳的秘密', path: 'favor/10010/100106' },
      { ep: 5, title: '第5话 · 阿拜多斯的天空', path: 'favor/10010/100108' },
      { ep: 20, title: '纪念大厅 · 晨光中的约定', path: 'favor/10010/1001020' },
    ],
  },
  {
    id: '10074',
    name: '浦和花子 (泳装)',
    fullName: '浦和花子 / Urawa Hanako (Swimsuit)',
    role: '补课部 · 隐秘天才',
    academy: 'trinity',
    portrait: '/images/portraits/10074.webp',
    quote: '老师……夏天就应该更坦率一点哦？你看，海风正吹拂着属于我们两人的秘密。',
    initialStoryPath: 'favor/10074/100741',
    episodes: [
      { ep: 1, title: '第1话 · 海边的清凉恶作剧', path: 'favor/10074/100741' },
      { ep: 2, title: '第2话 · 防晒霜与心跳加速', path: 'favor/10074/100742' },
      { ep: 3, title: '第3话 · 纯白天鹅的独白', path: 'favor/10074/100743' },
      { ep: 4, title: '第4话 · 只有两人的浪花', path: 'favor/10074/100744' },
      { ep: 20, title: '纪念大厅 · 沙滩上的耳语', path: 'favor/10074/1007420' },
    ],
  },
  {
    id: '10059',
    name: '圣园未花',
    fullName: '圣园未花 / Misono Mika',
    role: '茶会前代表 · 璀璨魔女',
    academy: 'trinity',
    portrait: '/images/portraits/10059.webp',
    quote: '哇啊，老师！来看我了吗？只要老师在我身边，不管是蛋糕卷还是惩罚，我都喜欢！',
    initialStoryPath: 'favor/10059/100591',
    episodes: [
      { ep: 1, title: '第1话 · 牢笼中的小小星星', path: 'favor/10059/100591' },
      { ep: 2, title: '第2话 · 闪闪发光的下午茶', path: 'favor/10059/100592' },
      { ep: 3, title: '第3话 · 谎言与真正的救赎', path: 'favor/10059/100593' },
      { ep: 4, title: '第4话 · 专属老师的公主', path: 'favor/10059/100594' },
      { ep: 20, title: '纪念大厅 · 星空下的祈愿', path: 'favor/10059/1005920' },
    ],
  },
  {
    id: '10015',
    name: '天童爱丽丝',
    fullName: '天童爱丽丝 / Tendou Alice',
    role: '游戏开发部 · 光之勇者',
    academy: 'millennium',
    portrait: '/images/portraits/10015.webp',
    quote: '爱丽丝的HP已经完全恢复了！请下达任务指令，老师，邦邦咔邦！',
    initialStoryPath: 'favor/10015/100152',
    episodes: [
      { ep: 1, title: '第1话 · 勇者的最初升级', path: 'favor/10015/100152' },
      { ep: 2, title: '第2话 · 邦邦咔邦的日常', path: 'favor/10015/100153' },
      { ep: 3, title: '第3话 · 探索废墟的传说武器', path: 'favor/10015/100155' },
      { ep: 4, title: '第4话 · 拥有心智的奇迹少女', path: 'favor/10015/100156' },
      { ep: 20, title: '纪念大厅 · 属于勇者的摇篮曲', path: 'favor/10015/1001520' },
    ],
  },
  {
    id: '10042',
    name: '秤亚津子',
    fullName: '秤亚津子 / Hakari Atsuko',
    role: '阿里乌斯分队 · 公主',
    academy: 'arius',
    portrait: '/images/portraits/10042.webp',
    quote: '微笑吧，老师……不管过去发生什么，从现在起，你都拥有我们盛开的花朵。',
    initialStoryPath: 'favor/10042/100422',
    episodes: [
      { ep: 1, title: '第1话 · 废墟中的纯白花朵', path: 'favor/10042/100422' },
      { ep: 2, title: '第2话 · 第一次品尝甜点', path: 'favor/10042/100423' },
      { ep: 3, title: '第3话 · 皇室面具下的真容', path: 'favor/10042/100425' },
      { ep: 4, title: '第4话 · 温暖的手心温度', path: 'favor/10042/100426' },
      { ep: 20, title: '纪念大厅 · 属于公主的花园', path: 'favor/10042/1004220' },
    ],
  },
  {
    id: '10004',
    name: '空崎日奈',
    fullName: '空崎日奈 / Sorasaki Hina',
    role: '风纪委员会 · 委员长',
    academy: 'gehenna',
    portrait: '/images/portraits/10004.webp',
    quote: '……啊，老师。只要和你呆在一起，积压一整周的头痛就好像突然痊愈了。',
    initialStoryPath: 'favor/10004/100042',
    episodes: [
      { ep: 1, title: '第1话 · 疲惫委员长的休息室', path: 'favor/10004/100042' },
      { ep: 2, title: '第2话 · 巡逻途中的安静间隙', path: 'favor/10004/100043' },
      { ep: 3, title: '第3话 · 不为人知的弱点', path: 'favor/10004/100045' },
      { ep: 4, title: '第4话 · 只有在老师面前的撒娇', path: 'favor/10004/100046' },
      { ep: 20, title: '纪念大厅 · 拥抱与安眠', path: 'favor/10004/1000420' },
    ],
  },
  {
    id: '10000',
    name: '陆八魔阿露',
    fullName: '陆八魔阿露 / Rikuhachima Aru',
    role: '便利屋68 · 社长',
    academy: 'gehenna',
    portrait: '/images/portraits/10000.webp',
    quote: '呼呼，今天便利屋68也是完美的法外狂徒——诶？！委托费算错了吗？！怎么倒贴了啊！！',
    initialStoryPath: 'favor/10000/100002',
    episodes: [
      { ep: 1, title: '第1话 · 冷酷硬派反派社长', path: 'favor/10000/100002' },
      { ep: 2, title: '第2话 · 虚张声势的委托日', path: 'favor/10000/100003' },
      { ep: 3, title: '第3话 · 老师，救救便利屋！', path: 'favor/10000/100005' },
      { ep: 4, title: '第4话 · 真正的温柔反派', path: 'favor/10000/100006' },
      { ep: 20, title: '纪念大厅 · 脸红心跳的硬汉', path: 'favor/10000/1000020' },
    ],
  },
  {
    id: '10039',
    name: '霞泽美游',
    fullName: '霞泽美游 / Kasumizawa Miyu',
    role: 'RABBIT小队 · RABBIT4',
    academy: 'srt',
    portrait: '/images/portraits/10039.webp',
    quote: '……老师，真的能看到我吗？我就在纸箱里面……请不要丢弃我……',
    initialStoryPath: 'favor/10039/100392',
    episodes: [
      { ep: 1, title: '第1话 · 纸箱里的狙击手', path: 'favor/10039/100392' },
      { ep: 2, title: '第2话 · 容易被遗忘的孩子', path: 'favor/10039/100393' },
      { ep: 3, title: '第3话 · 捡到小石子的幸运日', path: 'favor/10039/100395' },
      { ep: 4, title: '第4话 · 老师的注视即是归宿', path: 'favor/10039/100396' },
      { ep: 20, title: '纪念大厅 · 怀抱中的兔子', path: 'favor/10039/1003920' },
    ],
  },
  {
    id: '10006',
    name: '银镜伊织',
    fullName: '银镜伊织 / Shiromi Iori',
    role: '风纪委员会 · 冲锋队长',
    academy: 'gehenna',
    portrait: '/images/portraits/10006.webp',
    quote: '老、老师？！不准盯着我的脚看！再看我就开枪了！真的开枪了哦！',
    initialStoryPath: 'favor/10006/100062',
    episodes: [
      { ep: 1, title: '第1话 · 严格执纪的突击队长', path: 'favor/10006/100062' },
      { ep: 2, title: '第2话 · 追捕犯人时的意外', path: 'favor/10006/100063' },
      { ep: 3, title: '第3话 · 老师请自重！', path: 'favor/10006/100065' },
      { ep: 4, title: '第4话 · 逞强背后的纯情', path: 'favor/10006/100066' },
      { ep: 20, title: '纪念大厅 · 脸红的惩罚时刻', path: 'favor/10006/1000620' },
    ],
  },
  {
    id: '10032',
    name: '浅黄睦月',
    fullName: '浅黄睦月 / Asagi Mutsuki',
    role: '便利屋68 · 恶作剧专家',
    academy: 'gehenna',
    portrait: '/images/portraits/10032.webp',
    quote: '库库库~ 老师，踩到我的地雷了呢~ 要被惩罚了哦？准备好了吗？',
    initialStoryPath: 'favor/10032/100322',
    episodes: [
      { ep: 1, title: '第1话 · 小恶魔的地雷陷阱', path: 'favor/10032/100322' },
      { ep: 2, title: '第2话 · 玩弄阿露与老师的下午', path: 'favor/10032/100323' },
      { ep: 3, title: '第3话 · 恶作剧翻车的睦月', path: 'favor/10032/100325' },
      { ep: 4, title: '第4话 · 只对老师展现的撒娇', path: 'favor/10032/100326' },
      { ep: 20, title: '纪念大厅 · 烟火与悄悄话', path: 'favor/10032/1003220' },
    ],
  },
  {
    id: '10062',
    name: '飞鸟马时',
    fullName: '飞鸟马时 / Asuka Toki',
    role: 'C&C · 秘密特工',
    academy: 'millennium',
    portrait: '/images/portraits/10062.webp',
    quote: 'Peace Peace。老师，C&C第五位特工，听候差遣。随时可以出动秘密兵器。',
    initialStoryPath: 'favor/10062/100621',
    episodes: [
      { ep: 1, title: '第1话 · Peace Peace特工报到', path: 'favor/10062/100621' },
      { ep: 2, title: '第2话 · 毫无破绽的女仆行动', path: 'favor/10062/100622' },
      { ep: 3, title: '第3话 · 动力装甲与日常维护', path: 'favor/10062/100623' },
      { ep: 4, title: '第4话 · 专属老师的V字手势', path: 'favor/10062/100624' },
      { ep: 20, title: '纪念大厅 · 秘密基地的心意', path: 'favor/10062/1006220' },
    ],
  },
]

export interface FeaturedMainStory {
  id: string
  title: string
  chapter: string
  desc: string
  path: string
  sampleLocalUrl?: string
  academy: AcademyId
}

export const FEATURED_MAIN_STORIES: FeaturedMainStory[] = [
  {
    id: 'prologue',
    title: '序章 · 联邦学生会长失踪',
    chapter: 'Prologue',
    desc: '基沃托斯陷入瘫痪，联邦搜查社夏莱正式建立，老师与最初少女们的相遇。',
    path: 'prologue',
    sampleLocalUrl: '/ba-stories/prologue.json',
    academy: 'other',
  },
  {
    id: 'vol1',
    title: 'Vol.1 对策委员会篇 · 砂漠中的绿洲',
    chapter: 'Volume 1',
    desc: '背负沉重债务濒临废校的阿拜多斯高中，对策委员会少女们的不屈誓言。',
    path: 'main/11000',
    academy: 'abydos',
  },
  {
    id: 'vol2',
    title: 'Vol.2 发条之花之帕凡舞曲篇 · 游戏开发部',
    chapter: 'Volume 2',
    desc: '为了挽救废部的游戏开发部，唤醒深眠于千禧年废墟中的机械勇者爱丽丝。',
    path: 'main/31010',
    academy: 'millennium',
  },
  {
    id: 'vol3',
    title: 'Vol.3 伊甸园条约篇 · 虚无与破晓',
    chapter: 'Volume 3',
    desc: '崔尼蒂与歌裴娜的历史和平条约，补课部的夏天与深渊阿里乌斯的宿命交织。',
    path: 'main/31020',
    academy: 'trinity',
  },
  {
    id: 'vol4',
    title: 'Vol.4 卡班诺的指导者篇 · 公园里的正义',
    chapter: 'Volume 4',
    desc: '精英SRT特殊学园废校，坚守在考斯托公园冷雨中的RABBIT小队与警局的暗流。',
    path: 'main/31030',
    academy: 'srt',
  },
  {
    id: 'vol5',
    title: 'Vol.Final 最终篇 · 所有奇迹的始发点',
    chapter: 'Volume Final',
    desc: '虚妄之圣所从天而降，各自治学园全面集结，为了拯救彼此的誓死决战。',
    path: 'main/31040',
    academy: 'other',
  },
]

export interface StoryResolvedMeta {
  type: string
  typeLabel: string
  title: string
  studentId?: string
  studentName?: string
  portrait?: string
  academy: AcademyInfo
  episode?: number
  isMemorial?: boolean
}

export function resolveStoryMeta(path: string, fallbackTitle?: string): StoryResolvedMeta {
  const cleanPath = path.replace(/\.json$/, '').replace(/^\/+/, '')
  const seg = cleanPath.split('/')
  const type = seg[0] || 'favor'

  let typeLabel = '剧情'
  if (type === 'favor') typeLabel = '羁绊剧情'
  else if (type === 'main') typeLabel = '主线剧情'
  else if (type === 'event') typeLabel = '活动剧情'
  else if (type === 'ai') typeLabel = 'AI精翻'
  else if (type === 'other') typeLabel = '其他剧情'

  // 1. 如果有静态 storyTitles
  const staticTitle = (storyTitles as Record<string, string>)[cleanPath]
  if (staticTitle) {
    const parts = staticTitle.split(';')
    const t = parts.length > 1 ? parts.slice(1).join(';') : staticTitle
    const cleanT = t.replace(/\[[0-9A-Fa-f]{6}\]|\[[-]\]/g, '').trim()
    return {
      type,
      typeLabel,
      title: cleanT || fallbackTitle || cleanPath,
      academy: ACADEMIES[ACADEMIES.length - 1],
    }
  }

  // 2. 如果是 favor / ai
  if (type === 'favor' || type === 'ai') {
    const studentId = type === 'favor' ? seg[1] : seg[2]
    const file = seg[seg.length - 1] || ''
    const epStr = file.replace(/^1\d{4}/, '')
    const ep = parseInt(epStr, 10)
    const isMemorial = ep === 20 || file.endsWith('20')

    const name = (studentNames as Record<string, string>)[studentId || ''] || ''
    const portrait = (portraitMap as Record<string, string>)[name] || (studentId ? `/images/portraits/${studentId}.webp` : undefined)
    const academy = name ? getAcademyByStudentName(name) : ACADEMIES[ACADEMIES.length - 1]

    let title = fallbackTitle || ''
    if (!title && name) {
      if (isMemorial) {
        title = `${name} · 纪念大厅`
      } else if (Number.isFinite(ep) && ep > 0) {
        title = `${name} · 第${ep}话`
      } else {
        title = `${name} 好感剧情`
      }
    }

    return {
      type,
      typeLabel,
      title: title || cleanPath,
      studentId,
      studentName: name,
      portrait,
      academy,
      episode: Number.isFinite(ep) ? ep : undefined,
      isMemorial,
    }
  }

  return {
    type,
    typeLabel,
    title: fallbackTitle || cleanPath,
    academy: ACADEMIES[ACADEMIES.length - 1],
  }
}
