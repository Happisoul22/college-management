const asyncHandler = require('../middleware/async');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// @desc    Generate AI description for an achievement title
// @route   POST /api/ai/describe
// @access  Private
exports.generateDescription = asyncHandler(async (req, res) => {
    const { title, type, organization, domain } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return res.status(503).json({
            success: false,
            error: 'AI service not configured. Please add your GEMINI_API_KEY to the backend .env file.'
        });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const contextLines = [
        type && `Achievement Type: ${type}`,
        organization && `Organization/Company: ${organization}`,
        domain && `Domain/Area: ${domain}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are an academic achievement description writer for a college student portal.
Write a concise, professional, first-person description (3–4 sentences) for the following achievement:

Title: ${title}
${contextLines}

Guidelines:
- Write in first person ("I worked on...", "I gained...")
- Mention skills learned, technologies used, or outcomes achieved
- Keep it factual and professional (no exaggeration)
- Do NOT include generic filler sentences
- Output ONLY the description text, no headings or bullets`;

    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();

    res.status(200).json({ success: true, description });
});

// @desc    Generate AI insight for a specific achievement
// @route   POST /api/ai/achievement-insight
// @access  Private
exports.generateAchievementInsight = asyncHandler(async (req, res) => {
    const { achievement } = req.body;

    if (!achievement || !achievement.title) {
        return res.status(400).json({ success: false, error: 'Achievement data is required' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return res.status(503).json({
            success: false,
            error: 'AI service not configured. Please add your GEMINI_API_KEY to the backend .env file.'
        });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const { title, type, organization, domain, description,
        startDate, endDate, weeks, score, nptelCourseType,
        nptelDuration, instructor, projectRole, contribution,
        year, semester, status } = achievement;

    const contextLines = [
        `Achievement Type: ${type}`,
        title && `Title: ${title}`,
        organization && `Organization/Issuer: ${organization}`,
        domain && `Domain/Subject: ${domain}`,
        description && `Student Description: ${description}`,
        startDate && `Start Date: ${new Date(startDate).toLocaleDateString('en-IN')}`,
        endDate && `End Date: ${new Date(endDate).toLocaleDateString('en-IN')}`,
        weeks && `Duration: ${weeks} weeks`,
        score && `Score/Percentage: ${score}%`,
        nptelCourseType && `NPTEL Course Type: ${nptelCourseType}`,
        nptelDuration && `NPTEL Duration: ${nptelDuration}`,
        instructor && `Instructor: ${instructor}`,
        projectRole && `Role in Project: ${projectRole}`,
        contribution && `Contribution: ${contribution}`,
        year && `Academic Year: Year ${year}${semester ? ', Semester ' + semester : ''}`,
        status && `Approval Status: ${status}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are an academic achievement analyst for a college student portal.
Based on the following achievement details, generate a structured insight in JSON format.

${contextLines}

Return ONLY a valid JSON object with exactly these four fields (no markdown, no code fences):
{
  "purpose": "1-2 sentences explaining what this achievement is and why it matters",
  "timeline": "1 sentence describing when it was done and how long it lasted",
  "learnings": "2-3 sentences describing the key skills, knowledge, or technologies the student gained",
  "significance": "1-2 sentences on the career/academic significance of this achievement"
}`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    // Strip any accidental markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    let insight;
    try {
        insight = JSON.parse(raw);
    } catch {
        // Fallback: return the raw text as purpose
        insight = { purpose: raw, timeline: '', learnings: '', significance: '' };
    }

    res.status(200).json({ success: true, insight });
});
