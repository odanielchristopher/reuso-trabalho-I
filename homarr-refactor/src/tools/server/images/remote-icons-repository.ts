import {
  AbstractIconRepository,
  NormalizedIcon,
  NormalizedIconRepositoryResult,
} from './abstract-icons-repository';

export abstract class RemoteIconsRepository<TBody> extends AbstractIconRepository {
  protected constructor(
    private readonly requestUrl: string,
    private readonly displayName: string,
    copyright: string,
    private readonly requestOptions?: RequestInit
  ) {
    super(copyright);
  }

  protected async fetchInternally(): Promise<NormalizedIconRepositoryResult> {
    const response = await (this.requestOptions === undefined
      ? fetch(this.requestUrl)
      : fetch(this.requestUrl, this.requestOptions));
    const body = (await response.json()) as TBody;
    const entries = this.normalizeEntries(body);

    return {
      entries,
      count: entries.length,
      success: true,
      name: this.displayName,
      copyright: this.copyright,
    };
  }

  protected abstract normalizeEntries(body: TBody): NormalizedIcon[];
}
