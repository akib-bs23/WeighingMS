import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import type {
  ScaleInfo,
  ScaleReadingError,
  ScaleStatus,
  TareResult,
  WeightReading,
} from '../../../../shared/contracts/devices';
import { CLOCK, type Clock } from '../../../common/clock/clock';
import { NotFoundError, UnavailableError } from '../../../common/errors/domain-error';
import { DATABASE, type Db } from '../../../database/database.provider';
import { scales } from '../../../database/schema';
import { ResetRegistry } from '../../../training/reset.registry';
import { SeedService } from '../../../training/seed/seed.service';

export const DEFAULT_RAMP_MS = 3_000;

type ScaleConfig = typeof scales.$inferSelect;

/** A simulated pour: net weight moves from `fromNetMg` to `toNetMg` over `durationMs`. */
interface Ramp {
  fromNetMg: number;
  toNetMg: number;
  startedAt: number;
  durationMs: number;
}

interface ScaleState {
  grossMg: number;
  tareMg: number;
  online: boolean;
  fault: ScaleReadingError | null;
  ramp: Ramp | null;
}

/** Ease-out cubic: fast at first, slowing as the target approaches — how a person pours. */
const easeOut = (progress: number): number => 1 - (1 - progress) ** 3;

/**
 * Dummy weighing scales — training substitute for the 3 kg precision and 32 kg floor indicators.
 * Reports readings as an indicator would (including negative, overload and missing values);
 * validity is judged by WeighingMS, not here.
 */
@Injectable()
export class DummyScaleService implements OnModuleInit {
  private readonly state = new Map<string, ScaleState>();

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly seed: SeedService,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'dummy-scales',
      isSeeded: () => (this.db.select({ n: count() }).from(scales).get()?.n ?? 0) > 0,
      reset: () => {
        this.reseed();
      },
    });
  }

  listScales(): ScaleInfo[] {
    return this.db
      .select()
      .from(scales)
      .orderBy(asc(scales.capacityMg))
      .all()
      .map((c) => ({ ...c, online: this.stateOf(c.scaleId).online }));
  }

  getStatus(scaleId: string): ScaleStatus {
    const config = this.config(scaleId);
    const { online } = this.stateOf(scaleId);
    return {
      scaleId,
      online,
      state: online ? 'READY' : 'OFFLINE',
      capacityMg: config.capacityMg,
      resolutionMg: config.resolutionMg,
    };
  }

  readWeight(scaleId: string): WeightReading {
    const config = this.config(scaleId);
    const s = this.onlineState(scaleId);
    const readAt = new Date(this.clock.now()).toISOString();
    if (s.fault) {
      return { scaleId, netMg: null, stable: false, overload: false, error: s.fault, readAt };
    }
    const { netMg, stable } = this.currentNet(s, config);
    return {
      scaleId,
      netMg,
      stable,
      overload: s.tareMg + netMg > config.capacityMg,
      error: null,
      readAt,
    };
  }

  tare(scaleId: string): TareResult {
    const config = this.config(scaleId);
    const s = this.onlineState(scaleId);
    const { netMg } = s.fault ? { netMg: 0 } : this.currentNet(s, config);
    const now = this.clock.now();
    if (s.ramp) {
      // Re-base the pour on the new zero: it continues for the remaining time.
      const remaining = Math.max(0, s.ramp.startedAt + s.ramp.durationMs - now);
      s.ramp = {
        fromNetMg: 0,
        toNetMg: s.ramp.toNetMg - netMg,
        startedAt: now,
        durationMs: remaining,
      };
    }
    s.tareMg += netMg;
    s.grossMg = s.tareMg;
    return { scaleId, tareMg: s.tareMg, netMg: 0 };
  }

  // ── Training simulator ───────────────────────────────────────────────

  setWeight(scaleId: string, netMg: number): WeightReading {
    this.config(scaleId);
    const s = this.stateOf(scaleId);
    s.ramp = null;
    s.fault = null;
    s.grossMg = s.tareMg + netMg;
    return this.readWeight(scaleId);
  }

  setFault(scaleId: string, fault: ScaleReadingError): WeightReading {
    this.config(scaleId);
    const s = this.stateOf(scaleId);
    s.ramp = null;
    s.fault = fault;
    return this.readWeight(scaleId);
  }

  startRamp(scaleId: string, toNetMg: number, durationMs = DEFAULT_RAMP_MS): WeightReading {
    const config = this.config(scaleId);
    const s = this.stateOf(scaleId);
    const fromNetMg = s.fault ? 0 : this.currentNet(s, config).netMg;
    s.fault = null;
    s.grossMg = s.tareMg + fromNetMg;
    s.ramp = { fromNetMg, toNetMg, startedAt: this.clock.now(), durationMs };
    return this.readWeight(scaleId);
  }

  setOnline(scaleId: string, online: boolean): ScaleStatus {
    this.config(scaleId);
    this.stateOf(scaleId).online = online;
    return this.getStatus(scaleId);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private currentNet(s: ScaleState, config: ScaleConfig): { netMg: number; stable: boolean } {
    const round = (mg: number): number =>
      Math.round(mg / config.resolutionMg) * config.resolutionMg;
    const ramp = s.ramp;
    if (ramp) {
      const elapsed = this.clock.now() - ramp.startedAt;
      if (elapsed < ramp.durationMs) {
        // Simulation only: the eased position is rounded straight back to whole milligrams.
        const delta = Math.round(
          (ramp.toNetMg - ramp.fromNetMg) * easeOut(elapsed / ramp.durationMs),
        );
        return { netMg: round(ramp.fromNetMg + delta), stable: false };
      }
      s.grossMg = s.tareMg + ramp.toNetMg;
      s.ramp = null;
    }
    return { netMg: round(s.grossMg - s.tareMg), stable: true };
  }

  private config(scaleId: string): ScaleConfig {
    const config = this.db.select().from(scales).where(eq(scales.scaleId, scaleId)).get();
    if (!config)
      throw new NotFoundError('SCALE_NOT_FOUND', `Scale ${scaleId} not found`, { scaleId });
    return config;
  }

  private onlineState(scaleId: string): ScaleState {
    const s = this.stateOf(scaleId);
    if (!s.online) {
      throw new UnavailableError('SCALE_UNAVAILABLE', `Scale ${scaleId} is not responding`, {
        scaleId,
      });
    }
    return s;
  }

  private stateOf(scaleId: string): ScaleState {
    let s = this.state.get(scaleId);
    if (!s) {
      s = { grossMg: 0, tareMg: 0, online: true, fault: null, ramp: null };
      this.state.set(scaleId, s);
    }
    return s;
  }

  private reseed(): void {
    const seeded = this.seed.get().scales;
    this.db.transaction((tx) => {
      tx.delete(scales).run();
      tx.insert(scales).values(seeded).run();
    });
    this.state.clear();
  }
}
