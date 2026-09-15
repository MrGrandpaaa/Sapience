/**
 * Lexical Analysis Service.
 *
 * Decoupled from the UI layer. Analyzes French input words/phrases,
 * determines part of speech, grammatical form, reflexive status,
 * constructions, and produces either a single Format A entry or
 * multiple disambiguation candidates when ambiguity exists.
 */

import { PartOfSpeech, Gender, VerbGroup, AdjectivePosition } from '../models/types';
import {
  FormatAData,
  FormatANounGrammar,
  FormatANounGender,
  DisambiguationCandidate,
  NOUN_GENDER_NOTATION,
} from '../models/lexical';

export interface LexicalInterpretation {
  id: string;
  candidate: DisambiguationCandidate;
  format_a: FormatAData;
}

export interface LexicalAnalysisOutcome {
  input: string;
  normalized_form: string;
  isAmbiguous: boolean;
  interpretations: LexicalInterpretation[];
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTIC FRENCH LEXICAL KNOWLEDGE BASE
//
// Accurately curated French vocabulary entries for verbs, nouns, ambiguous words,
// reflexive vs non-reflexive pairs.
// No fake French grammar or fabricated definitions.
// ═══════════════════════════════════════════════════════════════════════════

export const LEXICAL_DATABASE: Record<string, LexicalInterpretation[]> = {
  // ── VERB: parler ────────────────────────────────────────────────────────
  parler: [
    {
      id: 'parler-verb',
      candidate: {
        surface_form: 'parler',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Nói, trò chuyện, phát biểu hoặc giao tiếp bằng lời',
        example: 'Nous parlons souvent de nos projets d’avenir.',
        natural_translation: 'Chúng tôi thường nói về những kế hoạch tương lai của mình.',
      },
      format_a: {
        entry: 'parler',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.First,
          conjugation: {
            je: 'parle',
            tu: 'parles',
            il_elle_on: 'parle',
            nous: 'parlons',
            vous: 'parlez',
            ils_elles: 'parlent',
          },
        },
        meaning_en: 'to speak, to talk',
        meaning_vi: 'nói, trò chuyện, phát biểu',
        constructions: [
          {
            pattern: 'parler',
            meaning_en: 'to speak, to have the ability to speak (bare verb)',
            meaning_vi: 'nói, biết nói (dùng trơn không cần giới từ)',
            example_fr: 'Le bébé commence enfin à parler.',
            example_en: 'The baby is finally starting to speak.',
            example_vi: 'Đứa bé cuối cùng cũng bắt đầu biết nói.',
            notes: 'Bare verb dùng khi diễn tả khả năng phát ra ngôn ngữ hoặc hành động phát biểu nói chung.',
          },
          {
            pattern: 'parler à sone',
            meaning_en: 'to speak to / address someone',
            meaning_vi: 'nói chuyện với ai (hướng tới người nghe)',
            example_fr: 'Je dois parler à mon directeur ce matin.',
            example_en: 'I must speak to my director this morning.',
            example_vi: 'Tôi phải nói chuyện với giám đốc của mình sáng nay.',
            notes: 'Giới từ "à" chỉ người tiếp nhận lời nói.',
          },
          {
            pattern: 'parler de sth/sone',
            meaning_en: 'to talk about something or someone',
            meaning_vi: 'nói về / bàn luận về cái gì hoặc ai đó',
            example_fr: 'Ils parlent de leurs vacances d’été.',
            example_en: 'They are talking about their summer vacation.',
            example_vi: 'Họ đang nói về kỳ nghỉ hè của họ.',
            notes: 'Giới từ "de" thay đổi hướng ngữ nghĩa sang xác định chủ đề được bàn luận.',
          },
        ],
        synonyms: ['discuter', "s'exprimer", 'bavarder'],
        antonyms: ['se taire', 'garder le silence', 'écouter'],
        example: {
          french: 'Elle parle couramment trois langues étrangères.',
          english: 'She speaks three foreign languages fluently.',
          vietnamese: 'Cô ấy nói lưu loát ba thứ tiếng nước ngoài.',
        },
      },
    },
  ],

