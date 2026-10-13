import Consola from 'consola';
import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GitHubIconsRepository } from './github-icons-repository';
import { JsdelivrIconsRepository } from './jsdelivr-icons-repository';
import { LocalIconsRepository } from './local-icons-repository';
import { UnpkgIconsRepository } from './unpkg-icons-repository';

const sources = [
  {
    name: 'GitHub',
    create: () =>
      new GitHubIconsRepository(
        { api: 'https://icons.test/tree', blob: 'https://icons.test/{0}/{1}' },
        'Test icons',
        'MIT'
      ),
    empty: { tree: [] },
  },
  {
    name: 'jsDelivr',
    create: () =>
      new JsdelivrIconsRepository(
        { api: 'https://icons.test/files', blob: 'https://icons.test/{1}' },
        'Test icons',
        'MIT'
      ),
    empty: { files: [] },
  },
  {
    name: 'unpkg',
    create: () => new UnpkgIconsRepository('https://icons.test/icons/', 'Test icons', 'MIT'),
    empty: { files: [] },
  },
];

beforeEach(() => {
  vi.spyOn(Consola, 'error').mockImplementation(() => {});
  vi.spyOn(Consola, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(sources)('$name icon repository', ({ create, empty }) => {
  it('should return a successful empty repository when the source has no icons', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => empty }));
    const repository = create();

    const result = await repository.fetch();

    expect(result).toEqual({
      name: 'Test icons',
      copyright: 'MIT',
      count: 0,
      success: true,
      entries: [],
    });
  });

  it('should return a normalized failure when the network request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const repository = create();

    const result = await repository.fetch();

    expect(result).toEqual({ name: '', copyright: 'MIT', count: 0, success: false, entries: [] });
    expect(Consola.error).toHaveBeenCalledOnce();
  });

  it('should return a normalized failure when the response contains invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => {
          throw new SyntaxError('invalid JSON');
        },
      })
    );
    const repository = create();

    const result = await repository.fetch();

    expect(result).toEqual({ name: '', copyright: 'MIT', count: 0, success: false, entries: [] });
  });
});

describe('remote icon normalization', () => {
  it('should filter GitHub assets, prioritize SVG and default missing sizes to zero', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({
        json: async () => ({
          tree: [
            { path: 'png/server.png', size: 20 },
            { path: 'svg/server.svg' },
            { path: 'banner.png', size: 3 },
            { path: 'logo.png' },
            { path: 'README.md' },
          ],
        }),
      });
    vi.stubGlobal('fetch', request);
    const repository = new GitHubIconsRepository(
      { api: 'https://icons.test/tree', blob: 'https://icons.test/{0}/{1}' },
      'GitHub icons',
      'MIT'
    );

    const result = await repository.fetch();

    expect(request).toHaveBeenCalledWith('https://icons.test/tree', {});
    expect(result).toEqual({
      name: 'GitHub icons',
      copyright: 'MIT',
      success: true,
      count: 2,
      entries: [
        { name: 'server.svg', url: 'https://icons.test/svg/server.svg', size: 0 },
        { name: 'server.png', url: 'https://icons.test/png/server.png', size: 20 },
      ],
    });
  });

  it('should filter jsDelivr assets and preserve the source order', async () => {
    const request = vi.fn().mockResolvedValue({
      json: async () => ({
        files: [
          { name: '/png/server.png', size: 20 },
          { name: '/svg/server.svg', size: 10 },
          { name: '/_banner.png', size: 3 },
          { name: '/_logo.png', size: 3 },
          { name: '/notes.txt', size: 3 },
        ],
      }),
    });
    vi.stubGlobal('fetch', request);
    const repository = new JsdelivrIconsRepository(
      { api: 'https://icons.test/files', blob: 'https://icons.test/{1}' },
      'CDN icons',
      'Apache'
    );

    const result = await repository.fetch();

    expect(request).toHaveBeenCalledWith('https://icons.test/files');
    expect(result).toEqual({
      name: 'CDN icons',
      copyright: 'Apache',
      success: true,
      count: 2,
      entries: [
        { name: 'server.png', url: 'https://icons.test/server.png', size: 20 },
        { name: 'server.svg', url: 'https://icons.test/server.svg', size: 10 },
      ],
    });
  });

  it('should request unpkg metadata and include files regardless of extension', async () => {
    const request = vi.fn().mockResolvedValue({
      json: async () => ({
        files: [
          { path: '/icons/server.png', size: 20, type: 'file' },
          { path: '/icons/readme.txt', size: 10, type: 'file' },
          { path: '/icons/folder', size: 0, type: 'directory' },
        ],
      }),
    });
    vi.stubGlobal('fetch', request);
    const repository = new UnpkgIconsRepository('https://icons.test/icons/', 'Unpkg icons', 'MIT');

    const result = await repository.fetch();

    expect(request).toHaveBeenCalledWith('https://icons.test/icons/?meta');
    expect(result).toEqual({
      name: 'Unpkg icons',
      copyright: 'MIT',
      success: true,
      count: 2,
      entries: [
        { name: 'server.png', url: 'https://icons.test/icons/server.png', size: 20 },
        { name: 'readme.txt', url: 'https://icons.test/icons/readme.txt', size: 10 },
      ],
    });
  });
});

describe('local icon repository', () => {
  it('should return an empty successful repository when the directory does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const read = vi.spyOn(fs, 'readdirSync');
    const repository = new LocalIconsRepository();

    const result = await repository.fetch();

    expect(result).toEqual({ name: 'Local', copyright: '', success: true, count: 0, entries: [] });
    expect(read).not.toHaveBeenCalled();
  });

  it('should include supported images with filesystem sizes and exclude other files', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      'a.png',
      'b.svg',
      'c.jpeg',
      'd.jpg',
      'notes.txt',
    ] as any);
    const stat = vi.spyOn(fs, 'statSync').mockReturnValue({ size: 42 } as fs.Stats);
    const repository = new LocalIconsRepository();

    const result = await repository.fetch();

    expect(result).toEqual({
      name: 'Local',
      copyright: '',
      success: true,
      count: 4,
      entries: ['a.png', 'b.svg', 'c.jpeg', 'd.jpg'].map((name) => ({
        name,
        url: `/icons/${name}`,
        size: 42,
      })),
    });
    expect(stat).toHaveBeenCalledTimes(4);
    expect(stat).toHaveBeenCalledWith('./public/icons/a.png');
  });

  it('should normalize filesystem failures instead of rejecting', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('permission denied');
    });
    const repository = new LocalIconsRepository();

    const result = await repository.fetch();

    expect(result).toEqual({ name: '', copyright: '', success: false, count: 0, entries: [] });
  });
});
