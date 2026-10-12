import { MutableRefObject, RefObject, createRef, useEffect, useMemo, useRef } from 'react';
import { useConfigContext } from '~/config/provider';
import { useConfigStore } from '~/config/store';
import { AppType } from '~/types/app';
import { AreaType } from '~/types/area';
import { IWidget } from '~/widgets/widgets';

import { useEditModeStore } from '../../Views/useEditModeStore';
import { DashboardLayoutFacade, LayoutItemChange } from './dashboard-layout-facade';
import { useGridstackStore, useWrapperColumnCount } from './store';

interface UseGristackReturnType {
  apps: AppType[];
  widgets: IWidget<string, any>[];
  refs: {
    wrapper: RefObject<HTMLDivElement>;
    items: MutableRefObject<Record<string, RefObject<HTMLDivElement>>>;
  };
}

export const useGridstack = (
  areaType: 'wrapper' | 'category' | 'sidebar',
  areaId: string
): UseGristackReturnType => {
  const isEditMode = useEditModeStore((x) => x.enabled);
  const { config, configVersion, name: configName } = useConfigContext();
  const updateConfig = useConfigStore((x) => x.updateConfig);
  // define reference for wrapper - is used to calculate the width of the wrapper
  const wrapperRef = useRef<HTMLDivElement>(null);
  // references to the diffrent items contained in the gridstack
  const itemRefs = useRef<Record<string, RefObject<HTMLDivElement>>>({});
  const layoutRef = useRef<DashboardLayoutFacade>();
  if (!layoutRef.current) {
    layoutRef.current = new DashboardLayoutFacade(document.querySelector(':root')!);
  }
  const layout = layoutRef.current;
  const wrapperColumnCount = useWrapperColumnCount();
  const shapeSize = useGridstackStore((x) => x.currentShapeSize);
  const mainAreaWidth = useGridstackStore((x) => x.mainAreaWidth);

  if (!mainAreaWidth || !shapeSize || !wrapperColumnCount) {
    throw new Error('UseGridstack should not be executed before mainAreaWidth has been set!');
  }

  const items = useMemo(
    () =>
      config?.apps.filter(
        (x) =>
          x.area.type === areaType &&
          (x.area.type === 'sidebar'
            ? x.area.properties.location === areaId
            : x.area.properties.id === areaId)
      ) ?? [],
    [configVersion, config?.apps.length]
  );
  const widgets = useMemo(() => {
    if (!config) return [];
    return config.widgets.filter(
      (w) =>
        w.area.type === areaType &&
        (w.area.type === 'sidebar'
          ? w.area.properties.location === areaId
          : w.area.properties.id === areaId)
    );
  }, [configVersion, config?.widgets.length]);

  // define items in itemRefs for easy access and reference to items
  if (Object.keys(itemRefs.current).length !== items.length + (widgets ?? []).length) {
    items.forEach(({ id }: { id: keyof typeof itemRefs.current }) => {
      itemRefs.current[id] = itemRefs.current[id] || createRef();
    });
    (widgets ?? []).forEach(({ id }) => {
      itemRefs.current[id] = itemRefs.current[id] || createRef();
    });
  }

  useEffect(() => {
    layout.updateDimensions(areaType, mainAreaWidth, wrapperColumnCount);
  }, [mainAreaWidth, wrapperColumnCount, layout.initialized]);

  const onChange = isEditMode
    ? (changedNode: LayoutItemChange) => {
        if (!configName) return;

        const itemType = changedNode.itemType;
        const itemId = changedNode.itemId;
        if (!itemType || !itemId) return;

        // Updates the config and defines the new position of the item
        updateConfig(configName, (previous) => {
          const currentItem =
            itemType === 'app'
              ? previous.apps.find((x) => x.id === itemId)
              : previous.widgets.find((x) => x.id === itemId);
          if (!currentItem) return previous;

          currentItem.shape[shapeSize] = {
            location: {
              x: changedNode.x!,
              y: changedNode.y!,
            },
            size: {
              width: changedNode.w!,
              height: changedNode.h!,
            },
          };

          if (itemType === 'app') {
            return {
              ...previous,
              apps: [
                ...previous.apps.filter((x) => x.id !== itemId),
                { ...(currentItem as AppType) },
              ],
            };
          }

          return {
            ...previous,
            widgets: [
              ...previous.widgets.filter((x) => x.id !== itemId),
              { ...(currentItem as IWidget<string, any>) },
            ],
          };
        });
      }
    : () => {};

  const onAdd = isEditMode
    ? (addedNode: LayoutItemChange) => {
        if (!configName) return;

        const itemType = addedNode.itemType;
        const itemId = addedNode.itemId;
        if (!itemType || !itemId) return;

        // Updates the config and defines the new position and wrapper of the item
        updateConfig(
          configName,
          (previous) => {
            const currentItem =
              itemType === 'app'
                ? previous.apps.find((x) => x.id === itemId)
                : previous.widgets.find((x) => x.id === itemId);
            if (!currentItem) return previous;

            if (areaType === 'sidebar') {
              currentItem.area = {
                type: areaType,
                properties: {
                  location: areaId as 'right' | 'left',
                },
              };
            } else {
              currentItem.area = {
                type: areaType,
                properties: {
                  id: areaId,
                },
              };
            }

            currentItem.shape[shapeSize] = {
              location: {
                x: addedNode.x!,
                y: addedNode.y!,
              },
              size: {
                width: addedNode.w!,
                height: addedNode.h!,
              },
            };

            if (itemType === 'app') {
              return {
                ...previous,
                apps: [
                  ...previous.apps.filter((x) => x.id !== itemId),
                  { ...(currentItem as AppType) },
                ],
              };
            }

            return {
              ...previous,
              widgets: [
                ...previous.widgets.filter((x) => x.id !== itemId),
                { ...(currentItem as IWidget<string, any>) },
              ],
            };
          },
          (prev, curr) => {
            const isApp = itemType === 'app';

            if (isApp) {
              const currItem = curr.apps.find((x) => x.id === itemId);
              const prevItem = prev.apps.find((x) => x.id === itemId);
              if (!currItem || !prevItem) return false;

              return (
                currItem.area.type !== prevItem.area.type ||
                Object.entries(currItem.area.properties).some(
                  ([key, value]) =>
                    prevItem.area.properties[key as keyof AreaType['properties']] !== value
                )
              );
            }

            const currItem = curr.widgets.find((x) => x.id === itemId);
            const prevItem = prev.widgets.find((x) => x.id === itemId);
            if (!currItem || !prevItem) return false;

            return (
              currItem.area.type !== prevItem.area.type ||
              Object.entries(currItem.area.properties).some(
                ([key, value]) =>
                  prevItem.area.properties[key as keyof AreaType['properties']] !== value
              )
            );
          }
        );
      }
    : () => {};

  // initialize the gridstack
  useEffect(() => {
    const removeEventHandlers = () => layout.releaseEvents();
    const tilesWithUnknownLocation = layout.initialize({
      areaType,
      areaId,
      container: wrapperRef.current,
      items: [
        ...items.map((item) => ({
          id: item.id,
          type: 'app' as const,
          shape: item.shape,
          element: itemRefs.current[item.id]?.current,
        })),
        ...widgets.map((item) => ({
          id: item.id,
          type: 'widget' as const,
          shape: item.shape,
          element: itemRefs.current[item.id]?.current,
        })),
      ],
      editMode: isEditMode,
      columnCount: wrapperColumnCount,
      shapeSize,
      onChange,
      onAdd,
    });
    if (!configName) return removeEventHandlers;
    updateConfig(configName, (prev) => ({
      ...prev,
      apps: prev.apps.map((app) => {
        const currentUnknownLocation = tilesWithUnknownLocation.find(
          (x) => x.type === 'app' && x.id === app.id
        );
        if (!currentUnknownLocation) return app;

        return {
          ...app,
          shape: {
            ...app.shape,
            [shapeSize]: {
              location: {
                x: currentUnknownLocation.x,
                y: currentUnknownLocation.y,
              },
              size: {
                width: currentUnknownLocation.w,
                height: currentUnknownLocation.h,
              },
            },
          },
        };
      }),
      widgets: prev.widgets.map((widget) => {
        const currentUnknownLocation = tilesWithUnknownLocation.find(
          (x) => x.type === 'widget' && x.id === widget.id
        );
        if (!currentUnknownLocation) return widget;

        return {
          ...widget,
          shape: {
            ...widget.shape,
            [shapeSize]: {
              location: {
                x: currentUnknownLocation.x,
                y: currentUnknownLocation.y,
              },
              size: {
                width: currentUnknownLocation.w,
                height: currentUnknownLocation.h,
              },
            },
          },
        };
      }),
    }));
    return removeEventHandlers;
  }, [items, wrapperRef.current, widgets, wrapperColumnCount]);

  return {
    apps: items,
    widgets: widgets ?? [],
    refs: {
      items: itemRefs,
      wrapper: wrapperRef,
    },
  };
};
