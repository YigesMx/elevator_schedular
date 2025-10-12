import { useContext, useEffect, useState, useRef } from 'react';

import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';
import Konva from 'konva';

import { SceneDataContext } from '@/contexts_and_type';
import SceneCanvasUtils from './scene-canvas-utils';


interface ElevatorRectProps {
    id: string;
    x: number;
    y: number;
    height: number;
    width: number;
    elevatorData: any;
}
function ElevatorRect({id, x, y, height, width, elevatorData}: ElevatorRectProps) {
    const groupRef = useRef<Konva.Group>(null);
    const prevYRef = useRef<number>(y);

    useEffect(() => {
        if (groupRef.current && prevYRef.current !== y) {
            // 创建平滑动画
            const tween = new Konva.Tween({
                node: groupRef.current,
                duration: 0.1, // 动画持续时间（秒）
                y: y,
                easing: Konva.Easings.EaseInOut,
            });
            tween.play();
            prevYRef.current = y;
        }
    }, [y]);

    return (
        <Group ref={groupRef} x={x} y={prevYRef.current}>
            <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="#3b82f6"
                stroke="#1e40af"
                strokeWidth={2}
                cornerRadius={4}
            />
            <Text
                x={0}
                y={height/5}
                width={height}
                text={`E${id}`}
                fontSize={height/5*2}
                fontStyle="bold"
                fill="white"
                align="center"
            />
            <Text
                x={0}
                y={(height/5)*3}
                width={height}
                text={`F${(elevatorData.current_pos+1).toFixed(1)}`}
                fontSize={10}
                fill="white"
                align="center"
            />
        </Group>
    );
}


interface SceneCanvasProps {
    width: number;
    height: number;
}
export default function SceneCanvas({width, height}: SceneCanvasProps) {
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
        <>
            <Stage width={width} height={height}>
                <Layer>
                    {//floors
                    utils && Array.from({ length: utils.floorNumber }, (_, i) => i).map((floor) => {
                        const y = utils.getFloorY(floor);
                        return (
                            <Line
                                key={'floorline'+floor}
                                points={[0, y, width, y]}
                                stroke="#9ca3af"
                                strokeWidth={1}
                                dash={[4, 4]}
                            />
                        );
                    })
                    }
                    {//elevators
                    elevators.map((elevator, index) => {
                        const { x, y } = utils?utils.getElevatorPosition(elevator):{x:0,y:0};
                        return (
                            <ElevatorRect
                                key={'elevator'+elevator.id}
                                id={elevator.id}
                                x={x}
                                y={y}
                                height={utils?utils.floorHeight:40}
                                width={utils?utils.elevatorWidth:40}
                                elevatorData={elevator}
                            />
                        );
                    })}
                </Layer>
            </Stage>
        </>
    );
}