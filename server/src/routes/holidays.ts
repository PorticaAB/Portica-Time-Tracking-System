import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { getSwedishHolidays } from "../lib/swedishHolidays";

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({ year: z.coerce.number().int().optional() });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { year } = listQuerySchema.parse(req.query);
    const holidays = await prisma.holiday.findMany({
      where: year
        ? { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }
        : undefined,
      orderBy: { date: "asc" },
    });
    res.json(holidays);
  })
);

router.use(requireRole("ADMIN"));

const createSchema = z.object({ date: z.string(), name: z.string().min(1) });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const holiday = await prisma.holiday.upsert({
      where: { date: new Date(data.date) },
      update: { name: data.name },
      create: { date: new Date(data.date), name: data.name },
    });
    res.status(201).json(holiday);
  })
);

const updateSchema = z.object({ date: z.string().optional(), name: z.string().min(1).optional() });

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const holiday = await prisma.holiday.update({
      where: { id: req.params.id },
      data: { name: data.name, date: data.date ? new Date(data.date) : undefined },
    });
    res.json(holiday);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// Sync computed Swedish public holidays for a given year (idempotent upsert).
const syncSchema = z.object({ year: z.coerce.number().int() });

router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const { year } = syncSchema.parse(req.body);
    const computed = getSwedishHolidays(year);

    const holidays = await prisma.$transaction(
      computed.map((h) =>
        prisma.holiday.upsert({
          where: { date: new Date(h.date) },
          update: { name: h.name },
          create: { date: new Date(h.date), name: h.name },
        })
      )
    );
    res.json(holidays);
  })
);

export default router;
