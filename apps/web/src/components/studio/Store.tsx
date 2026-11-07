"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { blankGraph, type Program } from "./data";
export type Review = {
  id: string;
  rating: string;
  days: number;
  at: string;
  due: string;
};
export type StudioState = {
  version: 1;
  programs: Record<string, Program>;
  reviews: Review[];
  activity: { text: string; at: string }[];
  theme: "dark" | "light";
  collapsed: boolean;
  provider: string;
  model: string;
  overrides: Record<string, string>;
};
const initial: StudioState = {
  version: 1,
  programs: {},
  reviews: [],
  activity: [],
  theme: "dark",
  collapsed: false,
  provider: "Codex",
  model: "Sol · medium",
  overrides: {},
};
export const newProgram = (): Program => ({
  stage: 0,
  section: 0,
  answers: {},
  completed: [],
  feedback: {},
  annotations: [],
  graph: blankGraph(),
  reconstruction: blankGraph(),
});
const Store = createContext<{
  state: StudioState;
  update: (fn: (previous: StudioState) => StudioState) => void;
  storageError: string;
}>({ state: initial, update: () => {}, storageError: "" });
export function StudioStore({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let saved: StudioState = initial;
    try {
      const raw = localStorage.getItem("mnemosyne.studio.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.version === 1 &&
          parsed.programs &&
          Array.isArray(parsed.reviews) &&
          Array.isArray(parsed.activity)
        )
          saved = { ...initial, ...parsed };
      }
    } catch {
      queueMicrotask(() =>
        setStorageError(
          "Saved progress could not be read. This session is still usable.",
        ),
      );
    }
    queueMicrotask(() => {
      setState(saved);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("mnemosyne.studio.v1", JSON.stringify(state));
    } catch {
      queueMicrotask(() =>
        setStorageError(
          "Browser storage is full or unavailable. Keep this tab open to preserve this session.",
        ),
      );
    }
  }, [state, ready]);
  if (!ready)
    return (
      <div className="learning-studio dark">
        <div className="studio-loading">Opening your learning workspace…</div>
      </div>
    );
  return (
    <Store.Provider value={{ state, update: setState, storageError }}>
      <div className={`learning-studio ${state.theme}`}>{children}</div>
    </Store.Provider>
  );
}
export const useStudio = () => useContext(Store);
export function useProgram(id: string) {
  const { state, update } = useStudio();
  const program = state.programs[id] ?? newProgram();
  const change = (fn: (program: Program) => Program) =>
    update((previous) => ({
      ...previous,
      programs: {
        ...previous.programs,
        [id]: fn(previous.programs[id] ?? newProgram()),
      },
    }));
  return { program, change };
}
