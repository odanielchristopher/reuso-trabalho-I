import { NormalizedIcon } from './abstract-icons-repository';
import { RemoteIconsRepository } from './remote-icons-repository';

export class UnpkgIconsRepository extends RemoteIconsRepository<UnpkgResponse> {
  static tablerRepository = 'https://unpkg.com/@tabler/icons-png@2.0.0-beta/icons/';

  constructor(
    private readonly repository: string,
    displayName: string,
    copyright: string
  ) {
    super(`${repository}?meta`, displayName, copyright);
  }

  protected normalizeEntries(body: UnpkgResponse): NormalizedIcon[] {
    return body.files
      .filter((file) => file.type === 'file')
      .map((file): NormalizedIcon => {
        const fileName = file.path.replace('/icons/', '');
        const url = `${this.repository}${fileName}`;
        return {
          name: fileName,
          url,
          size: file.size,
        };
      });
  }

  protected name: string = "UnPkg";
}

type UnpkgResponse = {
  files: UnpkgFile[];
};

type UnpkgFile = {
  path: string;
  type: string;
  size: number;
};
