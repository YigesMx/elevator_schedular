import { useContext } from 'react'

import ThemeToggle from '../components/theme/theme-toggle'
import { H1 } from '../components/ui/typography'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { Check } from "lucide-react"
import { SocketContext } from '@/contexts_and_type'

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
                <div className='absolute left-0'>
                    
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
                    </Button>
                </div>
                <H1>
                    Elevator Scheduler
                </H1>
                <div className='absolute right-0'>
                    <ThemeToggle />
                </div>
            </div>
            <div className='relative flex items-center justify-center mx-16 mb-2 space-x-4'>
                <Button variant="default"
                    disabled={!connected || reconnecting}
                    onClick={() => {
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
