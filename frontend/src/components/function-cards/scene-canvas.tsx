import { useContext, useEffect, useState } from 'react';

import { SceneDataContext } from '@/contexts_and_type';

import {ElevatorRect, PassengerCircle, DirectionArrow} from './canvas/animated-elements';
import SceneCanvasUtils from './canvas/utils';


interface SceneCanvasProps {
    width: number;
    height: number;
}

export default function SceneCanvas({ width, height }: SceneCanvasProps) {
    const sceneData = useContext(SceneDataContext);
    const [utils, setUtils] = useState<SceneCanvasUtils | null>(null);

    useEffect(() => {
        if (sceneData?.scene?.building) {
            const { floors, elevators, elevator_capacity } = sceneData.scene.building;
            const newUtils = new SceneCanvasUtils(width, height, floors, elevators, elevator_capacity);
            setUtils(newUtils);
        }
    }, [sceneData]);

    return (
        <div
            style={{
                position: 'relative',
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'hidden',
            }}
        >
            {/* Floors */}
            {utils && Array.from({ length: utils.floorNumber }, (_, i) => i).map((floor) => {
                const y = utils.getFloorY(floor);
                return (
                    <div
                        key={'floorline' + floor}
                        style={{
                            position: 'absolute',
                            top: `${y}px`,
                            left: `${width*0.025}px`,
                            width: `${width*0.95}px`,
                            height: '1px',
                            borderTop: '1px dashed var(--muted-foreground)',
                        }}
                    />
                );
            })}

            {/* Direction Arrows */}
            {utils && sceneData?.scene && (() => {
                const scene_to_display = sceneData.status === 'updating' ? sceneData.scene : (sceneData.prev_scene ? sceneData.prev_scene : sceneData.scene);
                const floorDicts = Object.values(scene_to_display.floors);
                
                const arrowX = utils.waitingQueueRightX + utils.padding_small;
                
                return floorDicts.flatMap((floor) => {
                    const arrows = [];
                    const upY = utils.getFloorY(floor.id + 1) + utils.padding_small * 1.5;
                    const downY = utils.getFloorY(floor.id + 1) + utils.elevatorCellSize + utils.padding_small * 0.5;

                    if (floor.up_queue.length > 0) {
                        arrows.push(
                            <DirectionArrow
                                key={`arrow-up-${floor.id}`}
                                x={arrowX}
                                y={upY}
                                size={utils.passengerSize}
                                direction="up"
                            />
                        );
                    }

                    if (floor.down_queue.length > 0) {
                        arrows.push(
                            <DirectionArrow
                                key={`arrow-down-${floor.id}`}
                                x={arrowX}
                                y={downY}
                                size={utils.passengerSize}
                                direction="down"
                            />
                        );
                    }

                    return arrows;
                });
            })()}

            {/* Elevators */}
            {
            utils && sceneData?.scene && (() => {
                const scene_to_display = sceneData.status === 'updating' ? sceneData.scene : (sceneData.prev_scene ? sceneData.prev_scene : sceneData.scene);
                const elevators = Object.values(scene_to_display.elevators);
                return elevators.map((elevator) => {
                    const { x, y } = utils ? utils.getElevatorPosition(elevator) : { x: 0, y: 0 };
                    return (
                        <ElevatorRect
                            key={'elevator' + elevator.id}
                            id={String(elevator.id)}
                            x={x}
                            y={y}
                            height={utils ? utils.floorHeight : 40}
                            width={utils ? utils.elevatorWidth : 40}
                            elevatorData={elevator}
                        />
                    );
                });
            })()}

            {/* Passengers */}
            {utils && sceneData?.scene && (() => {
                const scene_to_display = sceneData.status === 'updating' ? sceneData.scene : (sceneData.prev_scene ? sceneData.prev_scene : sceneData.scene);
                const floorDicts = Object.values(scene_to_display.floors);
                const elevatorDicts = Object.values(scene_to_display.elevators);
                const passengerDicts = Object.values(scene_to_display.passengers);
                const PassengersPosition = utils.getAllPassengersPosition(floorDicts, elevatorDicts, passengerDicts);
                return passengerDicts.map((passenger) => {
                    const pos = PassengersPosition[passenger.id];
                    if (!pos) return null;
                    return (
                        <PassengerCircle
                            key={'passenger' + passenger.id}
                            id={String(passenger.id)}
                            x={pos.x}
                            y={pos.y}
                            size={utils.passengerSize}
                            canvasWidth={width}
                        />
                    );
                });
            })()}
        </div>
    );
}