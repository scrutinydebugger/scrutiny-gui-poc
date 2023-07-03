export interface listenHandle {
  (name: string, handle: { (data?: any): void }): { (): void };
}
export interface triggerHandle {
  (name: string, data?: any): void;
}
