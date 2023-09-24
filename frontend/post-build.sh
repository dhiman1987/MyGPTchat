cp dist/index.html dist/chat.html
sed -i .bak 's@/assets@assets@g' dist/chat.html
cat dist/chat.html
rm -rf dist/*.bak
