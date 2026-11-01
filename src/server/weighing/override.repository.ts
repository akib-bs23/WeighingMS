import { Inject, Injectable } from '@nestjs/common';
import type { OverrideView } from '../../shared/contracts/weighing';
import { DATABASE, type Db } from '../database/database.provider';
import { overrides } from '../database/schema';

/**
 * Supervisor authorisation detail for `OVERRIDDEN` records. Write-only by design — no story in
 * this bolt lists overrides on their own; they are always read back *through* the
 * `WeighingRecordRepository.listBySession` join (story 013 AC1), so a standalone read method
 * here would be unused surface (coding-standards: no speculative API).
 */
@Injectable()
export class OverrideRepository {
  constructor(@Inject(DATABASE) private readonly db: Db) {}

  add(override: OverrideView & { overrideId: string; recordId: string }): void {
    this.db.insert(overrides).values(override).run();
  }
}
