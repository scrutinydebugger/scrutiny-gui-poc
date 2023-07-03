export function displayPathToFolderName(displayPath: string): string {
  return displayPath.split("/").pop() as string;
}
