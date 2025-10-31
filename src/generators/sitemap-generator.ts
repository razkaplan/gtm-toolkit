// Intelligent XML Sitemap Generator with Priority Scoring

import { writeFileSync, readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { GTMConfig } from '../types';
import matter from 'gray-matter';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: SitemapImage[];
}

interface SitemapImage {
  url: string;
  title?: string;
  caption?: string;
}

export interface SitemapConfig {
  baseUrl: string;
  defaultPriority: number;
  defaultChangeFreq: 'daily' | 'weekly' | 'monthly';
  excludePatterns: string[];
  includeImages: boolean;
  maxUrls: number;
}

interface ContentMetadata {
  title: string;
  date?: string;
  category?: string;
  tags?: string[];
  lastModified: string;
  wordCount: number;
}

interface SitemapValidationStats {
  urlCount: number;
  sizeInMB: string;
  hasImages: boolean;
}

export class SitemapGenerator {
  private config: GTMConfig;
  private sitemapConfig: SitemapConfig;
  
  constructor(config: GTMConfig, sitemapConfig?: Partial<SitemapConfig>) {
    this.config = config;
    this.sitemapConfig = {
      baseUrl: config.seo.siteUrl,
      defaultPriority: 0.7,
      defaultChangeFreq: 'weekly',
      excludePatterns: ['/admin', '/api', '/private', '/_next', '/node_modules'],
      includeImages: true,
      maxUrls: 50000,
      ...sitemapConfig
    };
  }

  // Generate comprehensive sitemap
  async generate(options: {
    contentPath?: string;
    outputPath?: string;
    staticPages?: string[];
    dynamicRoutes?: { pattern: string; getUrls: () => Promise<string[]>; }[];
  } = {}): Promise<string> {
    const entries: SitemapEntry[] = [];
    
    // Add static pages
    if (options.staticPages) {
      const staticEntries = this.generateStaticPages(options.staticPages);
      entries.push(...staticEntries);
    }
    
    // Add content pages (blog, services, projects)
    const resolvedContentPath = options.contentPath ?? this.config.content?.contentPath;
    if (resolvedContentPath) {
      const contentEntries = await this.generateContentPages(resolvedContentPath);
      entries.push(...contentEntries);
    }
    
    // Add dynamic routes
    if (options.dynamicRoutes) {
      for (const route of options.dynamicRoutes) {
        const urls = await route.getUrls();
        const dynamicEntries = urls.map(url => this.createEntry(url, {
          priority: 0.6,
          changefreq: 'weekly'
        }));
        entries.push(...dynamicEntries);
      }
    }
    
    // Sort by priority (highest first)
    entries.sort((a, b) => b.priority - a.priority);
    
    // Limit to max URLs
    const limitedEntries = entries.slice(0, this.sitemapConfig.maxUrls);
    
    // Generate XML
    const sitemapXml = this.generateXML(limitedEntries);
    
    // Write to file if path provided
    if (options.outputPath) {
      const filePath = join(options.outputPath, 'sitemap.xml');
      writeFileSync(filePath, sitemapXml, 'utf8');
      console.log(`Sitemap generated at: ${filePath} (${limitedEntries.length} URLs)`);
    }
    
    return sitemapXml;
  }

  // Generate static pages entries
  private generateStaticPages(pages: string[]): SitemapEntry[] {
    return pages.map(page => {
      const priority = this.calculateStaticPagePriority(page);
      const changefreq = this.getStaticPageChangeFreq(page);
      
      return this.createEntry(page, {
        priority,
        changefreq,
        lastmod: new Date().toISOString().split('T')[0]
      });
    });
  }

  // Generate content pages (blog, services, etc.)
  private async generateContentPages(contentPath: string): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    
    if (!existsSync(contentPath)) {
      console.warn(`Content path not found: ${contentPath}`);
      return entries;
    }
    
    // Process blog posts
    const blogPath = join(contentPath, 'blog');
    if (existsSync(blogPath)) {
      const blogEntries = await this.processContentDirectory(blogPath, '/blog/');
      entries.push(...blogEntries);
    }
    
