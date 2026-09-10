export function extractKoreanRoot(word: string): string {
  // 1. 특수기호 제거 (앞뒤)
  let cleanWord = word.replace(/^[.,!?()[\]{}"'“”‘’<>\-=_+*/&^%$#@~`|\\]+/, '').replace(/[.,!?()[\]{}"'“”‘’<>\-=_+*/&^%$#@~`|\\]+$/, '');

  // 2. 한글이 포함되어 있지 않으면 원본에서 영문/숫자/하이픈만 남기고 반환 (기존 영어 단어 추출 로직 유지)
  if (!/[가-힣]/.test(cleanWord)) {
    return word.replace(/[^a-zA-Z0-9-]/g, '');
  }

  // 1글자 단어는 분리 불가능
  if (cleanWord.length < 2) return cleanWord;

  // 조사 목록 (길이 내림차순 정렬)
  const josaList = [
    // 4글자
    '에서부터', '으로부터', '에게서도', '으로서의', '으로써의',
    // 3글자
    '에서는', '에서의', '에게는', '에게서', '한테는', '보다는', '부터는', '까지는', '이라는', '으로서', '으로써',
    // 2글자
    '에서', '에게', '한테', '으로', '이나', '이라', '이다', '이고', '이니', '이며', '이면', '이지', '인데', '조차', '마저', '부터', '까지', '보다', '로서', '로써', '라도', '다가', '든지', '처럼', '같이', '마다', '마는',
    // 1글자
    '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '만', '나', '다', '고', '며', '면', '지', '게'
  ];

  // 받침 조건이 명확한 조사들
  const jongseongRequired = ['은', '이', '을', '과', '이나', '이라', '이다', '이고', '이니', '이며', '이면', '이지', '인데', '이라는'];
  const noJongseongRequired = ['는', '가', '를', '와', '나', '다', '고', '며', '면', '지', '라는'];

  const getJongseongIndex = (char: string) => {
    const code = char.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return 0;
    return (code - 0xAC00) % 28;
  };

  for (const josa of josaList) {
    if (cleanWord.endsWith(josa)) {
      const rootLength = cleanWord.length - josa.length;
      if (rootLength === 0) continue; // 단어 전체가 조사인 경우 스킵

      const lastCharOfRoot = cleanWord[rootLength - 1];
      const jIdx = getJongseongIndex(lastCharOfRoot);
      const hasJ = jIdx > 0;

      // '로/으로' 계열 특별 규칙 (ㄹ 받침은 '로'와 결합)
      if (josa.startsWith('으로')) {
        // '으로'는 받침이 있어야 하며, 'ㄹ' 받침이 아니어야 함
        if (!hasJ || jIdx === 8) continue;
      } else if (josa.startsWith('로')) {
        // '로'는 받침이 없거나 'ㄹ' 받침이어야 함
        if (hasJ && jIdx !== 8) continue;
      } else if (jongseongRequired.includes(josa)) {
        if (!hasJ) continue;
      } else if (noJongseongRequired.includes(josa)) {
        if (hasJ) continue;
      }

      // 조사를 분리한 어간(Root) 반환
      return cleanWord.slice(0, rootLength);
    }
  }

  return cleanWord;
}
