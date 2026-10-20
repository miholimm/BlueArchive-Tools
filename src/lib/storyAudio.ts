/**
 * 蔚蓝档案剧情音频与演职员 (BGM & CV) 解析与映射服务
 * 提供官方 OST 编号映射、知名声优对照表、剧情对话回溯解析等能力
 */

import studentNames from '../data/student-names.json'
import portraitMap from '../data/portrait-map.json'
import { getAcademyByStudentName, type AcademyInfo } from '../data/student-metadata'

export interface BgmTrackInfo {
  id: number
  themeName: string
  title: string
  composer: string
  category: '日常' | '激昂' | '悲伤' | '悬疑' | '幽默' | '战斗' | '特殊'
  streamUrl: string
  firstLineIndex?: number
}

export interface StudentCastInfo {
  name: string
  nameJp?: string
  nameKr?: string
  cvName: string
  cvJp?: string
  portrait: string
  academy: AcademyInfo
  linesCount: number
  voicedCount: number
  sampleVoiceUrl?: string
}

export interface StoryBacklogLine {
  id: string
  index: number
  speaker: string
  speakerType: 'student' | 'sensei' | 'narrator' | 'system' | 'unknown'
  speakerPortrait?: string
  academy?: AcademyInfo
  textCn: string
  textJp: string
  voiceJp?: string
  voiceUrl?: string
  bgmId?: number
  bgmInfo?: BgmTrackInfo
  isBgmChange?: boolean
  isChoice?: boolean
}

export interface StoryAnalysisResult {
  title: string
  translator?: string
  totalLines: number
  voicedCount: number
  choicesCount: number
  backlog: StoryBacklogLine[]
  playlist: BgmTrackInfo[]
  cast: StudentCastInfo[]
}

const CDN_BASE = 'https://res.bluearchive.help/image/ba-all-data'

/**
 * 官方常见 BGM 编号与曲目对照表 (Mitsukiyo / KARUT / Nor)
 */
