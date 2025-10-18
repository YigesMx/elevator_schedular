set -e
echo "=== 正在以gui模式启动电梯模拟 ==="
echo

# 更新包列表并安装curl
echo "正在安装curl..."
apt update
apt install curl -y

############### python env

#uv
echo "正在安装uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh

export PATH="$HOME/.local/bin:$PATH"
source $HOME/.local/bin/env

#uv 安装 python
echo "正在安装python 3.13.7..."
uv python install 3.13.7

# cd
echo "切换到/elevator目录..."
cd /elevator/

# venv
echo "正在创建并激活虚拟环境..."
uv venv
source .venv/bin/activate

# 安装必要的包
echo "正在安装必要的Python包from requirements..."
uv pip install -r requirements.txt

############### frontend env

# Download and install fnm:
curl -o- https://fnm.vercel.app/install | bash
# Download and install Node.js:
fnm install 22
# Verify the Node.js version:
node -v # Should print "v22.20.0".
# Download and install pnpm:
corepack enable pnpm
# Verify pnpm version:
pnpm -v

cd ./frontend
echo "正在安装前端依赖..."
pnpm install

############### 启动服务

cd /elevator/

# 后台启动评测后端模拟器
echo "正在后台启动核心模拟服务器..."
nohup python -m elevator_saga.server.simulator &

# 等待服务器启动
sleep 2

# 启动算法后端