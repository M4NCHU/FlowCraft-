import { create } from "zustand";
import type {
  WorkstationEntity,
  WorkstationStatus,
} from "./types";

type WorkstationState = {
  workstations: WorkstationEntity[];
  getById: (id: string) => WorkstationEntity | undefined;
  addWorkstation: (input: {
    name: string;
    status: WorkstationStatus;
    model?: string;
  }) => void;
};

function createId() {
  return `ws-${crypto.randomUUID()}`;
}

export const useWorkstationsStore = create<WorkstationState>((set, get) => ({
  workstations: [],
  getById: (id) => get().workstations.find((entry) => entry.id === id),
  addWorkstation: ({ name, status, model }) =>
    set((state) => ({
      workstations: state.workstations.concat({
        id: createId(),
        name,
        status,
        model,
      }),
    })),
}));
