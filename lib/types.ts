export type Cycle = "monthly" | "months_12" | "months_24" | "months_36" | "months_48";

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  cycle: Cycle;
  start_date: string; // YYYY-MM-DD
  uses: number;
  is_trial: boolean;
  trial_end: string | null; // YYYY-MM-DD
  expiry_date: string | null; // YYYY-MM-DD
  expiry_alert_14d_sent: boolean;
  expiry_alert_7d_sent: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionInput = {
  name: string;
  price: number;
  cycle: Cycle;
  start_date: string;
  uses: number;
  is_trial: boolean;
  trial_end: string | null;
  expiry_date: string | null;
};