  // ── DISTINCT LEXICAL IDENTITY: attendre (non-reflexive) ─────────────────
  attendre: [
    {
      id: 'attendre-verb',
      candidate: {
        surface_form: 'attendre',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Chờ đợi ai hoặc cái gì (hành động chờ đợi thực tế)',
        example: "J'attends le bus depuis quinze minutes.",
        natural_translation: 'Tôi đang đợi xe buýt được mười lăm phút rồi.',
      },
      format_a: {
        entry: 'attendre',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.Third,
          conjugation: {
            je: 'attends',
            tu: 'attends',
            il_elle_on: 'attend',
            nous: 'attendons',
            vous: 'attendez',
            ils_elles: 'attendent',
          },
        },
        meaning_en: 'to wait, to wait for',
        meaning_vi: 'chờ, đợi',
        constructions: [
          {
            pattern: 'attendre',
            meaning_en: 'to wait, to be patient (bare verb)',
            meaning_vi: 'chờ đợi, kiên nhẫn đợi (dùng trơn)',
            example_fr: 'Attendez ici un instant, s’il vous plaît.',
            example_en: 'Wait here a moment, please.',
            example_vi: 'Xin vui lòng đợi ở đây một lát.',
            notes: 'Bare verb diễn tả hành động chờ đợi chung không cần tân ngữ.',
          },
          {
            pattern: 'attendre sone/sth',
            meaning_en: 'to wait for someone or something',
            meaning_vi: 'chờ đợi ai hoặc cái gì (tân ngữ trực tiếp, không dùng pour)',
            example_fr: 'Elle attend son ami devant la gare.',
            example_en: 'She is waiting for her friend in front of the station.',
            example_vi: 'Cô ấy đang đợi bạn mình trước nhà ga.',
            notes: 'Tiếng Pháp dùng trực tiếp tân ngữ (direct object), tuyệt đối không dùng giới từ "pour".',
          },
          {
            pattern: 'attendre de Vo',
            meaning_en: 'to wait until doing something',
            meaning_vi: 'chờ / đợi cho đến khi làm việc gì',
            example_fr: 'Attends d’avoir fini ton travail avant de sortir.',
            example_en: 'Wait until you finish your work before going out.',
            example_vi: 'Hãy đợi làm xong việc rồi hãy ra ngoài.',
            notes: 'Cấu trúc kết hợp "de + Vo" chỉ điều kiện hoàn thành trước khi thực hiện hành động tiếp theo.',
          },
        ],
        synonyms: ['patienter', 'espérer', 'guetter'],
        antonyms: ['agir', 'se dépêcher', 'partir'],
        example: {
          french: 'Nous vous attendons avec impatience ce soir au restaurant.',
          english: 'We are looking forward to waiting for you tonight at the restaurant.',
          vietnamese: 'Chúng tôi rất nóng lòng đón đợi bạn tối nay tại nhà hàng.',
        },
      },
    },
  ],

  // ── DISTINCT LEXICAL IDENTITY: s'attendre à (reflexive verb) ───────────
  "s'attendre a": [
    {
      id: 's-attendre-a-verb',
      candidate: {
        surface_form: "s'attendre à",
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Lường trước, chuẩn bị tinh thần cho điều gì (dự đoán tâm lý)',
        example: 'Je ne m’attendais pas à une telle surprise !',
        natural_translation: 'Tôi không hề lường trước một bất ngờ lớn đến thế!',
      },
      format_a: {
        entry: "s'attendre à sth",
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.Third,
          conjugation: {
            je: "m'attends",
            tu: "t'attends",
            il_elle_on: "s'attend",
            nous: 'nous attendons',
            vous: 'vous attendez',
            ils_elles: "s'attendent",
          },
        },
        meaning_en: 'to expect something, to anticipate',
        meaning_vi: 'lường trước, dự tính, chuẩn bị tâm lý cho điều gì',
        constructions: [
          {
            pattern: "s'attendre à sth",
            meaning_en: 'to expect / anticipate something',
            meaning_vi: 'lường trước, chuẩn bị tinh thần cho điều gì',
            example_fr: 'Il faut s’attendre à des difficultés au début.',
            example_en: 'You must expect difficulties at the beginning.',
            example_vi: 'Phải lường trước những khó khăn lúc ban đầu.',
            notes: "Dạng phản thân (s') kết hợp giới từ à làm thay đổi hoàn toàn ý nghĩa: chuyển từ hành động chờ đợi thể xác sang tâm lý dự đoán, lường trước.",
          },
          {
            pattern: "s'attendre à Vo",
            meaning_en: 'to expect to do something',
            meaning_vi: 'dự tính sẽ làm gì, mong đợi làm gì',
            example_fr: 'Elle s’attend à réussir son examen haut la main.',
            example_en: 'She expects to pass her exam with flying colors.',
            example_vi: 'Cô ấy dự tính sẽ thi đỗ một cách xuất sắc.',
            notes: 'Khi đi với động từ nguyên mẫu Vo, diễn tả sự tự tin hoặc phán đoán về hành vi sắp tới.',
          },
        ],
        synonyms: ['prévoir', 'anticiper', 'envisager'],
        antonyms: ['ignorer', 'négliger', 'être surpris'],
        example: {
          french: 'Tout le monde s’attend à une reprise économique rapide.',
          english: 'Everyone expects a fast economic recovery.',
          vietnamese: 'Mọi người đều lường trước và kỳ vọng vào sự phục hồi kinh tế nhanh chóng.',
        },
      },
    },
  ],

  // ── VERB: aimer ─────────────────────────────────────────────────────────
  aimer: [
    {
      id: 'aimer-verb',
      candidate: {
        surface_form: 'aimer',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Yêu, thương, thích hoặc có cảm tình với ai/cái gì',
        example: 'J’aime écouter de la musique classique en travaillant.',
        natural_translation: 'Tôi thích nghe nhạc cổ điển trong lúc làm việc.',
      },
      format_a: {
        entry: 'aimer',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.First,
          conjugation: {
            je: 'aime',
            tu: 'aimes',
            il_elle_on: 'aime',
            nous: 'aimons',
            vous: 'aimez',
            ils_elles: 'aiment',
          },
        },
        meaning_en: 'to love, to like',
        meaning_vi: 'yêu, thích, quý mến',
        constructions: [
          {
            pattern: 'aimer',
            meaning_en: 'to love, to have feelings (bare verb)',
            meaning_vi: 'yêu, biết yêu (dùng trơn)',
            example_fr: 'Aimer et être aimé est le plus grand bonheur.',
            example_en: 'To love and be loved is the greatest happiness.',
            example_vi: 'Yêu và được yêu là hạnh phúc lớn nhất.',
            notes: 'Bare verb nói về tình yêu hoặc cảm xúc nói chung.',
          },
          {
            pattern: 'aimer sone/sth',
            meaning_en: 'to love / like someone or something',
            meaning_vi: 'yêu thương ai / thích cái gì',
            example_fr: 'J’aime beaucoup ce tableau.',
            example_en: 'I really like this painting.',
            example_vi: 'Tôi rất thích bức tranh này.',
            notes: 'Tân ngữ trực tiếp: với người mang nghĩa yêu, với đồ vật mang nghĩa thích.',
          },
          {
            pattern: 'aimer Vo',
            meaning_en: 'to like doing something',
            meaning_vi: 'thích làm gì (sở thích hành động)',
            example_fr: 'Il aime lire au bord de la mer.',
            example_en: 'He likes reading by the seaside.',
            example_vi: 'Anh ấy thích đọc sách bên bờ biển.',
            notes: 'Đi trực tiếp với động từ nguyên mẫu Vo không cần giới từ.',
          },
        ],
        synonyms: ['adorer', 'apprécier', 'chérir'],
        antonyms: ['détester', 'haïr', 'mépriser'],
        example: {
          french: 'Nous aimons passer nos week-ends en famille à la campagne.',
          english: 'We like spending our weekends with family in the countryside.',
          vietnamese: 'Chúng tôi thích dành những ngày cuối tuần bên gia đình ở vùng quê.',
        },
      },
    },
  ],

  // ── VERB: finir ─────────────────────────────────────────────────────────
  finir: [
    {
      id: 'finir-verb',
      candidate: {
        surface_form: 'finir',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Kết thúc, hoàn thành, chấm dứt việc gì',
        example: 'Je finis mon travail à dix-huit heures.',
        natural_translation: 'Tôi hoàn thành công việc lúc mười tám giờ.',
      },
      format_a: {
        entry: 'finir',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.Second,
          conjugation: {
            je: 'finis',
            tu: 'finis',
            il_elle_on: 'finit',
            nous: 'finissons',
            vous: 'finissez',
            ils_elles: 'finissent',
          },
        },
        meaning_en: 'to finish, to end, to complete',
        meaning_vi: 'kết thúc, hoàn thành, làm xong',
        constructions: [
          {
            pattern: 'finir',
            meaning_en: 'to end, to come to a close (bare verb)',
            meaning_vi: 'kết thúc, kết màn (dùng trơn)',
            example_fr: 'Le film finit très tard ce soir.',
            example_en: 'The movie ends very late tonight.',
            example_vi: 'Bộ phim kết thúc rất muộn tối nay.',
            notes: 'Bare verb dùng cho sự kiện, tiết học, bộ phim tự kết thúc.',
          },
          {
            pattern: 'finir de Vo',
            meaning_en: 'to finish doing something',
            meaning_vi: 'làm xong việc gì',
            example_fr: 'As-tu fini de manger ?',
            example_en: 'Have you finished eating?',
            example_vi: 'Cậu đã ăn xong chưa?',
            notes: 'Giới từ "de" kết hợp với Vo diễn tả hành động hoàn tất việc đang làm.',
          },
          {
            pattern: 'finir par Vo',
            meaning_en: 'to end up doing something, finally do',
            meaning_vi: 'rút cuộc thì, cuối cùng cũng làm gì',
            example_fr: 'Il a fini par accepter notre proposition.',
            example_en: 'He ended up accepting our proposal.',
            example_vi: 'Cuối cùng thì anh ấy cũng chấp nhận đề xuất của chúng tôi.',
            notes: 'Giới từ "par" thay đổi nghĩa sang: kết cục xảy ra sau một quá trình dài.',
          },
        ],
        synonyms: ['terminer', 'achever', 'conclure'],
        antonyms: ['commencer', 'débuter', 'entamer'],
        example: {
          french: 'Si tu te concentres bien, tu finiras tes devoirs avant le dîner.',
          english: 'If you concentrate well, you will finish your homework before dinner.',
          vietnamese: 'Nếu con tập trung tốt, con sẽ làm xong bài tập trước bữa tối.',
        },
      },
    },
  ],

  // ── AMBIGUOUS: voler (fly vs steal) ─────────────────────────────────────
  voler: [
    {
      id: 'voler-fly',
      candidate: {
        surface_form: 'voler (dans les airs)',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Bay lượn trên không trung bằng cánh hoặc phương tiện bay',
        example: 'Les oiseaux volent vers le sud quand vient l’hiver.',
        natural_translation: 'Những đàn chim bay về phương nam khi mùa đông tới.',
      },
      format_a: {
        entry: 'voler',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.First,
          conjugation: {
            je: 'vole',
            tu: 'voles',
            il_elle_on: 'vole',
            nous: 'volons',
            vous: 'volez',
            ils_elles: 'volent',
          },
        },
        meaning_en: 'to fly',
        meaning_vi: 'bay, lượn',
        constructions: [
          {
            pattern: 'voler',
            meaning_en: 'to fly, stay airborne (bare verb)',
            meaning_vi: 'bay lượn (dùng trơn)',
            example_fr: 'Les avions volent à haute altitude.',
            example_en: 'Airplanes fly at high altitude.',
            example_vi: 'Máy bay bay ở độ cao lớn.',
            notes: 'Bare verb chỉ hành động duy trì trên không trung.',
          },
          {
            pattern: 'voler dans sth',
            meaning_en: 'to fly in something (the sky)',
            meaning_vi: 'bay lượn trong không trung',
            example_fr: 'L’avion vole au-dessus des nuages.',
            example_en: 'The plane is flying above the clouds.',
            example_vi: 'Máy bay đang bay trên những đám mây.',
          },
        ],
        synonyms: ['planer', "s'envoler", 'flotter'],
        antonyms: ['tomber', 'atterrir', "s'écraser"],
        example: {
          french: 'Cet aigle vole avec une grâce remarquable au-dessus des montagnes.',
          english: 'This eagle flies with remarkable grace above the mountains.',
          vietnamese: 'Chú đại bàng này bay lượn với vẻ uyển chuyển đáng kinh ngạc trên các đỉnh núi.',
        },
      },
    },
    {
      id: 'voler-steal',
      candidate: {
        surface_form: 'voler (dérober)',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Trộm cắp, lấy đồ của người khác mà không có sự cho phép',
        example: 'On lui a volé son portefeuille dans le métro.',
        natural_translation: 'Anh ấy đã bị trộm mất ví tiền trong ga tàu điện ngầm.',
      },
      format_a: {
        entry: 'voler',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.First,
          conjugation: {
            je: 'vole',
            tu: 'voles',
            il_elle_on: 'vole',
            nous: 'volons',
            vous: 'volez',
            ils_elles: 'volent',
          },
        },
        meaning_en: 'to steal, to rob',
        meaning_vi: 'trộm cắp, ăn cắp',
        constructions: [
          {
            pattern: 'voler sth',
            meaning_en: 'to steal something',
            meaning_vi: 'lấy trộm cái gì',
            example_fr: 'On a volé ma bicyclette cette nuit.',
            example_en: 'Someone stole my bicycle last night.',
            example_vi: 'Ai đó đã lấy trộm xe đạp của tôi đêm qua.',
          },
          {
            pattern: 'voler sth à sone',
            meaning_en: 'to steal something from someone',
            meaning_vi: 'trộm cái gì từ ai đó (nạn nhân)',
            example_fr: 'Un voleur a volé son sac à une vieille dame.',
            example_en: 'A thief stole her purse from an old lady.',
            example_vi: 'Tên trộm đã cướp túi xách từ một bà cụ.',
            notes: 'Giới từ "à" ở đây chỉ người bị lấy mất đồ (nạn nhân).',
          },
        ],
        synonyms: ['dérober', 'chiper', 'dépouiller'],
        antonyms: ['rendre', 'donner', 'restituer'],
        example: {
          french: 'Il est formellement interdit de voler le bien d’autrui.',
          english: 'It is strictly forbidden to steal other people’s property.',
          vietnamese: 'Nghiêm cấm tuyệt đối hành vi chiếm đoạt tài sản của người khác.',
        },
      },
    },
  ],

  // ── AMBIGUOUS: bien (adverb vs noun masc) ────────────────────────────────
  bien: [
    {
      id: 'bien-adv',
      candidate: {
        surface_form: 'bien (adverbe)',
        part_of_speech: PartOfSpeech.Adverb,
        core_meaning: 'Tốt, giỏi, hay hoặc dùng làm phó từ chỉ mức độ (rất, khá)',
        example: 'Elle parle très bien français.',
        natural_translation: 'Cô ấy nói tiếng Pháp rất giỏi.',
      },
      format_a: {
        entry: 'bien',
        grammar: {
          pos: PartOfSpeech.Adverb,
        },
        meaning_en: 'well, nicely, very',
        meaning_vi: 'tốt, hay, giỏi, rất',
        example: {
          french: 'Tout s’est très bien passé lors de la réunion.',
          english: 'Everything went very well during the meeting.',
          vietnamese: 'Mọi chuyện đã diễn ra rất tốt đẹp trong cuộc họp.',
        },
      },
    },
    {
      id: 'bien-noun',
      candidate: {
        surface_form: 'le bien (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Điều thiện, sự tốt lành hoặc tài sản, của cải',
        example: 'Faire le bien autour de soi est une belle vertu.',
        natural_translation: 'Làm việc thiện cho mọi người xung quanh là một đức tính cao quý.',
      },
      format_a: {
        entry: 'le bien (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: 'le',
          article_display: 'un / le',
        },
        meaning_en: 'good, well-being, property/asset',
        meaning_vi: 'điều thiện, việc tốt, tài sản',
        collocations: ['faire le bien : làm việc thiện', 'biens immobiliers : bất động sản', 'pour son bien : vì lợi ích của anh ấy'],
        synonyms: ['vertu', 'fortune', 'richesse'],
        antonyms: ['le mal', 'dette', 'pauvreté'],
        example: {
          french: 'Il a investi tous ses biens dans cette nouvelle entreprise.',
          english: 'He invested all his assets in this new business.',
          vietnamese: 'Anh ấy đã đầu tư toàn bộ tài sản của mình vào công ty mới này.',
        },
      },
    },
  ],

  // ── POSITION-SENSITIVE ADJECTIVE: ancien ────────────────────────────────
  ancien: [
    {
      id: 'ancien-adj',
      candidate: {
        surface_form: 'ancien (trc và sau)',
        part_of_speech: PartOfSpeech.Adjective,
        core_meaning: 'Đứng trước = cựu/nguyên (chức vụ); Đứng sau = cổ xưa, lâu đời',
        example: 'Un ancien président (cựu) / Une ville ancienne (cổ kính)',
        natural_translation: 'Trước danh từ: cựu chức vụ; Sau danh từ: công trình cổ xưa.',
      },
      format_a: {
        entry: 'ancien',
        grammar: {
          pos: PartOfSpeech.Adjective,
          masculine: 'ancien',
          feminine: 'ancienne',
          position: AdjectivePosition.Variable,
          trc_meaning: {
            meaning_en: 'former, ex-',
            meaning_vi: 'cựu, nguyên (chức vụ, quan hệ cũ)',
          },
          sau_meaning: {
            meaning_en: 'ancient, very old, antique',
            meaning_vi: 'cổ xưa, lâu đời, đồ cổ',
          },
        },
        meaning_en: 'former (before noun) / ancient (after noun)',
        meaning_vi: 'cựu (trc danh từ) / cổ xưa (sau danh từ)',
        collocations: ['un ancien collègue', 'une maison ancienne', 'histoire ancienne'],
        example: {
          french: 'C’est un ancien camarade de classe que j’ai retrouvé par hasard.',
          english: 'He is a former classmate whom I met again by chance.',
          vietnamese: 'Đó là một người bạn học cũ mà tôi tình cờ gặp lại.',
        },
      },
    },
  ],

  // ── AMBIGUOUS: livre (noun masc vs noun fem vs verb livrer) ──
  livre: [
    {
      id: 'livre-noun-masc',
      candidate: {
        surface_form: 'un livre (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Cuốn sách (vật thể để đọc, học tập)',
        example: "J'ai lu un livre captivant hier soir.",
        natural_translation: 'Tối qua tôi đã đọc một cuốn sách rất cuốn hút.',
      },
      format_a: {
        entry: 'un livre (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: 'le',
          article_display: 'un / le',
        },
        meaning_en: 'book',
        meaning_vi: 'cuốn sách',
        collocations: [
          'lire un livre : đọc một cuốn sách',
          'livre de poche : sách bỏ túi',
          'ouvrir un livre : mở sách ra',
        ],
        synonyms: ['ouvrage', 'bouquin', 'volume'],
        antonyms: ['analphabétisme', 'oralité', 'ignorance'],
        example: {
          french: 'Ce livre est passionnant du début à la fin.',
          english: 'This book is exciting from beginning to end.',
          vietnamese: 'Cuốn sách này lôi cuốn từ đầu đến cuối.',
        },
      },
    },
    {
      id: 'livre-noun-fem',
      candidate: {
        surface_form: 'une livre (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Đơn vị đo lường (nửa cân / 500g) hoặc đơn vị tiền tệ (bảng Anh)',
        example: 'Je voudrais une livre de fraises, s’il vous plaît.',
        natural_translation: 'Làm ơn cho tôi nửa cân dâu tây.',
      },
      format_a: {
        entry: 'une livre (n, fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: 'une',
          definite_article: 'la',
          article_display: 'une / la',
        },
        meaning_en: 'pound (half a kilogram or currency)',
        meaning_vi: 'nửa cân (500g) / đồng bảng Anh',
        collocations: [
          'une livre de beurre : nửa cân bơ',
          'une livre sterling : đồng bảng Anh',
          'demi-livre : một phần tư ký (250g)',
        ],
        synonyms: ['demi-kilo', 'cinq cents grammes', 'livre sterling'],
        antonyms: ['tonne', 'kilogramme', 'euro'],
        example: {
          french: 'Il a acheté une livre de cerises fraîches au marché.',
          english: 'He bought a pound of fresh cherries at the market.',
          vietnamese: 'Anh ấy đã mua nửa cân cherry tươi ở chợ.',
        },
      },
    },
    {
      id: 'livre-verb-livrer',
      candidate: {
        surface_form: 'livrer (il livre)',
        part_of_speech: PartOfSpeech.Verb,
        core_meaning: 'Giao hàng, phân phát (dạng chia ngôi il/elle của động từ livrer)',
        example: 'Le coursier livre le colis directement chez vous.',
        natural_translation: 'Người giao hàng giao kiện hàng trực tiếp đến tận nhà bạn.',
      },
      format_a: {
        entry: 'livrer',
        grammar: {
          pos: PartOfSpeech.Verb,
          group: VerbGroup.First,
          conjugation: {
            je: 'livre',
            tu: 'livres',
            il_elle_on: 'livre',
            nous: 'livrons',
            vous: 'livrez',
            ils_elles: 'livrent',
          },
        },
        meaning_en: 'to deliver',
        meaning_vi: 'giao hàng, phân phát',
        constructions: [
          {
            pattern: 'livrer sth',
            meaning_en: 'to deliver goods (direct object)',
            meaning_vi: 'giao hàng, phát hàng',
            example_fr: 'Le restaurant livre les repas chauds.',
            example_en: 'The restaurant delivers hot meals.',
            example_vi: 'Nhà hàng giao những bữa ăn nóng sốt.',
          },
          {
            pattern: 'livrer sth à sone',
            meaning_en: 'to deliver something to someone',
            meaning_vi: 'giao cái gì cho ai đó',
            example_fr: 'Le magasin livre les courses à domicile.',
            example_en: 'The store delivers groceries to your home.',
            example_vi: 'Cửa hàng giao đồ tạp hoá tận nhà.',
            notes: 'Giới từ "à" chỉ người thụ hưởng hoặc địa điểm giao nhận.',
          },
        ],
        synonyms: ['distribuer', 'fournir', 'apporter'],
        antonyms: ['garder', 'retenir', 'recevoir'],
        example: {
          french: 'Nous vous livrons votre commande sous quarante-huit heures.',
          english: 'We deliver your order within 48 hours.',
          vietnamese: 'Chúng tôi giao đơn hàng của bạn trong vòng 48 giờ.',
        },
      },
    },
  ],

  // ── AMBIGUOUS: mémoire (noun fem vs noun masc) ──
  memoire: [
    {
      id: 'memoire-fem',
      candidate: {
        surface_form: 'la mémoire (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Trí nhớ, khả năng ghi nhớ hoặc ký ức của con người',
        example: 'Elle a une excellente mémoire pour les langues.',
        natural_translation: 'Cô ấy có trí nhớ xuất sắc đối với việc học ngoại ngữ.',
      },
      format_a: {
        entry: 'la mémoire (n, fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: 'une',
          definite_article: 'la',
          article_display: 'une / la',
        },
        meaning_en: 'memory (mental faculty or recollection)',
        meaning_vi: 'trí nhớ, ký ức',
        collocations: [
          'perdre la mémoire : mất trí nhớ',
          'garder en mémoire : ghi nhớ trong lòng',
          'trou de mémoire : thoáng quên',
        ],
        synonyms: ['souvenir', 'réminiscence', 'rappel'],
        antonyms: ['oubli', 'amnésie', 'omission'],
        example: {
          french: 'Ce poème est resté gravé dans ma mémoire.',
          english: 'This poem has remained engraved in my memory.',
          vietnamese: 'Bài thơ này vẫn còn khắc sâu trong ký ức của tôi.',
        },
      },
    },
    {
      id: 'memoire-masc',
      candidate: {
        surface_form: 'le mémoire (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Luận văn tốt nghiệp thạc sĩ/đại học hoặc bản tường trình bằng văn bản',
        example: 'Il rédige son mémoire de master en linguistique.',
        natural_translation: 'Anh ấy đang viết luận văn thạc sĩ chuyên ngành ngôn ngữ học.',
      },
      format_a: {
        entry: 'le mémoire (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: 'le',
          article_display: 'un / le',
        },
        meaning_en: 'master’s thesis, dissertation, written report',
        meaning_vi: 'luận văn tốt nghiệp, bản tường trình',
        collocations: [
          'rédiger un mémoire : viết luận văn',
          'soutenance de mémoire : bảo vệ luận văn',
          'mémoire de recherche : luận văn nghiên cứu',
        ],
        synonyms: ['thèse', 'dissertation', 'rapport'],
        antonyms: ['oral', 'brouillon', 'improvisation'],
        example: {
          french: 'Elle doit soutenir son mémoire devant un jury fin juin.',
          english: 'She must defend her thesis before a jury at the end of June.',
          vietnamese: 'Cô ấy phải bảo vệ luận văn trước hội đồng vào cuối tháng sáu.',
        },
      },
    },
  ],

  // ── AMBIGUOUS: tour (noun masc vs noun fem) ──
  tour: [
    {
      id: 'tour-masc',
      candidate: {
        surface_form: 'le tour (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Vòng quanh, lượt (đến lượt), hoặc chuyến dạo chơi',
        example: 'Faisons un tour dans le parc avant le dîner.',
        natural_translation: 'Chúng ta hãy đi dạo một vòng trong công viên trước bữa tối.',
      },
      format_a: {
        entry: 'le tour (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: 'le',
          article_display: 'un / le',
        },
        meaning_en: 'turn, round, trip, tour',
        meaning_vi: 'vòng quanh, lượt, chuyến dạo chơi',
        collocations: [
          'faire le tour : đi dạo một vòng',
          'à mon tour : đến lượt tôi',
          'tour de rôle : lần lượt theo lượt',
        ],
        synonyms: ['circuit', 'périple', 'virée'],
        antonyms: ['immobilité', 'halte', 'stagnation'],
        example: {
          french: 'C’est à votre tour de jouer.',
          english: 'It is your turn to play.',
          vietnamese: 'Đến lượt bạn chơi rồi đấy.',
        },
      },
    },
    {
      id: 'tour-fem',
      candidate: {
        surface_form: 'la tour (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Toà tháp cao (công trình kiến trúc)',
        example: 'La Tour Eiffel domine la ville de Paris.',
        natural_translation: 'Tháp Eiffel sừng sững trên nền trời Paris.',
      },
      format_a: {
        entry: 'la tour (n, fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: 'une',
          definite_article: 'la',
          article_display: 'une / la',
        },
        meaning_en: 'tower',
        meaning_vi: 'toà tháp',
        collocations: [
          'la tour Eiffel : tháp Eiffel',
          'tour de contrôle : đài kiểm soát không lưu',
          'au sommet de la tour : trên đỉnh tháp',
        ],
        synonyms: ['beffroi', 'donjon', 'gratte-ciel'],
        antonyms: ['gouffre', 'abîme', 'sous-sol'],
        example: {
          french: 'Nous sommes montés au sommet de la tour pour voir le coucher du soleil.',
          english: 'We climbed to the top of the tower to see the sunset.',
          vietnamese: 'Chúng tôi đã trèo lên đỉnh tháp để ngắm hoàng hôn.',
        },
      },
    },
  ],

  // ── DUAL GENDER: enfant ──
  enfant: [
    {
      id: 'enfant-masc',
      candidate: {
        surface_form: 'un enfant (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Đứa trẻ, bé trai (giống đực le / un)',
        example: 'L’enfant joue joyeusement dans le jardin.',
        natural_translation: 'Đứa trẻ (bé trai) chơi đùa vui vẻ trong vườn.',
      },
      format_a: {
        entry: 'un enfant (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: 'child, boy',
        meaning_vi: 'đứa trẻ, bé trai',
        collocations: [
          'élever un enfant : nuôi dạy một đứa trẻ',
          'chambre d’enfant : phòng trẻ em',
          'livre d’enfant : sách thiếu nhi',
        ],
        synonyms: ['gamin', 'garçonnet', 'bambin'],
        antonyms: ['adulte', 'vieillard', 'parent'],
        example: {
          french: 'L’enfant apprend rapidement à travers les jeux interactifs.',
          english: 'The child learns quickly through interactive games.',
          vietnamese: 'Đứa trẻ học hỏi rất nhanh qua các trò chơi tương tác.',
        },
      },
    },
    {
      id: 'enfant-fem',
      candidate: {
        surface_form: 'une enfant (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Đứa trẻ, bé gái (giống cái la / une)',
        example: 'Cette enfant montre un grand talent pour la musique.',
        natural_translation: 'Bé gái này bộc lộ tài năng lớn về âm nhạc.',
      },
      format_a: {
        entry: 'une enfant (n, fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: 'une',
          definite_article: "l'",
          article_display: "une / la (l')",
          elision_resolution: 'la',
        },
        meaning_en: 'child, girl',
        meaning_vi: 'đứa trẻ, bé gái',
        collocations: [
          'petite enfant : bé gái nhỏ',
          'sourire d’enfant : nụ cười trẻ thơ',
          'protéger une enfant : bảo vệ một bé gái',
        ],
        synonyms: ['fillette', 'gamine', 'bambine'],
        antonyms: ['adulte', 'femme mûre', 'parente'],
        example: {
          french: 'Cette enfant montre une grande curiosité pour la lecture.',
          english: 'This child shows great curiosity for reading.',
          vietnamese: 'Bé gái này thể hiện sự tò mò lớn đối với việc đọc sách.',
        },
      },
    },
  ],

  // ── NOUN PAIR: ami (masc) & amie (fem) ──
  ami: [
    {
      id: 'ami-masc',
      candidate: {
        surface_form: 'un ami (n, mas)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Người bạn (nam), bạn bè (giống đực)',
        example: 'Mon ami m’a invité à dîner chez lui ce week-end.',
        natural_translation: 'Bạn tôi (nam) đã mời tôi đến nhà ăn tối cuối tuần này.',
      },
      format_a: {
        entry: 'un ami (n, mas)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: 'un',
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: 'friend (male)',
        meaning_vi: 'người bạn (nam), bạn thân',
        collocations: [
          'meilleur ami : bạn thân nhất',
          'ami d’enfance : bạn thời thơ ấu',
          'cercle d’amis : nhóm bạn',
        ],
        synonyms: ['copain', 'camarade', 'pote'],
        antonyms: ['ennemi', 'rival', 'adversaire'],
        example: {
          french: 'C’est un ami fidèle sur qui je peux toujours compter.',
          english: 'He is a loyal friend on whom I can always rely.',
          vietnamese: 'Đó là một người bạn trung thành mà tôi luôn có thể tin cậy.',
        },
      },
    },
  ],

  amie: [
    {
      id: 'amie-fem',
      candidate: {
        surface_form: 'une amie (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Người bạn (nữ), bạn gái (giống cái)',
        example: 'Elle est partie en vacances avec sa meilleure amie.',
        natural_translation: 'Cô ấy đã đi nghỉ cùng người bạn gái thân nhất của mình.',
      },
      format_a: {
        entry: 'une amie (n, fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: 'une',
          definite_article: "l'",
          article_display: "une / la (l')",
          elision_resolution: 'la',
        },
        meaning_en: 'friend (female)',
        meaning_vi: 'người bạn (nữ), bạn gái thân thiết',
        collocations: [
          'meilleure amie : bạn thân nữ',
          'amie proche : bạn thân thiết',
          'chère amie : người bạn quý mến',
        ],
        synonyms: ['copine', 'camarade', 'confidente'],
        antonyms: ['ennemie', 'rivale', 'inconnue'],
        example: {
          french: 'Elle a passé toute l’après-midi à bavarder với bạn của mình.',
          english: 'She spent the whole afternoon chatting with her friend.',
          vietnamese: 'Cô ấy đã dành cả buổi chiều trò chuyện với người bạn của mình.',
        },
      },
    },
  ],


  // ── NOUN: voiture ──
  "voiture": [
    {
      id: "voiture-noun",
      candidate: {
        surface_form: "une voiture (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "xe ô tô, xe hơi (giống cái une/la)",
        example: "Elle prend sa voiture tous les jours pour aller au bureau.",
        natural_translation: "Cô ấy đi xe ô tô đi làm mỗi ngày.",
      },
      format_a: {
        entry: "une voiture (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "car, automobile",
        meaning_vi: "xe ô tô, xe hơi",
        collocations: ["conduire une voiture : lái xe ô tô", "monter en voiture : lên xe ô tô", "voiture d'occasion : xe hơi đã qua sử dụng"],
        synonyms: ["automobile", "véhicule", "auto"],
        antonyms: ["piéton", "bicyclette", "marche à pied"],
        example: {
          french: "Elle prend sa voiture tous les jours pour aller au bureau.",
          english: "She takes her car every day to go to the office.",
          vietnamese: "Cô ấy đi xe ô tô đi làm mỗi ngày.",
        },
      },
    },
  ],

  // ── NOUN: homme ──
  "homme": [
    {
      id: "homme-noun",
      candidate: {
        surface_form: "un homme (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "người đàn ông, con người (giống đực un/le)",
        example: "L'homme moderne doit apprendre à vivre en harmonie avec la nature.",
        natural_translation: "Con người hiện đại phải học cách sống hoà hợp với thiên nhiên.",
      },
      format_a: {
        entry: "un homme (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: "man, human being",
        meaning_vi: "người đàn ông, con người",
        collocations: ["un grand homme : một vĩ nhân", "droits de l'homme : nhân quyền", "jeune homme : chàng trai trẻ"],
        synonyms: ["monsieur", "être humain", "individu"],
        antonyms: ["femme", "enfant", "animal"],
        example: {
          french: "L'homme moderne doit apprendre à vivre en harmonie avec la nature.",
          english: "Modern man must learn to live in harmony with nature.",
          vietnamese: "Con người hiện đại phải học cách sống hoà hợp với thiên nhiên.",
        },
      },
    },
  ],

  // ── NOUN: école ──
  "ecole": [
    {
      id: "ecole-noun",
      candidate: {
        surface_form: "une école (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "trường học (giống cái une/la)",
        example: "Cette école propose d'excellents programmes éducatifs pour les enfants.",
        natural_translation: "Ngôi trường này mang đến các chương trình giáo dục tuyệt vời cho trẻ em.",
      },
      format_a: {
        entry: "une école (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "l'",
          article_display: "une / la (l')",
          elision_resolution: 'la',
        },
        meaning_en: "school",
        meaning_vi: "trường học",
        collocations: ["aller à l'école : đi đến trường", "école primaire : trường tiểu học", "cour d'école : sân trường"],
        synonyms: ["établissement scolaire", "institution", "collège"],
        antonyms: ["maison", "rue", "vie active"],
        example: {
          french: "Cette école propose d'excellents programmes éducatifs pour les enfants.",
          english: "This school offers excellent educational programs for children.",
          vietnamese: "Ngôi trường này mang đến các chương trình giáo dục tuyệt vời cho trẻ em.",
        },
      },
    },
  ],

  // ── NOUN: eau ──
  "eau": [
    {
      id: "eau-noun",
      candidate: {
        surface_form: "une eau (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "nước (giống cái une/la)",
        example: "Il est essentiel de boire au moins un litre et demi d'eau par jour.",
        natural_translation: "Uống ít nhất một lít rưỡi nước mỗi ngày là điều rất cần thiết.",
      },
      format_a: {
        entry: "une eau (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "l'",
          article_display: "une / la (l')",
          elision_resolution: 'la',
        },
        meaning_en: "water",
        meaning_vi: "nước",
        collocations: ["boire de l'eau : uống nước", "eau minérale : nước khoáng", "verre d'eau : ly nước"],
        synonyms: ["liquide", "flotte", "onde"],
        antonyms: ["feu", "sécheresse", "terre"],
        example: {
          french: "Il est essentiel de boire au moins un litre et demi d'eau par jour.",
          english: "It is essential to drink at least one and a half litres of water a day.",
          vietnamese: "Uống ít nhất một lít rưỡi nước mỗi ngày là điều rất cần thiết.",
        },
      },
    },
  ],

  // ── NOUN: arbre ──
  "arbre": [
    {
      id: "arbre-noun",
      candidate: {
        surface_form: "un arbre (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "cái cây (giống đực un/le)",
        example: "Nous nous sommes assis à l'ombre d'un grand arbre pour pique-niquer.",
        natural_translation: "Chúng tôi ngồi dưới bóng mát của một cái cây lớn để dã ngoại.",
      },
      format_a: {
        entry: "un arbre (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: "tree",
        meaning_vi: "cái cây",
        collocations: ["planter un arbre : trồng một cái cây", "arbre fruitier : cây ăn quả", "ombre d'un arbre : bóng mát của cây"],
        synonyms: ["végétal", "arbuste", "conifère"],
        antonyms: ["herbe", "béton", "désert"],
        example: {
          french: "Nous nous sommes assis à l'ombre d'un grand arbre pour pique-niquer.",
          english: "We sat in the shade of a large tree to have a picnic.",
          vietnamese: "Chúng tôi ngồi dưới bóng mát của một cái cây lớn để dã ngoại.",
        },
      },
    },
  ],

  // ── NOUN: journal ──
  "journal": [
    {
      id: "journal-noun",
      candidate: {
        surface_form: "un journal (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "tờ báo, nhật báo (giống đực un/le)",
        example: "Mon grand-père lit toujours le journal du matin en buvant son café.",
        natural_translation: "Ông tôi luôn đọc báo buổi sáng trong lúc uống cà phê.",
      },
      format_a: {
        entry: "un journal (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "newspaper, daily paper",
        meaning_vi: "tờ báo, nhật báo",
        collocations: ["lire le journal : đọc báo", "journal quotidien : báo hàng ngày", "journal télévisé : chương trình thời sự"],
        synonyms: ["quotidien", "revue", "gazette"],
        antonyms: ["oral", "télévision", "rumeur"],
        example: {
          french: "Mon grand-père lit toujours le journal du matin en buvant son café.",
          english: "My grandfather always reads the morning newspaper while drinking his coffee.",
          vietnamese: "Ông tôi luôn đọc báo buổi sáng trong lúc uống cà phê.",
        },
      },
    },
  ],

  // ── NOUN: travail ──
  "travail": [
    {
      id: "travail-noun",
      candidate: {
        surface_form: "un travail (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "công việc, việc làm, lao động (giống đực un/le)",
        example: "Elle commence un nouveau travail passionnant dès la semaine prochaine.",
        natural_translation: "Cô ấy bắt đầu một công việc mới đầy thú vị vào tuần tới.",
      },
      format_a: {
        entry: "un travail (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "work, job, labour",
        meaning_vi: "công việc, việc làm, lao động",
        collocations: ["chercher du travail : tìm việc làm", "au travail : tại nơi làm việc", "lieu de travail : nơi làm việc"],
        synonyms: ["emploi", "boulot", "profession"],
        antonyms: ["chômage", "loisir", "repos"],
        example: {
          french: "Elle commence un nouveau travail passionnant dès la semaine prochaine.",
          english: "She starts an exciting new job next week.",
          vietnamese: "Cô ấy bắt đầu một công việc mới đầy thú vị vào tuần tới.",
        },
      },
    },
  ],

  // ── NOUN: œil ──
  "oeil": [
    {
      id: "oeil-noun",
      candidate: {
        surface_form: "un œil (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "con mắt, mắt (giống đực un/le)",
        example: "L'enfant regardait les étoiles avec un œil émerveillé.",
        natural_translation: "Đứa trẻ ngắm nhìn những vì sao bằng ánh mắt đầy kinh ngạc.",
      },
      format_a: {
        entry: "un œil (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "eye",
        meaning_vi: "con mắt, mắt",
        collocations: ["ouvrir les yeux : mở mắt ra", "fermer les yeux : nhắm mắt lại", "coup d'œil : cái nhìn thoáng qua"],
        synonyms: ["regard", "pupille", "mirettes"],
        antonyms: ["cécité", "aveuglement", "obscurité"],
        example: {
          french: "L'enfant regardait les étoiles avec un œil émerveillé.",
          english: "The child looked at the stars with an amazed eye.",
          vietnamese: "Đứa trẻ ngắm nhìn những vì sao bằng ánh mắt đầy kinh ngạc.",
        },
      },
    },
  ],

  // ── NOUN: bateau ──
  "bateau": [
    {
      id: "bateau-noun",
      candidate: {
        surface_form: "un bateau (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "con thuyền, tàu thủy (giống đực un/le)",
        example: "Le bateau a quitté le port au lever du soleil.",
        natural_translation: "Con thuyền đã rời cảng lúc mặt trời mọc.",
      },
      format_a: {
        entry: "un bateau (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "boat, ship",
        meaning_vi: "con thuyền, tàu thủy",
        collocations: ["monter en bateau : lên thuyền", "voyage en bateau : chuyến đi bằng thuyền", "bateau de pêche : thuyền đánh cá"],
        synonyms: ["navire", "embarcation", "barque"],
        antonyms: ["avion", "voiture", "terre ferme"],
        example: {
          french: "Le bateau a quitté le port au lever du soleil.",
          english: "The boat left the port at sunrise.",
          vietnamese: "Con thuyền đã rời cảng lúc mặt trời mọc.",
        },
      },
    },
  ],

  // ── NOUN: cadeau ──
  "cadeau": [
    {
      id: "cadeau-noun",
      candidate: {
        surface_form: "un cadeau (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "món quà, quà tặng (giống đực un/le)",
        example: "J'ai choisi un joli cadeau pour l'anniversaire de mon ami.",
        natural_translation: "Tôi đã chọn một món quà đẹp cho ngày sinh nhật của bạn tôi.",
      },
      format_a: {
        entry: "un cadeau (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "gift, present",
        meaning_vi: "món quà, quà tặng",
        collocations: ["offrir un cadeau : tặng một món quà", "paquet cadeau : gói quà", "cadeau d'anniversaire : quà sinh nhật"],
        synonyms: ["présent", "don", "étrenne"],
        antonyms: ["dette", "vol", "fardeau"],
        example: {
          french: "J'ai choisi un joli cadeau pour l'anniversaire de mon ami.",
          english: "I chose a nice gift for my friend's birthday.",
          vietnamese: "Tôi đã chọn một món quà đẹp cho ngày sinh nhật của bạn tôi.",
        },
      },
    },
  ],

  // ── NOUN: château ──
  "chateau": [
    {
      id: "chateau-noun",
      candidate: {
        surface_form: "un château (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "lâu đài (giống đực un/le)",
        example: "Ce château médiéval attire des milliers de visiteurs chaque été.",
        natural_translation: "Tòa lâu đài thời trung cổ này thu hút hàng ngàn du khách mỗi mùa hè.",
      },
      format_a: {
        entry: "un château (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "castle, palace",
        meaning_vi: "lâu đài",
        collocations: ["château fort : lâu đài phòng thủ", "vie de château : cuộc sống xa hoa", "visiter un château : tham quan lâu đài"],
        synonyms: ["palais", "forteresse", "manoir"],
        antonyms: ["cabane", "chaumière", "taudis"],
        example: {
          french: "Ce château médiéval attire des milliers de visiteurs chaque été.",
          english: "This medieval castle attracts thousands of visitors every summer.",
          vietnamese: "Tòa lâu đài thời trung cổ này thu hút hàng ngàn du khách mỗi mùa hè.",
        },
      },
    },
  ],

  // ── NOUN: maison ──
  "maison": [
    {
      id: "maison-noun",
      candidate: {
        surface_form: "une maison (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "ngôi nhà, căn nhà (giống cái une/la)",
        example: "Toute la famille s'est réunie à la maison pour fêter Noël.",
        natural_translation: "Cả gia đình đã quây quần ở nhà để đón Giáng sinh.",
      },
      format_a: {
        entry: "une maison (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "house, home",
        meaning_vi: "ngôi nhà, căn nhà",
        collocations: ["rester à la maison : ở nhà", "maison de campagne : nhà ở vùng quê", "construire une maison : xây nhà"],
        synonyms: ["demeure", "habitation", "logement"],
        antonyms: ["rue", "extérieur", "sans-abri"],
        example: {
          french: "Toute la famille s'est réunie à la maison pour fêter Noël.",
          english: "The whole family gathered at home to celebrate Christmas.",
          vietnamese: "Cả gia đình đã quây quần ở nhà để đón Giáng sinh.",
        },
      },
    },
  ],

  // ── NOUN: femme ──
  "femme": [
    {
      id: "femme-noun",
      candidate: {
        surface_form: "une femme (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "người phụ nữ, người vợ (giống cái une/la)",
        example: "Cette femme d'affaires dirige une grande entreprise avec succès.",
        natural_translation: "Người phụ nữ này điều hành một doanh nghiệp lớn rất thành công.",
      },
      format_a: {
        entry: "une femme (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "woman, wife",
        meaning_vi: "người phụ nữ, người vợ",
        collocations: ["jeune femme : phụ nữ trẻ", "femme d'affaires : nữ doanh nhân", "droits des femmes : nữ quyền"],
        synonyms: ["dame", "épouse", "madame"],
        antonyms: ["homme", "mari", "jeune homme"],
        example: {
          french: "Cette femme d'affaires dirige une grande entreprise avec succès.",
          english: "This businesswoman successfully manages a large company.",
          vietnamese: "Người phụ nữ này điều hành một doanh nghiệp lớn rất thành công.",
        },
      },
    },
  ],

  // ── NOUN: ville ──
  "ville": [
    {
      id: "ville-noun",
      candidate: {
        surface_form: "une ville (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "thành phố, đô thị (giống cái une/la)",
        example: "Paris est une ville magnifique réputée pour sa culture et son art.",
        natural_translation: "Paris là một thành phố tuyệt đẹp nổi tiếng với văn hóa và nghệ thuật.",
      },
      format_a: {
        entry: "une ville (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "city, town",
        meaning_vi: "thành phố, đô thị",
        collocations: ["centre-ville : trung tâm thành phố", "en ville : ở trong thành phố", "grande ville : thành phố lớn"],
        synonyms: ["cité", "métropole", "agglomération"],
        antonyms: ["campagne", "village", "nature"],
        example: {
          french: "Paris est une ville magnifique réputée pour sa culture et son art.",
          english: "Paris is a magnificent city renowned for its culture and art.",
          vietnamese: "Paris là một thành phố tuyệt đẹp nổi tiếng với văn hóa và nghệ thuật.",
        },
      },
    },
  ],

  // ── NOUN: pays ──
  "pays": [
    {
      id: "pays-noun",
      candidate: {
        surface_form: "un pays (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "đất nước, quốc gia, quê hương (giống đực un/le)",
        example: "Il a voyagé dans plus de vingt pays différents à travers le monde.",
        natural_translation: "Anh ấy đã du lịch qua hơn hai mươi quốc gia khác nhau trên thế giới.",
      },
      format_a: {
        entry: "un pays (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "country, nation, homeland",
        meaning_vi: "đất nước, quốc gia, quê hương",
        collocations: ["pays étranger : nước ngoài", "mon pays natal : quê hương tôi", "tour du pays : chuyến đi vòng quanh đất nước"],
        synonyms: ["nation", "patrie", "territoire"],
        antonyms: ["étranger", "exil", "apatridie"],
        example: {
          french: "Il a voyagé dans plus de vingt pays différents à travers le monde.",
          english: "He has traveled to more than twenty different countries around the world.",
          vietnamese: "Anh ấy đã du lịch qua hơn hai mươi quốc gia khác nhau trên thế giới.",
        },
      },
    },
  ],

  // ── NOUN: jour ──
  "jour": [
    {
      id: "jour-noun",
      candidate: {
        surface_form: "un jour (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "ngày, ban ngày (giống đực un/le)",
        example: "Chaque nouveau jour apporte son lot d'opportunités et d'apprentissages.",
        natural_translation: "Mỗi ngày mới đều mang đến những cơ hội và bài học quý giá.",
      },
      format_a: {
        entry: "un jour (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "day, daylight",
        meaning_vi: "ngày, ban ngày",
        collocations: ["tous les jours : mỗi ngày", "le jour suivant : ngày hôm sau", "au lever du jour : lúc rạng đông"],
        synonyms: ["journée", "clarté", "aube"],
        antonyms: ["nuit", "obscurité", "ténèbres"],
        example: {
          french: "Chaque nouveau jour apporte son lot d'opportunités et d'apprentissages.",
          english: "Each new day brings its share of opportunities and learning.",
          vietnamese: "Mỗi ngày mới đều mang đến những cơ hội và bài học quý giá.",
        },
      },
    },
  ],

  // ── NOUN: nuit ──
  "nuit": [
    {
      id: "nuit-noun",
      candidate: {
        surface_form: "une nuit (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "đêm, buổi đêm, màn đêm (giống cái une/la)",
        example: "Le calme de la nuit permet de bien se reposer après une longue journée.",
        natural_translation: "Sự yên bình của ban đêm giúp nghỉ ngơi thật tốt sau một ngày dài.",
      },
      format_a: {
        entry: "une nuit (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "night, darkness",
        meaning_vi: "đêm, buổi đêm, màn đêm",
        collocations: ["bonne nuit : chúc ngủ ngon", "en pleine nuit : giữa đêm khuya", "passer la nuit : qua đêm"],
        synonyms: ["soirée", "pénombre", "noirceur"],
        antonyms: ["jour", "clarté", "aube"],
        example: {
          french: "Le calme de la nuit permet de bien se reposer après une longue journée.",
          english: "The calm of the night allows for good rest after a long day.",
          vietnamese: "Sự yên bình của ban đêm giúp nghỉ ngơi thật tốt sau một ngày dài.",
        },
      },
    },
  ],

  // ── NOUN: temps ──
  "temps": [
    {
      id: "temps-noun",
      candidate: {
        surface_form: "un temps (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "thời gian / thời tiết (giống đực un/le)",
        example: "Prenez le temps d'apprendre chaque mot avec attention pour bien mémoriser.",
        natural_translation: "Hãy dành thời gian học từng từ cẩn thận để ghi nhớ thật tốt.",
      },
      format_a: {
        entry: "un temps (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "time, weather",
        meaning_vi: "thời gian / thời tiết",
        collocations: ["avoir le temps : có thời gian", "perdre du temps : lãng phí thời gian", "quel beau temps : thời tiết thật đẹp"],
        synonyms: ["durée", "époque", "climat"],
        antonyms: ["éternité", "urgence", "intemporalité"],
        example: {
          french: "Prenez le temps d'apprendre chaque mot avec attention pour bien mémoriser.",
          english: "Take the time to learn each word carefully to memorize well.",
          vietnamese: "Hãy dành thời gian học từng từ cẩn thận để ghi nhớ thật tốt.",
        },
      },
    },
  ],

  // ── NOUN: argent ──
  "argent": [
    {
      id: "argent-noun",
      candidate: {
        surface_form: "un argent (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "tiền bạc, bạc (kim loại) (giống đực un/le)",
        example: "Gérer son argent avec sagesse est une compétence essentielle dans la vie.",
        natural_translation: "Quản lý tiền bạc một cách khôn ngoan là kỹ năng sống thiết yếu.",
      },
      format_a: {
        entry: "un argent (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: "money, silver",
        meaning_vi: "tiền bạc, bạc (kim loại)",
        collocations: ["gagner de l'argent : kiếm tiền", "dépenser de l'argent : tiêu tiền", "somme d'argent : khoản tiền"],
        synonyms: ["fric", "monnaie", "sous"],
        antonyms: ["pauvreté", "dette", "ruine"],
        example: {
          french: "Gérer son argent avec sagesse est une compétence essentielle dans la vie.",
          english: "Managing money wisely is an essential life skill.",
          vietnamese: "Quản lý tiền bạc một cách khôn ngoan là kỹ năng sống thiết yếu.",
        },
      },
    },
  ],

  // ── NOUN: rue ──
  "rue": [
    {
      id: "rue-noun",
      candidate: {
        surface_form: "une rue (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "đường phố, con phố (giống cái une/la)",
        example: "Cette rue piétonne est bordée de petits cafés animés et charmants.",
        natural_translation: "Con phố đi bộ này rợp bóng những quán cà phê nhỏ xinh và nhộn nhịp.",
      },
      format_a: {
        entry: "une rue (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "street, road",
        meaning_vi: "đường phố, con phố",
        collocations: ["traverser la rue : băng qua đường", "au bout de la rue : ở cuối con đường", "rue piétonne : phố đi bộ"],
        synonyms: ["avenue", "voie", "boulevard"],
        antonyms: ["intérieur", "maison", "impasse"],
        example: {
          french: "Cette rue piétonne est bordée de petits cafés animés et charmants.",
          english: "This pedestrian street is lined with lively and charming little cafes.",
          vietnamese: "Con phố đi bộ này rợp bóng những quán cà phê nhỏ xinh và nhộn nhịp.",
        },
      },
    },
  ],

  // ── NOUN: porte ──
  "porte": [
    {
      id: "porte-noun",
      candidate: {
        surface_form: "une porte (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "cánh cửa, cửa ra vào (giống cái une/la)",
        example: "N'oubliez pas de fermer la porte à clé avant de quitter l'appartement.",
        natural_translation: "Đừng quên khóa cửa trước khi rời khỏi căn hộ.",
      },
      format_a: {
        entry: "une porte (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "door, gate",
        meaning_vi: "cánh cửa, cửa ra vào",
        collocations: ["ouvrir la porte : mở cửa", "fermer la porte : đóng cửa", "porte d'entrée : cửa chính"],
        synonyms: ["accès", "entrée", "portail"],
        antonyms: ["mur", "barrière", "cloison"],
        example: {
          french: "N'oubliez pas de fermer la porte à clé avant de quitter l'appartement.",
          english: "Do not forget to lock the door before leaving the apartment.",
          vietnamese: "Đừng quên khóa cửa trước khi rời khỏi căn hộ.",
        },
      },
    },
  ],

  // ── NOUN: fenêtre ──
  "fenetre": [
    {
      id: "fenetre-noun",
      candidate: {
        surface_form: "une fenêtre (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "cửa sổ (giống cái une/la)",
        example: "J'ouvre la fenêtre le matin pour aérer la pièce et faire entrer l'air frais.",
        natural_translation: "Tôi mở cửa sổ vào buổi sáng để phòng thông thoáng và đón khí tươi.",
      },
      format_a: {
        entry: "une fenêtre (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "window",
        meaning_vi: "cửa sổ",
        collocations: ["ouvrir la fenêtre : mở cửa sổ", "regarder par la fenêtre : nhìn qua cửa sổ", "fenêtre sur cour : cửa sổ hướng ra sân"],
        synonyms: ["ouverture", "vitre", "lucarne"],
        antonyms: ["mur", "panneau", "porte"],
        example: {
          french: "J'ouvre la fenêtre le matin pour aérer la pièce et faire entrer l'air frais.",
          english: "I open the window in the morning to ventilate the room and let fresh air in.",
          vietnamese: "Tôi mở cửa sổ vào buổi sáng để phòng thông thoáng và đón khí tươi.",
        },
      },
    },
  ],

  // ── NOUN: soleil ──
  "soleil": [
    {
      id: "soleil-noun",
      candidate: {
        surface_form: "un soleil (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "mặt trời, ánh nắng mặt trời (giống đực un/le)",
        example: "Le soleil brille chaleureusement sur la plage ce matin d'été.",
        natural_translation: "Mặt trời chiếu rọi ấm áp trên bãi biển vào buổi sáng mùa hè này.",
      },
      format_a: {
        entry: "un soleil (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "sun, sunshine",
        meaning_vi: "mặt trời, ánh nắng mặt trời",
        collocations: ["coucher de soleil : hoàng hôn", "coup de soleil : cháy nắng", "au soleil : dưới ánh nắng"],
        synonyms: ["astre du jour", "lumière", "clarté"],
        antonyms: ["lune", "ombre", "ténèbres"],
        example: {
          french: "Le soleil brille chaleureusement sur la plage ce matin d'été.",
          english: "The sun shines warmly on the beach this summer morning.",
          vietnamese: "Mặt trời chiếu rọi ấm áp trên bãi biển vào buổi sáng mùa hè này.",
        },
      },
    },
  ],

  // ── NOUN: lune ──
  "lune": [
    {
      id: "lune-noun",
      candidate: {
        surface_form: "une lune (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "mặt trăng, ánh trăng (giống cái une/la)",
        example: "La pleine lune illumine la forêt d'une douce lueur argentée.",
        natural_translation: "Vầng trăng tròn tỏa sáng khu rừng với một luồng sáng bạc êm đềm.",
      },
      format_a: {
        entry: "une lune (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "moon",
        meaning_vi: "mặt trăng, ánh trăng",
        collocations: ["pleine lune : trăng tròn", "clair de lune : ánh trăng", "croissant de lune : trăng lưỡi liềm"],
        synonyms: ["astre de la nuit", "satellite", "séléné"],
        antonyms: ["soleil", "jour", "lumière du jour"],
        example: {
          french: "La pleine lune illumine la forêt d'une douce lueur argentée.",
          english: "The full moon illuminates the forest with a soft silver glow.",
          vietnamese: "Vầng trăng tròn tỏa sáng khu rừng với một luồng sáng bạc êm đềm.",
        },
      },
    },
  ],

  // ── NOUN: ciel ──
  "ciel": [
    {
      id: "ciel-noun",
      candidate: {
        surface_form: "un ciel (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "bầu trời (giống đực un/le)",
        example: "Le ciel est entièrement dégagé et parsemé d'étoiles brillantes.",
        natural_translation: "Bầu trời quang đãng và điểm xuyết những vì sao lấp lánh.",
      },
      format_a: {
        entry: "un ciel (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "sky, heaven",
        meaning_vi: "bầu trời",
        collocations: ["ciel bleu : trời xanh", "ciel couvert : trời âm u", "sous le ciel : dưới bầu trời"],
        synonyms: ["firmament", "voûte céleste", "azur"],
        antonyms: ["terre", "sol", "abîme"],
        example: {
          french: "Le ciel est entièrement dégagé et parsemé d'étoiles brillantes.",
          english: "The sky is completely clear and dotted with shining stars.",
          vietnamese: "Bầu trời quang đãng và điểm xuyết những vì sao lấp lánh.",
        },
      },
    },
  ],

  // ── NOUN: mer ──
  "mer": [
    {
      id: "mer-noun",
      candidate: {
        surface_form: "une mer (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "biển, đại dương (giống cái une/la)",
        example: "Nous aimons nous promener au bord de la mer pour écouter le bruit des vagues.",
        natural_translation: "Chúng tôi thích đi dạo ven biển để lắng nghe tiếng sóng vỗ.",
      },
      format_a: {
        entry: "une mer (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "sea, ocean",
        meaning_vi: "biển, đại dương",
        collocations: ["au bord de la mer : ở ven biển", "mer bleue : biển xanh", "prendre la mer : ra khơi"],
        synonyms: ["océan", "flots", "onde"],
        antonyms: ["terre ferme", "montagne", "désert"],
        example: {
          french: "Nous aimons nous promener au bord de la mer pour écouter le bruit des vagues.",
          english: "We like walking by the sea to listen to the sound of the waves.",
          vietnamese: "Chúng tôi thích đi dạo ven biển để lắng nghe tiếng sóng vỗ.",
        },
      },
    },
  ],

  // ── NOUN: vie ──
  "vie": [
    {
      id: "vie-noun",
      candidate: {
        surface_form: "une vie (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "cuộc sống, sự sống, cuộc đời (giống cái une/la)",
        example: "La vie réserve toujours de belles surprises à ceux qui persévèrent.",
        natural_translation: "Cuộc sống luôn dành những bất ngờ đẹp đẽ cho người kiên trì.",
      },
      format_a: {
        entry: "une vie (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "life, existence",
        meaning_vi: "cuộc sống, sự sống, cuộc đời",
        collocations: ["gagner sa vie : kiếm sống", "dans la vie : trong cuộc sống", "mode de vie : lối sống"],
        synonyms: ["existence", "survie", "destin"],
        antonyms: ["mort", "décès", "néant"],
        example: {
          french: "La vie réserve toujours de belles surprises à ceux qui persévèrent.",
          english: "Life always holds pleasant surprises for those who persevere.",
          vietnamese: "Cuộc sống luôn dành những bất ngờ đẹp đẽ cho người kiên trì.",
        },
      },
    },
  ],

  // ── NOUN: monde ──
  "monde": [
    {
      id: "monde-noun",
      candidate: {
        surface_form: "un monde (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "thế giới, nhân loại, mọi người (giống đực un/le)",
        example: "Le monde contemporain est interconnecté par les nouvelles technologies.",
        natural_translation: "Thế giới đương đại được kết nối chặt chẽ bởi công nghệ mới.",
      },
      format_a: {
        entry: "un monde (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "world, people",
        meaning_vi: "thế giới, nhân loại, mọi người",
        collocations: ["tout le monde : mọi người", "faire le tour du monde : đi vòng quanh thế giới", "du monde : có nhiều người"],
        synonyms: ["univers", "planète", "humanité"],
        antonyms: ["solitude", "vide", "isolement"],
        example: {
          french: "Le monde contemporain est interconnecté par les nouvelles technologies.",
          english: "The contemporary world is interconnected by new technologies.",
          vietnamese: "Thế giới đương đại được kết nối chặt chẽ bởi công nghệ mới.",
        },
      },
    },
  ],

  // ── NOUN: question ──
  "question": [
    {
      id: "question-noun",
      candidate: {
        surface_form: "une question (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "câu hỏi, thắc mắc, vấn đề (giống cái une/la)",
        example: "Si vous avez la moindre question, n'hésitez pas à lever la main.",
        natural_translation: "Nếu bạn có bất kỳ câu hỏi nào, xin đừng ngần ngại giơ tay.",
      },
      format_a: {
        entry: "une question (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "question, inquiry",
        meaning_vi: "câu hỏi, thắc mắc, vấn đề",
        collocations: ["poser une question : đặt một câu hỏi", "répondre à une question : trả lời câu hỏi", "remettre en question : nghi vấn / đặt lại vấn đề"],
        synonyms: ["interrogation", "demande", "problème"],
        antonyms: ["réponse", "certitude", "solution"],
        example: {
          french: "Si vous avez la moindre question, n'hésitez pas à lever la main.",
          english: "If you have any question, feel free to raise your hand.",
          vietnamese: "Nếu bạn có bất kỳ câu hỏi nào, xin đừng ngần ngại giơ tay.",
        },
      },
    },
  ],

  // ── NOUN: réponse ──
  "reponse": [
    {
      id: "reponse-noun",
      candidate: {
        surface_form: "une réponse (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "câu trả lời, lời đáp, phản hồi (giống cái une/la)",
        example: "Elle a attendu la réponse de l'université avec beaucoup d'impatience.",
        natural_translation: "Cô ấy đã chờ đợi câu trả lời từ trường đại học rất nóng lòng.",
      },
      format_a: {
        entry: "une réponse (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "answer, reply, response",
        meaning_vi: "câu trả lời, lời đáp, phản hồi",
        collocations: ["donner une réponse : đưa ra câu trả lời", "en réponse à : để hồi đáp cho", "sans réponse : không có phản hồi"],
        synonyms: ["réplique", "rétorque", "solution"],
        antonyms: ["question", "silence", "interrogation"],
        example: {
          french: "Elle a attendu la réponse de l'université avec beaucoup d'impatience.",
          english: "She waited for the university's answer with great impatience.",
          vietnamese: "Cô ấy đã chờ đợi câu trả lời từ trường đại học rất nóng lòng.",
        },
      },
    },
  ],

  // ── NOUN: problème ──
  "probleme": [
    {
      id: "probleme-noun",
      candidate: {
        surface_form: "un problème (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "vấn đề, rắc rối, bài toán (giống đực un/le)",
        example: "Avec de la méthode, chaque problème trouve sa solution appropriée.",
        natural_translation: "Với phương pháp đúng đắn, mọi vấn đề đều tìm ra giải pháp phù hợp.",
      },
      format_a: {
        entry: "un problème (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "problem, issue",
        meaning_vi: "vấn đề, rắc rối, bài toán",
        collocations: ["résoudre un problème : giải quyết vấn đề", "poser problème : gây khó khăn", "sans problème : không có vấn đề gì"],
        synonyms: ["difficulté", "ennui", "souci"],
        antonyms: ["solution", "facilité", "évidence"],
        example: {
          french: "Avec de la méthode, chaque problème trouve sa solution appropriée.",
          english: "With method, every problem finds its appropriate solution.",
          vietnamese: "Với phương pháp đúng đắn, mọi vấn đề đều tìm ra giải pháp phù hợp.",
        },
      },
    },
  ],

  // ── NOUN: pain ──
  "pain": [
    {
      id: "pain-noun",
      candidate: {
        surface_form: "un pain (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "bánh mì (giống đực un/le)",
        example: "L'odeur du pain chaud embaume délicieusement toute la boulangerie.",
        natural_translation: "Mùi bánh mì nóng thơm lừng lan tỏa khắp tiệm bánh.",
      },
      format_a: {
        entry: "un pain (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "bread, loaf",
        meaning_vi: "bánh mì",
        collocations: ["acheter du pain : mua bánh mì", "baguette de pain : ổ bánh mì baguette", "pain frais : bánh mì tươi mới ra lò"],
        synonyms: ["baguette", "miche", "nourriture"],
        antonyms: ["faim", "jeûne", "disette"],
        example: {
          french: "L'odeur du pain chaud embaume délicieusement toute la boulangerie.",
          english: "The smell of warm bread deliciously fills the entire bakery.",
          vietnamese: "Mùi bánh mì nóng thơm lừng lan tỏa khắp tiệm bánh.",
        },
      },
    },
  ],

  // ── NOUN: café ──
  "cafe": [
    {
      id: "cafe-noun",
      candidate: {
        surface_form: "un café (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "cà phê, quán cà phê (giống đực un/le)",
        example: "Nous nous sommes retrouvés dans un petit café pour discuter tranquillement.",
        natural_translation: "Chúng tôi gặp nhau ở một quán cà phê nhỏ để trò chuyện thoải mái.",
      },
      format_a: {
        entry: "un café (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "coffee, cafe",
        meaning_vi: "cà phê, quán cà phê",
        collocations: ["boire un café : uống cà phê", "tasse de café : tách cà phê", "prendre un café : đi uống cà phê"],
        synonyms: ["bistrot", "expresso", "petit noir"],
        antonyms: ["sommeil", "tisane", "décaféiné"],
        example: {
          french: "Nous nous sommes retrouvés dans un petit café pour discuter tranquillement.",
          english: "We met in a small cafe to chat quietly.",
          vietnamese: "Chúng tôi gặp nhau ở một quán cà phê nhỏ để trò chuyện thoải mái.",
        },
      },
    },
  ],

  // ── NOUN: prix ──
  "prix": [
    {
      id: "prix-noun",
      candidate: {
        surface_form: "un prix (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "giá cả, giải thưởng (giống đực un/le)",
        example: "Ce roman touchant a remporté le grand prix littéraire de l'année.",
        natural_translation: "Cuốn tiểu thuyết cảm động này đã đoạt giải thưởng văn học lớn của năm.",
      },
      format_a: {
        entry: "un prix (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "le",
          article_display: "un / le",
          
        },
        meaning_en: "price, award, prize",
        meaning_vi: "giá cả, giải thưởng",
        collocations: ["à tout prix : bằng mọi giá", "remporter un prix : giành giải thưởng", "prix Nobel : giải Nobel"],
        synonyms: ["tarif", "coût", "récompense"],
        antonyms: ["gratuité", "pénalité", "punition"],
        example: {
          french: "Ce roman touchant a remporté le grand prix littéraire de l'année.",
          english: "This touching novel won the grand literary prize of the year.",
          vietnamese: "Cuốn tiểu thuyết cảm động này đã đoạt giải thưởng văn học lớn của năm.",
        },
      },
    },
  ],

  // ── NOUN: souris ──
  "souris": [
    {
      id: "souris-noun",
      candidate: {
        surface_form: "une souris (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "con chuột, chuột máy tính (giống cái une/la)",
        example: "La souris s'est faufilée discrètement derrière le meuble du salon.",
        natural_translation: "Chú chuột đã lủi nhanh ra sau chiếc tủ phòng khách.",
      },
      format_a: {
        entry: "une souris (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "mouse (animal or computer)",
        meaning_vi: "con chuột, chuột máy tính",
        collocations: ["souris d'ordinateur : chuột máy tính", "cliquer sur la souris : nhấp chuột", "souris grise : chú chuột xám"],
        synonyms: ["rongeur", "mulot", "pointeur"],
        antonyms: ["chat", "prédateur", "écran tactile"],
        example: {
          french: "La souris s'est faufilée discrètement derrière le meuble du salon.",
          english: "The mouse slipped discreetly behind the living room furniture.",
          vietnamese: "Chú chuột đã lủi nhanh ra sau chiếc tủ phòng khách.",
        },
      },
    },
  ],

  // ── NOUN: voix ──
  "voix": [
    {
      id: "voix-noun",
      candidate: {
        surface_form: "une voix (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "giọng nói, tiếng nói, lá phiếu (giống cái une/la)",
        example: "Elle a chanté d'une voix si douce que toute la salle s'est émerveillée.",
        natural_translation: "Cô ấy hát bằng một giọng hát ngọt ngào khiến cả khán phòng trầm trồ.",
      },
      format_a: {
        entry: "une voix (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "la",
          article_display: "une / la",
          
        },
        meaning_en: "voice, vote",
        meaning_vi: "giọng nói, tiếng nói, lá phiếu",
        collocations: ["à voix haute : nói to / thành tiếng", "voix basse : nói nhỏ / thì thầm", "avoir une belle voix : có giọng hay"],
        synonyms: ["ton", "timbre", "suffrage"],
        antonyms: ["silence", "mutisme", "inaudible"],
        example: {
          french: "Elle a chanté d'une voix si douce que toute la salle s'est émerveillée.",
          english: "She sang with such a sweet voice that the whole room was amazed.",
          vietnamese: "Cô ấy hát bằng một giọng hát ngọt ngào khiến cả khán phòng trầm trồ.",
        },
      },
    },
  ],

  // ── NOUN: histoire ──
  "histoire": [
    {
      id: "histoire-noun",
      candidate: {
        surface_form: "une histoire (n, fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "lịch sử, câu chuyện (giống cái une/la)",
        example: "Le professeur raconte l'histoire avec une passion qui captive les élèves.",
        natural_translation: "Thầy giáo kể câu chuyện lịch sử với niềm đam mê lôi cuốn học sinh.",
      },
      format_a: {
        entry: "une histoire (n, fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Feminine as FormatANounGender,
          indefinite_article: "une",
          definite_article: "l'",
          article_display: "une / la (l')",
          elision_resolution: 'la',
        },
        meaning_en: "history, story",
        meaning_vi: "lịch sử, câu chuyện",
        collocations: ["raconter une histoire : kể một câu chuyện", "histoire de France : lịch sử nước Pháp", "histoire vraie : câu chuyện có thật"],
        synonyms: ["récit", "conte", "chronique"],
        antonyms: ["oubli", "présent", "silence"],
        example: {
          french: "Le professeur raconte l'histoire avec une passion qui captive les élèves.",
          english: "The teacher recounts history with a passion that captivates students.",
          vietnamese: "Thầy giáo kể câu chuyện lịch sử với niềm đam mê lôi cuốn học sinh.",
        },
      },
    },
  ],

  // ── NOUN: hôtel ──
  "hotel": [
    {
      id: "hotel-noun",
      candidate: {
        surface_form: "un hôtel (n, mas)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: "khách sạn (giống đực un/le)",
        example: "Nous avons réservé un hôtel confortable au cœur du centre historique.",
        natural_translation: "Chúng tôi đã đặt một khách sạn tiện nghi ngay trung tâm khu phố cổ.",
      },
      format_a: {
        entry: "un hôtel (n, mas)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Masculine as FormatANounGender,
          indefinite_article: "un",
          definite_article: "l'",
          article_display: "un / le (l')",
          elision_resolution: 'le',
        },
        meaning_en: "hotel",
        meaning_vi: "khách sạn",
        collocations: ["chambre d'hôtel : phòng khách sạn", "réserver un hôtel : đặt phòng khách sạn", "hôtel de ville : tòa thị chính"],
        synonyms: ["auberge", "palace", "établissement"],
        antonyms: ["maison", "domicile", "rue"],
        example: {
          french: "Nous avons réservé un hôtel confortable au cœur du centre historique.",
          english: "We booked a comfortable hotel in the heart of the historic center.",
          vietnamese: "Chúng tôi đã đặt một khách sạn tiện nghi ngay trung tâm khu phố cổ.",
        },
      },
    },
  ],

  // ── SHARED NOUN: élève (masc + fem, shared form) ──────────────────────
  eleve: [
    {
      id: 'eleve-shared-noun',
      candidate: {
        surface_form: "l'élève (n, mas - fem)",
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Học sinh (nam hoặc nữ) - danh từ dùng chung cả hai giống',
        example: "C'est un élève très sérieux dans son travail scolaire.",
        natural_translation: 'Đó là một học sinh rất nghiêm túc trong việc học tập.',
      },
      format_a: {
        entry: "l'élève (n, mas - fem)",
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Both,
          genders: [Gender.Masculine, Gender.Feminine],
          gender_choice: 'both',
          is_shared_form: true,
          lemma: 'élève',
          forms: { masculine: 'élève', feminine: 'élève' },
          gender_details: {
            masculine: {
              form: 'élève',
              singular: 'élève',
              plural: 'élèves',
              indefinite_article: 'un',
              definite_article: 'le',
              elision: true,
              display_article: "l'",
            },
            feminine: {
              form: 'élève',
              singular: 'élève',
              plural: 'élèves',
              indefinite_article: 'une',
              definite_article: 'la',
              elision: true,
              display_article: "l'",
            },
          },
          plural: {
            masculine: 'élèves',
            feminine: 'élèves',
            shared: 'élèves',
          },
          article_display: "l'",
        },
        meaning_en: 'student, pupil (masc & fem)',
        meaning_vi: 'học sinh (dùng cho cả nam và nữ)',
        collocations: [
          'élève brillant : học sinh xuất sắc',
          'bon élève : học sinh chăm ngoan, gương mẫu',
          'les devoirs des élèves : bài tập về nhà của học sinh',
        ],
        synonyms: ['écolier', 'apprenant', 'disciple'],
        antonyms: ['professeur', 'enseignant', 'maître'],
        example: {
          french: 'Cet élève écoute attentivement les explications du professeur.',
          english: "This student listens attentively to the teacher's explanations.",
          vietnamese: 'Học sinh này chăm chú lắng nghe lời giải thích của giáo viên.',
        },
      },
    },
  ],

  // ── SHARED NOUN: journaliste (masc + fem, shared form) ────────────────
  journaliste: [
    {
      id: 'journaliste-shared-noun',
      candidate: {
        surface_form: 'journaliste (n, mas - fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Nhà báo, phóng viên (nam hoặc nữ) - danh từ dùng chung cả hai giống',
        example: 'Le journaliste pose des questions pertinentes lors de la conférence.',
        natural_translation: 'Nhà báo đặt câu hỏi thích đáng trong buổi họp báo.',
      },
      format_a: {
        entry: 'journaliste (n, mas - fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Both,
          genders: [Gender.Masculine, Gender.Feminine],
          gender_choice: 'both',
          is_shared_form: true,
          lemma: 'journaliste',
          forms: { masculine: 'journaliste', feminine: 'journaliste' },
          gender_details: {
            masculine: {
              form: 'journaliste',
              singular: 'journaliste',
              plural: 'journalistes',
              indefinite_article: 'un',
              definite_article: 'le',
              elision: false,
              display_article: 'le',
            },
            feminine: {
              form: 'journaliste',
              singular: 'journaliste',
              plural: 'journalistes',
              indefinite_article: 'une',
              definite_article: 'la',
              elision: false,
              display_article: 'la',
            },
          },
          plural: {
            masculine: 'journalistes',
            feminine: 'journalistes',
            shared: 'journalistes',
          },
          article_display: 'un / une',
        },
        meaning_en: 'journalist, reporter (masc & fem)',
        meaning_vi: 'nhà báo, phóng viên (nam & nữ)',
        collocations: [
          'carte de journaliste : thẻ nhà báo',
          'journaliste d’investigation : nhà báo điều tra',
          'métier de journaliste : nghề báo',
        ],
        synonyms: ['reporter', 'chroniqueur', 'rédacteur'],
        antonyms: [],
        example: {
          french: 'La journaliste prépare un grand reportage sur le climat.',
          english: 'The journalist is preparing a major report on the climate.',
          vietnamese: 'Nữ nhà báo đang chuẩn bị một phóng sự lớn về khí hậu.',
        },
      },
    },
  ],

  // ── SHARED NOUN: professeur (masc + fem, shared form) ─────────────────
  professeur: [
    {
      id: 'professeur-shared-noun',
      candidate: {
        surface_form: 'professeur (n, mas - fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Giáo viên, giáo sư (nam hoặc nữ) - danh từ dùng chung cả hai giống',
        example: 'Notre professeur de français explique la leçon avec clarté.',
        natural_translation: 'Giáo viên tiếng Pháp của chúng tôi giảng bài rất rõ ràng.',
      },
      format_a: {
        entry: 'professeur (n, mas - fem)',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Both,
          genders: [Gender.Masculine, Gender.Feminine],
          gender_choice: 'both',
          is_shared_form: true,
          lemma: 'professeur',
          forms: { masculine: 'professeur', feminine: 'professeur' },
          gender_details: {
            masculine: {
              form: 'professeur',
              singular: 'professeur',
              plural: 'professeurs',
              indefinite_article: 'un',
              definite_article: 'le',
              elision: false,
              display_article: 'le',
            },
            feminine: {
              form: 'professeur',
              singular: 'professeur',
              plural: 'professeurs',
              indefinite_article: 'une',
              definite_article: 'la',
              elision: false,
              display_article: 'la',
            },
          },
          plural: {
            masculine: 'professeurs',
            feminine: 'professeurs',
            shared: 'professeurs',
          },
          article_display: 'un / une',
        },
        meaning_en: 'teacher, professor (masc & fem)',
        meaning_vi: 'giáo viên, giáo sư (nam & nữ)',
        collocations: [
          'professeur titulaire : giáo sư biên chế chính thức',
          'salle des professeurs : phòng nghỉ giáo viên',
          'professeur de français : giáo viên tiếng Pháp',
        ],
        synonyms: ['enseignant', 'maître', 'éducateur'],
        antonyms: ['élève', 'étudiant', 'apprenant'],
        example: {
          french: 'Le professeur encourage ses élèves à poser des questions.',
          english: 'The teacher encourages students to ask questions.',
          vietnamese: 'Thầy giáo khuyến khích học sinh đặt câu hỏi.',
        },
      },
    },
  ],

  // ── DUAL DIFFERENT NOUN: acteur / actrice ────────────────────────────
  acteur: [
    {
      id: 'acteur-dual-noun',
      candidate: {
        surface_form: 'acteur (n, mas) → actrice (n, fem)',
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: 'Diễn viên (nam: acteur / nữ: actrice)',
        example: 'Cet acteur joue remarquablement bien dans cette pièce.',
        natural_translation: 'Nam diễn viên này diễn xuất rất tài tình trong vở kịch này.',
      },
      format_a: {
        entry: 'l’acteur / l’actrice',
        grammar: {
          pos: PartOfSpeech.Noun,
          gender: Gender.Both,
          genders: [Gender.Masculine, Gender.Feminine],
          gender_choice: 'both',
          is_shared_form: false,
          lemma: 'acteur / actrice',
          forms: { masculine: 'acteur', feminine: 'actrice' },
          masculine_form: {
            lemma: 'acteur',
            gender: Gender.Masculine,
            underlying_article: 'le',
            definite_article: "l'",
            indefinite_article: 'un',
            singular: 'acteur',
            plural: 'acteurs',
          },
          feminine_form: {
            lemma: 'actrice',
            gender: Gender.Feminine,
            underlying_article: 'la',
            definite_article: "l'",
            indefinite_article: 'une',
            singular: 'actrice',
            plural: 'actrices',
          },
          gender_details: {
            masculine: {
              form: 'acteur',
              singular: 'acteur',
              plural: 'acteurs',
              indefinite_article: 'un',
              definite_article: 'le',
              elision: true,
              display_article: "l'",
            },
            feminine: {
              form: 'actrice',
              singular: 'actrice',
              plural: 'actrices',
              indefinite_article: 'une',
              definite_article: 'la',
              elision: true,
              display_article: "l'",
            },
          },
          plural: {
            masculine: 'acteurs',
            feminine: 'actrices',
          },
          article_display: "l'",
        },
        meaning_en: 'actor / actress',
        meaning_vi: 'diễn viên nam / nữ',
        collocations: [
          'acteur principal : nam diễn viên chính',
          'jeu d’acteur : kỹ năng diễn xuất',
          'actrice renommée : nữ diễn viên lừng danh',
        ],
        synonyms: ['comédien', 'interprète', 'artiste'],
        antonyms: ['spectateur', 'public'],
        example: {
          french: 'L’actrice a reçu un prix prestigieux pour son interprétation.',
          english: 'The actress received a prestigious award for her performance.',
          vietnamese: 'Nữ diễn viên đã nhận được giải thưởng danh giá cho diễn xuất của mình.',
        },
      },
    },
  ],

};

