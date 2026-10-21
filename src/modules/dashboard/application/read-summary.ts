import type { EmberProgress } from '../../ember/domain/ember-progress';
import type { EmberRepository } from '../../ember/application/ember-repository';
import type { FinanceRepository } from '../../movements';

export interface DashboardSummaryData {
  readonly overview: Awaited<ReturnType<FinanceRepository['overview']>>;
  readonly recent: Awaited<ReturnType<FinanceRepository['list']>>;
  readonly ember: EmberProgress | null;
}

export async function readSummaryData(
  finance: FinanceRepository,
  emberRepository: EmberRepository,
  month: string,
  includeEmber: boolean,
): Promise<DashboardSummaryData> {
  const [overview, recent, ember] = await Promise.all([
    finance.overview(month),
    finance.list({ month, kind: 'expense', limit: 3 }),
    includeEmber ? emberRepository.readProgress().catch(() => null) : Promise.resolve(null),
  ]);
  return { overview, recent, ember };
}
