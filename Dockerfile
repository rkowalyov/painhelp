FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 3000
ENV PORT=3000
# Дефолтные разрешённые Origin для продакшена (переопределяется через -e при docker run)
ENV ALLOWED_ORIGINS=https://forms.eduinterpain.ru,https://eduinterpain.ru,https://www.eduinterpain.ru,https://interpain.bitrix24.ru
CMD ["node", "server.js"]
