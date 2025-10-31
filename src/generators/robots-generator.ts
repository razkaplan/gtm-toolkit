// Intelligent robots.txt Generator with AI Bot Controls

import { writeFileSync } from 'fs';
import { join } from 'path';
import { GTMConfig } from '../types';

export interface RobotRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}

export interface AIBotConfig {
  allowAIBots: boolean;
  specificBots: {
    googleBot: boolean;
    bingBot: boolean;
    gptBot: boolean;
    claudeBot: boolean;
    baiduBot: boolean;
    yandexBot: boolean;
    facebookBot: boolean;
    twitterBot: boolean;
  };
  customRules: string[];
}

export class RobotsGenerator {
  private config: GTMConfig;
  
  constructor(config: GTMConfig) {
    this.config = config;
  }

  // Generate robots.txt based on configuration
  generate(options: {
    outputPath?: string;
    aiBotsConfig?: AIBotConfig;
    customRules?: RobotRule[];
    includeAnalytics?: boolean;
  } = {}): string {
    const rules: RobotRule[] = [];
    
    // Default rules for all bots
    const defaultRule: RobotRule = {
      userAgent: '*',
      allow: ['/'],
      disallow: [
        '/admin/',
        '/api/',
        '/private/',
        '/_next/',
        '/node_modules/',
        '/*.json$',
        '/temp/',
        '/tmp/'
      ]
    };
    
    // AI Bot specific rules based on your website's approach
    const aiBotsConfig = options.aiBotsConfig || {
      allowAIBots: this.config.robots?.allowAIBots ?? true,
      specificBots: {
        googleBot: true,
        bingBot: true,
        gptBot: true,
        claudeBot: true,
        baiduBot: false,
        yandexBot: false,
        facebookBot: true,
        twitterBot: true
      },
      customRules: this.config.robots?.customRules || []
    };

    if (aiBotsConfig.allowAIBots) {
      // Allow specific AI bots with controlled access
      const aiBotRules = this.generateAIBotRules(aiBotsConfig);
      rules.push(...aiBotRules);
    } else {
      // Block all AI bots
      rules.push({
        userAgent: 'GPTBot',
        disallow: ['/']
      });
      rules.push({
        userAgent: 'ChatGPT-User',
        disallow: ['/']
      });
      rules.push({
        userAgent: 'CCBot',
        disallow: ['/']
      });
      rules.push({
        userAgent: 'anthropic-ai',
        disallow: ['/']
      });
      rules.push({
        userAgent: 'Claude-Web',
        disallow: ['/']
      });
    }

    // Add default rule for remaining bots
    rules.push(defaultRule);
    
    // Add custom rules
    if (options.customRules) {
      rules.push(...options.customRules);
    }

    // Generate the robots.txt content
    let robotsContent = this.generateRobotsContent(rules);
    
    // Add sitemap reference
    if (this.config.robots?.sitemapUrl) {
      robotsContent += `\n\nSitemap: ${this.config.robots.sitemapUrl}`;
    } else {
      robotsContent += `\n\nSitemap: ${this.config.seo.siteUrl}/sitemap.xml`;
    }
    
    // Add crawl delay for respectful crawling
    robotsContent += `\n\n# Crawl-delay for respectful crawling`;
    robotsContent += `\nUser-agent: *`;
    robotsContent += `\nCrawl-delay: 1`;
    
    // Add analytics tracking if enabled
    if (options.includeAnalytics) {
      robotsContent += this.addAnalyticsRules();
    }
    
    // Write to file if path provided
    if (options.outputPath) {
      const filePath = join(options.outputPath, 'robots.txt');
      writeFileSync(filePath, robotsContent, 'utf8');
      console.log(`robots.txt generated at: ${filePath}`);
    }
    
    return robotsContent;
  }

