import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { SqliteAccountRepository, type AccountRepository } from '../modules/accounts';
import { SqliteFinanceRepository, type FinanceRepository } from '../modules/movements';
import { createExpoDatabase } from '../shared/storage/expo-database';
import type { AttachmentService, AttachmentPicker } from '../modules/attachments';
import { ExpoAttachmentPicker } from '../modules/attachments/native';
import { createAttachmentService } from './attachment-services';
import { SqliteMovementCommitter, type MovementCommitter } from './movement-committer';
import { randomUUID } from 'expo-crypto';
import { SqliteTransferRepository, type TransferRepository } from '../modules/transfers';
import { SqliteCategoryRepository, type CategoryRepository } from '../modules/categories';
import { SqliteBudgetRepository, type BudgetRepository } from '../modules/budgets';
import { SqliteGoalRepository, type GoalRepository } from '../modules/goals';
import { SqliteStatisticsRepository, type StatisticsRepository } from '../modules/statistics';
import { ReminderService, SqliteReminderRepository } from '../modules/reminders';
import { ExpoReminderDevice } from '../modules/reminders/infrastructure/expo-reminder-device';

export interface Services {
  readonly accounts: AccountRepository;
  readonly finance: FinanceRepository;
  readonly attachments: AttachmentService;
  readonly attachmentPicker: AttachmentPicker;
  readonly movementCommitter: MovementCommitter;
  readonly transfers: TransferRepository;
  readonly categories: CategoryRepository;
  readonly budgets: BudgetRepository;
  readonly goals: GoalRepository;
  readonly statistics: StatisticsRepository;
  readonly reminders: ReminderService;
}
interface ServicesProviderProps {
  readonly children: ReactNode;
}
const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: ServicesProviderProps): ReactElement {
  const native = useSQLiteContext();
  const services = useMemo((): Services => {
    const database = createExpoDatabase(native);
    return {
      accounts: new SqliteAccountRepository(database),
      finance: new SqliteFinanceRepository(database),
      attachments: createAttachmentService(database),
      attachmentPicker: new ExpoAttachmentPicker(),
      transfers: new SqliteTransferRepository(database),
      categories: new SqliteCategoryRepository(database),
      budgets: new SqliteBudgetRepository(database),
      goals: new SqliteGoalRepository(database),
      statistics: new SqliteStatisticsRepository(database),
      reminders: new ReminderService(
        new SqliteReminderRepository(database),
        new ExpoReminderDevice(),
      ),
      movementCommitter: new SqliteMovementCommitter(database, {
        nextId: randomUUID,
        now: () => new Date().toISOString(),
      }),
    };
  }, [native]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const context = useContext(ServicesContext);
  if (!context) throw new Error('Falta el proveedor de servicios.');
  return context;
}
