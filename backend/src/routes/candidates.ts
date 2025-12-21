import { Hono } from "hono";
import { CandidateService } from "../services/candidateService.js";
import { toSnakeCaseResponse } from "../utils/transform.js";

const candidates = new Hono();
const candidateService = new CandidateService();

candidates.post("/jobs/:jobId/candidates", async (c) => {
  const jobId = c.req.param("jobId");
  const formData = await c.req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return c.json({ error: "No files provided" }, 400);
  }

  const fileData = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      return {
        filename: file.name,
        content: buffer,
      };
    })
  );

  const uploadedCandidates = await candidateService.uploadCandidates(jobId, fileData);

  // Queue CV parsing in background (non-blocking)
  // Use setTimeout to ensure candidates are committed to DB first
  uploadedCandidates.forEach((candidate) => {
    if (candidate.cvRawText && !candidate.cvRawText.startsWith("Error")) {
      // Run in background without awaiting, with a small delay to ensure DB commit
      setTimeout(() => {
        candidateService.parseCvBackground(candidate.id).catch((err) => {
          console.error(`❌ Background CV parsing failed for candidate ${candidate.id}:`, err);
          if (err instanceof Error) {
            console.error(`   Error message: ${err.message}`);
            console.error(`   Stack trace: ${err.stack}`);
          }
        });
      }, 100); // Small delay to ensure DB transaction is committed
      console.log(`📋 Queued CV parsing for candidate ${candidate.id}`);
    }
  });

  return c.json(toSnakeCaseResponse(uploadedCandidates), 201);
});

candidates.get("/jobs/:jobId/candidates", async (c) => {
  const jobId = c.req.param("jobId");
  const statusFilter = c.req.query("status_filter");
  const decisionFilter = c.req.query("decision_filter");

  const candidatesList = await candidateService.listCandidates(
    jobId,
    statusFilter || null,
    decisionFilter || null
  );
  return c.json(toSnakeCaseResponse(candidatesList));
});

candidates.get("/candidates/:id", async (c) => {
  const id = c.req.param("id");
  const candidate = await candidateService.getCandidate(id);
  if (!candidate) {
    return c.json({ error: "Candidate not found" }, 404);
  }
  return c.json(toSnakeCaseResponse(candidate));
});

candidates.post("/candidates/:id/parse", async (c) => {
  const id = c.req.param("id");
  const candidate = await candidateService.getCandidate(id);
  if (!candidate) {
    return c.json({ error: "Candidate not found" }, 404);
  }

  if (candidate.profile) {
    return c.json({
      message: "Candidate already parsed",
      candidate_id: id,
    });
  }

  await candidateService.parseCvBackground(id);
  const updated = await candidateService.getCandidate(id);
  return c.json({
    message: "CV parsing completed",
    candidate_id: id,
    has_profile: updated?.profile !== null,
  });
});

candidates.delete("/candidates/:id", async (c) => {
  const id = c.req.param("id");
  const success = await candidateService.deleteCandidate(id);
  if (!success) {
    return c.json({ error: "Candidate not found" }, 404);
  }
  return c.body(null, 204);
});

// Get all candidates with evaluations across all jobs
candidates.get("/candidates", async (c) => {
  const allCandidates = await candidateService.getAllCandidatesWithEvaluations();
  return c.json(toSnakeCaseResponse(allCandidates));
});

// Get PDF file for a candidate
candidates.get("/candidates/:id/pdf", async (c) => {
  const id = c.req.param("id");
  const candidate = await candidateService.getCandidate(id);
  
  if (!candidate) {
    return c.json({ error: "Candidate not found" }, 404);
  }

  // Check if PDF exists
  const pdfExists = await candidateService.pdfExists(id, candidate.cvFilename);
  if (!pdfExists) {
    return c.json({ error: "PDF file not found" }, 404);
  }

  // Get PDF file
  const pdfBuffer = await candidateService.getPDF(id, candidate.cvFilename);
  if (!pdfBuffer) {
    return c.json({ error: "Failed to retrieve PDF file" }, 500);
  }

  // Return PDF with proper headers
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${candidate.cvFilename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
});

export default candidates;
