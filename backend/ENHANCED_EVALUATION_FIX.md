# Enhanced Evaluation Data Fix

## Problem
The detailed evaluation sections (matching_strengths, missing_gaps, criteria_analysis, brutal_gap_analysis, etc.) were not being displayed because:
1. The database schema didn't have a field to store this enhanced data
2. The evaluation service wasn't saving the enhanced fields
3. The data wasn't being properly transformed for the frontend

## Solution

### 1. Database Schema Update
Added `enhanced_data` JSONB column to `evaluations` table to store all enhanced evaluation fields.

**To apply the migration:**
```bash
# Option 1: Run the SQL script directly
psql $DATABASE_URL -f backend/scripts/add-enhanced-data-column.sql

# Option 2: Use drizzle-kit (if module resolution works)
cd backend && bun run db:migrate
```

### 2. Evaluation Service Update
Updated `evaluationService.ts` to extract and store all enhanced evaluation fields in the `enhanced_data` column:
- `jd_requirements_analysis`
- `experience_analysis`
- `skills_comparison`
- `professional_experience_comparison`
- `resume_quality_issues`
- `portfolio_links`
- `detailed_comparison`
- `matching_strengths`
- `missing_gaps`
- `criteria_analysis`
- `brutal_gap_analysis`
- `overall_match_score`

### 3. Transform Function Update
Updated `transform.ts` to flatten `enhanced_data` fields to the top level of the response, so the frontend can access them directly as `evaluation.matching_strengths` instead of `evaluation.enhanced_data.matching_strengths`.

### 4. Prompt Update
Updated the enhanced RAG prompt to emphasize that ALL sections must be returned, even if some are empty.

## Testing

1. **Add the database column:**
   ```bash
   psql $DATABASE_URL -f backend/scripts/add-enhanced-data-column.sql
   ```

2. **Re-evaluate a candidate:**
   - Delete existing evaluation (if any)
   - Trigger a new evaluation
   - Check that all enhanced fields are populated

3. **Verify frontend display:**
   - Check that all sections appear:
     - Matching Strengths
     - Missing Gaps
     - Criteria Analysis (with sub-criteria)
     - Brutal Gap Analysis (with indirect experience)

## Files Changed

- `backend/src/models/evaluation.ts` - Added `enhancedData` field
- `backend/src/services/evaluationService.ts` - Extract and save enhanced fields
- `backend/src/utils/transform.ts` - Flatten enhanced_data for frontend
- `backend/src/prompts/v1/profile_to_evaluation_rag_enhanced.txt` - Emphasize all fields required
- `backend/scripts/add-enhanced-data-column.sql` - Migration script (new)

## Notes

- Existing evaluations won't have enhanced data until re-evaluated
- The transform function handles both `enhancedData` (camelCase) and `enhanced_data` (snake_case)
- All enhanced fields are optional - the frontend checks for their existence before rendering
