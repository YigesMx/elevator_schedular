
import type { ElevatorDict } from "@/contexts_and_type";

export default class SceneCanvasUtils {
    floorHeight = 40;
    padding_large = 5;
    padding_small = 2.5;

    width: number;
    height: number;
    floorNumber: number;
    elevatorsNumber: number;
    elevatorCapacity: number;

    elevatorCellSize: number;
    passengerSize: number;
    centerPosition: { x: number; y: number; };
    firstFloorY: number;
    elevatorWidth: number;

    constructor(width: number, height: number, floor_number: number, elevators_number: number, elevator_capacity: number) {
        this.width = width;
        this.height = height;
        this.floorNumber = floor_number;
        this.elevatorsNumber = elevators_number;
        this.elevatorCapacity = elevator_capacity;

        this.elevatorCellSize = this.floorHeight/2;
        this.passengerSize = this.elevatorCellSize - this.padding_small * 2;
        this.centerPosition = { x: this.width / 2, y: this.height / 2 };
        this.firstFloorY = this.getFloorY(0);
        this.elevatorWidth = this.floorHeight + Math.ceil(this.elevatorCapacity/2) * this.elevatorCellSize;
    }

    getFloorY(id: number) {
        return this.centerPosition.y + (this.floorNumber / 2) * this.floorHeight - id * this.floorHeight;
    }

    getElevatorX(id: number) {
        const centerPosition = this.centerPosition
        // consider padding
        return centerPosition.x 
            - (this.elevatorsNumber * this.elevatorWidth + this.padding_large * (this.elevatorsNumber - 1))/2 
            + id * this.elevatorWidth
            + id * this.padding_large;
    }

    getElevatorPosition(elevator:ElevatorDict) {
        const firstFloorY = this.firstFloorY;
        const x = this.getElevatorX(elevator.id);
        const y = firstFloorY - (1+elevator.current_pos) * this.floorHeight;
        return { x, y };
    }
    
}