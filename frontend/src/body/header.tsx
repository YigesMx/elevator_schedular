import { useContext } from 'react'

import ThemeToggle from '../components/theme/theme-toggle'
import { H1 } from '../components/ui/typography'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { RotateCw } from "lucide-react"
import { SocketContext } from '@/Contexts'

interface HeaderProps {
    connected: boolean;
    reconnecting: boolean;
    setReconnectSignal: React.Dispatch<React.SetStateAction<boolean>>;
}
function Header({ connected, reconnecting, setReconnectSignal }: HeaderProps) {

    const socket = useContext(SocketContext);
    return (
        <>
            <div className='relative flex items-center justify-center pt-8 mx-16 mb-8'>
                <H1>
                    Elevator Scheduler
                </H1>
                <div className='absolute right-0'>
                    <ThemeToggle />
                </div>
            </div>
            <div className='relative flex items-center justify-center mx-16 mb-2 space-x-4'>
                <Button variant="outline" onClick={() => setReconnectSignal(prev => !prev)}>
                    {reconnecting ? <Spinner /> : <RotateCw />}
                    {connected ? "Connected" : (reconnecting ? "Reconnecting..." : "Disconnected")}
                </Button>
                <Button variant="outline" onClick={() => {
                    socket?.send(JSON.stringify({
                        type: 'client_confirmed',
                        data: {}
                    }));
                }}>
                    start
                </Button>
            </div>
        </>
    )
}

export default Header
