import { act, cleanup, render } from '@testing-library/react';
import type { GridItemHTMLElement, GridStackNode } from 'fily-publish-gridstack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfigStore } from '~/config/store';
import type { ConfigType } from '~/types/config';

import { useGridstack } from './use-gridstack';

const boundary = vi.hoisted(() => ({
  editMode: true,
  shapeSize: 'lg' as 'sm' | 'md' | 'lg',
  contextName: 'test-board' as string | undefined,
  init: vi.fn(),
  save: vi.fn(),
}));

vi.mock('fily-publish-gridstack', () => ({ GridStack: { init: boundary.init } }));
vi.mock('~/utils/api', () => ({
  trcpProxyClient: { config: { save: { mutate: boundary.save } } },
}));
vi.mock('~/config/provider', () => ({
  useConfigContext: () => ({
    config: useConfigStore.getState().configs[0]?.value,
    configVersion: 1,
    name: boundary.contextName,
  }),
}));
vi.mock('../../Views/useEditModeStore', () => ({
  useEditModeStore: (select: (state: { enabled: boolean }) => unknown) =>
    select({ enabled: boundary.editMode }),
}));
vi.mock('./store', () => ({
  useWrapperColumnCount: () => 6,
  useGridstackStore: (select: (state: unknown) => unknown) =>
    select({ currentShapeSize: boundary.shapeSize, mainAreaWidth: 768 }),
}));

type Area = 'wrapper' | 'category' | 'sidebar';
type Listener = (event: Event, nodes?: GridStackNode[]) => void;
let listeners: Record<string, Listener>;
let grid: ReturnType<typeof createGrid>;
let increaseVersion: ReturnType<typeof vi.fn>;

const originalShape = { location: { x: 0, y: 1 }, size: { width: 2, height: 3 } };
const newShape = { location: { x: 4, y: 5 }, size: { width: 3, height: 2 } };

function createConfig(): ConfigType {
  return {
    schemaVersion: 1,
    configProperties: { name: 'test-board' },
    categories: [],
    wrappers: [],
    settings: { marker: 'preserve settings' },
    apps: [
      {
        id: 'app-a',
        name: 'App A',
        area: { type: 'wrapper', properties: { id: 'source' } },
        shape: { lg: originalShape, sm: originalShape },
      },
      {
        id: 'app-b',
        name: 'App B',
        area: { type: 'wrapper', properties: { id: 'source' } },
        shape: { lg: originalShape, sm: originalShape },
      },
    ],
    widgets: [
      {
        id: 'widget-a',
        type: 'date',
        properties: { marker: 'preserve widget' },
        area: { type: 'wrapper', properties: { id: 'source' } },
        shape: { lg: originalShape, sm: originalShape },
      },
      {
        id: 'widget-b',
        type: 'date',
        properties: {},
        area: { type: 'wrapper', properties: { id: 'source' } },
        shape: { lg: originalShape, sm: originalShape },
      },
    ],
  } as unknown as ConfigType;
}

function createGrid() {
  return {
    column: vi.fn(),
    cellHeight: vi.fn(),
    batchUpdate: vi.fn(),
    removeAll: vi.fn(),
    on: vi.fn((name: string, listener: Listener) => {
      listeners[name] = listener;
    }),
    off: vi.fn((name: string) => {
      delete listeners[name];
    }),
    makeWidget: vi.fn((element: GridItemHTMLElement) => {
      element.gridstackNode = { x: 2, y: 3, w: 1, h: 2, el: element };
    }),
  };
}

function BoardArea({ type = 'wrapper', id = 'source' }: { type?: Area; id?: string }) {
  const layout = useGridstack(type, id);
  return (
    <div ref={layout.refs.wrapper}>
      {layout.apps.map((item) => (
        <div
          key={item.id}
          ref={layout.refs.items.current[item.id]}
          data-id={item.id}
          data-type="app"
        />
      ))}
      {layout.widgets.map((item) => (
        <div
          key={item.id}
          ref={layout.refs.items.current[item.id]}
          data-id={item.id}
          data-type="widget"
        />
      ))}
    </div>
  );
}

function currentConfig() {
  return useConfigStore.getState().configs[0].value;
}

function emit(name: string, id: string | null, type: string | null) {
  const element = document.createElement('div');
  if (id) element.setAttribute('data-id', id);
  if (type) element.setAttribute('data-type', type);
  act(() => listeners[name](new Event(name), [{ el: element, x: 4, y: 5, w: 3, h: 2 }]));
}

beforeEach(() => {
  boundary.editMode = true;
  boundary.shapeSize = 'lg';
  boundary.contextName = 'test-board';
  boundary.save.mockReset();
  boundary.init.mockReset();
  listeners = {};
  grid = createGrid();
  boundary.init.mockReturnValue(grid);
  increaseVersion = vi.fn();
  useConfigStore.setState({ configs: [] });
  useConfigStore
    .getState()
    .initConfig('test-board', JSON.parse(JSON.stringify(createConfig())), increaseVersion);
});

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('--gridstack-widget-width');
  document.documentElement.style.removeProperty('--gridstack-column-count');
});

