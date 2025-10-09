import { createContext } from 'react';

type SceneData = null|object;
export const SceneDataContext = createContext({} as SceneData);

export const SocketContext = createContext({} as WebSocket | null);