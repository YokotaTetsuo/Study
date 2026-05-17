import type { SessionStore } from './session-store';

export interface LogoutCommand {
  readonly sessionId: string;
}

/** セッションを破棄する（冪等）。 */
export class LogoutUseCase {
  readonly #sessions: SessionStore;

  constructor(deps: { sessions: SessionStore }) {
    this.#sessions = deps.sessions;
  }

  async execute(command: LogoutCommand): Promise<void> {
    await this.#sessions.destroy(command.sessionId);
  }
}
