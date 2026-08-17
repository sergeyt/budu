"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Box, HStack, VStack } from "@chakra-ui/react";
import { Button, Heading, Text } from "@/ui/index";

export type FormWizardStep<T> = {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  /** Enter inserts a newline instead of advancing. */
  multiline?: boolean;
  render: (ctx: {
    value: T;
    setValue: (patch: Partial<T>) => void;
  }) => ReactNode;
  validate?: (value: T) => string | null;
};

export type FormWizardProps<T> = {
  steps: FormWizardStep<T>[];
  value: T;
  onChange: (value: T) => void;
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
  completeLabel?: string;
};

export function FormWizard<T>({
  steps,
  value,
  onChange,
  onComplete,
  onCancel,
  completeLabel = "Create",
}: FormWizardProps<T>) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus when the visible step changes
  useEffect(() => {
    const el = bodyRef.current?.querySelector<HTMLElement>(
      "input, textarea, [contenteditable='true']",
    );
    el?.focus();
  }, [step.id]);

  const setValue = (patch: Partial<T>) => {
    onChange({ ...value, ...patch });
    if (error) {
      setError(null);
    }
  };

  const goNext = async (opts: { skip?: boolean } = {}) => {
    if (!opts.skip) {
      const msg = step.validate?.(value) ?? null;
      if (msg) {
        setError(msg);
        return;
      }
    }
    setError(null);
    if (isLast) {
      setBusy(true);
      try {
        await onComplete();
      } finally {
        setBusy(false);
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  const goBack = () => {
    if (isFirst) {
      onCancel?.();
      return;
    }
    setError(null);
    setIndex((i) => i - 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      goBack();
      return;
    }
    if (e.key !== "Enter") {
      return;
    }
    if (step.multiline) {
      return;
    }
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "BUTTON" || tag === "TEXTAREA") {
      return;
    }
    e.preventDefault();
    void goNext();
  };

  return (
    <VStack
      align="stretch"
      gap={6}
      w="full"
      maxW="lg"
      mx="auto"
      py={8}
      px={4}
      onKeyDown={onKeyDown}
    >
      <Text muted fontSize="sm" data-testid="wizard-progress">
        {index + 1} / {steps.length}
      </Text>
      <Box>
        <Heading size="xl" as="h1">
          {step.title}
        </Heading>
        {step.description ? (
          <Text muted mt={2}>
            {step.description}
          </Text>
        ) : null}
      </Box>
      <Box ref={bodyRef}>{step.render({ value, setValue })}</Box>
      {error ? (
        <Text color="red.600" fontSize="sm" data-testid="wizard-error">
          {error}
        </Text>
      ) : null}
      <HStack justify="space-between" w="full" gap={2}>
        <HStack gap={2}>
          {onCancel ? (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={busy}
              data-testid="wizard-cancel"
            >
              Cancel
            </Button>
          ) : null}
          {!isFirst ? (
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={busy}
              data-testid="wizard-back"
            >
              Back
            </Button>
          ) : null}
        </HStack>
        <HStack gap={2}>
          {step.optional ? (
            <Button
              variant="outline"
              onClick={() => void goNext({ skip: true })}
              disabled={busy}
              data-testid="wizard-skip"
            >
              Skip
            </Button>
          ) : null}
          <Button
            onClick={() => void goNext()}
            loading={busy}
            disabled={busy}
            data-testid="wizard-next"
          >
            {isLast ? completeLabel : "Continue"}
          </Button>
        </HStack>
      </HStack>
    </VStack>
  );
}
