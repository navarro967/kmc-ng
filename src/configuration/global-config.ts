
import { environment } from '../environments/environment';
import { countryCodes } from './country-codes';

export interface GlobalConfig {
    client: {
        useSecuredProtocol: boolean,
        production: boolean,
        appVersion: string,
        countriesList: string[],
        views: {
          tables: {
            maxItems: number,
            defaultPageSize: number,
            defaultSortOrder: number
          }
        }
    };
    kalturaServer: {
        maxUploadFileSize: number,
        maxConcurrentUploads: number,
        limitToPartnerId: number | null
    };
}

export const globalConfig: GlobalConfig = {
    client: {
        production: environment.production,
        appVersion: '5.16.1',
        useSecuredProtocol: environment.client.useSecuredProtocol,
        countriesList: countryCodes,
        views: {
          tables: {
            'maxItems': 10000,
            'defaultPageSize': 50,
            'defaultSortOrder': -1
          }
        }
    },
    kalturaServer: {
        maxUploadFileSize: 2047, // Mb
        maxConcurrentUploads: 4,
        limitToPartnerId: null
    }
};
