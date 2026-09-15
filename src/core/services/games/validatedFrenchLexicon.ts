import { Gender, PartOfSpeech } from '../../models/types';

export interface ValidatedLexiconEntry {
  surface_form: string;
  part_of_speech: PartOfSpeech;
  gender?: Gender;
  canonical_article?: string;
  meaning_vi: string;
  example_fr?: string;
  example_vi?: string;
  preposition_pattern?: string;
}

/**
 * Validated French Lexicon Bank for distractor and exercise generation.
 * Guaranteed authentic French with correct articles and verified grammar.
 */
export const VALIDATED_FRENCH_LEXICON: ValidatedLexiconEntry[] = [
  // ── NOUNS (Masculine) ──
  {
    surface_form: 'un livre',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'cuốn sách',
    example_fr: 'Je lis un livre intéressant ce soir.',
    example_vi: 'Tôi đọc một cuốn sách thú vị tối nay.',
  },
  {
    surface_form: 'un stylo',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'cây bút bi',
    example_fr: 'Il écrit avec un stylo bleu.',
    example_vi: 'Anh ấy viết bằng một cây bút bi xanh.',
  },
  {
    surface_form: 'un train',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'chuyến tàu hỏa',
    example_fr: 'Le train arrive à l’heure.',
    example_vi: 'Chuyến tàu đến đúng giờ.',
  },
  {
    surface_form: 'un café',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'quán cà phê / tách cà phê',
    example_fr: 'Prenons un café ensemble.',
    example_vi: 'Chúng ta hãy cùng uống một tách cà phê.',
  },
  {
    surface_form: 'un voyage',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'chuyến du lịch',
    example_fr: 'Ils préparent un voyage en France.',
    example_vi: 'Họ đang chuẩn bị một chuyến du lịch sang Pháp.',
  },
  {
    surface_form: 'un travail',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'công việc',
    example_fr: 'Il a trouvé un travail intéressant.',
    example_vi: 'Anh ấy đã tìm được một công việc thú vị.',
  },
  {
    surface_form: 'un arbre',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'cái cây',
    example_fr: 'Il y a un grand arbre dans le jardin.',
    example_vi: 'Có một cái cây to trong vườn.',
  },
  {
    surface_form: 'un bureau',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Masculine,
    canonical_article: 'un',
    meaning_vi: 'văn phòng / bàn làm việc',
    example_fr: 'Je vais au bureau tous les matins.',
    example_vi: 'Tôi đến văn phòng mỗi buổi sáng.',
  },

  // ── NOUNS (Feminine) ──
  {
    surface_form: 'une voiture',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'chiếc xe hơi',
    example_fr: 'Elle conduit une voiture rouge.',
    example_vi: 'Cô ấy lái một chiếc xe hơi màu đỏ.',
  },
  {
    surface_form: 'une maison',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'ngôi nhà',
    example_fr: 'Nous habitons dans une belle maison.',
    example_vi: 'Chúng tôi sống trong một ngôi nhà đẹp.',
  },
  {
    surface_form: 'une table',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'cái bàn',
    example_fr: 'Les clés sont posées sur la table.',
    example_vi: 'Chùm chìa khóa được đặt trên bàn.',
  },
  {
    surface_form: 'une porte',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'cánh cửa',
    example_fr: 'Ferme la porte s’il te plaît.',
    example_vi: 'Làm ơn đóng cửa lại.',
  },
  {
    surface_form: 'une gare',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'nhà ga',
    example_fr: 'Je vous attends à la gare.',
    example_vi: 'Tôi đợi bạn ở nhà ga.',
  },
  {
    surface_form: 'une ville',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'thành phố',
    example_fr: 'Paris est une grande ville culturelle.',
    example_vi: 'Paris là một thành phố văn hóa lớn.',
  },
  {
    surface_form: 'une fenêtre',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'cửa sổ',
    example_fr: 'Elle regarde la pluie par la fenêtre.',
    example_vi: 'Cô ấy ngắm mưa qua cửa sổ.',
  },
  {
    surface_form: 'une école',
    part_of_speech: PartOfSpeech.Noun,
    gender: Gender.Feminine,
    canonical_article: 'une',
    meaning_vi: 'trường học',
    example_fr: 'Les enfants vont à l’école.',
    example_vi: 'Trẻ em đi đến trường.',
  },

  // ── VERBS (Transitive, Prepositional, Reflexive) ──
  {
    surface_form: 'parler',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'nói, nói chuyện',
    preposition_pattern: 'parler à qn / de qc',
    example_fr: 'Je parle souvent à mon professeur.',
    example_vi: 'Tôi thường nói chuyện với thầy giáo của tôi.',
  },
  {
    surface_form: 'attendre',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'chờ đợi',
    preposition_pattern: 'attendre qn/qc (direct, sans préposition)',
    example_fr: 'J’attends le bus depuis dix minutes.',
    example_vi: 'Tôi đang đợi xe buýt được mười phút rồi.',
  },
  {
    surface_form: "s'attendre",
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'lường trước, dự tính điều gì',
    preposition_pattern: "s'attendre à qc / infinitif",
    example_fr: 'Je m’attends à un retard à cause de la neige.',
    example_vi: 'Tôi lường trước một sự chậm trễ vì tuyết rơi.',
  },
  {
    surface_form: 'se souvenir',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'nhớ lại, hồi tưởng',
    preposition_pattern: 'se souvenir de qn/qc',
    example_fr: 'Elle se souvient de son premier jour d’école.',
    example_vi: 'Cô ấy nhớ lại ngày đầu tiên đi học của mình.',
  },
  {
    surface_form: 'commencer',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'bắt đầu',
    preposition_pattern: 'commencer à + infinitif',
    example_fr: 'Le concert commence à huit heures.',
    example_vi: 'Buổi hòa nhạc bắt đầu lúc tám giờ.',
  },
  {
    surface_form: 'décider',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'quyết định',
    preposition_pattern: 'décider de + infinitif',
    example_fr: 'Nous avons décidé de partir en vacances.',
    example_vi: 'Chúng tôi đã quyết định đi nghỉ mát.',
  },
  {
    surface_form: 'avoir besoin',
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'cần có',
    preposition_pattern: 'avoir besoin de qc/infinitif',
    example_fr: 'J’ai besoin de ton aide aujourd’hui.',
    example_vi: 'Hôm nay tôi cần sự giúp đỡ của bạn.',
  },
  {
    surface_form: "s'intéresser",
    part_of_speech: PartOfSpeech.Verb,
    meaning_vi: 'quan tâm, hứng thú với',
    preposition_pattern: "s'intéresser à qc",
    example_fr: 'Il s’intéresse à la littérature française.',
    example_vi: 'Anh ấy hứng thú với văn học Pháp.',
  },

  // ── ADJECTIVES ──
  {
    surface_form: 'grand',
    part_of_speech: PartOfSpeech.Adjective,
    meaning_vi: 'lớn, cao lớn',
    example_fr: 'C’est un grand bâtiment au centre-ville.',
    example_vi: 'Đó là một tòa nhà lớn ở trung tâm thành phố.',
  },
  {
    surface_form: 'petit',
    part_of_speech: PartOfSpeech.Adjective,
    meaning_vi: 'nhỏ, bé',
    example_fr: 'Il a un petit appartement à Lyon.',
    example_vi: 'Anh ấy có một căn hộ nhỏ ở Lyon.',
  },
  {
    surface_form: 'nouveau',
    part_of_speech: PartOfSpeech.Adjective,
    meaning_vi: 'mới',
    example_fr: 'Voici mon nouveau collègue de bureau.',
    example_vi: 'Đây là người đồng nghiệp mới tại cơ quan của tôi.',
  },
  {
    surface_form: 'ancien',
    part_of_speech: PartOfSpeech.Adjective,
    meaning_vi: 'cũ, cổ kính / cựu (trước danh từ)',
    example_fr: 'Ils habitent dans un bâtiment ancien.',
    example_vi: 'Họ sống trong một tòa nhà cổ kính.',
  },
];
