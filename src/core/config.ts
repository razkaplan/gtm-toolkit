// Configuration management
import { writeFileSync, existsSync } from 'fs';
import { GTMConfig } from '../types';

export function saveConfig(config: GTMConfig, path: string = 'gtm.config.js'): void {
  const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
  writeFileSync(path, configContent, 'utf8');
}

export function loadConfig(path: string = 'gtm.config.js'): GTMConfig | null {
  if (!existsSync(path)) {
    return null;
  }
  
  try {
    delete require.cache[require.resolve(path)];
    return require(path);
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
}

export function getDefaultConfig(): GTMConfig {
  return {
    framework: 'nextjs',
    analytics: {},
    seo: {
      siteName: 'My Site',
      siteUrl: 'https://example.com',
      defaultTitle: 'My Site',
      defaultDescription: 'My site description'
    },
    content: {},
    robots: {
      allowAIBots: true,
      customRules: [],
      sitemapUrl: 'https://example.com/sitemap.xml'
    },
    geo: {
      enabled: true,
      optimizeForAI: true,
      structuredData: true
    }
  };
}
