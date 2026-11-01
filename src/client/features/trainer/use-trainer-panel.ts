import { useState } from 'react';
import type { ComponentView } from '../../../shared/contracts/weighing';
import * as training from '../../net/training';

/** Dispense/overshoot landing values, matching the prototype's own pour formula (bolt 002 plan). */
const DISPENSE_FACTOR = 0.4;
const OVERSHOOT_FACTOR = 4.8;

export type TrainerScaleId = 'scale-3kg' | 'scale-32kg';

/**
 * Drives every trainer action. Calls only Dummy simulator endpoints — never WeighingMS session
 * state directly (story 009 AC2).
 */
export function useTrainerPanel(activeComponent: ComponentView | null, onAfterReset: () => void) {
  const [pending, setPending] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [weightInput, setWeightInput] = useState('');

  const run = (fn: () => Promise<unknown>): void => {
    setPending(true);
    fn()
      .catch(() => {
        // Trainer convenience tool: a failed simulator call (e.g. device already offline) is not
        // operator-facing; this bolt does not surface it beyond leaving the panel usable.
      })
      .finally(() => {
        setPending(false);
      });
  };

  const simulateDispense = (): void => {
    if (!activeComponent?.scaleId) return;
    const toMg = Math.round(
      activeComponent.targetMg + activeComponent.toleranceMg * DISPENSE_FACTOR,
    );
    run(() => training.rampScale(activeComponent.scaleId as string, toMg));
  };

  const simulateOvershoot = (): void => {
    if (!activeComponent?.scaleId) return;
    const toMg = Math.round(
      activeComponent.targetMg + activeComponent.toleranceMg * OVERSHOOT_FACTOR,
    );
    run(() => training.rampScale(activeComponent.scaleId as string, toMg));
  };

  const setWeight = (scaleId: TrainerScaleId, grams: string): void => {
    const mg = Math.round(Number(grams) * 1000);
    if (!Number.isFinite(mg)) return;
    run(() => training.setScaleWeight(scaleId, mg));
  };

  const setScaleOnline = (scaleId: TrainerScaleId, online: boolean): void => {
    run(() => training.setScaleOnline(scaleId, online));
  };

  const setScannerOnline = (online: boolean): void => {
    run(() => training.setScannerOnline(online));
  };

  const setOrgatexOnline = (online: boolean): void => {
    run(() => training.setOrgatexOnline(online));
  };

  const inject = (code: string): void => {
    if (code.trim().length === 0) return;
    run(() => training.injectScan(code));
  };

  const reset = (): void => {
    setPending(true);
    void training
      .resetScenario()
      .then(onAfterReset)
      .finally(() => {
        setPending(false);
      });
  };

  return {
    pending,
    scanCode,
    setScanCode,
    weightInput,
    setWeightInput,
    simulateDispense,
    simulateOvershoot,
    setWeight,
    setScaleOnline,
    setScannerOnline,
    setOrgatexOnline,
    inject,
    reset,
  };
}
