
import type { ElevatorDict, FloorDict, PassengerDict } from "@/contexts_and_type";

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

    waitingQueueRightX: number;
    arrivedQueueLeftX: number;

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
        this.waitingQueueRightX = this.getElevatorX(0) - this.elevatorCellSize;
        this.arrivedQueueLeftX = this.getElevatorX(this.elevatorsNumber - 1) + this.elevatorWidth + this.padding_large;
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

    getAllPassengersPosition(floorDicts: FloorDict[], elevatorDicts: ElevatorDict[], passengerDicts: PassengerDict[]) {
        // waiting passengers on each floor
        const waitingPassengersPosition: { [key: number]: { x: number; y: number; } } = {};
        floorDicts.forEach((floor) => {
            // two rows, first one for up passengers, second one for down passengers,
            // right align to the waitingQueueRightX
            const onY = this.getFloorY(floor.id+1) + this.padding_small * 1.5;
            const downY = this.getFloorY(floor.id+1) + this.elevatorCellSize + this.padding_small * 0.5;
            
            floor.up_queue.forEach((pid, index) => {
                if(passengerDicts.find(p=>p.id===pid)?.status !== 'waiting') return;
                const x = this.waitingQueueRightX - (index+1) * this.elevatorCellSize + this.padding_small;
                const y = onY;
                waitingPassengersPosition[pid]=({ x, y });
            });

            floor.down_queue.forEach((pid, index) => {
                if(passengerDicts.find(p=>p.id===pid)?.status !== 'waiting') return;
                const x = this.waitingQueueRightX - (index+1) * this.elevatorCellSize + this.padding_small;
                const y = downY;
                waitingPassengersPosition[pid]=({ x, y });
            });
            
        });

        // in-elevator passengers
        const inElevatorPassengersPosition: { [key: number]: { x: number; y: number; } } = {};
        elevatorDicts.forEach((elevator) => {
            const { x: ex, y: ey } = this.getElevatorPosition(elevator);
            elevator.passengers.forEach((pid, index) => {
                if(passengerDicts.find(p=>p.id===pid)?.status !== 'in_elevator') return;
                const row = index % 2;
                const col = Math.floor(index / 2);
                const x = ex + this.floorHeight + this.padding_small + col * this.elevatorCellSize;
                const y = row ==0 ? ey + this.padding_small*1.5 :
                    ey + this.elevatorCellSize + this.padding_small*0.5;
                inElevatorPassengersPosition[pid] = ({ x, y });
            });
        });

        // arrived passengers on each floor
        const arrivedPassengersPosition: { [key: number]: { x: number; y: number; } } = {};
        const arrivedPassengersOnEachFloor: { [key: number]: PassengerDict[] } = {};
        passengerDicts.forEach((passenger) => {
            if (passenger.status === 'arrived') {
                if (!(passenger.destination in arrivedPassengersOnEachFloor)) {
                    arrivedPassengersOnEachFloor[passenger.destination] = [];
                }
                arrivedPassengersOnEachFloor[passenger.destination].push(passenger);
            }
        });
        // sort by arrival tick, later arrived at the beginning
        Object.values(arrivedPassengersOnEachFloor).forEach((passengers) => {
            passengers.sort((a, b) => b.arrive_tick - a.arrive_tick);
            if (passengers.length % 2===1) {
                // add to the front
                passengers.unshift(null as unknown as PassengerDict);// for layout
            }
        });
        Object.entries(arrivedPassengersOnEachFloor).forEach(([floorId, passengers]) => {
            // two row, left align to the arrivedQueueLeftX
            const upperY = this.getFloorY(Number(floorId)+1) + this.padding_small * 1.5;
            const lowerY = this.getFloorY(Number(floorId)+1) + this.elevatorCellSize + this.padding_small * 0.5;
            var flag = false;
            passengers.forEach((passenger, index) => {
                if (!passenger){
                    flag = true;
                    return;
                }
                const x = this.arrivedQueueLeftX + Math.floor(index / 2) * this.elevatorCellSize + this.padding_small - ((index % 2 === 0&&flag)?this.elevatorCellSize:0);
                arrivedPassengersPosition[passenger.id] = ({ x, y: index % 2 === 0 ? upperY : lowerY});
            });
        });

        //merge all
        return { ...waitingPassengersPosition, ...inElevatorPassengersPosition, ...arrivedPassengersPosition };
    }
    
}