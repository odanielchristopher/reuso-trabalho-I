import { NormalizedIcon } from './abstract-icons-repository';
import { RemoteIconsRepository } from './remote-icons-repository';

export class JsdelivrIconsRepository extends RemoteIconsRepository<JsdelivrResponse> {
  static readonly papirusRepository = {
    api: 'https://data.jsdelivr.com/v1/packages/gh/PapirusDevelopmentTeam/papirus_icons@master?structure=flat',
    blob: 'https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons/src/{1}',
  } as JsdelivrRepositoryUrl;

  static readonly homelabSvgAssetsRepository = {
    api: 'https://data.jsdelivr.com/v1/packages/gh/loganmarchione/homelab-svg-assets@main?structure=flat',
    blob: 'https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/{1}',
  } as JsdelivrRepositoryUrl;

  constructor(
    private readonly repository: JsdelivrRepositoryUrl,
    displayName: string,
    copyright: string
  ) {
    super(repository.api, displayName, copyright);
  }

  protected normalizeEntries(body: JsdelivrResponse): NormalizedIcon[] {
    return body.files
      .filter((file) => !['_banner.png', '_logo.png'].some((x) => file.name.includes(x)))
      .filter((file) => ['.png', '.svg'].some((x) => file.name.endsWith(x)))

      .map((file): NormalizedIcon => {
        const fileNameParts = file.name.split('/');
        const fileName = fileNameParts[fileNameParts.length - 1];
        const extensions = fileName.split('.')[1];
        return {
          url: this.repository.blob.replace('{0}', extensions).replace('{1}', fileName),
          name: fileName,
          size: file.size,
        };
      });
  }

  protected name: string = "JsDelivr";
}

type JsdelivrRepositoryUrl = {
  api: string;
  blob: string;
};

type JsdelivrResponse = {
  files: JsdelivrFile[];
};

type JsdelivrFile = {
  name: string;
  size: number;
};
