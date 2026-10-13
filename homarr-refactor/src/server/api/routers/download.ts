import Consola from 'consola';
import { z } from 'zod';
import { getConfig } from '~/tools/config/getConfig';
import {
  NormalizedDownloadAppStat,
  NormalizedDownloadQueueResponse,
} from '~/types/api/downloads/queue/NormalizedDownloadQueueResponse';

import { createTRPCRouter, publicProcedure } from '../trpc';
import { getDownloadDataFromClient } from './download/download-strategies';

export const downloadRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        configName: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const failedClients: string[] = [];

      const clientData: Promise<NormalizedDownloadAppStat>[] = config.apps.map(async (app) => {
        try {
          const response = await getDownloadDataFromClient(app);

          if (!response) {
            return {
              success: false,
            } as NormalizedDownloadAppStat;
          }

          return response;
        } catch (err: any) {
          Consola.error(
            `Error communicating with your download client '${app.name}' (${app.id}): ${err}`,
          );
          failedClients.push(app.id);
          return {
            success: false,
          } as NormalizedDownloadAppStat;
        }
      });

      const settledPromises = await Promise.allSettled(clientData);

      const data: NormalizedDownloadAppStat[] = settledPromises
        .filter((x) => x.status === 'fulfilled')
        .map((promise) => (promise as PromiseFulfilledResult<NormalizedDownloadAppStat>).value)
        .filter((x) => x !== undefined && x.type !== undefined);

      const responseBody = {
        apps: data,
        failedApps: failedClients,
      } as NormalizedDownloadQueueResponse;

      if (failedClients.length > 0) {
        Consola.warn(
          `${failedClients.length} download clients failed. Please check your configuration and the above log`,
        );
      }

      return responseBody;
    }),
});

