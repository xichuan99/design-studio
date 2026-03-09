import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';

export type ElementType = 'text' | 'image' | 'shape';

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation: number;
    opacity?: number;

    // Shape specific
    shapeType?: 'rect' | 'circle' | 'line';
    cornerRadius?: number;

    // Layer logic
    visible?: boolean;
    locked?: boolean;
    label?: string;

    // Text specific
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fill?: string;
    align?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    letterSpacing?: number;
    lineHeight?: number;
    stroke?: string;
    strokeWidth?: number;

    // Shadow properties (mostly for text on complex backgrounds)
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;

    // Image specific
    url?: string;
}

export interface CanvasState {
    elements: CanvasElement[];
    selectedElementId: string | null;
    backgroundUrl: string | null;
    backgroundColor: string;
    projectTitle: string;
    history: CanvasElement[][];
    historyIndex: number;
    stageRef: Konva.Stage | null; // Ref to the Konva Stage for exports
}

interface CanvasActions {
    // Elements
    addElement: (element: Omit<CanvasElement, 'id'>) => void;
    updateElement: (id: string, attrs: Partial<CanvasElement>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    selectElement: (id: string | null) => void;

    // Layers
    bringForward: (id: string) => void;
    sendBackward: (id: string) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;
    updateName: (id: string, name: string) => void;
    reorderElements: (fromIndex: number, toIndex: number) => void;

    // Global
    setBackgroundUrl: (url: string | null) => void;
    setBackgroundColor: (color: string) => void;
    setProjectTitle: (title: string) => void;
    loadState: (elements: CanvasElement[], backgroundUrl: string | null, title?: string, backgroundColor?: string) => void;
    setStageRef: (ref: Konva.Stage) => void;

    // History
    undo: () => void;
    redo: () => void;
}

// Helper to save history
const saveHistory = (state: CanvasState, newElements: CanvasElement[]) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
        elements: newElements,
        history: [...newHistory, newElements],
        historyIndex: newHistory.length,
    };
};

export const useCanvasStore = create<CanvasState & CanvasActions>((set) => ({
    elements: [],
    selectedElementId: null,
    backgroundUrl: null,
    backgroundColor: '#ffffff',
    projectTitle: 'Untitled Design',
    history: [[]],
    historyIndex: 0,
    stageRef: null,

    addElement: (element) => set((state) => {
        const newElement = { ...element, id: uuidv4() };
        const newElements = [...state.elements, newElement];
        return saveHistory(state, newElements);
    }),

    updateElement: (id, attrs) => set((state) => {
        const newElements = state.elements.map(el =>
            el.id === id ? { ...el, ...attrs } : el
        );
        // Don't save history on single rapid updates (e.g. dragging) directly.
        // In a real app we might debounce this for history, but for now we just push.
        return { elements: newElements };
    }),

    deleteElement: (id) => set((state) => {
        const newElements = state.elements.filter(el => el.id !== id);
        return {
            ...saveHistory(state, newElements),
            selectedElementId: state.selectedElementId === id ? null : state.selectedElementId
        };
    }),

    duplicateElement: (id) => set((state) => {
        const elToDuplicate = state.elements.find(el => el.id === id);
        if (!elToDuplicate) return state;

        const newElement = {
            ...elToDuplicate,
            id: uuidv4(),
            x: elToDuplicate.x + 20,
            y: elToDuplicate.y + 20
        };
        const newElements = [...state.elements, newElement];
        return {
            ...saveHistory(state, newElements),
            selectedElementId: newElement.id
        };
    }),

    selectElement: (id) => set({ selectedElementId: id }),

    bringForward: (id) => set((state) => {
        const elIndex = state.elements.findIndex(el => el.id === id);
        if (elIndex < 0 || elIndex === state.elements.length - 1) return state;

        const newElements = [...state.elements];
        const el = newElements.splice(elIndex, 1)[0];
        newElements.splice(elIndex + 1, 0, el);

        return saveHistory(state, newElements);
    }),

    sendBackward: (id) => set((state) => {
        const elIndex = state.elements.findIndex(el => el.id === id);
        if (elIndex <= 0) return state;

        const newElements = [...state.elements];
        const el = newElements.splice(elIndex, 1)[0];
        newElements.splice(elIndex - 1, 0, el);

        return saveHistory(state, newElements);
    }),

    bringToFront: (id) => set((state) => {
        const elIndex = state.elements.findIndex(el => el.id === id);
        if (elIndex < 0 || elIndex === state.elements.length - 1) return state;

        const newElements = [...state.elements];
        const el = newElements.splice(elIndex, 1)[0];
        newElements.push(el);

        return saveHistory(state, newElements);
    }),

    sendToBack: (id) => set((state) => {
        const elIndex = state.elements.findIndex(el => el.id === id);
        if (elIndex <= 0) return state;

        const newElements = [...state.elements];
        const el = newElements.splice(elIndex, 1)[0];
        newElements.unshift(el);

        return saveHistory(state, newElements);
    }),

    toggleVisibility: (id) => set((state) => {
        const newElements = state.elements.map(el =>
            el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
        );
        return saveHistory(state, newElements);
    }),

    toggleLock: (id) => set((state) => {
        const newElements = state.elements.map(el =>
            el.id === id ? { ...el, locked: !el.locked } : el
        );
        return saveHistory(state, newElements);
    }),

    updateName: (id, name) => set((state) => {
        const newElements = state.elements.map(el =>
            el.id === id ? { ...el, label: name } : el
        );
        return saveHistory(state, newElements);
    }),

    reorderElements: (fromIndex, toIndex) => set((state) => {
        if (fromIndex < 0 || fromIndex >= state.elements.length || toIndex < 0 || toIndex >= state.elements.length) {
            return state;
        }
        const newElements = [...state.elements];
        const [movedEl] = newElements.splice(fromIndex, 1);
        newElements.splice(toIndex, 0, movedEl);
        return saveHistory(state, newElements);
    }),

    setBackgroundUrl: (url) => set({ backgroundUrl: url }),

    setBackgroundColor: (color) => set({ backgroundColor: color }),

    setProjectTitle: (title) => set({ projectTitle: title }),

    loadState: (elements, backgroundUrl, title, backgroundColor) => set({
        elements,
        backgroundUrl,
        backgroundColor: backgroundColor || '#ffffff',
        projectTitle: title || 'Untitled Design',
        selectedElementId: null,
        history: [elements],
        historyIndex: 0
    }),

    setStageRef: (ref) => set({ stageRef: ref }),

    undo: () => set((state) => {
        if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            return {
                elements: state.history[newIndex],
                historyIndex: newIndex,
                selectedElementId: null
            };
        }
        return state;
    }),

    redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            return {
                elements: state.history[newIndex],
                historyIndex: newIndex,
                selectedElementId: null
            };
        }
        return state;
    })
}));