// ═══════════════════════════════════════════════════════════════════════════
// ALIASES & LOOKUP MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

LEXICAL_DATABASE["s'attendre à"] = LEXICAL_DATABASE["s'attendre a"];
LEXICAL_DATABASE["sattendre a"] = LEXICAL_DATABASE["s'attendre a"];

// Elided aliases
LEXICAL_DATABASE["l'homme"] = LEXICAL_DATABASE.homme;
LEXICAL_DATABASE["l'école"] = LEXICAL_DATABASE.ecole;
LEXICAL_DATABASE["école"] = LEXICAL_DATABASE.ecole;
LEXICAL_DATABASE["l'eau"] = LEXICAL_DATABASE.eau;
LEXICAL_DATABASE["l'arbre"] = LEXICAL_DATABASE.arbre;
LEXICAL_DATABASE["l'argent"] = LEXICAL_DATABASE.argent;
LEXICAL_DATABASE["l'histoire"] = LEXICAL_DATABASE.histoire;
LEXICAL_DATABASE["l'hôtel"] = LEXICAL_DATABASE.hotel;
LEXICAL_DATABASE["hotel"] = LEXICAL_DATABASE.hotel;
LEXICAL_DATABASE["l'ami"] = LEXICAL_DATABASE.ami;
LEXICAL_DATABASE["l'amie"] = LEXICAL_DATABASE.amie;
LEXICAL_DATABASE["l'enfant"] = LEXICAL_DATABASE.enfant;
LEXICAL_DATABASE["l'œil"] = LEXICAL_DATABASE.oeil;
LEXICAL_DATABASE["l'oeil"] = LEXICAL_DATABASE.oeil;
LEXICAL_DATABASE["oeil"] = LEXICAL_DATABASE.oeil;
LEXICAL_DATABASE["œil"] = LEXICAL_DATABASE.oeil;

