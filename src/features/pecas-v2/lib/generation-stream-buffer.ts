const RESET = "␞";

/** Accept only the run identified by the trigger's persisted timestamp. */
export class GenerationStreamBuffer {
  private matches = false;
  private started = false;
  private markdown = "";
  private readonly generationId: string;
  constructor(startedAt: string) {
    this.generationId = String(Date.parse(startedAt));
  }
  identify(id: string) {
    this.matches = this.generationId !== "NaN" && id === this.generationId;
    this.started = false;
  }
  append(chunk: string): string | null {
    if (chunk.includes(RESET)) {
      this.started = this.matches;
      this.markdown = "";
    }
    if (!this.started) return null;
    this.markdown += chunk.replace(RESET, "");
    return this.markdown;
  }
}
