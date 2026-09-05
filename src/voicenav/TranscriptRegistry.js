export class TranscriptRegistry {
  entries = [];
  get current() {
    return this.currentEntry?.callback || null;
  }
  get currentEntry() { return [...this.entries].sort((a, b) => b.priority - a.priority || b.order - a.order)[0]; }
  order = 0;
  add(callback, priority = 0, context = null) {
    const entry = { callback, priority, context, order: ++this.order };
    this.entries.push(entry);
    return () => { this.entries = this.entries.filter(item => item !== entry); };
  }
  clear() { this.entries = []; }
}
