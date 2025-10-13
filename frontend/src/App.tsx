import { useState, useEffect } from 'react'

import Header from './body/header'
import Body from './body/layout'
import Footer from './body/footer'

import { SocketContext, SceneDataContext, MetricsDataContext, LogsDataContext, useLogsData } from './contexts_and_type'
import type { ConnectMethod, SceneData, SceneDict, MetricsData } from './contexts_and_type'

function App() {
    const [connectMethod, setConnectMethod] = useState<ConnectMethod>('http_to_server');

    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [sceneData, setSceneData] = useState<SceneData | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const { logs, addLog, clearLogs } = useLogsData();

    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [reconnectSignal, setReconnectSignal] = useState(false);
    const [inUpdating, setInUpdating] = useState(true);

    useEffect(() => {
        console.log(`Connection method changed to ${connectMethod}`);
        if(connectMethod === 'http_to_server') {
            const interval = setInterval(() => {

                const statePromise = fetch('http://127.0.0.1:8000/api/state')
                    .then(response => response.json())
                    .catch(error => {
                        console.error('Error fetching scene data:', error);
                        addLog('[Error fetching scene data]:' + String(error));
                        return null;
                    });

                const trafficPromise = fetch('http://127.0.0.1:8000/api/traffic/info')
                    .then(response => response.json())
                    .catch(error => {
                        console.error('Error fetching traffic info:', error);
                        addLog('[Error fetching traffic info]:' + String(error));
                        return null;
                    });

                Promise.all([statePromise, trafficPromise])
                    .then(([stateData, trafficInfo]) => {

                        console.log('Fetched state data:', stateData);

                        const curScene: SceneDict = {
                            building: {
                                // size of stateData.elevators and stateData.floors
                                floors: Object.keys(stateData.floors).length,
                                elevators: Object.keys(stateData.elevators).length,
                                elevator_capacity: stateData.elevators[0]?.capacity || 8,
                            },
                            elevators: stateData.elevators.reduce((acc: any, e: any) => {
                                acc[e.id] = {
                                    id: e.id,
                                    current_pos: Math.round(e.position.current_floor * 10 + e.position.floor_up_position) / 10, // 保留一位小数
                                    target_floor: e.position.target_floor,
                                    is_idle: e.run_status === 'stopped' ? true : false,
                                    run_status: e.run_status,
                                    target_floor_direction: e.current_floor_float < e.target_floor ? 'up' : (e.current_floor_float > e.target_floor ? 'down' : 'stopped'),
                                    passengers: e.passengers,
                                }
                                return acc;
                            }, {}),
                            floors: stateData.floors.reduce((acc: any, f: any) => {
                                acc[f.floor] = {
                                    id: f.floor,
                                    up_queue: f.up_queue,
                                    down_queue: f.down_queue,
                                }
                                return acc;
                            }, {}),
                            passengers: Object.fromEntries(
                                Object.entries(stateData.passengers).map(([id, p]: [string, any]) => [
                                    id,
                                    {
                                        id: p.id,
                                        origin: p.origin,
                                        destination: p.destination,
                                        arrive_tick: p.arrive_tick,
                                        pickup_tick: p.pickup_tick,
                                        dropoff_tick: p.dropoff_tick,
                                        elevator_id: p.elevator_id,
                                        status: p.arrived ? 'arrived' : (p.pickup_tick > 0 ? 'in_elevator' : 'waiting'),
                                        wait_time: p.pickup_tick - p.arrive_tick,
                                        system_time: p.dropoff_tick - p.arrive_tick,
                                        travel_direction: p.destination > p.origin ? 'up' : (p.destination < p.origin ? 'down' : 'stopped'),
                                    }
                                ])
                            ),
                            current: {
                                tick: stateData.tick,
                                max_tick: trafficInfo?.max_tick || undefined,
                            }
                        }

                        setSceneData((prevData) => {
                            const newData = prevData ? {...prevData} : {};
                            newData['status'] = 'updating';
                            newData['scene'] = curScene;
                            newData['prev_scene'] = curScene.current.tick > 0 ? (prevData?.scene ? {...prevData.scene} : undefined): prevData?.prev_scene;
                            return newData;
                        });

                        if(trafficInfo && stateData.tick >= trafficInfo.max_tick-1 && inUpdating) {
                            console.log(stateData.tick, trafficInfo.max_tick);
                            setMetricsData(stateData.metrics);
                            setInUpdating(false);
                        }
                        if(trafficInfo && stateData.tick < trafficInfo.max_tick-1 ) {
                            setMetricsData(null);
                            setInUpdating(true);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                        addLog('[Error fetching data]:' + String(error));
                    });
                

            }, 50); // 每0.05秒请求一次

            return () => {
                clearInterval(interval); // 清除定时器
            }
        } else if (connectMethod === 'websocket_to_algorithm') {
            const interval = setInterval(() => {
                if (socket === null || socket?.readyState === WebSocket.CLOSED) {
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
                }
            }, 1000); // 每1秒检查一次

            return () => {
                clearInterval(interval); // 清除定时器
                if (socket) {
                    console.log('Cleaning up WebSocket connection');
                    socket.close();
                    setSocket(null);
                    setConnected(() => false);
                }
            }
        }
    }, [connectMethod, reconnectSignal, socket, inUpdating]);

    return (
        <SocketContext value={socket}>
            <SceneDataContext value={sceneData}>
                <MetricsDataContext value={metricsData}>
                    <LogsDataContext value={logs}>  
                        <div className='flex flex-col justifu-between min-h-screen'>
                            <div>
                                <Header
                                    connectMethod={connectMethod}
                                    setConnectMethod={setConnectMethod}
                                    connected={connected}
                                    reconnecting={reconnecting}
                                    setReconnectSignal={setReconnectSignal}
                                    onStartForWS={() => {
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
