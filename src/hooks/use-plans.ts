import { useState, useEffect } from "react";

export interface Plan {
  id: string;
  name: string;
  code: string;
  tier: 'gratuito' | 'essencial' | 'pro' | 'ultra' | 'contabil' | 'contador_prof' | 'contador_avancado';
  monthly_price_cents: number;
  yearly_price_cents?: number;
  storage_gb: number;
  features: any;
  is_demo: boolean;
  demo_duration_days?: number;
  created_at: string;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temporarily disabled while database is being updated
  useEffect(() => {
    setPlans([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    plans,
    activePlans: [],
    demoPlans: [],
    loading,
    error,
    refetch: () => {}
  };
}

export function formatPrice(cents?: number | null): string {
  if (cents == null) return 'Sob consulta';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}