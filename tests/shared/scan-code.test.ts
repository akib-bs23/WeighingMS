import { classifyScan } from '../../src/shared/batches/scan-code';

describe('classifyScan', () => {
  it.each([
    ['B-24187', 'BATCH'],
    ['  B-24191\n', 'BATCH'],
    ['DYE-4471', 'DYESTUFF'],
    ['DYE-1180', 'DYESTUFF'],
    ['AUX-0101', 'DYESTUFF'],
    ['b-24187', 'UNKNOWN'],
    ['B-', 'UNKNOWN'],
    ['B-24187X', 'UNKNOWN'],
    ['SO-9931', 'UNKNOWN'],
    ['hello', 'UNKNOWN'],
    ['', 'UNKNOWN'],
  ] as const)('classifies %j as %s', (code, kind) => {
    expect(classifyScan(code)).toBe(kind);
  });
});
