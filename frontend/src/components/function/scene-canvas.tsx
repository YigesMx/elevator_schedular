import { useContext, useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

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
    const [isFirstRender, setIsFirstRender] = useState(true);

    const spring = useSpring({
        y: y,
        opacity: isFirstRender ? 1 : 1,
        scale: isFirstRender ? 1 : 1,
        from: isFirstRender ? { y: y, opacity: 0, scale: 0.5 } : undefined,
        config: { duration: isFirstRender ? 60 : durationTime },
        onRest: () => {
            if (isFirstRender) setIsFirstRender(false);
        }
    });

    return (
        <animated.div
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: spring.y.to((y: any) => `${y}px`),
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: 'var(--secondary)',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'left',
                justifyContent: 'space-around',
                padding: '0',
                boxSizing: 'border-box',
                opacity: spring.opacity,
                transform: spring.scale.to(s => `scale(${s})`)
            }}
        >
            <div
                style={{
                    fontSize: `${height / 5 * 1.5}px`,
                    fontWeight: 'bold',
                    color: 'var(--secondary-foreground)',
                    textAlign: 'center',
                    width: `${height}px`,
                    height: `${height/5*3}px`,
                    marginTop: `${height / 10}px`,
                }}
            >
                E{id}
            </div>
            <div
                style={{
                    fontSize: `${height / 5 * 1}px`,
                    color: 'var(--secondary-foreground)',
                    textAlign: 'center',
                    width: `${height}px`,
                    height: `${height/5*2}px`,
                    marginTop: `-${height / 10}px`,
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
    canvasWidth: number;
}

function PassengerCircle({ id, x, y, size, canvasWidth }: PassengerCircleProps) {
    const [isFirstRender, setIsFirstRender] = useState(true);

    // 计算基于位置的透明度
    const calculateOpacity = (xPos: number) => {
        const fadeStartX = canvasWidth * 0.85;
        const fadeEndX = canvasWidth * 0.96;
        const showStartX = canvasWidth * 0.025;
        const showEndX = canvasWidth * 0.15;
        
        if (xPos < fadeStartX && xPos > showEndX) {
            return 1; // 完全不透明
        } else if (xPos > fadeEndX || xPos < showStartX) {
            return 0; // 完全透明
        } else if (xPos >= fadeStartX && xPos <= fadeEndX) {
            // 线性插值：从 1 到 0
            return 1 - (xPos - fadeStartX) / (fadeEndX - fadeStartX);
        } else if (xPos <= showEndX && xPos >= showStartX) {
            // 线性插值：从 0 到 1
            return (xPos - showStartX) / (showEndX - showStartX);
        }
    };

    const baseOpacity = calculateOpacity(x);

    const spring = useSpring({
        x: x,
        y: y,
        opacity: isFirstRender ? baseOpacity : baseOpacity,
        scale: isFirstRender ? 1 : 1,
        from: isFirstRender ? { x: x, y: y, opacity: 0, scale: 0.3 } : undefined,
        config: { duration: isFirstRender ? 60 : durationTime },
        onRest: () => {
            if (isFirstRender) setIsFirstRender(false);
        }
    });

    return (
        <animated.div
            style={{
                position: 'absolute',
                left: spring.x.to(x => `${x}px`),
                top: spring.y.to(y => `${y}px`),
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: 'var(--primary)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                opacity: spring.opacity,
                transform: spring.scale.to(s => `scale(${s})`)
            }}
        >
            <div
                style={{
                    fontSize: `${size / 5 * 2}px`,
                    fontWeight: 'bold',
                    color: 'var(--primary-foreground)',
                    textAlign: 'center'
                }}
            >
                {id}
            </div>
        </animated.div>
    );
}

interface DirectionArrowProps {
    x: number;
    y: number;
    size: number;
    direction: 'up' | 'down';
}

function DirectionArrow({ x, y, size, direction }: DirectionArrowProps) {
    const [isFirstRender, setIsFirstRender] = useState(true);

    const spring = useSpring({
        opacity: isFirstRender ? 1 : 1,
        scale: isFirstRender ? 1 : 1,
        from: isFirstRender ? { opacity: 0, scale: 0.3 } : undefined,
        config: { duration: isFirstRender ? 60 : durationTime },
        onRest: () => {
            if (isFirstRender) setIsFirstRender(false);
        }
    });

    return (
        <animated.div
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${size}px`,
                height: `${size}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: spring.opacity,
                transform: spring.scale.to(s => `scale(${s})`)
            }}
        >
            <div
                style={{
                    fontSize: `${size * 0.8}px`,
                    color: 'var(--accent-foreground)',
                    fontWeight: 'bold',
                    lineHeight: 1
                }}
            >
                {direction === 'up' ? '↑' : '↓'}
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