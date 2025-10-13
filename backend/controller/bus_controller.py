#!/usr/bin/env python3
from typing import List
import time

from elevator_saga.client.base_controller import ElevatorController
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import SimulationEvent, Direction

from comm.websocket_broadcastor import SceneBroadcastor
from scene.scene_manager import SceneManager

class SimpleElevatorBusController(ElevatorController):
    def __init__(self, scene_broadcastor: SceneBroadcastor):
        super().__init__("http://127.0.0.1:8000", True)
        self.scene_broadcastor = scene_broadcastor

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        self.all_passengers: List[ProxyPassenger] = []
        self.all_elevators: List[ProxyElevator] = []
        self.all_floors: List[ProxyFloor] = []
        
        self.max_floor = floors[-1].floor
        self.all_floors = floors
        self.all_elevators = elevators
        
        # prepare algorithm
        for i, elevator in enumerate(elevators):
            # 计算目标楼层 - 均匀分布在不同楼层
            target_floor = (i * (len(floors) - 1)) // len(elevators)
            # 立刻移动到目标位置并开始循环
            elevator.go_to_floor(target_floor, immediate=True)

        # prepare scene manager
        self.scene_manager = SceneManager()
        self.scene_manager.set_building_info(len(floors), len(elevators), elevators[0].max_capacity)
        self.scene_manager.set_elevator_floor_passenger_container(self.all_elevators, self.all_floors, self.all_passengers)
        
        # self.scene_broadcastor.server_scene_update(self.scene_manager.scene_json_str)
            

    def on_event_execute_start(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        self.scene_manager.update_current_tick(tick)
        
        self.scene_broadcastor.server_log(f"Tick {tick}: 即将处理 {len(events)} 个事件 {[e.type.value for e in events]}")
        
        for i in elevators:
            print(f"\t{i.id}[{i.target_floor_direction.value},{i.current_floor_float}->{i.target_floor}]" + "👦" * len(i.passengers), end="")
        print()

    def on_passenger_call(self, passenger:ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        self.all_passengers.append(passenger)
        pass

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        elevator.go_to_floor(1)

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        print(f"🛑 电梯 E{elevator.id} 停靠在 F{floor.floor}")
        
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
        self.scene_broadcastor.server_scene_update(self.scene_manager.scene_dict)
        # self.scene_broadcastor.wait_for_client_confirmation()
        time.sleep(0.1) # 给前端留时间
        
        if tick == self.current_traffic_max_tick-1:
            final_state = self.api_client.get_state()
            metrics = final_state.metrics
            self.scene_broadcastor.server_metrics_update({
                "completed_passengers": metrics.completed_passengers,
                "total_passengers": metrics.total_passengers,
                "average_wait_time": metrics.average_wait_time,
                "p95_wait_time":  metrics.p95_wait_time,
                "average_system_time":  metrics.average_system_time,
                "p95_system_time":  metrics.p95_system_time,
                "completion_rate": metrics.completion_rate,
            })
            
            
        pass