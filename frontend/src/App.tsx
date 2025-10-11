import { useState, useEffect } from 'react'

import Header from './body/header'
import Body from './body/layout'
import Footer from './body/footer'

import { SceneDataContext, SocketContext } from './Contexts'

function App() {

    const [sceneData, setSceneData] = useState(null);

    const [socket, setSocket] = useState<WebSocket | null>(null);

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
            console.log('Received message:', message);
            if (message.type === 'server_scene_update'){
                setSceneData((prevData) => {
                    const newData = prevData ? {...prevData} : {};
                    newData['status'] = 'updating';
                    newData['scene'] = message.data;
                    return newData;
                });
            } else if (message.type === 'server_wait_for_confirmation'){
                setSceneData((prevData) => {
                    const newData = prevData ? {...prevData} : {};
                    newData['status'] = 'finished';
                    return newData;
                });
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
                <div className='flex flex-col justifu-between min-h-screen'>
                    <div>
                        <Header connected={connected} reconnecting={reconnecting} setReconnectSignal={setReconnectSignal} />
                    </div>
                    <div className='w-full flex flex-col justify-center'>
                        <Body />
                    </div>
                    <div>
                        <Footer />
                    </div>
                </div>
            </SceneDataContext>
        </SocketContext>
    )
}

export default App
