"use client";

import { useMemo, useState, useTransition } from "react";
import { api } from "@/lib/api";
import { canRegisterNow, countBy } from "@/lib/util";
import {
  type DateLike,
  type Opt,
  type Registration,
  RegistrationStatus,
  type WorldEvent,
} from "@/types/model";
import { toast } from "@/ui/index";

export type EventRegistrationState = {
  regs: Registration[];
  setRegs: (regs: Registration[]) => void;
  confirmedCount: number;
  reservedCount: number;
  myReg: Registration | undefined;
  canReg: boolean;
  confirmedFull: boolean;
  reserveFull: boolean;
  isPending: boolean;
  register: () => void;
  unregister: () => void;
};

export function useEventRegistration(
  event: Opt<WorldEvent>,
  userId: string | undefined,
  opts?: { onRegsChange?: (regs: Registration[]) => void },
): EventRegistrationState {
  const [isPending, startTransition] = useTransition();
  const [regs, setRegsState] = useState<Registration[]>(event?.regs ?? []);
  const [boundEventId, setBoundEventId] = useState(event?.id);

  if (event?.id !== boundEventId) {
    setBoundEventId(event?.id);
    setRegsState(event?.regs ?? []);
  }

  const setRegs = (next: Registration[]) => {
    setRegsState(next);
    opts?.onRegsChange?.(next);
  };

  const { confirmedCount, reservedCount, myReg, canReg } = useMemo(() => {
    const counts = countBy(regs, "status", {
      [RegistrationStatus.CONFIRMED]: 0,
      [RegistrationStatus.RESERVED]: 0,
    });
    return {
      confirmedCount: counts[RegistrationStatus.CONFIRMED],
      reservedCount: counts[RegistrationStatus.RESERVED],
      myReg: userId ? regs.find((r) => r.userId === userId) : undefined,
      canReg: !!event && canRegisterNow(event.startAt as DateLike),
    };
  }, [userId, event, regs]);

  const confirmedCap =
    typeof event?.capacity === "number" ? event.capacity : Infinity;
  const reserveCap =
    typeof event?.reserveCapacity === "number"
      ? event.reserveCapacity
      : Infinity;
  const confirmedFull = confirmedCount >= confirmedCap;
  const reserveFull = reservedCount >= reserveCap;

  const register = () => {
    if (!event) {
      return;
    }
    startTransition(async () => {
      try {
        const { regs: next } = await api.events.register(event.id);
        setRegs(next);
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Could not register",
        });
      }
    });
  };

  const unregister = () => {
    if (!event) {
      return;
    }
    startTransition(async () => {
      try {
        const { regs: next } = await api.events.unregister(event.id);
        setRegs(next);
      } catch (e) {
        toast.error({
          title: e instanceof Error ? e.message : "Could not unregister",
        });
      }
    });
  };

  return {
    regs,
    setRegs,
    confirmedCount,
    reservedCount,
    myReg,
    canReg,
    confirmedFull,
    reserveFull,
    isPending,
    register,
    unregister,
  };
}
