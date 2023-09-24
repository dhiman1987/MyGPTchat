cp dist/index.html dist/chat.html
#for local mac exeution
#sed -i .bak 's@/assets@assets@g' dist/chat.html
sed -i 's@/assets@assets@g' dist/chat.html
cat dist/chat.html
rm -rf dist/*.bak
ls -lrt
pwd
