// Framework detection utilities
import { existsSync, readFileSync } from 'fs';

export function detectFramework(): string | null {
  // Check for package.json to detect framework
  if (existsSync('package.json')) {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      if (dependencies.next) return 'nextjs';
      if (dependencies.nuxt) return 'nuxt';
      if (dependencies.astro) return 'astro';
      if (dependencies.gatsby) return 'gatsby';
      if (dependencies.vite) return 'vite';
      if (dependencies.react) return 'react';
      if (dependencies.vue) return 'vue';
    } catch (error) {
      console.warn('Failed to parse package.json');
    }
  }

  // Check for framework-specific config files
  if (existsSync('next.config.js') || existsSync('next.config.mjs')) return 'nextjs';
  if (existsSync('nuxt.config.js') || existsSync('nuxt.config.ts')) return 'nuxt';
  if (existsSync('astro.config.js') || existsSync('astro.config.mjs')) return 'astro';
  if (existsSync('gatsby-config.js')) return 'gatsby';
  if (existsSync('vite.config.js') || existsSync('vite.config.ts')) return 'vite';

  return null;
}

export function getFrameworkConfig(framework: string): any {
  const configs = {
    nextjs: {
      publicDir: 'public',
      contentDir: 'content',
      buildDir: '.next',
      configFile: 'next.config.js'
    },
    nuxt: {
      publicDir: 'public',
      contentDir: 'content',
      buildDir: '.nuxt',
      configFile: 'nuxt.config.js'
    },
    astro: {
      publicDir: 'public',
      contentDir: 'src/content',
      buildDir: 'dist',
      configFile: 'astro.config.mjs'
    },
    gatsby: {
      publicDir: 'static',
      contentDir: 'content',
      buildDir: 'public',
      configFile: 'gatsby-config.js'
    }
  };

  return configs[framework as keyof typeof configs] || configs.nextjs;
}
