#!/usr/bin/env python3
"""
 (Advanced Elevator Controller: Dynamic SCAN with Immediate Re-tasking)
"""
import time
from typing import Dict, List, Set, Any, Optional

from elevator_saga.client.base_controller import ElevatorController
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import Direction, SimulationEvent

# --- 算法可调参数 (Algorithm Tunables) ---
LOAD_PENALTY_FACTOR = 20.0
WAITING_TIME_BONUS_FACTOR = 0.5
TIME_PER_FLOOR = 5.0

class ScanElevatorController(ElevatorController):
    def __init__(self, if_gui: bool = False):
        super().__init__("http://localhost:8000", True)
        self.if_gui = if_gui

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        print("🚀 调度算法初始化...")
        self.max_floor = len(floors) - 1
        self.elevators = elevators
        self.elevator_states: Dict[int, Dict[str, Any]] = {
            e.id: {"direction": Direction.UP, "destinations": set()}
            for e in elevators
        }
        self.unassigned_requests: Dict[int, Dict[Direction, int]] = {}

    def on_event_execute_start(self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        """在每个tick开始时，仅更新当前时间"""
        self.current_tick = tick
        # 打印简化的状态信息，替代指令风暴
        # print(f"--- Tick {tick} ---")
        # for e in elevators:
        #     state = self.elevator_states[e.id]
        #     dest_str = ",".join(map(str, sorted(list(state['destinations']))))
        #     print(f"  E{e.id}: Floor {e.current_floor_float:.1f} -> {e.target_floor} | Dir: {state['direction'].value} | Load: {len(e.passengers)} | Dests: [{dest_str}]")

    def on_event_execute_end(self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        """
        在一个tick的末尾进行统一决策，这是修正的核心。
        """
        # 1. 统一分配所有当前未处理的请求
        self._assign_requests()

        # 2. 为每一部电梯更新其最终目标
        for elevator in self.elevators:
            self._update_elevator_target(elevator)
        

        if self.if_gui:
            time.sleep(0.1)

    def on_passenger_call(self, passenger: ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        """只记录请求，不立即做决定"""
        call_direction = Direction.UP if direction == "up" else Direction.DOWN
        if floor.floor not in self.unassigned_requests:
            self.unassigned_requests[floor.floor] = {}
        if call_direction not in self.unassigned_requests[floor.floor]:
             self.unassigned_requests[floor.floor][call_direction] = self.current_tick

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        """电梯空闲时，切换方向以探索新任务"""
        state = self.elevator_states[elevator.id]
        if not state["destinations"]:
            state["direction"] = Direction.DOWN if state["direction"] == Direction.UP else Direction.UP

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        """电梯停靠时，只更新状态"""
        self.elevator_states[elevator.id]["destinations"].discard(floor.floor)

    def on_passenger_board(self, elevator: ProxyElevator, passenger: ProxyPassenger) -> None:
        """乘客上车后，只更新目标集合"""
        self.elevator_states[elevator.id]["destinations"].add(passenger.destination)

    def _assign_requests(self) -> None:
        """遍历所有未分配的请求，并将它们添加到最合适的电梯的目标集合中"""
        # 创建副本以安全地在循环中修改原始字典
        for floor, calls in self.unassigned_requests.copy().items():
            for direction, call_time in calls.copy().items():
                best_elevator, min_cost = None, float('inf')

                for elevator in self.elevators:
                    cost = self._calculate_cost(elevator, floor, direction, call_time)
                    if cost < min_cost:
                        min_cost, best_elevator = cost, elevator
                
                if best_elevator:
                    self.elevator_states[best_elevator.id]["destinations"].add(floor)
                    # **重要**: 不在此处调用 _update_elevator_target
                    del self.unassigned_requests[floor][direction]
                    if not self.unassigned_requests[floor]:
                        del self.unassigned_requests[floor]

    def _calculate_cost(self, elevator: ProxyElevator, call_floor: int, call_direction: Direction, call_time: int) -> float:
        """计算成本，逻辑不变"""
        state = self.elevator_states[elevator.id]
        current_direction = state["direction"]
        is_idle = not state["destinations"]

        if not is_idle and current_direction != call_direction: return float('inf')
        if not is_idle:
            if current_direction == Direction.UP and elevator.current_floor > call_floor: return float('inf')
            if current_direction == Direction.DOWN and elevator.current_floor < call_floor: return float('inf')
        
        distance = abs(elevator.current_floor - call_floor)
        pickup_cost = distance * TIME_PER_FLOOR
        load_penalty = len(elevator.passengers) * LOAD_PENALTY_FACTOR
        waiting_bonus = (self.current_tick - call_time) * WAITING_TIME_BONUS_FACTOR
        return pickup_cost + load_penalty - waiting_bonus

    def _update_elevator_target(self, elevator: ProxyElevator) -> None:
        """根据目标集合，更新电梯的唯一最终目标"""
        state = self.elevator_states[elevator.id]
        destinations, current_direction = state["destinations"], state["direction"]
        next_stop: Optional[int] = None

        if current_direction == Direction.UP:
            potential_stops = [d for d in destinations if d > elevator.current_floor]
            if potential_stops: next_stop = min(potential_stops)
        else: # Direction.DOWN
            potential_stops = [d for d in destinations if d < elevator.current_floor]
            if potential_stops: next_stop = max(potential_stops)

        if next_stop is None and destinations:
            new_direction = Direction.DOWN if current_direction == Direction.UP else Direction.UP
            state["direction"] = new_direction
            # 掉头后重新寻找目标
            if new_direction == Direction.UP:
                potential_stops = [d for d in destinations if d >= elevator.current_floor]
                if potential_stops: next_stop = min(potential_stops)
            else:
                potential_stops = [d for d in destinations if d <= elevator.current_floor]
                if potential_stops: next_stop = max(potential_stops)
        
        if next_stop is not None and elevator.target_floor != next_stop:
            elevator.go_to_floor(next_stop, immediate=False)
            
    # --- 以下方法为框架要求，保留为空即可 ---
    def on_passenger_alight(self, elevator: ProxyElevator, passenger: ProxyPassenger, floor: ProxyFloor) -> None: pass
    def on_elevator_passing_floor(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None: pass
    def on_elevator_approaching(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None: pass


if __name__ == "__main__":
    algorithm = ScanElevatorController(if_gui=True)
    algorithm.start()