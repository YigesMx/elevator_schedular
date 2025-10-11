import time

from controller.bus_controller import SingleElevatorBusController
from comm.websocket_broadcastor import WebSocketBroadcastor

def wait_for_client_confirmation(ws_broadcastor: WebSocketBroadcastor):
    ready = False
    
    async def on_client_confirmed(ws, msg):
        nonlocal ready
        ready = True
        print("Client confirmed to start, starting simulation...")
    
    ws_broadcastor.register_message_handler("client_confirmed", on_client_confirmed)
    
    while not ready:
        ws_broadcastor.broadcast_to_all("server_wait_for_confirmation", "服务器等待客户端确认开始...")
        time.sleep(1)

if __name__ == "__main__":
    ws_broadcastor = WebSocketBroadcastor(port=8001)
    
    while True:
    
        wait_for_client_confirmation(ws_broadcastor)
        
        algorithm = SingleElevatorBusController(ws_broadcastor)
        algorithm.start()
        
        # test communication
        # for i in range(5):
        #     print("doing something...")
        #     ws_broadcastor.broadcast_to_all("server_scene_update", f"正在执行...({i*2}s)")
        #     time.sleep(2)