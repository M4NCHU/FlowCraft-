export interface CreateHallRequest {
  name: string;
  code: string;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
}

export interface UpdateHallRequest {
  name: string;
  code: string;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
}

export interface HallSectionResponse {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
}

export interface HallSummaryResponse {
  id: string;
  name: string;
  code: string;
  areaSqMeters: number;
  sectionsCount: number;
}

export interface HallDetailsResponse {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
  sections: HallSectionResponse[];
}

export interface CreateSectionRequest {
  name: string;
  code?: string | null;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
}

export interface UpdateSectionRequest {
  name: string;
  code?: string | null;
  description?: string | null;
  outlineJson: string;
  areaSqMeters: number;
}
