export type Entry = {
  id: string;
  name: string;
  description: string;
  content: string;
};

export type SearchResult = Entry & {
  distance: number;
};
