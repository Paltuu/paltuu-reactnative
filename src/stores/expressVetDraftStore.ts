import { create } from 'zustand';

// Holds one in-progress Vets at Home request as the user moves across the
// questionnaire -> address -> review-and-submit screens (each a separate route,
// so this can't just live in one screen's local state like the other create-*
// wizards do). Cleared on submit or on leaving the flow.
interface ExpressVetDraftState {
  questionnaireAnswers: Record<string, any>;
  addressLine: string;
  addressLandmark: string;
  mapsLink: string;
  contactPhone: string;
  setQuestionnaireAnswers: (answers: Record<string, any>) => void;
  setAddress: (patch: Partial<{ addressLine: string; addressLandmark: string; mapsLink: string; contactPhone: string }>) => void;
  reset: () => void;
}

const initialState = {
  questionnaireAnswers: {},
  addressLine: '',
  addressLandmark: '',
  mapsLink: '',
  contactPhone: '',
};

export const useExpressVetDraftStore = create<ExpressVetDraftState>((set) => ({
  ...initialState,
  setQuestionnaireAnswers: (answers) => set({ questionnaireAnswers: answers }),
  setAddress: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set(initialState),
}));
