import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIClient {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async generateKeywords(topic: string, audience: string): Promise<any[]> {
        const prompt = `Generate a list of 10 SEO keywords for the topic "${topic}" targeting "${audience}". 
    Return ONLY a JSON array of objects with the following structure:
    [
      {
        "keyword": "string",
        "searchVolume": number (estimate 100-10000),
        "difficulty": number (0-100),
        "cpc": number (estimate),
        "trend": "rising" | "falling" | "stable",
        "competition": "low" | "medium" | "high",
        "relatedKeywords": ["string", "string"],
        "searchIntent": "informational" | "commercial" | "transactional" | "navigational"
      }
    ]`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('AI Keyword Generation Failed:', error);
            return [];
        }
    }

    async analyzeContent(content: string): Promise<string> {
        const prompt = `Analyze the following content for SEO and readability. Provide concrete improvement suggestions.
    
    Content:
    ${content.slice(0, 2000)}... (truncated)
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('AI Content Analysis Failed:', error);
            return 'Analysis failed due to an error.';
        }
    }
}
