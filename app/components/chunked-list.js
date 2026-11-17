const CHUNK = 100;

// Draws `items` into `list` 100 rows at a time: 100 more each time `more` (an empty div after the list) scrolls near view.
// `row(item, i)` returns one row's HTML. `onChunk` runs after each batch. Returns a stop function.
export function chunkedList(list, more, items, row, onChunk) {
  let shown = 0;
  const draw = () => {
    list.insertAdjacentHTML("beforeend", items.slice(shown, shown + CHUNK).map((s, k) => row(s, shown + k)).join(""));
    shown += CHUNK;
    onChunk?.();
  };
  draw(); // first rows now, so a redraw never shows an empty list for a frame
  const observer = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    draw();
    if (shown >= items.length) observer.disconnect();
  }, { rootMargin: "600px" });
  if (shown < items.length) observer.observe(more);
  return () => observer.disconnect();
}
