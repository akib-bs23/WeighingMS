import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import type {
  ConsumptionReceipt,
  ConsumptionRequest,
  OrgatexBatch,
  OrgatexDyestuff,
  OrgatexRecipe,
  StoredConsumption,
} from '../../../../shared/contracts/orgatex';
import { CLOCK, type Clock } from '../../../common/clock/clock';
import { DomainError, NotFoundError, UnavailableError } from '../../../common/errors/domain-error';
import { DATABASE, type Db } from '../../../database/database.provider';
import {
  orgatexBatches,
  orgatexConsumptionLines,
  orgatexConsumptions,
  orgatexDyestuffs,
  orgatexRecipeComponents,
  orgatexRecipes,
} from '../../../database/schema';
import { ResetRegistry } from '../../../training/reset.registry';
import { SeedService } from '../../../training/seed/seed.service';

/**
 * Dummy OrgaTEX — training substitute for FCI's MES. Serves the seeded batch queue and recipes
 * and can be switched offline to demonstrate OrgaTEX-unavailable behaviour.
 */
@Injectable()
export class DummyOrgatexService implements OnModuleInit {
  private online = true;
  private lastServedAt: Date | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly seed: SeedService,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'dummy-orgatex',
      isSeeded: () => (this.db.select({ n: count() }).from(orgatexBatches).get()?.n ?? 0) > 0,
      reset: () => {
        this.reseed();
      },
    });
  }

  listBatches(): OrgatexBatch[] {
    this.assertOnline();
    const rows = this.db.select().from(orgatexBatches).orderBy(asc(orgatexBatches.batchId)).all();
    return this.served(rows);
  }

  getBatch(batchId: string): OrgatexBatch {
    this.assertOnline();
    const row = this.db
      .select()
      .from(orgatexBatches)
      .where(eq(orgatexBatches.batchId, batchId))
      .get();
    if (!row) throw new NotFoundError('BATCH_NOT_FOUND', `Batch ${batchId} not found`, { batchId });
    return this.served(row);
  }

  getRecipe(batchId: string): OrgatexRecipe {
    const batch = this.getBatch(batchId);
    const recipe = this.db
      .select()
      .from(orgatexRecipes)
      .where(eq(orgatexRecipes.recipeId, batch.recipeId))
      .get();
    if (!recipe) {
      throw new NotFoundError('RECIPE_NOT_FOUND', `No recipe issued for batch ${batchId}`, {
        batchId,
        recipeId: batch.recipeId,
      });
    }
    const rows = this.db
      .select({ component: orgatexRecipeComponents, dyestuff: orgatexDyestuffs })
      .from(orgatexRecipeComponents)
      .innerJoin(orgatexDyestuffs, eq(orgatexRecipeComponents.dyestuffCode, orgatexDyestuffs.code))
      .where(eq(orgatexRecipeComponents.recipeId, recipe.recipeId))
      .orderBy(asc(orgatexRecipeComponents.sequence))
      .all();
    return this.served({
      batchId,
      recipeId: recipe.recipeId,
      shadeCode: recipe.shadeCode,
      components: rows.map(({ component: c, dyestuff }) => ({
        componentId: c.componentId,
        sequence: c.sequence,
        dyestuff: dyestuff satisfies OrgatexDyestuff,
        targetMg: c.targetMg,
        uom: c.uom,
        toleranceMg: c.toleranceMg,
        displayMaxMg: c.displayMaxMg,
        lotId: c.lotId,
        containerId: c.containerId,
      })),
    });
  }

  /**
   * Accepts actual consumption for a batch. Idempotent by key: a retry with the same key and
   * payload returns the original receipt; one consumption per batch (training assumption, OQ-02).
   */
  receiveConsumption(
    batchId: string,
    idempotencyKey: string,
    request: ConsumptionRequest,
  ): ConsumptionReceipt {
    const recipe = this.getRecipe(batchId);
    const payloadHash = hashPayload(batchId, request);

    const byKey = this.db
      .select()
      .from(orgatexConsumptions)
      .where(eq(orgatexConsumptions.idempotencyKey, idempotencyKey))
      .get();
    if (byKey) {
      if (byKey.payloadHash !== payloadHash || byKey.batchId !== batchId) {
        throw new DomainError(
          'IDEMPOTENCY_CONFLICT',
          `Idempotency key ${idempotencyKey} was already used with a different payload`,
          409,
          { idempotencyKey },
        );
      }
      return this.served(toReceipt(byKey, request.lines.length));
    }

    const byBatch = this.db
      .select({ consumptionId: orgatexConsumptions.consumptionId })
      .from(orgatexConsumptions)
      .where(eq(orgatexConsumptions.batchId, batchId))
      .get();
    if (byBatch) {
      throw new DomainError(
        'CONSUMPTION_ALREADY_POSTED',
        `Consumption for batch ${batchId} has already been posted`,
        409,
        { batchId, consumptionId: byBatch.consumptionId },
      );
    }

    const problems = checkAgainstRecipe(recipe, request);
    if (problems.length > 0) {
      throw new DomainError(
        'CONSUMPTION_MISMATCH',
        `Consumption does not match the recipe of batch ${batchId}`,
        422,
        { problems },
      );
    }

    const header = {
      consumptionId: randomUUID(),
      batchId,
      idempotencyKey,
      payloadHash,
      stationId: request.stationId,
      operatorId: request.operatorId,
      completedAt: request.completedAt,
      confirmedAt: new Date(this.clock.now()).toISOString(),
    };
    this.db.transaction((tx) => {
      tx.insert(orgatexConsumptions).values(header).run();
      tx.insert(orgatexConsumptionLines)
        .values(request.lines.map((l) => ({ ...l, consumptionId: header.consumptionId })))
        .run();
    });
    return this.served(toReceipt(header, request.lines.length));
  }

  /** Training inspection of stored consumption (workbook Step 26 evidence). */
  listConsumption(batchId?: string): StoredConsumption[] {
    const headers = this.db
      .select()
      .from(orgatexConsumptions)
      .where(batchId ? eq(orgatexConsumptions.batchId, batchId) : undefined)
      .orderBy(asc(orgatexConsumptions.confirmedAt))
      .all();
    return headers.map((h) => {
      const l = orgatexConsumptionLines;
      const lines = this.db
        .select({
          componentId: l.componentId,
          dyestuffCode: l.dyestuffCode,
          lotId: l.lotId,
          targetMg: l.targetMg,
          actualMg: l.actualMg,
          uom: l.uom,
          scaleId: l.scaleId,
          result: l.result,
        })
        .from(l)
        .where(eq(l.consumptionId, h.consumptionId))
        .orderBy(asc(l.lineId))
        .all();
      return {
        ...toReceipt(h, lines.length),
        stationId: h.stationId,
        operatorId: h.operatorId,
        completedAt: h.completedAt,
        lines,
      };
    });
  }

  isOnline(): boolean {
    return this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  getLastServedAt(): Date | null {
    return this.lastServedAt;
  }

  private assertOnline(): void {
    if (!this.online) {
      throw new UnavailableError('ORGATEX_UNAVAILABLE', 'OrgaTEX is unavailable');
    }
  }

  private served<T>(value: T): T {
    this.lastServedAt = new Date();
    return value;
  }

  private reseed(): void {
    const { orgatex } = this.seed.get();
    this.db.transaction((tx) => {
      tx.delete(orgatexConsumptionLines).run();
      tx.delete(orgatexConsumptions).run();
      tx.delete(orgatexRecipeComponents).run();
      tx.delete(orgatexRecipes).run();
      tx.delete(orgatexBatches).run();
      tx.delete(orgatexDyestuffs).run();
      tx.insert(orgatexDyestuffs).values(orgatex.dyestuffs).run();
      tx.insert(orgatexBatches).values(orgatex.batches).run();
      for (const recipe of orgatex.recipes) {
        tx.insert(orgatexRecipes)
          .values({ recipeId: recipe.recipeId, shadeCode: recipe.shadeCode })
          .run();
        tx.insert(orgatexRecipeComponents)
          .values(recipe.components.map((c) => ({ ...c, recipeId: recipe.recipeId })))
          .run();
      }
    });
    this.online = true;
    this.lastServedAt = null;
  }
}

