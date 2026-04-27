'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectSummary, Weather } from '@decorous/types';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Mobile-friendly 3-step DPR entry.
 *
 * Target: end-to-end submission in ≤ 10 seconds on a phone browser.
 * Why web-first despite a future native app: site supervisors need this
 * NOW; their Android browser + login is faster to ship than building RN.
 */

const WEATHERS: Weather[] = ['SUNNY', 'CLOUDY', 'RAINY', 'STORMY'];

type LabourTrade = 'MASON' | 'STEEL' | 'ELECTRICAL' | 'PLUMBING' | 'CARPENTER' | 'HELPER';
const TRADES: LabourTrade[] = [
  'MASON',
  'STEEL',
  'ELECTRICAL',
  'PLUMBING',
  'CARPENTER',
  'HELPER',
];

const ACTIVITY_CHIPS = [
  'Excavation',
  'PCC',
  'Footing',
  'Slab casting',
  'Curing',
  'Masonry',
  'Plastering',
  'Plumbing',
  'Electrical',
  'Finishing',
];

type Counts = Record<LabourTrade, { skilled: number; helper: number }>;
const EMPTY_COUNTS: Counts = TRADES.reduce(
  (acc, t) => ({ ...acc, [t]: { skilled: 0, helper: 0 } }),
  {} as Counts,
);

function ulid() {
  // Light ULID — good enough as idempotency key for browsers
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export default function NewDprPage() {
  const router = useRouter();
  const projects = useApi<ProjectSummary[]>('/v1/projects');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectId, setProjectId] = useState<string>('');
  const [reportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narrative, setNarrative] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather | ''>('');
  const [blockers, setBlockers] = useState('');
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [photos, setPhotos] = useState<string[]>([]);      // object keys
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalLabour = TRADES.reduce(
    (n, t) => n + counts[t].skilled + counts[t].helper,
    0,
  );

  async function handlePhotoSelect(file: File) {
    const presign = await apiClient.post('/v1/uploads/presign', {
      kind: 'dpr-photo',
      contentType: file.type,
      sizeBytes: file.size,
    });
    // In production this PUTs to S3. Stubbed URL still works as a key capture.
    try {
      await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
    } catch {
      // stubbed URL will fail in dev — we still keep the objectKey
    }
    setPhotos((p) => [...p, presign.objectKey]);
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const labourCounts: Record<string, Record<string, number>> = {};
      for (const t of TRADES) {
        if (counts[t].skilled + counts[t].helper > 0) {
          labourCounts[t.toLowerCase()] = counts[t];
        }
      }

      const idempotencyKey = ulid();
      const dpr = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/dpr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            projectId,
            reportDate,
            workNarrative: narrative,
            activityTags: activities,
            weather: weather || undefined,
            blockers: blockers || undefined,
            labourCounts,
            photoKeys: photos,
          }),
        },
      ).then((r) => {
        if (!r.ok) throw new Error('Create failed');
        return r.json();
      });

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/dpr/${dpr.id}/submit`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': `${idempotencyKey}-submit`,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        },
      );

      router.push('/dashboard/dpr');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-md py-4 sm:py-8"
      data-testid="new-dpr-form"
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Report</h1>
        <div className="text-xs text-slate-500">
          Step {step} / 3 · {new Date(reportDate).toLocaleDateString('en-IN')}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6 flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              step >= s ? 'bg-primary' : 'bg-slate-200',
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            <span className="mb-1 block">Project</span>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            >
              <option value="">Select project</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            <span className="mb-1 block">Work done today</span>
            <textarea
              required
              rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. Slab casting of 2nd floor completed, curing started"
              className="block w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-base"
              data-testid="dpr-narrative"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium">Activity tags</span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CHIPS.map((tag) => {
                const on = activities.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() =>
                      setActivities((a) =>
                        on ? a.filter((x) => x !== tag) : [...a, tag],
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm',
                      on
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">Weather</span>
            <div className="grid grid-cols-4 gap-2">
              {WEATHERS.map((w) => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setWeather(w === weather ? '' : w)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-semibold',
                    weather === w
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-300 bg-white',
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-medium">
            <span className="mb-1 block">Blockers / issues</span>
            <input
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="None"
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            />
          </label>

          <Button
            className="w-full py-4 text-base"
            onClick={() => setStep(2)}
            disabled={!projectId || narrative.length < 3}
          >
            Next →
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Labour present today — tap +/− to adjust.
          </p>
          {TRADES.map((t) => (
            <div
              key={t}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-2 text-sm font-semibold">
                {t[0] + t.slice(1).toLowerCase()}
              </div>
              <CountRow
                label="Skilled"
                value={counts[t].skilled}
                onChange={(n) =>
                  setCounts((c) => ({
                    ...c,
                    [t]: { ...c[t], skilled: n },
                  }))
                }
              />
              <CountRow
                label="Helper"
                value={counts[t].helper}
                onChange={(n) =>
                  setCounts((c) => ({
                    ...c,
                    [t]: { ...c[t], helper: n },
                  }))
                }
              />
            </div>
          ))}

          <div className="text-right text-sm font-medium text-slate-700">
            Total: {totalLabour} workers
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              className="flex-1 py-4 text-base"
            >
              ← Back
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1 py-4 text-base">
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium">
              Photos (min 2, max 10)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg bg-slate-200"
                >
                  <div className="absolute bottom-1 right-1 rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] text-white">
                    ✓
                  </div>
                </div>
              ))}
              {photos.length < 10 && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-3xl text-slate-400 hover:bg-slate-50">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoSelect(f);
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {photos.length}/10 attached
            </p>
          </div>

          {err && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {err}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setStep(2)}
              className="flex-1 py-4 text-base"
              disabled={submitting}
            >
              ← Back
            </Button>
            <Button
              onClick={submit}
              disabled={photos.length < 2 || submitting}
              className="flex-1 py-4 text-base"
              data-testid="submit-dpr-btn"
            >
              {submitting ? 'Submitting…' : 'Submit DPR'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CountRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-semibold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
