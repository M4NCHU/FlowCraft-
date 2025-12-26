import { create } from "zustand";
import { nanoid } from "nanoid";

export type MachineStatus = "operational" | "maintenance" | "down";
export type Machine = {
  id: string;
  name: string;
  status: MachineStatus;
  model?: string;
  description?: string;
};

type State = {
  machines: Machine[];
  getById: (id: string) => Machine | undefined;
  addMachine: (m: {
    name: string;
    status: MachineStatus;
    model?: string;
  }) => void;
};

export const useMachinesStore = create<State>((set, get) => ({
  machines: [
    { id: "m-1", name: "TRUMPF 3030", status: "operational", model: "L3030" },
    {
      id: "m-2",
      name: "DMG MORI NLX",
      status: "maintenance",
      model: "NLX 2500",
    },
    { id: "m-3", name: "Fanuc Robodrill", status: "down", model: "α-D21MiB5" },
  ],
  getById: (id) => get().machines.find((x) => x.id === id),
  addMachine: ({ name, status, model }) =>
    set((s) => ({
      machines: s.machines.concat({ id: nanoid(), name, status, model }),
    })),
}));
