export type SaveState = "saved" | "dirty" | "saving" | "error";
/** One writer per editor. New keystrokes wait for the previous response/revision. */
export class ContentSaveQueue {
  private pending: string | null = null;
  private running: Promise<void> | null = null;
  state: SaveState = "saved";
  error: unknown;
  constructor(
    public revision: string,
    private save: (html: string, revision: string) => Promise<string>,
    private notify: (
      state: SaveState,
      html?: string,
      revision?: string,
    ) => void,
  ) {}
  acknowledge(revision: string) {
    this.revision = revision;
  }
  change(html: string) {
    this.pending = html;
    this.state = "dirty";
    this.notify(this.state, html);
  }
  get dirty() {
    return this.pending !== null || this.running !== null;
  }
  flush(): Promise<void> {
    if (this.running)
      return this.running.then(() =>
        this.pending !== null ? this.flush() : undefined,
      );
    if (this.pending === null) return Promise.resolve();
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  private async drain() {
    while (this.pending !== null) {
      const html = this.pending;
      this.pending = null;
      this.state = "saving";
      this.notify(this.state);
      try {
        this.revision = await this.save(html, this.revision);
        this.error = undefined;
        this.state = this.pending === null ? "saved" : "dirty";
        this.notify(this.state, html, this.revision);
      } catch (error) {
        if (this.pending === null) this.pending = html;
        this.error = error;
        this.state = "error";
        this.notify(this.state);
        throw error;
      }
    }
  }
}
