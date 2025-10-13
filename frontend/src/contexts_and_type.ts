import { useState, createContext } from 'react';

// Types

export type ConnectMethod = 'websocket_to_algorithm' | 'http_to_server';

export type Direction = 'up' | 'down' | 'stopped';

export type ElevatorStatus = 'stopped' | 'start_up' | 'start_down' | 'constant_speed';

export type PassengerStatus = 'waiting' | 'in_elevator' | 'arrived';

export type ElevatorDict = {
    id: number;
    current_pos: number;
    target_floor: number | null;
    is_idle: boolean;
    run_status: 'stopped' | 'start_up' | 'start_down' | 'constant_speed';
    target_floor_direction: 'up' | 'down' | 'stopped';
    passengers: number[];
};

export type FloorDict = {
    id: number;
    up_queue: number[];
    down_queue: number[];
};

export type PassengerDict = {
    id: number;
    origin: number;
    destination: number;
    arrive_tick: number;
    pickup_tick: number | null;
    dropoff_tick: number | null;
    elevator_id: number | null;
    status: 'waiting' | 'in_elevator' | 'arrived';
    wait_time: number;
    system_time: number;
    travel_direction: 'up' | 'down' | 'stopped';
};

export type SceneDict = {
    building: {
        floors: number;
        elevators: number;
        elevator_capacity: number;
    };
    current: {
        tick: number;
        max_tick?: number;
    }
    elevators: {
        [key: string]: ElevatorDict
    };
    floors: {
        [key: string]: FloorDict
    };
    passengers: {
        [key: string]: PassengerDict
    };

}

export type SceneData = {
    status?: string;
    scene?: SceneDict;
    prev_scene?: SceneDict;
}

export type MetricsData = {
    completed_passengers: number;
    total_passengers: number;
    average_floor_wait_time: number;
    average_arrival_wait_time: number;
    p95_floor_wait_time: number;
    p95_arrival_wait_time: number;
    completion_rate: number; // percentage
}

// Contexts

export const SocketContext = createContext(null as WebSocket | null);
export const SceneDataContext = createContext({} as SceneData | null);
export const MetricsDataContext = createContext({} as MetricsData | null);
export const LogsDataContext = createContext([] as string[]);
export const LayoutChangeTriggerContext = createContext(false as boolean);

// custom update log hook
export const useLogsData = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (newLog: string) => {
        setLogs((prevLogs) => {
            const updatedLogs = [...prevLogs, newLog];
            // keep only the last 1000 logs
            if (updatedLogs.length > 1000) {
                updatedLogs.shift();
            }
            return updatedLogs;
        });
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return { logs, addLog, clearLogs };
};


// Constants

export const durationTime = 100; // milliseconds
export const firstRenderDurationTime = 60; // milliseconds

export const statisticStackNum = 10;