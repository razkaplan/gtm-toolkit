// Claude AI Integration for Content Optimization

import axios from 'axios';
import { ContentAnalysis, CompetitorAnalysis, ContentGapAnalysis, SEOLintResult } from '../types';

interface ClaudeConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ContentBrief {
  topic: string;
  targetAudience: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  contentType: 'blog' | 'landing' | 'documentation' | 'social';
  tone: 'professional' | 'casual' | 'technical' | 'conversational';
  targetWordCount: number;
}

interface GeneratedContent {
  title: string;
  metaDescription: string;
  content: string;
  outline: string[];
  keywordOptimization: {
    primaryKeywordDensity: number;
    keywordPlacements: string[];
    relatedTerms: string[];
  };
  seoScore: number;
  suggestions: string[];
}

interface OptimizedContent {
  originalContent: string;
  optimizedContent: string;
  changes: {
    type: 'keyword-placement' | 'readability' | 'structure' | 'meta-tags';
    description: string;
    before: string;
    after: string;
  }[];
  improvementScore: number;
  seoImpact: string;
}

interface ContentAnalysisResult {
  seoScore: number;
  readabilityScore: number;
  keywordAnalysis: {
    primary: { keyword: string; density: number; count: number; }[];
    secondary: { keyword: string; density: number; count: number; }[];
  };
  structure: {
    headings: { level: number; text: string; wordCount: number; }[];
    paragraphs: number;
    averageSentenceLength: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: 'seo' | 'readability' | 'structure' | 'engagement';
    issue: string;
    solution: string;
  }[];
  competitorComparison?: {
    betterThan: number; // percentage
    gapsToFill: string[];
    strengths: string[];
  };
}

export class ClaudeContentOptimizer {
  private config: ClaudeConfig;
  private apiClient: any;

  constructor(config: ClaudeConfig) {
    this.config = {
      baseURL: 'https://api.anthropic.com/v1',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4000,
      temperature: 0.7,
      ...config
    };
    
    this.initializeClient();
  }

  private initializeClient() {
    this.apiClient = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
  }

