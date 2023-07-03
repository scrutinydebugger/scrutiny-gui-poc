export function getStore(storeType: "session" | "local") {
  switch (storeType) {
    case "local":
      return window.localStorage;
    case "session":
      return window.sessionStorage;
    default:
      throw new Error("Invalid storeType");
  }
}
