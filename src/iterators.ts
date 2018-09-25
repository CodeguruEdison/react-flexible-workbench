import { ContentItem } from "golden-layout";

import { Workbench } from "./workbench";

/**
 * String constants defining the known iteration orders.
 */
export type IterationOrder = "dfsReverse";

export interface IIterationOptions {
  order: IterationOrder;
}

/**
 * Interface specification for generic trees. Used to provide a common
 * framework for iterating over the existing content items of a workbench
 * and for iterating over the panel configuration of a workbench.
 */
interface ITree<T> {
  getRoot: () => T | undefined;
  getChild: (item: T, index: number) => T | undefined;
}

/**
 * Generic reverse depth-first iteration that iterates over a tree specified
 * using an object satisfying ITree<T>.
 */
function dfsReverseIterator<T>(tree: ITree<T>): Iterator<T> {
  const stack: Array<{ item: T, index: number }> = [];
  const root = tree.getRoot();

  if (root) {
    stack.push({ index: 0, item: root });
  }

  return {
    next(): IteratorResult<T> {
      while (stack.length > 0) {
        const entry = stack[stack.length - 1];
        const { item, index } = entry;
        const child = tree.getChild(item, index);

        if (child === undefined) {
          // All children traversed; yield the item itself and pop it
          stack.pop();
          return {
            done: stack.length === 0,
            value: item
          };
        } else {
          // Put the appropriate child on the stack
          entry.index++;
          stack.push({ index: 0, item: child });
        }
      }

      return { done: true } as any;
    }
  };
}

/**
 * Filters an iterator and returns only those items that match a given
 * condition.
 *
 * @param  iterator  the iterator to filter
 * @param  condition the condition to test
 * @return another iterator that returns only those items that match the given
 *         condition
 */
function filter<T>(iterator: Iterator<T>, condition: (item: T) => boolean): Iterator<T> {
  return {
    next(): IteratorResult<T> {
      while (true) {
        const entry = iterator.next();
        if (entry.done) {
          if (entry.hasOwnProperty("value")) {
            const { value } = entry;
            if (condition(value)) {
              return { done: true, value };
            } else {
              return { done: true } as any;
            }
          } else {
            return { done: true } as any;
          }
        } else {
          const { value } = entry;
          if (condition(value)) {
            return { done: false, value };
          }
        }
      }
    }
  };
}

/**
 * Creates an ITree object that allows the traversal of the content items of a
 * workbench.
 *
 * @param  workbench  the workbench to traverse
 */
function workbenchAsTree(workbench: Workbench): ITree<ContentItem> {
  return {
    getChild: (item: ContentItem, index: number) => item.contentItems[index],
    getRoot: () => workbench.layout ? workbench.layout.root : undefined
  };
}

/**
 * Iterates over the content items of the workbench according to some iteration
 * order.
 *
 * Both panels (leaf nodes) and containers (rows, columns and stacks) will be
 * returned by the iterator. If you need the panels only, use `panelsIn()`.
 * If you need the containers only, use `containersIn()`.
 *
 * @param  workbench the workbench whose content items are to be iterated over
 * @param  options   additional options that influence the iterator behaviour
 * @return the iterator
 */
export function contentItemsIn(
  workbench: Workbench,
  options?: Partial<IIterationOptions>
): Iterator<ContentItem> {
  const effectiveOptions: IIterationOptions = {
    order: "dfsReverse",
    ...options
  };
  const tree: ITree<ContentItem> = workbenchAsTree(workbench);

  switch (effectiveOptions.order) {
    case "dfsReverse":
      return dfsReverseIterator(tree);

    default:
      throw new Error("unknown iteration order: " + effectiveOptions.order);
  }
}

/**
 * Iterates over the panels of the workbench according to some iteration order.
 *
 * Only panels will be returned by this iterator; containers will be ignored.
 *
 * @param  workbench the workbench whose panels are to be iterated over
 * @param  options   additional options that influence the iterator behaviour
 * @return the iterator
 */
export function panelsIn(
  workbench: Workbench,
  options?: Partial<IIterationOptions>
): Iterator<ContentItem> {
  return filter(
    contentItemsIn(workbench, options),
    item => item.type === "component"
  );
}

/**
 * Iterates over the containers of the workbench according to some iteration
 * order.
 *
 * Only containers will be returned by this iterator; panels will be ignored.
 *
 * @param  workbench the workbench whose containers are to be iterated over
 * @param  options   additional options that influence the iterator behaviour
 * @return the iterator
 */
export function containersIn(
  workbench: Workbench,
  options?: Partial<IIterationOptions>
): Iterator<ContentItem> {
  return filter(
    contentItemsIn(workbench, options),
    item => item.type !== "component"
  );
}
