export interface Project {
  id: string;
  name: string;
  project_code: string;
  client: string;
  status: string;
  description: string;
  total_volume: number;
  created_at: string;
}

export interface Piece {
  id: string;
  name: string;
  group: string;
  quantity: number;
  section: string;
  length: number;
  weight: number;
  unit_volume: number;
  concrete_class: string;
  piece_ids: string[];
}