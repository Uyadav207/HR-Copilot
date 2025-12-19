# RAG-Based CV Parsing Implementation

## Overview
This implementation adds Retrieval-Augmented Generation (RAG) to CV parsing to prevent LLM hallucination. Every skill and experience claim must cite a specific CV chunk.

## Architecture

### Flow
1. **CV Upload** → Extract text from PDF
2. **Chunking** → Split CV into semantic sections (Experience, Education, Skills, etc.)
3. **Embedding** → Generate embeddings using OpenAI `text-embedding-3-small`
4. **Storage** → Store embeddings in Pinecone (namespace per candidate)
5. **Retrieval** → Retrieve relevant chunks when parsing
6. **RAG Parsing** → LLM extracts profile with mandatory chunk citations

### Components

#### 1. CV Chunking Service (`cvChunkingService.ts`)
- Intelligently chunks CV text by sections
- Handles overlap between chunks
- Extracts metadata (company, role, institution, etc.)

#### 2. Embedding Service (`embeddingService.ts`)
- Generates embeddings using OpenAI
- Supports batch processing
- Handles query embeddings for retrieval

#### 3. Vector Store Service (`vectorStoreService.ts`)
- Manages Pinecone operations
- Uses namespaces per candidate: `candidate-{candidateId}`
- Retrieves relevant chunks based on queries

#### 4. Enhanced LLM Client (`llmClient.ts`)
- New method: `parseCvToProfileWithRAG()`
- Requires chunk citations for all claims
- Validates citations in response

#### 5. Updated Candidate Service (`candidateService.ts`)
- Integrates RAG pipeline into CV parsing
- Graceful fallback if Pinecone unavailable
- Automatic chunk cleanup on candidate deletion

## Environment Variables

Required:
- `PINECONE_API_KEY` - Already configured ✅
- `OPENAI_API_KEY` - Required for embeddings

Optional:
- `PINECONE_INDEX_NAME` - Default: `cv-chunks`
- `EMBEDDING_MODEL` - Default: `text-embedding-3-small`
- `EMBEDDING_DIMENSION` - Default: `1536`

## Usage

The RAG pipeline is automatically used when parsing CVs. No API changes needed.

### Process Flow

```
POST /api/jobs/:jobId/candidates (upload CVs)
  ↓
Background: parseCvBackground()
  ↓
1. Chunk CV → 2. Embed → 3. Store in Pinecone
  ↓
4. Retrieve relevant chunks
  ↓
5. Parse with RAG (mandatory citations)
  ↓
6. Save profile with citations
```

## Features

### ✅ Citation Requirements
- Every skill must have: `chunkId`, `chunkIndex`, `chunkText`
- Every experience entry must have: `chunkCitations` array
- LLM cannot invent skills without CV evidence

### ✅ Graceful Degradation
- If Pinecone unavailable → Uses chunks directly
- If embedding fails → Falls back to regular parsing
- Logs warnings but continues processing

### ✅ Performance
- Batch embedding (100 chunks at a time)
- Async processing (non-blocking)
- Namespace isolation (fast queries per candidate)

## Database Schema

No schema changes required. Citations are stored in the existing `profile` JSONB field:

```json
{
  "skills": [
    {
      "skill": "Python",
      "proficiency": "expert",
      "evidence": "...",
      "chunkId": "chunk-2",
      "chunkIndex": 2,
      "chunkText": "Exact text from chunk..."
    }
  ],
  "experience": [
    {
      "company": "Acme Corp",
      "chunkCitations": ["chunk-2", "chunk-3"]
    }
  ]
}
```

## Testing

1. Upload a CV via the API
2. Check logs for chunking/embedding progress
3. Verify profile has citations for all skills
4. Check Pinecone dashboard for stored vectors

## Future Enhancements

- [ ] Track vector IDs for proper deletion
- [ ] Add chunk preview in UI
- [ ] Citation visualization
- [ ] Multi-query retrieval (separate queries for skills/experience)
- [ ] Chunk relevance scoring display

## Troubleshooting

### Pinecone Connection Issues
- Check `PINECONE_API_KEY` is set
- Verify index name exists in Pinecone
- Check Pinecone dashboard for namespace creation

### Embedding Failures
- Verify `OPENAI_API_KEY` is set
- Check API rate limits
- Review embedding model compatibility

### Missing Citations
- Check if chunks were retrieved successfully
- Verify RAG prompt is being used (check logs)
- Review chunk relevance scores
