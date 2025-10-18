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
        # 当有新乘客时，重新评估所有空闲电梯的决策
        for e in self.elevators:
            if e.is_idle:
                self._decide_next_floor(e, self.floors)

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        print(f"E{elevator.id} 空闲，重新决策...")
        self._decide_next_floor(elevator, self.floors)

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        super().on_elevator_stopped(elevator, floor)
        print(
            f"🛑 电梯 E{elevator.id} 停靠在 F{floor.floor}. "
            f"载客: {len(elevator.passengers)}/{elevator.max_capacity}"
        )
        # 停靠后，重新决策下一步去哪里
        self._decide_next_floor(elevator, self.floors)

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

    def _decide_next_floor(self, elevator: ProxyElevator, floors: List[ProxyFloor]):
        """决定电梯的下一个目标楼层（修复版 v3）"""
        current_floor = elevator.current_floor

        # 0. 端点处理：如果到达顶层或底层，强制掉头，避免卡死
        if current_floor == self.max_floor:
            print(f"  E{elevator.id} 到达顶层，强制掉头向下。")
            elevator.go_to_floor(current_floor - 1)
            return
        if current_floor == 0:
            print(f"  E{elevator.id} 到达底层，强制掉头向上。")
            elevator.go_to_floor(current_floor + 1)
            return
            
        # 如果电梯正在移动，保持当前方向；否则以上行为默认启动方向
        direction = elevator.last_tick_direction if elevator.last_tick_direction != Direction.STOPPED else Direction.UP

        # 1. 获取所有内部和外部请求（排除当前楼层）
        internal_destinations = set(self.passenger_destinations_tracker[elevator.id].values())
        external_requests = []
        for f in floors:
            if f.up_queue:
                external_requests.append((f.floor, Direction.UP))
            if f.down_queue:
                external_requests.append((f.floor, Direction.DOWN))
        
        # 排除当前楼层的所有请求
        all_requests = (internal_destinations.union({floor for floor, _ in external_requests})) - {current_floor}

        # 如果没有任何请求，原地待命
        if not all_requests:
            print(f"  E{elevator.id} 无任何请求（排除当前楼层），原地待命。")
            return

        # 2. 如果电梯是空的，它可以去服务最近的请求（排除当前楼层）
        if not internal_destinations and external_requests:
            external_requests_excluding_current = [(floor, d) for floor, d in external_requests if floor != current_floor]
            if external_requests_excluding_current:
                closest_req_floor, _ = min(external_requests_excluding_current, key=lambda r: abs(r[0] - current_floor))
                print(f"  E{elevator.id} 空载，前往最近请求 F{closest_req_floor}")
                elevator.go_to_floor(closest_req_floor)
                return

        # 3. 寻找当前方向上的目标（排除当前楼层）
        potential_targets = (internal_destinations.union(
            {floor for floor, req_dir in external_requests if req_dir == direction}
        )) - {current_floor}
        
        forward_targets = set()
        if direction == Direction.UP:
            forward_targets = {t for t in potential_targets if t > current_floor}
        else: # direction == Direction.DOWN
            forward_targets = {t for t in potential_targets if t < current_floor}

        if forward_targets:
            next_target = min(forward_targets) if direction == Direction.UP else max(forward_targets)
            print(f"  E{elevator.id} ({direction.value}) 发现前方同向目标 {forward_targets}，选择最近的 F{next_target}")
            elevator.go_to_floor(next_target)
            return

        # 3.5. 优化：如果前方没有同向目标，但电梯未满，检查是否可以继续前行接载反向乘客
        if not elevator.is_full and internal_destinations:
            # 检查前方是否有反向的外部请求
            opposite_direction = Direction.DOWN if direction == Direction.UP else Direction.UP
            forward_opposite_requests = set()
            
            if direction == Direction.UP:
                # 电梯上行，寻找上方的下行请求
                forward_opposite_requests = {floor for floor, req_dir in external_requests 
                                            if req_dir == opposite_direction and floor > current_floor}
            else: # direction == Direction.DOWN
                # 电梯下行，寻找下方的上行请求
                forward_opposite_requests = {floor for floor, req_dir in external_requests 
                                            if req_dir == opposite_direction and floor < current_floor}
            
            if forward_opposite_requests:
                # 找到最远的反向请求，以便路上尽可能多接人
                farthest_opposite = max(forward_opposite_requests) if direction == Direction.UP else min(forward_opposite_requests)
                print(f"  E{elevator.id} ({direction.value}) 前方无同向目标，但未满载，继续前行接载反向乘客至 F{farthest_opposite}")
                elevator.go_to_floor(farthest_opposite)
                return

        # 4. 如果前方没有目标，检查当前楼层是否有事要做（上下客）
        is_passenger_alighting = current_floor in self.passenger_destinations_tracker[elevator.id].values()
        is_passenger_boarding = any(floor_num == current_floor and req_dir == direction for floor_num, req_dir in external_requests)
        if is_passenger_alighting or is_passenger_boarding:
            print(f"  E{elevator.id} 在 F{current_floor} 有乘客处理，但前方无目标，需要决定掉头方向。")
            # 不能 go_to_floor(current_floor)，否则 direction 会变成 STOPPED
            # 应该找到反方向的目标，让电梯明确掉头
            opposite_direction = Direction.DOWN if direction == Direction.UP else Direction.UP
            opposite_requests = {floor for floor, req_dir in external_requests if req_dir == opposite_direction and floor != current_floor}
            all_opposite_targets = (opposite_requests.union(internal_destinations)) - {current_floor}
            
            if all_opposite_targets:
                # 掉头后，去反方向最远的目标
                if opposite_direction == Direction.UP:
                    turnaround_target = max(all_opposite_targets)
                else:
                    turnaround_target = min(all_opposite_targets)
                print(f"  E{elevator.id} 完成当前楼层任务后，将掉头({opposite_direction.value})前往 F{turnaround_target}")
                elevator.go_to_floor(turnaround_target)
                return
            else:
                # 如果没有反方向目标，但当前楼层有事做，说明这是最后的任务
                # 那就保持等待，或者执行端点掉头逻辑
                print(f"  E{elevator.id} 在 F{current_floor} 有乘客处理，但无其他目标，等待后续指令。")
                return

        # 5. 如果前方无目标，当前楼层也无事可做，则掉头服务
        opposite_direction = Direction.DOWN if direction == Direction.UP else Direction.UP
        opposite_requests = {floor for floor, req_dir in external_requests if req_dir == opposite_direction and floor != current_floor}
        # 内部请求也需要考虑，因为可能有乘客要去反方向
        all_opposite_targets = (opposite_requests.union(internal_destinations)) - {current_floor}

        if all_opposite_targets:
            # 掉头后，应该去最“远”的那个点，以包含所有路上的请求
            if opposite_direction == Direction.UP:
                turnaround_target = max(all_opposite_targets)
            else: # opposite_direction == Direction.DOWN
                turnaround_target = min(all_opposite_targets)
            print(f"  E{elevator.id} 在 {direction.value} 方向上无目标，掉头({opposite_direction.value})服务最远请求 F{turnaround_target}")
            elevator.go_to_floor(turnaround_target)
            return
            
        # 6. 最后的保障：如果只有同向但反向的请求（例如电梯在5楼向上，但请求在3楼向上），服务最远的
        # 排除当前楼层
        remaining_requests = all_requests - {current_floor}
        if remaining_requests:
            farthest_target = max(remaining_requests, key=lambda f: abs(f - current_floor))
            print(f"  E{elevator.id} 无前方同向目标，服务最远请求 F{farthest_target}")
            elevator.go_to_floor(farthest_target)
            return
