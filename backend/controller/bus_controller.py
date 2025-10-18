#!/usr/bin/env python3
from typing import List
import time

from .controller_with_comm import BaseControllerWithComm
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import SimulationEvent, Direction

from comm.websocket_broadcastor import SceneBroadcastor
from scene.scene_manager import SceneManager

class SimpleElevatorBusController(BaseControllerWithComm):
    def __init__(self, scene_broadcastor: SceneBroadcastor, server_port=8000, with_delay=False):
        super().__init__(scene_broadcastor=scene_broadcastor, server_port=server_port, with_delay=with_delay)

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        super().on_init(elevators, floors)
        
        # prepare algorithm
        for i, elevator in enumerate(elevators):
            # 计算目标楼层 - 均匀分布在不同楼层
            target_floor = (i * (len(floors) - 1)) // len(elevators)
            # 立刻移动到目标位置并开始循环
            elevator.go_to_floor(target_floor, immediate=True)
            

    def on_event_execute_start(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        super().on_event_execute_start(tick, events, elevators, floors)

    def on_passenger_call(self, passenger:ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        super().on_passenger_call(passenger, floor, direction)

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        elevator.go_to_floor(1)  # 默认回到1楼
        pass

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        super().on_elevator_stopped(elevator, floor)
        
        # BUS调度算法，电梯到达顶层后，立即下降一层
        if elevator.last_tick_direction == Direction.UP and elevator.current_floor == self.max_floor:
            elevator.go_to_floor(elevator.current_floor - 1)
        # 电梯到达底层后，立即上升一层
        elif elevator.last_tick_direction == Direction.DOWN and elevator.current_floor == 0:
            elevator.go_to_floor(elevator.current_floor + 1)
        elif elevator.last_tick_direction == Direction.UP:
            elevator.go_to_floor(elevator.current_floor + 1)
        elif elevator.last_tick_direction == Direction.DOWN:
            elevator.go_to_floor(elevator.current_floor - 1)

    def on_passenger_board(self, elevator: ProxyElevator, passenger: ProxyPassenger) -> None:
        pass

    def on_passenger_alight(self, elevator: ProxyElevator, passenger: ProxyPassenger, floor: ProxyFloor) -> None:
        pass

    def on_elevator_passing_floor(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        pass

    def on_elevator_approaching(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        pass
    
    def on_event_execute_end(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        super().on_event_execute_end(tick, events, elevators, floors)
        pass