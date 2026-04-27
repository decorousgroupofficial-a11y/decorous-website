import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { erpApi, formatDate } from "@/lib/erp-api";

const TONE = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  VOID: "bg-slate-100 text-slate-500",
};

export default function ErpDprListPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { erpApi.listDpr().then(setRows); }, []);

  return (
    <div data-testid="erp-dpr-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Daily Progress Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Target entry time ≤ 10 seconds.</p>
        </div>
        <Link to="/erp/dpr/new"><Button data-testid="erp-new-dpr-btn">+ New DPR</Button></Link>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold">No DPRs yet</p>
          <p className="text-sm text-slate-500 mt-1">Submit a report to track site activity & photos.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Card key={d.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatDate(d.report_date)}</span>
                  {d.weather && <Badge variant="outline">{d.weather}</Badge>}
                  <Badge className={TONE[d.approval_status] || ""}>{d.approval_status}</Badge>
                </div>
                <p className="mt-2 text-sm line-clamp-2">{d.work_narrative}</p>
                {d.activity_tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.activity_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {(d.photo_keys || []).slice(0, 3).map((_, i) => (
                  <div key={i} className="h-12 w-12 rounded-md bg-slate-200" />
                ))}
                {d.photo_keys?.length > 3 && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold">
                    +{d.photo_keys.length - 3}
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
