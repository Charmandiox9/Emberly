import { toast } from 'sonner-native';

export interface Notifications {
  success(message: string): void;
}

export const notifications: Notifications = {
  success(message: string): void {
    toast.success(message);
  },
};
