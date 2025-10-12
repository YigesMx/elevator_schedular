import { createContext } from 'react';

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
export const SceneDataContext = createContext({} as SceneData | null);

export const SocketContext = createContext(null as WebSocket | null);

export const LayoutChangeTriggerContext = createContext(false as boolean);