import { Deluge } from '@ctrl/deluge';
import { QBittorrent } from '@ctrl/qbittorrent';
import { AllClientData } from '@ctrl/shared-torrent';
import { Transmission } from '@ctrl/transmission';
import { ConfigAppType, IntegrationType } from '~/types/app';

import { findAppProperty } from '~/tools/client/app-properties';
import { NormalizedDownloadAppStat } from '~/types/api/downloads/queue/NormalizedDownloadQueueResponse';

import { createNzbgetAdapter, createSabnzbdAdapter } from '../usenet/usenet-adapters';

type TorrentClientConstructor = new (options: Record<string, string | undefined>) => {
  getAllData: () => Promise<AllClientData>;
};

type DownloadStrategy = (app: ConfigAppType) => Promise<NormalizedDownloadAppStat | undefined>;

const normalizeTorrentData = (appId: string, data: AllClientData): NormalizedDownloadAppStat => ({
  type: 'torrent',
  appId,
  success: true,
  torrents: data.torrents.map((torrent) => ({
    name: torrent.name,
    eta: torrent.eta,
    state: torrent.state,
    progress: torrent.progress,
    totalSeeds: torrent.totalSeeds,
    totalSelected: torrent.totalSelected,
    totalPeers: torrent.totalPeers,
    ratio: torrent.ratio,
    uploadSpeed: torrent.uploadSpeed,
    downloadSpeed: torrent.downloadSpeed,
    isCompleted: torrent.isCompleted,
    totalDownloaded: torrent.totalDownloaded,
    totalUploaded: torrent.totalUploaded,
    label: torrent.label,
    queuePosition: torrent.queuePosition,
    stateMessage: torrent.stateMessage,
    dateAdded: torrent.dateAdded,
  })),
  totalDownload: data.torrents.reduce((acc, torrent) => acc + torrent.downloadSpeed, 0),
  totalUpload: data.torrents.reduce((acc, torrent) => acc + torrent.uploadSpeed, 0),
});

const createTorrentStrategy = (
  ClientConstructor: TorrentClientConstructor,
  getOptions: (app: ConfigAppType) => Record<string, string | undefined>,
): DownloadStrategy => {
  return async (app) => normalizeTorrentData(app.id, await new ClientConstructor(getOptions(app)).getAllData());
};

const downloadStrategies: Partial<Record<IntegrationType, DownloadStrategy>> = {
  deluge: createTorrentStrategy(Deluge, (app) => ({
    baseUrl: app.url,
    password: findAppProperty(app, 'password'),
  })),
  transmission: createTorrentStrategy(Transmission, (app) => ({
    baseUrl: app.url,
    username: findAppProperty(app, 'username'),
    password: findAppProperty(app, 'password'),
  })),
  qBittorrent: createTorrentStrategy(QBittorrent, (app) => ({
    baseUrl: app.url,
    username: findAppProperty(app, 'username'),
    password: findAppProperty(app, 'password'),
  })),
  sabnzbd: async (app) => {
    const adapter = createSabnzbdAdapter(app, findAppProperty(app, 'apiKey'));
    const queue = await adapter.getQueue();

    return {
      type: 'usenet',
      appId: app.id,
      totalDownload: queue.totalDownload,
      nzbs: queue.items,
      success: true,
    };
  },
  nzbGet: async (app) => {
    const adapter = createNzbgetAdapter(app);
    const queue = await adapter.getQueue();

    return {
      type: 'usenet',
      appId: app.id,
      nzbs: queue.items,
      success: true,
      totalDownload: queue.totalDownload,
    };
  },
};

export const getDownloadDataFromClient = async (
  app: ConfigAppType,
): Promise<NormalizedDownloadAppStat | undefined> => {
  const strategy = app.integration?.type ? downloadStrategies[app.integration.type] : undefined;

  if (!strategy) {
    return undefined;
  }

  return strategy(app);
};
