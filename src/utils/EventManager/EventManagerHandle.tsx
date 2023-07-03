export interface EventManagerHandle<Event = any> {
  (event: Event): void;
}
