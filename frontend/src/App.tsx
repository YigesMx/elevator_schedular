import { useState, useEffect } from 'react'

import Header from './body/header'
import Body from './body/layout'
import Footer from './body/footer'

import { SocketContext, SceneDataContext, MetricsDataContext, LogsDataContext, useLogsData } from './contexts_and_type'
import type { SceneData } from './contexts_and_type'

function App() {

    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [sceneData, setSceneData] = useState<SceneData | null>(null);
    const [metricsData, setMetricsData] = useState<any | null>(null);
    const { logs, addLog, clearLogs } = useLogsData();

    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [reconnectSignal, setReconnectSignal] = useState(false);

    // 定时任务，每0.5秒检查socket状态，没有的话就触发reconnectSignal
    useEffect(() => {
        const interval = setInterval(() => {
            if (socket?.readyState === WebSocket.CLOSED) {
                setReconnectSignal(prev => !prev);
            }
        }, 1000); // 每0.5秒检查一次

        return () => clearInterval(interval); // 清除定时器
    }, [socket]);

    useEffect(() => {
        console.log('Attempting to connect WebSocket...');
        setReconnecting(() => true);
        const socket = new WebSocket('ws://127.0.0.1:8001');

        socket.onopen = () => {
            console.log('WebSocket connection established');
            setConnected(() => true);
            setReconnecting(() => false);
        };

        socket.onclose = (_) => {
            console.log('WebSocket connection closed');
            setConnected(() => false);
            setReconnecting(() => false);
        }

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            // console.log('Received message:', message);

            if (message.type === 'server_scene_update'){
                console.log(message.data);
                // if any record in message.data.passengers have pickup_tick>0 && dropoff_tick>0 && pickup_tick==dropoff_tick,
                // it means the scene has ended, set status to 'finished'
                var status = 'updating';
                if (Object.values(message.data.passengers).some((p: any) => 
                    typeof p.pickup_tick === 'number' && p.pickup_tick > 0 && 
                    typeof p.dropoff_tick === 'number' && p.dropoff_tick > 0 && 
                    p.pickup_tick === p.dropoff_tick)) {
                    console.log('Scene has ended.');
                    status = 'finished';
                }
                setSceneData((prevData) => {
                    const newData = prevData ? {...prevData} : {};
                    newData['status'] = status;
                    newData['scene'] = message.data;
                    newData['prev_scene'] = prevData?.scene ? {...prevData.scene} : undefined;
                    return newData;
                });
            } else if (message.type === 'server_metrics_update'){
                // console.log('Received metrics update:', message.data);
                setMetricsData(message.data);
            } else if (message.type === 'server_wait_for_confirmation'){
                console.log('Server is waiting for confirmation to proceed to next step.');
                setSceneData((prevData) => {
                    const newData = prevData ? {...prevData} : {};
                    newData['status'] = 'finished';
                    return newData;
                });
            } else if (message.type === 'server_log'){
                console.log('[Log from server]', message.data);
                addLog('[Log from server]:' + String(message.data));
            } else if (message.type === 'server_error'){
                console.error('[Error from server]:', message.data);
                addLog('[Error from server]:' + String(message.data));
            } else {
                console.warn('[Unknown message type from server]', message.type);
                addLog('[Unknown message type from server]:' + String(message.type));
            }
        }

        setSocket(socket);

        return () => {
            console.log('Closing WebSocket connection');
            socket.close();
            setConnected(() => false);
        };
    }, [reconnectSignal]);

    return (
        <SocketContext value={socket}>
            <SceneDataContext value={sceneData}>
                <MetricsDataContext value={metricsData}>
                    <LogsDataContext value={logs}>  
                        <div className='flex flex-col justifu-between min-h-screen'>
                            <div>
                                <Header
                                    connected={connected}
                                    reconnecting={reconnecting}
                                    setReconnectSignal={setReconnectSignal}
                                    onStart={() => {
                                        socket?.send(JSON.stringify({
                                            type: 'client_confirmed',
                                            data: {}
                                        }));
                                        clearLogs();
                                        setMetricsData(null);
                                    }}
                                />
                            </div>
                            <div className='w-full flex flex-col justify-center'>
                                <Body />
                            </div>
                            <div>
                                <Footer />
                            </div>
                        </div>
                    </LogsDataContext>
                </MetricsDataContext>
            </SceneDataContext>
        </SocketContext>
    )
}

export default App
