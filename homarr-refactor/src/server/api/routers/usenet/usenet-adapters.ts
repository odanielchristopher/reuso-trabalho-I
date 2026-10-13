import dayjs from 'dayjs';
import { Client } from 'sabnzbd-api';
import { ConfigAppType } from '~/types/app';
import { UsenetHistoryItem, UsenetQueueItem } from '~/widgets/useNet/types';

import { findAppProperty } from '~/tools/client/app-properties';

import { NzbgetClient } from './nzbget/nzbget-client';
import { NzbgetHistoryItem, NzbgetQueueItem, NzbgetStatus } from './nzbget/types';

type UsenetInfo = {
  paused: boolean;
  sizeLeft: number;
  speed: number;
  eta: number;
};

type UsenetHistory = {
  items: UsenetHistoryItem[];
  total: number;
};

type UsenetQueue = {
  items: UsenetQueueItem[];
  total: number;
  totalDownload: number;
};

const parseTimeLeft = (timeleft: string) => {
  const [hours, minutes, seconds] = timeleft.split(':');

  return dayjs.duration({
    hour: parseInt(hours, 10),
    minutes: parseInt(minutes, 10),
    seconds: parseInt(seconds, 10),
  } as any);
};

const mapSabQueueItem = (slot: {
  nzo_id: string;
  timeleft: string;
  filename: string;
  percentage: string;
  mb: string;
  status: string;
}) => {
  const eta = parseTimeLeft(slot.timeleft);

  return {
    id: slot.nzo_id,
    eta: eta.asSeconds(),
    name: slot.filename,
    progress: parseFloat(slot.percentage),
    size: parseFloat(slot.mb) * 1000 * 1000,
    state: slot.status.toLowerCase() as any,
  } satisfies UsenetQueueItem;
};

const mapNzbgetState = (status: string) => {
  switch (status) {
    case 'QUEUED':
      return 'queued';
    case 'PAUSED ':
      return 'paused';
    default:
      return 'downloading';
  }
};

const createSabnzbdClient = (app: ConfigAppType, apiKey: string) => {
  const { origin } = new URL(app.url);

  return new Client(origin, apiKey);
};

const createNzbgetClient = (app: ConfigAppType) => {
  const url = new URL(app.url);
  const options = {
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    login: findAppProperty(app, 'username'),
    hash: findAppProperty(app, 'password'),
  };

  return NzbgetClient(options);
};

const promisify = <T>(callback: (resolve: (value: T) => void, reject: (reason: unknown) => void) => void) =>
  new Promise<T>((resolve, reject) => callback(resolve, reject));

export const createSabnzbdAdapter = (app: ConfigAppType, apiKey: string) => {
  const client = createSabnzbdClient(app, apiKey);

  return {
    async getInfo(): Promise<UsenetInfo> {
      const queue = await client.queue(0, -1);
      const eta = parseTimeLeft(queue.timeleft);

      return {
        paused: queue.paused,
        sizeLeft: parseFloat(queue.mbleft) * 1024 * 1024,
        speed: parseFloat(queue.kbpersec) * 1000,
        eta: eta.asSeconds(),
      };
    },
    async getHistory(offset: number, limit: number): Promise<UsenetHistory> {
      const history = await client.history(offset, limit);

      return {
        items: history.slots.map((slot) => ({
          id: slot.nzo_id,
          name: slot.name,
          size: slot.bytes,
          time: slot.download_time,
        })),
        total: history.noofslots,
      };
    },
    pause: () => client.queuePause(),
    resume: () => client.queueResume(),
    async getQueue(offset = 0, limit = -1): Promise<UsenetQueue> {
      const queue = await client.queue(offset, limit);

      return {
        items: queue.slots.map(mapSabQueueItem),
        total: queue.noofslots,
        totalDownload: Number(queue.kbpersec) * 1024,
      };
    },
  };
};

export const createNzbgetAdapter = (app: ConfigAppType) => {
  const nzbGet = createNzbgetClient(app);

  return {
    async getInfo(): Promise<UsenetInfo> {
      const nzbgetStatus = await promisify<NzbgetStatus>((resolve, reject) => {
        nzbGet.status((err: any, result: NzbgetStatus) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      });

      if (!nzbgetStatus) {
        throw new Error('Error while getting NZBGet status');
      }

      const bytesRemaining = nzbgetStatus.RemainingSizeMB * 1000000;

      return {
        paused: nzbgetStatus.DownloadPaused,
        sizeLeft: bytesRemaining,
        speed: nzbgetStatus.DownloadRate,
        eta: bytesRemaining / nzbgetStatus.DownloadRate,
      };
    },
    async getHistory(): Promise<UsenetHistory> {
      const nzbgetHistory = await promisify<NzbgetHistoryItem[]>((resolve, reject) => {
        nzbGet.history(false, (err: any, result: NzbgetHistoryItem[]) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      });

      if (!nzbgetHistory) {
        throw new Error('Error while getting NZBGet history');
      }

      return {
        items: nzbgetHistory.map((item: NzbgetHistoryItem) => ({
          id: item.NZBID.toString(),
          name: item.Name,
          size: item.DownloadedSizeMB * 1000000,
          time: item.DownloadTimeSec,
        })),
        total: nzbgetHistory.length,
      };
    },
    pause: () =>
      promisify((resolve, reject) => {
        nzbGet.pauseDownload(false, (err: any, result: unknown) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      }),
    resume: () =>
      promisify((resolve, reject) => {
        nzbGet.resumeDownload(false, (err: any, result: unknown) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      }),
    async getQueue(): Promise<UsenetQueue> {
      const nzbgetQueue = await promisify<NzbgetQueueItem[]>((resolve, reject) => {
        nzbGet.listGroups((err: any, result: NzbgetQueueItem[]) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      });

      if (!nzbgetQueue) {
        throw new Error('Error while getting NZBGet queue');
      }

      const nzbgetStatus = await promisify<NzbgetStatus>((resolve, reject) => {
        nzbGet.status((err: any, result: NzbgetStatus) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        });
      });

      if (!nzbgetStatus) {
        throw new Error('Error while getting NZBGet status');
      }

      const items: UsenetQueueItem[] = nzbgetQueue.map((item: NzbgetQueueItem) => ({
        id: item.NZBID.toString(),
        name: item.NZBName,
        progress: (item.DownloadedSizeMB / item.FileSizeMB) * 100,
        eta: (item.RemainingSizeMB * 1000000) / nzbgetStatus.DownloadRate,
        size: item.FileSizeMB * 1000 * 1000,
        state: mapNzbgetState(item.Status),
      }));

      return {
        items,
        total: items.length,
        totalDownload: nzbgetStatus.DownloadRate,
      };
    },
  };
};
