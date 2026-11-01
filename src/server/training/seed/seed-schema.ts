import {
  BATCH_STATUSES,
  DYESTUFF_TYPES,
  type BatchStatus,
  type DyestuffType,
  type OrgatexBatch,
  type OrgatexDyestuff,
  type Uom,
} from '../../../shared/contracts/orgatex';
import { parseQuantity } from '../../../shared/quantity/parse-quantity';

/** Seed recipe component after quantities have been converted to integer milligrams. */
export interface SeedRecipeComponent {
  componentId: string;
  sequence: number;
  dyestuffCode: string;
  uom: Uom;
  targetMg: number;
  toleranceMg: number;
  displayMaxMg: number;
  lotId: string;
  containerId: string;
}

export interface SeedRecipe {
  recipeId: string;
  shadeCode: string;
  components: SeedRecipeComponent[];
}

export interface SeedContainer {
  containerId: string;
  type: string;
  uom: Uom;
  tareMg: number;
}

export interface SeedScale {
  scaleId: string;
  class: 'PRECISION' | 'FLOOR';
  name: string;
  uom: Uom;
  capacityMg: number;
  resolutionMg: number;
}

export interface SeedOperator {
  operatorId: string;
  name: string;
  shift: string;
  role: 'OPERATOR' | 'SUPERVISOR';
  pinHash?: string;
}

export interface TrainingSeed {
  version: string;
  station: { stationId: string; name: string };
  orgatex: {
    dyestuffs: OrgatexDyestuff[];
    batches: OrgatexBatch[];
    recipes: SeedRecipe[];
  };
  containers: SeedContainer[];
  scales: SeedScale[];
  operators: SeedOperator[];
}

export class SeedValidationError extends Error {
  constructor(path: string, problem: string) {
    super(`Invalid training seed at ${path}: ${problem}`);
    this.name = 'SeedValidationError';
  }
}

type Json = Record<string, unknown>;

function obj(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SeedValidationError(path, 'expected an object');
  }
  return value as Json;
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new SeedValidationError(path, 'expected an array');
  return value;
}

function str(o: Json, key: string, path: string): string {
  const v = o[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new SeedValidationError(`${path}.${key}`, 'expected a non-empty string');
  }
  return v;
}

function int(o: Json, key: string, path: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new SeedValidationError(`${path}.${key}`, 'expected a non-negative integer');
  }
  return v;
}

function oneOf<T extends string>(o: Json, key: string, allowed: readonly T[], path: string): T {
  const v = str(o, key, path);
  if (!(allowed as readonly string[]).includes(v)) {
    throw new SeedValidationError(`${path}.${key}`, `expected one of ${allowed.join(', ')}`);
  }
  return v as T;
}

function mg(o: Json, key: string, uom: Uom, path: string): number {
  try {
    return parseQuantity(str(o, key, path), uom);
  } catch (e) {
    throw new SeedValidationError(`${path}.${key}`, (e as Error).message);
  }
}

const UOMS = ['g', 'kg'] as const;