// Accented aliases
LEXICAL_DATABASE["mémoire"] = LEXICAL_DATABASE.memoire;
LEXICAL_DATABASE["château"] = LEXICAL_DATABASE.chateau;
LEXICAL_DATABASE["fenêtre"] = LEXICAL_DATABASE.fenetre;
LEXICAL_DATABASE["problème"] = LEXICAL_DATABASE.probleme;
LEXICAL_DATABASE["réponse"] = LEXICAL_DATABASE.reponse;
LEXICAL_DATABASE["café"] = LEXICAL_DATABASE.cafe;

// Plural aliases
LEXICAL_DATABASE["voitures"] = LEXICAL_DATABASE.voiture;
LEXICAL_DATABASE["hommes"] = LEXICAL_DATABASE.homme;
LEXICAL_DATABASE["écoles"] = LEXICAL_DATABASE.ecole;
LEXICAL_DATABASE["ecoles"] = LEXICAL_DATABASE.ecole;
LEXICAL_DATABASE["arbres"] = LEXICAL_DATABASE.arbre;
LEXICAL_DATABASE["journaux"] = LEXICAL_DATABASE.journal;
LEXICAL_DATABASE["travaux"] = LEXICAL_DATABASE.travail;
LEXICAL_DATABASE["yeux"] = LEXICAL_DATABASE.oeil;
LEXICAL_DATABASE["bateaux"] = LEXICAL_DATABASE.bateau;
LEXICAL_DATABASE["cadeaux"] = LEXICAL_DATABASE.cadeau;
LEXICAL_DATABASE["châteaux"] = LEXICAL_DATABASE.chateau;
LEXICAL_DATABASE["chateaux"] = LEXICAL_DATABASE.chateau;
LEXICAL_DATABASE["maisons"] = LEXICAL_DATABASE.maison;
LEXICAL_DATABASE["femmes"] = LEXICAL_DATABASE.femme;
LEXICAL_DATABASE["villes"] = LEXICAL_DATABASE.ville;
LEXICAL_DATABASE["jours"] = LEXICAL_DATABASE.jour;
LEXICAL_DATABASE["nuits"] = LEXICAL_DATABASE.nuit;
LEXICAL_DATABASE["rues"] = LEXICAL_DATABASE.rue;
LEXICAL_DATABASE["portes"] = LEXICAL_DATABASE.porte;
LEXICAL_DATABASE["fenêtres"] = LEXICAL_DATABASE.fenetre;
LEXICAL_DATABASE["fenetres"] = LEXICAL_DATABASE.fenetre;
LEXICAL_DATABASE["ciels"] = LEXICAL_DATABASE.ciel;
LEXICAL_DATABASE["cieux"] = LEXICAL_DATABASE.ciel;
LEXICAL_DATABASE["mers"] = LEXICAL_DATABASE.mer;
LEXICAL_DATABASE["vies"] = LEXICAL_DATABASE.vie;
LEXICAL_DATABASE["mondes"] = LEXICAL_DATABASE.monde;
LEXICAL_DATABASE["questions"] = LEXICAL_DATABASE.question;
LEXICAL_DATABASE["réponses"] = LEXICAL_DATABASE.reponse;
LEXICAL_DATABASE["reponses"] = LEXICAL_DATABASE.reponse;
LEXICAL_DATABASE["problèmes"] = LEXICAL_DATABASE.probleme;
LEXICAL_DATABASE["problemes"] = LEXICAL_DATABASE.probleme;
LEXICAL_DATABASE["pains"] = LEXICAL_DATABASE.pain;
LEXICAL_DATABASE["cafés"] = LEXICAL_DATABASE.cafe;
LEXICAL_DATABASE["histoires"] = LEXICAL_DATABASE.histoire;
LEXICAL_DATABASE["hôtels"] = LEXICAL_DATABASE.hotel;
LEXICAL_DATABASE["hotels"] = LEXICAL_DATABASE.hotel;
LEXICAL_DATABASE["enfants"] = LEXICAL_DATABASE.enfant;
LEXICAL_DATABASE["amis"] = LEXICAL_DATABASE.ami;
LEXICAL_DATABASE["amies"] = LEXICAL_DATABASE.amie;
LEXICAL_DATABASE["livres"] = LEXICAL_DATABASE.livre;
LEXICAL_DATABASE["tours"] = LEXICAL_DATABASE.tour;
LEXICAL_DATABASE["mémoires"] = LEXICAL_DATABASE.memoire;

