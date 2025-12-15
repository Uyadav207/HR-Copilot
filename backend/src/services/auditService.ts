import { eq, desc, asc, inArray } from "drizzle-orm";
import { db } from "../database.js";
import { auditLogs, type AuditLog } from "../models/auditLog.js";
import { candidates } from "../models/candidate.js";

export class AuditService {
  async getCandidateTimeline(candidateId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.candidateId, candidateId))
      .orderBy(asc(auditLogs.createdAt));
  }

  async getJobAuditLogs(jobId: string): Promise<AuditLog[]> {
    // Get all candidates for the job
    const jobCandidates = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.jobId, jobId));

    const candidateIds = jobCandidates.map((c) => c.id);

    if (candidateIds.length === 0) {
      return [];
    }

    // Get all audit logs for these candidates
    return await db
      .select()
      .from(auditLogs)
      .where(inArray(auditLogs.candidateId, candidateIds))
      .orderBy(desc(auditLogs.createdAt));
  }
}
