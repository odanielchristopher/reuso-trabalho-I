// @vitest-environment node
import { describe, expect, it, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  delugeGetAllDataMock: vi.fn(),
  transmissionGetAllDataMock: vi.fn(),
  qBittorrentGetAllDataMock: vi.fn(),
  sabQueueMock: vi.fn(),
  nzbListGroupsMock: vi.fn(),
  nzbStatusMock: vi.fn(),
}));

vi.mock('~/tools/config/getConfig', () => ({
  getConfig: mocks.getConfigMock,
}));

vi.mock('@ctrl/deluge', () => ({
  Deluge: vi.fn().mockImplementation(() => ({
    getAllData: mocks.delugeGetAllDataMock,
  })),
}));

vi.mock('@ctrl/transmission', () => ({
  Transmission: vi.fn().mockImplementation(() => ({
    getAllData: mocks.transmissionGetAllDataMock,
  })),
}));

vi.mock('@ctrl/qbittorrent', () => ({
  QBittorrent: vi.fn().mockImplementation(() => ({
    getAllData: mocks.qBittorrentGetAllDataMock,
  })),
}));

vi.mock('sabnzbd-api', () => ({
  Client: vi.fn().mockImplementation(() => ({
    queue: mocks.sabQueueMock,
  })),
}));

vi.mock('~/server/api/routers/usenet/nzbget/nzbget-client', () => ({
  NzbgetClient: vi.fn().mockImplementation(() => ({
    listGroups: mocks.nzbListGroupsMock,
    status: mocks.nzbStatusMock,
  })),
}));

import { Deluge } from '@ctrl/deluge';
import { QBittorrent } from '@ctrl/qbittorrent';
import { Transmission } from '@ctrl/transmission';
import { Client } from 'sabnzbd-api';
import { downloadRouter } from '~/server/api/routers/download';
import { NzbgetClient } from '~/server/api/routers/usenet/nzbget/nzbget-client';

const createTorrent = (overrides?: Partial<Record<string, unknown>>) => ({
  name: 'Torrent 1',
  eta: 10,
  state: 'downloading',
  progress: 50,
  totalSeeds: 12,
  totalSelected: 1000,
  totalPeers: 24,
  ratio: 1.2,
  uploadSpeed: 100,
  downloadSpeed: 200,
  isCompleted: false,
  totalDownloaded: 300,
  totalUploaded: 120,
  label: 'movies',
  queuePosition: 1,
  stateMessage: 'active',
  dateAdded: 123456,
  ...overrides,
});

const createApp = (overrides?: Partial<Record<string, any>>) => ({
  id: 'app-1',
  name: 'App 1',
  url: 'http://example.local',
  integration: {
    type: 'deluge',
    properties: [],
  },
  ...overrides,
});