  // Generate AI bot specific rules
  private generateAIBotRules(config: AIBotConfig): RobotRule[] {
    const rules: RobotRule[] = [];
    
    // GPT/OpenAI bots
    if (config.specificBots.gptBot) {
      rules.push({
        userAgent: 'GPTBot',
        allow: ['/blog/', '/content/', '/docs/'],
        disallow: ['/admin/', '/api/', '/private/'],
        crawlDelay: 10
      });
      rules.push({
        userAgent: 'ChatGPT-User',
        allow: ['/blog/', '/content/'],
        disallow: ['/admin/', '/api/', '/private/'],
        crawlDelay: 10
      });
    }
    
    // Claude/Anthropic bots
    if (config.specificBots.claudeBot) {
      rules.push({
        userAgent: 'anthropic-ai',
        allow: ['/blog/', '/content/', '/docs/', '/resources/'],
        disallow: ['/admin/', '/api/', '/private/'],
        crawlDelay: 5
      });
      rules.push({
        userAgent: 'Claude-Web',
        allow: ['/blog/', '/content/', '/docs/'],
        crawlDelay: 5
      });
    }
    
    // Google bots (always important for SEO)
    if (config.specificBots.googleBot) {
      rules.push({
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/admin/', '/api/', '/private/', '/_next/'],
        crawlDelay: 1
      });
      rules.push({
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/uploads/', '/assets/'],
        crawlDelay: 1
      });
    }
    
    // Bing bot
    if (config.specificBots.bingBot) {
      rules.push({
        userAgent: 'bingbot',
        allow: ['/'],
        disallow: ['/admin/', '/api/', '/private/'],
        crawlDelay: 2
      });
    }
    
    // Social media bots
    if (config.specificBots.facebookBot) {
      rules.push({
        userAgent: 'facebookexternalhit',
        allow: ['/'],
        crawlDelay: 1
      });
    }
    
    if (config.specificBots.twitterBot) {
      rules.push({
        userAgent: 'Twitterbot',
        allow: ['/'],
        crawlDelay: 1
      });
    }
    
    return rules;
  }

  // Generate robots.txt content from rules
  private generateRobotsContent(rules: RobotRule[]): string {
    let content = '# robots.txt generated by GTM Toolkit\n';
    content += `# Generated on: ${new Date().toISOString()}\n`;
    content += `# Site: ${this.config.seo.siteUrl}\n\n`;
    
    rules.forEach(rule => {
      content += `User-agent: ${rule.userAgent}\n`;
      
      if (rule.allow) {
        rule.allow.forEach(path => {
          content += `Allow: ${path}\n`;
        });
      }
      
      if (rule.disallow) {
        rule.disallow.forEach(path => {
          content += `Disallow: ${path}\n`;
        });
      }
      
      if (rule.crawlDelay) {
        content += `Crawl-delay: ${rule.crawlDelay}\n`;
      }
      
      content += '\n';
    });
    
    return content;
  }

  // Add analytics and tracking rules
  private addAnalyticsRules(): string {
    let content = '\n\n# Analytics and tracking\n';
    
    // Allow analytics bots
    content += 'User-agent: GoogleAnalytics\n';
    content += 'Allow: /\n\n';
    
    content += 'User-agent: Google-Site-Verification\n';
    content += 'Allow: /\n\n';
    
    return content;
  }

  // Validate robots.txt syntax
  validateRobotsTxt(content: string): { isValid: boolean; errors: string[]; warnings: string[]; } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lines = content.split('\n');
    
