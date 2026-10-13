/** User-started playback of complete, observed snapshots; never interpolated dates. */
export class DateTimeline {
  constructor(container, select) {
    this.container = container;
    this.select = select;
    this.dates = [];
    this.generation = 0;
    this.play = container.querySelector("#play-dates");
    this.buttons = container.querySelector("#timeline-dates");
    this.play.addEventListener("click", () => {
      if (this.playing) this.pause();
      else {
        this.playing = true;
        this.updatePlay();
        this.advance(++this.generation);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
    });
  }

  context(dates, visible) {
    if (!visible) this.pause();
    this.container.hidden = !visible;
    if (this.dates.join() === dates.join()) return;
    this.pause();
    this.dates = dates;
    this.buttons.replaceChildren(
      ...dates.map((date) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.date = date;
        const day = new Date(`${date}T12:00:00Z`);
        button.textContent = day.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        });
        button.setAttribute(
          "aria-label",
          day.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }),
        );
        button.addEventListener("click", () => {
          this.pause();
          this.select(date);
        });
        return button;
      }),
    );
  }

  commit(date) {
    this.date = date;
    for (const button of this.buttons.children)
      button.setAttribute("aria-pressed", String(button.dataset.date === date));
  }

  async advance(generation) {
    const next =
      this.dates[(this.dates.indexOf(this.date) + 1) % this.dates.length];
    const shown = await this.select(next);
    if (generation !== this.generation) return;
    if (!shown) return this.pause();
    // Hold each successfully loaded snapshot for two seconds, even on a slow link.
    this.timer = setTimeout(() => this.advance(generation), 2000);
  }

  pause() {
    ++this.generation;
    clearTimeout(this.timer);
    this.playing = false;
    this.updatePlay();
  }

  updatePlay() {
    this.play.setAttribute(
      "aria-label",
      this.playing ? "Pause dates" : "Play dates",
    );
    this.play.setAttribute("aria-pressed", String(this.playing));
    this.play.title = this.playing
      ? "Pause dates"
      : "Play available survey dates";
    this.play.querySelector("span").textContent = this.playing ? "Ⅱ" : "▶";
  }
}
