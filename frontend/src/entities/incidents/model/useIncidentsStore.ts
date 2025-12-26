import { create } from "zustand";
import { nanoid } from "nanoid";

export type IncidentStatus = "open" | "in_progress" | "resolved";
export type IncidentSeverity = "low" | "medium" | "high";

export type IncidentComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string; // ISO
};

export type IncidentEvent = {
  id: string;
  type:
    | "created"
    | "status_changed"
    | "assigned"
    | "work_scheduled"
    | "note"
    | "attachment_added"
    | "resolved";
  meta?: Record<string, string>;
  createdAt: string; // ISO
};

export type IncidentAttachment = {
  id: string;
  name: string;
  size?: number;
  url?: string; // w POC może być pusty; w prod -> link do backendu
  uploadedAt: string;
};

export type Incident = {
  id: string;
  title: string;
  description?: string;
  machineId?: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  createdAt: string;
  reportedBy?: string;

  // nowe pola
  assignee?: string; // np. login/ID technika
  dueAt?: string; // termin (ISO)
  tags?: string[];
  comments?: IncidentComment[];
  events?: IncidentEvent[];
  attachments?: IncidentAttachment[];
  resolutionNote?: string;
  resolutionAt?: string;
  costEstimate?: number; // koszt planowany
  costActual?: number; // koszt faktyczny
};

type State = {
  incidents: Incident[];

  addIncident: (
    i: Omit<
      Incident,
      "id" | "createdAt" | "events" | "comments" | "attachments"
    > & {
      createdAt?: string;
    }
  ) => void;

  updateStatus: (
    id: string,
    status: IncidentStatus,
    meta?: Record<string, string>
  ) => void;
  assignTo: (id: string, assignee: string) => void;
  scheduleWork: (id: string, dueAt: string, costEstimate?: number) => void;

  addComment: (id: string, author: string, message: string) => void;
  addAttachment: (
    id: string,
    file: { name: string; size?: number; url?: string }
  ) => void;

  resolve: (id: string, note?: string, costActual?: number) => void;
};

const now = () => new Date().toISOString();

export const useIncidentsStore = create<State>((set) => ({
  incidents: [
    {
      id: "i-1",
      title: "Wibracje na osi X",
      description: "Podejrzenie luzu na łożysku.",
      machineId: "m-2",
      status: "in_progress",
      severity: "medium",
      createdAt: now(),
      reportedBy: "mszwast",
      assignee: "tech01",
      dueAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      tags: ["mechanika", "łożysko"],
      comments: [
        {
          id: nanoid(),
          author: "tech01",
          message: "Zamówione łożysko 6204 2RS.",
          createdAt: now(),
        },
      ],
      events: [
        {
          id: nanoid(),
          type: "created",
          createdAt: now(),
          meta: { by: "mszwast" },
        },
        {
          id: nanoid(),
          type: "assigned",
          createdAt: now(),
          meta: { to: "tech01" },
        },
        {
          id: nanoid(),
          type: "work_scheduled",
          createdAt: now(),
          meta: { dueAt: "" },
        },
      ],
      attachments: [],
      costEstimate: 450,
    },
    {
      id: "i-2",
      title: "Przeciek hydrauliki",
      description: "Wycieki przy rozdzielaczu.",
      machineId: "m-3",
      status: "open",
      severity: "high",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      reportedBy: "operator01",
      tags: ["hydraulika"],
      comments: [],
      events: [
        {
          id: nanoid(),
          type: "created",
          createdAt: now(),
          meta: { by: "operator01" },
        },
      ],
      attachments: [],
    },
  ],

  addIncident: (i) =>
    set((s) => ({
      incidents: s.incidents.concat({
        id: nanoid(),
        createdAt: i.createdAt ?? now(),
        comments: [],
        events: [
          {
            id: nanoid(),
            type: "created",
            createdAt: now(),
            meta: { by: i.reportedBy ?? "user" },
          },
        ],
        attachments: [],
        ...i,
      }),
    })),

  updateStatus: (id, status, meta) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "status_changed",
                createdAt: now(),
                meta: { from: x.status, to: status, ...(meta ?? {}) },
              }),
            }
          : x
      ),
    })),

  assignTo: (id, assignee) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              assignee,
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "assigned",
                createdAt: now(),
                meta: { to: assignee },
              }),
            }
          : x
      ),
    })),

  scheduleWork: (id, dueAt, costEstimate) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              dueAt,
              costEstimate: costEstimate ?? x.costEstimate,
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "work_scheduled",
                createdAt: now(),
                meta: { dueAt, costEstimate: String(costEstimate ?? "") },
              }),
            }
          : x
      ),
    })),

  addComment: (id, author, message) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              comments: (x.comments ?? []).concat({
                id: nanoid(),
                author,
                message,
                createdAt: now(),
              }),
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "note",
                createdAt: now(),
                meta: { author },
              }),
            }
          : x
      ),
    })),

  addAttachment: (id, file) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              attachments: (x.attachments ?? []).concat({
                id: nanoid(),
                name: file.name,
                size: file.size,
                url: file.url,
                uploadedAt: now(),
              }),
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "attachment_added",
                createdAt: now(),
                meta: { name: file.name },
              }),
            }
          : x
      ),
    })),

  resolve: (id, note, costActual) =>
    set((s) => ({
      incidents: s.incidents.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "resolved",
              resolutionNote: note ?? x.resolutionNote,
              costActual: costActual ?? x.costActual,
              resolutionAt: now(),
              events: (x.events ?? []).concat({
                id: nanoid(),
                type: "resolved",
                createdAt: now(),
                meta: { by: "user" },
              }),
            }
          : x
      ),
    })),
}));