    let hasUserAgent = false;
    let hasSitemap = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine === '') {
        return;
      }
      
      // Check for valid directives
      const directive = trimmedLine.split(':')[0].toLowerCase();
      const value = trimmedLine.split(':').slice(1).join(':').trim();
      
      switch (directive) {
        case 'user-agent':
          if (!value) {
            errors.push(`Line ${index + 1}: User-agent missing value`);
          }
          hasUserAgent = true;
          break;
          
        case 'disallow':
        case 'allow':
          if (!hasUserAgent) {
            errors.push(`Line ${index + 1}: ${directive} directive without preceding User-agent`);
          }
          if (!value.startsWith('/') && value !== '') {
            warnings.push(`Line ${index + 1}: ${directive} path should start with /`);
          }
          break;
          
        case 'crawl-delay':
          if (!hasUserAgent) {
            errors.push(`Line ${index + 1}: Crawl-delay without preceding User-agent`);
          }
          if (isNaN(Number(value)) || Number(value) < 0) {
            errors.push(`Line ${index + 1}: Invalid crawl-delay value: ${value}`);
          }
          break;
          
        case 'sitemap':
          if (!value.startsWith('http')) {
            errors.push(`Line ${index + 1}: Sitemap URL must be absolute`);
          }
          hasSitemap = true;
          break;
          
        default:
          warnings.push(`Line ${index + 1}: Unknown directive: ${directive}`);
      }
    });
    
    if (!hasUserAgent) {
      errors.push('No User-agent directive found');
    }
    
    if (!hasSitemap) {
      warnings.push('No Sitemap directive found');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Generate framework-specific robots.txt
  generateForFramework(framework: string): string {
    const frameworkRules: Record<string, RobotRule[]> = {
      nextjs: [
        {
          userAgent: '*',
          disallow: ['/_next/', '/api/', '*.json'],
          allow: ['/api/og/*'] // Allow OG image generation
        }
      ],
      nuxt: [
        {
          userAgent: '*',
          disallow: ['/_nuxt/', '/api/', '.nuxt/'],
          allow: ['/']
        }
      ],
      astro: [
        {
          userAgent: '*',
          disallow: ['/dist/', '/node_modules/'],
          allow: ['/']
        }
      ]
    };
    
    const customRules = frameworkRules[framework] || [];
    return this.generate({ customRules });
  }

  // Test robots.txt against user agent
  testRobotsTxt(robotsContent: string, userAgent: string, path: string): {
    allowed: boolean;
    matchingRule?: string;
    crawlDelay?: number;
  } {
    const lines = robotsContent.split('\n');
    let isMatchingAgent = false;
    let crawlDelay: number | undefined;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('#') || trimmedLine === '') continue;
      
      const [directive, ...valueParts] = trimmedLine.split(':');
      const value = valueParts.join(':').trim();
      
      switch (directive.toLowerCase()) {
        case 'user-agent':
          isMatchingAgent = value === '*' || value === userAgent;
          break;
          
        case 'disallow':
          if (isMatchingAgent && path.startsWith(value)) {
            return {
              allowed: false,
              matchingRule: `Disallow: ${value}`,
              crawlDelay
            };
          }
          break;
          
        case 'allow':
          if (isMatchingAgent && path.startsWith(value)) {
            return {
              allowed: true,
              matchingRule: `Allow: ${value}`,
              crawlDelay
            };
          }
          break;
          
        case 'crawl-delay':
          if (isMatchingAgent) {
            crawlDelay = Number(value);
          }
          break;
      }
    }
    
    // Default to allowed if no matching disallow rule
    return {
      allowed: true,
      crawlDelay
    };
  }
}

// Utility functions for robots.txt
export const robotsUtils = {
  // Common AI bots list
  AI_BOTS: [
    'GPTBot',
    'ChatGPT-User', 
    'CCBot',
    'anthropic-ai',
    'Claude-Web',
    'Google-Extended',
    'PerplexityBot',
    'YouBot',
    'Applebot-Extended'
  ],
  
  // Generate AI-friendly rules
  generateAIFriendlyRules(): RobotRule[] {
    return robotsUtils.AI_BOTS.map(bot => ({
      userAgent: bot,
      allow: ['/blog/', '/docs/', '/content/'],
      disallow: ['/admin/', '/api/', '/private/'],
      crawlDelay: 10
    }));
  },
  
  // Block all AI bots
  blockAllAIBots(): RobotRule[] {
    return robotsUtils.AI_BOTS.map(bot => ({
      userAgent: bot,
      disallow: ['/']
    }));
  },
  
  // SEO-friendly default rules
  seoFriendlyRules(): RobotRule[] {
    return [
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/admin/', '/private/'],
        crawlDelay: 1
      },
      {
        userAgent: 'bingbot',
        allow: ['/'],
        disallow: ['/admin/', '/private/'],
        crawlDelay: 2
      }
    ];
  }
};

export type RobotsConfig = Parameters<RobotsGenerator['generate']>[0];

export const generateRobots = (config: GTMConfig, options: RobotsConfig = {}): string => {
  const generator = new RobotsGenerator(config);
  return generator.generate(options);
};
