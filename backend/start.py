import argparse

from controller.bus_controller import SimpleElevatorBusController
from controller.scan_controller import ScanElevatorController
from comm.websocket_broadcastor import SceneBroadcastor

def parse_args():
    parser = argparse.ArgumentParser(description="Elevator Saga Backend Server")
    parser.add_argument(
        "--port", type=int, default=8001, help="Port for WebSocket server (default: 8001)"
    )
    parser.add_argument(
        "--ws_wait_for_client", action="store_true", help="Wait for WebSocket client connection before starting the algorithm"
    )
    parser.add_argument
    parser.add_argument(
        "--once", action="store_true", help="Run the simulation only once and exit"
    )
    parser.add_argument(
        "--if-gui", action="store_true", help="Run the simulation with GUI"
    )
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    
    ws_broadcastor = SceneBroadcastor(port=args.port)
    
    while True:
        
        if args.ws_wait_for_client:
            ws_broadcastor.wait_for_client_confirmation()
        
        # algorithm = SimpleElevatorBusController(ws_broadcastor)
        algorithm = SimpleElevatorBusController(ws_broadcastor)
        
        try:
            algorithm.start()
        except KeyboardInterrupt:
            print("Simulation interrupted by user.")
            ws_broadcastor.server_log("Simulation interrupted by user.")
            break
        except Exception as e:
            print(f"Controller 发生异常: {e}")
            ws_broadcastor.server_log(f"Controller 发生异常: {e}")
            raise e

        if args.once:
            break