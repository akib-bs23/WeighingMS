import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { StationOperator } from '../../../shared/contracts/station';
import { DomainError } from '../../common/errors/domain-error';
import { parseTrainingSeed, type TrainingSeed } from './seed-schema';

export interface SupervisorCredential {
  operatorId: string;
  pinHash: string;
}

export const DEFAULT_SEED_PATH = 'data/seed.json';

/** Loads and validates the versioned training scenario once per process. */
@Injectable()
export class SeedService {
  private seed?: TrainingSeed;

  get(): TrainingSeed {
    this.seed ??= SeedService.load(process.env.WEIGHINGMS_SEED ?? DEFAULT_SEED_PATH);
    return this.seed;
  }

  /** The fixed training operator attached to every session (TD-6: no sign-in screen). */
  getSessionOperator(): StationOperator {
    const operator = this.get().operators.find((o) => o.role === 'OPERATOR');
    if (!operator) {
      throw new DomainError('NO_OPERATOR', 'No operator is configured for this station', 500);
    }
    return { operatorId: operator.operatorId, name: operator.name, shift: operator.shift };
  }

  /**
   * A container's known tare from the container master (TD-4). WeighingMS owns this data — it
   * is never read from a scale's own hardware tare register, which the Dummy scale cannot use to
   * simulate "a pre-weighed container was placed" (brief FR-10's "container master" option).
   */
  getContainerTareMg(containerId: string): number {
    const container = this.get().containers.find((c) => c.containerId === containerId);
    if (!container) {
      throw new DomainError('NO_CONTAINER_MASTER', `No container master for ${containerId}`, 500, {
        containerId,
      });
    }
    return container.tareMg;
  }

  /**
   * The one seeded supervisor credential (story 008). Provisioning a supervisor is out of
   * scope (story 008, "Out of Scope") — this is read-only training fixture data, like
   * `getContainerTareMg`, not session state, so it needs no DB table or reset-registry entry.
   */
  getSupervisor(): SupervisorCredential {
    const supervisor = this.get().operators.find((o) => o.role === 'SUPERVISOR');
    if (!supervisor?.pinHash) {
      throw new DomainError('NO_SUPERVISOR', 'No supervisor is configured for this station', 500);
    }
    return { operatorId: supervisor.operatorId, pinHash: supervisor.pinHash };
  }

  static load(path: string): TrainingSeed {
    const raw: unknown = JSON.parse(readFileSync(resolve(path), 'utf8'));
    return parseTrainingSeed(raw);
  }
}
