import { DomainError } from '../../shared-kernel/domain-error';

/**
 * 楽観ロック競合。読み込み以降に別トランザクションが文書を更新したため、
 * ステールな集約での保存を拒否したことを表す。呼び出し側は再試行する。
 */
export class StaleDocumentError extends DomainError {
  constructor() {
    super('文書が他の操作で更新されています。再試行してください');
  }
}
