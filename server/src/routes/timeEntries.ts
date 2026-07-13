import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";

const router = Router();

router.use(requireAuth);

// Clients/Projects are flat tags - any active team member can log time
// against any active project. Only Tasks can be scoped to specific people.
async function assertProjectAccess(role: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, "Project not found");
  if (role !== "ADMIN" && !project.isActive) throw new HttpError(404, "Project not found");
  return project;
}

async function assertTaskAccess(userId: string, role: string, taskId: string, projectId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { assignments: true } });
  if (!task || task.projectId !== projectId) throw new HttpError(400, "Task does not belong to this project");
  if (role !== "ADMIN" && task.assignments.length > 0) {
    const assigned = task.assignments.some((a) => a.userId === userId);
    if (!assigned) throw new HttpError(403, "This task is not assigned to you");
  }
}

const listQuerySchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
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

    const entries = await prisma.timeEntry.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        project: { select: { id: true, name: true, clientId: true, client: { select: { id: true, name: true } } } },
        task: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
    res.json(entries);
  })
);

router.get(
  "/running",
  asyncHandler(async (req, res) => {
    const entry = await prisma.timeEntry.findFirst({
      where: { userId: req.user!.sub, endTime: null },
      include: { project: { include: { client: true } }, task: true },
    });
    res.json(entry ?? null);
  })
);

const startSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  description: z.string().optional(),
});

router.post(
  "/start",
  asyncHandler(async (req, res) => {
    const data = startSchema.parse(req.body);
    await assertProjectAccess(req.user!.role, data.projectId);
    if (data.taskId) await assertTaskAccess(req.user!.sub, req.user!.role, data.taskId, data.projectId);

    // Only one running timer per contractor at a time - stop any existing one.
    await prisma.timeEntry.updateMany({
      where: { userId: req.user!.sub, endTime: null },
      data: { endTime: new Date() },
    });

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.user!.sub,
        projectId: data.projectId,
        taskId: data.taskId || null,
        description: data.description ?? "",
        startTime: new Date(),
        endTime: null,
      },
      include: { project: { include: { client: true } }, task: true },
    });
    res.status(201).json(entry);
  })
);

router.post(
  "/:id/stop",
  asyncHandler(async (req, res) => {
    const existing = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Time entry not found" });
    if (existing.userId !== req.user!.sub && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not your time entry" });
    }
    const entry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: { endTime: new Date() },
      include: { project: { include: { client: true } }, task: true },
    });
    res.json(entry);
  })
);

const createSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    await assertProjectAccess(req.user!.role, data.projectId);
    if (data.taskId) await assertTaskAccess(req.user!.sub, req.user!.role, data.taskId, data.projectId);

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) return res.status(400).json({ error: "endTime must be after startTime" });

    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.user!.sub,
        projectId: data.projectId,
        taskId: data.taskId || null,
        description: data.description ?? "",
        startTime,
        endTime,
      },
      include: { project: { include: { client: true } }, task: true },
    });
    res.status(201).json(entry);
  })
);

const updateSchema = z.object({
  projectId: z.string().min(1).optional(),
  taskId: z.string().nullable().optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().nullable().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Time entry not found" });
    if (existing.userId !== req.user!.sub && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not your time entry" });
    }

    const data = updateSchema.parse(req.body);
    const effectiveProjectId = data.projectId ?? existing.projectId;
    if (data.projectId) await assertProjectAccess(req.user!.role, data.projectId);
    if (data.taskId) await assertTaskAccess(req.user!.sub, req.user!.role, data.taskId, effectiveProjectId);

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime === undefined ? existing.endTime : data.endTime === null ? null : new Date(data.endTime);
    if (endTime && endTime <= startTime) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }

    const entry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: {
        projectId: data.projectId,
        taskId: data.taskId === undefined ? undefined : data.taskId || null,
        description: data.description,
        startTime,
        endTime,
      },
      include: { project: { include: { client: true } }, task: true },
    });
    res.json(entry);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Time entry not found" });
    if (existing.userId !== req.user!.sub && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not your time entry" });
    }
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
