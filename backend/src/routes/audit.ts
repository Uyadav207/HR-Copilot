import { Hono } from "hono";
import { AuditService } from "../services/auditService.js";
import { toSnakeCaseResponse } from "../utils/transform.js";

const audit = new Hono();
const auditService = new AuditService();

audit.get("/candidates/:candidateId/timeline", async (c) => {
  const candidateId = c.req.param("candidateId");
  const logs = await auditService.getCandidateTimeline(candidateId);
  return c.json(toSnakeCaseResponse(logs));
});

audit.get("/jobs/:jobId/audit-logs", async (c) => {
  const jobId = c.req.param("jobId");
  const logs = await auditService.getJobAuditLogs(jobId);
  return c.json(toSnakeCaseResponse(logs));
});

export default audit;
