import { useContext, useEffect, useState } from 'react';
import { useSpring, animated, useTrail } from '@react-spring/web';

import { SceneDataContext } from '@/contexts_and_type';
import SceneCanvasUtils from './scene-canvas-utils';

const durationTime = 100; // milliseconds

interface ElevatorRectProps {
    id: string;
    x: number;
    y: number;
    height: number;
    width: number;
    elevatorData: any;
}

function ElevatorRect({ id, x, y, height, width, elevatorData }: ElevatorRectProps) {
    const spring = useSpring({
        y: y,
        config: { duration: durationTime }
    });

    return (
        <animated.div
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: spring.y.to(y => `${y}px`),
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: '#3b82f6',
                border: '2px solid #1e40af',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'left',
                justifyContent: 'space-around',
                padding: '0',
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    fontSize: `${height / 5 * 2}px`,
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center',
                    width: `${height}px`,
                    height: `${height/5*3}px`,
                }}
            >
                E{id}
            </div>
            <div
                style={{
                    fontSize: `${height / 5 * 1}px`,
                    color: 'white',
                    textAlign: 'center',
                    width: `${height}px`,
                    height: `${height/5*2}px`,
                }}
            >
                F{(elevatorData.current_pos + 1).toFixed(1)}
            </div>
        </animated.div>
    );
}

interface PassengerCircleProps {
    id: string;
    x: number;
    y: number;
    size: number;
}

function PassengerCircle({ id, x, y, size }: PassengerCircleProps) {
    const spring = useSpring({
        x: x,
        y: y,
        config: { duration: durationTime }
    });

    return (
        <animated.div
            style={{
                position: 'absolute',
                left: spring.x.to(x => `${x}px`),
                top: spring.y.to(y => `${y}px`),
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: '#3b82f6',
                border: '2px solid #1e40af',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
            }}
        >
            <div
                style={{
                    fontSize: `${size / 5 * 2}px`,
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center'
                }}
            >
                {id}
            </div>
        </animated.div>
    );
}

interface SceneCanvasProps {
    width: number;
    height: number;
}

export default function SceneCanvas({ width, height }: SceneCanvasProps) {
    const sceneData = useContext(SceneDataContext);
    const [elevators, setElevators] = useState<any[]>([]);
    const [utils, setUtils] = useState<SceneCanvasUtils | null>(null);

    useEffect(() => {
        if (sceneData?.scene?.building) {
            const { floors, elevators, elevator_capacity } = sceneData.scene.building;
            const newUtils = new SceneCanvasUtils(width, height, floors, elevators, elevator_capacity);
            setUtils(newUtils);
        }

        if (sceneData?.scene?.elevators) {
            const elevatorsArray = Object.entries(sceneData.scene.elevators).map(([id, data]: [string, any]) => ({
                id,
                ...data
            }));
            setElevators(elevatorsArray);
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
                            left: 0,
                            width: '100%',
                            height: '1px',
                            borderTop: '1px dashed #9ca3af'
                        }}
                    />
                );
            })}

            {/* Elevators */}
            {elevators.map((elevator) => {
                const { x, y } = utils ? utils.getElevatorPosition(elevator) : { x: 0, y: 0 };
                return (
                    <ElevatorRect
                        key={'elevator' + elevator.id}
                        id={elevator.id}
                        x={x}
                        y={y}
                        height={utils ? utils.floorHeight : 40}
                        width={utils ? utils.elevatorWidth : 40}
                        elevatorData={elevator}
                    />
                );
            })}

            {/* Passengers */}
            {utils && sceneData?.scene && (() => {
                const floorDicts = Object.values(sceneData.scene.floors);
                const elevatorDicts = Object.values(sceneData.scene.elevators);
                const passengerDicts = Object.values(sceneData.scene.passengers);
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
                        />
                    );
                });
            })()}
        </div>
    );
}