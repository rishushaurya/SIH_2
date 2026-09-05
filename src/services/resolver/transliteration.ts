/**
 * Devanagari to Latin Phonetic Transliteration Dictionary & Normalizer
 * Designed specifically for Marathi names, surnames, and administrative terms.
 */

const DEVANAGARI_MAP: Record<string, string> = {
  // Vowels (स्वर)
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',

  // Consonants (व्यंजने)
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'dny',

  // Matras (मात्रा)
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', '्': '',
};

// Common Maharashtra Surname & Name Canonical Aliases
const COMMON_NAME_ALIASES: Record<string, string> = {
  'शर्मा': 'sharma',
  'पवार': 'pawar',
  'देशमुख': 'deshmukh',
  'जाधव': 'jadhav',
  'पाटील': 'patil',
  'गायकवाड': 'gaikwad',
  'शिंदे': 'shinde',
  'कुलकर्णी': 'kulkarni',
  'जोशी': 'joshi',
  'भोसले': 'bhosale',
  'कांबळे': 'kamble',
  'प्रिया': 'priya',
  'राजेश': 'rajesh',
  'अनन्या': 'ananya',
  'सुनील': 'sunil',
  'रमेश': 'ramesh',
  'गणपत': 'ganpat',
  'विजय': 'vijay',
  'बबन': 'baban',
};

export function transliterateDevanagari(text: string): string {
  if (!text) return '';

  let cleaned = text.trim();

  // 1. Direct word alias lookup first
  const words = cleaned.split(/\s+/);
  const mappedWords = words.map((word) => {
    const lowerWord = word.trim();
    if (COMMON_NAME_ALIASES[lowerWord]) {
      return COMMON_NAME_ALIASES[lowerWord];
    }

    // Character by character transliteration
    let result = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (DEVANAGARI_MAP[char] !== undefined) {
        result += DEVANAGARI_MAP[char];
      } else {
        result += char;
      }
    }
    return result;
  });

  return mappedWords.join(' ');
}

export function normalizeName(name: string): string {
  if (!name) return '';

  let normalized = name.toLowerCase();

  // If Devanagari characters present, transliterate first
  if (/[\u0900-\u097F]/.test(normalized)) {
    normalized = transliterateDevanagari(normalized);
  }

  // Strip honorifics & titles
  normalized = normalized.replace(/\b(shri|smt|dr|mr|mrs|miss|kumari|adv)\b\.?/gi, '');

  // Remove punctuation, single dots, extra whitespace
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
