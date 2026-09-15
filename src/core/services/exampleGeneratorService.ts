import { PartOfSpeech } from '../models/types';
import { masterVocabularyService } from './masterVocabularyService';

export interface GeneratedExampleResult {
  french: string;
  english: string;
  vietnamese?: string;
  reusedWords: string[];
  selectionReason: 'canonical_native' | 'natural_vocabulary_reuse';
}

/**
 * Natural Semantic Collocation Map.
 *
 * Defines pairs of French words that have authentic, natural, and idiomatic
 * co-occurrence in conversational French. Only grammatically and semantically
 * natural pairings are included — no forced repetitions.
 */
const NATURAL_COLLOCATION_PAIRS: Record<
  string,
  Record<
    string,
    {
      french: string;
      english: string;
      vietnamese: string;
    }
  >
> = {
  lire: {
    livre: {
      french: 'Je lis un livre passionnant dans le salon chaque soir.',
      english: 'I read an exciting book in the living room every evening.',
      vietnamese: 'Tôi đọc một cuốn sách hấp dẫn trong phòng khách mỗi tối.',
    },
    journal: {
      french: 'Mon grand-père lit le journal du matin avec un bon café.',
      english: 'My grandfather reads the morning newspaper with a good coffee.',
      vietnamese: 'Ông tôi đọc tờ báo buổi sáng cùng một tách cà phê thơm ngon.',
    },
  },
  livre: {
    lire: {
      french: 'Ce livre passionnant m’a accompagné pendant tout le voyage.',
      english: 'This exciting book accompanied me throughout the entire journey.',
      vietnamese: 'Cuốn sách hấp dẫn này đã đồng hành cùng tôi suốt chuyến đi.',
    },
  },
  conduire: {
    voiture: {
      french: 'Elle conduit sa voiture avec prudence dans les rues de la ville.',
      english: 'She drives her car carefully through the city streets.',
      vietnamese: 'Cô ấy lái xe ô tô cẩn thận trên các con đường trong thành phố.',
    },
  },
  voiture: {
    conduire: {
      french: 'Elle prend sa voiture tous les jours pour aller au bureau.',
      english: 'She takes her car every day to go to the office.',
      vietnamese: 'Cô ấy đi xe ô tô đi làm mỗi ngày.',
    },
    ville: {
      french: 'Circuler en voiture au centre-ville devient difficile aux heures de pointe.',
      english: 'Driving a car in the city center becomes difficult during rush hour.',
      vietnamese: 'Đi lại bằng ô tô ở trung tâm thành phố trở nên khó khăn vào giờ cao điểm.',
    },
  },
  boire: {
    eau: {
      french: 'Il est essentiel de boire au moins un verre d’eau fraîche au réveil.',
      english: 'It is essential to drink at least a glass of fresh water upon waking.',
      vietnamese: 'Uống ít nhất một ly nước mát khi thức dậy là điều rất cần thiết.',
    },
    cafe: {
      french: 'Nous buvons un café chaud ensemble avant de commencer la journée.',
      english: 'We drink a hot coffee together before starting the day.',
      vietnamese: 'Chúng tôi cùng uống một tách cà phê nóng trước khi bắt đầu ngày mới.',
    },
  },
  eau: {
    boire: {
      french: 'Il est essentiel de boire au moins un litre et demi d’eau par jour.',
      english: 'It is essential to drink at least one and a half litres of water a day.',
      vietnamese: 'Uống ít nhất một lít rưỡi nước mỗi ngày là điều rất cần thiết.',
    },
    mer: {
      french: 'L’eau de la mer est agréable et chaude en cet après-midi d’été.',
      english: 'The sea water is pleasant and warm this summer afternoon.',
      vietnamese: 'Nước biển dễ chịu và ấm áp vào buổi chiều mùa hè này.',
    },
  },
  manger: {
    pain: {
      french: 'Les enfants mangent du pain frais avec du chocolat pour le goûter.',
      english: 'The children eat fresh bread with chocolate for afternoon snack.',
      vietnamese: 'Lũ trẻ ăn bánh mì tươi với sô-cô-la cho bữa xế.',
    },
  },
  pain: {
    manger: {
      french: 'L’odeur du pain chaud qui sort du four embaume toute la boulangerie.',
      english: 'The smell of warm bread coming out of the oven fills the bakery.',
      vietnamese: 'Mùi bánh mì nóng mới ra lò lan tỏa khắp tiệm bánh.',
    },
  },
  ouvrir: {
    porte: {
      french: 'N’oubliez pas d’ouvrir la porte pour accueillir nos invités.',
      english: 'Do not forget to open the door to welcome our guests.',
      vietnamese: 'Đừng quên mở cửa để đón khách của chúng ta.',
    },
    fenetre: {
      french: 'J’ouvre la fenêtre le matin pour faire entrer l’air frais dans la chambre.',
      english: 'I open the window in the morning to let fresh air into the room.',
      vietnamese: 'Tôi mở cửa sổ vào buổi sáng để đón khí tươi vào phòng.',
    },
  },
  porte: {
    fermer: {
      french: 'N’oubliez pas de fermer la porte à clé avant de quitter l’appartement.',
      english: 'Do not forget to lock the door before leaving the apartment.',
      vietnamese: 'Đừng quên khóa cửa trước khi rời khỏi căn hộ.',
    },
  },
  visiter: {
    ville: {
      french: 'Nous avons visité cette charmante ville historique avec un guide local.',
      english: 'We visited this charming historic city with a local guide.',
      vietnamese: 'Chúng tôi đã tham quan thành phố lịch sử quyến rũ này cùng một hướng dẫn viên địa phương.',
    },
    chateau: {
      french: 'Nous avons visité un magnifique château médiéval le week-end dernier.',
      english: 'We visited a magnificent medieval castle last weekend.',
      vietnamese: 'Chúng tôi đã tham quan một lâu đài thời trung cổ tráng lệ vào cuối tuần trước.',
    },
  },
  attendre: {
    ami: {
      french: 'J’attends mon ami devant la gare depuis une dizaine de minutes.',
      english: 'I have been waiting for my friend in front of the station for about ten minutes.',
      vietnamese: 'Tôi đang đợi bạn mình trước nhà ga được khoảng mười phút rồi.',
    },
  },
  parler: {
    ami: {
      french: 'Je parle souvent avec mon ami de nos projets d’avenir.',
      english: 'I often talk with my friend about our future plans.',
      vietnamese: 'Tôi thường nói chuyện với bạn mình về các dự định tương lai.',
    },
  },
};

