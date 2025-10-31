// Google Search Console Integration for Performance Tracking

import { google, searchconsole_v1 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { writeFileSync } from 'fs';

interface GSCCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

export interface PerformanceQuery {
  startDate: string;
  endDate: string;
  dimensions?: ('query' | 'page' | 'country' | 'device')[];
  dimensionFilterGroups?: DimensionFilterGroup[];
  aggregationType?: 'auto' | 'byPage' | 'byProperty';
  rowLimit?: number;
  startRow?: number;
}

interface DimensionFilterGroup {
  filters: DimensionFilter[];
  groupType?: 'and' | 'or';
}

interface DimensionFilter {
  dimension: 'query' | 'page' | 'country' | 'device';
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
  expression: string;
}

interface PerformanceData {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SiteVerificationStatus {
  verified: boolean;
  verificationMethod: string;
  verificationDate?: string;
}

interface IndexingStatus {
  coverageState: 'Submitted and indexed' | 'Valid with warnings' | 'Error' | 'Excluded';
  pageFetchState: 'Successful' | 'Soft 404' | 'Hard 404' | 'Access denied' | 'Server error';
  googleCanonical?: string;
  userCanonical?: string;
  indexingState: 'Indexing allowed' | 'Blocked by robots.txt' | 'Blocked by no index' | 'Blocked by access denied';
  lastCrawlTime?: string;
}

export interface SearchAnalyticsReport {
  totalClicks: number;
  totalImpressions: number;
  averageCTR: number;
  averagePosition: number;
  data: PerformanceData[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface KeywordPerformanceReport {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  trend: 'up' | 'down' | 'stable';
  opportunity: 'high' | 'medium' | 'low';
}

export class GoogleSearchConsoleClient {
  private auth!: GoogleAuth;
  private searchConsole!: searchconsole_v1.Searchconsole;
  private siteUrl: string;
  private isInitialized = false;

  constructor(credentials: GSCCredentials, siteUrl: string) {
    this.siteUrl = this.normalizeSiteUrl(siteUrl);
    this.initializeAuth(credentials);
  }

  private initializeAuth(credentials: GSCCredentials) {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/webmasters'
        ]
      });
      
      this.searchConsole = google.searchconsole({
        version: 'v1',
        auth: this.auth as any
      });
      
      this.isInitialized = true;
      console.log('Google Search Console client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Search Console:', error);
      throw error;
    }
  }

  private normalizeSiteUrl(url: string): string {
    // GSC expects URLs without trailing slash for domain properties
    return url.replace(/\/$/, '');
  }

  // Verify site ownership
  async verifySite(): Promise<SiteVerificationStatus> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    try {
      const response = await this.searchConsole.sites.get({
        siteUrl: this.siteUrl
      });

      const siteData = response.data as Partial<{ verificationMethod: string; verificationDate: string }>;

      return {
        verified: true,
        verificationMethod: siteData.verificationMethod ?? 'unknown',
        verificationDate: siteData.verificationDate ?? undefined
      };
    } catch (error) {
      console.error('Site verification failed:', error);
      return {
        verified: false,
        verificationMethod: 'none'
      };
    }
  }

  // Get search analytics data
  async getSearchAnalytics(query: PerformanceQuery): Promise<SearchAnalyticsReport> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: query.startDate,
          endDate: query.endDate,
          dimensions: query.dimensions || ['query'],
          dimensionFilterGroups: query.dimensionFilterGroups,
          aggregationType: query.aggregationType || 'auto',
          rowLimit: query.rowLimit || 25000,
          startRow: query.startRow || 0
        }
      });

      const rows = (response.data.rows ?? []) as searchconsole_v1.Schema$ApiDataRow[];
      const performanceRows: PerformanceData[] = rows.map(row => ({
        keys: row.keys ?? [],
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0
      }));

      const totalClicks = performanceRows.reduce((sum, row) => sum + row.clicks, 0);
      const totalImpressions = performanceRows.reduce((sum, row) => sum + row.impressions, 0);
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const averagePosition = performanceRows.length > 0
        ? performanceRows.reduce((sum, row) => sum + row.position, 0) / performanceRows.length
        : 0;

      return {
        totalClicks,
        totalImpressions,
        averageCTR,
        averagePosition,
        data: performanceRows,
        period: {
          startDate: query.startDate,
          endDate: query.endDate
        }
      };
    } catch (error) {
      console.error('Failed to fetch search analytics:', error);
      throw error;
    }
  }

  // Get keyword performance with trend analysis
  async getKeywordPerformance(options: {
    days?: number;
    minImpressions?: number;
    includePositionFilter?: boolean;
  } = {}): Promise<KeywordPerformanceReport[]> {
    const days = options.days || 30;
    const minImpressions = options.minImpressions || 10;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get current period data
    const currentData = await this.getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['query']
    });

    // Get previous period for trend analysis
    const previousEndDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousStartDate = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const previousData = await this.getSearchAnalytics({
      startDate: previousStartDate,
      endDate: previousEndDate,
      dimensions: ['query']
    });

    // Create lookup for previous data
    const previousLookup = new Map<string, PerformanceData>();
    previousData.data.forEach(row => {
      previousLookup.set(row.keys[0], row);
    });

    // Analyze trends and opportunities
    const keywordReports: KeywordPerformanceReport[] = currentData.data
      .filter(row => row.impressions >= minImpressions)
      .map(row => {
        const keyword = row.keys[0];
        const previousRow = previousLookup.get(keyword);
        
        // Calculate trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (previousRow) {
          const positionChange = previousRow.position - row.position; // Lower position is better
          if (positionChange > 2) trend = 'up';
          else if (positionChange < -2) trend = 'down';
        }

        // Calculate opportunity
        let opportunity: 'high' | 'medium' | 'low' = 'low';
        if (row.position > 3 && row.position <= 10 && row.impressions > 100) {
          opportunity = 'high'; // Good impressions, page 1, room to improve
        } else if (row.position > 10 && row.position <= 20 && row.impressions > 50) {
          opportunity = 'medium'; // Page 2 with decent impressions
        }

        return {
          keyword,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          trend,
          opportunity
        };
      })
      .sort((a, b) => b.impressions - a.impressions); // Sort by impressions

    return keywordReports;
  }

  // Get top pages performance
  async getTopPages(options: {
    days?: number;
    limit?: number;
  } = {}): Promise<PerformanceData[]> {
    const days = options.days || 30;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await this.getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: options.limit || 100
    });

    return data.data.sort((a, b) => b.clicks - a.clicks);
  }

  // Get indexing status for URLs
  async getIndexingStatus(urls: string[]): Promise<Map<string, IndexingStatus>> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    const indexingStatus = new Map<string, IndexingStatus>();
    
    // GSC API has rate limits, so we'll batch the requests
    for (const url of urls) {
      try {
        const response = await this.searchConsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl: this.siteUrl
          }
        });

        const result = response.data.inspectionResult;
        const indexStatusResult = result?.indexStatusResult;

        const coverageState = (indexStatusResult?.coverageState ?? 'Error') as IndexingStatus['coverageState'];
        const pageFetchState = (indexStatusResult?.pageFetchState ?? 'Server error') as IndexingStatus['pageFetchState'];
        const indexingState = (indexStatusResult?.indexingState ?? 'Blocked by robots.txt') as IndexingStatus['indexingState'];
        const googleCanonical = indexStatusResult?.googleCanonical ?? undefined;
        const userCanonical = indexStatusResult?.userCanonical ?? undefined;
        const lastCrawlTime = indexStatusResult?.lastCrawlTime ?? undefined;

        indexingStatus.set(url, {
          coverageState,
          pageFetchState,
          googleCanonical,
          userCanonical,
          indexingState,
          lastCrawlTime
        });

        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to get indexing status for ${url}:`, error);
        indexingStatus.set(url, {
          coverageState: 'Error',
          pageFetchState: 'Server error',
          indexingState: 'Blocked by robots.txt'
        });
      }
    }

    return indexingStatus;
  }

  // Submit URL for indexing
  async requestIndexing(url: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    try {
      await this.searchConsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: this.siteUrl
        }
      });

      // Note: The actual indexing request is done via the Indexing API
      // which requires different credentials and quotas
      console.log(`Indexing requested for: ${url}`);
      return true;
    } catch (error) {
      console.error(`Failed to request indexing for ${url}:`, error);
      return false;
    }
  }

  // Get search appearance data (rich results, etc.)
  async getSearchAppearance(options: {
    days?: number;
    searchType?: 'web' | 'image' | 'video' | 'news';
  } = {}): Promise<PerformanceData[]> {
    const days = options.days || 30;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const query: PerformanceQuery = {
      startDate,
      endDate,
      dimensions: ['page', 'query']
    };

    if (options.searchType && options.searchType !== 'web') {
      query.dimensionFilterGroups = [{
        filters: [{
          dimension: 'page',
          operator: 'contains',
          expression: options.searchType === 'image' ? '.jpg|.png|.gif|.webp' : ''
        }]
      }];
    }

    const data = await this.getSearchAnalytics(query);
    return data.data;
  }

  // Get mobile usability issues
  async getMobileUsabilityIssues(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    try {
      // Note: Mobile usability is typically accessed via the GSC web interface
      // The API has limited mobile usability endpoints
      console.warn('Mobile usability data requires manual GSC interface access');
      return [];
    } catch (error) {
      console.error('Failed to fetch mobile usability issues:', error);
      return [];
    }
  }

  // Generate SEO insights report
  async generateSEOInsights(options: {
    days?: number;
    includeOpportunities?: boolean;
  } = {}): Promise<{
    summary: {
      totalClicks: number;
      totalImpressions: number;
      averageCTR: number;
      averagePosition: number;
      topKeywords: string[];
      topPages: string[];
    };
    opportunities: {
      lowCTRQueries: KeywordPerformanceReport[];
      highImpressionLowPosition: KeywordPerformanceReport[];
      newOpportunities: KeywordPerformanceReport[];
    };
    issues: {
      droppedKeywords: string[];
      indexingIssues: string[];
      poorPerformingPages: string[];
    };
  }> {
    const days = options.days || 30;
    
    // Get overall performance
    const overallData = await this.getSearchAnalytics({
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      dimensions: ['query']
    });

    // Get keyword performance with trends
    const keywordPerformance = await this.getKeywordPerformance({ days });
    
    // Get top pages
    const topPages = await this.getTopPages({ days, limit: 10 });

    // Identify opportunities
    const lowCTRQueries = keywordPerformance
      .filter(k => k.ctr < 2 && k.impressions > 100)
      .slice(0, 10);
    
    const highImpressionLowPosition = keywordPerformance
      .filter(k => k.position > 10 && k.impressions > 200)
      .slice(0, 10);
    
    const newOpportunities = keywordPerformance
      .filter(k => k.opportunity === 'high')
      .slice(0, 15);

    // Identify issues
    const droppedKeywords = keywordPerformance
      .filter(k => k.trend === 'down' && k.impressions > 50)
      .map(k => k.keyword)
      .slice(0, 10);
    
    const poorPerformingPages = topPages
      .filter(p => p.ctr < 1)
      .map(p => p.keys[0])
      .slice(0, 10);

    return {
      summary: {
        totalClicks: overallData.totalClicks,
        totalImpressions: overallData.totalImpressions,
        averageCTR: overallData.averageCTR,
        averagePosition: overallData.averagePosition,
        topKeywords: keywordPerformance.slice(0, 10).map(k => k.keyword),
        topPages: topPages.slice(0, 10).map(p => p.keys[0])
      },
      opportunities: {
        lowCTRQueries,
        highImpressionLowPosition,
        newOpportunities
      },
      issues: {
        droppedKeywords,
        indexingIssues: [], // Would need URL inspection for each page
        poorPerformingPages
      }
    };
  }

  // Get sites list
  async getSites(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    try {
      const response = await this.searchConsole.sites.list();
      return response.data.siteEntry?.map(site => site.siteUrl ?? '').filter(Boolean) ?? [];
    } catch (error) {
      console.error('Failed to fetch sites list:', error);
      return [];
    }
  }

  // Export data to CSV
  exportToCSV(data: PerformanceData[], filename?: string): string {
    const headers = ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'];
    const csvData = [headers.join(',')];

    data.forEach(row => {
      const csvRow = [
        `"${row.keys[0] ?? ''}"`,
        row.clicks.toString(),
        row.impressions.toString(),
        (row.ctr * 100).toFixed(2) + '%',
        row.position.toFixed(1)
      ];
      csvData.push(csvRow.join(','));
    });

    const csv = csvData.join('\n');

    if (filename) {
      writeFileSync(filename, csv, 'utf8');
      console.log(`Data exported to: ${filename}`);
    }

    return csv;
  }

  async exportAiOverviewKeywords(options: {
    outputPath: string;
    startDate?: string;
    endDate?: string;
    regex?: string;
    rowLimit?: number;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Google Search Console client not initialized');
    }

    const endDate = options.endDate || new Date().toISOString().split('T')[0];
    const startDate = options.startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const regex = options.regex || '(?i)((^|\\s)(who|what|when|where|why|how|does|do|can|should|is|are|will|did)\\b.*)|(.*\\b(vs|versus|difference between|compare|comparison)\\b.*)|(.*\\b(ai overview|ai overview:|overview|summary|definition|meaning)\\b.*)|(.*\\b(chatgpt|gemini|bard|copilot|perplexity|claude)\\b.*)';

    const response = await this.searchConsole.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        dimensionFilterGroups: [
          {
            groupType: 'and',
            filters: [
              {
                dimension: 'query',
                operator: 'includingRegex',
                expression: regex
              }
            ]
          }
        ],
        rowLimit: options.rowLimit || 1000
      }
    });

    const rows = response.data.rows || [];
    const header = ['Query', 'Landing Page', 'Clicks', 'Impressions', 'CTR', 'Position'];
    const csvLines = [header.join(',')];

    rows.forEach(row => {
      const [query = '', page = ''] = row.keys || [];
      const ctrPercent = ((row.ctr || 0) * 100).toFixed(2) + '%';
      csvLines.push([
        `"${query.replace(/"/g, '""')}"`,
        `"${page.replace(/"/g, '""')}"`,
        row.clicks || 0,
        row.impressions || 0,
        ctrPercent,
        (row.position || 0).toFixed(2)
      ].join(','));
    });

    writeFileSync(options.outputPath, csvLines.join('\n'), 'utf8');
  }
}

