import * as XLSX from "xlsx";
import { getMetricsFromTargets } from "./metrics";

type Salesperson = { id: string; name: string; bu_id: string };
type Target = { metric: string; target_value: number; points_per_unit: number; salesperson_id: string | null; bu_id: string };
type Log = { metric: string; count: number; salesperson_id: string; note: string | null; logged_at: string; bu_id: string };
type BU = { id: string; name: string; slug: string };

function addBUSheets(
  wb: XLSX.WorkBook,
  buName: string,
  salespeople: Salesperson[],
  targets: Target[],
  activityLogs: Log[]
) {
  const metrics = getMetricsFromTargets(targets);

  const summaryRows = salespeople.map((sp) => {
    const row: Record<string, string | number> = { Vendeur: sp.name };
    let totalPoints = 0;
    metrics.forEach((m) => {
      const current = activityLogs.filter((l) => l.salesperson_id === sp.id && l.metric === m.key).reduce((s, l) => s + l.count, 0);
      const t = targets.find((t) => t.salesperson_id === sp.id && t.metric === m.key) ?? targets.find((t) => !t.salesperson_id && t.metric === m.key);
      const target = t?.target_value ?? 0;
      const ppu = t?.points_per_unit ?? 1;
      row[`${m.label} (réalisé)`] = current;
      row[`${m.label} (objectif)`] = target;
      row[`${m.label} (%)`] = target > 0 ? Math.round((current / target) * 100) : 0;
      totalPoints += current * ppu;
    });
    row["Points total"] = totalPoints;
    return row;
  });

  const teamRow: Record<string, string | number> = { Vendeur: "TOTAL ÉQUIPE" };
  let teamTotalPoints = 0;
  metrics.forEach((m) => {
    const current = activityLogs.filter((l) => l.metric === m.key).reduce((s, l) => s + l.count, 0);
    const target = targets.find((t) => !t.salesperson_id && t.metric === m.key)?.target_value ?? 0;
    const ppu = targets.find((t) => !t.salesperson_id && t.metric === m.key)?.points_per_unit ?? 1;
    teamRow[`${m.label} (réalisé)`] = current;
    teamRow[`${m.label} (objectif)`] = target;
    teamRow[`${m.label} (%)`] = target > 0 ? Math.round((current / target) * 100) : 0;
    teamTotalPoints += current * ppu;
  });
  teamRow["Points total"] = teamTotalPoints;
  summaryRows.push(teamRow);

  // Truncate sheet name to 31 chars (Excel limit)
  const sheetName = buName.length > 31 ? buName.slice(0, 31) : buName;

  if (summaryRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(summaryRows);
    ws["!cols"] = Object.keys(summaryRows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

export function exportBUToExcel(
  buName: string,
  salespeople: Salesperson[],
  targets: Target[],
  activityLogs: Log[]
) {
  const wb = XLSX.utils.book_new();
  const metrics = getMetricsFromTargets(targets);

  // Sheet 1: Summary
  const summaryRows = salespeople.map((sp) => {
    const row: Record<string, string | number> = { Vendeur: sp.name };
    let totalPoints = 0;
    metrics.forEach((m) => {
      const current = activityLogs.filter((l) => l.salesperson_id === sp.id && l.metric === m.key).reduce((s, l) => s + l.count, 0);
      const t = targets.find((t) => t.salesperson_id === sp.id && t.metric === m.key) ?? targets.find((t) => !t.salesperson_id && t.metric === m.key);
      const target = t?.target_value ?? 0;
      const ppu = t?.points_per_unit ?? 1;
      row[`${m.label} (réalisé)`] = current;
      row[`${m.label} (objectif)`] = target;
      row[`${m.label} (%)`] = target > 0 ? Math.round((current / target) * 100) : 0;
      totalPoints += current * ppu;
    });
    row["Points total"] = totalPoints;
    return row;
  });

  const teamRow: Record<string, string | number> = { Vendeur: "TOTAL ÉQUIPE" };
  let teamTotalPoints = 0;
  metrics.forEach((m) => {
    const current = activityLogs.filter((l) => l.metric === m.key).reduce((s, l) => s + l.count, 0);
    const target = targets.find((t) => !t.salesperson_id && t.metric === m.key)?.target_value ?? 0;
    const ppu = targets.find((t) => !t.salesperson_id && t.metric === m.key)?.points_per_unit ?? 1;
    teamRow[`${m.label} (réalisé)`] = current;
    teamRow[`${m.label} (objectif)`] = target;
    teamRow[`${m.label} (%)`] = target > 0 ? Math.round((current / target) * 100) : 0;
    teamTotalPoints += current * ppu;
  });
  teamRow["Points total"] = teamTotalPoints;
  summaryRows.push(teamRow);

  const ws1 = XLSX.utils.json_to_sheet(summaryRows);
  ws1["!cols"] = Object.keys(summaryRows[0] || {}).map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws1, "Synthèse");

  // Sheet 2: Detail
  const detailRows = activityLogs
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
    .map((l) => ({
      Date: new Date(l.logged_at).toLocaleString("fr-FR"),
      Vendeur: salespeople.find((sp) => sp.id === l.salesperson_id)?.name ?? "?",
      Métrique: metrics.find((m) => m.key === l.metric)?.label ?? l.metric,
      Quantité: l.count,
      Commentaire: l.note ?? "",
    }));

  const ws2 = XLSX.utils.json_to_sheet(detailRows);
  ws2["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Détail activités");

  XLSX.writeFile(wb, `${buName.replace(/[^a-zA-Z0-9]/g, "_")}_export.xlsx`);
}

export function exportHQToExcel(
  bus: BU[],
  allSalespeople: Salesperson[],
  allTargets: Target[],
  allLogs: Log[]
) {
  const wb = XLSX.utils.book_new();

  bus.forEach((bu) => {
    const sp = allSalespeople.filter((s) => s.bu_id === bu.id);
    const t = allTargets.filter((t) => t.bu_id === bu.id);
    const l = allLogs.filter((l) => l.bu_id === bu.id);
    addBUSheets(wb, bu.name, sp, t, l);
  });

  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Vide");
  }

  XLSX.writeFile(wb, `Sales_Blitz_Export.xlsx`);
}
