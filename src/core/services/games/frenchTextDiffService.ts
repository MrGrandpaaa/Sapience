import { TextCheckResult, TextErrorType } from '../../models/games';

/**
 * Service to analyze user typed French text against expected answers.
 *
 * Implements strict checks for:
 * 1. Spelling (exact letter match)
 * 2. Accents (é, è, ê, ë, à, â, î, ï, ô, ù, û, ç, œ)
 * 3. Apostrophes (élision: l', d', s', j', n', c', qu')
 * 4. Correct form
 * 5. Articles (when article is a required part of the noun retrieval)
 */
export class FrenchTextDiffService {
  /**
   * Normalizes apostrophes, unicode accents, and whitespace
   */
  public normalizeTypography(text: string): string {
    return text
      .trim()
      .replace(/[\u2018\u2019\u0060\u00B4]/g, "'") // normalize curly/accented quotes to straight apostrophe
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Strips all French accents/diacritics for phonetic/base comparison
   */
  public stripAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae');
  }

  /**
   * Extracts article and noun root if present
   */
  public parseNounAndArticle(text: string): {
    article: string | null;
    noun: string;
    hasArticle: boolean;
  } {
    const normalized = this.normalizeTypography(text);

    // Matches une, un, des, les, le, la, l', de la, du with word boundaries
    const articleRegex = /^(une\b|un\b|des\b|les\b|le\b|la\b|l'|de la\b|du\b)\s*(.*)$/i;
    const match = normalized.match(articleRegex);

    if (match) {
      return {
        article: match[1].toLowerCase(),
        noun: match[2].trim(),
        hasArticle: true,
      };
    }

    return {
      article: null,
      noun: normalized,
      hasArticle: false,
    };
  }

  /**
   * Evaluates user input against a canonical target and acceptable alternate forms.
   */
  public evaluate(
    userInput: string,
    canonicalExpected: string,
    acceptableVariants: string[] = [],
    isNoun: boolean = false,
  ): TextCheckResult {
    const cleanUser = this.normalizeTypography(userInput);
    const cleanExpected = this.normalizeTypography(canonicalExpected);
    const allExpected = [
      cleanExpected,
      ...acceptableVariants.map((v) => this.normalizeTypography(v)),
    ];

    // 1. Exact Match
    if (allExpected.includes(cleanUser)) {
      return {
        isCorrect: true,
        errorType: null,
        expectedText: canonicalExpected,
        userText: userInput,
        feedbackMessage:
          'Perfect! Correct spelling, accents, and article.',
      };
    }

    // 2. Check if user is completely empty
    if (!cleanUser) {
      return {
        isCorrect: false,
        errorType: 'spelling',
        expectedText: canonicalExpected,
        userText: userInput,
        feedbackMessage: 'No answer entered. Listen again and transcribe the vocabulary.',
      };
    }

    // 3. Special Noun Article Checks
    if (isNoun) {
      const parsedExpected = this.parseNounAndArticle(cleanExpected);
      const parsedUser = this.parseNounAndArticle(cleanUser);

      // User omitted article completely when target expects an article
      if (parsedExpected.hasArticle && !parsedUser.hasArticle) {
        // Did they at least get the noun itself right?
        const strippedUserNoun = this.stripAccents(parsedUser.noun);
        const strippedExpNoun = this.stripAccents(parsedExpected.noun);

        if (strippedUserNoun === strippedExpNoun) {
          return {
            isCorrect: false,
            errorType: 'missing_article',
            expectedText: canonicalExpected,
            userText: userInput,
            feedbackMessage: `Missing article! For nouns, always include the article (e.g. "${parsedExpected.article} ${parsedExpected.noun}").`,
          };
        }
      }

      // User used the WRONG gender article (e.g. "un voiture" vs "une voiture")
      if (
        parsedExpected.hasArticle &&
        parsedUser.hasArticle &&
        parsedExpected.article !== parsedUser.article
      ) {
        const userGender = ['un', 'le'].includes(parsedUser.article!)
          ? 'masculine'
          : ['une', 'la'].includes(parsedUser.article!)
          ? 'feminine'
          : 'other';

        const expGender = ['un', 'le'].includes(parsedExpected.article!)
          ? 'masculine'
          : ['une', 'la'].includes(parsedExpected.article!)
          ? 'feminine'
          : 'other';

        const strippedUserNoun = this.stripAccents(parsedUser.noun);
        const strippedExpNoun = this.stripAccents(parsedExpected.noun);

        if (strippedUserNoun === strippedExpNoun) {
          return {
            isCorrect: false,
            errorType: 'wrong_article',
            expectedText: canonicalExpected,
            userText: userInput,
            feedbackMessage: `Incorrect article/gender: You used "${parsedUser.article}" (${userGender}), but "${parsedExpected.noun}" is ${expGender} ("${parsedExpected.article}").`,
          };
        }
      }
    }

    // 4. Apostrophe / Élision check
    // e.g. "leau" instead of "l'eau", "se souvenir" instead of "s'attendre"
    const userWithoutApos = cleanUser.replace(/'/g, '');
    const expWithoutApos = cleanExpected.replace(/'/g, '');

    if (cleanExpected.includes("'") && !cleanUser.includes("'")) {
      if (
        this.stripAccents(userWithoutApos) === this.stripAccents(expWithoutApos) ||
        cleanUser.replace(/\s+/g, '') === cleanExpected.replace(/['\s]+/g, '')
      ) {
        return {
          isCorrect: false,
          errorType: 'apostrophe',
          expectedText: canonicalExpected,
          userText: userInput,
          feedbackMessage: `Elision apostrophe missing: Requires an apostrophe as in "${canonicalExpected}".`,
        };
      }
    }

    // 5. Accents check (Diacritics mismatch)
    // Compare stripped accents
    const strippedUser = this.stripAccents(cleanUser);
    const matchesStripped = allExpected.some(
      (exp) => this.stripAccents(exp) === strippedUser,
    );

    if (matchesStripped) {
      return {
        isCorrect: false,
        errorType: 'accent',
        expectedText: canonicalExpected,
        userText: userInput,
        feedbackMessage: `Accent error: Letters are correct, but French accents (é, è, ê, à, â, ç...) are missing or incorrect. Canonical answer: "${canonicalExpected}".`,
      };
    }

    // 6. Spelling / Typos
    // Calculate simple similarity
    const distance = this.levenshteinDistance(cleanUser, cleanExpected);
    const maxLen = Math.max(cleanUser.length, cleanExpected.length);
    const similarity = 1 - distance / Math.max(1, maxLen);

    if (similarity > 0.65) {
      return {
        isCorrect: false,
        errorType: 'spelling',
        expectedText: canonicalExpected,
        userText: userInput,
        feedbackMessage: `Close! Minor spelling error. You typed "${userInput}", correct answer is "${canonicalExpected}".`,
      };
    }

    return {
      isCorrect: false,
      errorType: 'spelling',
      expectedText: canonicalExpected,
      userText: userInput,
      feedbackMessage: `Incorrect. Correct answer is: "${canonicalExpected}".`,
    };
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

export const frenchTextDiffService = new FrenchTextDiffService();
