import Dexie, { Table } from 'dexie';

export interface DictionaryEntry {
  id?: number;
  word: string;
  definition: string;
}

export interface ResourceEntry {
  filename: string;
  data: string; // Base64 encoded image
}

export class LensDictionaryDB extends Dexie {
  dictionary!: Table<DictionaryEntry>;
  resources!: Table<ResourceEntry>;

  constructor() {
    super('LensDictionaryDB');
    this.version(2).stores({
      dictionary: '++id, word', // Primary key and indexed props
      resources: 'filename'
    });
  }
}

export const db = new LensDictionaryDB();
