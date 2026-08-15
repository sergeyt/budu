/** Shared chrome for text fields, textareas, and select triggers. */
export const fieldControlDefaults = {
  borderRadius: "lg" as const,
  borderColor: "border.muted",
  color: "text.body",
  _placeholder: {
    color: "text.muted",
    opacity: 1,
  },
  _focusVisible: {
    borderColor: "focus.ring",
    boxShadow: "shadow.focus",
  },
};
