#!/usr/bin/env python3
"""
改进的公交车式电梯调度算法
"""
from typing import List, Dict

from comm.websocket_broadcastor import SceneBroadcastor

from .controller_with_comm import BaseControllerWithComm
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import Direction, SimulationEvent


class ImprovedElevatorBusController(BaseControllerWithComm):
    """
    - 循环运行 (Bus route)
    - 满载时跳过停靠 (除非有人下车)
    - 客户端手动跟踪乘客目的地
    """

    def __init__(self, scene_broadcastor: SceneBroadcastor, server_port=8000, with_delay=False):
        super().__init__(scene_broadcastor=scene_broadcastor, server_port=server_port, with_delay=with_delay)
        self.all_passengers: List[ProxyPassenger] = []
        self.max_floor = 0
        
        # 结构: {elevator_id: {passenger_id: destination_floor}}
        # -------------------
        self.passenger_destinations_tracker: Dict[int, Dict[int, int]] = {}

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        super().on_init(elevators, floors)
        print("🚌 修复版公交车算法已启动 (满载将跳过)")
        self.max_floor = floors[-1].floor
        self.floors = floors
        
        for i, elevator in enumerate(elevators):
            # 均匀分布电梯
            target_floor = (i * (len(floors) - 1)) // len(elevators)
            elevator.go_to_floor(target_floor, immediate=True)
            
            # -------------------
            self.passenger_destinations_tracker[elevator.id] = {}

    def on_event_execute_start(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        # 打印状态
        print(f"Tick {tick}: 即将处理 {len(events)} 个事件")
        for i in elevators:
            # 打印我们自己跟踪的目的地列表
            destinations = list(self.passenger_destinations_tracker[i.id].values())
            print(
                f"\tE{i.id}[{i.target_floor_direction.value},"
                f"{i.current_floor_float:.1f}/{i.target_floor}] "
                f"Dest:{destinations} " 
                + "👦" * len(i.passengers),
                end="",
            )
        print()

    def on_event_execute_end(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        super().on_event_execute_end(tick, events, elevators, floors)
        pass

    def on_passenger_call(self, passenger:ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        super().on_passenger_call(passenger, floor, direction)
        self.all_passengers.append(passenger)
        print(f"乘客 {passenger.id} F{floor.floor} 请求 {passenger.origin} -> {passenger.destination} ({direction})")

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        print(f"E{elevator.id} 空闲，前往 F1")
        elevator.go_to_floor(1)

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        super().on_elevator_stopped(elevator, floor)
        print(
            f"🛑 电梯 E{elevator.id} 停靠在 F{floor.floor}. "
            f"载客: {len(elevator.passengers)}/{elevator.max_capacity}"
        )
        # 公交车算法 - 决定下一站
        if elevator.last_tick_direction == Direction.UP and elevator.current_floor == self.max_floor:
            print(f"  E{elevator.id} 到达顶层，转向下行")
            elevator.go_to_floor(elevator.current_floor - 1)
        elif elevator.last_tick_direction == Direction.DOWN and elevator.current_floor == 0:
            print(f"  E{elevator.id} 到达底层，转向上行")
            elevator.go_to_floor(elevator.current_floor + 1)
        elif elevator.last_tick_direction == Direction.UP:
            print(f"  E{elevator.id} (上行) 前往下一站 F{elevator.current_floor + 1}")
            elevator.go_to_floor(elevator.current_floor + 1)
        elif elevator.last_tick_direction == Direction.DOWN:
            print(f"  E{elevator.id} (下行) 前往下一站 F{elevator.current_floor - 1}")
            elevator.go_to_floor(elevator.current_floor - 1)

    def on_passenger_board(self, elevator: ProxyElevator, passenger: ProxyPassenger) -> None:
        print(f" 乘客{passenger.id} E{elevator.id}⬆️ F{elevator.current_floor} -> F{passenger.destination}")
        

        self.passenger_destinations_tracker[elevator.id][passenger.id] = passenger.destination

    def on_passenger_alight(self, elevator: ProxyElevator, passenger: ProxyPassenger, floor: ProxyFloor) -> None:
        print(f" 乘客{passenger.id} E{elevator.id}⬇️ F{floor.floor}")
        
        if passenger.id in self.passenger_destinations_tracker[elevator.id]:
            del self.passenger_destinations_tracker[elevator.id][passenger.id]

    def on_elevator_passing_floor(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        print(f"🔄 电梯 E{elevator.id} 经过 F{floor.floor} (方向: {direction})")

    def on_elevator_approaching(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        print(f"🎯 电梯 E{elevator.id} 即将到达 F{floor.floor} (方向: {direction})")

        # 检查1: 电梯是否满载？
        if not elevator.is_full:
            print(f"  E{elevator.id} 未满载，正常停靠。")
            return
        
        # 获取这部电梯所有乘客的目的地
        current_elevator_destinations = self.passenger_destinations_tracker[elevator.id].values()

        # 检查2: 满载状态下，是否有人要在此层下车？
        if floor.floor in current_elevator_destinations:
            # 满载，但有乘客要下车，必须停靠
            print(f"  E{elevator.id} 已满载，但有乘客在 F{floor.floor} 下车，正常停靠。")
            return

        # 结论: 电梯已满载，且此层无人下车。执行跳过。
        print(
            f"  E{elevator.id} 已满载 (载客 {len(elevator.passengers)}/{elevator.max_capacity}) "
            f"且 F{floor.floor} 无乘客下车。"
        )

        # 执行跳过
        if direction == Direction.UP.value and floor.floor < self.max_floor:
            new_target = floor.floor + 1
            print(f"  跳过 F{floor.floor}，立即前往 F{new_target}")
            elevator.go_to_floor(new_target, immediate=True)
        elif direction == Direction.DOWN.value and floor.floor > 0:
            new_target = floor.floor - 1
            print(f"  跳过 F{floor.floor}，立即前往 F{new_target}")
            elevator.go_to_floor(new_target, immediate=True)
        else:
            print(f"  E{elevator.id} 在终点站，正常停靠。")
            return

    def on_elevator_move(
        self, elevator: ProxyElevator, from_position: float, to_position: float, direction: str, status: str
    ) -> None:
        pass