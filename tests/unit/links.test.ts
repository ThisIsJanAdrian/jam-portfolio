import { describe, expect, it } from 'vitest';
import { EXTERNAL_LINK_ATTRS, isExternalUrl } from '../../src/utils/links';

describe('isExternalUrl()', () => {
  it.each([
    'https://github.com/someone',
    'http://example.org',
    'HTTPS://EXAMPLE.ORG', // the scheme is case-insensitive
    '//cdn.example.org/lib.js', // protocol-relative still leaves the site
  ])('treats %s as another website', (href) => {
    expect(isExternalUrl(href)).toBe(true);
  });

  // Equivalence partitioning: everything that is not an absolute http(s) address stays in the tab.
  it.each([
    '/projects/personal-blog',
    '/#journey',
    '#contact',
    '',
    'relative/page',
    'mailto:someone@example.com',
    'tel:+639000000000',
    'javascript:void(0)',
  ])('does not treat %j as another website', (href) => {
    expect(isExternalUrl(href)).toBe(false);
  });

  describe("when this site's own address is known", () => {
    const own = 'https://jam.example.com';

    it('keeps absolute links back to this site in the same tab', () => {
      expect(isExternalUrl('https://jam.example.com/projects/x', own)).toBe(false);
    });

    it('still treats other hosts, ports, schemes and subdomains as external', () => {
      expect(isExternalUrl('https://example.org/', own)).toBe(true);
      expect(isExternalUrl('https://jam.example.com:8080/', own)).toBe(true);
      expect(isExternalUrl('http://jam.example.com/', own)).toBe(true);
      expect(isExternalUrl('https://blog.jam.example.com/', own)).toBe(true);
    });
  });
});

describe('EXTERNAL_LINK_ATTRS', () => {
  it('opens a new tab without handing it control of this page or leaking the address', () => {
    expect(EXTERNAL_LINK_ATTRS.target).toBe('_blank');
    expect(EXTERNAL_LINK_ATTRS.rel).toContain('noopener');
    expect(EXTERNAL_LINK_ATTRS.rel).toContain('noreferrer');
  });
});
