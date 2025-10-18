#!/usr/bin/env python3
"""
方案三：成本函数调度算法 (Cost-Function Dispatcher)

该算法通过为每个“电梯-呼叫”组合计算一个“成本”，来做出最优的调度决策。
成本函数综合考虑了预计到达时间、方向匹配度、电梯负载等多个因素。
这是所有方案中最智能但也最复杂的算法。
"""
import math
import time
from typing import Dict, List, Set, Tuple

# 导入控制器基类、代理模型和核心数据模型
from elevator_saga.client.base_controller import ElevatorController
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import Direction, SimulationEvent


class CostFunctionController(ElevatorController):
    """
    使用成本函数进行调度的控制器
    """

    def __init__(self, server_url: str = "http://127.0.0.1:8000", debug: bool = False):
        """初始化控制器和成本函数的权重"""
        super().__init__(server_url, debug)
        
        self.elevator_directions: Dict[int, Direction] = {}
        self.stop_list: Dict[int, Set[int]] = {}
        self.max_floor = 0
        
        # 存储未被分配的外部呼叫 (floor, direction)
        self.unassigned_calls: Set[Tuple[int, Direction]] = set()

        # --- 成本函数权重 (W) ---
        # 这些权重可以调整以优化不同目标
        self.W_TIME = 2.0          # 时间成本权重
        self.W_MISMATCH = 1000.0   # 方向不匹配的巨大惩罚
        self.W_STOPS = 10.0        # 每增加一个停靠点的成本
        self.W_LOAD = 500.0        # 负载率成本
        self.W_ENERGY = 5.0        # 能耗成本

        # 估算每层楼的平均移动时间（tick）
        self.TICK_PER_FLOOR = 7 # 包含加速、匀速、减速、停靠的平均值

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        """算法初始化"""
        print("🚀 成本函数调度算法初始化...")
        self.max_floor = len(floors) - 1
        for elevator in elevators:
            e_id = elevator.id
            self.elevator_directions[e_id] = Direction.STOPPED
            self.stop_list[e_id] = set()
            elevator.go_to_floor(0)

    def on_passenger_call(self, passenger: ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        """
        乘客呼叫时的回调
        - 将呼叫添加到“未分配池”，并立即尝试分配。
        """
        call = (floor.floor, Direction(direction))
        if call not in self.unassigned_calls:
            print(f"📞 新呼叫: F{call[0]} {call[1].value}")
            self.unassigned_calls.add(call)
            self._assign_pending_calls()

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        """电梯停靠时的回调"""
        e_id = elevator.id
        self.stop_list[e_id].discard(floor.floor)

        passengers_inside = elevator.passengers
        for p_id in passengers_inside:
            passenger = ProxyPassenger(p_id, self.api_client)
            self.add_stop(elevator, passenger.destination)
        
        self.update_direction_and_move(elevator)

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        """电梯空闲时的回调"""
        self.elevator_directions[elevator.id] = Direction.STOPPED
        # 空闲时，也尝试去处理未分配的呼叫
        self._assign_pending_calls()
        # 如果分配后依然空闲，则执行移动
        if self.elevator_directions[elevator.id] == Direction.STOPPED:
             self.update_direction_and_move(elevator)

    def _assign_pending_calls(self):
        """
        遍历所有未分配的呼叫，为每个呼叫找到成本最低的电梯。
        """
        if not self.unassigned_calls:
            return

        print(f"   待分配任务: {self.unassigned_calls}，开始计算成本...")
        
        calls_to_remove = set()
        for call_floor, call_direction in self.unassigned_calls:
            costs = []
            for elevator in self.elevators:
                cost = self._calculate_cost(elevator, call_floor, call_direction)
                costs.append((cost, elevator))
            
            # 找到成本最低的电梯
            if not costs: continue
            min_cost, best_elevator = min(costs, key=lambda x: x[0])

            # 如果成本不是无穷大，则分配任务
            if min_cost != float('inf'):
                print(f"   分配任务 (F{call_floor}, {call_direction.value}) 给 E{best_elevator.id} (成本: {min_cost:.2f})")
                self.add_stop(best_elevator, call_floor)
                calls_to_remove.add((call_floor, call_direction))
                
                # 如果电梯是空闲的，立即启动它
                if self.elevator_directions[best_elevator.id] == Direction.STOPPED:
                    self.update_direction_and_move(best_elevator)
        
        # 从待办中移除已分配的任务
        self.unassigned_calls -= calls_to_remove

    def _calculate_cost(self, elevator: ProxyElevator, call_floor: int, call_direction: Direction) -> float:
        """
        核心函数：计算单个电梯服务单个呼叫的成本。
        """
        e_id = elevator.id
        e_floor = elevator.current_floor_float
        e_dir = self.elevator_directions[e_id]

        # --- 惩罚项 ---
        # 1. 满载惩罚：如果电梯满了，成本无穷大
        if elevator.load_factor >= 1.0:
            return float('inf')

        cost_mismatch = 0.0
        is_mismatch = False

        # 2. 方向不匹配惩罚
        if e_dir != Direction.STOPPED:
            if e_dir != call_direction:
                is_mismatch = True # 方向完全相反
            elif (e_dir == Direction.UP and e_floor > call_floor) or \
                 (e_dir == Direction.DOWN and e_floor < call_floor):
                is_mismatch = True # 顺路但已错过，需要回头

        if is_mismatch:
            # 惩罚值等于绕路返回所需的时间成本
            farthest_stop = 0
            if e_dir == Direction.UP:
                farthest_stop = max(self.stop_list[e_id] | {e_floor})
            else:
                farthest_stop = min(self.stop_list[e_id] | {e_floor})
            
            turnaround_dist = abs(farthest_stop - e_floor) + abs(farthest_stop - call_floor)
            cost_mismatch = self.W_MISMATCH + self.W_TIME * turnaround_dist * self.TICK_PER_FLOOR

        # --- 基础成本项 ---
        # 1. 时间成本：到达呼叫楼层所需的时间
        dist_to_call = abs(e_floor - call_floor)
        cost_time = self.W_TIME * dist_to_call * self.TICK_PER_FLOOR

        # 2. 停靠点成本：电梯当前任务越多，成本越高
        cost_stops = self.W_STOPS * len(self.stop_list[e_id])
        
        # 3. 负载成本：电梯越满，成本越高
        cost_load = self.W_LOAD * (elevator.load_factor ** 2) # 平方使影响更显著

        # 4. 能耗成本
        cost_energy = self.W_ENERGY * elevator.energy_rate

        return cost_time + cost_mismatch + cost_stops + cost_load + cost_energy

    def update_direction_and_move(self, elevator: ProxyElevator):
        """更新电梯方向并发出移动指令"""
        e_id = elevator.id
        e_dir = self.elevator_directions[e_id]
        e_floor = elevator.current_floor
        stops = self.stop_list[e_id]

        if e_dir == Direction.UP:
            upcoming = {s for s in stops if s > e_floor}
            if upcoming:
                elevator.go_to_floor(min(upcoming)); return
        elif e_dir == Direction.DOWN:
            upcoming = {s for s in stops if s < e_floor}
            if upcoming:
                elevator.go_to_floor(max(upcoming)); return

        down_stops = {s for s in stops if s < e_floor}
        if down_stops:
            self.elevator_directions[e_id] = Direction.DOWN
            elevator.go_to_floor(max(down_stops)); return

        up_stops = {s for s in stops if s > e_floor}
        if up_stops:
            self.elevator_directions[e_id] = Direction.UP
            elevator.go_to_floor(min(up_stops)); return

        self.elevator_directions[e_id] = Direction.STOPPED
        # 简单停靠策略：停在原地以节省能源
        print(f"   E{e_id} 任务完成，停在 F{e_floor} 等待新任务。")

    def add_stop(self, elevator: ProxyElevator, floor: int):
        """辅助函数：添加停靠点"""
        self.stop_list[elevator.id].add(floor)

    # --- 其他回调方法 ---
    def on_passenger_board(self, elevator: ProxyElevator, passenger: ProxyPassenger) -> None:
        self.add_stop(elevator, passenger.destination)

    def on_event_execute_start(self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        print(f"--- Tick {tick} ---")
        for e in elevators:
            dir_char = "🔼" if self.elevator_directions[e.id] == Direction.UP else ("🔽" if self.elevator_directions[e.id] == Direction.DOWN else "⏹️")
            stops = sorted(list(self.stop_list[e.id]))
            print(f"  E{e.id} {dir_char} [F{e.current_floor_float:.1f}] 👦:{len(e.passengers)}/{e.max_capacity} 🛑:{stops}")

    # 其他回调可以保持为空
    def on_event_execute_end(self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None: 
        time.sleep(0.1)
    def on_passenger_alight(self, elevator: ProxyElevator, passenger: ProxyPassenger, floor: ProxyFloor) -> None: pass
    def on_elevator_passing_floor(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None: pass
    def on_elevator_approaching(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None: pass
    def on_elevator_move(self, elevator: ProxyElevator, from_position: float, to_position: float, direction: str, status: str) -> None: pass

if __name__ == "__main__":
    """
    启动控制器
    请确保先在另一个终端运行模拟器:
    python -m elevator_saga.server.simulator
    """
    controller = CostFunctionController(debug=True)
    controller.start()
