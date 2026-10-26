import { describe, expect, it } from 'vitest';
import { consumptionPer100Km, deadlineState, litresToCentilitres, maintenanceTotal } from './fleet';

describe('maintenance', () => {
  it('adds labour and parts', () => {
    expect(
      maintenanceTotal(30_000, [
        { quantity: 1, unitCostCents: 8000 },
        { quantity: 4, unitCostCents: 2500 },
      ]),
    ).toBe(48_000);
  });
});

describe('deadlines', () => {
  it('flags overdue and due-soon deadlines with the reminder threshold', () => {
    expect(deadlineState('2026-10-25', '2026-10-26', false)).toBe('overdue');
    expect(deadlineState('2026-11-25', '2026-10-26', false)).toBe('due_soon');
    expect(deadlineState('2026-11-26', '2026-10-26', false)).toBe('ok');
    expect(deadlineState('2026-10-25', '2026-10-26', true)).toBe('done');
  });
});

describe('fuel', () => {
  it('parses litres into centilitres', () => {
    expect(litresToCentilitres('45,3')).toBe(4530);
    expect(litresToCentilitres('50')).toBe(5000);
    expect(litresToCentilitres('0,5')).toBeUndefined();
    expect(litresToCentilitres('abc')).toBeUndefined();
  });

  it('computes the consumption between full tanks', () => {
    // 120 000 km full; +40 L at 120 500 (partial); +20 L full at 121 000: 60 L / 1 000 km = 6 L/100 km.
    expect(
      consumptionPer100Km([
        { odometerKm: 121_000, volumeCl: 2000, fullTank: true },
        { odometerKm: 120_000, volumeCl: 5000, fullTank: true },
        { odometerKm: 120_500, volumeCl: 4000, fullTank: false },
      ]),
    ).toBe(600);
    expect(consumptionPer100Km([{ odometerKm: 1000, volumeCl: 5000, fullTank: true }])).toBeNull();
  });
});
