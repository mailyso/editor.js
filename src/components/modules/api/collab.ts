/**
 * @module CollabAPI
 *
 * Collaboration 지원을 위한 최소한의 API 모듈.
 * 외부 CRDT 라이브러리(Yjs 등)가 editor.js와 통합할 때 필요한 기능만 노출한다.
 *
 * 주요 기능:
 * - ModificationsObserver disable/enable (원격 변경 적용 시 로컬 이벤트 차단)
 * - withRemoteApply: 원격 변경 적용을 안전하게 감싸는 유틸
 * - onBlockChange: eventsDispatcher의 BlockChanged 이벤트를 즉시 구독 (400ms 배치 우회)
 * - getBlockContentRoot: 블록의 contenteditable 요소를 반환 (DOM 직접 patch용)
 */
import Module from '../../__module';
import { BlockChanged } from '../../events';
import type { Collab } from '../../../../types/api/collab';

export default class CollabAPI extends Module {
  /**
   * Available methods
   */
  public get methods(): Collab {
    return {
      disableObserver: (): void => this.disableObserver(),
      enableObserver: (): void => this.enableObserver(),
      withRemoteApply: (fn: () => void | Promise<void>): Promise<void> => this.withRemoteApply(fn),
      onBlockChange: (callback: (data: unknown) => void): () => void => this.onBlockChange(callback),
      getBlockContentRoot: (blockId: string): HTMLElement | null => this.getBlockContentRoot(blockId),
    };
  }

  /**
   * Disable ModificationsObserver
   * 원격 변경을 editor.js DOM에 적용할 때 onChange 이벤트가 발생하지 않도록 한다.
   */
  private disableObserver(): void {
    this.Editor.ModificationsObserver.disable();
  }

  /**
   * Enable ModificationsObserver
   */
  private enableObserver(): void {
    this.Editor.ModificationsObserver.enable();
  }

  /**
   * 원격 변경을 안전하게 적용하는 wrapper.
   * Observer를 비활성화하고 fn을 실행한 뒤 다시 활성화한다.
   *
   * @param fn - 원격 변경 적용 함수
   */
  private async withRemoteApply(fn: () => void | Promise<void>): Promise<void> {
    this.disableObserver();
    try {
      await fn();
    } finally {
      this.enableObserver();
    }
  }

  /**
   * BlockChanged 이벤트를 eventsDispatcher에서 직접 구독한다.
   * ModificationsObserver의 400ms 배치를 우회하여 즉시 이벤트를 받는다.
   *
   * @param callback - 이벤트 핸들러
   * @returns unsubscribe 함수
   */
  private onBlockChange(callback: (data: unknown) => void): () => void {
    const handler = (data: unknown): void => {
      callback(data);
    };

    this.eventsDispatcher.on(BlockChanged, handler);

    return (): void => {
      this.eventsDispatcher.off(BlockChanged, handler);
    };
  }

  /**
   * 블록 ID로 해당 블록의 contenteditable 요소를 반환한다.
   * Y.Text → DOM 직접 patch 시 사용.
   *
   * @param blockId - 대상 블록 ID
   * @returns contenteditable HTMLElement 또는 null
   */
  private getBlockContentRoot(blockId: string): HTMLElement | null {
    const block = this.Editor.BlockManager.getBlockById(blockId);

    if (!block) {
      return null;
    }

    // Block의 holder에서 contenteditable 요소 탐색
    const holder = block.holder;

    if (!holder) {
      return null;
    }

    // 우선순위: firstInput (editor.js 공식) → contenteditable → 일반 CSS 선택자
    const firstInput = block.firstInput;

    if (firstInput) {
      return firstInput as HTMLElement;
    }

    return holder.querySelector('[contenteditable="true"]');
  }
}
