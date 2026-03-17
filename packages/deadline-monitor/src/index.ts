/**
 * Deadline Monitor
 *
 * Watches for approaching deadlines (claim, opt-out, objection)
 * and triggers notifications via email, SMS, and in-app alerts.
 */

import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  deadlines,
  cases,
  possibleMatches,
  userProfiles,
  notifications,
} from "@class-action-os/db";
import nodemailer from "nodemailer";

export interface DeadlineAlert {
  caseId: string;
  caseName: string;
  deadlineType: string;
  deadlineDate: string;
  daysRemaining: number;
  claimUrl: string | null;
  userId: string;
  userEmail: string;
}

/**
 * Check all deadlines approaching within the given window
 * and generate notifications for matched users.
 */
export async function checkDeadlines(withinDays = 14): Promise<DeadlineAlert[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Find approaching deadlines that haven't been notified yet
  const approaching = await db
    .select()
    .from(deadlines)
    .where(
      and(
        gte(deadlines.date, today),
        lte(deadlines.date, futureDate),
        eq(deadlines.notified, false)
      )
    );

  const alerts: DeadlineAlert[] = [];

  for (const deadline of approaching) {
    // Get the parent case
    const [caseRecord] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, deadline.caseId))
      .limit(1);

    if (!caseRecord) continue;

    // Find all users matched to this case
    const matches = await db
      .select()
      .from(possibleMatches)
      .where(
        and(
          eq(possibleMatches.caseId, deadline.caseId),
          eq(possibleMatches.dismissed, false)
        )
      );

    for (const match of matches) {
      const [user] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, match.userId))
        .limit(1);

      if (!user) continue;

      const emails = (user.emailAddresses as string[]) ?? [];
      const primaryEmail = emails[0] ?? "";

      const daysRemaining = Math.ceil(
        (new Date(deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const alert: DeadlineAlert = {
        caseId: caseRecord.id,
        caseName: caseRecord.caseName,
        deadlineType: deadline.type,
        deadlineDate: deadline.date,
        daysRemaining,
        claimUrl: caseRecord.claimUrl,
        userId: user.id,
        userEmail: primaryEmail,
      };

      alerts.push(alert);

      // Create in-app notification
      await db.insert(notifications).values({
        userId: user.id,
        type: "deadline_reminder",
        title: `⏰ ${deadline.type.toUpperCase()} deadline in ${daysRemaining} days`,
        body: `"${caseRecord.caseName}" has a ${deadline.type} deadline on ${deadline.date}.${caseRecord.claimUrl ? ` File here: ${caseRecord.claimUrl}` : ""}`,
        caseId: caseRecord.id,
        sentVia: ["in_app"],
      });
    }

    // Mark deadline as notified
    await db
      .update(deadlines)
      .set({ notified: true })
      .where(eq(deadlines.id, deadline.id));
  }

  return alerts;
}

/**
 * Send email notifications for deadline alerts.
 */
export async function sendEmailAlerts(alerts: DeadlineAlert[]): Promise<number> {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.warn("SMTP not configured — skipping email alerts");
    return 0;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let sent = 0;

  for (const alert of alerts) {
    if (!alert.userEmail) continue;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "alerts@classactionos.dev",
        to: alert.userEmail,
        subject: `[ClassActionOS] ${alert.deadlineType} deadline: ${alert.caseName} (${alert.daysRemaining} days)`,
        html: `
          <h2>Deadline Approaching</h2>
          <p><strong>Case:</strong> ${alert.caseName}</p>
          <p><strong>Deadline:</strong> ${alert.deadlineDate} (${alert.daysRemaining} days remaining)</p>
          <p><strong>Type:</strong> ${alert.deadlineType}</p>
          ${alert.claimUrl ? `<p><a href="${alert.claimUrl}">File your claim here</a></p>` : ""}
          <hr>
          <p style="color: #666; font-size: 12px">This is an automated alert from ClassActionOS. 
          Verify all deadlines independently before filing.</p>
        `,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send email to ${alert.userEmail}:`, err);
    }
  }

  return sent;
}

/**
 * Full deadline check + notification cycle.
 * Call this from a daily cron job.
 */
export async function runDeadlineCheck(): Promise<{
  alertsGenerated: number;
  emailsSent: number;
}> {
  // Check 3 day, 7 day, and 14 day windows
  const alerts3 = await checkDeadlines(3);
  const alerts7 = await checkDeadlines(7);
  const alerts14 = await checkDeadlines(14);

  const allAlerts = [...alerts3, ...alerts7, ...alerts14];

  // De-duplicate by case + user
  const seen = new Set<string>();
  const unique = allAlerts.filter((a) => {
    const key = `${a.caseId}:${a.userId}:${a.deadlineType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const emailsSent = await sendEmailAlerts(unique);

  return { alertsGenerated: unique.length, emailsSent };
}
