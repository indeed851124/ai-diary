/** 일기를 막 쓴 직후 상세 화면에서 한 번만 공개 연출을 보여주기 위한 sessionStorage 키. */
export const REVEAL_KEY = (id: string) => `reveal:${id}`;