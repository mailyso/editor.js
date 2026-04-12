/**
 * Collaboration API
 *
 * 외부 CRDT 라이브러리(Yjs 등)와 editor.js를 통합하기 위한 API.
 */
export interface Collab {
  /**
   * ModificationsObserver 비활성화.
   * 원격 변경을 DOM에 적용할 때 onChange 이벤트를 차단한다.
   */
  disableObserver(): void;

  /**
   * ModificationsObserver 활성화.
   */
  enableObserver(): void;

  /**
   * 원격 변경 적용을 안전하게 감싸는 wrapper.
   * Observer를 비활성화한 상태에서 fn을 실행하고 이후 다시 활성화한다.
   *
   * @param fn - 원격 변경 적용 함수
   */
  withRemoteApply(fn: () => void | Promise<void>): Promise<void>;

  /**
   * BlockChanged 이벤트를 즉시 구독 (ModificationsObserver 400ms 배치 우회).
   * eventsDispatcher에서 직접 구독하므로 block-added/removed/changed/moved를 지연 없이 받는다.
   *
   * @param callback - 이벤트 핸들러
   * @returns unsubscribe 함수
   */
  onBlockChange(callback: (data: unknown) => void): () => void;

  /**
   * 블록 ID로 해당 블록의 contenteditable 요소를 반환.
   * Y.Text → DOM 직접 patch에 사용.
   *
   * @param blockId - 대상 블록 ID
   * @returns contenteditable HTMLElement 또는 null
   */
  getBlockContentRoot(blockId: string): HTMLElement | null;
}