export const BGM_THEMES: Record<number, Omit<BgmTrackInfo, 'id' | 'streamUrl'>> = {
  1: {
    themeName: 'Theme_01',
    title: 'Constant Moderato',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  2: {
    themeName: 'Theme_02',
    title: 'Connected Sky',
    composer: 'KARUT',
    category: '日常',
  },
  3: {
    themeName: 'Theme_03',
    title: 'Mischievous Step',
    composer: 'Mitsukiyo',
    category: '幽默',
  },
  4: {
    themeName: 'Theme_04',
    title: 'Morose Step',
    composer: 'Mitsukiyo',
    category: '幽默',
  },
  5: {
    themeName: 'Theme_05',
    title: 'Romantic Smile',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  6: {
    themeName: 'Theme_06',
    title: 'Denshi Toujou!',
    composer: 'KARUT',
    category: '日常',
  },
  7: {
    themeName: 'Theme_07',
    title: 'Unwelcome School',
    composer: 'Mitsukiyo',
    category: '幽默',
  },
  8: {
    themeName: 'Theme_08',
    title: 'Shady Girls',
    composer: 'Mitsukiyo',
    category: '幽默',
  },
  9: {
    themeName: 'Theme_09',
    title: 'Midsummer cat',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  10: {
    themeName: 'Theme_10',
    title: 'Daily Routine 24/7',
    composer: 'KARUT',
    category: '日常',
  },
  11: {
    themeName: 'Theme_11',
    title: 'Crossfire',
    composer: 'KARUT',
    category: '战斗',
  },
  12: {
    themeName: 'Theme_12',
    title: 'Funky Road',
    composer: 'Nor',
    category: '日常',
  },
  13: {
    themeName: 'Theme_13',
    title: 'Barrier',
    composer: 'Nor',
    category: '悬疑',
  },
  14: {
    themeName: 'Theme_14',
    title: 'Step by Step',
    composer: 'KARUT',
    category: '日常',
  },
  15: {
    themeName: 'Theme_15',
    title: 'Honey Jam',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  16: {
    themeName: 'Theme_16',
    title: 'MX Adventure',
    composer: 'Nor',
    category: '激昂',
  },
  17: {
    themeName: 'Theme_17',
    title: 'Irasshaimase!',
    composer: 'Mitsukiyo',
    category: '幽默',
  },
  18: {
    themeName: 'Theme_18',
    title: 'Mechanical Jiggle',
    composer: 'KARUT',
    category: '日常',
  },
  19: {
    themeName: 'Theme_19',
    title: 'Virtual Storm',
    composer: 'Nor',
    category: '战斗',
  },
  20: {
    themeName: 'Theme_20',
    title: 'Tech N Tech',
    composer: 'KARUT',
    category: '战斗',
  },
  21: {
    themeName: 'Theme_21',
    title: 'Morning Glory',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  22: {
    themeName: 'Theme_22',
    title: 'Party time',
    composer: 'Mitsukiyo',
    category: '激昂',
  },
  23: {
    themeName: 'Theme_23',
    title: 'Endless Carnival',
    composer: 'Mitsukiyo',
    category: '激昂',
  },
  24: {
    themeName: 'Theme_24',
    title: 'Fade Out',
    composer: 'Nor',
    category: '悲伤',
  },
  25: {
    themeName: 'Theme_25',
    title: 'Future Bossa',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  26: {
    themeName: 'Theme_26',
    title: 'Sakura Punch',
    composer: 'Nor',
    category: '激昂',
  },
  27: {
    themeName: 'Theme_27',
    title: 'Shooting Stars',
    composer: 'KARUT',
    category: '日常',
  },
  28: {
    themeName: 'Theme_28',
    title: 'Pixel Time',
    composer: 'Nor',
    category: '日常',
  },
  29: {
    themeName: 'Theme_29',
    title: 'Endless Carnival (Ver.2)',
    composer: 'Mitsukiyo',
    category: '激昂',
  },
  30: {
    themeName: 'Theme_30',
    title: 'Merry Blue',
    composer: 'KARUT',
    category: '日常',
  },
  31: {
    themeName: 'Theme_31',
    title: 'Rolling Beat',
    composer: 'Nor',
    category: '战斗',
  },
  32: {
    themeName: 'Theme_32',
    title: 'Summer Bounce',
    composer: 'KARUT',
    category: '日常',
  },
  33: {
    themeName: 'Theme_33',
    title: 'Interface',
    composer: 'Nor',
    category: '悬疑',
  },
  34: {
    themeName: 'Theme_34',
    title: 'Golden Shangri-la',
    composer: 'KARUT',
    category: '日常',
  },
  35: {
    themeName: 'Theme_35',
    title: 'Hello to Halo',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  36: {
    themeName: 'Theme_36',
    title: 'Neo City Dive',
    composer: 'Nor',
    category: '日常',
  },
  37: {
    themeName: 'Theme_37',
    title: 'Aoharu',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  43: {
    themeName: 'Theme_43',
    title: 'Summer Memory',
    composer: 'Mitsukiyo',
    category: '日常',
  },
  51: {
    themeName: 'Theme_51',
    title: 'Aira',
    composer: 'Nor',
    category: '日常',
  },
  64: {
    themeName: 'Theme_64',
    title: 'RE Aoharu',
    composer: 'Mitsukiyo',
    category: '激昂',
  },
  68: {
    themeName: 'Theme_68',
    title: 'Welcome School',
    composer: 'KARUT',
    category: '幽默',
  },
  999: {
    themeName: 'Mute',
    title: '静音 (Mute)',
    composer: 'Official',
    category: '特殊',
  },
  10034: {
    themeName: 'Theme_10034',
    title: 'First Step to Victory',
    composer: 'KARUT',
    category: '战斗',
  },
}

/**
 * 学生与主要角色 CV 声优映射表
 */
export const STUDENT_CV_MAP: Record<
  string,
  { cv: string; cvJp: string; nameJp: string; nameKr: string }
> = {
  优香: { cv: '春花らん', cvJp: 'はるからん', nameJp: 'ユウカ', nameKr: '유우카' },
  早濑优香: { cv: '春花らん', cvJp: 'はるからん', nameJp: 'ユウカ', nameKr: '유우카' },
  诺亚: { cv: '铃代纱弓', cvJp: 'すずしろ さゆみ', nameJp: 'ノア', nameKr: '노아' },
  生盐诺亚: { cv: '铃代纱弓', cvJp: 'すずしろ さゆみ', nameJp: 'ノア', nameKr: '노아' },
  小雪: { cv: '乾夏宁', cvJp: 'いぬい なつね', nameJp: 'コユキ', nameKr: '코유키' },
  莉绪: { cv: '井上麻里奈', cvJp: 'いのうえ まりな', nameJp: 'リオ', nameKr: '리오' },
  白子: { cv: '小仓唯', cvJp: 'おぐら ゆい', nameJp: 'シロコ', nameKr: '시로코' },
  砂狼白子: { cv: '小仓唯', cvJp: 'おぐら ゆい', nameJp: 'シロコ', nameKr: '시로코' },
  星野: { cv: '花守由美里', cvJp: 'はなもり ゆみり', nameJp: 'ホシノ', nameKr: '호시노' },
  小鸟游星野: { cv: '花守由美里', cvJp: 'はなもり ゆみり', nameJp: 'ホシノ', nameKr: '호시노' },
  芹香: { cv: '大桥彩香', cvJp: 'おおはし あやか', nameJp: 'セリカ', nameKr: '세리카' },
  绫音: { cv: '原田彩枫', cvJp: 'はらだ さやか', nameJp: 'アヤネ', nameKr: '아야네' },
  野宫: { cv: '三浦千幸', cvJp: 'みうら ちゆき', nameJp: 'ノノミ', nameKr: '노노미' },
  日奈: { cv: '广桥凉', cvJp: 'ひろはし りょう', nameJp: 'ヒナ', nameKr: '히나' },
  空崎日奈: { cv: '广桥凉', cvJp: 'ひろはし りょう', nameJp: 'ヒナ', nameKr: '히나' },
  亚子: { cv: '高野麻里佳', cvJp: 'こうの まりか', nameJp: 'アコ', nameKr: '아코' },
  伊织: { cv: '佐仓绫音', cvJp: 'さくら あやね', nameJp: 'イオリ', nameKr: '이오리' },
  银镜伊织: { cv: '佐仓绫音', cvJp: 'さくら あやね', nameJp: 'イオリ', nameKr: '이오리' },
  千夏: { cv: '香月はるか', cvJp: 'かつき はるか', nameJp: 'チナツ', nameKr: '치나츠' },
  火宫千夏: { cv: '香月はるか', cvJp: 'かつき はるか', nameJp: 'チナツ', nameKr: '치나츠' },
  阿露: { cv: '近藤玲奈', cvJp: 'こんどう れいな', nameJp: 'アル', nameKr: '아루' },
  陆八魔阿露: { cv: '近藤玲奈', cvJp: 'こんどう れいな', nameJp: 'アル', nameKr: '아루' },
  睦月: { cv: '大久保瑠美', cvJp: 'おおくぼ るみ', nameJp: 'ムツキ', nameKr: '무츠키' },
  浅黄睦月: { cv: '大久保瑠美', cvJp: 'おおくぼ るみ', nameJp: 'ムツキ', nameKr: '무츠키' },
  佳代子: { cv: '藤井ゆきよ', cvJp: 'ふじい ゆきよ', nameJp: 'カヨコ', nameKr: '카요코' },
  鬼方佳代子: { cv: '藤井ゆきよ', cvJp: 'ふじい ゆきよ', nameJp: 'カヨコ', nameKr: '카よ코' },
  遥香: { cv: '石飞惠里花', cvJp: 'いしとび えりか', nameJp: 'ハルカ', nameKr: '하루카' },
  晴奈: { cv: '田所あずさ', cvJp: 'たどころ あずさ', nameJp: 'ハルナ', nameKr: '하루나' },
  淳子: { cv: '金元寿子', cvJp: 'かねもと ひさこ', nameJp: 'ジュンコ', nameKr: '준코' },
  枫香: { cv: '市道真央', cvJp: 'いちみち まお (M・A・O)', nameJp: 'フウカ', nameKr: '후우카' },
  日富美: { cv: '本渡枫', cvJp: 'ほんど かえで', nameJp: 'ヒフミ', nameKr: '히후미' },
  白石日富美: { cv: '本渡枫', cvJp: 'ほんど かえで', nameJp: 'ヒフミ', nameKr: '히후미' },
  梓: { cv: '种田梨沙', cvJp: 'たねだ りさ', nameJp: 'アズサ', nameKr: '아즈사' },
  白洲梓: { cv: '种田梨沙', cvJp: 'たねだ りさ', nameJp: 'アズサ', nameKr: '아즈사' },
  小春: { cv: '赤尾光', cvJp: 'あかお ひかる', nameJp: 'コハル', nameKr: '코하루' },
  下江小春: { cv: '赤尾光', cvJp: 'あかお ひかる', nameJp: 'コハル', nameKr: '코하루' },
  花子: { cv: '丰田萌绘', cvJp: 'とよた もえ', nameJp: 'ハナコ', nameKr: '하나코' },
  浦和花子: { cv: '丰田萌绘', cvJp: 'とよた もえ', nameJp: 'ハナコ', nameKr: '하나코' },
  未花: { cv: '种崎敦美', cvJp: 'たねざき あつみ', nameJp: 'ミカ', nameKr: '미카' },
  圣园未花: { cv: '种崎敦美', cvJp: 'たねざき あつみ', nameJp: 'ミカ', nameKr: '미카' },
  渚: { cv: '早见沙织', cvJp: 'はやみ さおり', nameJp: 'ナギサ', nameKr: '나기사' },
  桐藤渚: { cv: '早见沙织', cvJp: 'はやみ さおり', nameJp: 'ナギサ', nameKr: '나기사' },
  圣亚: { cv: '斋藤千和', cvJp: 'さいとう ちわ', nameJp: 'セイア', nameKr: '세이아' },
  百合园圣亚: { cv: '斋藤千和', cvJp: 'さいとう ちわ', nameJp: 'セイア', nameKr: '세이아' },
  鹤城: { cv: '小林优', cvJp: 'こばやし ゆう', nameJp: 'ツルギ', nameKr: '츠루기' },
  莲实: { cv: '濑户麻沙美', cvJp: 'せと あさみ', nameJp: 'ハスミ', nameKr: '하스미' },
  羽川莲实: { cv: '濑户麻沙美', cvJp: 'せと あさみ', nameJp: 'ハスミ', nameKr: '하스미' },
  玛丽: { cv: '小泽亚李', cvJp: 'おざわ あり', nameJp: 'マリー', nameKr: '마리' },
  忧: { cv: '后藤沙绪里', cvJp: 'ごとう さおり', nameJp: 'ウイ', nameKr: '우이' },
  古关忧: { cv: '后藤沙绪里', cvJp: 'ごとう さおり', nameJp: 'ウイ', nameKr: '우이' },
  日向: { cv: '寺泽百花', cvJp: 'てらさわ ももか', nameJp: 'ヒナタ', nameKr: '히나타' },
  爱丽丝: { cv: '田中美海', cvJp: 'たなか みなみ', nameJp: 'アリス', nameKr: '아리스' },
  天童爱丽丝: { cv: '田中美海', cvJp: 'たなか みなみ', nameJp: 'アリス', nameKr: '아리스' },
  绿: { cv: '高川美奈', cvJp: 'たかがわ みな', nameJp: 'ミドリ', nameKr: '미도리' },
  才羽绿: { cv: '高川美奈', cvJp: 'たかがわ みな', nameJp: 'ミドリ', nameKr: '미도리' },
  桃: { cv: '德井青空', cvJp: 'とくい そら', nameJp: 'モモイ', nameKr: '모모이' },
  才羽桃: { cv: '德井青空', cvJp: 'とくい そら', nameJp: 'モモイ', nameKr: '모모이' },
  柚子: { cv: '寺岛爱', cvJp: 'てらしま あい', nameJp: 'ユズ', nameKr: '유즈' },
  花冈柚子: { cv: '寺岛爱', cvJp: 'てらしま あい', nameJp: 'ユズ', nameKr: '유즈' },
  尼禄: { cv: '小清水亚美', cvJp: 'こしみず あみ', nameJp: 'ネル', nameKr: '네루' },
  美甘尼禄: { cv: '小清水亚美', cvJp: 'こしみず あみ', nameJp: 'ネル', nameKr: '네루' },
  花凛: { cv: '沼仓爱美', cvJp: 'ぬまくら まなみ', nameJp: 'カリン', nameKr: '카린' },
  角楯花凛: { cv: '沼仓爱美', cvJp: 'ぬまくら まなみ', nameJp: 'カリン', nameKr: '카린' },
  明日奈: { cv: '长谷川育美', cvJp: 'はせがわ いくみ', nameJp: 'アスナ', nameKr: '아스ナ' },
  一之濑明日奈: { cv: '长谷川育美', cvJp: 'はせがわ いくみ', nameJp: 'アスナ', nameKr: '아스나' },
  茜: { cv: '原由实', cvJp: 'はら ゆみ', nameJp: 'アカネ', nameKr: '아카네' },
  室笠茜: { cv: '原由实', cvJp: 'はら ゆみ', nameJp: 'アカネ', nameKr: '아카네' },
  时: { cv: '石川由依', cvJp: 'いしかわ ゆい', nameJp: 'トキ', nameKr: '토키' },
  飞鸟马时: { cv: '石川由依', cvJp: 'いしかわ ゆい', nameJp: 'トキ', nameKr: '토키' },
  泉奈: { cv: '阿澄佳奈', cvJp: 'あすみ かな', nameJp: 'イズナ', nameKr: '이즈나' },
  久田泉奈: { cv: '阿澄佳奈', cvJp: 'あすみ かな', nameJp: 'イズナ', nameKr: '이즈나' },
  若藻: { cv: '斋藤千和', cvJp: 'さいとう ちわ', nameJp: 'ワカモ', nameKr: '와카모' },
  狐坂若藻: { cv: '斋藤千和', cvJp: 'さいとう ちわ', nameJp: 'ワカモ', nameKr: '와카모' },
  宫子: { cv: '藤田茜', cvJp: 'ふじた あかね', nameJp: 'ミヤコ', nameKr: '미야코' },
  月雪宫子: { cv: '藤田茜', cvJp: 'ふじた あかね', nameJp: 'ミヤコ', nameKr: '미야코' },
  咲: { cv: '友永朱音', cvJp: 'ともなが あかね', nameJp: 'サキ', nameKr: '사키' },
  空井咲: { cv: '友永朱音', cvJp: 'ともなが あかね', nameJp: 'サキ', nameKr: '사키' },
  美游: { cv: '后藤邑子', cvJp: 'ごとう ゆうこ', nameJp: 'ミユ', nameKr: '미유' },
  霞泽美游: { cv: '后藤邑子', cvJp: 'ごとう ゆうこ', nameJp: 'ミユ', nameKr: '미유' },
  萌绘: { cv: '井泽诗织', cvJp: 'いざわ しおり', nameJp: 'モエ', nameKr: '모에' },
  风仓萌绘: { cv: '井泽诗织', cvJp: 'いざわ しおり', nameJp: 'モエ', nameKr: '모에' },
  纱织: { cv: '石上静香', cvJp: 'いしがみ しずか', nameJp: 'サオリ', nameKr: '사오리' },
  锭前纱织: { cv: '石上静香', cvJp: 'いしがみ しずか', nameJp: 'サオリ', nameKr: '사오리' },
  亚津子: { cv: '花泽香菜', cvJp: 'はなざわ かな', nameJp: 'アツコ', nameKr: '아츠코' },
  秤亚津子: { cv: '花泽香菜', cvJp: 'はなざわ かな', nameJp: 'アツコ', nameKr: '아츠코' },
  美咲: { cv: '土屋李央', cvJp: 'つちや りお', nameJp: 'ミサキ', nameKr: '미사키' },
  戒野美咲: { cv: '土屋李央', cvJp: 'つちや りお', nameJp: 'ミサキ', nameKr: '미사키' },
  日和: { cv: '中原麻衣', cvJp: 'なかはら まい', nameJp: 'ヒヨリ', nameKr: '히요리' },
  槌永日和: { cv: '中原麻衣', cvJp: 'なかはら まい', nameJp: 'ヒヨリ', nameKr: '히요리' },
  切里诺: { cv: '丹下樱', cvJp: 'たんげ さくら', nameJp: 'チェリノ', nameKr: '체리노' },
  玛利娜: { cv: '平井祥惠', cvJp: 'ひらい さちえ', nameJp: 'マリナ', nameKr: '마리나' },
  凛: { cv: '大原沙耶香', cvJp: 'おおはら さやか', nameJp: 'リン', nameKr: '린' },
  七神凛: { cv: '大原沙耶香', cvJp: 'おおはら さやか', nameJp: 'リン', nameKr: '린' },
  桃香: { cv: '村上真夏', cvJp: 'むらかみ まなつ', nameJp: 'モモカ', nameKr: '모모카' },
  铃美: { cv: '社本悠', cvJp: 'しゃもと はるか', nameJp: 'スズミ', nameKr: '스즈미' },
  美甘铃美: { cv: '社本悠', cvJp: 'しゃもと はるか', nameJp: 'スズミ', nameKr: '스즈미' },
  联邦学生会长: { cv: '悠木碧', cvJp: 'ゆうき あおい', nameJp: '連邦生徒会長', nameKr: '총학생회장' },
  彩奈: { cv: '小原好美', cvJp: 'おはら このみ', nameJp: 'アロナ', nameKr: '아로나' },
  普拉娜: { cv: '小原好美', cvJp: 'おはら このみ', nameJp: 'プラナ', nameKr: '프라나' },
}

/**
 * 韩语/特殊角色名到标准中文名称的对照
 */
export const KR_SPEAKER_TO_CN: Record<string, string> = {
  유우카: '优香',
  시로코: '白子',
  호시노: '星野',
  세리카: '芹香',
  아야네: '绫音',
  노노미: '野宫',
  히나: '日奈',
  아코: '亚子',
  이오리: '伊织',
  치나츠: '千夏',
  아루: '阿露',
  무츠키: '睦月',
  카요코: '佳代子',
  하루카: '遥香',
  하루나: '晴奈',
  준코: '淳子',
  후우카: '枫香',
  히후미: '日富美',
  아즈사: '梓',
  코하루: '小春',
  하나코: '花子',
  미카: '未花',
  나기사: '渚',
  세이아: '圣亚',
  츠루기: '鹤城',
  하스미: '莲实',
  린: '凛',
  모모카: '桃香',
  통신모모카: '桃香',
  스즈미: '铃美',
  아리스: '爱丽丝',
  미도리: '绿',
  모모이: '桃',
  유즈: '柚子',
  네루: '尼禄',
  카린: '花凛',
  아스나: '明日奈',
  아카네: '茜',
  토키: '时',
  이즈나: '泉奈',
  와카모: '若藻',
  미야코: '宫子',
  사키: '咲',
  미유: '美游',
  모에: '萌绘',
  사오리: '纱织',
  아츠코: '亚津子',
  미사키: '美咲',
  히요리: '日和',
  체리노: '切里诺',
  마리나: '玛利娜',
  토모에: '巴',
  아로나: '彩奈',
  프라나: '普拉娜',
  날카로운: '严肃的声音',
  신비한: '神秘的声音',
}

/**
 * 解析说话人名称与类型
 */
export function resolveSpeaker(
  scriptKr?: string,
  textCn?: string,
  textJp?: string
): { speaker: string; type: StoryBacklogLine['speakerType']; rawName?: string } {
  const cn = textCn || ''
  const jp = textJp || ''
  const kr = scriptKr || ''

  // 1. 选项分支或老师发言
  if (kr.includes('[ns]') || cn.startsWith('[ns]') || jp.startsWith('[ns]')) {
    return { speaker: '老师', type: 'sensei' }
  }
  if (kr.includes('[s1]') || cn.startsWith('[s1]') || jp.startsWith('[s1]') || cn.startsWith('[s]') || jp.startsWith('[s]')) {
    return { speaker: '老师 (选项)', type: 'sensei' }
  }

  // 2. 标题 / 场景 / 旁白
  if (kr.startsWith('#title;') || kr.startsWith('#TITLE;')) {
    return { speaker: '章节标题', type: 'system' }
  }
  if (kr.startsWith('#place;') || kr.startsWith('#PLACE;')) {
    return { speaker: '场景地点', type: 'system' }
  }
  if (kr.startsWith('#na;')) {
    const parts = kr.split(';')
    if (parts.length > 2 && parts[1].trim()) {
      const who = parts[1].trim()
      if (who === '???') return { speaker: '神秘少女 (???）', type: 'unknown' }
      return { speaker: who, type: 'student', rawName: who }
    }
    return { speaker: '旁白', type: 'narrator' }
  }

  // 3. 角色立绘台词：格式常为 "3;유우카 체육복ND;02;어라, 선생님?"
  const parts = kr.split(';')
  if (parts.length > 1) {
    const candidate = parts[1].trim().split('\n')[0].split(' ')[0]
    for (const [k, v] of Object.entries(KR_SPEAKER_TO_CN)) {
      if (candidate.includes(k)) {
        return { speaker: v, type: 'student', rawName: v }
      }
    }
    // 检查是否包含已知的中文人名
    for (const cnName of Object.values(studentNames as Record<string, string>)) {
      if (candidate.includes(cnName)) {
        return { speaker: cnName, type: 'student', rawName: cnName }
      }
    }
    if (candidate && !/^\d+$/.test(candidate) && !candidate.startsWith('[') && !candidate.startsWith('#')) {
      return { speaker: candidate, type: 'student', rawName: candidate }
    }
  }

  // 4. 括号心理活动 / 旁白
  if (cn.startsWith('（') && cn.endsWith('）')) {
    return { speaker: '旁白 (内心)', type: 'narrator' }
  }

  return { speaker: '旁白', type: 'narrator' }
}

/**
 * 格式化对白中的标记文本（替换 [USERNAME]、#n 换行等）
 */
export function formatDialogueText(rawText: string, userName = '老师'): string {
  if (!rawText) return ''
  return rawText
    .replace(/\[USERNAME\]/g, userName)
    .replace(/\[ns\]/g, '')
    .replace(/\[s\d*\]/g, '')
    .replace(/\[\/?s\]/g, '')
    .replace(/#n/g, '\n')
    .replace(/\[[0-9A-Fa-f]{6}\]/g, '') // 移除色彩标签如 [FF6666]
    .replace(/\[-\]/g, '')
    .trim()
}

/**
 * 获取 BGM 详细信息，支持回退
 */
export function getBgmInfo(bgmId: number): BgmTrackInfo {
  const hit = BGM_THEMES[bgmId]
  if (hit) {
    const themeName = hit.themeName
    return {
      id: bgmId,
      themeName,
      title: hit.title,
      composer: hit.composer,
      category: hit.category,
      streamUrl: `${CDN_BASE}/Audio/BGM/${themeName}.ogg`,
    }
  }

  const padNum = bgmId > 0 && bgmId < 100 ? String(bgmId).padStart(2, '0') : String(bgmId)
  const themeName = `Theme_${padNum}`
  return {
    id: bgmId,
    themeName,
    title: `BGM #${bgmId}`,
    composer: 'Blue Archive Sound Team',
    category: '日常',
    streamUrl: `${CDN_BASE}/Audio/BGM/${themeName}.ogg`,
  }
}

/**
 * 从完整的剧情 JSON 中解析所有对话、BGM 清单与登场声优
 */
export function extractStoryAnalysis(story: unknown, userName = '老师'): StoryAnalysisResult {
  const result: StoryAnalysisResult = {
    title: '剧情回溯',
    translator: undefined,
    totalLines: 0,
    voicedCount: 0,
    choicesCount: 0,
    backlog: [],
    playlist: [],
    cast: [],
  }

  if (!story || typeof story !== 'object') return result

  const raw = story as {
    chapterName?: string
    translator?: string
    content?: Array<{
      TextCn?: string
      TextJp?: string
      ScriptKr?: string
      VoiceJp?: string
      BGMId?: number
      Sound?: string
    }>
  }

  if (raw.chapterName) result.title = raw.chapterName
  if (raw.translator) result.translator = raw.translator

  const content = Array.isArray(raw.content) ? raw.content : []
  let currentBgmId: number | undefined
  const playlistMap = new Map<number, BgmTrackInfo>()
  const castMap = new Map<string, StudentCastInfo>()

  let lineCounter = 0

  for (let i = 0; i < content.length; i++) {
    const item = content[i]
    const textCn = formatDialogueText(item.TextCn || '', userName)
    const textJp = formatDialogueText(item.TextJp || '', userName)

    // 跳过纯指令行（无对白与文本）
    if (!textCn && !textJp) {
      if (item.BGMId && item.BGMId !== currentBgmId) {
        currentBgmId = item.BGMId
        if (!playlistMap.has(currentBgmId)) {
          const bgm = getBgmInfo(currentBgmId)
          bgm.firstLineIndex = lineCounter
          playlistMap.set(currentBgmId, bgm)
        }
      }
      continue
    }

    lineCounter++
    const { speaker, type, rawName } = resolveSpeaker(item.ScriptKr, item.TextCn, item.TextJp)
    const isChoice = (item.TextCn?.includes('[s1]') || item.ScriptKr?.includes('[s1]')) ?? false
    if (isChoice) result.choicesCount++

    let isBgmChange = false
    if (item.BGMId && item.BGMId !== currentBgmId) {
      currentBgmId = item.BGMId
      isBgmChange = true
      if (!playlistMap.has(currentBgmId)) {
        const bgm = getBgmInfo(currentBgmId)
        bgm.firstLineIndex = lineCounter
        playlistMap.set(currentBgmId, bgm)
      }
    }

    const voiceJp = item.VoiceJp?.trim()
    let voiceUrl: string | undefined
    if (voiceJp) {
      result.voicedCount++
      voiceUrl = `${CDN_BASE}/Audio/VoiceJp/${voiceJp}.ogg`
    }

    // 寻找匹配的立绘头像
    let speakerPortrait: string | undefined
    const cleanSpeaker = speaker.replace(/\(.*?\)/g, '').trim()
    if (portraitMap && (portraitMap as Record<string, string>)[cleanSpeaker]) {
      speakerPortrait = (portraitMap as Record<string, string>)[cleanSpeaker]
    }

    const academy = getAcademyByStudentName(cleanSpeaker)

    // 统计出场学生与 CV
    if (type === 'student' && cleanSpeaker && cleanSpeaker !== '旁白') {
      const cvData = STUDENT_CV_MAP[cleanSpeaker] || STUDENT_CV_MAP[rawName || '']
      const existing = castMap.get(cleanSpeaker)
      if (existing) {
        existing.linesCount++
        if (voiceJp) existing.voicedCount++
        if (!existing.sampleVoiceUrl && voiceUrl) existing.sampleVoiceUrl = voiceUrl
      } else {
        castMap.set(cleanSpeaker, {
          name: cleanSpeaker,
          nameJp: cvData?.nameJp,
          nameKr: cvData?.nameKr,
          cvName: cvData?.cv || '待收录',
          cvJp: cvData?.cvJp,
          portrait: speakerPortrait || `/images/portraits/default.webp`,
          academy,
          linesCount: 1,
          voicedCount: voiceJp ? 1 : 0,
          sampleVoiceUrl: voiceUrl,
        })
      }
    }

    result.backlog.push({
      id: `line-${i}`,
      index: lineCounter,
      speaker,
      speakerType: type,
      speakerPortrait,
      academy,
      textCn,
      textJp,
      voiceJp,
      voiceUrl,
      bgmId: currentBgmId,
      bgmInfo: currentBgmId ? playlistMap.get(currentBgmId) : undefined,
      isBgmChange,
      isChoice,
    })
  }

  result.totalLines = lineCounter
  result.playlist = Array.from(playlistMap.values())
  result.cast = Array.from(castMap.values()).sort((a, b) => b.linesCount - a.linesCount)

  return result
}
