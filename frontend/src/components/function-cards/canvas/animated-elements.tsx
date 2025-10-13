import { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

import { durationTime, firstRenderDurationTime } from '@/contexts_and_type';

interface ElevatorRectProps {
    id: string;
    x: number;
    y: number;
    height: number;
    width: number;
    elevatorData: any;
}

export function ElevatorRect({ id, x, y, height, width, elevatorData }: ElevatorRectProps) {
    const [isFirstRender, setIsFirstRender] = useState(true);

    const spring = useSpring({
        y: y,
        opacity: isFirstRender ? 1 : 1,
        scale: isFirstRender ? 1 : 1,
        from: isFirstRender ? { y: y, opacity: 0, scale: 0.5 } : undefined,
        config: { duration: isFirstRender ? firstRenderDurationTime : durationTime },
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

export function PassengerCircle({ id, x, y, size, canvasWidth }: PassengerCircleProps) {
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
        config: { duration: isFirstRender ? firstRenderDurationTime : durationTime },
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
                    fontSize: `${size / 2}px`,
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

export function DirectionArrow({ x, y, size, direction }: DirectionArrowProps) {
    const [isFirstRender, setIsFirstRender] = useState(true);

    const spring = useSpring({
        opacity: isFirstRender ? 1 : 1,
        scale: isFirstRender ? 1 : 1,
        from: isFirstRender ? { opacity: 0, scale: 0.3 } : undefined,
        config: { duration: isFirstRender ? firstRenderDurationTime : durationTime },
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