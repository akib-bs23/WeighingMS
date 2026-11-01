import type { ConsumptionRequest } from '../../src/shared/contracts/orgatex';

/** Valid consumption for B-24187 using the prototype ticket's actuals. */
export function consumptionFor24187(): ConsumptionRequest {
  return {
    stationId: 'STN-01',
    operatorId: 'OP-001',
    completedAt: '2026-10-29T07:48:22.000Z',
    lines: [
      line('RC-24187-01', 'DYE-1180', '2026-0341', 1_240_000, 1_241_500, 'g', 'scale-3kg'),
      line('RC-24187-02', 'DYE-2204', '2026-0298', 386_000, 385_400, 'g', 'scale-3kg'),
      line('RC-24187-03', 'DYE-4471', '2026-0387', 94_000, 94_200, 'g', 'scale-3kg'),
      line('RC-24187-04', 'AUX-0101', '2026-0112', 24_000_000, 23_980_000, 'kg', 'scale-32kg'),
      line('RC-24187-05', 'AUX-0107', '2026-0155', 9_600_000, 9_621_000, 'kg', 'scale-32kg'),
    ],
  };
}

function line(
  componentId: string,
  dyestuffCode: string,
  lotId: string,
  targetMg: number,
  actualMg: number,
  uom: 'g' | 'kg',
  scaleId: string,
): ConsumptionRequest['lines'][number] {
  return {
    componentId,
    dyestuffCode,
    lotId,
    targetMg,
    actualMg,
    uom,
    scaleId,
    result: 'IN_TOLERANCE',
  };
}