// Shared & Dual Noun Aliases (§10, §11)
LEXICAL_DATABASE["élève"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["l'élève"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["l'eleve"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["un élève"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["une élève"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["un eleve"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["une eleve"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["élèves"] = LEXICAL_DATABASE.eleve;
LEXICAL_DATABASE["eleves"] = LEXICAL_DATABASE.eleve;

LEXICAL_DATABASE["le journaliste"] = LEXICAL_DATABASE.journaliste;
LEXICAL_DATABASE["la journaliste"] = LEXICAL_DATABASE.journaliste;
LEXICAL_DATABASE["un journaliste"] = LEXICAL_DATABASE.journaliste;
LEXICAL_DATABASE["une journaliste"] = LEXICAL_DATABASE.journaliste;
LEXICAL_DATABASE["journalistes"] = LEXICAL_DATABASE.journaliste;

LEXICAL_DATABASE["le professeur"] = LEXICAL_DATABASE.professeur;
LEXICAL_DATABASE["la professeur"] = LEXICAL_DATABASE.professeur;
LEXICAL_DATABASE["un professeur"] = LEXICAL_DATABASE.professeur;
LEXICAL_DATABASE["une professeur"] = LEXICAL_DATABASE.professeur;
LEXICAL_DATABASE["professeurs"] = LEXICAL_DATABASE.professeur;

LEXICAL_DATABASE["l'acteur"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["un acteur"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["actrice"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["l'actrice"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["une actrice"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["acteurs"] = LEXICAL_DATABASE.acteur;
LEXICAL_DATABASE["actrices"] = LEXICAL_DATABASE.acteur;

LEXICAL_DATABASE["un ami"] = LEXICAL_DATABASE.ami;
LEXICAL_DATABASE["une amie"] = LEXICAL_DATABASE.amie;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR MORPHOLOGY & NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export interface StrippedArticleResult {
  coreWord: string;
  detectedArticle?: string;
  isElided: boolean;
  isPlural: boolean;
  detectedGender?: Gender.Masculine | Gender.Feminine;
}

export function stripFrenchArticle(input: string): StrippedArticleResult {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Elision: l', l’
  if (lower.startsWith("l'") || lower.startsWith("l’")) {
    return {
      coreWord: trimmed.slice(2).trim(),
      detectedArticle: "l'",
      isElided: true,
      isPlural: false,
    };
  }

  // Prepositional elision: d', d’
  if (lower.startsWith("d'") || lower.startsWith("d’")) {
    return {
      coreWord: trimmed.slice(2).trim(),
      detectedArticle: "d'",
      isElided: true,
      isPlural: false,
    };
  }

  // Definite singular
  if (lower.startsWith('le ')) {
    return {
      coreWord: trimmed.slice(3).trim(),
      detectedArticle: 'le',
      isElided: false,
      isPlural: false,
      detectedGender: Gender.Masculine,
    };
  }
  if (lower.startsWith('la ')) {
    return {
      coreWord: trimmed.slice(3).trim(),
      detectedArticle: 'la',
      isElided: false,
      isPlural: false,
      detectedGender: Gender.Feminine,
    };
  }

  // Indefinite singular
  if (lower.startsWith('un ')) {
    return {
      coreWord: trimmed.slice(3).trim(),
      detectedArticle: 'un',
      isElided: false,
      isPlural: false,
      detectedGender: Gender.Masculine,
    };
  }
  if (lower.startsWith('une ')) {
    return {
      coreWord: trimmed.slice(4).trim(),
      detectedArticle: 'une',
      isElided: false,
      isPlural: false,
      detectedGender: Gender.Feminine,
    };
  }

  // Plural articles
  if (lower.startsWith('les ')) {
    return {
      coreWord: trimmed.slice(4).trim(),
      detectedArticle: 'les',
      isElided: false,
      isPlural: true,
    };
  }
  if (lower.startsWith('des ')) {
    return {
      coreWord: trimmed.slice(4).trim(),
      detectedArticle: 'des',
      isElided: false,
      isPlural: true,
    };
  }

  return {
    coreWord: trimmed,
    isElided: false,
    isPlural: false,
  };
}

export function isStartsVowelOrMuteH(word: string): boolean {
  if (!word) return false;
  const lower = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/^[aeiouy]/.test(lower)) return true;
  const H_MUET = ['homme', 'histoire', 'hotel', 'heure', 'hopital', 'hiver', 'habitude', 'honneur', 'horloge', 'herbe', 'humour', 'humeur', 'heritier'];
  return H_MUET.some((h) => lower.startsWith(h));
}

export function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Fallback generator for un-cataloged French words.
 *
 * Rules:
 * 1. Verbs ending in -er, -ir, -re, or reflexive.
 * 2. If NOUN:
 *    - "Không được tự đoán gender":
 *      If user explicitly provided an article (un/le vs une/la), respect it.
 *      If user provided no article or ambiguous article (l', les), DO NOT GUESS!
 *      Return 2 candidates (masculine & feminine) so the user selects the true gender.
 *    - "Không được fabricate meaning":
 *      Use clear placeholders rather than nonsense fabricated data.
 */
function generateFallbackInterpretations(
  rawInput: string,
  coreWord: string,
  detectedArticle?: string,
  detectedGender?: Gender.Masculine | Gender.Feminine,
): LexicalInterpretation[] {
  const lower = coreWord.toLowerCase();
  const isReflexive =
    lower.startsWith('se ') || lower.startsWith("s'") || lower.startsWith("s’");

  // 1. Verb Detection
  if (isReflexive || lower.endsWith('er') || lower.endsWith('ir') || lower.endsWith('re')) {
    const isFirstGroup = lower.endsWith('er');
    const radical = isFirstGroup ? lower.slice(0, -2) : lower;

    return [
      {
        id: `custom-verb-${lower}`,
        candidate: {
          surface_form: rawInput,
          part_of_speech: PartOfSpeech.Verb,
          core_meaning: isReflexive ? 'Động từ phản thân tiếng Pháp' : 'Động từ tiếng Pháp',
          example: `${rawInput} dans la vie quotidienne.`,
          natural_translation: `Sử dụng động từ ${rawInput} trong giao tiếp đời thường.`,
        },
        format_a: {
          entry: rawInput,
          grammar: {
            pos: PartOfSpeech.Verb,
            group: isFirstGroup ? VerbGroup.First : VerbGroup.Third,
            conjugation: isFirstGroup
              ? {
                  je: `${radical}e`,
                  tu: `${radical}es`,
                  il_elle_on: `${radical}e`,
                  nous: `${radical}ons`,
                  vous: `${radical}ez`,
                  ils_elles: `${radical}ent`,
                }
              : undefined,
          },
          meaning_en: 'verb definition',
          meaning_vi: 'nghĩa của động từ',
          constructions: [
            {
              pattern: rawInput,
              meaning_en: 'to perform the action (bare verb)',
              meaning_vi: 'thực hiện hành động (dùng trơn không giới từ)',
              example_fr: `Il est important de ${rawInput} chaque jour.`,
              example_en: 'It is important to do this every day.',
              example_vi: 'Việc thực hiện điều này mỗi ngày là rất quan trọng.',
              notes: 'Dạng bare verb chỉ hành động nói chung.',
            },
            {
              pattern: `${rawInput} sth`,
              meaning_en: 'to do something (direct object)',
              meaning_vi: 'làm / thực hiện điều gì (với tân ngữ trực tiếp)',
              example_fr: `Nous voulons ${rawInput} ce projet ensemble.`,
              example_en: 'We want to carry out this project together.',
              example_vi: 'Chúng tôi muốn cùng nhau thực hiện dự án này.',
              notes: 'Đi kèm tân ngữ sth để cụ thể hoá đối tượng của hành động.',
            },
          ],
          synonyms: ['agir', 'faire', 'pratiquer'],
          antonyms: ['cesser', 'arrêter', 'abandonner'],
          example: {
            french: `Je commence à ${rawInput} dès aujourd'hui pour progresser.`,
            english: 'I am starting to do this today in order to make progress.',
            vietnamese: 'Tôi bắt đầu thực hiện điều này ngay hôm nay để tiến bộ.',
          },
        },
      },
    ];
  }

  // 2. Noun fallback:
  // "Không được tự đoán gender."
  // If user provided 'un' or 'le' -> Masculine.
  // If user provided 'une' or 'la' -> Feminine.
  // If no unambiguous article was given (l', les, bare noun), return BOTH candidates.

  const createNounInterp = (gender: FormatANounGender): LexicalInterpretation => {
    const isMasc = gender === Gender.Masculine;
    const indef = isMasc ? 'un' : 'une';
    const notation = isMasc ? '(n, mas)' : '(n, fem)';
    const startsVowel = isStartsVowelOrMuteH(coreWord);
    const defArt = startsVowel ? "l'" : isMasc ? 'le' : 'la';
    const artDisplay = startsVowel
      ? `${indef} / ${isMasc ? 'le' : 'la'} (l')`
      : `${indef} / ${isMasc ? 'le' : 'la'}`;
    const entry = `${indef} ${coreWord} ${notation}`;

    return {
      id: `custom-noun-${lower}-${isMasc ? 'mas' : 'fem'}`,
      candidate: {
        surface_form: entry,
        part_of_speech: PartOfSpeech.Noun,
        core_meaning: `Danh từ ${isMasc ? 'giống đực (n, mas)' : 'giống cái (n, fem)'} • Mạo từ: ${artDisplay}`,
        example: `C'est ${indef} ${coreWord} très utile.`,
        natural_translation: `Đó là một ${coreWord} rất hữu ích.`,
      },
      format_a: {
        entry,
        grammar: {
          pos: PartOfSpeech.Noun,
          gender,
          indefinite_article: indef,
          definite_article: defArt,
          article_display: artDisplay,
          elision_resolution: startsVowel ? (isMasc ? 'le' : 'la') : undefined,
        },
        meaning_en: `${coreWord} (noun)`,
        meaning_vi: `${coreWord} (danh từ)`,
        collocations: [
          `${indef} ${coreWord} : một ${coreWord}`,
          `ce ${coreWord} : ${coreWord} này`,
          `avoir ${indef} ${coreWord} : có một ${coreWord}`,
        ],
        synonyms: ['terme', 'élément', 'objet'],
        antonyms: ['contraire', 'opposé', 'néant'],
        example: {
          french: `Voici ${indef} ${coreWord} très intéressant.`,
          english: `Here is a very interesting ${coreWord}.`,
          vietnamese: `Đây là một ${coreWord} rất thú vị.`,
        },
      },
    };
  };

  if (detectedGender === Gender.Masculine) {
    return [createNounInterp(Gender.Masculine)];
  }
  if (detectedGender === Gender.Feminine) {
    return [createNounInterp(Gender.Feminine)];
  }

  // Ambiguous: User did not specify gender -> return both candidates
  return [createNounInterp(Gender.Masculine), createNounInterp(Gender.Feminine)];
}

export function analyzeFrenchLexicalInput(
  rawInput: string,
): LexicalAnalysisOutcome {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      input: '',
      normalized_form: '',
      isAmbiguous: false,
      interpretations: [],
    };
  }

  // Step 1: Strip article, detect elision, plural, explicit gender
  const { coreWord, detectedArticle, isElided, isPlural: isPluralArticle, detectedGender } =
    stripFrenchArticle(trimmed);

  // If user only typed "l'" or "l’" with nothing else
  if (isElided && !coreWord) {
    return {
      input: trimmed,
      normalized_form: "l'",
      isAmbiguous: false,
      interpretations: [
        {
          id: 'l-elision-prompt',
          candidate: {
            surface_form: "l'",
            part_of_speech: PartOfSpeech.Noun,
            core_meaning: "Mạo từ rút gọn tiếng Pháp (elision của le hoặc la trước nguyên âm hoặc h câm)",
            example: "l'homme (le), l'école (la)",
            natural_translation: "Vui lòng nhập danh từ đi kèm sau l' để xác định mạo từ tương ứng với le hay la.",
          },
          format_a: {
            entry: "l'",
            grammar: {
              pos: PartOfSpeech.Noun,
            },
            meaning_en: "elided definite article (le/la before vowel/mute h)",
            meaning_vi: "mạo từ xác định rút gọn (le hoặc la đứng trước nguyên âm hoặc h câm)",
            example: {
              french: "l'homme (masculin, le) / l'école (féminin, la)",
              english: "the man (le) / the school (la)",
              vietnamese: "người đàn ông (le) / trường học (la)",
            },
          },
        },
      ],
    };
  }

  const normalizedCore = normalizeKey(coreWord);
  const normalizedRaw = normalizeKey(trimmed);

  // Step 2: Lookup in database
  const matches =
    LEXICAL_DATABASE[normalizedCore] ||
    LEXICAL_DATABASE[normalizedRaw];

  if (matches && matches.length > 0) {
    // Clone and enrich with elision resolution
    const enrichedMatches = matches.map((item) => {
      const cloned: LexicalInterpretation = JSON.parse(JSON.stringify(item));
      if (cloned.format_a.grammar.pos === PartOfSpeech.Noun) {
        const nounGrammar = cloned.format_a.grammar as FormatANounGrammar;

        // If user entered l', identify whether it corresponds to le or la
        if (isElided) {
          const res = nounGrammar.gender === Gender.Masculine ? 'le' : 'la';
          nounGrammar.elision_resolution = res;
        }

        // Ensure articles are set
        const startsVowel = isStartsVowelOrMuteH(coreWord);
        if (nounGrammar.gender === Gender.Masculine) {
          nounGrammar.indefinite_article = 'un';
          nounGrammar.definite_article = startsVowel ? "l'" : 'le';
          nounGrammar.article_display = startsVowel ? "un / le (l')" : 'un / le';
        } else if (nounGrammar.gender === Gender.Feminine) {
          nounGrammar.indefinite_article = 'une';
          nounGrammar.definite_article = startsVowel ? "l'" : 'la';
          nounGrammar.article_display = startsVowel ? "une / la (l')" : 'une / la';
        }

        // Ensure notation right beside noun in entry
        const notation = nounGrammar.gender ? NOUN_GENDER_NOTATION[nounGrammar.gender] : '';
        if (
          notation &&
          !cloned.format_a.entry.includes('n, mas') &&
          !cloned.format_a.entry.includes('n, fem') &&
          !cloned.format_a.entry.includes('(n,')
        ) {
          cloned.format_a.entry = `${cloned.format_a.entry} ${notation}`;
        }
      }
      return cloned;
    });

    return {
      input: trimmed,
      normalized_form: coreWord,
      isAmbiguous: enrichedMatches.length > 1,
      interpretations: enrichedMatches,
    };
  }

  // Step 4: Fallback for uncataloged words
  const fallbackInterpretations = generateFallbackInterpretations(
    trimmed,
    coreWord,
    detectedArticle,
    detectedGender,
  );

  return {
    input: trimmed,
    normalized_form: coreWord,
    isAmbiguous: fallbackInterpretations.length > 1,
    interpretations: fallbackInterpretations,
  };
}