describe('dashboard layout initialization', () => {
  it.each(['wrapper', 'category', 'sidebar'] as const)(
    'should configure the %s area with its current layout rules',
    (type) => {
      const id = type === 'sidebar' ? 'left' : 'source';

      render(<BoardArea type={type} id={id} />);

      expect(boundary.init).toHaveBeenCalledWith(
        {
          column: type === 'sidebar' ? 2 : 6,
          margin: type === 'sidebar' ? 5 : 10,
          cellHeight: 128,
          float: true,
          alwaysShowResizeHandle: 'mobile',
          acceptWidgets: true,
          disableOneColumnMode: true,
          staticGrid: false,
          minRow: type === 'sidebar' ? 0 : 1,
          animate: false,
        },
        `.grid-stack-${type}[data-${type}='${id}']`
      );
      expect(grid.column).toHaveBeenCalledWith(type === 'sidebar' ? 2 : 6, 'none');
    }
  );

  it('should register apps and widgets with their saved DOM geometry inside a batch', () => {
    const expectedIds = ['app-a', 'app-b', 'widget-a', 'widget-b'];

    render(<BoardArea />);

    expect(grid.makeWidget.mock.calls.map(([element]) => element.getAttribute('data-id'))).toEqual(
      expectedIds
    );
    for (const [element] of grid.makeWidget.mock.calls) {
      expect(
        ['gs-x', 'gs-y', 'gs-w', 'gs-h'].map((attribute) => element.getAttribute(attribute))
      ).toEqual(['0', '1', '2', '3']);
    }
    expect(grid.batchUpdate.mock.calls).toEqual([[], [false]]);
    expect(grid.removeAll).toHaveBeenCalledWith(false);
    expect(grid.batchUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      grid.removeAll.mock.invocationCallOrder[0]
    );
    expect(grid.removeAll.mock.invocationCallOrder[0]).toBeLessThan(
      grid.makeWidget.mock.invocationCallOrder[0]
    );
    expect(grid.makeWidget.mock.invocationCallOrder.at(-1)!).toBeLessThan(
      grid.batchUpdate.mock.invocationCallOrder[1]
    );
  });

  it.each(['app', 'widget'] as const)(
    'should persist the assigned geometry of a %s without a saved shape',
    (type) => {
      const config = currentConfig();
      const item = type === 'app' ? config.apps[0] : config.widgets[0];
      const id = item.id;
      delete item.shape.lg;
      const otherSize = structuredClone(item.shape.sm);

      render(<BoardArea />);

      const updated =
        type === 'app'
          ? currentConfig().apps.find((item) => item.id === id)!
          : currentConfig().widgets.find((item) => item.id === id)!;
      expect(updated.shape.lg).toEqual({ location: { x: 2, y: 3 }, size: { width: 1, height: 2 } });
      expect(updated.shape.sm).toEqual(otherSize);
      expect(boundary.save).not.toHaveBeenCalled();
    }
  );

  it('should initialize a static grid and ignore item changes outside edit mode', () => {
    boundary.editMode = false;
    const before = structuredClone(currentConfig());
    render(<BoardArea />);

    emit('change', 'app-a', 'app');
    emit('added', 'widget-a', 'widget');

    expect(boundary.init.mock.calls[0][0].staticGrid).toBe(true);
    expect(currentConfig()).toEqual(before);
    expect(increaseVersion).not.toHaveBeenCalled();
  });

  it('should remove both event subscriptions on unmount', () => {
    const view = render(<BoardArea />);

    view.unmount();

    expect(grid.on.mock.calls.map(([name]) => name)).toEqual(['change', 'added']);
    expect(grid.off.mock.calls).toEqual([['change'], ['added']]);
    expect(listeners).toEqual({});
  });

  it.each(['change', 'added'])('should ignore an empty %s event', (name) => {
    render(<BoardArea />);
    const before = structuredClone(currentConfig());

    act(() => listeners[name](new Event(name), []));

    expect(currentConfig()).toEqual(before);
    expect(increaseVersion).not.toHaveBeenCalled();
  });
});

