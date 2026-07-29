import { z } from 'zod';

/**
 * [Phase 1] 에러 메시지 위생화 (Error Sanitization)
 * 데이터베이스 쿼리나 외부 통신 오류 시, 스택 트레이스나 내부 쿼리 구문이 클라이언트에 노출되지 않도록 차단합니다.
 * 서버 로그/터미널에만 상세 정보를 기록하고, 클라이언트에는 일반적(Generic) 에러 메시지를 반환합니다.
 */
export function sanitizeServerError(error: unknown, context?: string): string {
  // 내부 로그/터미널에만 상세 오류 기록
  console.error(`[SERVER_EXCEPTION${context ? ` : ${context}` : ''}]`, error);
  // 클라이언트 반환용 위생화된 메시지 통일
  return "요청을 처리할 수 없습니다.";
}

/**
 * [Phase 1] 엄격한 입력 유효성 검사 유틸리티 (Zod Integration)
 * API 요청의 Body, Query Params, Path Variable 등에 대해 Zod 스키마 검증(safeParse)을 거친 데이터만 전달합니다.
 * 검증 실패 시 HTTP 400 에러 및 위생화된 메시지를 즉시 처리할 수 있도록 돕습니다.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; status: number; errorMessage: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    // 내부적으로 유효성 검증 에러 기록
    console.error("[VALIDATION_ERROR]", result.error.format());
    return {
      success: false,
      status: 400,
      errorMessage: "요청을 처리할 수 없습니다.",
    };
  }
  return {
    success: true,
    data: result.data,
  };
}

/**
 * [Phase 3] PWA 로컬 오프라인 민감 캐시 파기(Cache Purging) 방어벽
 * 로그아웃(Sign out) 또는 보안 초기화 호출 시 Cache Storage(Cache API) 및 오프라인 스토리지를 순회하여 모두 파기·클리어합니다.
 * 평상시 서비스 워커의 백그라운드 오프라인 캐싱은 100% 정상 동작하도록 하면서, 사용자 인터랙션 시 강력한 데이터 초기화를 지원합니다.
 */
export async function purgeSecurityCaches(): Promise<{ success: boolean; message: string }> {
  try {
    let deletedCount = 0;

    // 1. 브라우저 Cache Storage (Cache API) 순회 및 100% 완벽 클리어
    if (typeof window !== 'undefined' && 'caches' in window && window.caches) {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        const deleted = await window.caches.delete(name);
        if (deleted) deletedCount++;
      }
    }

    // 2. 필요 시 세션 및 비상 스토리지 정리
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    console.log(`[SECURITY_PURGE] PWA 오프라인 캐시 스토리지 완벽 삭제 완료 (클리어 횟수: ${deletedCount})`);
    return {
      success: true,
      message: `보안 캐시가 완벽히 비워졌습니다. (삭제된 캐시 구역: ${deletedCount}개)`,
    };
  } catch (err) {
    console.error("[SECURITY_PURGE_ERROR]", err);
    return {
      success: false,
      message: "보안 캐시 삭제 도중 오류가 발생했습니다.",
    };
  }
}