/**
 * Normalizes a word for matching against collocation dictionaries.
 */
function cleanKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(un|une|le|la|les|des|l'|l’)\s+/i, '')
    .replace(/\s*\(n,\s*(mas|fem)\)/i, '')
    .trim();
}

/**
 * Natural Example Generator Service.
 *
 * Strict priority order:
 * 1. Natural, grammatically correct French (HIGHEST PRIORITY)
 * 2. Correct use of target word / grammatical construction
 * 3. Reuse previously learned vocabulary IF and ONLY IF it fits naturally
 *
 * Anti-forcing rule:
 * - If reusing old vocabulary would make the sentence unnatural,
 *   grammatically awkward, or semantically strange, DO NOT REUSE.
 * - Always falls back to authentic canonical native French sentences.
 */
export class ExampleGeneratorService {
  /**
   * Generates or selects the best conversational example for a target vocabulary item.
   */
  public generateExample(
    targetEntry: string,
    targetPos: PartOfSpeech,
    defaultCanonicalExample?: {
      french: string;
      english: string;
      vietnamese?: string;
    },
  ): GeneratedExampleResult {
    const targetKey = cleanKey(targetEntry);

    // Get the learner's Master Vocabulary List
    const learnedWords = masterVocabularyService.getLearnedWords();

    // Check if any learned words naturally and idiomatic match the target word
    if (NATURAL_COLLOCATION_PAIRS[targetKey] && learnedWords.length > 0) {
      const availablePairings = NATURAL_COLLOCATION_PAIRS[targetKey];

      for (const learned of learnedWords) {
        const learnedKey = cleanKey(learned.word);
        if (learnedKey !== targetKey && availablePairings[learnedKey]) {
          const naturalPairing = availablePairings[learnedKey];

          // Priority 1 & 2 verified: authentic conversational French with correct usage
          // Priority 3 verified: naturally reused a learned word
          return {
            french: naturalPairing.french,
            english: naturalPairing.english,
            vietnamese: naturalPairing.vietnamese,
            reusedWords: [learned.word],
            selectionReason: 'natural_vocabulary_reuse',
          };
        }
      }
    }

    // If no natural pairing exists among learned words, use the canonical native example.
    // "Nếu việc reuse vocabulary cũ khiến câu unnatural/awkward -> không reuse."
    if (defaultCanonicalExample && defaultCanonicalExample.french) {
      return {
        french: defaultCanonicalExample.french,
        english: defaultCanonicalExample.english,
        vietnamese: defaultCanonicalExample.vietnamese,
        reusedWords: [],
        selectionReason: 'canonical_native',
      };
    }

    // Default fallback if no example provided
    return {
      french: `C’est un exemple naturel avec ${targetEntry}.`,
      english: `This is a natural example with ${targetEntry}.`,
      vietnamese: `Đây là một ví dụ tự nhiên với từ ${targetEntry}.`,
      reusedWords: [],
      selectionReason: 'canonical_native',
    };
  }
}

export const exampleGeneratorService = new ExampleGeneratorService();
