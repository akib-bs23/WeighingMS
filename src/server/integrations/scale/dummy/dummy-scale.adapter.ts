import { Injectable } from '@nestjs/common';
import type {
  ScaleInfo,
  ScaleStatus,
  TareResult,
  WeightReading,
} from '../../../../shared/contracts/devices';
import { settle } from '../../../common/async/settle';
import type { ScalePort } from '../scale.port';
import { DummyScaleService } from './dummy-scale.service';

/** ScalePort backed by the in-process Dummy scales; errors propagate unchanged. */
@Injectable()
export class DummyScaleAdapter implements ScalePort {
  constructor(private readonly dummy: DummyScaleService) {}

  listScales(): Promise<ScaleInfo[]> {
    return settle(() => this.dummy.listScales());
  }

  getStatus(scaleId: string): Promise<ScaleStatus> {
    return settle(() => this.dummy.getStatus(scaleId));
  }

  readWeight(scaleId: string): Promise<WeightReading> {
    return settle(() => this.dummy.readWeight(scaleId));
  }

  tare(scaleId: string): Promise<TareResult> {
    return settle(() => this.dummy.tare(scaleId));
  }
}