    // Process services
    const servicesPath = join(contentPath, 'service');
    if (existsSync(servicesPath)) {
      const serviceEntries = await this.processContentDirectory(servicesPath, '/services/');
      entries.push(...serviceEntries);
    }
    
    // Process projects
    const projectsPath = join(contentPath, 'project');
    if (existsSync(projectsPath)) {
      const projectEntries = await this.processContentDirectory(projectsPath, '/projects/');
      entries.push(...projectEntries);
    }
    
    return entries;
  }

  // Process content directory
  private async processContentDirectory(dirPath: string, urlPrefix: string): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    
    try {
      const files = readdirSync(dirPath)
        .filter(file => file.endsWith('.md') || file.endsWith('.mdx'))
        .filter(file => !this.shouldExclude(file));
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const metadata = await this.extractContentMetadata(filePath);
        
        // Generate URL from filename
        const slug = this.generateSlug(file, metadata);
        const url = `${urlPrefix}${slug}`;
        
        // Calculate priority based on content
        const priority = this.calculateContentPriority(metadata, urlPrefix);
        
        // Determine change frequency
        const changefreq = this.getContentChangeFreq(metadata, urlPrefix);
        
        // Extract images
        const images = this.sitemapConfig.includeImages ? await this.extractImages(filePath) : [];
        
        entries.push(this.createEntry(url, {
          priority,
          changefreq,
          lastmod: metadata.lastModified,
          images
        }));
      }
    } catch (error) {
      console.error(`Error processing content directory ${dirPath}:`, error);
    }
    
    return entries;
  }

  // Extract content metadata
  private async extractContentMetadata(filePath: string): Promise<ContentMetadata> {
    try {
      const fileContent = readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(fileContent);
      const stats = statSync(filePath);
      
      return {
        title: frontmatter.title || 'Untitled',
        date: frontmatter.date,
        category: frontmatter.category,
        tags: frontmatter.tags || [],
        lastModified: stats.mtime.toISOString().split('T')[0],
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      const stats = statSync(filePath);
      return {
        title: 'Untitled',
        lastModified: stats.mtime.toISOString().split('T')[0],
        wordCount: 0
      };
    }
  }

  // Generate slug from filename and metadata
  private generateSlug(filename: string, metadata: ContentMetadata): string {
    const baseFromFilename = filename
      .replace(/\.(md|mdx)$/, '')
      .replace(/^\d{4}-\d{2}-\d{2}-/, '');

    const source = metadata.title
      ? metadata.title
      : baseFromFilename;

    return source
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Calculate content priority based on metadata
  private calculateContentPriority(metadata: ContentMetadata, urlPrefix: string): number {
    let priority = this.sitemapConfig.defaultPriority;
    
    // Higher priority for recent content
    if (metadata.date) {
      const contentDate = new Date(metadata.date);
      const now = new Date();
      const daysDiff = (now.getTime() - contentDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff < 30) {
        priority += 0.2; // Recent content
      } else if (daysDiff < 90) {
        priority += 0.1; // Fairly recent
      }
    }
    
    // Priority by content type
    if (urlPrefix.includes('/blog/')) {
      priority += 0.1; // Blog posts are important
    } else if (urlPrefix.includes('/services/')) {
      priority += 0.2; // Services are very important
    } else if (urlPrefix.includes('/projects/')) {
      priority += 0.15; // Projects showcase work
    }
    
    // Priority by word count (longer = more valuable)
    if (metadata.wordCount > 2000) {
      priority += 0.1; // Comprehensive content
    } else if (metadata.wordCount > 1000) {
      priority += 0.05; // Substantial content
    }
    
    // Priority by category
    if (metadata.category) {
      const highPriorityCategories = ['gtm', 'SEO', 'OUT-OF-STEALTH'];
      if (highPriorityCategories.includes(metadata.category)) {
        priority += 0.1;
      }
    }
    
    // Cap at 1.0
    return Math.min(priority, 1.0);
  }

  // Calculate static page priority
  private calculateStaticPagePriority(page: string): number {
    const priorityMap: Record<string, number> = {
      '/': 1.0,           // Homepage
      '/about': 0.9,      // About page
      '/services': 0.9,   // Services overview
      '/projects': 0.8,   // Projects overview
      '/blog': 0.8,       // Blog overview
      '/contact': 0.7,    // Contact page
      '/privacy': 0.3,    // Legal pages
      '/terms': 0.3,
      '/sitemap': 0.1
    };
    
    return priorityMap[page] || this.sitemapConfig.defaultPriority;
  }

  // Get change frequency for content
  private getContentChangeFreq(metadata: ContentMetadata, urlPrefix: string): SitemapEntry['changefreq'] {
    // Blog posts change less frequently after publication
    if (urlPrefix.includes('/blog/')) {
      if (metadata.date) {
        const contentDate = new Date(metadata.date);
        const daysSincePublished = (Date.now() - contentDate.getTime()) / (1000 * 3600 * 24);
        
        if (daysSincePublished < 7) return 'daily';
        if (daysSincePublished < 30) return 'weekly';
        return 'monthly';
      }
    }
    
    // Services and projects update less frequently
    if (urlPrefix.includes('/services/') || urlPrefix.includes('/projects/')) {
      return 'monthly';
    }
    
    return this.sitemapConfig.defaultChangeFreq;
  }

  // Get change frequency for static pages
  private getStaticPageChangeFreq(page: string): SitemapEntry['changefreq'] {
    const changeFreqMap: Record<string, SitemapEntry['changefreq']> = {
      '/': 'weekly',        // Homepage updates regularly
      '/blog': 'daily',     // Blog index updates with new posts
      '/services': 'monthly',
      '/projects': 'monthly',
      '/about': 'yearly',
      '/contact': 'yearly',
      '/privacy': 'yearly',
      '/terms': 'yearly'
    };
    
    return changeFreqMap[page] || 'monthly';
  }

  // Extract images from content
  private async extractImages(filePath: string): Promise<SitemapImage[]> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(content);
      const images: SitemapImage[] = [];
      
      // Extract from frontmatter
      if (frontmatter.image) {
        images.push({
          url: this.resolveImageUrl(frontmatter.image),
          title: frontmatter.title,
          caption: `Featured image for ${frontmatter.title}`
        });
      }
      
      // Extract from content
      const imageMatches = body.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
      
      for (const match of imageMatches) {
        const imageMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
          const alt = imageMatch[1];
          const src = imageMatch[2];
          
          images.push({
            url: this.resolveImageUrl(src),
            title: alt,
            caption: alt
          });
        }
      }
      
      return images;
    } catch (error) {
      return [];
    }
  }

  // Resolve relative image URLs to absolute
  private resolveImageUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `${this.sitemapConfig.baseUrl}${url}`;
    }
    
    return `${this.sitemapConfig.baseUrl}/${url}`;
  }

  // Create sitemap entry
  private createEntry(url: string, options: {
    priority?: number;
    changefreq?: SitemapEntry['changefreq'];
    lastmod?: string;
    images?: SitemapImage[];
  } = {}): SitemapEntry {
    return {
      url: url.startsWith('http') ? url : `${this.sitemapConfig.baseUrl}${url}`,
      lastmod: options.lastmod || new Date().toISOString().split('T')[0],
      changefreq: options.changefreq || this.sitemapConfig.defaultChangeFreq,
      priority: options.priority || this.sitemapConfig.defaultPriority,
      images: options.images || []
    };
  }

  // Check if URL should be excluded
  private shouldExclude(url: string): boolean {
    return this.sitemapConfig.excludePatterns.some(pattern => 
      url.includes(pattern)
    );
  }

  // Generate XML sitemap
  private generateXML(entries: SitemapEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    
    if (entries.some(e => e.images && e.images.length > 0)) {
      xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }
    
    xml += '>\n';
    xml += `  <!-- Generated by GTM Toolkit on ${new Date().toISOString()} -->\n`;
    xml += `  <!-- ${entries.length} URLs -->\n\n`;
    
    entries.forEach(entry => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(entry.url)}</loc>\n`;
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
      
      // Add images
      if (entry.images && entry.images.length > 0) {
        entry.images.forEach(image => {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${this.escapeXml(image.url)}</image:loc>\n`;
          if (image.title) {
            xml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`;
          }
          if (image.caption) {
            xml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`;
          }
          xml += '    </image:image>\n';
        });
      }
      
      xml += '  </url>\n\n';
    });
    
    xml += '</urlset>';
    
    return xml;
  }

  // Escape XML characters
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Generate sitemap index for large sites
  generateSitemapIndex(sitemapUrls: string[], outputPath?: string): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <!-- Generated by GTM Toolkit on ${new Date().toISOString()} -->\n\n`;
    
    sitemapUrls.forEach(url => {
      xml += '  <sitemap>\n';
      xml += `    <loc>${this.escapeXml(url)}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '  </sitemap>\n\n';
    });
    
    xml += '</sitemapindex>';
    
    if (outputPath) {
      const filePath = join(outputPath, 'sitemap-index.xml');
      writeFileSync(filePath, xml, 'utf8');
      console.log(`Sitemap index generated at: ${filePath}`);
    }
    
    return xml;
  }

  // Validate sitemap XML
  validateSitemap(xml: string): { isValid: boolean; errors: string[]; warnings: string[]; stats: SitemapValidationStats } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic XML validation
    if (!xml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }
    
    if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
      errors.push('Missing or invalid urlset declaration');
    }
    
    // Count URLs
    const urlMatches = xml.match(/<url>/g) || [];
    const urlCount = urlMatches.length;
    
    if (urlCount === 0) {
      warnings.push('No URLs found in sitemap');
    }
    
    if (urlCount > 50000) {
      errors.push(`Too many URLs: ${urlCount} (max 50,000)`);
    }
    
    // Check file size (approximate)
    const sizeInMB = Buffer.byteLength(xml, 'utf8') / 1024 / 1024;
    if (sizeInMB > 50) {
      errors.push(`Sitemap too large: ${sizeInMB.toFixed(2)}MB (max 50MB)`);
    }
    
    // Validate URLs
    const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
    locMatches.forEach((match, index) => {
      const url = match.replace(/<\/?loc>/g, '');
      if (!url.startsWith('http')) {
        errors.push(`Invalid URL at position ${index + 1}: ${url}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        urlCount,
        sizeInMB: sizeInMB.toFixed(2),
        hasImages: xml.includes('xmlns:image')
      }
    };
  }
}

// Utility functions for sitemap generation
export const sitemapUtils = {
  // Generate dynamic routes for common patterns
  async generateBlogRoutes(contentPath: string): Promise<string[]> {
    const blogPath = join(contentPath, 'blog');
    if (!existsSync(blogPath)) return [];
    
    const files = readdirSync(blogPath)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const slug = file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
        return `/blog/${slug}`;
      });
    
    return files;
  },
  
  // Calculate priority based on URL patterns
  calculateUrlPriority(url: string): number {
    if (url === '/') return 1.0;
    if (url.match(/\/(about|services|contact)$/)) return 0.9;
    if (url.match(/\/(blog|projects)\/[^/]+$/)) return 0.7;
    if (url.match(/\/(blog|projects)$/)) return 0.8;
    if (url.match(/\/(privacy|terms|sitemap)$/)) return 0.3;
    return 0.6;
  },
  
  // Split large sitemaps
  splitLargeSitemap(entries: SitemapEntry[], maxEntriesPerSitemap: number = 45000): SitemapEntry[][] {
    const chunks: SitemapEntry[][] = [];
    for (let i = 0; i < entries.length; i += maxEntriesPerSitemap) {
      chunks.push(entries.slice(i, i + maxEntriesPerSitemap));
    }
    return chunks;
  }
};

export type SitemapGenerateOptions = Parameters<SitemapGenerator['generate']>[0];

export const generateSitemap = async (
  config: GTMConfig,
  options: SitemapGenerateOptions = {},
  sitemapConfig: Partial<SitemapConfig> = {}
): Promise<string> => {
  const generator = new SitemapGenerator(config, sitemapConfig);
  return generator.generate(options);
};
