import {useContext, useEffect, useState, useRef} from 'react';

import WindowCard from "@/components/custom-ui/window-card";

import { LayoutChangeTriggerContext } from '@/contexts_and_type';
import SceneCanvas from './scene-canvas';

function SceneCard() {
    const layoutChangeTrigger = useContext(LayoutChangeTriggerContext);
    const sceneCanvasRef = useRef<HTMLDivElement>(null);

    // get width and height of the div reactively, only rely on div resize
    const [dimensions, setDimensions] = useState({ width: 300, height: 300 });

    useEffect(() => {
        const updateDimensions = () => {
            if (sceneCanvasRef.current) {
                setDimensions({
                    width: sceneCanvasRef.current.clientWidth,
                    height: sceneCanvasRef.current.clientHeight,
                });
            }
        };
        setTimeout(() => {
            updateDimensions();
            window.addEventListener('resize', updateDimensions);
        }, 0);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        // Triggered on layout change
        if (sceneCanvasRef.current) {
            setDimensions({
                width: sceneCanvasRef.current.clientWidth,
                height: sceneCanvasRef.current.clientHeight,
            });
        }
    }, [layoutChangeTrigger]);

    return (
        <WindowCard title="Scene Display" description="Display the current scene of the elevator system">
            <div style={{ width: '100%', height: '100%'}} ref={sceneCanvasRef}>
                <SceneCanvas width={dimensions.width} height={dimensions.height} />
            </div>
        </WindowCard>
    );
}

export default SceneCard;