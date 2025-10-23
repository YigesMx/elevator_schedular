"""
高效扫描调度算法 (Scanning Sweep Controller)

基于 "SmartBusController" 的最终改进版。

核心改进 (on_elevator_stopped):
抛弃“公交车”模式。电梯停靠后，会“扫描”前方所有楼层。
1.  如果当前方向上 (上/下) 还有“工作” (电梯内乘客的目的地 或 楼层上的呼叫)：
    电梯会直接前往“最近的”一个工作楼层 (自动跳过所有中间的空站)。
2.  如果当前方向上已无“工作”：
    电梯会“立即转向”，并前往相反方向上“最远的”一个工作楼层，开始新的扫描。

保留特性:
1. 满载跳过 (on_elevator_approaching): 电梯满载时，如果无人下车，会强制跳过。
2. 乘客跟踪 (on_passenger_board/alight): 客户端手动跟踪乘客，修复了模拟器bug。
"""
from typing import List, Dict, Set

from comm.websocket_broadcastor import SceneBroadcastor

from .controller_with_comm import BaseControllerWithComm
from elevator_saga.client.proxy_models import ProxyElevator, ProxyFloor, ProxyPassenger
from elevator_saga.core.models import Direction, SimulationEvent


class ScanningSweepController(BaseControllerWithComm):
    """
    高效扫描调度算法 (Look-Ahead)
    - 智能转向 (不再盲目到顶)
    - 自动跳过空站
    - 满载时跳过 (Forced skip)
    - 客户端修复乘客跟踪
    """

    def __init__(self, scene_broadcastor: SceneBroadcastor, server_port=8000, with_delay=False):
        super().__init__(scene_broadcastor=scene_broadcastor, server_port=server_port, with_delay=with_delay)
        self.all_passengers: List[ProxyPassenger] = []
        self.max_floor = 0
        
        # 客户端乘客跟踪器 (修复模拟器bug)
        self.passenger_destinations_tracker: Dict[int, Dict[int, int]] = {}

    def on_init(self, elevators: List[ProxyElevator], floors: List[ProxyFloor]) -> None:
        super().on_init(elevators, floors)
        print("🚀 高效扫描调度算法已启动 (智能转向)")
        self.max_floor = floors[-1].floor
        self.floors = floors # 存储所有楼层代理对象，用于后续检查
        
        for i, elevator in enumerate(elevators):
            # 均匀分布电梯
            target_floor = (i * (len(floors) - 1)) // len(elevators)
            elevator.go_to_floor(target_floor, immediate=True)
            
            # 初始化跟踪器
            self.passenger_destinations_tracker[elevator.id] = {}

    def on_event_execute_start(
        self, tick: int, events: List[SimulationEvent], elevators: List[ProxyElevator], floors: List[ProxyFloor]
    ) -> None:
        # 打印状态
        print(f"Tick {tick}: 即将处理 {len(events)} 个事件")
        for i in elevators:
            destinations = list(self.passenger_destinations_tracker[i.id].values())
            print(
                f"\tE{i.id}[{i.target_floor_direction.value},"
                f"{i.current_floor_float:.1f}/{i.target_floor}] "
                f"Dest:{sorted(list(set(destinations)))} "
                + "👦" * len(i.passengers),
                end="",
            )
        print()


    def on_passenger_call(self, passenger: ProxyPassenger, floor: ProxyFloor, direction: str) -> None:
        super().on_passenger_call(passenger, floor, direction)
        self.all_passengers.append(passenger)
        print(f"乘客 {passenger.id} F{floor.floor} 请求 {passenger.origin} -> {passenger.destination} ({direction})")
        # 可以在此主动检查是否有空闲电梯
        for elev in self.elevators:
            if elev.is_idle:
                self._find_new_target(elev)
                break

    def on_elevator_idle(self, elevator: ProxyElevator) -> None:
        print(f"E{elevator.id} 在 F{elevator.current_floor} 空闲。")
        # 寻找新工作，而不是盲目前往 F1
        self._find_new_target(elevator)

    def _find_work_above(self, current_floor: int, destinations_inside: Set[int]) -> List[int]:
        """扫描当前楼层之上的所有工作，返回排序好的楼层列表 (从近到远)"""
        work_floors = set()
        # 1. 扫描电梯内的乘客目的地
        for f in destinations_inside:
            if f > current_floor:
                work_floors.add(f)
        # 2. 扫描楼层上的等待乘客
        for i in range(current_floor + 1, self.max_floor + 1):
            if self.floors[i].has_waiting_passengers:
                work_floors.add(i)
        return sorted(list(work_floors)) # [F3, F5]

    def _find_work_below(self, current_floor: int, destinations_inside: Set[int]) -> List[int]:
        """扫描当前楼层之下的所有工作，返回排序好的楼层列表 (从近到远)"""
        work_floors = set()
        # 1. 扫描电梯内的乘客目的地
        for f in destinations_inside:
            if f < current_floor:
                work_floors.add(f)
        # 2. 扫描楼层上的等待乘客
        for i in range(0, current_floor):
            if self.floors[i].has_waiting_passengers:
                work_floors.add(i)
        return sorted(list(work_floors), reverse=True) # [F2, F0]

    def on_elevator_stopped(self, elevator: ProxyElevator, floor: ProxyFloor) -> None:
        super().on_elevator_stopped(elevator, floor)
        """
        当电梯 *完成* 停靠在某楼层时调用
        实现 "智能扫描和转向" 逻辑
        """
        print(
            f"🛑 电梯 E{elevator.id} 停靠在 F{floor.floor}. "
            f"载客: {len(elevator.passengers)}/{elevator.max_capacity}"
        )
        
        self._find_new_target(elevator)

    def _find_new_target(self, elevator: ProxyElevator):
        """为电梯寻找下一个最佳目标的核心决策逻辑"""
        
        current_floor = elevator.current_floor
        destinations_inside = set(self.passenger_destinations_tracker[elevator.id].values())
        
        # 确定电梯当前的“意图” (方向)
        direction_intent = elevator.last_tick_direction
        
        # 如果电梯是静止的 (idle)，我们需要为它设定一个初始意图
        if direction_intent == Direction.STOPPED:
             # 默认意图是上行
             direction_intent = Direction.UP
             # 但如果上方没工作而下方有，则意图改为下行
             if (not self._find_work_above(current_floor, destinations_inside) and 
                 self._find_work_below(current_floor, destinations_inside)):
                 direction_intent = Direction.DOWN

        # --- 情况 A: 意图是上行 ---
        if direction_intent == Direction.UP:
            work_above = self._find_work_above(current_floor, destinations_inside)
            if work_above:
                # 找到了！前往上方最近的一个工作
                target = work_above[0]
                print(f"  (上行) 上方最近的工作在 F{target}，前往。")
                elevator.go_to_floor(target)
                return
            
            # 如果上方没有工作了，执行“智能转向”
            print("  (上行) 上方已无工作，立即转向下行。")
            work_below = self._find_work_below(current_floor, destinations_inside)
            if work_below:
                # 转向，并前往下方“最远”(最高)的一个工作
                target = work_below[0] 
                print(f"  (转向) 下方最远的工作在 F{target}，前往。")
                elevator.go_to_floor(target)
                return

        # --- 情况 B: 意图是下行 ---
        if direction_intent == Direction.DOWN:
            work_below = self._find_work_below(current_floor, destinations_inside)
            if work_below:
                # 找到了！前往下方最近的一个工作
                target = work_below[0]
                print(f"  (下行) 下方最近的工作在 F{target}，前往。")
                elevator.go_to_floor(target)
                return

            # 如果下方没有工作了，执行“智能转向”
            print("  (下行) 下方已无工作，立即转向上行。")
            work_above = self._find_work_above(current_floor, destinations_inside)
            if work_above:
                # 转向，并前往上方“最远”(最低)的一个工作
                target = work_above[0]
                print(f"  (转向) 上方最远的工作在 F{target}，前往。")
                elevator.go_to_floor(target)
                return

        # --- 情况 C: 全楼都没有工作 ---
        # print(f"  E{elevator.id} 在 F{floor.floor} 停靠，全楼已无工作。")
        # 保持静止，等待 on_elevator_idle 触发 (或让其自然触发)
        # 我们也可以主动让它去中层停靠
        parking_floor = self.max_floor // 2
        if current_floor != parking_floor:
            print(f"  前往中层 F{parking_floor} 停靠。")
            elevator.go_to_floor(parking_floor)

    # -------------------
    # 乘客跟踪 (修复Bug)
    # -------------------
    def on_passenger_board(self, elevator: ProxyElevator, passenger: ProxyPassenger) -> None:
        print(f" 乘客{passenger.id} E{elevator.id}⬆️ F{elevator.current_floor} -> F{passenger.destination}")
        # 手动记录乘客目的地
        self.passenger_destinations_tracker[elevator.id][passenger.id] = passenger.destination

    def on_passenger_alight(self, elevator: ProxyElevator, passenger: ProxyPassenger, floor: ProxyFloor) -> None:
        print(f" 乘客{passenger.id} E{elevator.id}⬇️ F{floor.floor}")
        # 手动移除乘客
        if passenger.id in self.passenger_destinations_tracker[elevator.id]:
            del self.passenger_destinations_tracker[elevator.id][passenger.id]

    def on_elevator_passing_floor(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        print(f"🔄 电梯 E{elevator.id} 经过 F{floor.floor} (方向: {direction})")

    # -------------------
    # 满载跳过 (保留的特性)
    # -------------------
    def on_elevator_approaching(self, elevator: ProxyElevator, floor: ProxyFloor, direction: str) -> None:
        """
        当电梯 *即将到达* 楼层时调用（即，开始减速时）
        我们在这里实现“满载跳过”逻辑
        """
        print(f"🎯 电梯 E{elevator.id} 即将到达 F{floor.floor} (方向: {direction})")

        # 检查1: 电梯是否满载？
        if not elevator.is_full:
            print(f"  E{elevator.id} 未满载，正常停靠。")
            return

        # 检查2: 满载状态下，是否有人要在此层下车？
        current_elevator_destinations = self.passenger_destinations_tracker[elevator.id].values()
        if floor.floor in current_elevator_destinations:
            print(f"  E{elevator.id} 已满载，但有乘客在 F{floor.floor} 下车，正常停靠。")
            return

        # 结论: 电梯已满载，且此层无人下车。执行强制跳过。
        print(
            f"  E{elevator.id} 已满载 (载客 {len(elevator.passengers)}/{elevator.max_capacity}) "
            f"且 F{floor.floor} 无乘客下车。"
        )

        # 执行跳过：立即设置新目标为“当前方向的下一个工作楼层”
        destinations_inside = set(self.passenger_destinations_tracker[elevator.id].values())
        new_target = -1
        
        if direction == Direction.UP.value and floor.floor < self.max_floor:
            # 寻找越过此层后，上方的下一个工作
            work_above = self._find_work_above(floor.floor, destinations_inside)
            if work_above:
                new_target = work_above[0]

        elif direction == Direction.DOWN.value and floor.floor > 0:
            # 寻找越过此层后，下方的下一个工作
            work_below = self._find_work_below(floor.floor, destinations_inside)
            if work_below:
                new_target = work_below[0]

        if new_target != -1:
            print(f"  强制跳过 F{floor.floor}，立即前往下一个工作楼层 F{new_target}")
            elevator.go_to_floor(new_target, immediate=True)
        else:
             # 越过此层后，当前方向已无工作
             print(f"  强制跳过 F{floor.floor}，但前方已无工作，将停靠并转向。")
             # 我们不能在这里转向，因为电梯还在移动中
             # 允许电梯停在 F{floor.floor} (它不会开门，因为已满)
             # 然后 on_elevator_stopped 会被调用，并触发转向逻辑
             pass

    
    def on_event_execute_end(self, tick, events, elevators, floors):
        super().on_event_execute_end(tick, events, elevators, floors)
        pass

    def on_elevator_move(
        self, elevator: ProxyElevator, from_position: float, to_position: float, direction: str, status: str
    ) -> None:
        pass

