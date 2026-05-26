const BASE = '/api';

export interface Repo {
  id: string;
  name: string;
  url: string;
  branch: string;
  last_scanned: string | null;
  total_debt: number;
  created_at: string;
}

export interface DebtItem {
  id: string;
  repo_id: string;
  file_path: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  estimated_hours: number;
  estimated_cost: number;
  churn_score: number;
  line_start: number | null;
  line_end: number | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface CostBreakdown {
  total_cost: number;
  hourly_rate: number;
  total_hours: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  projected_monthly_cost: number;
  items_count: number;
}

export interface TimelinePoint {
  date: string;
  total_debt: number;
  item_count: number;
  change_from_previous: number;
}

export interface RoiProjection {
  item_id: string;
  item_title: string;
  cost_to_fix: number;
  monthly_savings: number;
  break_even_months: number;
  one_year_savings: number;
  five_year_savings: number;
}

export interface AiRecommendation {
  item_id: string;
  title: string;
  reason: string;
  urgency_score: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  repos: {
    list: () => request<Repo[]>('/repos'),
    get: (id: string) => request<Repo>(`/repos/${id}`),
    create: (data: { name: string; url: string; branch?: string }) =>
      request<Repo>('/repos', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/repos/${id}`, { method: 'DELETE' }),
    scan: (data: { url: string; branch?: string }) =>
      request<Repo>('/repos/scan', { method: 'POST', body: JSON.stringify(data) }),
  },

  debt: {
    list: (params?: { repo_id?: string; severity?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.repo_id) qs.set('repo_id', params.repo_id);
      if (params?.severity) qs.set('severity', params.severity);
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString();
      return request<DebtItem[]>(`/debt${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<DebtItem>(`/debt/${id}`),
    resolve: (id: string) =>
      request<DebtItem>(`/debt/${id}/resolve`, { method: 'PATCH' }),
  },

  costs: {
    get: (repo_id?: string) => {
      const qs = repo_id ? `?repo_id=${repo_id}` : '';
      return request<CostBreakdown>(`/costs${qs}`);
    },
  },

  timeline: {
    get: (repo_id?: string) => {
      const qs = repo_id ? `?repo_id=${repo_id}` : '';
      return request<TimelinePoint[]>(`/timeline${qs}`);
    },
  },

  roi: {
    get: (item_id: string) => request<RoiProjection>(`/roi/${item_id}`),
  },

  ai: {
    recommend: (repo_id?: string) => {
      const qs = repo_id ? `?repo_id=${repo_id}` : '';
      return request<AiRecommendation[]>(`/ai/recommend${qs}`);
    },
  },
};