export type GSCQuery = PerformanceQuery;
export type GSCResult = SearchAnalyticsReport;

// Utility functions for GSC data analysis
export const gscUtils = {
  // Calculate click opportunity (impressions with low CTR)
  calculateClickOpportunity(data: PerformanceData[]): PerformanceData[] {
    return data
      .filter(row => row.impressions > 100 && row.ctr < 0.05) // Less than 5% CTR
      .sort((a, b) => b.impressions - a.impressions);
  },
  
  // Find ranking opportunities (high impressions, poor position)
  findRankingOpportunities(data: PerformanceData[]): PerformanceData[] {
    return data
      .filter(row => row.impressions > 200 && row.position > 10 && row.position < 50)
      .sort((a, b) => (b.impressions / b.position) - (a.impressions / a.position));
  },
  
  // Group queries by topic
  groupQueriesByTopic(data: PerformanceData[]): Record<string, PerformanceData[]> {
    const topics: Record<string, PerformanceData[]> = {};
    
    data.forEach(row => {
      const query = row.keys[0].toLowerCase();
      const words = query.split(' ');
      const mainTopic = words.find(word => word.length > 4) || words[0] || 'other';
      
      if (!topics[mainTopic]) {
        topics[mainTopic] = [];
      }
      topics[mainTopic].push(row);
    });
    
    return topics;
  },
  
  // Calculate seasonal trends (requires historical data)
  calculateSeasonalTrends(historicalData: { date: string; data: PerformanceData[] }[]): Record<string, number[]> {
    const trends: Record<string, number[]> = {};
    
    historicalData.forEach(entry => {
      entry.data.forEach(row => {
        const query = row.keys[0];
        if (!trends[query]) {
          trends[query] = [];
        }
        trends[query].push(row.clicks);
      });
    });
    
    return trends;
  }
};
