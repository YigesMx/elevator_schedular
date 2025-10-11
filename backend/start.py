import time

from controller.bus_controller import SimpleElevatorBusController
from comm.websocket_broadcastor import SceneBroadcastor

if __name__ == "__main__":
    ws_broadcastor = SceneBroadcastor(port=8001)
    
    while True:
    
        ws_broadcastor.wait_for_client_confirmation()
        
        algorithm = SimpleElevatorBusController(ws_broadcastor)
        
        try:
            algorithm.start()
        except Exception as e:
            print(f"Controller 发生异常: {e}")
            ws_broadcastor.server_log(f"Controller 发生异常: {e}")
            raise e
        
        # test communication
        # for i in range(5):
        #     print("doing something...")
        #     ws_broadcastor.broadcast_to_all("server_scene_update", f"正在执行...({i*2}s)")
        #     time.sleep(2)