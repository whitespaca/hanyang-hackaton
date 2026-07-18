import type { ClassificationResponse, GarbageClass, GuideCategory, GuideItem } from "@bunrishot/shared";
import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";

export interface SelectedImage {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
}

interface FlowState {
  image?: SelectedImage;
  result?: ClassificationResponse;
  selectedClass?: GarbageClass;
  category?: GuideCategory;
  guide?: GuideItem;
}

type FlowAction =
  | { type: "image"; image: SelectedImage }
  | { type: "result"; result: ClassificationResponse }
  | { type: "class"; selectedClass?: GarbageClass }
  | { type: "category"; category: GuideCategory }
  | { type: "guide"; guide: GuideItem }
  | { type: "reset" };

const FlowContext = createContext<{ state: FlowState; dispatch: Dispatch<FlowAction> } | null>(null);

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "image": return { image: action.image };
    case "result": return { ...state, result: action.result };
    case "class": {
      const { selectedClass: _selectedClass, category: _category, guide: _guide, ...rest } = state;
      return action.selectedClass ? { ...rest, selectedClass: action.selectedClass } : rest;
    }
    case "category": return { ...state, category: action.category };
    case "guide": return { ...state, guide: action.guide };
    case "reset": return {};
  }
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {});
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useFlow must be used inside FlowProvider");
  return value;
}
