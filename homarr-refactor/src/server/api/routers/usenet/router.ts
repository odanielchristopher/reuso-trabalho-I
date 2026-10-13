import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { checkIntegrationsType, findAppProperty } from '~/tools/client/app-properties';
import { getConfig } from '~/tools/config/getConfig';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import { createNzbgetAdapter, createSabnzbdAdapter } from './usenet-adapters';

export const usenetRouter = createTRPCRouter({
  info: publicProcedure
    .input(
      z.object({
        configName: z.string(),
        appId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((x) => x.id === input.appId);

      if (!app || !checkIntegrationsType(app.integration, ['nzbGet', 'sabnzbd'])) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `App with ID "${input.appId}" could not be found.`,
        });
      }

      if (app.integration.type === 'nzbGet') {
        const nzbgetStatus = await createNzbgetAdapter(app).getInfo();

        if (!nzbgetStatus) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error while getting NZBGet status',
          });
        }

        return nzbgetStatus;
      }

      const apiKey = findAppProperty(app, 'apiKey');
      if (!apiKey) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `API Key for app "${app.name}" is missing`,
        });
      }

      const { origin } = new URL(app.url);

      return createSabnzbdAdapter(app, apiKey).getInfo();
    }),
  history: publicProcedure
    .input(
      z.object({
        configName: z.string(),
        appId: z.string(),
        limit: z.number(),
        offset: z.number(),
      })
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((x) => x.id === input.appId);

      if (!app || !checkIntegrationsType(app.integration, ['nzbGet', 'sabnzbd'])) {
        throw new Error(`App with ID "${input.appId}" could not be found.`);
      }

      if (app.integration.type === 'nzbGet') {
        const nzbgetHistory = await createNzbgetAdapter(app).getHistory();

        if (!nzbgetHistory) {
          throw new Error('Error while getting NZBGet history');
        }

        return nzbgetHistory;
      }

      const { origin } = new URL(app.url);

      const apiKey = findAppProperty(app, 'apiKey');
      if (!apiKey) {
        throw new Error(`API Key for app "${app.name}" is missing`);
      }

      return createSabnzbdAdapter(app, apiKey).getHistory(input.offset, input.limit);
    }),
  pause: publicProcedure
    .input(
      z.object({
        configName: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const config = getConfig(input.configName);
      const app = config.apps.find((x) => x.id === input.appId);

      if (!app || !checkIntegrationsType(app.integration, ['nzbGet', 'sabnzbd'])) {
        throw new Error(`App with ID "${input.appId}" could not be found.`);
      }

      if (app.integration.type === 'nzbGet') {
        return createNzbgetAdapter(app).pause();
      }

      const apiKey = findAppProperty(app, 'apiKey');
      if (!apiKey) {
        throw new Error(`API Key for app "${app.name}" is missing`);
      }

      return createSabnzbdAdapter(app, apiKey).pause();
    }),
  resume: publicProcedure
    .input(
      z.object({
        configName: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((x) => x.id === input.appId);

      if (!app || !checkIntegrationsType(app.integration, ['nzbGet', 'sabnzbd'])) {
        throw new Error(`App with ID "${input.appId}" could not be found.`);
      }

      if (app.integration.type === 'nzbGet') {
        return createNzbgetAdapter(app).resume();
      }

      const apiKey = findAppProperty(app, 'apiKey');
      if (!apiKey) {
        throw new Error(`API Key for app "${app.name}" is missing`);
      }

      return createSabnzbdAdapter(app, apiKey).resume();
    }),
  queue: publicProcedure
    .input(
      z.object({
        configName: z.string(),
        appId: z.string(),
        limit: z.number(),
        offset: z.number(),
      })
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((x) => x.id === input.appId);

      if (!app || !checkIntegrationsType(app.integration, ['nzbGet', 'sabnzbd'])) {
        throw new Error(`App with ID "${input.appId}" could not be found.`);
      }

      if (app.integration.type === 'nzbGet') {
        const nzbgetQueue = await createNzbgetAdapter(app).getQueue();

        if (!nzbgetQueue) {
          throw new Error('Error while getting NZBGet queue');
        }

        return {
          items: nzbgetQueue.items,
          total: nzbgetQueue.total,
        };
      }

      const apiKey = findAppProperty(app, 'apiKey');
      if (!apiKey) {
        throw new Error(`API Key for app "${app.name}" is missing`);
      }

      const queue = await createSabnzbdAdapter(app, apiKey).getQueue(input.offset, input.limit);

      return {
        items: queue.items,
        total: queue.total,
      };
    }),
});

export interface UsenetInfoResponse {
  paused: boolean;
  sizeLeft: number;
  speed: number;
  eta: number;
}
