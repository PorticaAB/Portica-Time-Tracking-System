import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

// Admin: all projects. Contractors: only projects they're assigned to (active).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user!.role === "ADMIN") {
      const projects = await prisma.project.findMany({
        orderBy: { name: "asc" },
        include: {
          client: { select: { id: true, name: true } },
          tasks: { orderBy: { name: "asc" } },
          assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
      return res.json(projects);
    }

    const projects = await prisma.project.findMany({
      where: { isActive: true, assignments: { some: { userId: req.user!.sub } } },
      orderBy: { name: "asc" },
      include: {
        client: { select: { id: true, name: true } },
        tasks: { where: { isActive: true }, orderBy: { name: "asc" } },
      },
    });
    res.json(projects);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        tasks: true,
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (req.user!.role !== "ADMIN") {
      const assigned = project.assignments.some((a) => a.userId === req.user!.sub);
      if (!assigned) return res.status(403).json({ error: "Not assigned to this project" });
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
  assignedUserIds: z.array(z.string()).optional(),
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
        assignments: data.assignedUserIds
          ? { create: data.assignedUserIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: { client: true, assignments: { include: { user: true } } },
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

// --- Contractor assignments ---

const setAssignmentsSchema = z.object({ userIds: z.array(z.string()) });

router.put(
  "/:id/assignments",
  asyncHandler(async (req, res) => {
    const { userIds } = setAssignmentsSchema.parse(req.body);
    const projectId = req.params.id;

    await prisma.$transaction([
      prisma.projectAssignment.deleteMany({ where: { projectId } }),
      prisma.projectAssignment.createMany({
        data: userIds.map((userId) => ({ projectId, userId })),
        skipDuplicates: true,
      }),
    ]);

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(assignments);
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

export default router;
