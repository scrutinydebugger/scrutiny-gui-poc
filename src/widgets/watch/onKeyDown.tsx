/**
 * Aimed to be used as a method that you return the result of in a useEffect hook
 *
 * @param key https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @param handle
 */

export function onKeyDown(
  key: string | string[] | { (key: string): boolean },
  handle: { (event: KeyboardEvent): void },
  eventName: "keydown" | "keyup" | "keypress" = "keydown"
) {
  const isMyEvent =
    typeof key === "function"
      ? key
      : typeof key === "string"
      ? (k: string) => k === key
      : (k: string) => key.includes(k);
  function keyDownHandler(event: KeyboardEvent) {
    if (isMyEvent(event.key)) handle(event);
  }
  document.addEventListener(eventName, keyDownHandler);
  return () => {
    document.removeEventListener(eventName, keyDownHandler);
  };
}
