// @vitest-environment node
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  sabQueueMock: vi.fn(),
  sabHistoryMock: vi.fn(),
  sabQueuePauseMock: vi.fn(),
  sabQueueResumeMock: vi.fn(),
  nzbStatusMock: vi.fn(),
  nzbHistoryMock: vi.fn(),
  nzbPauseDownloadMock: vi.fn(),
  nzbResumeDownloadMock: vi.fn(),
  nzbListGroupsMock: vi.fn(),
}));

vi.mock('~/tools/config/getConfig', () => ({
  getConfig: mocks.getConfigMock,
}));

vi.mock('sabnzbd-api', () => ({
  Client: vi.fn().mockImplementation(() => ({
    queue: mocks.sabQueueMock,
    history: mocks.sabHistoryMock,
    queuePause: mocks.sabQueuePauseMock,
    queueResume: mocks.sabQueueResumeMock,
  })),
}));

vi.mock('~/server/api/routers/usenet/nzbget/nzbget-client', () => ({
  NzbgetClient: vi.fn().mockImplementation(() => ({
    status: mocks.nzbStatusMock,
    history: mocks.nzbHistoryMock,
    pauseDownload: mocks.nzbPauseDownloadMock,
    resumeDownload: mocks.nzbResumeDownloadMock,
    listGroups: mocks.nzbListGroupsMock,
  })),
}));

import { Client } from 'sabnzbd-api';
import { NzbgetClient } from '~/server/api/routers/usenet/nzbget/nzbget-client';
import { usenetRouter } from '~/server/api/routers/usenet/router';

const createSabApp = () => ({
  id: 'sab-app',
  name: 'Sab App',
  url: 'http://sab.local:8080/path',
  integration: {
    type: 'sabnzbd',
    properties: [{ field: 'apiKey', value: 'sab-key' }],
  },
});

const createNzbApp = () => ({
  id: 'nzb-app',
  name: 'Nzb App',
  url: 'https://nzb.local',
  integration: {
    type: 'nzbGet',
    properties: [
      { field: 'username', value: 'nzb-user' },
      { field: 'password', value: 'nzb-pass' },
    ],
  },
});

describe('usenetRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('info do sabnzbd usa queue(0, -1) e converte tempo/tamanho/velocidade', async () => {
    // Arrange
    const app = createSabApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.sabQueueMock.mockResolvedValue({
      paused: true,
      mbleft: '1.5',
      kbpersec: '2',
      timeleft: '00:00:10',
    });

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.info({ configName: 'default', appId: app.id });

    // Assert
    expect(Client).toHaveBeenCalledWith('http://sab.local:8080', 'sab-key');
    expect(mocks.sabQueueMock).toHaveBeenCalledWith(0, -1);
    expect(result).toStrictEqual({
      paused: true,
      sizeLeft: 1.5 * 1024 * 1024,
      speed: 2000,
      eta: 10,
    });
  });

  it('history do sabnzbd respeita paginacao e noofslots', async () => {
    // Arrange
    const app = createSabApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.sabHistoryMock.mockResolvedValue({
      slots: [
        { nzo_id: '1', name: 'A', bytes: 100, download_time: 20 },
        { nzo_id: '2', name: 'B', bytes: 200, download_time: 30 },
      ],
      noofslots: 12,
    });

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.history({
      configName: 'default',
      appId: app.id,
      offset: 5,
      limit: 2,
    });

    // Assert
    expect(mocks.sabHistoryMock).toHaveBeenCalledWith(5, 2);
    expect(result.total).toBe(12);
    expect(result.items).toStrictEqual([
      { id: '1', name: 'A', size: 100, time: 20 },
      { id: '2', name: 'B', size: 200, time: 30 },
    ]);
  });

  it('queue do sabnzbd respeita paginacao e converte fila', async () => {
    // Arrange
    const app = createSabApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.sabQueueMock.mockResolvedValue({
      slots: [
        {
          nzo_id: 'a1',
          timeleft: '00:01:00',
          filename: 'Movie',
          percentage: '25.5',
          mb: '200',
          status: 'PAUSED',
        },
      ],
      noofslots: 99,
    });

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const result = await caller.queue({
      configName: 'default',
      appId: app.id,
      offset: 3,
      limit: 10,
    });

    // Assert
    expect(mocks.sabQueueMock).toHaveBeenCalledWith(3, 10);
    expect(result.total).toBe(99);
    expect(result.items[0]).toStrictEqual({
      id: 'a1',
      eta: 60,
      name: 'Movie',
      progress: 25.5,
      size: 200000000,
      state: 'paused',
    });
  });

  it('rejeita info de sabnzbd sem apiKey (diferente da rota download)', async () => {
    // Arrange
    const app = {
      ...createSabApp(),
      integration: {
        type: 'sabnzbd',
        properties: [],
      },
    };
    mocks.getConfigMock.mockReturnValue({ apps: [app] });

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const act = caller.info({ configName: 'default', appId: app.id });

    // Assert
    await expect(act).rejects.toBeInstanceOf(TRPCError);
    await expect(act).rejects.toThrow('API Key for app "Sab App" is missing');
  });

  it('pause e resume do nzbGet usam callbacks com argumento false', async () => {
    // Arrange
    const app = createNzbApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.nzbPauseDownloadMock.mockImplementation((arg: boolean, cb: any) => cb(null, 'paused'));
    mocks.nzbResumeDownloadMock.mockImplementation((arg: boolean, cb: any) => cb(null, 'resumed'));

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const pauseResult = await caller.pause({ configName: 'default', appId: app.id });
    const resumeResult = await caller.resume({ configName: 'default', appId: app.id });

    // Assert
    expect(NzbgetClient).toHaveBeenCalledWith({
      host: 'nzb.local',
      port: '443',
      login: 'nzb-user',
      hash: 'nzb-pass',
    });
    expect(mocks.nzbPauseDownloadMock).toHaveBeenCalledWith(false, expect.any(Function));
    expect(mocks.nzbResumeDownloadMock).toHaveBeenCalledWith(false, expect.any(Function));
    expect(pauseResult).toBe('paused');
    expect(resumeResult).toBe('resumed');
  });

  it('propaga erro de callback do nzbGet em info', async () => {
    // Arrange
    const app = createNzbApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.nzbStatusMock.mockImplementation((cb: any) => cb(new Error('status failed')));

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const act = caller.info({ configName: 'default', appId: app.id });

    // Assert
    await expect(act).rejects.toThrow('status failed');
  });

  it('rejeita queue quando callback devolve resultado ausente', async () => {
    // Arrange
    const app = createNzbApp();
    mocks.getConfigMock.mockReturnValue({ apps: [app] });
    mocks.nzbListGroupsMock.mockImplementation((cb: any) => cb(null, undefined));

    const caller = usenetRouter.createCaller({ session: null, cookies: {} });

    // Act
    const act = caller.queue({ configName: 'default', appId: app.id, offset: 0, limit: 10 });

    // Assert
    await expect(act).rejects.toThrow('Error while getting NZBGet queue');
  });
});
