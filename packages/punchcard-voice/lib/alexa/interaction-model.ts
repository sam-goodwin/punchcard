export interface SkillModel {
  interactionModel: SkillModel.InteractionModel;
}
export namespace SkillModel {
  export interface InteractionModel {
    languageModel: LanguageModel;
    dialog?: Dialog;
    promots?: Prompt[];
  }

  export interface LanguageModel {
    invocationName: string;
    intents: Intent[];
    types?: SlotType[];
  }

  export interface Intent {
    name: string;
    slots?: Slot[];
    samples?: string[];
  }

  export interface Slot {
    name: string;
    type: string;
    samples?: string[];
  }

  export interface SlotType {
    name: string;
    values: SlotTypeValue[];
  }

  export interface SlotTypeValue {
    id: string;
    name: SlotValue;
  }

  export interface SlotValue {
    value: string;
    synonyms?: string[];
  }

  export interface Prompt {
    id: string;
    variations: PromptVariation[];
  }

  export interface PromptVariation {
    type: string;
    variations: PromptVariation[];
  }

  export interface Dialog {
    intents: DialogIntent[];
  }

  export interface DialogIntent {
    name: string;
    confirmationRequired?: boolean;
    prompts?: DialogIntentPrompt;
    slots?: DialogSlot[];
  }

  export interface DialogSlot {
    name: string;
    type: string;
    confirmationRequired?: boolean;
    elicitationRequired?: boolean;
  }

  export interface DialogIntentPrompt {
    confirmation?: string;
  }

  export interface DialogSlotPrompt {
    elicitation?: string;
    confirmation?: string;
  }
}