  // Analyze content for SEO and readability
  async analyzeContent(content: string, options: {
    targetKeywords?: string[];
    competitorContent?: string[];
    targetAudience?: string;
  } = {}): Promise<ContentAnalysisResult> {
    const prompt = `
      As an expert SEO content analyst, analyze this content for optimization opportunities:
      
      CONTENT TO ANALYZE:
      ${content}
      
      TARGET KEYWORDS: ${options.targetKeywords?.join(', ') || 'Not specified'}
      TARGET AUDIENCE: ${options.targetAudience || 'General'}
      
      Provide a comprehensive analysis including:
      
      1. SEO SCORE (0-100) based on:
         - Keyword usage and density
         - Title optimization
         - Meta description quality
         - Header structure (H1, H2, H3)
         - Internal/external linking
         - Content length and depth
      
      2. READABILITY SCORE (0-100) based on:
         - Sentence length
         - Paragraph structure
         - Use of transitions
         - Active vs passive voice
         - Complexity of language
      
      3. KEYWORD ANALYSIS:
         - Primary keyword density and placement
         - Secondary keyword usage
         - Related terms and semantic keywords
         - Keyword stuffing risks
      
      4. CONTENT STRUCTURE:
         - Heading hierarchy and distribution
         - Paragraph count and length
         - Average sentence length
         - Scanability factors
      
      5. SPECIFIC RECOMMENDATIONS (prioritized):
         - High priority fixes for immediate SEO impact
         - Medium priority improvements for better engagement
         - Low priority enhancements for optimization
      
      ${options.competitorContent ? `
      6. COMPETITOR COMPARISON:
      Compare against these competitor contents and identify:
      - What we do better
      - Gaps we need to fill
      - Unique strengths to highlight
      
      COMPETITOR CONTENT:
      ${options.competitorContent.map((c, i) => `Competitor ${i + 1}: ${c.substring(0, 500)}...`).join('\n\n')}
      ` : ''}
      
      Return response as JSON with this exact structure:
      {
        "seoScore": number,
        "readabilityScore": number,
        "keywordAnalysis": {
          "primary": [{"keyword": string, "density": number, "count": number}],
          "secondary": [{"keyword": string, "density": number, "count": number}]
        },
        "structure": {
          "headings": [{"level": number, "text": string, "wordCount": number}],
          "paragraphs": number,
          "averageSentenceLength": number
        },
        "recommendations": [{
          "priority": "high|medium|low",
          "category": "seo|readability|structure|engagement",
          "issue": string,
          "solution": string
        }]
      }
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisText = response.data.content[0].text;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Claude response as JSON');
      }
    } catch (error) {
      console.error('Claude content analysis failed:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis(content, options.targetKeywords || []);
    }
  }

  // Generate SEO-optimized content
  async generateContent(brief: ContentBrief): Promise<GeneratedContent> {
    const prompt = `
      As an expert content creator and SEO specialist, generate high-quality, optimized content based on this brief:
      
      CONTENT BRIEF:
      - Topic: ${brief.topic}
      - Target Audience: ${brief.targetAudience}
      - Primary Keywords: ${brief.primaryKeywords.join(', ')}
      - Secondary Keywords: ${brief.secondaryKeywords.join(', ')}
      - Content Type: ${brief.contentType}
      - Tone: ${brief.tone}
      - Target Word Count: ${brief.targetWordCount}
      
      REQUIREMENTS:
      1. Create an SEO-optimized title (45-70 characters)
      2. Write a compelling meta description (120-160 characters)
      3. Generate comprehensive content that:
         - Uses primary keywords naturally (1-2% density)
         - Incorporates secondary keywords organically
         - Follows proper heading hierarchy (H2, H3)
         - Includes actionable insights
         - Maintains the specified tone
         - Reaches approximately the target word count
      
      4. Provide a detailed outline
      5. Optimize for:
         - Search engine visibility
         - User engagement
         - Readability (aim for 8th-grade level)
         - Conversion potential
      
      CONTENT STRUCTURE:
      - Introduction (hook + value proposition)
      - Main content sections with subheadings
      - Practical examples/case studies
      - Actionable takeaways
      - Compelling conclusion with CTA
      
      Return response as JSON:
      {
        "title": string,
        "metaDescription": string,
        "content": string,
        "outline": [string],
        "keywordOptimization": {
          "primaryKeywordDensity": number,
          "keywordPlacements": [string],
          "relatedTerms": [string]
        },
        "seoScore": number,
        "suggestions": [string]
      }
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: 4000,
        temperature: this.config.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const contentText = response.data.content[0].text;
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse generated content');
      }
    } catch (error) {
      console.error('Content generation failed:', error);
      return this.getFallbackContent(brief);
    }
  }

  // Optimize existing content
  async optimizeContent(content: string, targetKeywords: string[], options: {
    focusArea?: 'seo' | 'readability' | 'engagement' | 'conversion';
    preserveStyle?: boolean;
    competitorBenchmarks?: string[];
  } = {}): Promise<OptimizedContent> {
    const prompt = `
      As an expert content optimizer, improve this content for better performance:
      
      ORIGINAL CONTENT:
      ${content}
      
      TARGET KEYWORDS: ${targetKeywords.join(', ')}
      FOCUS AREA: ${options.focusArea || 'seo'}
      PRESERVE STYLE: ${options.preserveStyle ? 'Yes' : 'No'}
      
      OPTIMIZATION GOALS:
      1. Improve SEO without keyword stuffing
      2. Enhance readability and flow
      3. Strengthen engagement factors
      4. Maintain authenticity and value
      
      SPECIFIC OPTIMIZATIONS:
      - Natural keyword integration
      - Better heading structure
      - Improved meta elements
      - Enhanced internal linking opportunities
      - Stronger calls-to-action
      - Better paragraph breaks
      - More engaging transitions
      
      ${options.competitorBenchmarks ? `
      COMPETITOR BENCHMARKS:
      ${options.competitorBenchmarks.map((c, i) => `${i + 1}. ${c.substring(0, 300)}...`).join('\n')}
      
      Ensure our optimized content is competitive while maintaining uniqueness.
      ` : ''}
      
      Return detailed JSON response:
      {
        "originalContent": string,
        "optimizedContent": string,
        "changes": [{
          "type": "keyword-placement|readability|structure|meta-tags",
          "description": string,
          "before": string,
          "after": string
        }],
        "improvementScore": number,
        "seoImpact": string
      }
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: 4000,
        temperature: 0.3, // Lower temperature for optimization
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const optimizedText = response.data.content[0].text;
      const jsonMatch = optimizedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse optimization results');
      }
    } catch (error) {
      console.error('Content optimization failed:', error);
      return this.getFallbackOptimization(content, targetKeywords);
    }
  }

  // Analyze competitor content
  async analyzeCompetitor(url: string): Promise<CompetitorAnalysis> {
    // In a real implementation, you'd fetch the competitor's content
    // For now, we'll simulate this with a prompt
    
    const prompt = `
      Analyze this competitor URL for content strategy insights: ${url}
      
      Since I cannot directly access the URL, please provide a framework for analyzing competitor content that includes:
      
      1. Content themes and topics they focus on
      2. Keyword targeting strategies
      3. Content structure and format preferences
      4. Technical SEO implementation
      5. Content gaps we could exploit
      6. Unique value propositions
      
      Return as JSON:
      {
        "url": string,
        "title": string,
        "description": string,
        "keywords": [string],
        "contentTopics": [string],
        "technicalSEO": {
          "metaTags": {},
          "structuredData": [],
          "performance": {
            "loadTime": number,
            "coreWebVitals": {}
          }
        },
        "contentGaps": [string],
        "opportunities": [string]
      }
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: 2000,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisText = response.data.content[0].text;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse competitor analysis');
      }
    } catch (error) {
      console.error('Competitor analysis failed:', error);
      return this.getFallbackCompetitorAnalysis(url);
    }
  }

  // Find content gaps
  async findContentGaps(ownContent: string[], competitorAnalyses: CompetitorAnalysis[]): Promise<ContentGapAnalysis> {
    const prompt = `
      Analyze content gaps between our content and competitors:
      
      OUR CONTENT TOPICS:
      ${ownContent.map((content, i) => `${i + 1}. ${content.substring(0, 200)}...`).join('\n')}
      
      COMPETITOR ANALYSES:
      ${competitorAnalyses.map((comp, i) => `
      Competitor ${i + 1} (${comp.url}):
      - Topics: ${comp.contentTopics.join(', ')}
      - Keywords: ${comp.keywords.join(', ')}
      `).join('\n')}
      
      Identify:
      1. Topics competitors cover that we don't
      2. Keywords they rank for that we're missing
      3. Content formats they use effectively
      4. Opportunities for better/unique coverage
      
      Return JSON:
      {
        "missingTopics": [string],
        "competitorTopics": {"domain": [string]},
        "suggestedContent": [{
          "topic": string,
          "title": string,
          "outline": [string],
          "priority": "high|medium|low"
        }]
      }
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: 3000,
        temperature: 0.6,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const gapText = response.data.content[0].text;
      const jsonMatch = gapText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse content gap analysis');
      }
    } catch (error) {
      console.error('Content gap analysis failed:', error);
      return {
        missingTopics: [],
        competitorTopics: {},
        suggestedContent: []
      };
    }
  }

  // Generate schema markup
  async generateSchemaMarkup(content: string, contentType: 'article' | 'product' | 'service' | 'faq'): Promise<any> {
    const prompt = `
      Generate appropriate schema markup for this content:
      
      CONTENT:
      ${content.substring(0, 1000)}...
      
      CONTENT TYPE: ${contentType}
      
      Create structured data that includes:
      - Appropriate schema.org type
      - All relevant properties
      - Proper JSON-LD format
      - SEO-optimized descriptions
      
      Return valid JSON-LD schema markup.
    `;

    try {
      const response = await this.apiClient.post('/messages', {
        model: this.config.model,
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const schemaText = response.data.content[0].text;
      const jsonMatch = schemaText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return this.getFallbackSchema(contentType);
      }
    } catch (error) {
      console.error('Schema generation failed:', error);
      return this.getFallbackSchema(contentType);
    }
  }

  // Fallback methods for when API fails
  private getFallbackAnalysis(content: string, keywords: string[]): ContentAnalysisResult {
    const wordCount = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / sentences;
    
    return {
      seoScore: 65,
      readabilityScore: 70,
      keywordAnalysis: {
        primary: keywords.slice(0, 3).map(k => ({
          keyword: k,
          density: 1.2,
          count: Math.floor(wordCount * 0.012)
        })),
        secondary: keywords.slice(3, 6).map(k => ({
          keyword: k,
          density: 0.8,
          count: Math.floor(wordCount * 0.008)
        }))
      },
      structure: {
        headings: [],
        paragraphs: content.split('\n\n').length,
        averageSentenceLength: avgSentenceLength
      },
      recommendations: [
        {
          priority: 'high',
          category: 'seo',
          issue: 'Claude API unavailable',
          solution: 'Manual optimization recommended'
        }
      ]
    };
  }

  private getFallbackContent(brief: ContentBrief): GeneratedContent {
    return {
      title: `The Complete Guide to ${brief.topic}`,
      metaDescription: `Learn everything about ${brief.topic}. Expert insights, practical tips, and actionable strategies.`,
      content: `# ${brief.topic}\n\nContent generation requires Claude API access.`,
      outline: [
        'Introduction',
        'Key Concepts',
        'Best Practices',
        'Conclusion'
      ],
      keywordOptimization: {
        primaryKeywordDensity: 1.5,
        keywordPlacements: ['title', 'introduction', 'headings'],
        relatedTerms: brief.secondaryKeywords
      },
      seoScore: 60,
      suggestions: ['Enable Claude API for better optimization']
    };
  }

  private getFallbackOptimization(content: string, keywords: string[]): OptimizedContent {
    return {
      originalContent: content,
      optimizedContent: content,
      changes: [{
        type: 'keyword-placement',
        description: 'Claude API unavailable',
        before: 'Original content',
        after: 'Manual optimization needed'
      }],
      improvementScore: 0,
      seoImpact: 'Claude API required for optimization'
    };
  }

  private getFallbackCompetitorAnalysis(url: string): CompetitorAnalysis {
    return {
      url,
      title: 'Analysis unavailable',
      description: 'Claude API required',
      keywords: [],
      contentTopics: [],
      technicalSEO: {
        metaTags: {},
        structuredData: [],
        performance: {
          loadTime: 0,
          coreWebVitals: {}
        }
      },
      contentGaps: [],
      opportunities: []
    };
  }

  private getFallbackSchema(contentType: string): any {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'name': 'Content Title',
      'description': 'Content description'
    };

    switch (contentType) {
      case 'product':
        return { ...baseSchema, '@type': 'Product' };
      case 'service':
        return { ...baseSchema, '@type': 'Service' };
      case 'faq':
        return { ...baseSchema, '@type': 'FAQPage' };
      default:
        return baseSchema;
    }
  }
}

// Utility functions for Claude integration
export const claudeUtils = {
  // Validate Claude API key
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = axios.create({
        baseURL: 'https://api.anthropic.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });

      await client.post('/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });

      return true;
    } catch {
      return false;
    }
  },
  
  // Estimate token usage
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  },
  
  // Clean and format content for Claude
  prepareContentForClaude(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 100000); // Limit content size
  }
};
