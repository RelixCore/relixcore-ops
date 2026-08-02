import ExcelJS from "exceljs";
import { Prisma, ActivityAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTeam } from "@/lib/roles";
import { dateKeyToRange, todayKey } from "@/lib/date";
import { ACTION_LABELS, ACTIONS_BY_CATEGORY, ActivityCategory, formatDetails } from "@/lib/activityLog";

const EXPORT_LIMIT = 20000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageTeam(user.roles)) {
    return new Response("Not authorized.", { status: 403 });
  }

  const url = new URL(request.url);
  const userIdFilter = url.searchParams.get("userId") || undefined;
  const categoryFilter = (url.searchParams.get("category") as ActivityCategory | null) || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const where: Prisma.ActivityLogWhereInput = {
    ...(userIdFilter ? { actorId: userIdFilter } : {}),
    ...(categoryFilter && ACTIONS_BY_CATEGORY[categoryFilter]
      ? { action: { in: ACTIONS_BY_CATEGORY[categoryFilter] } }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: dateKeyToRange(from).start } : {}),
            ...(to ? { lt: dateKeyToRange(to).end } : {}),
          },
        }
      : {}),
  };

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Activity Log");
  sheet.columns = [
    { header: "Time", key: "time", width: 22 },
    { header: "Team Member", key: "actor", width: 24 },
    { header: "Action", key: "action", width: 26 },
    { header: "Entity", key: "entity", width: 32 },
    { header: "Details", key: "details", width: 70 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const log of logs) {
    sheet.addRow({
      time: log.createdAt.toLocaleString(),
      actor: log.actorName,
      action: ACTION_LABELS[log.action as ActivityAction],
      entity: log.entityLabel ?? "",
      details: formatDetails(log.details),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="activity-log-${todayKey()}.xlsx"`,
    },
  });
}
