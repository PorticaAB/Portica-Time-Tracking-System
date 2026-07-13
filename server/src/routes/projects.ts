import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

// Clients/Projects are simple flat tags - every active team member can log
// time against any active project. Only premade Tasks within a project can
// be scoped to specific people (see the task assignment endpoints below).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === "ADMIN";
    const projects = await prisma.project.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: { name: "asc" },
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          where: isAdmin ? undefined : { isActive: true },
          orderBy: { name: "asc" },
          include: { assignments: { select: { userId: true } } },
        },
      },
    });

    if (isAdmin) return res.json(projects);

    // Non-admins only see tasks that are either open to everyone (no
    // assignments at all) or specifically assigned to them.
    const scoped = projects.map((p) => ({
      ...p,
      tasks: p.tasks.filter((t) => t.assignments.length === 0 || t.assignments.some((a) => a.userId === req.user!.sub)),
    }));
    res.json(scoped);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        tasks: { include: { assignments: { include: { user: { select: { id: true, name: true } } } } } },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (req.user!.role !== "ADMIN" && !project.isActive) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  })
);

router.use(requireRole("ADMIN"));

const createSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  billableRate: z.number().nonnegative().nullable().optional(),
  currency: z.string().min(1).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        billableRate: data.billableRate ?? null,
        currency: data.currency ?? "SEK",
      },
      include: { client: true },
    });
    res.status(201).json(project);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  billableRate: z.number().nonnegative().nullable().optional(),
  currency: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    res.json(project);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json(project);
  })
);

// --- Project-scoped premade tasks ---

const createTaskSchema = z.object({ name: z.string().min(1) });

router.post(
  "/:id/tasks",
  asyncHandler(async (req, res) => {
    const { name } = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({ data: { name, projectId: req.params.id } });
    res.status(201).json(task);
  })
);

const updateTaskSchema = z.object({ name: z.string().min(1).optional(), isActive: z.boolean().optional() });

router.patch(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const data = updateTaskSchema.parse(req.body);
    const task = await prisma.task.update({ where: { id: req.params.taskId }, data });
    res.json(task);
  })
);

router.delete(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.status(204).end();
  })
);

// --- Per-task team member assignment ---

const setTaskAssignmentsSchema = z.object({ userIds: z.array(z.string()) });

router.put(
  "/tasks/:taskId/assignments",
  asyncHandler(async (req, res) => {
    const { userIds } = setTaskAssignmentsSchema.parse(req.body);
    const taskId = req.params.taskId;

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId } }),
      prisma.taskAssignment.createMany({
        data: userIds.map((userId) => ({ taskId, userId })),
        skipDuplicates: true,
      }),
    ]);

    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(assignments);
  })
);

export default router;
