import React, {useContext, useState} from 'react';
import { Stage, Layer, Text } from 'react-konva';
import { useSpring, animated } from '@react-spring/konva';

// import {
//   QueryClient,
//   QueryClientProvider,
//   useQuery,
//   useQueryClient,
// } from '@tanstack/react-query'

import WindowCard from "@/components/custom-ui/window-card";

import { SceneDataContext } from '@/Contexts';

const ColoredRect = ({x}) => {
    const [flag, setFlag] = React.useState(false);
    const handleClick = () => setFlag(prev => !prev);

    const [props, api] = useSpring(() => ({
        // from: { x: 0, shadowBlur: 0, fill: 'rgb(10,50,19)' }, 
        to: { 
            x: x,
            shadowBlur: flag ? 25 : 5,
            fill: flag ? 'seagreen' : 'hotpink',
            width: flag ? 300 : 50,
            height: flag ? 300 : 50,
        },
        // config: { tension: 200, friction: 100 },
    }), [x, flag]);

    return (
        <>
            <animated.Rect {...props} y={50} onClick={handleClick} />
        </>
    );
};

// const fakeData = [10, 50, 30, 100]

// const getResByIndex = (index: number) => {
//     return fakeData[index % fakeData.length];
// }

function SceneDisplay() {
    // const queryClient = useQueryClient();

    const sceneData = useContext(SceneDataContext);

    const [testXVlaue, setTestXValue] = useState(0);

    // const [index, setIndex] = useState(0);
    // const { status, fetchStatus, data, error } = useQuery({
    // queryKey: ['todos', index],
    // queryFn: async (): Promise<{len: number, newIndex: number}> => {
    //         // simulate use fake data
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         // console.log('Fetching data with index:', index);
    //         return {
    //             len: getResByIndex(index),
    //             newIndex: index + 1
    //         }
    //     },
    //     // Refetch the data every second
    //     refetchInterval: 1000,
    // })

    // if (status === 'error') {
    //     return <span>Error: {error.message}</span>
    // }
    // if (status === 'loading') {
    //     return <span>Loading...</span>
    // }

    // if (status === 'success' && data) {
    //     setTestXValue(() => data.len);
    //     setIndex(() => data.newIndex);
    // }

    return (
        <>
            <Stage width={720} height={480}>
                <Layer>
                    <Text text="Try clicking the rectangle" />
                    <ColoredRect x={testXVlaue}/>
                </Layer>
            </Stage>
            {testXVlaue}
            {sceneData && JSON.stringify(sceneData)}
        </>
    )
}

// const queryClient = new QueryClient()

function SceneCard() {

    return (
        // <QueryClientProvider client={queryClient}>
            <WindowCard title="Scene Display" description="Display the current scene of the elevator system">
                <SceneDisplay/>
            </WindowCard>
        // </QueryClientProvider>
    )
}


export default SceneCard;