import json
from elevator_saga.core.models import PassengerStatus, Direction, ElevatorStatus

class SceneManager(object):
    def __init__(self):
        self.building = {
            "floors": None,
            "elevators": None,
            "elevator_capacity": None,
        }
        self.current = {
            "tick": None,
        }
        self.passengers = []
        self.elevators = []
    
    def set_building_info(self, floors, elevators, elevator_capacity):
        self.building["floors"] = floors
        self.building["elevators"] = elevators
        self.building["elevator_capacity"] = elevator_capacity
    
    def set_elevator_and_passenger_container(self, elevators, passengers):
        self.elevators = elevators
        self.passengers = passengers
    
    def update_current_tick(self, tick):
        self.current["tick"] = tick

    @property
    def scene_dict(self) -> dict:
        scene_data = {
            "building": self.building,
            "current": self.current,
            "elevators": {
                e.id: {
                    "id": e.id,
                    "current_pos": e.current_floor_float,
                    "target_floor": e.target_floor,
                    "is_idle": e.is_idle,
                    "run_statis": "stopped" if e.run_status == ElevatorStatus.STOPPED else ("start_up" if e.run_status == ElevatorStatus.START_UP else ("start_down" if e.run_status == ElevatorStatus.START_DOWN else "constant_speed")),
                    "target_floor_direction": "up" if e.target_floor_direction == Direction.UP else ("down" if e.target_floor_direction == Direction.DOWN else "stopped"),
                    "passengers": e.passengers,
                } for e in self.elevators
            } if len(self.elevators) > 0 else dict(),
            "passengers": {
                p.id: {
                    "id": p.id,
                    "origin": p.origin,
                    "destination": p.destination,
                    "arrive_tick": p.arrive_tick,
                    "pickup_tick": p.pickup_tick,
                    "dropoff_tick": p.dropoff_tick,
                    "elevator_id": p.elevator_id,
                    "status": "waiting" if p.status == PassengerStatus.WAITING else ("in_elevator" if p.status == PassengerStatus.IN_ELEVATOR else "arrived"),
                    "wait_time": p.wait_time,
                    "system_time": p.system_time,
                    "travel_direction": "up" if p.travel_direction == Direction.UP else ("down" if p.travel_direction == Direction.DOWN else "stopped"),
                } for p in self.passengers
            } if len(self.passengers) > 0 else dict()
        }
        return scene_data