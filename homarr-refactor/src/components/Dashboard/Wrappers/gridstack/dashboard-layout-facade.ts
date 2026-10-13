import { GridStack } from 'fily-publish-gridstack';
import type { GridItemHTMLElement, GridStackNode } from 'fily-publish-gridstack';
import type { ShapeType } from '~/types/shape';

export type LayoutItemChange = {
  itemId?: string | null;
  itemType?: string | null;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type TileWithUnknownLocation = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  type: 'app' | 'widget';
  id: string;
};

type LayoutItem = {
  id: string;
  type: 'app' | 'widget';
  shape: ShapeType;
  element: HTMLDivElement | null | undefined;
};

type LayoutOptions = {
  areaType: 'wrapper' | 'category' | 'sidebar';
  areaId: string;
  container: HTMLDivElement | null;
  items: LayoutItem[];
  editMode: boolean;
  columnCount: number;
  shapeSize: 'sm' | 'md' | 'lg';
  onChange: (item: LayoutItemChange) => void;
  onAdd: (item: LayoutItemChange) => void;
};

/** Coordinates the GridStack subsystem without owning React or board configuration. */
export class DashboardLayoutFacade {
  private grid?: GridStack;

  constructor(private readonly root: HTMLElement) {}

  get initialized() {
    return this.grid !== undefined;
  }

  updateDimensions(areaType: LayoutOptions['areaType'], width: number, columnCount: number) {
    if (areaType !== 'sidebar') {
      const itemWidth = width / columnCount;
      this.root.style.setProperty('--gridstack-widget-width', itemWidth.toString());
      this.grid?.cellHeight(itemWidth);
    }
    this.root.style.setProperty('--gridstack-column-count', columnCount.toString());
  }

  initialize(options: LayoutOptions): TileWithUnknownLocation[] {
    const { areaType, areaId, container, columnCount, editMode, items, shapeSize } = options;
    const unknownLocations: TileWithUnknownLocation[] = [];
    if (!container) return unknownLocations;

    const columns = areaType === 'sidebar' ? 2 : columnCount;
    this.grid = GridStack.init(
      {
        column: columns,
        margin: areaType === 'sidebar' ? 5 : 10,
        cellHeight: 128,
        float: true,
        alwaysShowResizeHandle: 'mobile',
        acceptWidgets: true,
        disableOneColumnMode: true,
        staticGrid: !editMode,
        minRow: areaType !== 'sidebar' ? 1 : Math.floor(container.offsetHeight / 128),
        animate: false,
      },
      `.grid-stack-${areaType}[data-${areaType}='${areaId}']`
    );
    const grid = this.grid;
    grid.column(columns, 'none');
    grid.on('change', (_, nodes) =>
      this.forwardFirstItem(nodes as GridStackNode[], options.onChange)
    );
    grid.on('added', (_, nodes) => this.forwardFirstItem(nodes as GridStackNode[], options.onAdd));

    grid.batchUpdate();
    grid.removeAll(false);
    items.forEach(({ id, type, shape, element }) => {
      const sizedShape = shape[shapeSize];
      if (sizedShape && element) {
        element.setAttribute('gs-x', sizedShape.location.x.toString());
        element.setAttribute('gs-y', sizedShape.location.y.toString());
        element.setAttribute('gs-w', sizedShape.size.width.toString());
        element.setAttribute('gs-h', sizedShape.size.height.toString());
      }
      if (element) grid.makeWidget(element);
      if (!sizedShape && element) {
        const node = (element as GridItemHTMLElement).gridstackNode;
        if (node) {
          const { x, y, w, h } = node;
          unknownLocations.push({ x, y, w, h, type, id });
        }
      }
    });
    grid.batchUpdate(false);
    return unknownLocations;
  }

  releaseEvents() {
    this.grid?.off('change');
    this.grid?.off('added');
  }

  private forwardFirstItem(
    nodes: GridStackNode[] | undefined,
    callback: LayoutOptions['onChange']
  ) {
    const node = nodes?.at(0);
    if (!node) return;
    callback({
      itemId: node.el?.getAttribute('data-id'),
      itemType: node.el?.getAttribute('data-type'),
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    });
  }
}
