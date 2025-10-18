# Elevator Scheduler

A ZGCA SoftEngineering lecture project.

## 算法描述

本算法是经典“公交车算法” 的改进版，抛弃了固定的循环路线，采用一种高效的“扫描-转向”策略。

#### 高效扫描 (Scanning Sweep)

* 抛弃固定路线：电梯不再盲目地开往顶层或底层。
* 智能转向：电梯在停靠后 (on_elevator_stopped) 会立即扫描当前行进方向上是否还有“工作”。“工作”被定义为电梯内乘客的目的地或楼层上的等待呼叫。

* 无工作即转向：如果当前方向（例如“上行”）已没有任何工作，电梯会立即转向，开始处理“下行”的工作，绝不空载运行到终点。

#### 自动跳过空站 (Look-Ahead)

* 在 on_elevator_stopped 决定下一站时，算法会直接选择当前方向上最近的一个有工作的楼层作为目标。

* 这使得电梯能够自动跳过所有中间的空闲楼层，极大提高了运行效率。

#### 满载跳过 (Forced Skip)

* 在 on_elevator_approaching（即将到达）时，算法会检查电梯是否满载 (is_full)。

* 如果电梯已满，并且没有乘客需要在此层下车，电梯将强制跳过此层，并立即设置新目标为当前方向上的下一个工作楼层。

#### 客户端乘客跟踪 (Bug Fix)

本算法包含一个关键修复，用于规避模拟器 (simulator.py) 未能正确更新 elevator.pressed_floors 属性的缺陷。

* 控制器通过 self.passenger_destinations_tracker 字典，在 on_passenger_board 时手动记录乘客目的地，并在 on_passenger_alight 时移除。

* 这确保了“满载跳过”逻辑能够正确判断是否有人需要下车，避免了满载乘客无法下车的严重问题。

#### 空闲停靠 (Idle Parking)

* 当一部电梯在 on_elevator_idle 变为空闲，且全楼均无工作时，它会自动前往大楼的中间楼层 (max_floor // 2) 停靠，以便能最快响应来自任何方向的新呼叫。

## 运行依赖

* **Python**: 版本 >= 3.10
* **操作系统**: Windows 10+ / Ubuntu 22.04+ / macOS
* **依赖**:
    * 前端：node.js, pnpm, vite
    * 后端：websockets, elevator-py及其依赖
