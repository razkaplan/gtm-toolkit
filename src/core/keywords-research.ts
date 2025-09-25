// Keywords Research Tool with Google Search Console Integration

import axios from 'axios';
import { google } from 'googleapis';

interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  trend: 'rising' | 'falling' | 'stable';
  competition: 'low' | 'medium' | 'high';
  relatedKeywords: string[];
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

interface GSCPerformanceData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

interface CompetitorKeywords {
  domain: string;
  keywords: KeywordData[];
  organicKeywords: number;
  totalTraffic: number;
}

interface KeywordResearchConfig {
  gscCredentials?: {
    client_email: string;
    private_key: string;
    project_id: string;
  };
  siteUrl: string;
  claudeApiKey?: string;
  serpApiKey?: string;
}

export class KeywordsResearchTool {
  private config: KeywordResearchConfig;
  private gscClient?: any;
  private searchConsole?: any;

  constructor(config: KeywordResearchConfig) {
    this.config = config;
    this.initializeGSC();
  }

  private async initializeGSC() {
    if (!this.config.gscCredentials) {
      console.warn('Google Search Console credentials not provided. GSC features disabled.');
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: this.config.gscCredentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      });

      this.gscClient = await auth.getClient();
      this.searchConsole = google.searchconsole({ version: 'v1', auth: this.gscClient });
      console.log('Google Search Console initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Search Console:', error);
    }
  }

  // Get current keyword performance from GSC
  async getCurrentKeywordPerformance(options: {
    startDate: string;
    endDate: string;
    dimensions?: ('query' | 'page' | 'country' | 'device')[];
    rowLimit?: number;
  }): Promise<GSCPerformanceData[]> {
    if (!this.searchConsole) {
      throw new Error('Google Search Console not initialized');
    }

    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.config.siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions || ['query'],
          rowLimit: options.rowLimit || 1000,
          startRow: 0
        }
      });

      return response.data.rows?.map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        date: options.endDate
      })) || [];
    } catch (error) {
      console.error('Failed to fetch GSC data:', error);
      return [];
    }
  }

  // AI-powered keyword research using Claude
  async researchKeywordsWithAI(topic: string, targetAudience: string): Promise<KeywordData[]> {
    if (!this.config.claudeApiKey) {
      console.warn('Claude API key not provided. Using fallback keyword suggestions.');
      return this.getFallbackKeywords(topic);
    }

    try {
      const prompt = `
        Act as an expert SEO keyword researcher. Generate a comprehensive list of keywords for the topic: "${topic}"
        Target audience: ${targetAudience}
        
        For each keyword, provide:
        1. Search volume estimate (realistic numbers)
        2. Keyword difficulty (0-100 scale)
        3. Search intent (informational, commercial, transactional, navigational)
        4. Related keywords
        5. Competition level (low, medium, high)
        
        Focus on:
        - Long-tail keywords (3+ words)
        - Question-based keywords
        - Comparison keywords
        - Solution-oriented keywords
        - Technical terms relevant to developers/marketers
        
        Return as JSON array with this structure:
        {
          "keyword": "string",
          "searchVolume": number,
          "difficulty": number,
          "searchIntent": "informational|commercial|transactional|navigational",
          "competition": "low|medium|high",
          "relatedKeywords": ["string"]
        }
        
        Generate 20-30 high-quality keywords.
      `;

      // Note: In real implementation, you'd make actual Claude API call here
      // For now, returning structured mock data that follows the pattern
      return this.generateStructuredKeywords(topic);
    } catch (error) {
      console.error('Failed to research keywords with AI:', error);
      return this.getFallbackKeywords(topic);
    }
  }

  // Generate seed keywords from content
  async extractKeywordsFromContent(content: string): Promise<string[]> {
    // Simple keyword extraction - in production you'd use NLP libraries
    const words = content.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get most frequent words
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  // Find content gaps by analyzing competitors
  async findContentGaps(competitorUrls: string[]): Promise<{
    missingKeywords: KeywordData[];
    opportunityKeywords: KeywordData[];
    competitorAnalysis: CompetitorKeywords[];
  }> {
    const competitorAnalysis: CompetitorKeywords[] = [];
    
    // Analyze each competitor
    for (const url of competitorUrls) {
      try {
        const keywords = await this.analyzeCompetitorKeywords(url);
        competitorAnalysis.push({
          domain: new URL(url).hostname,
          keywords,
          organicKeywords: keywords.length,
          totalTraffic: keywords.reduce((sum, k) => sum + k.searchVolume, 0)
        });
      } catch (error) {
        console.error(`Failed to analyze competitor ${url}:`, error);
      }
    }

    // Find keywords that competitors rank for but we don't
    const currentKeywords = await this.getCurrentKeywordPerformance({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    
    const ourKeywords = new Set(currentKeywords.map(k => k.query));
    
    const allCompetitorKeywords = competitorAnalysis
      .flatMap(c => c.keywords)
      .filter(k => !ourKeywords.has(k.keyword));
    
    const missingKeywords = allCompetitorKeywords
      .filter(k => k.difficulty < 60) // Focus on achievable keywords
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 20);
      
    const opportunityKeywords = allCompetitorKeywords
      .filter(k => k.difficulty < 40 && k.searchVolume > 100)
      .sort((a, b) => (b.searchVolume / b.difficulty) - (a.searchVolume / a.difficulty))
      .slice(0, 15);

    return {
      missingKeywords,
      opportunityKeywords,
      competitorAnalysis
    };
  }

  // Analyze competitor keywords (simplified version)
  private async analyzeCompetitorKeywords(url: string): Promise<KeywordData[]> {
    // In production, this would use tools like Ahrefs, SEMrush, or custom scraping
    // For now, returning structured mock data
    const domain = new URL(url).hostname;
    
    return [
      {
        keyword: `${domain.replace(/\./g, ' ')} alternative`,
        searchVolume: 1200,
        difficulty: 35,
        cpc: 2.50,
        trend: 'rising',
        competition: 'medium',
        relatedKeywords: ['alternative to', 'vs comparison', 'competitor'],
        searchIntent: 'commercial'
      },
      {
        keyword: `how to use ${domain.split('.')[0]}`,
        searchVolume: 800,
        difficulty: 25,
        cpc: 1.20,
        trend: 'stable',
        competition: 'low',
        relatedKeywords: ['tutorial', 'guide', 'getting started'],
        searchIntent: 'informational'
      }
      // Add more realistic competitor keywords...
    ];
  }

  // Generate keyword suggestions based on topic
  private generateStructuredKeywords(topic: string): KeywordData[] {
    const baseKeywords = [
      `${topic}`,
      `${topic} tutorial`,
      `${topic} guide`,
      `${topic} best practices`,
      `how to ${topic}`,
      `${topic} vs`,
      `${topic} examples`,
      `${topic} tools`,
      `${topic} for beginners`,
      `${topic} automation`,
      `${topic} strategy`,
      `${topic} optimization`,
      `${topic} integration`,
      `${topic} api`,
      `${topic} documentation`
    ];

    return baseKeywords.map((keyword, index) => ({
      keyword,
      searchVolume: Math.floor(Math.random() * 5000) + 100,
      difficulty: Math.floor(Math.random() * 80) + 10,
      cpc: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      trend: ['rising', 'falling', 'stable'][Math.floor(Math.random() * 3)] as 'rising' | 'falling' | 'stable',
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      relatedKeywords: baseKeywords.filter((_, i) => i !== index).slice(0, 3),
      searchIntent: ['informational', 'commercial', 'transactional', 'navigational'][Math.floor(Math.random() * 4)] as any
    }));
  }

  private getFallbackKeywords(topic: string): KeywordData[] {
    return this.generateStructuredKeywords(topic);
  }

  // Keyword opportunity score
  calculateKeywordScore(keyword: KeywordData): number {
    const volumeScore = Math.min(keyword.searchVolume / 1000, 10);
    const difficultyScore = (100 - keyword.difficulty) / 10;
    const intentScore = {
      'commercial': 10,
      'transactional': 9,
      'informational': 7,
      'navigational': 5
    }[keyword.searchIntent] || 5;
    
    return Math.round((volumeScore + difficultyScore + intentScore) / 3 * 10) / 10;
  }

  // Track keyword rankings over time
  async trackKeywordRankings(keywords: string[], days: number = 30): Promise<{
    keyword: string;
    rankings: { date: string; position: number; impressions: number; clicks: number; }[];
  }[]> {
    if (!this.searchConsole) {
      throw new Error('Google Search Console not initialized');
    }

    const results = [];
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const keyword of keywords) {
      try {
        const response = await this.searchConsole.searchanalytics.query({
          siteUrl: this.config.siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['date'],
            dimensionFilterGroups: [{
              filters: [{
                dimension: 'query',
                operator: 'equals',
                expression: keyword
              }]
            }]
          }
        });

        const rankings = response.data.rows?.map((row: any) => ({
          date: row.keys[0],
          position: row.position,
          impressions: row.impressions,
          clicks: row.clicks
        })) || [];

        results.push({ keyword, rankings });
      } catch (error) {
        console.error(`Failed to track keyword "${keyword}":`, error);
        results.push({ keyword, rankings: [] });
      }
    }

    return results;
  }

  // Generate keyword-optimized content brief
  async generateContentBrief(primaryKeyword: string, relatedKeywords: string[]): Promise<{
    title: string;
    metaDescription: string;
    outline: string[];
    targetWordCount: number;
    keywordDensity: Record<string, number>;
    internalLinkOpportunities: string[];
  }> {
    // This would typically use Claude AI to generate the brief
    // For now, returning a structured template
    
    return {
      title: `Complete Guide to ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} (2025)`,
      metaDescription: `Learn everything about ${primaryKeyword}. Step-by-step guide with examples, best practices, and tools for ${relatedKeywords.slice(0, 2).join(' and ')}.`,
      outline: [
        `What is ${primaryKeyword}?`,
        `Why ${primaryKeyword} matters in 2025`,
        `How to get started with ${primaryKeyword}`,
        `Best practices for ${primaryKeyword}`,
        `Common mistakes to avoid`,
        `Tools and resources`,
        `Conclusion and next steps`
      ],
      targetWordCount: 2500,
      keywordDensity: {
        [primaryKeyword]: 1.5,
        ...relatedKeywords.slice(0, 3).reduce((acc, keyword) => {
          acc[keyword] = 0.8;
          return acc;
        }, {} as Record<string, number>)
      },
      internalLinkOpportunities: [
        `/blog/related-${primaryKeyword.replace(/\s+/g, '-')}-post`,
        `/services/${primaryKeyword.split(' ')[0]}`,
        `/resources/${primaryKeyword.replace(/\s+/g, '-')}-tools`
      ]
    };
  }
}

// Utility functions for keyword analysis
export const keywordUtils = {
  // Calculate keyword similarity
  calculateSimilarity(keyword1: string, keyword2: string): number {
    const words1 = keyword1.toLowerCase().split(' ');
    const words2 = keyword2.toLowerCase().split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  },
  
  // Group related keywords
  groupKeywords(keywords: KeywordData[]): Record<string, KeywordData[]> {
    const groups: Record<string, KeywordData[]> = {};
    
    keywords.forEach(keyword => {
      const rootKeyword = keyword.keyword.split(' ').slice(0, 2).join(' ');
      if (!groups[rootKeyword]) {
        groups[rootKeyword] = [];
      }
      groups[rootKeyword].push(keyword);
    });
    
    return groups;
  },
  
  // Find long-tail opportunities
  findLongTailOpportunities(keywords: KeywordData[]): KeywordData[] {
    return keywords
      .filter(k => k.keyword.split(' ').length >= 3)
      .filter(k => k.difficulty < 40)
      .filter(k => k.searchVolume > 50)
      .sort((a, b) => (b.searchVolume / b.difficulty) - (a.searchVolume / a.difficulty));
  }
};
