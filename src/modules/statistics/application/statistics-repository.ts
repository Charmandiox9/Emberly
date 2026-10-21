import type { StatisticsReport } from '../domain/statistics';

export interface StatisticsRepository {
  read(month: string): Promise<StatisticsReport>;
}
