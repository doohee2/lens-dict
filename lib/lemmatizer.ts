import lemmatize from 'wink-lemmatizer';

export interface LemmatizedCandidate {
  lemma: string;
  label: string;
}

/**
 * 주어진 단어의 동사 원형, 명사 단수형, 형용사 원형을 계산하여
 * 원본과 다른 유효한 표제어(Lemma) 후보군을 추출합니다.
 */
export function getLemmas(word: string): LemmatizedCandidate[] {
  if (!word || word.trim().length === 0) return [];

  const cleanWord = word.trim().toLowerCase();
  const lemmaMap = new Map<string, string[]>();

  const addLemma = (lemma: string, label: string) => {
    if (lemma && lemma !== cleanWord && lemma.length > 1) {
      const existing = lemmaMap.get(lemma) || [];
      if (!existing.includes(label)) {
        existing.push(label);
        lemmaMap.set(lemma, existing);
      }
    }
  };

  try {
    addLemma(lemmatize.verb(cleanWord), '동사 원형');
    addLemma(lemmatize.noun(cleanWord), '명사 단수형');
    addLemma(lemmatize.adjective(cleanWord), '형용사 원형');
  } catch (e) {
    console.error('Lemmatizer error:', e);
  }

  const candidates: LemmatizedCandidate[] = [];
  lemmaMap.forEach((labels, lemma) => {
    candidates.push({
      lemma,
      label: labels.join(' · '),
    });
  });

  return candidates;
}
