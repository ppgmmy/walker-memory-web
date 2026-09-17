export type PlaceKind = "merchant" | "residence";

export type PlaceRecord = {
  id: string;
  kind: PlaceKind;
  name: string;
  nameAliases?: string[];
  district?: string;
  area?: string;
  address?: string;
  blocks?: string[];
  entranceTip?: string;
  status?: string;
  source?: string;
  visits?: number;
  lastWasteMinutes?: number;
  updatedAt?: string;
};

export type RiderNote = {
  id: string;
  kind: PlaceKind;
  name: string;
  area?: string;
  tip: string;
  transcript?: string;
  wasteMinutes?: number;
  createdAt: string;
  source: "rider";
};

export type DatasetBundle = {
  version: string;
  updatedAt: string;
  merchants: PlaceRecord[];
  residences: PlaceRecord[];
};

export type RiderNotesFile = {
  version: string;
  updatedAt: string;
  notes: RiderNote[];
};
