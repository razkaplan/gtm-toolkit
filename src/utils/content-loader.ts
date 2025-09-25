import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import matter from 'gray-matter';
import { ContentFile } from '../types';

export interface LoadContentOptions {
  extensions?: string[];
  recursive?: boolean;
  includeDrafts?: boolean;
  maxFiles?: number;
}

export async function loadContentFiles(
  contentPath: string,
  options: LoadContentOptions = {}
): Promise<ContentFile[]> {
  const {
    extensions = ['.md', '.mdx'],
    recursive = true,
    includeDrafts = false,
    maxFiles = 1000
  } = options;

  const isDirectory = (await fs.stat(contentPath)).isDirectory();

  if (!isDirectory) {
    // Single file
    const content = await fs.readFile(contentPath, 'utf-8');
    const parsed = matter(content);

    return [{
      path: contentPath,
      content,
      frontmatter: parsed.data,
      body: parsed.content,
      lastModified: (await fs.stat(contentPath)).mtime
    }];
  }

  // Directory - find all matching files
  const pattern = recursive
    ? `**/*{${extensions.join(',')}}`
    : `*{${extensions.join(',')}}`;

  const files = glob.sync(pattern, {
    cwd: contentPath,
    absolute: false,
    ignore: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      ...(includeDrafts ? [] : ['**/drafts/**', '**/*.draft.*'])
    ]
  });

  const contentFiles: ContentFile[] = [];

  for (const file of files.slice(0, maxFiles)) {
    const filePath = path.join(contentPath, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);
      const stats = await fs.stat(filePath);

      contentFiles.push({
        path: filePath,
        content,
        frontmatter: parsed.data,
        body: parsed.content,
        lastModified: stats.mtime
      });
    } catch (error) {
      console.warn(`Warning: Could not load file ${filePath}:`, error);
    }
  }

  return contentFiles;
}

export async function loadSingleContentFile(filePath: string): Promise<ContentFile | null> {
  try {
    const files = await loadContentFiles(filePath);
    return files[0] || null;
  } catch {
    return null;
  }
}

export function filterContentFiles(
  files: ContentFile[],
  filters: {
    category?: string | string[];
    tag?: string | string[];
    dateRange?: { start?: Date; end?: Date };
    status?: string;
    hasIssues?: boolean;
  }
): ContentFile[] {
  return files.filter(file => {
    const { frontmatter } = file;

    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      const fileCategory = frontmatter.category || frontmatter.categories;
      if (!fileCategory || !categories.includes(fileCategory)) {
        return false;
      }
    }

    // Tag filter
    if (filters.tag) {
      const tags = Array.isArray(filters.tag) ? filters.tag : [filters.tag];
      const fileTags = frontmatter.tags || frontmatter.tag || [];
      const fileTagsArray = Array.isArray(fileTags) ? fileTags : [fileTags];
      if (!tags.some(tag => fileTagsArray.includes(tag))) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const fileDate = new Date(frontmatter.date);
      if (filters.dateRange.start && fileDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && fileDate > filters.dateRange.end) {
        return false;
      }
    }

    // Status filter
    if (filters.status && frontmatter.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export function sortContentFiles(
  files: ContentFile[],
  sortBy: 'date' | 'title' | 'lastModified' | 'size' = 'date',
  order: 'asc' | 'desc' = 'desc'
): ContentFile[] {
  return files.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        const dateA = new Date(a.frontmatter.date || 0);
        const dateB = new Date(b.frontmatter.date || 0);
        comparison = dateA.getTime() - dateB.getTime();
        break;

      case 'title':
        const titleA = a.frontmatter.title || path.basename(a.path);
        const titleB = b.frontmatter.title || path.basename(b.path);
        comparison = titleA.localeCompare(titleB);
        break;

      case 'lastModified':
        comparison = a.lastModified.getTime() - b.lastModified.getTime();
        break;

      case 'size':
        comparison = a.content.length - b.content.length;
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });
}

export function getContentStatistics(files: ContentFile[]): {
  totalFiles: number;
  totalWords: number;
  averageWords: number;
  categories: Record<string, number>;
  tags: Record<string, number>;
  dateRange: { earliest: Date | null; latest: Date | null };
} {
  const stats = {
    totalFiles: files.length,
    totalWords: 0,
    averageWords: 0,
    categories: {} as Record<string, number>,
    tags: {} as Record<string, number>,
    dateRange: { earliest: null as Date | null, latest: null as Date | null }
  };

  files.forEach(file => {
    // Count words
    const wordCount = file.body.split(/\s+/).filter(word => word.length > 0).length;
    stats.totalWords += wordCount;

    // Categories
    const category = file.frontmatter.category || file.frontmatter.categories;
    if (category) {
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }

    // Tags
    const tags = file.frontmatter.tags || file.frontmatter.tag || [];
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    tagsArray.forEach(tag => {
      if (tag) {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      }
    });

    // Date range
    const date = new Date(file.frontmatter.date);
    if (!isNaN(date.getTime())) {
      if (!stats.dateRange.earliest || date < stats.dateRange.earliest) {
        stats.dateRange.earliest = date;
      }
      if (!stats.dateRange.latest || date > stats.dateRange.latest) {
        stats.dateRange.latest = date;
      }
    }
  });

  stats.averageWords = stats.totalFiles > 0 ? Math.round(stats.totalWords / stats.totalFiles) : 0;

  return stats;
}