/** Validates the raw seed JSON and converts every quantity to integer milligrams. */
export function parseTrainingSeed(raw: unknown): TrainingSeed {
  const root = obj(raw, 'seed');
  const station = obj(root.station, 'seed.station');
  const orgatex = obj(root.orgatex, 'seed.orgatex');

  const dyestuffs = arr(orgatex.dyestuffs, 'orgatex.dyestuffs').map((d, i) => {
    const p = `orgatex.dyestuffs[${i}]`;
    const o = obj(d, p);
    return {
      code: str(o, 'code', p),
      name: str(o, 'name', p),
      type: oneOf<DyestuffType>(o, 'type', DYESTUFF_TYPES, p),
      colourHex: str(o, 'colourHex', p),
      barcode: str(o, 'barcode', p),
    };
  });

  const batches = arr(orgatex.batches, 'orgatex.batches').map((b, i) => {
    const p = `orgatex.batches[${i}]`;
    const o = obj(b, p);
    return {
      batchId: str(o, 'batchId', p),
      orderRef: str(o, 'orderRef', p),
      machineRef: str(o, 'machineRef', p),
      fabricDesc: str(o, 'fabricDesc', p),
      fabricWeightKg: int(o, 'fabricWeightKg', p),
      shadeCode: str(o, 'shadeCode', p),
      componentCount: int(o, 'componentCount', p),
      status: oneOf<BatchStatus>(o, 'status', BATCH_STATUSES, p),
      recipeId: str(o, 'recipeId', p),
    };
  });

  const dyestuffCodes = new Set(dyestuffs.map((d) => d.code));
  const recipes = arr(orgatex.recipes, 'orgatex.recipes').map((r, i) => {
    const p = `orgatex.recipes[${i}]`;
    const o = obj(r, p);
    const components = arr(o.components, `${p}.components`).map((c, j) => {
      const cp = `${p}.components[${j}]`;
      const co = obj(c, cp);
      const uom = oneOf(co, 'uom', UOMS, cp);
      const dyestuffCode = str(co, 'dyestuffCode', cp);
      if (!dyestuffCodes.has(dyestuffCode)) {
        throw new SeedValidationError(`${cp}.dyestuffCode`, `unknown dyestuff ${dyestuffCode}`);
      }
      const targetMg = mg(co, 'target', uom, cp);
      if (targetMg === 0) throw new SeedValidationError(`${cp}.target`, 'must be greater than 0');
      return {
        componentId: str(co, 'componentId', cp),
        sequence: int(co, 'sequence', cp),
        dyestuffCode,
        uom,
        targetMg,
        toleranceMg: mg(co, 'tolerance', uom, cp),
        displayMaxMg: mg(co, 'displayMax', uom, cp),
        lotId: str(co, 'lotId', cp),
        containerId: str(co, 'containerId', cp),
      };
    });
    const sequences = new Set(components.map((c) => c.sequence));
    if (sequences.size !== components.length) {
      throw new SeedValidationError(`${p}.components`, 'sequence numbers must be unique');
    }
    return { recipeId: str(o, 'recipeId', p), shadeCode: str(o, 'shadeCode', p), components };
  });

  for (const batch of batches) {
    const recipe = recipes.find((r) => r.recipeId === batch.recipeId);
    if (recipe && recipe.components.length !== batch.componentCount) {
      throw new SeedValidationError(
        `batch ${batch.batchId}`,
        `componentCount ${batch.componentCount} does not match recipe (${recipe.components.length})`,
      );
    }
  }

  const containers = arr(root.containers, 'containers').map((c, i) => {
    const p = `containers[${i}]`;
    const o = obj(c, p);
    const uom = oneOf(o, 'uom', UOMS, p);
    return {
      containerId: str(o, 'containerId', p),
      type: str(o, 'type', p),
      uom,
      tareMg: mg(o, 'tare', uom, p),
    };
  });

  const scales = arr(root.scales, 'scales').map((s, i) => {
    const p = `scales[${i}]`;
    const o = obj(s, p);
    const uom = oneOf(o, 'uom', UOMS, p);
    return {
      scaleId: str(o, 'scaleId', p),
      class: oneOf(o, 'class', ['PRECISION', 'FLOOR'] as const, p),
      name: str(o, 'name', p),
      uom,
      capacityMg: mg(o, 'capacity', uom, p),
      resolutionMg: mg(o, 'resolution', uom, p),
    };
  });

  const operators = arr(root.operators, 'operators').map((op, i) => {
    const p = `operators[${i}]`;
    const o = obj(op, p);
    const role = oneOf(o, 'role', ['OPERATOR', 'SUPERVISOR'] as const, p);
    const operator: SeedOperator = {
      operatorId: str(o, 'operatorId', p),
      name: str(o, 'name', p),
      shift: str(o, 'shift', p),
      role,
    };
    if (role === 'SUPERVISOR') operator.pinHash = str(o, 'pinHash', p);
    return operator;
  });

  return {
    version: str(root, 'version', 'seed'),
    station: {
      stationId: str(station, 'stationId', 'station'),
      name: str(station, 'name', 'station'),
    },
    orgatex: { dyestuffs, batches, recipes },
    containers,
    scales,
    operators,
  };
}
