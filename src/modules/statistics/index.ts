export { buildStatistics, chartPercentage, statisticsMonths } from './domain/statistics';
export type {
  MonthlyCategoryTotal,
  PeriodTotals,
  AmountChange,
  CategoryShare,
  StatisticsReport,
} from './domain/statistics';
export type { StatisticsRepository } from './application/statistics-repository';
export { SqliteStatisticsRepository } from './infrastructure/sqlite-statistics-repository';
