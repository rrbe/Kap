import React, {useCallback, useContext, useMemo, useSyncExternalStore} from 'react';

type State = Record<string, any>;
type ContainerType = Container | (new () => Container);

const StateContext = React.createContext<Map<unknown, Container> | null>(null);

export class Container<T extends State = State> {
  state!: T;

  private version = 0;
  private readonly listeners = new Set<() => void>();

  setState = (update: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState = typeof update === 'function' ? update(this.state) : update;
    this.state = {...this.state, ...nextState};
    this.version++;

    for (const listener of this.listeners) {
      listener();
    }
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;
}

export const Provider = ({inject = [], children}: {inject?: Container[]; children: React.ReactNode}) => {
  const parent = useContext(StateContext);
  const value = useMemo(() => {
    const containers = new Map(parent ?? []);
    for (const container of inject) {
      containers.set(container.constructor, container);
    }

    return containers;
  }, [inject, parent]);

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
};

export const Subscribe = ({to, children}: {to: ContainerType[]; children: (...containers: Container[]) => React.ReactNode}) => {
  const stateMap = useContext(StateContext);

  if (!stateMap) {
    throw new Error('Subscribe must be wrapped in a Provider');
  }

  const instances = useMemo(() => to.map(ContainerItem => {
    if (ContainerItem instanceof Container) {
      return ContainerItem;
    }

    const existing = stateMap.get(ContainerItem);
    if (existing) {
      return existing;
    }

    const instance = new ContainerItem();
    stateMap.set(ContainerItem, instance);
    return instance;
  }), [stateMap, to]);

  const subscribe = useCallback((listener: () => void) => {
    const unsubscribe = instances.map(container => container.subscribe(listener));
    return () => {
      for (const dispose of unsubscribe) {
        dispose();
      }
    };
  }, [instances]);
  const getSnapshot = useCallback(() => instances.map(container => container.getVersion()).join(':'), [instances]);

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return children(...instances);
};
