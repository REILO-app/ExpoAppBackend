const { GoogleGenAI } = require('@google/genai');

/**
 * Generates an email subject and body using Google Gemini 3.5 Flash.
 *
 * @param {Object} params
 * @param {string} params.model - 'gemini-3.5-flash'
 * @param {Object} params.referrer - Referrer details { name, title, company, notes }
 * @param {Object} params.job - Job details { role, company, jobId, location, jd, link }
 * @returns {Promise<{ subject: string, body: string }>}
 */
async function generateEmailDraft({ model, referrer, job }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please add it to your apps/api/.env file.');
  }

  // Initialize the Google Gen AI client with the server-side API Key
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a professional, helpful assistant who drafts polite, warm, and highly personalized job referral request emails.

Write a referral request email using the details below:

SENDER/CANDIDATE DETAILS:
- Name: [Your Name] (Use this exact placeholder "[Your Name]" in the body for the sender's name so the candidate can replace it later)

REFERRER DETAILS (the person being asked):
- Name: ${referrer.name}
${referrer.company ? `- Company: ${referrer.company}` : ''}
${referrer.title ? `- Role/Title: ${referrer.title}` : ''}
${referrer.notes ? `- Relationship / Connection Notes: ${referrer.notes}` : ''}

TARGET JOB DETAILS:
- Role / Title: ${job.role}
- Company: ${job.company}
${job.location ? `- Location: ${job.location}` : ''}
${job.jobId ? `- Job ID: ${job.jobId}` : ''}
${job.link ? `- Job URL: ${job.link}` : ''}
${job.jd ? `- Job Description:\n${job.jd}` : ''}

INSTRUCTIONS:
1. Compose a highly professional email requesting a job referral for this target job.
2. Tone: Adapt the tone based on the Relationship / Connection Notes. 
   - If the relationship note indicates they are close (e.g., family member like a father, a close friend, a former close colleague), make the tone warm, friendly, appreciative, but still clear about the job request.
   - If it's a professional connection or someone they haven't spoken to in a while, make it polite, respectful, clear, and professional.
3. Keep the email concise: write a polite opening, a brief paragraph explaining why the candidate is a good fit or interested in the role, a polite ask for the referral (mentioning the resume is attached/available), and a warm close.
4. Keep the subject line short, clear, and highly relevant.

Return the result as a JSON object matching this schema:
{
  "subject": "The subject line of the email",
  "body": "The full body of the email. Keep paragraphs separated by double newlines (\\n\\n)."
}`;

  try {
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            subject: { type: 'STRING' },
            body: { type: 'STRING' }
          },
          required: ['subject', 'body']
        }
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Failed to retrieve content from Gemini API response');
    }

    const parsed = JSON.parse(rawText.trim());
    if (parsed.subject && parsed.body) {
      return parsed;
    }
    throw new Error('JSON response from Gemini was missing subject or body fields');
  } catch (err) {
    console.error('Error generating content with GoogleGenAI:', err);
    throw err;
  }
}

module.exports = {
  generateEmailDraft
};
