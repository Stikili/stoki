import { describe, it, expect } from 'vitest'
import { POSTS, findPost } from './index'

/**
 * The registry drives the index page AND the sitemap, so a malformed entry
 * either hides a post or feeds Google a URL that 404s. Both fail silently
 * in production, which is why they're asserted here.
 */
describe('blog post registry', () => {
  it('has at least one published post', () => {
    expect(POSTS.length).toBeGreaterThan(0)
  })

  it('has unique slugs', () => {
    const slugs = POSTS.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('uses URL-safe slugs', () => {
    // The slug is concatenated straight into the sitemap URL and must match
    // the route directory name — anything needing escaping is a bug.
    for (const p of POSTS) {
      expect(p.slug, p.title).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('dates every post as a valid ISO day', () => {
    for (const p of POSTS) {
      expect(p.published, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(p.published)), p.slug).toBe(false)
      if (p.updated) {
        expect(p.updated, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        // An updated date before publication would render "Updated" earlier
        // than the post existed.
        expect(p.updated >= p.published, p.slug).toBe(true)
      }
    }
  })

  it('sorts newest first', () => {
    const dates = POSTS.map(p => p.published)
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)
  })

  it('keeps meta descriptions within a sane SERP length', () => {
    // Google truncates around 160 chars; an empty one loses the snippet.
    for (const p of POSTS) {
      expect(p.description.length, p.slug).toBeGreaterThan(50)
      expect(p.description.length, p.slug).toBeLessThanOrEqual(200)
    }
  })

  it('gives every post an excerpt, tags and a reading time', () => {
    for (const p of POSTS) {
      expect(p.excerpt.length, p.slug).toBeGreaterThan(20)
      expect(p.tags.length, p.slug).toBeGreaterThan(0)
      expect(p.readingMinutes, p.slug).toBeGreaterThan(0)
    }
  })

  it('does not repeat the title verbatim in the excerpt', () => {
    // They render adjacent on the index card; repeating wastes the slot.
    for (const p of POSTS) {
      expect(p.excerpt, p.slug).not.toBe(p.title)
    }
  })

  it('finds a post by slug and misses cleanly', () => {
    expect(findPost(POSTS[0].slug)).toEqual(POSTS[0])
    expect(findPost('no-such-post')).toBeUndefined()
  })
})
