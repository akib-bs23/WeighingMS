import { checkEligibility } from '../../src/shared/batches/eligibility';
import { BATCH_STATUSES } from '../../src/shared/contracts/orgatex';

describe('checkEligibility', () => {
  it('allows a RELEASED batch', () => {
    expect(checkEligibility({ batchId: 'B-24187', status: 'RELEASED' })).toEqual({
      eligible: true,
    });
  });

  it.each(BATCH_STATUSES.filter((s) => s !== 'RELEASED'))(
    'refuses a %s batch with the reason shown to the operator',
    (status) => {
      expect(checkEligibility({ batchId: 'B-24188', status })).toEqual({
        eligible: false,
        code: 'BATCH_NOT_RELEASED',
        message: `Batch B-24188 not released by OrgaTEX (status ${status})`,
      });
    },
  );
});