type ConsumptionHeader = typeof orgatexConsumptions.$inferSelect;

function toReceipt(h: ConsumptionHeader, lineCount: number): ConsumptionReceipt {
  return {
    consumptionId: h.consumptionId,
    batchId: h.batchId,
    idempotencyKey: h.idempotencyKey,
    confirmedAt: h.confirmedAt,
    lineCount,
  };
}

function hashPayload(batchId: string, request: ConsumptionRequest): string {
  const canonical = {
    batchId,
    stationId: request.stationId,
    operatorId: request.operatorId,
    completedAt: request.completedAt,
    lines: request.lines.map((l) => [
      l.componentId,
      l.dyestuffCode,
      l.lotId,
      l.targetMg,
      l.actualMg,
      l.uom,
      l.scaleId,
      l.result,
    ]),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Every recipe component exactly once, with the recipe's dyestuff, lot and unit. */
function checkAgainstRecipe(recipe: OrgatexRecipe, request: ConsumptionRequest): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const line of request.lines) {
    const component = recipe.components.find((c) => c.componentId === line.componentId);
    if (!component) {
      problems.push(`${line.componentId}: not a component of recipe ${recipe.recipeId}`);
      continue;
    }
    if (seen.has(line.componentId)) problems.push(`${line.componentId}: reported more than once`);
    seen.add(line.componentId);
    if (line.dyestuffCode !== component.dyestuff.code) {
      problems.push(
        `${line.componentId}: dyestuff ${line.dyestuffCode} != ${component.dyestuff.code}`,
      );
    }
    if (line.lotId !== component.lotId) {
      problems.push(`${line.componentId}: lot ${line.lotId} != ${component.lotId}`);
    }
    if (line.uom !== component.uom) {
      problems.push(`${line.componentId}: unit ${line.uom} != ${component.uom}`);
    }
  }
  for (const c of recipe.components) {
    if (!seen.has(c.componentId)) problems.push(`${c.componentId}: missing`);
  }
  return problems;
}
