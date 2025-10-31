// Keywords Research Tool with Google Search Console Integration

import { google, searchconsole_v1 } from 'googleapis';

export interface KeywordData {
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

export interface KeywordResearchConfig {
  gscCredentials?: {
    client_email: string;
    private_key: string;
    project_id: string;
  };
  siteUrl: string;
  aiAssistantKey?: string;
  serpApiKey?: string;
}

export class KeywordsResearchTool {
  private config: KeywordResearchConfig;
  private searchConsole?: searchconsole_v1.Resource$Searchanalytics;
  private initializationPromise?: Promise<void>;

  constructor(config: KeywordResearchConfig) {
    this.config = config;
    this.initializationPromise = this.initializeGSC();
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

      const client = await auth.getClient();
      const searchConsole = google.searchconsole({ version: 'v1', auth: client as any });
      this.searchConsole = searchConsole.searchanalytics;
      console.log('Google Search Console initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Search Console:', error);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = undefined;
    }
  }

  // Get current keyword performance from GSC
  async getCurrentKeywordPerformance(options: {
    startDate: string;
    endDate: string;
    dimensions?: ('query' | 'page' | 'country' | 'device')[];
    rowLimit?: number;
  }): Promise<GSCPerformanceData[]> {
    await this.ensureInitialized();
    if (!this.searchConsole) {
      throw new Error('Google Search Console not initialized');
    }

    try {
      const response = await this.searchConsole.query({
        siteUrl: this.config.siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions || ['query'],
          rowLimit: options.rowLimit || 1000,
          startRow: 0
        }
      });

      const rows = response.data.rows ?? [];
      return rows.map((row: searchconsole_v1.Schema$ApiDataRow) => ({
        query: row.keys?.[0] ?? '',
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
        date: options.endDate
      }));
    } catch (error) {
      console.error('Failed to fetch GSC data:', error);
      return [];
    }
  }

  // AI-powered keyword research helper (prompts + mock data)
  async researchKeywordsWithAI(topic: string, targetAudience: string): Promise<KeywordData[]> {
    if (!this.config.aiAssistantKey) {
      console.warn('AI assistant key not provided. Using fallback keyword suggestions.');
      return this.getFallbackKeywords(topic);
    }

    const contextualTopic = targetAudience
      ? `${topic} for ${targetAudience}`
      : topic;

    try {
      // Note: In real implementation, you'd make actual AI assistant call here using the prompt above.
      // For now, returning structured mock data that follows the pattern.
      return this.generateStructuredKeywords(contextualTopic);
    } catch (error) {
      console.error('Failed to research keywords with AI:', error);
      return this.getFallbackKeywords(contextualTopic);
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
      trend: ['rising', 'falling', 'stable'][Math.floor(Math.random() * 3)] as KeywordData['trend'],
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as KeywordData['competition'],
      relatedKeywords: baseKeywords.filter((_, i) => i !== index).slice(0, 3),
      searchIntent: ['informational', 'commercial', 'transactional', 'navigational'][Math.floor(Math.random() * 4)] as KeywordData['searchIntent']
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
    await this.ensureInitialized();
    if (!this.searchConsole) {
      throw new Error('Google Search Console not initialized');
    }

    const results: {
      keyword: string;
      rankings: { date: string; position: number; impressions: number; clicks: number; }[];
    }[] = [];
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const keyword of keywords) {
      try {
        const response = await this.searchConsole.query({
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

        const rows = response.data.rows ?? [];
        const rankings = rows.map((row: searchconsole_v1.Schema$ApiDataRow) => ({
          date: row.keys?.[0] ?? startDate,
          position: row.position ?? 0,
          impressions: row.impressions ?? 0,
          clicks: row.clicks ?? 0
        }));

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
    // This would typically use an AI assistant to generate the brief
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

export type KeywordResearchResult = KeywordData;

export interface ResearchKeywordsOptions {
  seedKeywords?: string[];
  topic?: string;
  targetAudience?: string;
  siteUrl?: string;
  gscCredentials?: KeywordResearchConfig['gscCredentials'];
  aiAssistantKey?: string;
  serpApiKey?: string;
}

export async function researchKeywords(
  topic: string,
  targetAudience: string,
  config?: Partial<KeywordResearchConfig>
): Promise<KeywordResearchResult[]>;
export async function researchKeywords(
  options: ResearchKeywordsOptions
): Promise<KeywordResearchResult[]>;
export async function researchKeywords(
  topicOrOptions: string | ResearchKeywordsOptions,
  targetAudience = 'developers and marketers',
  config: Partial<KeywordResearchConfig> = {}
): Promise<KeywordResearchResult[]> {
  if (typeof topicOrOptions === 'string') {
    const tool = new KeywordsResearchTool({
      siteUrl: config.siteUrl || 'https://example.com',
      gscCredentials: config.gscCredentials,
      aiAssistantKey: config.aiAssistantKey,
      serpApiKey: config.serpApiKey
    });

    return tool.researchKeywordsWithAI(topicOrOptions, targetAudience);
  }

  const {
    seedKeywords = [],
    topic,
    targetAudience: audience,
    siteUrl,
    gscCredentials,
    aiAssistantKey,
    serpApiKey
  } = topicOrOptions;

  const derivedTopic =
    topic || (seedKeywords.length > 0 ? seedKeywords.join(', ') : 'gtm as code strategy');
  const derivedAudience = audience || targetAudience;

  const tool = new KeywordsResearchTool({
    siteUrl: siteUrl || config.siteUrl || 'https://example.com',
    gscCredentials: gscCredentials || config.gscCredentials,
    aiAssistantKey: aiAssistantKey || config.aiAssistantKey,
    serpApiKey: serpApiKey || config.serpApiKey
  });

  return tool.researchKeywordsWithAI(derivedTopic, derivedAudience);
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
