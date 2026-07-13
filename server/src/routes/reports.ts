import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

const filterSchema = z.object({
  userId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

async function fetchFilteredEntries(req: import("express").Request) {
  const q = filterSchema.parse(req.query);
  const isAdmin = req.user!.role === "ADMIN";

  const where: Record<string, unknown> = {};
  where.userId = isAdmin && q.userId ? q.userId : isAdmin ? undefined : req.user!.sub;
  if (q.projectId) where.projectId = q.projectId;
  if (q.clientId) where.project = { clientId: q.clientId };
  if (q.from || q.to) {
    where.startTime = {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    };
  }
  // Exclude any still-running timer from totals - it has no end time yet.
  where.endTime = { not: null };

  return prisma.timeEntry.findMany({
    where,
    include: {
      project: { include: { client: true } },
      task: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

function durationHours(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / 3_600_000;
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const entries = await fetchFilteredEntries(req);

    let totalHours = 0;
    const byClient = new Map<string, { clientId: string; clientName: string; hours: number }>();
    const byProject = new Map<string, { projectId: string; projectName: string; clientName: string; hours: number }>();
    const byContractor = new Map<string, { userId: string; userName: string; hours: number }>();

    for (const e of entries) {
      if (!e.endTime) continue;
      const hours = durationHours(e.startTime, e.endTime);
      totalHours += hours;

      const client = e.project.client;
      const clientAgg = byClient.get(client.id) ?? { clientId: client.id, clientName: client.name, hours: 0 };
      clientAgg.hours += hours;
      byClient.set(client.id, clientAgg);

      const projectAgg =
        byProject.get(e.project.id) ??
        { projectId: e.project.id, projectName: e.project.name, clientName: client.name, hours: 0 };
      projectAgg.hours += hours;
      byProject.set(e.project.id, projectAgg);

      const contractorAgg = byContractor.get(e.user.id) ?? { userId: e.user.id, userName: e.user.name, hours: 0 };
      contractorAgg.hours += hours;
      byContractor.set(e.user.id, contractorAgg);
    }

    res.json({
      totalHours,
      entryCount: entries.length,
      byClient: [...byClient.values()].sort((a, b) => b.hours - a.hours),
      byProject: [...byProject.values()].sort((a, b) => b.hours - a.hours),
      byContractor: [...byContractor.values()].sort((a, b) => b.hours - a.hours),
    });
  })
);

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

router.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const entries = await fetchFilteredEntries(req);

    const header = ["Date", "Contractor", "Client", "Project", "Task", "Description", "Start", "End", "Hours"];
    const rows = entries.map((e) => {
      const hours = e.endTime ? durationHours(e.startTime, e.endTime) : 0;
      return [
        e.startTime.toISOString().slice(0, 10),
        e.user.name,
        e.project.client.name,
        e.project.name,
        e.task?.name ?? "",
        e.description,
        e.startTime.toISOString(),
        e.endTime ? e.endTime.toISOString() : "",
        hours.toFixed(2),
      ];
    });

    const csv = [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="time-report.csv"`);
    res.send(csv);
  })
);

export default router;
