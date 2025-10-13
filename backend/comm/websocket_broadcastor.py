import asyncio
import threading
import time
import websockets
import json

from websockets.asyncio.server import serve

class WebSocketBroadcastor(object):
    def __init__(self, port=8001):
        self.ws_client_connections = set()
        self.ws_server = None
        self.ws_loop = None
        self.message_handlers = {}  # 消息处理器
        
        self.port = port
        
        # 启动WebSocket服务器在后台线程
        self._start_ws_server(port)
    
    def _start_ws_server(self, port):
        """在后台线程启动WebSocket服务器"""
        def run_ws_server():
            self.ws_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.ws_loop)
            self.ws_loop.run_until_complete(self.ws_server_main(port))
        
        ws_thread = threading.Thread(target=run_ws_server, daemon=True)
        ws_thread.start()
        
        # 等待一小段时间确保服务器启动
        time.sleep(0.1)
    
    def register_message_handler(self, message_type, handler):
        """注册消息处理器"""
        self.message_handlers[message_type] = handler
    
    async def process_client_message(self, websocket, message):
        """处理客户端消息"""
        try:
            # 尝试解析JSON消息
            data = json.loads(message)
            message_type = data.get('type', 'unknown')
            
            # 查找对应的处理器
            if message_type in self.message_handlers:
                response = await self.message_handlers[message_type](websocket, data)
                if response:
                    await websocket.send(json.dumps(response))
            else:
                # 默认处理
                await websocket.send(json.dumps({
                    'type': 'echo',
                    'data': f'Received: {message}'
                }))
                
        except json.JSONDecodeError:
            # 处理非JSON消息
            await websocket.send(json.dumps({
                'type': 'server_error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            print(f"Error processing message: {e}")
            await websocket.send(json.dumps({
                'type': 'server_error',
                'message': str(e)
            }))
    
    async def ws_handler(self, websocket):
        if websocket not in self.ws_client_connections:
            print(f"New WebSocket connection established. Total: {len(self.ws_client_connections) + 1}")
            self.ws_client_connections.add(websocket)
            
        try:
            async for message in websocket:
                # 异步处理每个消息
                await self.process_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed by client")
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            print("Cleaning up WebSocket connection")
            self.ws_client_connections.discard(websocket)
            print(f"Remaining connections: {len(self.ws_client_connections)}")
    
    async def ws_server_main(self, port):
        async with serve(self.ws_handler, "localhost", port) as server:
            print("WebSocket server started on ws://localhost:8001")
            await server.serve_forever()
    
    async def _async_broadcast(self, message):
        """异步广播消息到所有连接的客户端"""
        if self.ws_client_connections:
            # 复制连接集合以避免在迭代时修改
            connections = self.ws_client_connections.copy()
            disconnected = set()
            
            for ws in connections:
                try:
                    await ws.send(message)
                except websockets.exceptions.ConnectionClosed:
                    print("Found closed connection during broadcast")
                    disconnected.add(ws)
                except Exception as e:
                    print(f"Error sending to client: {e}")
                    disconnected.add(ws)
            
            # 清理断开的连接
            for ws in disconnected:
                self.ws_client_connections.discard(ws)
    
    def _broadcast(self, message):
        """同步方法，用于从主线程广播消息"""
        if self.ws_client_connections and self.ws_loop:
            # 在WebSocket事件循环中执行广播
            asyncio.run_coroutine_threadsafe(
                self._async_broadcast(message), 
                self.ws_loop
            )
    
    def broadcast_to_all(self, message_type, data):
        """广播特定类型的消息给所有客户端"""
        message = json.dumps({
            'type': message_type,
            'data': data,
            'timestamp': time.time()
        })
        self._broadcast(message)
    
    def send_to_client(self, websocket, message_type, data):
        """发送消息给特定客户端"""
        if websocket in self.ws_client_connections and self.ws_loop:
            message = json.dumps({
                'type': message_type,
                'data': data,
                'timestamp': time.time()
            })
            asyncio.run_coroutine_threadsafe(
                websocket.send(message),
                self.ws_loop
            )
    
    def exists_client(self):
        """检查是否有客户端连接"""
        return len(self.ws_client_connections) > 0
    
    def get_client_count(self):
        """获取当前连接的客户端数量"""
        return len(self.ws_client_connections)
    
    async def cleanup_closed_connections(self):
        """主动清理已关闭的连接"""
        disconnected = set()
        for ws in self.ws_client_connections.copy():
            if ws.closed:
                disconnected.add(ws)
        
        for ws in disconnected:
            self.ws_client_connections.discard(ws)
            print(f"Removed closed connection, remaining: {len(self.ws_client_connections)}")
            

class SceneBroadcastor(WebSocketBroadcastor):
    
    def __init__(self, port=8001):
        super().__init__(port)
        self.scene_data = {}
        
    def wait_for_client_confirmation(self):
        ready = False
        
        async def on_client_confirmed(ws, msg):
            nonlocal ready
            ready = True
            print("Client confirmed to start, starting simulation...")
        
        self.register_message_handler("client_confirmed", on_client_confirmed)
        
        while not ready:
            self.broadcast_to_all("server_wait_for_confirmation", "服务器等待客户端确认开始...")
            time.sleep(1)
    
    def server_log(self, log_message: str):
        print(f"[Log] {log_message}")
        self.broadcast_to_all("server_log", log_message)
    
    def server_error(self, error_message: str):
        print(f"[Error] {error_message}")
        self.broadcast_to_all("server_error", error_message)
    
    def server_scene_update(self, scene_json):
        self.broadcast_to_all("server_scene_update", scene_json)
    
    def server_metrics_update(self, metrics_json):
        self.broadcast_to_all("server_metrics_update", metrics_json)