'use client';

import Link from 'next/link';
import type { ApprovalStatus, Weather } from '@decorous/types';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Dpr = {
  id: string;
  projectId: string;
  reportDate: string;
  workNarrative: string;
  activityTags: string[];
  weather: Weather | null;
  photoKeys: string[];
  approvalStatus: ApprovalStatus;
  createdAt: string;
};

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> =
  {
    DRAFT: 'neutral',
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    VOID: 'neutral',
  };

export default function DprListPage() {
  const { data, loading, error } = useApi<Dpr[]>('/v1/dpr');

  return (
    <div data-testid="dpr-page">
      <PageHeader
        title="Daily Progress Reports"
        description="Submitted by site supervisors. Target entry time ≤ 10 seconds."
        action={
          <Link href="/dashboard/dpr/new">
            <Button data-testid="new-dpr-btn">+ New DPR</Button>
          </Link>
        }
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No DPRs yet"
          message="Submit a report to track site activity, labour, and photos."
          cta={
            <Link href="/dashboard/dpr/new">
              <Button>+ New DPR</Button>
            </Link>
          }
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((d) => (
            <Card key={d.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatDate(d.reportDate)}</span>
                  {d.weather && <Badge>{d.weather}</Badge>}
                  <Badge tone={STATUS_TONE[d.approvalStatus] ?? 'neutral'}>
                    {d.approvalStatus}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-800">
                  {d.workNarrative}
                </p>
                {d.activityTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.activityTags.map((t) => (
                      <Badge key={t} tone="info">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-shrink-0 gap-1">
                {d.photoKeys.slice(0, 3).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-12 rounded-md bg-slate-200"
                    aria-label="photo thumbnail"
                  />
                ))}
                {d.photoKeys.length > 3 && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                    +{d.photoKeys.length - 3}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
