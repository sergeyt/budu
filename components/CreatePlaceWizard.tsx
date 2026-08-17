"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormWizard, type FormWizardStep } from "@/components/FormWizard";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Input, toast } from "@/ui/index";
import { api } from "@/lib/api";
import { isValidIanaZone } from "@/lib/templates";
import { ApiError } from "@budu/api-client";

type Draft = {
  name: string;
  location: string;
  description: string;
  infoUrl: string;
  timezone: string;
};

const EMPTY: Draft = {
  name: "",
  location: "",
  description: "",
  infoUrl: "",
  timezone: "Europe/Moscow",
};

function emptyToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

const steps: FormWizardStep<Draft>[] = [
  {
    id: "name",
    title: "What's the place called?",
    render: ({ value, setValue }) => (
      <Input
        data-testid="place-name-input"
        placeholder="Ping Pong House"
        value={value.name}
        onChange={(e) => setValue({ name: e.target.value })}
      />
    ),
    validate: (v) => (v.name.trim() ? null : "Name is required"),
  },
  {
    id: "location",
    title: "Where is it?",
    description: "Map link or address. You can skip this.",
    optional: true,
    render: ({ value, setValue }) => (
      <Input
        data-testid="place-location-input"
        placeholder="https://yandex.ru/maps/…"
        value={value.location}
        onChange={(e) => setValue({ location: e.target.value })}
      />
    ),
  },
  {
    id: "description",
    title: "Tell players about it",
    description: "Markdown is supported. You can skip this.",
    optional: true,
    multiline: true,
    render: ({ value, setValue }) => (
      <MarkdownEditor
        value={value.description}
        onChange={(description) => setValue({ description })}
        placeholder="Hours, how to get in, house rules…"
      />
    ),
  },
  {
    id: "infoUrl",
    title: "Club website?",
    description: "Optional public URL.",
    optional: true,
    render: ({ value, setValue }) => (
      <Input
        data-testid="place-infourl-input"
        placeholder="https://example.com"
        value={value.infoUrl}
        onChange={(e) => setValue({ infoUrl: e.target.value })}
      />
    ),
    validate: (v) => {
      const url = v.infoUrl.trim();
      if (!url) {
        return null;
      }
      return isValidUrl(url) ? null : "Enter a valid URL";
    },
  },
  {
    id: "timezone",
    title: "Which timezone?",
    description: "IANA zone for event times, e.g. Europe/Moscow.",
    render: ({ value, setValue }) => (
      <Input
        data-testid="place-timezone-input"
        placeholder="Europe/Moscow"
        value={value.timezone}
        onChange={(e) => setValue({ timezone: e.target.value })}
      />
    ),
    validate: (v) => {
      const zone = v.timezone.trim();
      if (!zone) {
        return "Timezone is required";
      }
      return isValidIanaZone(zone) ? null : "Enter a valid IANA timezone";
    },
  },
];

export function CreatePlaceWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const onComplete = async () => {
    try {
      await api.places.create({
        name: draft.name.trim(),
        location: emptyToNull(draft.location),
        description: emptyToNull(draft.description),
        infoUrl: emptyToNull(draft.infoUrl),
        timezone: draft.timezone.trim(),
      });
      toast.success({ title: "Place created" });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error({
        title: "Could not create place",
        description: err instanceof ApiError ? err.message : String(err),
      });
    }
  };

  return (
    <FormWizard
      steps={steps}
      value={draft}
      onChange={setDraft}
      onComplete={onComplete}
      onCancel={() => router.push("/admin")}
    />
  );
}
