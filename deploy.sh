#!/bin/bash
# 神里绫华粉丝站 - 阿里云 Ubuntu 一键部署脚本
# 使用方法：bash deploy.sh

set -e
echo "=== 神里绫华粉丝站 部署脚本 ==="
echo ""

# 1. 检查 Node.js
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "  Node.js 未安装，正在安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "  Node.js $(node -v) ✓"
echo "  npm $(npm -v) ✓"

# 2. 检查 MySQL
echo "[2/6] 检查 MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "  MySQL 未安装，正在安装..."
    sudo apt-get update
    sudo apt-get install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql
fi
echo "  MySQL 已安装 ✓"

# 3. 创建数据库
echo "[3/6] 初始化数据库..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS ayaka_fansite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ayaka_fansite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  数据库 ayaka_fansite 已创建 ✓"

# 4. 安装依赖
echo "[4/6] 安装项目依赖..."
cd /var/www/ayaka
npm install --production=false
echo "  依赖安装完成 ✓"

# 5. 配置环境变量
echo "[5/6] 配置环境变量..."
cat > .env.production << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ayaka_fansite
	DEEPSEEK_API_KEY=你的DeepSeek密钥
	SILICONFLOW_API_KEY=你的SiliconFlow密钥
EOF

echo ""
echo "  ⚠️  请编辑 .env.production 填入你的 MySQL 密码："
echo "     nano /var/www/ayaka/.env.production"
echo ""
read -p "  填完密码后按回车继续..."

# 6. 构建项目
echo "[6/6] 构建项目..."
npm run build
echo "  构建完成 ✓"

echo ""
echo "=== 部署完成！==="
echo ""
echo "启动命令："
echo "  cd /var/www/ayaka && npm run start"
echo ""
echo "后台运行（推荐）："
echo "  cd /var/www/ayaka && nohup npm run start > app.log 2>&1 &"
echo ""
echo "访问地址：http://你的服务器IP:3000"
echo ""
echo "如果需要修改端口（如 80）："
echo "  PORT=80 npm run start"
