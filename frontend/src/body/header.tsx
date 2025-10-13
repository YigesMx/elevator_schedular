import { useContext } from 'react'

import ThemeToggle from '../components/theme/theme-toggle'
import { H1 } from '../components/ui/typography'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Check } from "lucide-react"
import { SceneDataContext } from '@/contexts_and_type'

import type { ConnectMethod } from '@/contexts_and_type';

interface HeaderProps {
    connectMethod: ConnectMethod;
    setConnectMethod: React.Dispatch<React.SetStateAction<ConnectMethod>>;
    connected: boolean;
    reconnecting: boolean;
    setReconnectSignal: React.Dispatch<React.SetStateAction<boolean>>;
    onStartForWS?: () => void;
}
function Header({ connectMethod, setConnectMethod, connected, reconnecting, setReconnectSignal, onStartForWS: onStart }: HeaderProps) {

    const sceneData = useContext(SceneDataContext);

    return (
        <>
            <div className='relative flex items-center justify-center pt-8 mx-16 mb-8'>
                <div className='absolute left-0 flex items-center justify-center gap-4'>
                    <Tabs defaultValue={"metrics"} value={connectMethod} onValueChange={(value) => setConnectMethod(value as ConnectMethod)}>
                        <TabsList>
                            <TabsTrigger value="http_to_server">HTTP Polling</TabsTrigger>
                            <TabsTrigger value="websocket_to_algorithm">WebSocket</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {
                        (connectMethod === 'websocket_to_algorithm')?[
                        <Button 
                            onClick={() => setReconnectSignal(prev => !prev)}
                            className={
                                connected ?
                                'bg-green-700 dark:bg-green-700 hover:bg-green-800 dark:hover:bg-green-800' :
                                'bg-amber-500 dark:bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-600'}
                            disabled={!connected}
                        >
                            {connected ? <Check /> : <Spinner />}
                            {connected ? "Connected" : "Disconnected"}
                        </Button>,
                        <Button
                            disabled={!connected || reconnecting || (sceneData?.status === 'updating')}
                            onClick={() => {
                                if (onStart) onStart();
                            }}
                        >
                            {sceneData?.status === 'updating' ? 'Updating...' : 'Start'}
                        </Button>
                        ]:
                        <Button
                            className={'bg-green-700 dark:bg-green-700 hover:bg-green-800 dark:hover:bg-green-800'}
                        >
                            <Spinner />
                            Polling...
                        </Button>
                    }
                </div>
                <H1>
                    Elevator Scheduler
                </H1>
                <div className='absolute right-0'>
                    <ThemeToggle />
                </div>
            </div>
        </>
    )
}

export default Header
