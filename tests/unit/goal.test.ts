import { describe, expect, it } from 'vitest';
import { createAllocation, createGoal, goalChanges, type Goal } from '../../src/modules/goals';
import { createMoney } from '../../src/shared/domain/money';

const goal: Goal = {
  id: 'emergency',
  name: '  Emergencia  ',
  target: createMoney(5000),
  deadline: null,
  createdAt: '2026-10-20T12:00:00.000Z',
};
describe('metas y asignaciones', () => {
  it('normaliza el nombre y acepta fecha opcional, histórica y bisiesta válida', () => {
    expect(createGoal(goal).name).toBe('Emergencia');
    expect(goalChanges({ ...goal, deadline: '2024-02-29' }).deadline).toBe('2024-02-29');
    expect(goalChanges(goal).deadline).toBeNull();
  });
  it('rechaza nombres, objetivos, identificadores y fechas inválidos', () => {
    for (const name of ['', ' ', 'a'.repeat(61)])
      expect(() => createGoal({ ...goal, name })).toThrow();
    for (const amount of [0, -1])
      expect(() => createGoal({ ...goal, target: createMoney(amount) })).toThrow();
    expect(() => createGoal({ ...goal, id: '' })).toThrow();
    expect(() => createGoal({ ...goal, deadline: '2025-02-29' })).toThrow();
    expect(() => createGoal({ ...goal, createdAt: '2026-10-20' })).toThrow();
    expect(
      createGoal({ ...goal, target: createMoney(Number.MAX_SAFE_INTEGER) }).target.amountMinor,
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('valida las asignaciones positivas y su auditoría', () => {
    const allocation = {
      id: 'a',
      goalId: goal.id,
      kind: 'contribute',
      amount: createMoney(1000),
      createdAt: goal.createdAt,
    } satisfies Parameters<typeof createAllocation>[0];
    expect(createAllocation(allocation)).toEqual(allocation);
    expect(() => createAllocation({ ...allocation, amount: createMoney(0) })).toThrow();
    expect(() => createAllocation({ ...allocation, goalId: ' ' })).toThrow();
    expect(() => createAllocation({ ...allocation, createdAt: 'invalid' })).toThrow();
  });
});