describe('dashboard item changes', () => {
  it.each(['app', 'widget'] as const)(
    'should move and resize only the selected %s and retain the current array order behavior',
    (type) => {
      render(<BoardArea />);
      const before = structuredClone(currentConfig());

      emit('change', `${type}-a`, type);

      const result = currentConfig();
      const collection: Array<ConfigType['apps'][number] | ConfigType['widgets'][number]> =
        type === 'app' ? result.apps : result.widgets;
      const originalCollection = type === 'app' ? before.apps : before.widgets;
      expect(collection.map((item) => item.id)).toEqual([`${type}-b`, `${type}-a`]);
      expect(collection[0]).toEqual(originalCollection[1]);
      expect(collection[1]).toEqual({
        ...originalCollection[0],
        shape: { ...originalCollection[0].shape, lg: newShape },
      });
      expect(type === 'app' ? result.widgets : result.apps).toEqual(
        type === 'app' ? before.widgets : before.apps
      );
      expect(result.settings).toEqual(before.settings);
      expect(increaseVersion).not.toHaveBeenCalled();
      expect(boundary.save).not.toHaveBeenCalled();
    }
  );

  it.each(['app', 'widget'] as const)(
    'should update the active breakpoint only for the selected %s',
    (type) => {
      boundary.shapeSize = 'sm';
      render(<BoardArea />);
      const before = structuredClone(currentConfig());

      emit('change', `${type}-a`, type);

      const result =
        type === 'app'
          ? currentConfig().apps.find((item) => item.id === 'app-a')!
          : currentConfig().widgets.find((item) => item.id === 'widget-a')!;
      expect(result.shape.sm).toEqual(newShape);
      expect(result.shape.lg).toEqual(
        type === 'app' ? before.apps[0].shape.lg : before.widgets[0].shape.lg
      );
    }
  );

  it.each([
    ['app', 'wrapper', 'destination'],
    ['widget', 'wrapper', 'destination'],
    ['app', 'category', 'category-b'],
    ['widget', 'category', 'category-b'],
    ['app', 'sidebar', 'right'],
    ['widget', 'sidebar', 'left'],
  ] as const)('should transfer a %s to %s/%s and request layout regeneration', (type, area, id) => {
    render(<BoardArea type={area} id={id} />);
    const before = structuredClone(currentConfig());

    emit('added', `${type}-a`, type);

    const result = currentConfig();
    const collection: Array<ConfigType['apps'][number] | ConfigType['widgets'][number]> =
      type === 'app' ? result.apps : result.widgets;
    const originalCollection = type === 'app' ? before.apps : before.widgets;
    expect(collection.find((item) => item.id === `${type}-a`)).toEqual({
      ...originalCollection[0],
      area: { type: area, properties: area === 'sidebar' ? { location: id } : { id } },
      shape: { ...originalCollection[0].shape, lg: newShape },
    });
    expect(collection.find((item) => item.id === `${type}-b`)).toEqual(originalCollection[1]);
    expect(type === 'app' ? result.widgets : result.apps).toEqual(
      type === 'app' ? before.widgets : before.apps
    );
    expect(result.settings).toEqual(before.settings);
    expect(increaseVersion).toHaveBeenCalledOnce();
    expect(boundary.save).not.toHaveBeenCalled();
  });

  it('should update geometry without regenerating when an item is added to its current area', () => {
    render(<BoardArea />);

    emit('added', 'app-a', 'app');

    expect(currentConfig().apps.find((item) => item.id === 'app-a')!.shape.lg).toEqual(newShape);
    expect(increaseVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['change', null, 'app'],
    ['change', 'app-a', null],
    ['change', 'missing', 'app'],
    ['added', null, 'widget'],
    ['added', 'widget-a', null],
    ['added', 'missing', 'widget'],
  ])('should ignore %s when item ID/type is missing or unknown (%s/%s)', (event, id, type) => {
    render(<BoardArea />);
    const before = structuredClone(currentConfig());

    emit(event!, id, type);

    expect(currentConfig()).toEqual(before);
    expect(increaseVersion).not.toHaveBeenCalled();
  });

  it('should preserve the current behavior of processing only the first node in a change event', () => {
    const view = render(<BoardArea />);
    const elements = view.container.querySelectorAll('[data-type="app"]');

    act(() =>
      listeners.change(
        new Event('change'),
        Array.from(elements).map((el) => ({
          el: el as GridItemHTMLElement,
          x: 4,
          y: 5,
          w: 3,
          h: 2,
        }))
      )
    );

    expect(currentConfig().apps.find((item) => item.id === 'app-a')!.shape.lg).toEqual(newShape);
    expect(currentConfig().apps.find((item) => item.id === 'app-b')!.shape.lg).toEqual(
      originalShape
    );
  });
});

describe('configuration persistence boundary', () => {
  it('should pass the complete configuration to the save API when explicit persistence is requested', async () => {
    const before = structuredClone(currentConfig());

    await useConfigStore
      .getState()
      .updateConfig('test-board', (previous) => ({ ...previous, schemaVersion: 2 }), false, true);

    expect(boundary.save).toHaveBeenCalledWith({
      name: 'test-board',
      config: { ...before, schemaVersion: 2 },
    });
    expect(increaseVersion).not.toHaveBeenCalled();
  });
});
