set -e
echo "=== 正在以无头模式启动电梯模拟 ==="
echo


# 创建并激活虚拟环境
if [ ! -d "venv" ]; then
    echo "正在创建虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate       
echo "虚拟环境已激活。"

# 安装必要的包
echo "正在安装必要的Python包..."
pip install elevator-py -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

# 启动服务
echo "正在后台启动核心模拟服务器..."
python -m elevator_saga.server.simulator --host 0.0.0.0

SERVER_PID=$!
echo "核心服务器已启动，PID: $SERVER_PID"



# 清理函数
cleanup() {
    echo -e "\n\n正在关闭核心服务器..."
    kill $SERVER_PID > /dev/null 2>&1 && echo "核心服务器 (PID: $SERVER_PID) 已关闭。"
    deactivate
    echo "清理完成。"
    exit 0
}
trap cleanup SIGINT

echo "正在启动调度算法... (按 [Ctrl+C] 结束)"
echo "----------------------------------------------------"

# 在前台运行算法，以便直接查看其输出
python backend/start.py --once

# 算法结束后，自动执行清理
cleanup