describe('downloadRouter.get', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normaliza dados de torrent para Deluge e soma totais', async () => {
    // Arrange
    const app = createApp({
      id: 'deluge-app',
      url: 'http://deluge.local',
      integration: {
        type: 'deluge',
        properties: [{ field: 'password', value: 'pwd' }],
      },
    });

    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.delugeGetAllDataMock.mockResolvedValue({
      torrents: [createTorrent(), createTorrent({ downloadSpeed: 50, uploadSpeed: 10, name: 'Torrent 2' })],
    });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(Deluge).toHaveBeenCalledWith({
      baseUrl: 'http://deluge.local',
      password: 'pwd',
    });
    expect(result.failedApps).toStrictEqual([]);
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      type: 'torrent',
      appId: 'deluge-app',
      totalDownload: 250,
      totalUpload: 110,
      success: true,
    });
    expect((result.apps[0] as any).torrents[0]).toMatchObject({
      name: 'Torrent 1',
      label: 'movies',
      stateMessage: 'active',
      queuePosition: 1,
    });
  });

  it('preserva fila torrent vazia com totais zerados', async () => {
    // Arrange
    const app = createApp({
      id: 'deluge-empty-app',
      url: 'http://deluge-empty.local',
      integration: {
        type: 'deluge',
        properties: [{ field: 'password', value: 'pwd' }],
      },
    });

    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.delugeGetAllDataMock.mockResolvedValue({
      torrents: [],
    });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      type: 'torrent',
      appId: 'deluge-empty-app',
      totalDownload: 0,
      totalUpload: 0,
      success: true,
      torrents: [],
    });
  });

  it('omite integração desconhecida sem falhar a rota', async () => {
    // Arrange
    const unknownApp = createApp({
      id: 'unknown-app',
      integration: { type: 'unknownIntegration', properties: [] },
    });
    const transmissionApp = createApp({
      id: 'transmission-app',
      integration: {
        type: 'transmission',
        properties: [
          { field: 'username', value: 'john' },
          { field: 'password', value: 'secret' },
        ],
      },
      url: 'http://transmission.local',
    });

    mocks.getConfigMock.mockReturnValue({ apps: [unknownApp, transmissionApp] });
    mocks.transmissionGetAllDataMock.mockResolvedValue({ torrents: [createTorrent()] });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(Transmission).toHaveBeenCalledWith({
      baseUrl: 'http://transmission.local',
      username: 'john',
      password: 'secret',
    });
    expect(result.failedApps).toStrictEqual([]);
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0].appId).toBe('transmission-app');
  });

  it('mantem sucessos quando uma integracao falha e inclui failedApps', async () => {
    // Arrange
    const qbittorrentApp = createApp({
      id: 'qb-app',
      integration: {
        type: 'qBittorrent',
        properties: [
          { field: 'username', value: 'qb' },
          { field: 'password', value: 'pwd' },
        ],
      },
      url: 'http://qb.local',
    });
    const delugeApp = createApp({ id: 'deluge-app' });

    mocks.getConfigMock.mockReturnValue({ apps: [qbittorrentApp, delugeApp] });
    mocks.qBittorrentGetAllDataMock.mockRejectedValue(new Error('connection failed'));
    mocks.delugeGetAllDataMock.mockResolvedValue({ torrents: [createTorrent()] });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(QBittorrent).toHaveBeenCalledWith({
      baseUrl: 'http://qb.local',
      username: 'qb',
      password: 'pwd',
    });
    expect(result.apps.some((app) => app.appId === 'deluge-app')).toBe(true);
    expect(result.failedApps).toEqual(expect.arrayContaining(['qb-app']));
  });

  it('aceita API key ausente em sabnzbd e retorna fila vazia', async () => {
    // Arrange
    const app = createApp({
      id: 'sab-app',
      url: 'http://sab.local:8080/path',
      integration: {
        type: 'sabnzbd',
        properties: [],
      },
    });

    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.sabQueueMock.mockResolvedValue({
      kbpersec: '0',
      slots: [],
    });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(Client).toHaveBeenCalledWith('http://sab.local:8080', '');
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      type: 'usenet',
      appId: 'sab-app',
      totalDownload: 0,
      success: true,
    });
    expect((result.apps[0] as any).nzbs).toStrictEqual([]);
  });

  it('mapeia nzbget e calcula progresso, tamanho e ETA', async () => {
    // Arrange
    const app = createApp({
      id: 'nzb-app',
      url: 'https://nzb.local',
      integration: {
        type: 'nzbGet',
        properties: [
          { field: 'username', value: 'nzb-user' },
          { field: 'password', value: 'nzb-pass' },
        ],
      },
    });

    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.nzbListGroupsMock.mockImplementation((cb: any) => {
      cb(null, [
        {
          NZBID: 42,
          NZBName: 'Movie NZB',
          DownloadedSizeMB: 50,
          FileSizeMB: 100,
          RemainingSizeMB: 10,
          Status: 'QUEUED',
        },
      ]);
    });
    mocks.nzbStatusMock.mockImplementation((cb: any) => {
      cb(null, {
        DownloadRate: 2000000,
      });
    });

    const caller = downloadRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.get({ configName: 'default' });

    // Assert
    expect(NzbgetClient).toHaveBeenCalledWith({
      host: 'nzb.local',
      port: '443',
      login: 'nzb-user',
      hash: 'nzb-pass',
    });
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      type: 'usenet',
      appId: 'nzb-app',
      totalDownload: 2000000,
      success: true,
    });
    expect((result.apps[0] as any).nzbs[0]).toMatchObject({
      id: '42',
      name: 'Movie NZB',
      progress: 50,
      eta: 5,
      size: 100000000,
      state: 'queued',
    });
  });
});
