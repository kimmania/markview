export interface FileEntry {
  path: string;
  name: string;
  is_dir: boolean;
  children: FileEntry[];
}

export interface Tab {
  path: string;
  name: string;
  content: string;
  unsaved: boolean;
}

export interface SearchMatch {
  path: string;
  name: string;
  line: number;
  snippet: string;
  score: number;
}
