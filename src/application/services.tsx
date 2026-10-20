import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { SqliteAccountRepository, type AccountRepository } from '../modules/accounts';
import { SqliteFinanceRepository, type FinanceRepository } from '../modules/movements';
import { createExpoDatabase } from '../shared/storage/expo-database';

export interface Services {
  readonly accounts: AccountRepository;
  readonly finance: FinanceRepository;
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
    };
  }, [native]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const context = useContext(ServicesContext);
  if (!context) throw new Error('Falta el proveedor de servicios.');
  return context;
}
